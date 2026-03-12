import { IsString, IsEmail, IsDateString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class InitiateKYCDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '1990-01-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: '123-45-6789', required: false })
  @IsOptional()
  @IsString()
  socialSecurityNumber?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1-555-123-4567' })
  @IsString()
  phone: string;

  @ApiProperty({
    example: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
    },
  })
  @IsObject()
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  @ApiProperty({ example: 'Acme Construction', required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ example: '12-3456789', required: false })
  @IsOptional()
  @IsString()
  ein?: string;
}

export class VerifyLicenseDto {
  @ApiProperty({ example: 'C-123456' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({
    enum: ['CONTRACTOR', 'ELECTRICIAN', 'PLUMBER', 'HVAC', 'GAS_FITTER', 'OTHER'],
    example: 'CONTRACTOR',
  })
  @IsEnum(['CONTRACTOR', 'ELECTRICIAN', 'PLUMBER', 'HVAC', 'GAS_FITTER', 'OTHER'])
  licenseType: string;

  @ApiProperty({ example: 'CA' })
  @IsString()
  issuingState: string;
}

export class VerifyInsuranceDto {
  @ApiProperty({
    enum: ['GENERAL_LIABILITY', 'WORKERS_COMP', 'PROFESSIONAL_LIABILITY'],
    example: 'GENERAL_LIABILITY',
  })
  @IsEnum(['GENERAL_LIABILITY', 'WORKERS_COMP', 'PROFESSIONAL_LIABILITY'])
  type: string;

  @ApiProperty({ example: 'State Farm' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 'POL-123456789' })
  @IsString()
  policyNumber: string;

  @ApiProperty({ example: '2025-12-31' })
  @IsDateString()
  expirationDate: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/buildbrain-docs/insurance-123.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  documentUrl?: string;
}

export class KYCResponseDto {
  @ApiProperty({ example: 'APPROVED' })
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'MANUAL_REVIEW';

  @ApiProperty({ example: 'TIER_3' })
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';

  @ApiProperty({ example: '999999' })
  monthlyLimit: Decimal;

  @ApiProperty({
    example: {
      identity: true,
      address: true,
      bankAccount: false,
      businessDocuments: false,
    },
  })
  verification: {
    identity: boolean;
    address: boolean;
    bankAccount?: boolean;
    businessDocuments?: boolean;
  };

  @ApiProperty({ example: 15 })
  riskScore: number;

  @ApiProperty({
    example: 'Your identity has been verified! You can now use all platform features.',
  })
  message: string;
}

export class LicenseResponseDto {
  @ApiProperty({ example: 'C-123456' })
  licenseNumber: string;

  @ApiProperty({ example: 'CONTRACTOR' })
  licenseType: string;

  @ApiProperty({ example: 'CA' })
  issuingState: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'NOT_FOUND';

  @ApiProperty({ example: '2026-12-31' })
  expirationDate: Date;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ example: '2024-01-15' })
  verificationDate: Date;
}

export class InsuranceResponseDto {
  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({
    example: 'GENERAL_LIABILITY verified until 2025-12-31',
  })
  message: string;
}

export class ComplianceStatusResponseDto {
  @ApiProperty({ example: 'APPROVED' })
  kycStatus: string;

  @ApiProperty({ example: 'TIER_3' })
  kycTier: string;

  @ApiProperty({
    example: [
      {
        id: 'cert-123',
        name: 'CONTRACTOR License',
        issuedBy: 'CA',
        verified: true,
        expirationDate: '2026-12-31',
      },
    ],
  })
  certifications: any[];

  @ApiProperty({
    example: {
      generalLiability: {
        type: 'GENERAL_LIABILITY',
        provider: 'State Farm',
        expirationDate: '2025-12-31',
        verified: true,
      },
      workersComp: null,
      professionalLiability: null,
    },
  })
  insurance: {
    generalLiability?: any;
    workersComp?: any;
    professionalLiability?: any;
  };

  @ApiProperty({ example: false })
  expiringSoon: boolean;

  @ApiProperty({
    example: [
      {
        type: 'GENERAL_LIABILITY',
        expirationDate: '2025-02-15',
      },
    ],
  })
  expiringDocuments: any[];

  @ApiProperty({
    example: 88,
    description: 'Compliance score from 0-100',
  })
  complianceScore: number;
}
