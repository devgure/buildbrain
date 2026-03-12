import { IsString, IsNumber, IsArray, IsOptional, IsDate, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchOpportunitiesDto {
  @ApiProperty({
    description: 'Search query',
    example: 'Building renovation',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Max results (default 50)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class OpportunityDetailDto {
  @ApiProperty({
    description: 'SAM.gov opportunity ID',
    example: 'sam-20250215-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Opportunity title',
    example: 'Office Building Renovation - Phase 2',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Opportunity description',
    example: 'Complete renovation of federal office complex including...',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Contracting agency',
    example: 'General Services Administration (GSA)',
  })
  @IsString()
  agency: string;

  @ApiProperty({
    description: 'Posted date',
    example: '2025-02-15T00:00:00Z',
  })
  @Type(() => Date)
  postedDate: Date;

  @ApiProperty({
    description: 'Response deadline',
    example: '2025-03-17T23:59:00Z',
  })
  @Type(() => Date)
  deadline: Date;

  @ApiProperty({
    description: 'Estimated contract value (USD)',
    example: 250000,
  })
  @IsNumber()
  estimatedValue: number;

  @ApiProperty({
    description: 'NAICS codes',
    type: [String],
    example: ['236220', '238210'],
  })
  @IsArray()
  @IsString({ each: true })
  naicsCode: string[];

  @ApiProperty({
    description: 'Set-aside type',
    example: 'UNRESTRICTED',
  })
  @IsString()
  setAside: string;

  @ApiProperty({
    description: 'Classification',
    example: 'GENERAL',
  })
  @IsString()
  classification: string;

  @ApiPropertyOptional({
    description: 'Days until deadline',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  daysUntilDeadline?: number;

  @ApiPropertyOptional({
    description: 'Your match score (if checked)',
    example: 78,
  })
  @IsOptional()
  @IsNumber()
  matchScore?: number;
}

export class BidMatchDto {
  @ApiProperty({
    description: 'Opportunity ID',
    example: 'sam-20250215-001',
  })
  @IsString()
  opportunityId: string;

  @ApiProperty({
    description: 'Your user ID',
    example: 'user-uuid-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Match score (0-100)',
    example: 78,
  })
  @IsNumber()
  matchScore: number;

  @ApiProperty({
    description: 'Reasons for match',
    type: [String],
    example: [
      'Fully verified contractor',
      'Excellent track record',
      '5 relevant skills',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];
}

export class BidMatchDetailedDto extends BidMatchDto {
  @ApiPropertyOptional({
    description: 'Opportunity title',
    example: 'Office Building Renovation',
  })
  @IsOptional()
  @IsString()
  opportunityTitle?: string;

  @ApiPropertyOptional({
    description: 'Opportunity agency',
    example: 'GSA',
  })
  @IsOptional()
  @IsString()
  agency?: string;

  @ApiPropertyOptional({
    description: 'Deadline',
    example: '2025-03-17',
  })
  @IsOptional()
  @Type(() => Date)
  deadline?: Date;

  @ApiPropertyOptional({
    description: 'Estimated value',
    example: 250000,
  })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;
}

export class SubmitBidDto {
  @ApiProperty({
    description: 'Opportunity ID',
    example: 'sam-20250215-001',
  })
  @IsString()
  opportunityId: string;

  @ApiProperty({
    description: 'Bid amount (as string for precision)',
    example: '85000.00',
  })
  @IsString()
  bidAmount: string;

  @ApiPropertyOptional({
    description: 'Bid description/notes',
    example: 'Full-service renovation with project management',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BidDto {
  @ApiProperty({
    description: 'Bid ID',
    example: 'bid-uuid-123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Bid amount',
    example: '85000.00',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Bid status',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
    example: 'PENDING',
  })
  @IsEnum(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'])
  status: string;

  @ApiProperty({
    description: 'Submission date',
    example: '2025-02-15T15:30:00Z',
  })
  @Type(() => Date)
  submittedAt: Date;

  @ApiPropertyOptional({
    description: 'Acceptance date',
    example: '2025-02-16T10:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  acceptedAt?: Date;

  @ApiPropertyOptional({
    description: 'Opportunity title',
    example: 'Office Building Renovation',
  })
  @IsOptional()
  @IsString()
  opportunityTitle?: string;
}

export class BidHistoryResponseDto {
  @ApiProperty({
    description: 'List of bids',
    type: [BidDto],
  })
  @IsArray()
  bids: BidDto[];

  @ApiProperty({
    description: 'Total bids count',
    example: 15,
  })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({
    description: 'Bids accepted',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  accepted?: number;

  @ApiPropertyOptional({
    description: 'Bids pending',
    example: 7,
  })
  @IsOptional()
  @IsNumber()
  pending?: number;

  @ApiPropertyOptional({
    description: 'Bids rejected',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  rejected?: number;
}

export class WatchedOpportunityDto {
  @ApiProperty({
    description: 'Opportunity ID',
    example: 'sam-20250215-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Opportunity title',
    example: 'Office Building Renovation',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Agency',
    example: 'GSA',
  })
  @IsString()
  agency: string;

  @ApiProperty({
    description: 'Deadline',
    example: '2025-03-17T23:59:00Z',
  })
  @Type(() => Date)
  deadline: Date;

  @ApiProperty({
    description: 'When you started watching',
    example: '2025-02-15T12:00:00Z',
  })
  @Type(() => Date)
  watchedSince: Date;

  @ApiPropertyOptional({
    description: 'Days until deadline',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  daysUntilDeadline?: number;
}

export class CategoryDto {
  @ApiProperty({
    description: 'NAICS code',
    example: '236220',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Building Excavation & Foundation Work',
  })
  @IsString()
  name: string;
}

export class SetAsideDto {
  @ApiProperty({
    description: 'Set-aside type',
    example: 'SMALL_BUSINESS',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Description',
    example: 'Small business set-aside opportunities',
  })
  @IsString()
  description: string;
}

export class OpportunityMatchStatsDto {
  @ApiProperty({
    description: 'Total opportunities searched',
    example: 245,
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    description: 'Good matches (score 70+)',
    example: 12,
  })
  @IsNumber()
  excellent: number;

  @ApiProperty({
    description: 'Fair matches (score 50-69)',
    example: 28,
  })
  @IsNumber()
  good: number;

  @ApiProperty({
    description: 'Poor matches (score <50)',
    example: 205,
  })
  @IsNumber()
  poor: number;

  @ApiPropertyOptional({
    description: 'Average match score',
    example: 45.5,
  })
  @IsOptional()
  @IsNumber()
  averageScore?: number;
}

export class OpportunityAlertDto {
  @ApiProperty({
    description: 'Alert type',
    enum: ['DEADLINE_APPROACHING', 'NEW_MATCH', 'BID_REJECTED', 'BID_ACCEPTED'],
    example: 'DEADLINE_APPROACHING',
  })
  @IsEnum(['DEADLINE_APPROACHING', 'NEW_MATCH', 'BID_REJECTED', 'BID_ACCEPTED'])
  type: string;

  @ApiProperty({
    description: 'Opportunity ID',
    example: 'sam-20250215-001',
  })
  @IsString()
  opportunityId: string;

  @ApiProperty({
    description: 'Alert message',
    example: 'Only 5 days left to submit bid',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Alert timestamp',
    example: '2025-02-15T10:00:00Z',
  })
  @Type(() => Date)
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Bid ID if related',
    example: 'bid-uuid-123',
  })
  @IsOptional()
  @IsString()
  bidId?: string;
}
