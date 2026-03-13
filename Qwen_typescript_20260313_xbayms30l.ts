import { PrismaClient, MilestoneStatus, TransactionStatus } from '@buildbrain/database';
import { stripe } from '../config/stripe.config';
import { unit } from '../config/unit.config';
import { LedgerService } from './ledger.service';
import { LienWaiverService } from './lien-waiver.service';
import { notify } from '@buildbrain/notifications';

const prisma = new PrismaClient();
const ledger = new LedgerService();
const lienWaiverService = new LienWaiverService();

export class EscrowService {
  /**
   * Create escrow hold for milestone payment
   * Funds are captured but not settled until conditions met
   */
  async createMilestoneEscrow(
    milestoneId: string,
    amount: number, // in cents
    payerId: string,
    payeeId: string
  ) {
    const milestone = await prisma.milestone.findUniqueOrThrow({
      where: { id: milestoneId },
      include: { project: true },
    });

    // 1. Create escrow record if doesn't exist
    let escrow = await prisma.escrow.findUnique({
      where: { projectId: milestone.projectId },
    });

    if (!escrow) {
      escrow = await prisma.escrow.create({
        data: {
          projectId: milestone.projectId,
          heldBy: 'PLATFORM', // Or integrate with Unit for actual bank hold
          fundedAmount: 0,
          status: 'ACTIVE',
        },
      });
    }

    // 2. Create hold within escrow
    const hold = await prisma.escrowHold.create({
      data: {
        escrowId: escrow.id,
        amount,
        reason: 'MILESTONE_PENDING',
        referenceType: 'MILESTONE',
        referenceId: milestoneId,
      },
    });

    // 3. Process payment capture (but not settlement)
    const transaction = await prisma.transaction.create({
      data: {
        projectId: milestone.projectId,
        milestoneId: milestone.id,
        payerId,
        payeeId,
        type: 'ESCROW_HOLD',
        status: 'CAPTURED', // Captured but not settled
        grossAmount: amount,
        platformFee: Math.round(amount * 0.029), // 2.9% platform fee
        processingFee: 30, // $0.30 fixed
        netAmount: amount - Math.round(amount * 0.029) - 30,
        paymentMethod: 'STRIPE_ACH', // Or from user preference
        isEscrow: true,
        releaseCondition: 'MILESTONE_APPROVED_AND_LIEN_SIGNED',
        idempotencyKey: `escrow_${milestoneId}_${Date.now()}`,
      },
    });

    // 4. Record double-entry ledger
    await ledger.recordEscrowHold({
      transactionId: transaction.id,
      amount,
      payerAccount: `ASSET:CASH:STRIPE:${payerId}`,
      escrowAccount: `LIABILITY:ESCROW:HELD:${milestone.projectId}`,
    });

    // 5. Notify parties
    await notify.paymentEscrowCreated({
      milestone,
      amount,
      payerId,
      payeeId,
    });

    return { escrow, hold, transaction };
  }

  /**
   * Release escrow funds when conditions are met
   */
  async releaseMilestoneEscrow(
    milestoneId: string,
    releasedBy: string
  ) {
    const milestone = await prisma.milestone.findUniqueOrThrow({
      where: { id: milestoneId },
      include: {
        project: true,
        lienWaiver: true,
        payApp: true,
      },
    });

    // 1. Verify release conditions
    if (milestone.status !== 'APPROVED') {
      throw new Error('Milestone must be approved before release');
    }

    if (!milestone.lienWaiver || milestone.lienWaiver.status !== 'VERIFIED') {
      throw new Error('Lien waiver must be verified before release');
    }

    // 2. Find the escrow hold
    const hold = await prisma.escrowHold.findFirst({
      where: {
        referenceType: 'MILESTONE',
        referenceId: milestoneId,
        shouldRelease: false,
      },
      include: { escrow: true },
    });

    if (!hold) {
      throw new Error('No pending escrow hold found for milestone');
    }

    // 3. Update hold status
    await prisma.escrowHold.update({
      where: { id: hold.id },
      data: {
        shouldRelease: true,
        releaseApprovedBy: releasedBy,
        releaseApprovedAt: new Date(),
      },
    });

    // 4. Process settlement via payment processor
    const transaction = await prisma.transaction.findFirst({
      where: { milestoneId, type: 'ESCROW_HOLD' },
      orderBy: { createdAt: 'desc' },
    });

    if (transaction?.paymentMethod.startsWith('STRIPE')) {
      await stripe.transfers.create({
        amount: transaction!.netAmount,
        currency: 'usd',
        destination: transaction!.payeeId, // Stripe Connect account ID
        source_transaction: transaction!.stripeChargeId!,
      });
    } else if (transaction?.paymentMethod.startsWith('UNIT')) {
      await unit.externalAccounts.createTransfer({
        amount: transaction!.netAmount / 100, // Convert cents to dollars
        destinationAccountId: transaction!.payeeId,
        description: `Milestone payment: ${milestone.title}`,
      });
    }

    // 5. Update transaction status
    await prisma.transaction.update({
      where: { id: transaction!.id },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
      },
    });

    // 6. Update milestone payment status
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        paymentStatus: 'PAID',
        amountPaid: hold.amount,
      },
    });

    // 7. Record ledger entries for settlement
    await ledger.recordEscrowRelease({
      transactionId: transaction!.id,
      amount: hold.amount,
      escrowAccount: `LIABILITY:ESCROW:HELD:${milestone.projectId}`,
      payeeAccount: `ASSET:CASH:STRIPE:${transaction!.payeeId}`,
    });

    // 8. Update escrow aggregate
    await prisma.escrow.update({
      where: { id: hold.escrowId },
      data: {
        releasedAmount: { increment: hold.amount },
        status: {
          set: hold.escrow.releasedAmount + hold.amount >= hold.escrow.fundedAmount
            ? 'RELEASED'
            : 'PARTIALLY_RELEASED',
        },
      },
    });

    // 9. Notify parties
    await notify.paymentReleased({
      milestone,
      amount: hold.amount,
      payeeId: transaction!.payeeId,
    });

    return { hold, transaction };
  }

  /**
   * Automated release checker (cron job)
   * Checks for milestones that meet release conditions
   */
  async checkAndAutoRelease() {
    const readyMilestones = await prisma.milestone.findMany({
      where: {
        status: 'APPROVED',
        paymentStatus: 'APPROVED',
        lienWaiver: {
          status: 'VERIFIED',
        },
        payApp: {
          status: 'APPROVED',
        },
      },
      include: {
        lienWaiver: true,
        project: true,
      },
    });

    for (const milestone of readyMilestones) {
      try {
        await this.releaseMilestoneEscrow(
          milestone.id,
          'SYSTEM_AUTO_RELEASE'
        );
        console.log(`Auto-released escrow for milestone ${milestone.id}`);
      } catch (error) {
        console.error(`Failed to auto-release milestone ${milestone.id}:`, error);
        // Alert ops team for manual review
        await notify.systemAlert({
          type: 'ESCROW_RELEASE_FAILED',
          milestoneId: milestone.id,
          error: error.message,
        });
      }
    }
  }
}