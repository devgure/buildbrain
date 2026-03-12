import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches, IsEnum, IsOptional, IsPhoneNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ============= REQUEST DTOs =============

export class RegisterDto {
  @ApiProperty({ example: 'gc@constructionco.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Must be at least 8 characters' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain lowercase, uppercase, number, and special character',
  })
  password: string;

  @ApiProperty({ enum: ['GC', 'SUBCONTRACTOR', 'WORKER', 'GOVERNMENT', 'SUPPLIER'] })
  @IsEnum(['GC', 'SUBCONTRACTOR', 'WORKER', 'GOVERNMENT', 'SUPPLIER'])
  role: 'GC' | 'SUBCONTRACTOR' | 'WORKER' | 'GOVERNMENT' | 'SUPPLIER';

  @ApiProperty({ example: 'BuildCorp Solutions' })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'gc@constructionco.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'MFA token if 2FA enabled' })
  @IsOptional()
  @IsString()
  mfaToken?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token from previous authentication' })
  @IsString()
  refreshToken: string;
}

export class StartKYCDto {
  @ApiProperty({ enum: ['TIER_1', 'TIER_2', 'TIER_3'], description: 'KYC verification tier' })
  @IsEnum(['TIER_1', 'TIER_2', 'TIER_3'])
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token sent via email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

// ============= RESPONSE DTOs =============

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiProperty({ enum: ['TIER_1', 'TIER_2', 'TIER_3'] })
  kycTier: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  kycStatus: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token (expires in 7 days)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (expires in 30 days)' })
  refreshToken: string;

  @ApiProperty()
  user: UserDto;

  @ApiPropertyOptional({ description: 'MFA URL if 2FA is required' })
  mfaRequired?: boolean;

  @ApiPropertyOptional({ description: 'Setup URL for KYC verification if needed' })
  kycRequired?: boolean;
}

export class KYCStatusDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiPropertyOptional()
  tier?: string;

  @ApiPropertyOptional()
  inquisitionId?: string;

  @ApiPropertyOptional()
  verificationUrl?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  updatedAt: Date;
}

export class PasswordResetResponseDto {
  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  resetToken?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;
}

export class VerifyEmailResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  emailVerified: boolean;
}

export class DecodedTokenDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  iat: number;

  @ApiProperty()
  exp: number;
}

export class RefreshTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiPropertyOptional()
  refreshToken?: string;

  @ApiProperty()
  expiresIn: number;
}
