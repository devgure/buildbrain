import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/auth/decorators/current-user.decorator';
import { ComplianceService } from './compliance.service';
import { User } from '@prisma/client';
import {
  InitiateKYCDto,
  VerifyLicenseDto,
  VerifyInsuranceDto,
  KYCResponseDto,
  LicenseResponseDto,
  InsuranceResponseDto,
  ComplianceStatusResponseDto,
} from './compliance.dto';

@ApiTags('Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('kyc/initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate KYC (Know Your Customer) verification',
    description: 'Start identity verification process using Persona',
  })
  @ApiCreatedResponse({
    description: 'KYC verification initiated',
    type: KYCResponseDto,
  })
  async initiateKYC(
    @CurrentUser() user: User,
    @Body() kycData: InitiateKYCDto,
  ): Promise<KYCResponseDto> {
    return this.complianceService.initiateKYCVerification(user.id, kycData);
  }

  @Post('license/verify')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Verify professional license',
    description: 'Verify contractor, electrician, or other professional license against state databases',
  })
  @ApiCreatedResponse({
    description: 'License verification completed',
    type: LicenseResponseDto,
  })
  async verifyLicense(
    @CurrentUser() user: User,
    @Body() licenseData: VerifyLicenseDto,
  ): Promise<LicenseResponseDto> {
    return this.complianceService.verifyLicense(user.id, licenseData);
  }

  @Post('insurance/verify')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Verify insurance coverage',
    description: 'Verify General Liability, Workers Compensation, or Professional Liability insurance',
  })
  @ApiCreatedResponse({
    description: 'Insurance verification completed',
  })
  async verifyInsurance(
    @CurrentUser() user: User,
    @Body() insuranceData: VerifyInsuranceDto,
  ) {
    return this.complianceService.verifyInsurance(user.id, insuranceData);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get user compliance status',
    description: 'Retrieve KYC tier, insurance status, certifications, and compliance score',
  })
  @ApiOkResponse({
    description: 'Compliance status retrieved',
    type: ComplianceStatusResponseDto,
  })
  async getComplianceStatus(
    @CurrentUser() user: User,
  ): Promise<ComplianceStatusResponseDto> {
    return this.complianceService.getComplianceStatus(user.id);
  }

  @Get('aml-screening/:fullName')
  @ApiOperation({
    summary: 'Screen name against AML databases',
    description: 'Check if a person or business name appears in OFAC or other sanctions lists',
  })
  @ApiOkResponse({
    description: 'AML screening completed',
  })
  async screenAML(@Param('fullName') fullName: string) {
    // In production, would sanitize and validate country from query params
    return this.complianceService.screenAML(fullName, 'US');
  }

  @Get('kyc-status/:userId')
  @ApiOperation({
    summary: 'Get specific user KYC tier and status',
    description: 'Admin endpoint to retrieve user KYC classification',
  })
  @ApiOkResponse({
    description: 'User KYC status retrieved',
  })
  async getKYCStatus(@Param('userId') userId: string) {
    const user = await this.complianceService['prisma'].user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycTier: true,
        kycStatus: true,
        email: true,
      },
    });
    
    return user;
  }

  @Patch('kyc-status/:userId')
  @ApiOperation({
    summary: 'Update user KYC status (Admin)',
    description: 'Manually approve, reject, or change KYC tier for a user',
  })
  @ApiOkResponse({
    description: 'KYC status updated',
  })
  async updateKYCStatus(
    @Param('userId') userId: string,
    @Body() updateData: { status: string; tier: string },
  ) {
    return this.complianceService['prisma'].user.update({
      where: { id: userId },
      data: {
        kycStatus: updateData.status,
        kycTier: updateData.tier,
      },
    });
  }
}
