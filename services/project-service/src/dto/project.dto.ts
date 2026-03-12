import { IsString, IsNumber, IsDate, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Downtown Office Complex - Phase 2',
    description: 'Project title',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Commercial office renovation with HVAC upgrade',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 1200000,
    description: 'Total project budget in USD (cents)',
  })
  @IsNumber()
  budget: number;

  @ApiPropertyOptional({
    example: 'Complete office renovation including plumbing, electrical, painting',
  })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiProperty({
    example: 'Downtown',
    description: 'Geographic location name',
  })
  @IsString()
  location: string;

  @ApiPropertyOptional({
    example: '555 Main St',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: 'San Francisco',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: 'CA',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    example: '94105',
  })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({
    example: '2026-03-15',
    description: 'Project start date',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2026-09-15',
    description: 'Project end date',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    example: 180,
    description: 'Estimated duration in days',
  })
  @IsNumber()
  @IsOptional()
  estimatedDurationDays?: number;

  @ApiPropertyOptional({
    example: 'COMMERCIAL',
    enum: [
      'COMMERCIAL',
      'RESIDENTIAL',
      'INDUSTRIAL',
      'INFRASTRUCTURE',
      'EMERGENCY_RESTORATION',
      'RENOVATION',
    ],
  })
  @IsEnum([
    'COMMERCIAL',
    'RESIDENTIAL',
    'INDUSTRIAL',
    'INFRASTRUCTURE',
    'EMERGENCY_RESTORATION',
    'RENOVATION',
  ])
  @IsOptional()
  projectType?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;
}

export class CreateMilestoneDto {
  @ApiProperty({
    example: 'Foundation & Framing',
    description: 'Milestone name',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Complete foundation work and steel framing',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 300000,
    description: 'Milestone payment amount in USD (cents)',
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Percentage of total budget',
  })
  @IsNumber()
  @IsOptional()
  percentage?: number;

  @ApiProperty({
    example: '2026-04-30',
    description: 'Due date for milestone completion',
  })
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @ApiPropertyOptional({
    example: [
      'Foundation inspection passed',
      'Steel framing erected',
      'Building envelope sealed',
    ],
    description: 'Deliverables to be completed',
  })
  @IsArray()
  @IsOptional()
  deliverables?: string[];
}

export class ProjectResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  gcId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @ApiProperty({
    example: 1200000,
    description: 'Budget in cents',
  })
  budget: number;

  @ApiProperty()
  scope: string;

  @ApiProperty()
  location: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MilestoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  dueDate: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}
