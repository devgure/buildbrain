import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { GovProcurementService } from './gov-procurement.service';
import {
  SearchOpportunitiesDto,
  OpportunityDetailDto,
  BidMatchDto,
  SubmitBidDto,
  BidHistoryResponseDto,
} from './gov-procurement.dto';

@ApiTags('Government Procurement')
@Controller('gov-procurement')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GovProcurementController {
  constructor(private govProcurementService: GovProcurementService) {}

  /**
   * Search for RFP opportunities
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search opportunities',
    description: 'Search SAM.gov for RFP opportunities',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default 50)',
  })
  @ApiOkResponse({
    description: 'Search results',
    type: [OpportunityDetailDto],
  })
  async searchOpportunities(
    @Query('query') query: string,
    @Query('limit') limit: string = '50',
  ) {
    const maxResults = Math.min(parseInt(limit, 10), 100);
    return this.govProcurementService.searchOpportunities(query, maxResults);
  }

  /**
   * Get opportunity details
   */
  @Get('opportunities/:opportunityId')
  @ApiOperation({
    summary: 'Get opportunity details',
    description: 'Retrieve detailed information about specific opportunity',
  })
  @ApiParam({
    name: 'opportunityId',
    description: 'SAM.gov opportunity ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Opportunity details',
    type: OpportunityDetailDto,
  })
  async getOpportunityDetails(@Param('opportunityId') opportunityId: string) {
    return this.govProcurementService.getOpportunityDetails(opportunityId);
  }

  /**
   * Get recent opportunities
   */
  @Get('recent')
  @ApiOperation({
    summary: 'Get recent opportunities',
    description: 'Get recently posted opportunities',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default 20)',
  })
  @ApiOkResponse({
    description: 'Recent opportunities',
    type: [OpportunityDetailDto],
  })
  async getRecentOpportunities(@Query('limit') limit: string = '20') {
    const maxResults = Math.min(parseInt(limit, 10), 50);
    return this.govProcurementService.getRecentOpportunities(maxResults);
  }

  /**
   * Find matching opportunities for worker
   */
  @Get('matches')
  @ApiOperation({
    summary: 'Find matching opportunities',
    description: 'Find SAM.gov opportunities matching your skills',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max matches (default 10)',
  })
  @ApiOkResponse({
    description: 'Matching opportunities',
    type: [BidMatchDto],
  })
  async findMatches(
    @Query('limit') limit: string = '10',
    @CurrentUser() user: any,
  ) {
    const maxResults = Math.min(parseInt(limit, 10), 50);
    return this.govProcurementService.findMatchingOpportunities(user.id, maxResults);
  }

  /**
   * Get match details for specific opportunity
   */
  @Get('match/:opportunityId')
  @ApiOperation({
    summary: 'Get match score',
    description: 'Get match score between you and opportunity',
  })
  @ApiParam({
    name: 'opportunityId',
    description: 'Opportunity ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Match details',
    type: BidMatchDto,
  })
  async getMatchDetails(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: any,
  ) {
    return this.govProcurementService.matchWorkerToOpportunity(user.id, opportunityId);
  }

  /**
   * Submit bid for opportunity
   */
  @Post('bids')
  @ApiOperation({
    summary: 'Submit bid',
    description: 'Submit bid for SAM.gov opportunity',
  })
  @ApiCreatedResponse({
    description: 'Bid submitted',
  })
  async submitBid(
    @Body() submitBidDto: SubmitBidDto,
    @CurrentUser() user: any,
  ) {
    return this.govProcurementService.submitBid(
      user.id,
      submitBidDto.opportunityId,
      submitBidDto.bidAmount,
    );
  }

  /**
   * Get bid history
   */
  @Get('bids/history')
  @ApiOperation({
    summary: 'Get bid history',
    description: 'View your bid history',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Skip count (default 0)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Take count (default 20)',
  })
  @ApiOkResponse({
    description: 'Bid history',
    type: BidHistoryResponseDto,
  })
  async getBidHistory(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @CurrentUser() user: any,
  ) {
    return this.govProcurementService.getWorkerBidHistory(
      user.id,
      parseInt(skip, 10),
      parseInt(take, 10),
    );
  }

  /**
   * Watch opportunity
   */
  @Post('watch')
  @ApiOperation({
    summary: 'Watch opportunity',
    description: 'Add opportunity to watch list',
  })
  @ApiCreatedResponse({
    description: 'Opportunity added to watch list',
  })
  async watchOpportunity(
    @Body() body: { opportunityId: string },
    @CurrentUser() user: any,
  ) {
    return this.govProcurementService.watchOpportunity(
      user.id,
      body.opportunityId,
    );
  }

  /**
   * Get watched opportunities
   */
  @Get('watched')
  @ApiOperation({
    summary: 'Get watched opportunities',
    description: 'View your watched opportunities',
  })
  @ApiOkResponse({
    description: 'Watched opportunities',
  })
  async getWatchedOpportunities(@CurrentUser() user: any) {
    return this.govProcurementService.getWatchedOpportunities(user.id);
  }

  /**
   * Get opportunity categories (NAICS codes)
   */
  @Get('categories')
  @ApiOperation({
    summary: 'Get categories',
    description: 'Get NAICS code categories',
  })
  @ApiOkResponse({
    description: 'Categories',
  })
  async getCategories() {
    // Return common NAICS codes for construction-related opportunities
    return [
      { code: '236220', name: 'Building Excavation & Foundation Work' },
      { code: '236210', name: 'Structural Steel Erection' },
      { code: '237310', name: 'Bridge & Tunnel Construction' },
      { code: '238210', name: 'Electrical Installation' },
      { code: '238220', name: 'Plumbing, Heating & Air-Conditioning' },
      { code: '238350', name: 'Finish Carpentry' },
      { code: '238390', name: 'Other Specialty Trade Contracting' },
    ];
  }

  /**
   * Get set-aside types
   */
  @Get('set-asides')
  @ApiOperation({
    summary: 'Get set-aside types',
    description: 'Get available set-aside categories',
  })
  @ApiOkResponse({
    description: 'Set-aside types',
  })
  async getSetAsides() {
    return [
      { type: 'UNRESTRICTED', description: 'Open to all contractors' },
      { type: 'SMALL_BUSINESS', description: 'Small business set-aside' },
      { type: 'HUBZONE', description: 'HUBZone small business' },
      { type: 'VETERAN_OWNED', description: 'Veteran-owned small business' },
      { type: 'WOMEN_OWNED', description: 'Women-owned small business' },
      { type: 'SDVOSB', description: 'Service-disabled veteran-owned' },
    ];
  }
}
