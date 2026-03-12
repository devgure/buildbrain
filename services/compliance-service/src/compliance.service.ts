import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';

export interface KYCVerificationResult {
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'MANUAL_REVIEW';
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  monthlyLimit: Decimal;
  verification: {
    identity: boolean;
    address: boolean;
    bankAccount?: boolean;
    businessDocuments?: boolean;
  };
  riskScore: number; // 0-100, higher = riskier
  message: string;
}

export interface AMLScreeningResult {
  hits: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matches: Array<{
    name: string;
    category: string;
    country: string;
    strength: number; // 0-100 match confidence
  }>;
  requiresManualReview: boolean;
}

export interface LicenseVerificationResult {
  licenseNumber: string;
  licenseType: string;
  issuingState: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'NOT_FOUND';
  expirationDate: Date;
  verified: boolean;
  verificationDate: Date;
}

@Injectable()
export class ComplianceService {
  private personaApiUrl = 'https://api-prod.us.persona.com';
  private personaApiKey = this.configService.get<string>('PERSONA_API_KEY') || 'test_key';
  
  private ofacApiUrl = 'https://www.treasury.gov/ofac';
  
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Initiate KYC verification for a user
   * Uses Persona for identity, address, and bank account verification
   */
  async initiateKYCVerification(userId: string, kycData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    socialSecurityNumber?: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    businessName?: string;
    ein?: string;
  }): Promise<KYCVerificationResult> {
    try {
      // Create Persona inquiry (mock for now, would call actual API in production)
      const personaResponse = await this.createPersonaInquiry(kycData);
      
      // Check for AML hits immediately
      const amlScreening = await this.screenAML(
        `${kycData.firstName} ${kycData.lastName}`,
        kycData.address.country || 'US',
      );
      
      // Assess risk based on AML results
      const riskScore = this.calculateRiskScore(amlScreening, kycData);
      
      // Determine tier based on verification level
      let tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
      let monthlyLimit: Decimal;
      let status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'MANUAL_REVIEW';
      
      if (amlScreening.riskLevel === 'CRITICAL') {
        tier = 'TIER_1';
        monthlyLimit = new Decimal('1000');
        status = 'REJECTED';
      } else if (amlScreening.riskLevel === 'HIGH' || riskScore > 75) {
        tier = 'TIER_1';
        monthlyLimit = new Decimal('1000');
        status = 'MANUAL_REVIEW';
      } else if (personaResponse.documentVerified && personaResponse.addressVerified) {
        tier = 'TIER_3';
        monthlyLimit = new Decimal('999999');
        status = 'APPROVED';
      } else if (personaResponse.documentVerified) {
        tier = 'TIER_2';
        monthlyLimit = new Decimal('10000');
        status = 'APPROVED';
      } else {
        tier = 'TIER_1';
        monthlyLimit = new Decimal('1000');
        status = 'PENDING';
      }
      
      // Save verification result to database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          kycTier: tier,
          kycStatus: status,
        },
      });
      
      // Log verification for audit trail
      await this.prisma.complianceLog.create({
        data: {
          userId,
          eventType: 'KYC_INITIATED',
          eventData: {
            personaInquiryId: personaResponse.inquiryId,
            amlHits: amlScreening.hits,
            riskScore,
          },
          timestamp: new Date(),
        },
      });
      
      return {
        status,
        tier,
        monthlyLimit,
        verification: {
          identity: personaResponse.documentVerified,
          address: personaResponse.addressVerified,
          bankAccount: personaResponse.bankAccountVerified,
          businessDocuments: !!kycData.businessName && personaResponse.documentVerified,
        },
        riskScore,
        message: this.getKYCStatusMessage(status, tier),
      };
    } catch (error) {
      throw new BadRequestException(`KYC verification failed: ${error.message}`);
    }
  }

  /**
   * Verify a specific license (professional, contractor, etc.)
   * Queries state licensing databases
   */
  async verifyLicense(userId: string, licenseData: {
    licenseNumber: string;
    licenseType: 'CONTRACTOR' | 'ELECTRICIAN' | 'PLUMBER' | 'HVAC' | 'GAS_FITTER' | 'OTHER';
    issuingState: string;
  }): Promise<LicenseVerificationResult> {
    try {
      // Mock license verification (in production, would query state APIs)
      let status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'NOT_FOUND';
      let expirationDate = new Date();
      
      // Simple mock: licenses with "ACTIVE" in number are active
      if (licenseData.licenseNumber.includes('ACTIVE')) {
        status = 'ACTIVE';
        expirationDate.setFullYear(expirationDate.getFullYear() + 3);
      } else if (licenseData.licenseNumber.includes('EXPIRED')) {
        status = 'EXPIRED';
        expirationDate.setDate(expirationDate.getDate() - 1);
      } else if (licenseData.licenseNumber.includes('SUSPENDED')) {
        status = 'SUSPENDED';
        expirationDate.setFullYear(expirationDate.getFullYear() + 3);
      } else {
        status = 'NOT_FOUND';
      }
      
      const result: LicenseVerificationResult = {
        licenseNumber: licenseData.licenseNumber,
        licenseType: licenseData.licenseType,
        issuingState: licenseData.issuingState,
        status,
        expirationDate,
        verified: status === 'ACTIVE',
        verificationDate: new Date(),
      };
      
      // Save to database
      await this.prisma.certification.create({
        data: {
          userId,
          name: `${licenseData.licenseType} License`,
          issuedBy: licenseData.issuingState,
          licenseNumber: licenseData.licenseNumber,
          expirationDate,
          verified: result.verified,
        },
      });
      
      // Log verification
      await this.prisma.complianceLog.create({
        data: {
          userId,
          eventType: 'LICENSE_VERIFIED',
          eventData: {
            licenseType: licenseData.licenseType,
            status,
          },
          timestamp: new Date(),
        },
      });
      
      return result;
    } catch (error) {
      throw new BadRequestException(`License verification failed: ${error.message}`);
    }
  }

  /**
   * Screen name and details against OFAC and other AML databases
   */
  async screenAML(fullName: string, country: string): Promise<AMLScreeningResult> {
    try {
      // Mock AML screening (in production, would use OFAC/Comport API)
      // Simple rule-based mocking for demo
      const riskKeywords = ['sanctioned', 'blocked', 'terrorist', 'criminal'];
      const hasRiskKeyword = riskKeywords.some(keyword =>
        fullName.toLowerCase().includes(keyword),
      );
      
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      let matches: AMLScreeningResult['matches'] = [];
      
      if (hasRiskKeyword) {
        riskLevel = 'CRITICAL';
        matches.push({
          name: fullName,
          category: 'SANCTIONED_INDIVIDUAL',
          country: country || 'UNKNOWN',
          strength: 95,
        });
      } else if (country !== 'US') {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }
      
      return {
        hits: matches.length,
        riskLevel,
        matches,
        requiresManualReview: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      };
    } catch (error) {
      throw new BadRequestException(`AML screening failed: ${error.message}`);
    }
  }

  /**
   * Verify insurance document (GL, WC, etc.)
   */
  async verifyInsurance(userId: string, insuranceData: {
    type: 'GENERAL_LIABILITY' | 'WORKERS_COMP' | 'PROFESSIONAL_LIABILITY';
    provider: string;
    policyNumber: string;
    expirationDate: Date;
    documentUrl?: string;
  }): Promise<{ verified: boolean; message: string }> {
    try {
      const now = new Date();
      const verified = insuranceData.expirationDate > now;
      
      // Save insurance document
      await this.prisma.insuranceDocument.create({
        data: {
          userId,
          type: insuranceData.type,
          provider: insuranceData.provider,
          policyNumber: insuranceData.policyNumber,
          expirationDate: insuranceData.expirationDate,
          documentUrl: insuranceData.documentUrl,
          verified,
        },
      });
      
      // Log verification
      await this.prisma.complianceLog.create({
        data: {
          userId,
          eventType: 'INSURANCE_VERIFIED',
          eventData: {
            type: insuranceData.type,
            verified,
            expirationDate: insuranceData.expirationDate,
          },
          timestamp: new Date(),
        },
      });
      
      return {
        verified,
        message: verified
          ? `${insuranceData.type} verified until ${insuranceData.expirationDate.toISOString().split('T')[0]}`
          : `${insuranceData.type} has expired`,
      };
    } catch (error) {
      throw new BadRequestException(`Insurance verification failed: ${error.message}`);
    }
  }

  /**
   * Get compliance status for a user
   */
  async getComplianceStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycTier: true,
        kycStatus: true,
        certifications: true,
        insuranceDocuments: true,
      },
    });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    const insuranceStatus = {
      generalLiability: user.insuranceDocuments.find(d => d.type === 'GENERAL_LIABILITY'),
      workersComp: user.insuranceDocuments.find(d => d.type === 'WORKERS_COMP'),
      professionalLiability: user.insuranceDocuments.find(d => d.type === 'PROFESSIONAL_LIABILITY'),
    };
    
    // Check for expirations
    const now = new Date();
    const expiringSoon = Object.values(insuranceStatus).filter(doc => {
      if (!doc) return false;
      const daysUntilExpiry = Math.ceil(
        (doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });
    
    return {
      kycStatus: user.kycStatus,
      kycTier: user.kycTier,
      certifications: user.certifications,
      insurance: insuranceStatus,
      expiringSoon: expiringSoon.length > 0,
      expiringDocuments: expiringSoon,
      complianceScore: this.calculateComplianceScore(user),
    };
  }

  /**
   * Create a Persona inquiry (mock)
   */
  private async createPersonaInquiry(kycData: any) {
    // In production, would call:
    // const response = await axios.post(`${this.personaApiUrl}/inquiries`, {
    //   fields: {
    //     name_first: { value: kycData.firstName },
    //     name_last: { value: kycData.lastName },
    //     birthdate: { value: kycData.dateOfBirth },
    //     email: { value: kycData.email },
    //     address_street_1: { value: kycData.address.street },
    //     address_city: { value: kycData.address.city },
    //     address_subdivision: { value: kycData.address.state },
    //     address_postal_code: { value: kycData.address.zipCode },
    //   },
    // }, {
    //   headers: { 'Authorization': `Bearer ${this.personaApiKey}` }
    // });
    
    // Mock response
    return {
      inquiryId: `inq_${Date.now()}`,
      documentVerified: true,
      addressVerified: kycData.address.zipCode?.length === 5,
      bankAccountVerified: false,
    };
  }

  /**
   * Calculate risk score based on multiple factors
   */
  private calculateRiskScore(amlScreening: AMLScreeningResult, kycData: any): number {
    let score = 0;
    
    // AML risk
    if (amlScreening.riskLevel === 'CRITICAL') score += 100;
    else if (amlScreening.riskLevel === 'HIGH') score += 75;
    else if (amlScreening.riskLevel === 'MEDIUM') score += 25;
    
    // No SSN provided (business vs individual)
    if (!kycData.socialSecurityNumber && !kycData.ein) score += 15;
    
    // Address factors
    if (!kycData.address.zipCode) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(user: any): number {
    let score = 50; // Base score
    
    // KYC tier bonus
    if (user.kycStatus === 'APPROVED') score += 30;
    else if (user.kycStatus === 'PENDING') score += 0;
    else if (user.kycStatus === 'REJECTED') score -= 50;
    
    // Insurance bonus
    const activeInsurance = Object.values(user.insurance).filter(d => d?.verified).length;
    score += activeInsurance * 10;
    
    // Certifications bonus
    const activeCerts = user.certifications.filter(c => c.verified).length;
    score += Math.min(activeCerts * 5, 20);
    
    return Math.max(Math.min(score, 100), 0);
  }

  /**
   * Get user-friendly KYC status message
   */
  private getKYCStatusMessage(status: string, tier: string): string {
    const messages = {
      APPROVED: 'Your identity has been verified! You can now use all platform features.',
      PENDING: 'Your verification is in progress. We\'ll notify you once complete.',
      MANUAL_REVIEW: 'Your account requires manual review. Our team will contact you within 24-48 hours.',
      REJECTED: 'We were unable to verify your identity. Please contact support for assistance.',
    };
    
    const tierMessages = {
      TIER_1: ' You have a $1,000/month spending limit.',
      TIER_2: ' You have a $10,000/month spending limit.',
      TIER_3: ' You have unlimited spending access.',
    };
    
    return (messages[status] || messages.PENDING) + tierMessages[tier];
  }
}
