import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface DashboardMetrics {
  revenue: Decimal;
  profitMargin: number;
  activeProjects: number;
  completedProjects: number;
  totalUsers: number;
  newUsers: number;
  avgProjectValue: Decimal;
  paymentStatus: {
    pending: number;
    completed: number;
    failed: number;
  };
}

export interface TrendData {
  date: Date;
  value: number | Decimal;
  label: string;
}

export interface FraudAlert {
  id: string;
  userId: string;
  type: string; // UNUSUAL_ACTIVITY, LARGE_PAYMENT, VELOCITY_CHECK, etc.
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detected: Date;
  resolved: boolean;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard metrics for admin
   */
  async getDashboardMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardMetrics> {
    try {
      // Revenue calculation (completed transactions)
      const revenue = await this.prisma.paymentTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      // Project metrics
      const projects = await this.prisma.project.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      });

      const projectStats = projects.reduce(
        (acc, p) => {
          if (p.status === 'ACTIVE') acc.active = p._count;
          if (p.status === 'COMPLETED') acc.completed = p._count;
          return acc;
        },
        { active: 0, completed: 0 },
      );

      // User metrics
      const [totalUsers, newUsers] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
      ]);

      // Average project value
      const avgProjectValue = await this.prisma.project.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate } },
        _avg: { budget: true },
      });

      // Payment status
      const paymentStatus = await this.prisma.paymentTransaction.groupBy({
        by: ['status'],
        _count: true,
      });

      const paymentStats = paymentStatus.reduce(
        (acc, p) => {
          if (p.status === 'PENDING') acc.pending = p._count;
          if (p.status === 'COMPLETED') acc.completed = p._count;
          if (p.status === 'FAILED') acc.failed = p._count;
          return acc;
        },
        { pending: 0, completed: 0, failed: 0 },
      );

      // Calculate profit margin (assuming 10% platform fee)
      const platformFee = revenue._sum.amount
        ? new Decimal(revenue._sum.amount).mul(0.1)
        : new Decimal(0);

      const profitMargin = revenue._sum.amount
        ? Number(platformFee.div(new Decimal(revenue._sum.amount)).mul(100))
        : 0;

      return {
        revenue: revenue._sum.amount || new Decimal(0),
        profitMargin,
        activeProjects: projectStats.active,
        completedProjects: projectStats.completed,
        totalUsers,
        newUsers,
        avgProjectValue: avgProjectValue._avg.budget || new Decimal(0),
        paymentStatus: paymentStats,
      };
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      throw new BadRequestException('Failed to calculate metrics');
    }
  }

  /**
   * Get revenue trend over time
   */
  async getRevenueTrend(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendData[]> {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, createdAt: true },
    });

    // Group by time period
    const grouped = this.groupByTimePeriod(transactions, groupBy);

    return Object.entries(grouped).map(([date, amounts]) => ({
      date: new Date(date),
      value: amounts.reduce((sum, a) => sum.add(a), new Decimal(0)),
      label: date,
    }));
  }

  /**
   * Get user growth trend
   */
  async getUserGrowthTrend(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendData[]> {
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true },
    });

    const grouped = this.groupByTimePeriod(users, groupBy, 'createdAt');

    return Object.entries(grouped).map(([date, items]) => ({
      date: new Date(date),
      value: items.length,
      label: date,
    }));
  }

  /**
   * Get project completion trend
   */
  async getProjectCompletionTrend(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendData[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: endDate },
      },
      select: { completedAt: true },
    });

    const grouped = this.groupByTimePeriod(projects, groupBy, 'completedAt');

    return Object.entries(grouped).map(([date, items]) => ({
      date: new Date(date),
      value: items.length,
      label: date,
    }));
  }

  /**
   * Get payment success rate trend
   */
  async getPaymentSuccessRateTrend(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendData[]> {
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { status: true, createdAt: true },
    });

    const grouped = this.groupByTimePeriod(payments, groupBy, 'createdAt');

    return Object.entries(grouped).map(([date, items]) => {
      const completed = items.filter(
        (p: any) => p.status === 'COMPLETED',
      ).length;
      const successRate = items.length > 0 ? (completed / items.length) * 100 : 0;

      return {
        date: new Date(date),
        value: successRate,
        label: date,
      };
    });
  }

  /**
   * Detect fraudulent activities
   */
  async detectFraudulentActivity(userId: string): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];

    try {
      // Check 1: Unusual payment volume (velocity check)
      const recentPayments = await this.prisma.paymentTransaction.findMany({
        where: {
          senderId: userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      });

      if (recentPayments.length > 50) {
        alerts.push({
          id: `fraud-${Date.now()}-1`,
          userId,
          type: 'VELOCITY_CHECK',
          severity: 'HIGH',
          description: `High number of transactions in 24h: ${recentPayments.length}`,
          detected: new Date(),
          resolved: false,
        });
      }

      // Check 2: Large single payment
      const largePayment = recentPayments.find(
        p => p.amount.greaterThan(new Decimal(50000)),
      );

      if (largePayment) {
        alerts.push({
          id: `fraud-${Date.now()}-2`,
          userId,
          type: 'LARGE_PAYMENT',
          severity: 'MEDIUM',
          description: `Large payment detected: $${largePayment.amount}`,
          detected: new Date(),
          resolved: false,
        });
      }

      // Check 3: Multiple failed payments
      const failedPayments = await this.prisma.paymentTransaction.findMany({
        where: {
          senderId: userId,
          status: 'FAILED',
          createdAt: {
            gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
          },
        },
      });

      if (failedPayments.length >= 5) {
        alerts.push({
          id: `fraud-${Date.now()}-3`,
          userId,
          type: 'PAYMENT_FAILURE_PATTERN',
          severity: 'MEDIUM',
          description: `Multiple payment failures: ${failedPayments.length}`,
          detected: new Date(),
          resolved: false,
        });
      }

      // Check 4: KYC mismatch
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, kycTier: true },
      });

      if (user?.kycStatus !== 'APPROVED' && recentPayments.length > 10) {
        alerts.push({
          id: `fraud-${Date.now()}-4`,
          userId,
          type: 'KYC_MISMATCH',
          severity: 'HIGH',
          description: `High activity without full KYC: ${user?.kycStatus}`,
          detected: new Date(),
          resolved: false,
        });
      }

      // Check 5: Geographic anomaly
      const recentProjects = await this.prisma.project.findMany({
        where: { createdBy: userId },
        select: { location: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const locations = new Set(recentProjects.map(p => p.location));
      if (locations.size > 3) {
        alerts.push({
          id: `fraud-${Date.now()}-5`,
          userId,
          type: 'GEOGRAPHIC_ANOMALY',
          severity: 'LOW',
          description: `Activity from multiple locations: ${locations.size}`,
          detected: new Date(),
          resolved: false,
        });
      }

      return alerts;
    } catch (error) {
      console.error('Fraud detection error:', error);
      return alerts;
    }
  }

  /**
   * Get user activity report
   */
  async getUserActivityReport(userId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      projectsCreated,
      bidsSubmitted,
      paymentsIssued,
      paymentsReceived,
      logins,
      avgProjectValue,
    ] = await Promise.all([
      this.prisma.project.count({
        where: { createdBy: userId, createdAt: { gte: startDate } },
      }),
      this.prisma.bid.count({
        where: { workerId: userId, createdAt: { gte: startDate } },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { senderId: userId, createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { recipientId: userId, createdAt: { gte: startDate } },
        _sum: { amount: true },
      }),
      this.prisma.userActivity.count({
        where: {
          userId,
          activityType: 'LOGIN',
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.project.aggregate({
        where: { createdBy: userId, createdAt: { gte: startDate } },
        _avg: { budget: true },
      }),
    ]);

    return {
      userId,
      period: `${days} days`,
      projectsCreated,
      bidsSubmitted,
      paymentsIssued: paymentsIssued._count,
      totalIssued: paymentsIssued._sum.amount || new Decimal(0),
      paymentsReceived: paymentsReceived._sum.amount || new Decimal(0),
      logins,
      avgProjectValue: avgProjectValue._avg.budget || new Decimal(0),
    };
  }

  /**
   * Get marketplace health metrics
   */
  async getMarketplaceHealth(): Promise<any> {
    const [
      totalBids,
      acceptedBids,
      avgTimeToAccept,
      avgBidAmount,
      totalPaymentValue,
    ] = await Promise.all([
      this.prisma.bid.count(),
      this.prisma.bid.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.bid.aggregate({
        _avg: {
          acceptedAt: true, // simplified, would need better calculation
        },
      }),
      this.prisma.bid.aggregate({
        _avg: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const acceptanceRate =
      totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;

    return {
      totalBids,
      acceptedBids,
      acceptanceRate,
      avgBidAmount: avgBidAmount._avg.amount || new Decimal(0),
      totalPaymentValue: totalPaymentValue._sum.amount || new Decimal(0),
      health: acceptanceRate > 50 ? 'GOOD' : 'NEEDS_ATTENTION',
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' = 'json',
  ): Promise<any> {
    const [metrics, revenue, users, projects] = await Promise.all([
      this.getDashboardMetrics(startDate, endDate),
      this.getRevenueTrend(startDate, endDate),
      this.getUserGrowthTrend(startDate, endDate),
      this.getProjectCompletionTrend(startDate, endDate),
    ]);

    const data = {
      exportDate: new Date(),
      period: { startDate, endDate },
      metrics,
      trends: { revenue, users, projects },
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Get tier-based analytics
   */
  async getTierAnalytics(): Promise<any> {
    const tiers = await this.prisma.user.groupBy({
      by: ['kycTier'],
      _count: true,
      _avg: { rating: true },
    });

    return tiers.map(t => ({
      tier: t.kycTier,
      userCount: t._count,
      avgRating: t._avg.rating || 0,
    }));
  }

  /**
   * Group data by time period
   */
  private groupByTimePeriod(
    items: any[],
    groupBy: 'day' | 'week' | 'month',
    dateField: string = 'amount',
  ): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    items.forEach(item => {
      const date = new Date(item[dateField] || item.createdAt || item.completedAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const week = Math.floor(
          (date.getTime() -
            new Date(date.getFullYear(), 0, 1).getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        );
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return grouped;
  }

  /**
   * Convert to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const lines: string[] = [];
    lines.push('Analytics Export');
    lines.push(`Export Date,${JSON.stringify(data.exportDate)}`);
    lines.push(`Period Start,${data.period.startDate}`);
    lines.push(`Period End,${data.period.endDate}`);
    lines.push('');
    lines.push('Metrics');
    Object.entries(data.metrics).forEach(([key, value]) => {
      lines.push(`${key},${value}`);
    });
    return lines.join('\n');
  }
}
