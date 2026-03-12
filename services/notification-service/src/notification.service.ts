import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/database/prisma.service';
import axios from 'axios';

export interface NotificationPayload {
  userId: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  template: string; // e.g., PAYMENT_RECEIVED, JOB_NEW_BID, PROJECT_MILESTONE_DUE
  recipient?: string; // email or phone number (auto-fetch if not provided)
  data: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  scheduledFor?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  subject?: string;
  body: string;
  variables: string[]; // e.g., ['{userName}', '{projectTitle}']
}

@Injectable()
export class NotificationService {
  private sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
  private sendgridUrl = 'https://api.sendgrid.com/v3/mail/send';

  private twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
  private twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
  private twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
  private twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;

  private fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
  private fcmUrl = 'https://fcm.googleapis.com/fcm/send';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Send notification through all enabled channels for user
   */
  async sendNotification(payload: NotificationPayload): Promise<any> {
    try {
      // Get user settings
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, phone: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const userSettings = await this.prisma.userSettings.findUnique({
        where: { userId: payload.userId },
      });

      const results = [];

      // Send email
      if (userSettings?.emailNotifications || payload.type === 'EMAIL') {
        results.push(
          await this.sendEmail(
            user.email,
            payload.template,
            payload.data,
            payload.priority,
          ),
        );
      }

      // Send SMS
      if (
        (userSettings?.smsNotifications && user.phone) ||
        payload.type === 'SMS'
      ) {
        results.push(
          await this.sendSMS(
            user.phone,
            payload.template,
            payload.data,
            payload.priority,
          ),
        );
      }

      // Send push notification
      if (
        (userSettings?.pushNotifications) ||
        payload.type === 'PUSH'
      ) {
        results.push(
          await this.sendPushNotification(
            payload.userId,
            payload.template,
            payload.data,
            payload.priority,
          ),
        );
      }

      // Log notification
      await this.logNotification(payload, results);

      return { success: true, results };
    } catch (error) {
      console.error('Notification send failed:', error);
      throw new BadRequestException(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(
    toEmail: string,
    template: string,
    data: any,
    priority: string = 'NORMAL',
  ): Promise<any> {
    try {
      const emailTemplate = await this.getEmailTemplate(template);
      const subject = this.interpolateString(emailTemplate.subject, data);
      const htmlContent = this.interpolateString(emailTemplate.body, data);

      if (!this.sendgridApiKey) {
        // Mock for development
        console.log(`[MOCK EMAIL] To: ${toEmail}, Subject: ${subject}`);
        return { success: true, messageId: `email-${Date.now()}` };
      }

      const response = await axios.post(
        this.sendgridUrl,
        {
          personalizations: [
            {
              to: [{ email: toEmail }],
              subject: subject,
            },
          ],
          from: {
            email: 'noreply@buildbrain.io',
            name: 'BuildBrain',
          },
          content: [
            {
              type: 'text/html',
              value: htmlContent,
            },
          ],
          categories: [template, priority],
        },
        {
          headers: {
            Authorization: `Bearer ${this.sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        messageId: response.headers['x-message-id'],
        channel: 'EMAIL',
      };
    } catch (error) {
      console.error('Email send failed:', error);
      return {
        success: false,
        error: error.message,
        channel: 'EMAIL',
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(
    toPhone: string,
    template: string,
    data: any,
    priority: string = 'NORMAL',
  ): Promise<any> {
    try {
      const smsTemplate = await this.getSMSTemplate(template);
      const messageBody = this.interpolateString(smsTemplate.body, data);

      if (!this.twilioAccountSid || !this.twilioAuthToken) {
        // Mock for development
        console.log(`[MOCK SMS] To: ${toPhone}, Message: ${messageBody}`);
        return { success: true, messageId: `sms-${Date.now()}` };
      }

      const auth = Buffer.from(
        `${this.twilioAccountSid}:${this.twilioAuthToken}`,
      ).toString('base64');

      const params = new URLSearchParams();
      params.append('From', this.twilioPhoneNumber);
      params.append('To', toPhone);
      params.append('Body', messageBody);

      const response = await axios.post(this.twilioUrl, params, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      return {
        success: true,
        messageId: response.data.sid,
        channel: 'SMS',
      };
    } catch (error) {
      console.error('SMS send failed:', error);
      return {
        success: false,
        error: error.message,
        channel: 'SMS',
      };
    }
  }

  /**
   * Send push notification via FCM
   */
  async sendPushNotification(
    userId: string,
    template: string,
    data: any,
    priority: string = 'NORMAL',
  ): Promise<any> {
    try {
      // Get user's FCM tokens
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId, isActive: true },
        select: { token: true },
      });

      if (tokens.length === 0) {
        return { success: false, error: 'No device tokens found', channel: 'PUSH' };
      }

      const pushTemplate = await this.getPushTemplate(template);
      const title = this.interpolateString(pushTemplate.subject, data);
      const body = this.interpolateString(pushTemplate.body, data);

      if (!this.fcmServerKey) {
        // Mock for development
        console.log(`[MOCK PUSH] To ${tokens.length} devices, Title: ${title}`);
        return { success: true, messageIds: tokens.map(() => `push-${Date.now()}`) };
      }

      const messageIds = [];

      for (const deviceToken of tokens) {
        try {
          const response = await axios.post(
            this.fcmUrl,
            {
              to: deviceToken.token,
              notification: {
                title,
                body,
                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              },
              data: {
                template,
                ...data,
              },
              priority: priority === 'HIGH' ? 'high' : 'normal',
            },
            {
              headers: {
                Authorization: `key=${this.fcmServerKey}`,
                'Content-Type': 'application/json',
              },
            },
          );

          messageIds.push(response.data.message_id);
        } catch (error) {
          console.error(`Failed to send to device token:`, error);
        }
      }

      return {
        success: messageIds.length > 0,
        messageIds,
        channel: 'PUSH',
      };
    } catch (error) {
      console.error('Push notification send failed:', error);
      return {
        success: false,
        error: error.message,
        channel: 'PUSH',
      };
    }
  }

  /**
   * Get email template
   */
  private async getEmailTemplate(templateName: string): Promise<NotificationTemplate> {
    const templates = {
      PAYMENT_RECEIVED: {
        subject: 'Payment Received - ${amount} from ${senderName}',
        body: `<p>Hi ${userName},</p><p>You have received a payment of $${amount} from ${senderName} for ${projectTitle}.</p>`,
      },
      JOB_NEW_BID: {
        subject: 'New Bid on ${jobTitle}',
        body: `<p>Hi ${userName},</p><p>${bidderName} has submitted a bid of $${bidAmount} for your job "${jobTitle}".</p>`,
      },
      PROJECT_MILESTONE_DUE: {
        subject: 'Milestone Due: ${milestoneTitle}',
        body: `<p>Hi ${userName},</p><p>The milestone "${milestoneTitle}" on ${projectTitle} is due on ${dueDate}.</p>`,
      },
      PAYMENT_APPROVAL_NEEDED: {
        subject: 'Action Required: Approve Payment',
        body: `<p>Hi ${userName},</p><p>A payment request for $${amount} from ${projectTitle} is awaiting your approval.</p>`,
      },
      BID_ACCEPTED: {
        subject: 'Congratulations! Your Bid Was Accepted',
        body: `<p>Hi ${userName},</p><p>Your bid of $${bidAmount} for "${jobTitle}" has been accepted!</p>`,
      },
      JOB_NEAR_COMPLETION: {
        subject: 'Job Near Completion: ${jobTitle}',
        body: `<p>Hi ${userName},</p><p>The job "${jobTitle}" is nearing completion on ${projectTitle}.</p>`,
      },
    };

    return {
      id: templateName,
      name: templateName,
      type: 'EMAIL',
      subject: templates[templateName]?.subject || 'BuildBrain Notification',
      body: templates[templateName]?.body || 'You have a new notification.',
      variables: this.extractVariables(
        templates[templateName]?.body || '',
      ),
    };
  }

  /**
   * Get SMS template
   */
  private async getSMSTemplate(templateName: string): Promise<NotificationTemplate> {
    const templates = {
      PAYMENT_RECEIVED: {
        body: 'BuildBrain: Received $${amount} from ${senderName} for ${projectTitle}',
      },
      JOB_NEW_BID: {
        body: 'BuildBrain: ${bidderName} bid $${bidAmount} on "${jobTitle}"',
      },
      PROJECT_MILESTONE_DUE: {
        body: 'BuildBrain: Milestone "${milestoneTitle}" is due on ${dueDate}',
      },
      BID_ACCEPTED: {
        body: 'BuildBrain: Your bid on "${jobTitle}" was accepted! $${bidAmount}',
      },
    };

    return {
      id: templateName,
      name: templateName,
      type: 'SMS',
      body: templates[templateName]?.body || 'You have a new notification from BuildBrain.',
      variables: this.extractVariables(templates[templateName]?.body || ''),
    };
  }

  /**
   * Get push notification template
   */
  private async getPushTemplate(templateName: string): Promise<NotificationTemplate> {
    const templates = {
      PAYMENT_RECEIVED: {
        subject: 'Payment Received',
        body: 'You received $${amount} from ${senderName}',
      },
      JOB_NEW_BID: {
        subject: 'New Bid',
        body: '${bidderName} bid $${bidAmount} on your job',
      },
      PROJECT_MILESTONE_DUE: {
        subject: 'Milestone Due',
        body: '"${milestoneTitle}" is due on ${dueDate}',
      },
      PAYMENT_APPROVAL_NEEDED: {
        subject: 'Approval Needed',
        body: 'Review and approve payment of $${amount}',
      },
      BID_ACCEPTED: {
        subject: 'Bid Accepted',
        body: 'Your bid on "${jobTitle}" was accepted!',
      },
    };

    return {
      id: templateName,
      name: templateName,
      type: 'PUSH',
      subject: templates[templateName]?.subject || 'BuildBrain',
      body: templates[templateName]?.body || 'You have a new notification',
      variables: this.extractVariables(templates[templateName]?.body || ''),
    };
  }

  /**
   * Replace template variables with actual data
   */
  private interpolateString(template: string, data: any): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  /**
   * Extract variable names from template
   */
  private extractVariables(template: string): string[] {
    const matches = template.match(/\$\{([^}]+)\}/g);
    return matches
      ? matches.map(m => m.replace(/\$\{|\}/g, ''))
      : [];
  }

  /**
   * Log notification for audit trail
   */
  private async logNotification(payload: NotificationPayload, results: any[]) {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId: payload.userId,
          template: payload.template,
          type: payload.type,
          status: results.some(r => r.success) ? 'SENT' : 'FAILED',
          results: results,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { isActive: true, lastActiveAt: new Date() },
      create: {
        userId,
        token,
        platform, // iOS, Android, WEB
        isActive: true,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(userId: string, skip = 0, take = 20) {
    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      this.prisma.notificationLog.count({ where: { userId } }),
    ]);

    return { items: logs, total, skip, take };
  }
}
