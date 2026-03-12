import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'proj_123abc',
    description: 'Project ID for the payment',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    example: 'milestone_456def',
    description: 'Milestone ID being paid',
  })
  @IsString()
  milestoneId: string;

  @ApiProperty({
    example: 'user_789ghi',
    description: 'User ID receiving payment',
  })
  @IsString()
  recipientId: string;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in USD cents',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    example: 'INTERNAL_LEDGER',
    enum: ['INTERNAL_LEDGER', 'ACH', 'CARD', 'USDC'],
    description: 'Payment method',
  })
  @IsEnum(['INTERNAL_LEDGER', 'ACH', 'CARD', 'USDC'])
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({
    example: 'Payment for framing work completed on 2026-03-12',
    description: 'Payment description/memo',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({
    example: 'APPROVED',
    enum: ['APPROVED', 'REJECTED'],
    description: 'New payment status',
  })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: string;

  @ApiPropertyOptional({
    example: 'Insufficient documentation provided',
    description: 'Reason for rejection/approval',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  recipientId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  milestoneId: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ enum: ['INTERNAL_LEDGER', 'ACH', 'CARD', 'USDC'] })
  method: string;

  @ApiProperty({
    enum: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED'],
  })
  status: string;

  @ApiPropertyOptional()
  stripeTransactionId?: string;

  @ApiPropertyOptional()
  dwollaTransactionId?: string;

  @ApiPropertyOptional()
  usdcTransactionId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

export class WalletResponseDto {
  @ApiProperty({ example: 'wallet_123abc' })
  id: string;

  @ApiProperty({ example: 'user_789ghi' })
  userId: string;

  @ApiProperty({
    example: 45000,
    description: 'Available USD balance in cents',
  })
  usdBalance: number;

  @ApiProperty({
    example: 10000,
    description: 'Available USDC balance in cents',
  })
  usdcBalance: number;

  @ApiProperty({
    example: 500,
    description: 'Platform credit balance (for fees)',
  })
  platformCredits: number;

  @ApiProperty({
    example: 100000,
    description: 'KYC tier monthly limit in cents',
  })
  kycTierLimit: number;

  @ApiProperty({
    example: 45000,
    description: 'Amount settled this month in cents',
  })
  monthlySettledAmount: number;

  @ApiProperty({
    example: 5000,
    description: 'Pending payments awaiting approval in cents',
  })
  pendingPayments: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class WithdrawalRequestDto {
  @ApiProperty({
    example: 25000,
    description: 'Amount to withdraw in cents',
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    example: 'ACH',
    enum: ['ACH', 'CARD', 'USDC'],
    description: 'Withdrawal method',
  })
  @IsEnum(['ACH', 'CARD', 'USDC'])
  method: string;

  @ApiPropertyOptional({
    description: 'Bank account details (required for ACH)',
  })
  @IsOptional()
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  data: PaymentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  skip: number;

  @ApiProperty()
  take: number;
}
