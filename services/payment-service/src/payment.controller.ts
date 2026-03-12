import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Request payment approval for a milestone
   * Creates pending payment record in double-entry ledger
   */
  @Post('request')
  @ApiOperation({
    summary: 'Request payment',
    description:
      'GC requests payment for completed milestone. Initiates approval workflow.',
  })
  @ApiCreatedResponse({
    description: 'Payment request created successfully',
    type: PaymentResponseDto,
  })
  async requestPayment(
    @CurrentUser() userId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.requestPayment(userId, createPaymentDto);
  }

  /**
   * Approve payment and trigger processing
   * Only project GC can approve payments
   */
  @Patch(':paymentId/approve')
  @ApiOperation({
    summary: 'Approve payment',
    description: 'Project GC approves payment, triggers ACH/Card/Internal processing',
  })
  @ApiOkResponse({
    description: 'Payment approved and processing',
    type: PaymentResponseDto,
  })
  async approvePayment(
    @CurrentUser() userId: string,
    @Param('paymentId') paymentId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.approvePayment(paymentId, userId);
  }

  /**
   * Reject payment with reason
   */
  @Patch(':paymentId/reject')
  @ApiOperation({
    summary: 'Reject payment',
    description: 'Project GC rejects payment with reason code',
  })
  @ApiOkResponse({
    description: 'Payment rejected',
    type: PaymentResponseDto,
  })
  async rejectPayment(
    @CurrentUser() userId: string,
    @Param('paymentId') paymentId: string,
    @Body() { reason }: { reason: string },
  ): Promise<PaymentResponseDto> {
    return this.paymentService.rejectPayment(paymentId, userId, reason);
  }

  /**
   * Get payment details by ID
   */
  @Get(':paymentId')
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Retrieve payment record with full details',
  })
  @ApiOkResponse({
    description: 'Payment details',
    type: PaymentResponseDto,
  })
  async getPayment(
    @CurrentUser() userId: string,
    @Param('paymentId') paymentId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.getPayment(paymentId, userId);
  }

  /**
   * Get wallet balance and stats
   */
  @Get('wallet/balance')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Get current USD balance, pending amounts, monthly limits',
  })
  @ApiOkResponse({
    description: 'Wallet details',
    type: WalletResponseDto,
  })
  async getWallet(@CurrentUser() userId: string): Promise<WalletResponseDto> {
    return this.paymentService.getWallet(userId);
  }

  /**
   * Request withdrawal to bank account
   */
  @Post('withdraw')
  @ApiOperation({
    summary: 'Request withdrawal',
    description:
      'Worker/subcontractor requests payout to linked bank account (ACH, Card, Stablecoin)',
  })
  @ApiCreatedResponse({
    description: 'Withdrawal initiated',
    type: PaymentResponseDto,
  })
  async requestWithdrawal(
    @CurrentUser() userId: string,
    @Body()
    withdrawalDto: {
      amount: number;
      method: 'ACH' | 'CARD' | 'USDC' | 'INTERNAL_LEDGER';
      bankAccount?: {
        accountNumber: string;
        routingNumber: string;
        accountHolderName: string;
      };
    },
  ): Promise<PaymentResponseDto> {
    if (!withdrawalDto.amount || withdrawalDto.amount <= 0) {
      throw new BadRequestException('Invalid withdrawal amount');
    }

    return this.paymentService.requestWithdrawal(
      userId,
      withdrawalDto.amount,
      withdrawalDto.method,
      withdrawalDto.bankAccount,
    );
  }

  /**
   * Get transaction history
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Get paginated transaction history for user',
  })
  @ApiOkResponse({
    description: 'Transaction history',
  })
  async getTransactions(
    @CurrentUser() userId: string,
    @Body() { skip = 0, take = 20 }: { skip?: number; take?: number },
  ) {
    return this.paymentService.getTransactions(userId, skip, take);
  }

  /**
   * Webhook handler for payment provider events
   * Called by Stripe, Dwolla, Circle, etc. with signature verification
   */
  @Post('webhook')
  @ApiOperation({
    summary: 'Payment provider webhook',
    description: 'Handles webhooks from Stripe, Dwolla, Circle payment providers',
  })
  @ApiOkResponse({
    description: 'Webhook acknowledged',
  })
  async handleWebhook(@Body() event: any): Promise<{ received: boolean }> {
    // TODO: Verify webhook signature (Stripe/Dwolla specific)
    await this.paymentService.handlePaymentWebhook(event);
    return { received: true };
  }
}
