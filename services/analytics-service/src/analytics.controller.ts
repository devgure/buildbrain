import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import {
  DashboardMetricsResponseDto,
  TrendResponseDto,
  FraudAlertResponseDto,
  UserActivityReportDto,
  MarketplaceHealthDto,
} from './analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get dashboard metrics
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description: 'Retrieve key performance indicators and metrics',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiOkResponse({
    description: 'Dashboard metrics retrieved',
    type: DashboardMetricsResponseDto,
  })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getDashboardMetrics(start, end);
  }

  /**
   * Get revenue trend
   */
  @Get('revenue-trend')
  @ApiOperation({
    summary: 'Get revenue trend',
    description: 'Revenue over time (daily, weekly, or monthly)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Group by period',
  })
  @ApiOkResponse({
    description: 'Revenue trend retrieved',
    type: [TrendResponseDto],
  })
  async getRevenueTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getRevenueTrend(start, end, groupBy);
  }

  /**
   * Get user growth trend
   */
  @Get('user-growth')
  @ApiOperation({
    summary: 'Get user growth trend',
    description: 'New user signups over time',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Group by period',
  })
  @ApiOkResponse({
    description: 'User growth trend retrieved',
    type: [TrendResponseDto],
  })
  async getUserGrowthTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getUserGrowthTrend(start, end, groupBy);
  }

  /**
   * Get project completion trend
   */
  @Get('project-completion')
  @ApiOperation({
    summary: 'Get project completion trend',
    description: 'Number of completed projects over time',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Group by period',
  })
  @ApiOkResponse({
    description: 'Project completion trend retrieved',
  })
  async getProjectCompletionTrend(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getProjectCompletionTrend(start, end, groupBy);
  }

  /**
   * Get payment success rate trend
   */
  @Get('payment-success-rate')
  @ApiOperation({
    summary: 'Get payment success rate',
    description: 'Payment success rate trend over time',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Group by period',
  })
  @ApiOkResponse({
    description: 'Payment success rate retrieved',
  })
  async getPaymentSuccessRate(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getPaymentSuccessRateTrend(start, end, groupBy);
  }

  /**
   * Detect fraudulent activity
   */
  @Get('fraud-detection/:userId')
  @ApiOperation({
    summary: 'Detect fraud',
    description: 'Check user account for fraudulent activity',
  })
  @ApiOkResponse({
    description: 'Fraud alerts retrieved',
    type: [FraudAlertResponseDto],
  })
  async detectFraud(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.analyticsService.detectFraudulentActivity(userId);
  }

  /**
   * Get user activity report
   */
  @Get('user-activity/:userId')
  @ApiOperation({
    summary: 'Get user activity report',
    description: 'Retrieve user activity metrics for a specific period',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include (default: 30)',
  })
  @ApiOkResponse({
    description: 'User activity report retrieved',
    type: UserActivityReportDto,
  })
  async getUserActivity(
    @Query('userId') userId: string,
    @Query('days') days: string = '30',
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays < 1) {
      throw new BadRequestException('days must be a positive number');
    }

    return this.analyticsService.getUserActivityReport(userId, numDays);
  }

  /**
   * Get marketplace health
   */
  @Get('marketplace-health')
  @ApiOperation({
    summary: 'Get marketplace health',
    description: 'Overall marketplace health metrics',
  })
  @ApiOkResponse({
    description: 'Marketplace health metrics retrieved',
    type: MarketplaceHealthDto,
  })
  async getMarketplaceHealth() {
    return this.analyticsService.getMarketplaceHealth();
  }

  /**
   * Export analytics data
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Export analytics data in CSV or JSON format',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Export format',
  })
  @ApiOkResponse({
    description: 'Analytics data exported',
  })
  async exportData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format: 'csv' | 'json' = 'json',
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.exportAnalyticsData(start, end, format);
  }

  /**
   * Get tier-based analytics
   */
  @Get('tier-analytics')
  @ApiOperation({
    summary: 'Get tier analytics',
    description: 'Analytics breakdown by KYC tier',
  })
  @ApiOkResponse({
    description: 'Tier analytics retrieved',
  })
  async getTierAnalytics() {
    return this.analyticsService.getTierAnalytics();
  }

  /**
   * Get custom metrics
   */
  @Get('custom')
  @ApiOperation({
    summary: 'Get custom metrics',
    description: 'Query custom metrics',
  })
  @ApiQuery({
    name: 'metric',
    required: true,
    description: 'Metric name',
  })
  @ApiOkResponse({
    description: 'Custom metric retrieved',
  })
  async getCustomMetric(@Query('metric') metric: string) {
    // This would query a custom metrics store
    return {
      metric,
      value: 0,
      timestamp: new Date(),
    };
  }
}
