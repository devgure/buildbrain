import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/database/prisma.service';
import axios from 'axios';

export interface SamGovOpportunity {
  id: string;
  title: string;
  description: string;
  agency: string;
  postedDate: Date;
  deadline: Date;
  estimatedValue: number;
  naicsCode: string[];
  setAside: string;
  classification: string;
}

export interface BidMatch {
  opportunityId: string;
  userId: string;
  matchScore: number; // 0-100
  reasons: string[]; // Why this bid matches
}

@Injectable()
export class GovProcurementService {
  private samGovBaseUrl = 'https://api.sam.gov/opportunities/v2';
  private samGovApiKey = this.configService.get<string>('SAM_GOV_API_KEY');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Search SAM.gov for RFP opportunities
   */
  async searchOpportunities(query: string, limit: number = 50): Promise<SamGovOpportunity[]> {
    try {
      const params = {
        api_key: this.samGovApiKey,
        keyword: query,
        limit,
      };

      if (!this.samGovApiKey) {
        // Mock data for development
        return this.getMockOpportunities(query, limit);
      }

      const response = await axios.get(`${this.samGovBaseUrl}/search`, { params });

      return response.data.opportunitiesData?.map((opp: any) => ({
        id: opp.opportunityID,
        title: opp.title,
        description: opp.description,
        agency: opp.agency,
        postedDate: new Date(opp.postedDate),
        deadline: new Date(opp.responseDeadline),
        estimatedValue: opp.estimatedValue || 0,
        naicsCode: opp.naicsCode || [],
        setAside: opp.setAside || 'UNRESTRICTED',
        classification: opp.classificaton || 'GENERAL',
      })) || [];
    } catch (error) {
      console.error('SAM.gov search failed:', error);
      throw new BadRequestException('Failed to search opportunities');
    }
  }

  /**
   * Get opportunity details
   */
  async getOpportunityDetails(opportunityId: string): Promise<SamGovOpportunity> {
    try {
      const params = {
        api_key: this.samGovApiKey,
      };

      if (!this.samGovApiKey) {
        // Mock data
        return this.getMockOpportunity(opportunityId);
      }

      const response = await axios.get(
        `${this.samGovBaseUrl}/${opportunityId}`,
        { params },
      );

      const opp = response.data;

      return {
        id: opp.opportunityID,
        title: opp.title,
        description: opp.description,
        agency: opp.agency,
        postedDate: new Date(opp.postedDate),
        deadline: new Date(opp.responseDeadline),
        estimatedValue: opp.estimatedValue || 0,
        naicsCode: opp.naicsCode || [],
        setAside: opp.setAside || 'UNRESTRICTED',
        classification: opp.classificaton || 'GENERAL',
      };
    } catch (error) {
      console.error('Failed to get opportunity details:', error);
      throw new BadRequestException('Failed to retrieve opportunity');
    }
  }

  /**
   * Match worker skills to opportunity
   */
  async matchWorkerToOpportunity(
    workerId: string,
    opportunityId: string,
  ): Promise<BidMatch | null> {
    try {
      // Get opportunity details
      const opportunity = await this.getOpportunityDetails(opportunityId);

      // Get worker skills and profile
      const worker = await this.prisma.user.findUnique({
        where: { id: workerId },
        include: { userSkills: true },
      });

      if (!worker) {
        throw new BadRequestException('Worker not found');
      }

      // Calculate match score
      const matchScore = this.calculateMatchScore(worker, opportunity);

      if (matchScore < 40) {
        return null;
      }

      const reasons = this.getMatchReasons(worker, opportunity);

      return {
        opportunityId,
        userId: workerId,
        matchScore,
        reasons,
      };
    } catch (error) {
      console.error('Worker matching failed:', error);
      return null;
    }
  }

  /**
   * Find matching opportunities for worker
   */
  async findMatchingOpportunities(
    workerId: string,
    limit: number = 10,
  ): Promise<BidMatch[]> {
    try {
      const worker = await this.prisma.user.findUnique({
        where: { id: workerId },
        include: { userSkills: true },
      });

      if (!worker) {
        throw new BadRequestException('Worker not found');
      }

      // Get recent opportunities
      const opportunities = await this.getRecentOpportunities(limit * 3);

      const matches: BidMatch[] = [];

      for (const opportunity of opportunities) {
        const match = await this.matchWorkerToOpportunity(workerId, opportunity.id);
        if (match && match.matchScore >= 50) {
          matches.push(match);
        }
      }

      // Sort by match score
      return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
    } catch (error) {
      console.error('Opportunity matching failed:', error);
      return [];
    }
  }

  /**
   * Get recent opportunities
   */
  async getRecentOpportunities(limit: number = 100): Promise<SamGovOpportunity[]> {
    try {
      // Query recent opportunities from cache/DB first, then SAM.gov
      const cached = await this.prisma.govOpportunity.findMany({
        orderBy: { postedDate: 'desc' },
        take: limit,
      });

      if (cached.length > 0) {
        return cached.map(opp => ({
          id: opp.externalId,
          title: opp.title,
          description: opp.description,
          agency: opp.agency,
          postedDate: opp.postedDate,
          deadline: opp.deadline,
          estimatedValue: Number(opp.estimatedValue),
          naicsCode: opp.naicsCode || [],
          setAside: opp.setAside,
          classification: opp.classification,
        }));
      }

      // Fetch from SAM.gov and cache
      const opportunities = await this.searchOpportunities('', limit);

      // Cache opportunities
      for (const opp of opportunities) {
        await this.prisma.govOpportunity.upsert({
          where: { externalId: opp.id },
          update: {
            title: opp.title,
            description: opp.description,
            postedDate: opp.postedDate,
            deadline: opp.deadline,
          },
          create: {
            externalId: opp.id,
            title: opp.title,
            description: opp.description,
            agency: opp.agency,
            postedDate: opp.postedDate,
            deadline: opp.deadline,
            estimatedValue: opp.estimatedValue,
            naicsCode: opp.naicsCode,
            setAside: opp.setAside,
            classification: opp.classification,
          },
        });
      }

      return opportunities;
    } catch (error) {
      console.error('Failed to get recent opportunities:', error);
      return [];
    }
  }

  /**
   * Submit bid for opportunity
   */
  async submitBid(
    workerId: string,
    opportunityId: string,
    bidAmount: string,
  ): Promise<any> {
    try {
      const opportunity = await this.getOpportunityDetails(opportunityId);

      // Create bid record
      const bid = await this.prisma.bid.create({
        data: {
          workerId,
          projectId: opportunityId, // or create GovBid table if separate
          amount: bidAmount,
          status: 'PENDING',
          description: `Bid for ${opportunity.title}`,
        },
      });

      return {
        success: true,
        bidId: bid.id,
        opportunityId,
        amount: bidAmount,
        status: 'PENDING',
      };
    } catch (error) {
      console.error('Bid submission failed:', error);
      throw new BadRequestException('Failed to submit bid');
    }
  }

  /**
   * Watch opportunity for updates
   */
  async watchOpportunity(
    userId: string,
    opportunityId: string,
  ): Promise<any> {
    try {
      const watch = await this.prisma.govOpportunityWatch.create({
        data: {
          userId,
          opportunityId,
        },
      });

      return {
        success: true,
        watchId: watch.id,
      };
    } catch (error) {
      console.error('Watch creation failed:', error);
      throw new BadRequestException('Failed to watch opportunity');
    }
  }

  /**
   * Get watched opportunities
   */
  async getWatchedOpportunities(userId: string): Promise<any[]> {
    try {
      const watched = await this.prisma.govOpportunityWatch.findMany({
        where: { userId },
        include: { govOpportunity: true },
      });

      return watched.map(w => ({
        id: w.govOpportunity.externalId,
        title: w.govOpportunity.title,
        agency: w.govOpportunity.agency,
        deadline: w.govOpportunity.deadline,
        watchedSince: w.createdAt,
      }));
    } catch (error) {
      console.error('Failed to get watched opportunities:', error);
      return [];
    }
  }

  /**
   * Get worker's bid history
   */
  async getWorkerBidHistory(workerId: string, skip = 0, take = 20): Promise<any> {
    try {
      const [bids, total] = await Promise.all([
        this.prisma.bid.findMany({
          where: { workerId },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.bid.count({ where: { workerId } }),
      ]);

      return {
        bids: bids.map(b => ({
          id: b.id,
          amount: b.amount,
          status: b.status,
          submittedAt: b.createdAt,
          acceptedAt: b.acceptedAt,
        })),
        total,
      };
    } catch (error) {
      console.error('Failed to get bid history:', error);
      return { bids: [], total: 0 };
    }
  }

  /**
   * Calculate match score between worker and opportunity
   */
  private calculateMatchScore(worker: any, opportunity: SamGovOpportunity): number {
    let score = 0;

    // Skills match (40%)
    const skillMatch = this.calculateSkillMatch(worker.userSkills, opportunity);
    score += skillMatch * 0.4;

    // KYC/Tier match (30%)
    const kycMatch = this.calculateKYCMatch(worker.kycTier, opportunity.setAside);
    score += kycMatch * 0.3;

    // History match (20%)
    const historyMatch = worker.rating ? (worker.rating / 5) * 100 : 0;
    score += historyMatch * 0.2;

    // Other factors (10%)
    const otherMatch = opportunity.classification === 'GENERAL' ? 50 : 25;
    score += otherMatch * 0.1;

    return Math.min(100, score);
  }

  /**
   * Calculate skill match percentage
   */
  private calculateSkillMatch(skills: any[], opportunity: SamGovOpportunity): number {
    if (!skills || skills.length === 0) return 25;

    // Extract keywords from opportunity
    const keywords = [
      ...opportunity.title.toLowerCase().split(' '),
      ...opportunity.description.toLowerCase().split(' '),
    ].filter(k => k.length > 3);

    // Match worker skills to keywords
    const matches = skills.filter(s =>
      keywords.some(k => s.name.toLowerCase().includes(k)),
    ).length;

    return (matches / Math.max(skills.length, keywords.length)) * 100;
  }

  /**
   * Calculate KYC match
   */
  private calculateKYCMatch(kycTier: string, setAside: string): number {
    // TIER_3 can bid on anything
    if (kycTier === 'TIER_3') return 100;

    // TIER_2 can bid on most things except HUBZone
    if (kycTier === 'TIER_2' && setAside !== 'HUBZONE') return 80;

    // TIER_1 can bid on unrestricted
    if (setAside === 'UNRESTRICTED') return 60;

    return 0;
  }

  /**
   * Get match reasons
   */
  private getMatchReasons(worker: any, opportunity: SamGovOpportunity): string[] {
    const reasons: string[] = [];

    if (worker.kycTier === 'TIER_3') {
      reasons.push('Fully verified contractor');
    }

    if (worker.rating && worker.rating >= 4.5) {
      reasons.push('Excellent track record');
    }

    if (opportunity.estimatedValue < 50000) {
      reasons.push('Project within typical scope');
    }

    if (worker.userSkills?.length > 0) {
      reasons.push(`${worker.userSkills.length} relevant skills`);
    }

    return reasons;
  }

  /**
   * Mock opportunities for development
   */
  private getMockOpportunities(query: string, limit: number): SamGovOpportunity[] {
    const mockData = [
      {
        id: 'opp-001',
        title: 'Office Building Renovation',
        description: 'Complete renovation of federal office building',
        agency: 'GSA',
        postedDate: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        estimatedValue: 150000,
        naicsCode: ['236220'],
        setAside: 'UNRESTRICTED',
        classification: 'GENERAL',
      },
      {
        id: 'opp-002',
        title: 'Bridge Repair Project',
        description: 'Structural repair of interstate bridge',
        agency: 'DOT',
        postedDate: new Date(),
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        estimatedValue: 500000,
        naicsCode: ['237310'],
        setAside: 'UNRESTRICTED',
        classification: 'GENERAL',
      },
    ];

    return mockData.slice(0, limit);
  }

  /**
   * Mock single opportunity
   */
  private getMockOpportunity(opportunityId: string): SamGovOpportunity {
    return {
      id: opportunityId,
      title: 'Government Infrastructure Project',
      description: 'Large-scale infrastructure improvement project',
      agency: 'USDOT',
      postedDate: new Date(),
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      estimatedValue: 750000,
      naicsCode: ['237310'],
      setAside: 'UNRESTRICTED',
      classification: 'GENERAL',
    };
  }
}
