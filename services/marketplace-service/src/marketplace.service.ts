import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create job listing (post by GC/contractor)
   */
  async createJob(userId: string, dto: any) {
    const job = await this.prisma.job.create({
      data: {
        createdById: userId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        requiredSkills: dto.requiredSkills || [],
        hourlyRate: dto.hourlyRate ? new Decimal(dto.hourlyRate) : null,
        totalBudget: dto.totalBudget ? new Decimal(dto.totalBudget) : null,
        duration: dto.duration,
        location: dto.location,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        geoLat: parseFloat(dto.geoLat) || null,
        geoLng: parseFloat(dto.geoLng) || null,
        openPositions: dto.openPositions || 1,
        status: 'OPEN',
      },
      include: {
        createdBy: { select: { email: true, companyName: true, rating: true } },
      },
    });

    return job;
  }

  /**
   * Search for open jobs with filters
   */
  async searchJobs(workerId: string, dto: SearchJobsDto) {
    let where: any = {
      status: 'OPEN',
    };

    // Skill matching
    if (dto.skills && dto.skills.length > 0) {
      where.requiredSkills = {
        hasSome: dto.skills,
      };
    }

    // Category filter
    if (dto.category) {
      where.category = dto.category;
    }

    // Rate range
    if (dto.minRate) {
      where.hourlyRate = {
        gte: new Decimal(dto.minRate),
      };
    }
    if (dto.maxRate) {
      where.hourlyRate = {
        ...(where.hourlyRate || {}),
        lte: new Decimal(dto.maxRate),
      };
    }

    // Location/geo proximity
    if (dto.latitude && dto.longitude && dto.radiusKm) {
      // Simplified: in production use PostGIS or ElasticSearch for geo queries
      where.location = {
        contains: dto.location,
      };
    }

    const skip = dto.skip || 0;
    const take = dto.take || 20;

    const jobs = await this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        createdBy: {
          select: { id: true, email: true, companyName: true, rating: true },
        },
        bids: {
          where: { bidderId: workerId },
          select: { id: true, status: true },
        },
      },
    });

    const total = await this.prisma.job.count({ where });

    // Score jobs by relevance to worker
    const scoredJobs = await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        relevanceScore: await this.calculateJobRelevance(workerId, job),
        hasApplied: job.bids.length > 0,
      })),
    );

    // Sort by relevance
    scoredJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { data: scoredJobs, total, skip, take };
  }

  /**
   * Calculate relevance score of job for worker (AI scoring)
   */
  private async calculateJobRelevance(workerId: string, job: any): Promise<number> {
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
      include: { skills: true },
    });

    if (!worker) return 0;

    let score = 50; // Base score

    // Skill match
    const matchedSkills = (worker.skills || []).filter((s) =>
      job.requiredSkills?.includes(s.name),
    ).length;
    const skillScore = (matchedSkills / (job.requiredSkills?.length || 1)) * 40;
    score += skillScore;

    // Rating bonus
    if (worker.rating) {
      score += Math.min(worker.rating / 5, 1) * 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Get job details
   */
  async getJob(jobId: string, userId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        createdBy: {
          select: { id: true, email: true, companyName: true, rating: true },
        },
        bids: userId
          ? {
              select: {
                id: true,
                bidderId: true,
                amount: true,
                status: true,
                proposal: true,
              },
            }
          : false,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  /**
   * Submit bid on job
   */
  async submitBid(jobId: string, userId: string, dto: CreateBidDto) {
    const job = await this.getJob(jobId);

    // Cannot bid on own job
    if (job.createdBy.id === userId) {
      throw new BadRequestException('Cannot bid on your own job');
    }

    // Check if already bid
    const existingBid = await this.prisma.bid.findFirst({
      where: {
        jobId,
        bidderId: userId,
      },
    });

    if (existingBid) {
      throw new BadRequestException('Already submitted a bid for this job');
    }

    // Create bid
    const bid = await this.prisma.bid.create({
      data: {
        jobId,
        bidderId: userId,
        amount: new Decimal(dto.amount),
        proposal: dto.proposal,
        portfolio: dto.portfolio || [],
        expectedDuration: dto.expectedDuration,
        status: 'SUBMITTED',
      },
      include: {
        bidder: {
          select: { id: true, email: true, rating: true, skills: true },
        },
      },
    });

    // Calculate AI match score
    const aiScore = await this.calculateBidScore(bid, job);
    const updated = await this.prisma.bid.update({
      where: { id: bid.id },
      data: { aiScore },
    });

    return updated;
  }

  /**
   * Calculate AI match score for bid (LLM-powered)
   */
  private async calculateBidScore(bid: any, job: any): Promise<Decimal> {
    // Simplified scoring logic (in production: LLM evaluation)
    let score = 50;

    // Rating
    if (bid.bidder.rating) {
      score += Math.min(bid.bidder.rating / 5, 1) * 25;
    }

    // Skill match
    const matchedSkills = (bid.bidder.skills || []).filter((s) =>
      job.requiredSkills?.includes(s.name),
    ).length;
    const skillScore = (matchedSkills / (job.requiredSkills?.length || 1)) * 15;
    score += skillScore;

    // Price competitiveness
    if (job.hourlyRate) {
      const bidRate = bid.amount / 8; // Assume 8-hour day
      const ratioDiff = Math.abs(job.hourlyRate.toNumber() - bidRate.toNumber()) /
        job.hourlyRate.toNumber();
      const priceScore = Math.max(0, 10 * (1 - ratioDiff));
      score += priceScore;
    }

    return new Decimal(Math.min(score, 100));
  }

  /**
   * Accept/select winning bid
   */
  async acceptBid(jobId: string, bidId: string, userId: string) {
    const job = await this.getJob(jobId);

    if (job.createdBy.id !== userId) {
      throw new ForbiddenException('Only job creator can accept bids');
    }

    // Mark selected bid as ACCEPTED
    const accepted = await this.prisma.bid.update({
      where: { id: bidId },
      data: { status: 'ACCEPTED' },
    });

    // Mark all other bids as REJECTED
    await this.prisma.bid.updateMany({
      where: {
        jobId,
        id: { not: bidId },
      },
      data: { status: 'REJECTED' },
    });

    // Create contract/assignment
    const assignment = await this.prisma.projectAssignment.create({
      data: {
        projectId: job.id, // or create proper relationship
        workerId: accepted.bidderId,
        role: 'ASSIGNED',
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });

    return { bid: accepted, assignment };
  }

  /**
   * Get active jobs for user (those they've bid on or created)
   */
  async getMyJobs(userId: string, role: 'creator' | 'bidder' = 'creator') {
    let where: any = {};

    if (role === 'creator') {
      where.createdBy = { id: userId };
    } else {
      where.bids = {
        some: { bidderId: userId },
      };
    }

    const jobs = await this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { companyName: true } },
        bids: {
          where: { bidderId: userId },
          select: { id: true, status: true, amount: true },
        },
      },
    });

    return jobs;
  }

  /**
   * Get bids for a job (only visible to job creator)
   */
  async getJobBids(jobId: string, userId: string) {
    const job = await this.getJob(jobId);

    if (job.createdBy.id !== userId) {
      throw new ForbiddenException('Only job creator can view bids');
    }

    const bids = await this.prisma.bid.findMany({
      where: { jobId },
      orderBy: { aiScore: 'desc' },
      include: {
        bidder: {
          select: {
            id: true,
            email: true,
            companyName: true,
            rating: true,
            skills: true,
          },
        },
      },
    });

    return bids;
  }

  /**
   * Close job (no more bids accepted)
   */
  async closeJob(jobId: string, userId: string) {
    const job = await this.getJob(jobId);

    if (job.createdBy.id !== userId) {
      throw new ForbiddenException('Only job creator can close job');
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Get worker profile with ratings and reviews
   */
  async getWorkerProfile(workerId: string) {
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
      include: {
        skills: true,
        portfolio: true,
        certifications: true,
        assignedJobs: {
          select: {
            role: true,
            status: true,
            assignedAt: true,
          },
        },
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    // Get reviews and ratings
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: workerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...worker,
      reviews,
      totalReviews: reviews.length,
      averageRating: worker.rating || 0,
    };
  }

  /**
   * Rate/review completed work
   */
  async submitReview(
    fromUserId: string,
    toUserId: string,
    jobId: string,
    dto: {
      rating: number;
      comment: string;
    },
  ) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const review = await this.prisma.review.create({
      data: {
        reviewerId: fromUserId,
        revieweeId: toUserId,
        jobId,
        rating: dto.rating,
        comment: dto.comment,
        createdAt: new Date(),
      },
    });

    // Update reviewer's average rating
    const allReviews = await this.prisma.review.findMany({
      where: { revieweeId: toUserId },
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await this.prisma.user.update({
      where: { id: toUserId },
      data: { rating: new Decimal(avgRating) },
    });

    return review;
  }
}
