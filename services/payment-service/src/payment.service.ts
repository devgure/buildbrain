import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Decimal } from '@prisma/client/runtime/library';
import * as Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe.Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  /**
   * Request payment approval for a milestone
   * Double-entry ledger: debit sender, credit recipient (both pending)
   */
  async requestPayment(userId: string, dto: CreatePaymentDto) {
    // Validate sender has sufficient balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    if (wallet.usdBalance < new Decimal(dto.amount)) {
      throw new BadRequestException('Insufficient funds');
    }

    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: { gc: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Only project GC can request payment
    if (project.gc.id !== userId) {
      throw new ForbiddenException('Only project GC can request payment');
    }

    // Validate milestone exists
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: dto.milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Create payment record (status: PENDING)
    const payment = await this.prisma.payment.create({
      data: {
        senderId: userId,
        recipientId: dto.recipientId,
        projectId: dto.projectId,
        milestoneId: dto.milestoneId,
        amount: new Decimal(dto.amount),
        method: dto.method || 'INTERNAL_LEDGER',
        status: 'PENDING',
        description: dto.description,
      },
      include: {
        sender: { select: { email: true, companyName: true } },
        recipient: { select: { email: true, companyName: true } },
      },
    });

    // If payment requires approval, send notification
    // TODO: Emit event to notification service

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        sender: { select: { id: true, email: true, companyName: true } },
        recipient: { select: { id: true, email: true, companyName: true } },
        project: { select: { id: true, title: true } },
        milestone: { select: { id: true, title: true, amount: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Only sender, recipient, or project GC can view
    if (payment.senderId !== userId && payment.recipientId !== userId) {
      throw new ForbiddenException('Not authorized to view this payment');
    }

    return payment;
  }

  /**
   * Approve payment (GC or payment processor)
   */
  async approvePayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { project: { include: { gc: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.project.gc.id !== userId) {
      throw new ForbiddenException('Only project GC can approve payments');
    }

    // Update payment status to APPROVED
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'APPROVED' },
      include: {
        sender: true,
        recipient: true,
      },
    });

    // Trigger payment processor (ACH, Card, Internal Ledger, etc.)
    if (payment.method === 'INTERNAL_LEDGER') {
      await this.processInternalLedger(paymentId, payment);
    } else if (payment.method === 'ACH') {
      await this.processACH(paymentId, payment);
    } else if (payment.method === 'CARD') {
      await this.processCard(paymentId, payment);
    } else if (payment.method === 'USDC') {
      await this.processUSTC(paymentId, payment);
    }

    return updated;
  }

  /**
   * Process internal ledger transfer (instant)
   * Double-entry: debit sender wallet, credit recipient wallet
   */
  private async processInternalLedger(paymentId: string, payment: any) {
    const now = new Date();

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      // Debit sender
      await tx.wallet.update({
        where: { userId: payment.senderId },
        data: {
          usdBalance: {
            decrement: payment.amount,
          },
        },
      });

      // Credit recipient
      await tx.wallet.update({
        where: { userId: payment.recipientId },
        data: {
          usdBalance: {
            increment: payment.amount,
          },
        },
      });

      // Create transaction logs (audit trail)
      await tx.transactionLog.create({
        data: {
          type: 'DEBIT',
          userId: payment.senderId,
          amount: payment.amount,
          description: `Payment ${paymentId} to ${payment.recipient.email}`,
          relatedPaymentId: paymentId,
          timestamp: now,
        },
      });

      await tx.transactionLog.create({
        data: {
          type: 'CREDIT',
          userId: payment.recipientId,
          amount: payment.amount,
          description: `Received payment from ${payment.sender.email}`,
          relatedPaymentId: paymentId,
          timestamp: now,
        },
      });

      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });
    });
  }

  /**
   * Process ACH (Dwolla or Unit.co integration)
   */
  private async processACH(paymentId: string, payment: any) {
    try {
      // Call Dwolla API
      const dwollaTransactionId = await this.submitDwollaTransfer(payment);

      // Update payment with external transaction ID
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          dwollaTransactionId,
          status: 'PROCESSING',
        },
      });

      // In production: webhook will update status to COMPLETED when Dwolla confirms
    } catch (error) {
      console.error('ACH processing failed:', error);
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  /**
   * Process Card payment (Stripe)
   */
  private async processCard(paymentId: string, payment: any) {
    try {
      // Create Stripe charge
      const charge = await this.stripe.charges.create({
        amount: Math.round(payment.amount.toNumber() * 100), // cents
        currency: 'usd',
        source: 'tok_visa', // TODO: use customer's saved card
        description: `BuildBrain Payment ${paymentId}`,
      });

      // Update payment with Stripe transaction ID
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          stripeTransactionId: charge.id,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Card processing failed:', error);
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  /**
   * Process USDC stablecoin transfer (Circle)
   */
  private async processUSTC(paymentId: string, payment: any) {
    // TODO: Implement Circle API integration for USDC transfers
    console.log('USDC transfer initiated for payment:', paymentId);
  }

  /**
   * Submit transfer to Dwolla
   */
  private async submitDwollaTransfer(payment: any): Promise<string> {
    // TODO: Implement Dwolla API call
    // For now, return mock transaction ID
    return `dwolla_${Date.now()}`;
  }

  /**
   * Reject payment
   */
  async rejectPayment(paymentId: string, userId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { project: { include: { gc: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.project.gc.id !== userId) {
      throw new ForbiddenException('Only project GC can reject payments');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        verificationStatus: reason,
      },
    });
  }

  /**
   * Get wallet balance
   */
  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  /**
   * Withdraw funds to bank account
   */
  async requestWithdrawal(userId: string, amount: number, method: string, bankAccount: any) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.usdBalance < new Decimal(amount)) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    // Deduct from wallet
    await this.prisma.wallet.update({
      where: { userId },
      data: {
        usdBalance: {
          decrement: amount,
        },
      },
    });

    // Create withdrawal record
    const withdrawal = await this.prisma.payment.create({
      data: {
        senderId: userId,
        recipientId: 'buildbrain-bank', // TODO: use actual bank account ID
        amount: new Decimal(amount),
        method: method as any,
        status: 'PROCESSING',
        description: 'Withdrawal request',
      },
    });

    // Process withdrawal based on method
    if (method === 'ACH') {
      await this.processACHWithdrawal(withdrawal.id, amount, bankAccount);
    }

    return withdrawal;
  }

  private async processACHWithdrawal(withdrawalId: string, amount: number, bankAccount: any) {
    // TODO: Implement Dwolla withdrawal
    console.log('ACH withdrawal initiated:', { withdrawalId, amount, bankAccount });
  }

  /**
   * Get transaction history for user
   */
  async getTransactions(userId: string, skip = 0, take = 20) {
    const transactions = await this.prisma.payment.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        sender: { select: { email: true, companyName: true } },
        recipient: { select: { email: true, companyName: true } },
      },
    });

    const total = await this.prisma.payment.count({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
    });

    return { data: transactions, total, skip, take };
  }

  /**
   * Handle incoming webhook from payment provider
   */
  async handlePaymentWebhook(event: any) {
    // Handle Stripe webhook
    if (event.type === 'charge.succeeded') {
      const chargeId = event.data.object.id;
      await this.prisma.payment.updateMany({
        where: { stripeTransactionId: chargeId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    // Handle Dwolla webhook
    if (event.type === 'transfer_completed') {
      const dwollaId = event.data.id;
      await this.prisma.payment.updateMany({
        where: { dwollaTransactionId: dwollaId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }
  }
}
