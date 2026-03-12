import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateBidDto } from './dto/create-bid.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';

@ApiTags('Marketplace')
@Controller('marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /**
   * Create job listing
   */
  @Post('jobs')
  @ApiOperation({
    summary: 'Post job',
    description: 'Contractor posts new job for workers or subcontractors to bid on',
  })
  @ApiCreatedResponse({
    description: 'Job created successfully',
  })
  async createJob(@CurrentUser() userId: string, @Body() createJobDto: any) {
    return this.marketplaceService.createJob(userId, createJobDto);
  }

  /**
   * Search jobs
   */
  @Get('jobs/search')
  @ApiOperation({
    summary: 'Search jobs',
    description: 'Search available jobs with filters (skill, rate, location, category)',
  })
  @ApiOkResponse({
    description: 'List of matching jobs',
  })
  async searchJobs(@CurrentUser() userId: string, @Query() searchDto: any) {
    return this.marketplaceService.searchJobs(userId, {
      skills: searchDto.skills?.split(','),
      category: searchDto.category,
      minRate: searchDto.minRate,
      maxRate: searchDto.maxRate,
      location: searchDto.location,
      latitude: searchDto.latitude,
      longitude: searchDto.longitude,
      radiusKm: searchDto.radiusKm,
      skip: parseInt(searchDto.skip) || 0,
      take: parseInt(searchDto.take) || 20,
    });
  }

  /**
   * Get job details
   */
  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get job details',
    description: 'Retrieve job posting with all details',
  })
  @ApiOkResponse({
    description: 'Job details',
  })
  async getJob(@Param('jobId') jobId: string) {
    return this.marketplaceService.getJob(jobId);
  }

  /**
   * Submit bid on job
   */
  @Post('jobs/:jobId/bids')
  @ApiOperation({
    summary: 'Submit bid',
    description: 'Worker/subcontractor submits bid on job posting',
  })
  @ApiCreatedResponse({
    description: 'Bid submitted successfully',
  })
  async submitBid(
    @CurrentUser() userId: string,
    @Param('jobId') jobId: string,
    @Body() createBidDto: CreateBidDto,
  ) {
    return this.marketplaceService.submitBid(jobId, userId, createBidDto);
  }

  /**
   * Accept bid / select worker
   */
  @Patch('jobs/:jobId/bids/:bidId/accept')
  @ApiOperation({
    summary: 'Accept bid',
    description: 'Job creator selects winning bid and rejects others',
  })
  @ApiOkResponse({
    description: 'Bid accepted, worker assigned',
  })
  async acceptBid(
    @CurrentUser() userId: string,
    @Param('jobId') jobId: string,
    @Param('bidId') bidId: string,
  ) {
    return this.marketplaceService.acceptBid(jobId, bidId, userId);
  }

  /**
   * Get bids for job
   */
  @Get('jobs/:jobId/bids')
  @ApiOperation({
    summary: 'Get bids',
    description: 'List all bids for job (only visible to job creator)',
  })
  @ApiOkResponse({
    description: 'Bids list',
  })
  async getJobBids(
    @CurrentUser() userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.marketplaceService.getJobBids(jobId, userId);
  }

  /**
   * Close job
   */
  @Patch('jobs/:jobId/close')
  @ApiOperation({
    summary: 'Close job',
    description: 'Job creator closes job (no more bids accepted)',
  })
  @ApiOkResponse({
    description: 'Job closed',
  })
  async closeJob(
    @CurrentUser() userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.marketplaceService.closeJob(jobId, userId);
  }

  /**
   * Get my jobs (created or bid on)
   */
  @Get('my-jobs')
  @ApiOperation({
    summary: 'Get my jobs',
    description: 'Get jobs I created or bid on',
  })
  @ApiOkResponse({
    description: 'My jobs list',
  })
  async getMyJobs(
    @CurrentUser() userId: string,
    @Query('role') role?: 'creator' | 'bidder',
  ) {
    return this.marketplaceService.getMyJobs(userId, role || 'creator');
  }

  /**
   * Get worker profile
   */
  @Get('workers/:workerId')
  @ApiOperation({
    summary: 'Get worker profile',
    description: 'Get worker profile with skills, certifications, reviews, rating',
  })
  @ApiOkResponse({
    description: 'Worker profile',
  })
  async getWorkerProfile(@Param('workerId') workerId: string) {
    return this.marketplaceService.getWorkerProfile(workerId);
  }

  /**
   * Submit review
   */
  @Post('reviews')
  @ApiOperation({
    summary: 'Submit review',
    description: 'Rate and review work after job completion',
  })
  @ApiCreatedResponse({
    description: 'Review submitted',
  })
  async submitReview(
    @CurrentUser() userId: string,
    @Body()
    reviewDto: {
      toUserId: string;
      jobId: string;
      rating: number;
      comment: string;
    },
  ) {
    return this.marketplaceService.submitReview(
      userId,
      reviewDto.toUserId,
      reviewDto.jobId,
      {
        rating: reviewDto.rating,
        comment: reviewDto.comment,
      },
    );
  }
}
