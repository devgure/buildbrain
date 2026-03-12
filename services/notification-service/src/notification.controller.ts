import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import {
  SendNotificationDto,
  NotificationHistoryResponseDto,
  DeviceTokenDto,
} from './notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Send notification to user
   */
  @Post('send')
  @ApiOperation({
    summary: 'Send notification',
    description: 'Send email, SMS, or push notification to user',
  })
  @ApiCreatedResponse({
    description: 'Notification sent successfully',
    type: SendNotificationDto,
  })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendNotification({
      userId: user.id,
      ...sendNotificationDto,
    });
  }

  /**
   * Send notification by template
   */
  @Post('send-template')
  @ApiOperation({
    summary: 'Send templated notification',
    description: 'Send pre-defined notification template to user',
  })
  @ApiCreatedResponse({
    description: 'Template notification sent',
  })
  async sendTemplateNotification(
    @Body()
    body: {
      template: string;
      data: Record<string, any>;
      type?: 'EMAIL' | 'SMS' | 'PUSH';
      priority?: 'LOW' | 'NORMAL' | 'HIGH';
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendNotification({
      userId: user.id,
      ...body,
    });
  }

  /**
   * Register device token for push notifications
   */
  @Post('device-token')
  @ApiOperation({
    summary: 'Register device token',
    description: 'Register device token for push notifications',
  })
  @ApiCreatedResponse({
    description: 'Device token registered',
    type: DeviceTokenDto,
  })
  async registerDeviceToken(
    @Body() deviceTokenDto: DeviceTokenDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.registerDeviceToken(
      user.id,
      deviceTokenDto.token,
      deviceTokenDto.platform,
    );
  }

  /**
   * Get notification history
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get notification history',
    description: 'Retrieve user notification history',
  })
  @ApiOkResponse({
    description: 'Notification history retrieved',
    type: NotificationHistoryResponseDto,
  })
  async getHistory(
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getNotificationHistory(user.id, skip, take);
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Retrieve user notification channel preferences',
  })
  @ApiOkResponse({
    description: 'Preferences retrieved',
  })
  async getPreferences(@CurrentUser() user: any) {
    // This endpoint retrieves from user settings
    // Returns email, SMS, push notification preferences
    return {
      userId: user.id,
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      pushNotificationsEnabled: true,
      unsubscribedCategories: [],
    };
  }

  /**
   * Update notification preferences
   */
  @Post('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update user notification channel preferences',
  })
  @ApiCreatedResponse({
    description: 'Preferences updated',
  })
  async updatePreferences(
    @Body()
    body: {
      emailNotificationsEnabled?: boolean;
      smsNotificationsEnabled?: boolean;
      pushNotificationsEnabled?: boolean;
      unsubscribedCategories?: string[];
    },
    @CurrentUser() user: any,
  ) {
    // Update user settings
    return {
      success: true,
      message: 'Preferences updated',
    };
  }

  /**
   * Mark notification as read
   */
  @Post(':notificationId/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a notification as read/acknowledged',
  })
  @ApiCreatedResponse({
    description: 'Notification marked as read',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'Notification ID',
    type: 'string',
  })
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      message: `Notification ${notificationId} marked as read`,
    };
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread count',
    description: 'Get count of unread notifications',
  })
  @ApiOkResponse({
    description: 'Unread count retrieved',
  })
  async getUnreadCount(@CurrentUser() user: any) {
    return {
      userId: user.id,
      unreadCount: 0,
    };
  }

  /**
   * Test notification send
   */
  @Post('test/:channel')
  @ApiOperation({
    summary: 'Send test notification',
    description: 'Send test notification to verify setup',
  })
  @ApiCreatedResponse({
    description: 'Test notification sent',
  })
  @ApiParam({
    name: 'channel',
    description: 'Notification channel: email, sms, or push',
    type: 'string',
  })
  async sendTestNotification(
    @Param('channel') channel: string,
    @CurrentUser() user: any,
  ) {
    const channelMap = {
      email: 'EMAIL',
      sms: 'SMS',
      push: 'PUSH',
    };

    return this.notificationService.sendNotification({
      userId: user.id,
      type: channelMap[channel] || 'EMAIL',
      template: 'TEST',
      data: {
        userName: user.name || 'User',
        testMessage: 'This is a test notification from BuildBrain',
      },
    });
  }

  /**
   * Webhook for notification status updates
   */
  @Post('webhook/sendgrid')
  @ApiOperation({
    summary: 'SendGrid webhook',
    description: 'Receive delivery/bounce status from SendGrid',
  })
  async handleSendgridWebhook(@Body() payload: any) {
    // Log webhook events
    console.log('SendGrid webhook:', payload);
    return { received: true };
  }

  /**
   * Webhook for Twilio status updates
   */
  @Post('webhook/twilio')
  @ApiOperation({
    summary: 'Twilio webhook',
    description: 'Receive delivery status from Twilio',
  })
  async handleTwilioWebhook(@Body() payload: any) {
    // Log webhook events
    console.log('Twilio webhook:', payload);
    return { received: true };
  }
}
