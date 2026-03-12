import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class PaymentStatusDto {
  @ApiProperty({
    description: 'Pending payments count',
    example: 15,
  })
  pending: number;

  @ApiProperty({
    description: 'Completed payments count',
    example: 342,
  })
  completed: number;

  @ApiProperty({
    description: 'Failed payments count',
    example: 8,
  })
  failed: number;
}

export class DashboardMetricsResponseDto {
  @ApiProperty({
    description: 'Total revenue (USD)',
    example: '450250.50',
    type: String,
  })
  revenue: Decimal;

  @ApiProperty({
    description: 'Platform profit margin percentage',
    example: 10.5,
  })
  profitMargin: number;

  @ApiProperty({
    description: 'Number of active projects',
    example: 24,
  })
  activeProjects: number;

  @ApiProperty({
    description: 'Number of completed projects',
    example: 156,
  })
  completedProjects: number;

  @ApiProperty({
    description: 'Total registered users',
    example: 1250,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'New users in period',
    example: 45,
  })
  newUsers: number;

  @ApiProperty({
    description: 'Average project value (USD)',
    example: '5250.75',
    type: String,
  })
  avgProjectValue: Decimal;

  @ApiProperty({
    description: 'Payment status breakdown',
    type: PaymentStatusDto,
  })
  paymentStatus: PaymentStatusDto;
}

export class TrendResponseDto {
  @ApiProperty({
    description: 'Date',
    example: '2025-02-15',
  })
  date: Date;

  @ApiProperty({
    description: 'Value',
    example: 15250.50,
  })
  value: number | Decimal;

  @ApiProperty({
    description: 'Label',
    example: '2025-02-15',
  })
  label: string;
}

export class FraudAlertResponseDto {
  @ApiProperty({
    description: 'Alert ID',
    example: 'fraud-1708088400000-1',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Alert type',
    enum: [
      'VELOCITY_CHECK',
      'LARGE_PAYMENT',
      'PAYMENT_FAILURE_PATTERN',
      'KYC_MISMATCH',
      'GEOGRAPHIC_ANOMALY',
      'UNUSUAL_ACTIVITY',
    ],
    example: 'VELOCITY_CHECK',
  })
  type: string;

  @ApiProperty({
    description: 'Severity level',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH',
  })
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({
    description: 'Alert description',
    example: 'High number of transactions in 24h: 55',
  })
  description: string;

  @ApiProperty({
    description: 'Detection timestamp',
    example: '2025-02-15T09:30:00Z',
  })
  detected: Date;

  @ApiProperty({
    description: 'Whether alert is resolved',
    example: false,
  })
  resolved: boolean;
}

export class UserActivityReportDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Reporting period',
    example: '30 days',
  })
  period: string;

  @ApiProperty({
    description: 'Projects created',
    example: 5,
  })
  projectsCreated: number;

  @ApiProperty({
    description: 'Bids submitted',
    example: 12,
  })
  bidsSubmitted: number;

  @ApiProperty({
    description: 'Payments issued count',
    example: 8,
  })
  paymentsIssued: number;

  @ApiProperty({
    description: 'Total amount issued',
    example: '25000.00',
    type: String,
  })
  totalIssued: Decimal;

  @ApiProperty({
    description: 'Total amount received',
    example: '8500.50',
    type: String,
  })
  paymentsReceived: Decimal;

  @ApiProperty({
    description: 'Number of logins',
    example: 28,
  })
  logins: number;

  @ApiProperty({
    description: 'Average project value',
    example: '5000.00',
    type: String,
  })
  avgProjectValue: Decimal;
}

export class WorkerStatsDto {
  @ApiProperty({
    description: 'Worker ID',
    example: 'worker-uuid-123',
  })
  workerId: string;

  @ApiProperty({
    description: 'Total projects assigned',
    example: 15,
  })
  projectsAssigned: number;

  @ApiProperty({
    description: 'Projects completed',
    example: 12,
  })
  projectsCompleted: number;

  @ApiProperty({
    description: 'Average rating',
    example: 4.7,
  })
  avgRating: number;

  @ApiProperty({
    description: 'Total earnings',
    example: '45000.00',
    type: String,
  })
  totalEarnings: Decimal;
}

export class MarketplaceHealthDto {
  @ApiProperty({
    description: 'Total bids on platform',
    example: 2340,
  })
  totalBids: number;

  @ApiProperty({
    description: 'Accepted bids count',
    example: 1204,
  })
  acceptedBids: number;

  @ApiProperty({
    description: 'Bid acceptance rate percentage',
    example: 51.4,
  })
  acceptanceRate: number;

  @ApiProperty({
    description: 'Average bid amount',
    example: '3250.75',
    type: String,
  })
  avgBidAmount: Decimal;

  @ApiProperty({
    description: 'Total payment value processed',
    example: '2450000.00',
    type: String,
  })
  totalPaymentValue: Decimal;

  @ApiProperty({
    description: 'Marketplace health status',
    enum: ['GOOD', 'NEEDS_ATTENTION', 'CRITICAL'],
    example: 'GOOD',
  })
  health: string;
}

export class TierAnalyticsDto {
  @ApiProperty({
    description: 'KYC tier name',
    example: 'TIER_1',
  })
  tier: string;

  @ApiProperty({
    description: 'Number of users in tier',
    example: 450,
  })
  userCount: number;

  @ApiProperty({
    description: 'Average rating in tier',
    example: 4.5,
  })
  avgRating: number;
}

export class ExportQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2025-02-15',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['csv', 'json'],
    example: 'json',
  })
  @IsOptional()
  @IsEnum(['csv', 'json'])
  format?: 'csv' | 'json';
}

export class CustomMetricDto {
  @ApiProperty({
    description: 'Metric name',
    example: 'daily_revenue',
  })
  @IsString()
  metric: string;

  @ApiPropertyOptional({
    description: 'Metric value',
    example: 15000.50,
  })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    description: 'Metric timestamp',
    example: '2025-02-15T09:30:00Z',
  })
  @IsOptional()
  timestamp?: Date;
}

export class ChartDataDto {
  @ApiProperty({
    description: 'Chart labels',
    type: [String],
    example: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  })
  @IsArray()
  labels: string[];

  @ApiProperty({
    description: 'Chart data points',
    type: [Number],
    example: [1200, 1900, 3800, 3908, 4800],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  data: number[];
}

export class AnalyticsFilterDto {
  @ApiPropertyOptional({
    description: 'Start date',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date',
    example: '2025-02-15',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Group by period',
    enum: ['day', 'week', 'month'],
    example: 'day',
  })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({
    description: 'User ID filter',
    example: 'user-uuid-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'KYC tier filter',
    example: 'TIER_1',
  })
  @IsOptional()
  @IsString()
  kycTier?: string;
}

export class ComparisonPeriodDto {
  @ApiProperty({
    description: 'Current period metrics',
    type: DashboardMetricsResponseDto,
  })
  current: DashboardMetricsResponseDto;

  @ApiProperty({
    description: 'Previous period metrics',
    type: DashboardMetricsResponseDto,
  })
  previous: DashboardMetricsResponseDto;

  @ApiProperty({
    description: 'Growth percentage',
    example: 15.5,
  })
  growthPercentage: number;
}
