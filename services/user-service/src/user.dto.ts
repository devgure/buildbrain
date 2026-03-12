import { IsString, IsEmail, IsPhone, IsOptional, IsBoolean, IsNumber, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '+1-555-123-4567', required: false })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Acme Construction', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({
    example: 'Experienced GC with 15 years in commercial construction',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/avatars/user-123.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  avatar?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  publicProfile?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiProperty({ example: 'en', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'America/Los_Angeles', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    enum: ['LIGHT', 'DARK', 'AUTO'],
    example: 'AUTO',
    required: false,
  })
  @IsOptional()
  @IsEnum(['LIGHT', 'DARK', 'AUTO'])
  theme?: 'LIGHT' | 'DARK' | 'AUTO';

  @ApiProperty({
    example: 'INTERNAL_LEDGER',
    required: false,
    description: 'INTERNAL_LEDGER, ACH, CARD, USDC',
  })
  @IsOptional()
  @IsString()
  defaultPaymentMethod?: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Auto-accept all bids meeting score threshold',
  })
  @IsOptional()
  @IsBoolean()
  autoAcceptBids?: boolean;

  @ApiProperty({
    example: 75,
    required: false,
    description: 'Minimum AI score (0-100) to consider bids',
  })
  @IsOptional()
  @IsNumber()
  bidNotificationThreshold?: number;
}

export class AddSkillDto {
  @ApiProperty({ example: 'Electrical Wiring' })
  @IsString()
  name: string;

  @ApiProperty({ example: 8, description: 'Years of experience' })
  @IsNumber()
  yearsOfExperience: number;
}

export class AddPortfolioItemDto {
  @ApiProperty({ example: 'Downtown Tower Electrical Retrofit' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Led electrical team for 30-story commercial renovation',
  })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://example.com/portfolio/image.jpg', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ example: 'https://example.com/project', required: false })
  @IsOptional()
  @IsUrl()
  projectUrl?: string;
}

export class AddContactRuleDto {
  @ApiProperty({
    example: 'EMAIL',
    description: 'EMAIL, SMS, PHONE, PUSH',
  })
  @IsEnum(['EMAIL', 'SMS', 'PHONE', 'PUSH'])
  type: string;

  @ApiProperty({
    example: 'BUSINESS_HOURS_ONLY',
    description: 'WEEKDAY_ONLY, BUSINESS_HOURS, NO_CONTACT_AFTER_TIME, etc.',
  })
  @IsString()
  rule: string;

  @ApiProperty({ example: '18:00', required: false })
  @IsOptional()
  @IsString()
  value?: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: 'user-123' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'GC' })
  role: string;

  @ApiProperty({ example: 'Acme Construction', required: false })
  company?: string;

  @ApiProperty({ example: '+1-555-123-4567', required: false })
  phone?: string;

  @ApiProperty({ example: 'Experienced GC...', required: false })
  bio?: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/avatars/user-123.jpg',
    required: false,
  })
  avatar?: string;

  @ApiProperty({ example: 4.8 })
  rating: Decimal;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ example: 'TIER_3' })
  kycTier: string;

  @ApiProperty({ example: 'APPROVED' })
  kycStatus: string;
}

export class UserSettingsResponseDto {
  @ApiProperty({ example: true })
  emailNotifications: boolean;

  @ApiProperty({ example: false })
  smsNotifications: boolean;

  @ApiProperty({ example: true })
  pushNotifications: boolean;

  @ApiProperty({ example: true })
  publicProfile: boolean;

  @ApiProperty({ example: false })
  twoFactorEnabled: boolean;

  @ApiProperty({ example: 'en' })
  language: string;

  @ApiProperty({ example: 'America/Los_Angeles' })
  timezone: string;

  @ApiProperty({ example: 'USD' })
  currency: string;
}

export class UserPreferencesResponseDto {
  @ApiProperty({ example: 'AUTO' })
  theme: 'LIGHT' | 'DARK' | 'AUTO';

  @ApiProperty({ example: 'INTERNAL_LEDGER' })
  defaultPaymentMethod: string;

  @ApiProperty({ example: false })
  autoAcceptBids: boolean;

  @ApiProperty({ example: 75 })
  bidNotificationThreshold: number;
}

export class UserStatisticsResponseDto {
  // Both GC and Worker
  @ApiProperty({ example: 4.8 })
  averageRating: number;

  // GC-specific
  @ApiProperty({ example: 5, description: 'For GC users' })
  projectsCreated?: number;

  @ApiProperty({ example: 2, description: 'For GC users' })
  projectsActive?: number;

  @ApiProperty({ example: '1200000.00', description: 'For GC users' })
  totalBudgetAllocated?: Decimal;

  @ApiProperty({ example: 8, description: 'For GC users' })
  paymentsIssued?: number;

  @ApiProperty({ example: '5000.00', description: 'For GC users' })
  averagePaymentAmount?: Decimal;

  @ApiProperty({
    example: [
      {
        id: 'worker-123',
        name: 'Mike Smith',
        rating: 4.9,
        assignmentCount: 3,
      },
    ],
    description: 'For GC users',
  })
  topWorkers?: any[];

  // Worker-specific
  @ApiProperty({ example: 12, description: 'For worker users' })
  bidsSubmitted?: number;

  @ApiProperty({ example: 5, description: 'For worker users' })
  bidsAccepted?: number;

  @ApiProperty({ example: 3, description: 'For worker users' })
  jobsCompleted?: number;

  @ApiProperty({ example: '45000.00', description: 'For worker users' })
  totalEarnings?: Decimal;

  @ApiProperty({ example: 2, description: 'For worker users' })
  certifications?: number;
}
