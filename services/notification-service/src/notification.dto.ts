import { IsString, IsEnum, IsObject, IsOptional, IsEmail, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SendNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: ['EMAIL', 'SMS', 'PUSH'],
    example: 'EMAIL',
  })
  @IsEnum(['EMAIL', 'SMS', 'PUSH'])
  type: 'EMAIL' | 'SMS' | 'PUSH';

  @ApiProperty({
    description: 'Notification template name',
    example: 'PAYMENT_RECEIVED',
  })
  @IsString()
  template: string;

  @ApiPropertyOptional({
    description: 'Recipient email or phone',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiProperty({
    description: 'Template variables/data',
    example: {
      userName: 'John Doe',
      amount: '1500',
      senderName: 'ACME Corp',
      projectTitle: 'Office Renovation',
    },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: ['LOW', 'NORMAL', 'HIGH'],
    example: 'NORMAL',
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH';

  @ApiPropertyOptional({
    description: 'Schedule notification for later',
    example: '2025-02-15T10:30:00Z',
  })
  @IsOptional()
  @IsString()
  scheduledFor?: Date;
}

export class DeviceTokenDto {
  @ApiProperty({
    description: 'Device token from FCM',
    example: 'c1p0c0ffee1111111111111111111111111111111111111111111111111111111',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['iOS', 'Android', 'WEB'],
    example: 'iOS',
  })
  @IsEnum(['iOS', 'Android', 'WEB'])
  platform: string;
}

export class NotificationLogEntryDto {
  @ApiProperty({
    description: 'Notification log ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Template used',
    example: 'PAYMENT_RECEIVED',
  })
  template: string;

  @ApiProperty({
    description: 'Notification type',
    enum: ['EMAIL', 'SMS', 'PUSH'],
    example: 'EMAIL',
  })
  type: 'EMAIL' | 'SMS' | 'PUSH';

  @ApiProperty({
    description: 'Send status',
    enum: ['SENT', 'FAILED', 'PENDING'],
    example: 'SENT',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp',
    example: '2025-02-15T09:30:00Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Send results',
  })
  results?: any;
}

export class NotificationHistoryResponseDto {
  @ApiProperty({
    description: 'Notification logs',
    type: [NotificationLogEntryDto],
  })
  items: NotificationLogEntryDto[];

  @ApiProperty({
    description: 'Total count',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Skip count',
    example: 0,
  })
  skip: number;

  @ApiProperty({
    description: 'Take count',
    example: 20,
  })
  take: number;
}

export class NotificationPreferencesDto {
  @ApiProperty({
    description: 'Email notifications enabled',
    example: true,
  })
  emailNotificationsEnabled: boolean;

  @ApiProperty({
    description: 'SMS notifications enabled',
    example: true,
  })
  smsNotificationsEnabled: boolean;

  @ApiProperty({
    description: 'Push notifications enabled',
    example: true,
  })
  pushNotificationsEnabled: boolean;

  @ApiPropertyOptional({
    description: 'Categories user unsubscribed from',
    type: [String],
    example: ['MARKETING', 'NEWSLETTER'],
  })
  unsubscribedCategories?: string[];

  @ApiPropertyOptional({
    description: 'Do not disturb enabled',
    example: false,
  })
  doNotDisturb?: boolean;

  @ApiPropertyOptional({
    description: 'Do not disturb start time (HH:MM)',
    example: '22:00',
  })
  doNotDisturbStartTime?: string;

  @ApiPropertyOptional({
    description: 'Do not disturb end time (HH:MM)',
    example: '08:00',
  })
  doNotDisturbEndTime?: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Email notifications enabled',
    example: true,
  })
  @IsOptional()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'SMS notifications enabled',
    example: true,
  })
  @IsOptional()
  smsNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Push notifications enabled',
    example: true,
  })
  @IsOptional()
  pushNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Categories to unsubscribe from',
    type: [String],
    example: ['MARKETING'],
  })
  @IsOptional()
  @IsArray()
  unsubscribedCategories?: string[];

  @ApiPropertyOptional({
    description: 'Do not disturb enabled',
    example: false,
  })
  @IsOptional()
  doNotDisturb?: boolean;

  @ApiPropertyOptional({
    description: 'Do not disturb start time',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  doNotDisturbStartTime?: string;

  @ApiPropertyOptional({
    description: 'Do not disturb end time',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  doNotDisturbEndTime?: string;
}

export class BulkSendNotificationDto {
  @ApiProperty({
    description: 'User IDs to send notification to',
    type: [String],
    example: ['user1', 'user2', 'user3'],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Notification template',
    example: 'SYSTEM_ANNOUNCEMENT',
  })
  @IsString()
  template: string;

  @ApiProperty({
    description: 'Template data',
    example: { title: 'Maintenance Alert', message: 'System maintenance scheduled' },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Notification type',
    enum: ['EMAIL', 'SMS', 'PUSH'],
    example: 'EMAIL',
  })
  @IsOptional()
  @IsEnum(['EMAIL', 'SMS', 'PUSH'])
  type?: 'EMAIL' | 'SMS' | 'PUSH';

  @ApiPropertyOptional({
    description: 'Priority',
    enum: ['LOW', 'NORMAL', 'HIGH'],
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export class NotificationTemplateDto {
  @ApiProperty({
    description: 'Template ID',
    example: 'PAYMENT_RECEIVED',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Payment Received',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Notification type',
    enum: ['EMAIL', 'SMS', 'PUSH'],
    example: 'EMAIL',
  })
  @IsEnum(['EMAIL', 'SMS', 'PUSH'])
  type: 'EMAIL' | 'SMS' | 'PUSH';

  @ApiPropertyOptional({
    description: 'Email subject for email notifications',
    example: 'Payment Received - ${amount}',
  })
  subject?: string;

  @ApiProperty({
    description: 'Notification body/message',
    example: 'You have received $${amount} from ${senderName}',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Required variables in template',
    type: [String],
    example: ['amount', 'senderName'],
  })
  @IsArray()
  variables: string[];

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Notification when payment is received',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether template is active',
    example: true,
  })
  isActive?: boolean;
}

export class UnreadCountDto {
  @ApiProperty({
    description: 'Number of unread notifications',
    example: 3,
  })
  unreadCount: number;

  @ApiPropertyOptional({
    description: 'Breakdown by type',
    example: { EMAIL: 1, SMS: 0, PUSH: 2 },
  })
  byType?: Record<string, number>;
}

export class WebhookEventDto {
  @ApiProperty({
    description: 'Event type',
    example: 'email.delivered',
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: 'Message/notification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  messageId: string;

  @ApiPropertyOptional({
    description: 'Event timestamp',
    example: '2025-02-15T09:30:00Z',
  })
  timestamp?: Date;

  @ApiPropertyOptional({
    description: 'Event data',
    example: { bounce: false, complaint: false },
  })
  data?: Record<string, any>;
}
