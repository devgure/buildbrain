import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  rating: Decimal;
  verified: boolean;
  kycTier: string;
  kycStatus: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  publicProfile: boolean;
  twoFactorEnabled: boolean;
  language: string;
  timezone: string;
  currency: string;
}

export interface UserPreferences {
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  defaultPaymentMethod: string;
  autoAcceptBids: boolean;
  bidNotificationThreshold: number; // Auto-reject bids below this score
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user profile with all details
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        phone: true,
        bio: true,
        avatar: true,
        rating: true,
        kycTier: true,
        kycStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      verified: user.kycStatus === 'APPROVED',
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const allowedFields = ['name', 'phone', 'company', 'bio', 'avatar'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    return this.prisma.user.update({
      where: { id: userId },
      data: filteredUpdates,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        bio: true,
        avatar: true,
      },
    });
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<UserSettings> {
    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!userSettings) {
      // Return defaults if not yet configured
      return {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        publicProfile: true,
        twoFactorEnabled: false,
        language: 'en',
        timezone: 'America/Los_Angeles',
        currency: 'USD',
      };
    }

    return userSettings;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, settings: Partial<UserSettings>) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: settings,
      create: {
        userId,
        ...settings,
      },
    });
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    const userPrefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!userPrefs) {
      // Return defaults
      return {
        theme: 'AUTO',
        defaultPaymentMethod: 'INTERNAL_LEDGER',
        autoAcceptBids: false,
        bidNotificationThreshold: 75,
      };
    }

    return userPrefs;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });
  }

  /**
   * Add skill to user profile
   */
  async addSkill(userId: string, skillData: {
    name: string;
    yearsOfExperience: number;
  }) {
    return this.prisma.userSkill.create({
      data: {
        userId,
        ...skillData,
      },
    });
  }

  /**
   * Remove skill from profile
   */
  async removeSkill(userId: string, skillId: string) {
    return this.prisma.userSkill.delete({
      where: { id: skillId },
    });
  }

  /**
   * Get user skills
   */
  async getSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      orderBy: { yearsOfExperience: 'desc' },
    });
  }

  /**
   * Verify skill (admin operation)
   */
  async verifySkill(skillId: string) {
    return this.prisma.userSkill.update({
      where: { id: skillId },
      data: { verified: true },
    });
  }

  /**
   * Get user certifications
   */
  async getCertifications(userId: string) {
    return this.prisma.certification.findMany({
      where: { userId },
      orderBy: { expirationDate: 'desc' },
    });
  }

  /**
   * Get user reviews (as reviewee)
   */
  async getReviews(userId: string, skip = 0, take = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { revieweeId: userId },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true, rating: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count({ where: { revieweeId: userId } }),
    ]);

    return { items: reviews, total, skip, take };
  }

  /**
   * Get user rating (calculated from all reviews)
   */
  async getRating(userId: string): Promise<Decimal> {
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return new Decimal(0);
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return new Decimal(sum / reviews.length);
  }

  /**
   * Get user portfolio (previous projects/work)
   */
  async getPortfolio(userId: string) {
    return this.prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add portfolio item
   */
  async addPortfolioItem(userId: string, itemData: {
    title: string;
    description: string;
    imageUrl?: string;
    projectUrl?: string;
  }) {
    return this.prisma.portfolioItem.create({
      data: {
        userId,
        ...itemData,
      },
    });
  }

  /**
   * Remove portfolio item
   */
  async removePortfolioItem(itemId: string) {
    return this.prisma.portfolioItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Get user activity timeline
   */
  async getActivity(userId: string, skip = 0, take = 20) {
    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      this.prisma.userActivity.count({ where: { userId } }),
    ]);

    return { items: activities, total, skip, take };
  }

  /**
   * Log user activity
   */
  async logActivity(userId: string, activityType: string, details: any = {}) {
    return this.prisma.userActivity.create({
      data: {
        userId,
        activityType,
        details,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get user contact preferences
   */
  async getContactRules(userId: string) {
    return this.prisma.contactRule.findMany({
      where: { userId },
    });
  }

  /**
   * Add contact rule (e.g., "don't contact on weekends")
   */
  async addContactRule(userId: string, ruleData: {
    type: string; // EMAIL, SMS, PHONE, PUSH
    rule: string; // WEEKDAY_ONLY, BUSINESS_HOURS, NO_CONTACT_AFTER_TIME
    value?: string;
  }) {
    return this.prisma.contactRule.create({
      data: {
        userId,
        ...ruleData,
      },
    });
  }

  /**
   * Search users by name or company
   */
  async searchUsers(query: string, skip = 0, take = 10) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        kycStatus: 'APPROVED', // Only show verified users
      },
      select: {
        id: true,
        name: true,
        company: true,
        role: true,
        avatar: true,
        rating: true,
      },
      skip,
      take,
    });
  }

  /**
   * Get user statistics
   */
  async getStatistics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (user.role === 'GC') {
      // General Contractor stats
      return {
        projectsCreated: await this.prisma.project.count({ where: { gcId: userId } }),
        projectsActive: await this.prisma.project.count({
          where: { gcId: userId, status: 'ACTIVE' },
        }),
        totalBudgetAllocated: await this.calculateTotalBudget(userId),
        paymentsIssued: await this.prisma.payment.count({
          where: { senderId: userId, status: 'COMPLETED' },
        }),
        averagePaymentAmount: await this.calculateAvgPayment(userId),
        topWorkers: await this.getTopWorkers(userId),
      };
    } else {
      // Worker stats
      return {
        bidsSubmitted: await this.prisma.bid.count({
          where: { bidderId: userId },
        }),
        bidsAccepted: await this.prisma.bid.count({
          where: { bidderId: userId, status: 'ACCEPTED' },
        }),
        jobsCompleted: await this.prisma.projectAssignment.count({
          where: { workerId: userId, status: 'COMPLETED' },
        }),
        totalEarnings: await this.calculateTotalEarnings(userId),
        averageRating: await this.getRating(userId),
        certifications: await this.prisma.certification.count({
          where: { userId, verified: true },
        }),
      };
    }
  }

  private async calculateTotalBudget(userId: string): Promise<Decimal> {
    const projects = await this.prisma.project.findMany({
      where: { gcId: userId },
      select: { budget: true },
    });
    const total = projects.reduce((sum, p) => sum + parseFloat(p.budget.toString()), 0);
    return new Decimal(total);
  }

  private async calculateAvgPayment(userId: string): Promise<Decimal> {
    const payments = await this.prisma.payment.findMany({
      where: { senderId: userId, status: 'COMPLETED' },
      select: { amount: true },
    });
    if (payments.length === 0) return new Decimal(0);
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    return new Decimal(total / payments.length);
  }

  private async calculateTotalEarnings(userId: string): Promise<Decimal> {
    const payments = await this.prisma.payment.findMany({
      where: { recipientId: userId, status: 'COMPLETED' },
      select: { amount: true },
    });
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    return new Decimal(total);
  }

  private async getTopWorkers(userId: string) {
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        project: { gcId: userId },
      },
      include: {
        worker: {
          select: { id: true, name: true, rating: true },
        },
      },
    });

    const workerMap = new Map();
    assignments.forEach(a => {
      const key = a.workerId;
      workerMap.set(key, {
        ...a.worker,
        assignmentCount: (workerMap.get(key)?.assignmentCount || 0) + 1,
      });
    });

    return Array.from(workerMap.values())
      .sort((a, b) => b.assignmentCount - a.assignmentCount)
      .slice(0, 5);
  }
}
