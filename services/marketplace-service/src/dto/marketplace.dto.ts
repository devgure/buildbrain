import { IsString, IsNumber, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBidDto {
  @ApiProperty({
    example: 8500,
    description: 'Bid amount in USD cents',
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'I have 5+ years of electrical work experience. All work inspected and certified.',
    description: 'Bid proposal/cover letter',
  })
  @IsString()
  proposal: string;

  @ApiPropertyOptional({
    example: ['project1.jpg', 'project2.jpg', 'project3.jpg'],
    description: 'Portfolio/past work references',
  })
  @IsArray()
  @IsOptional()
  portfolio?: string[];

  @ApiPropertyOptional({
    example: '5 days',
    description: 'Expected duration to complete job',
  })
  @IsString()
  @IsOptional()
  expectedDuration?: string;
}

export class SearchJobsDto {
  @ApiPropertyOptional({
    example: ['electrical_work', 'hvac', 'plumbing'],
    description: 'Required skills filter',
  })
  @IsArray()
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({
    example: 'ELECTRICAL',
    description: 'Job category',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Minimum hourly rate in cents',
  })
  @IsNumber()
  @IsOptional()
  minRate?: number;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Maximum hourly rate in cents',
  })
  @IsNumber()
  @IsOptional()
  maxRate?: number;

  @ApiPropertyOptional({
    example: 'San Francisco',
    description: 'Job location',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: '37.7749',
    description: 'Latitude for geo search',
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    example: '-122.4194',
    description: 'Longitude for geo search',
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Search radius in km',
  })
  @IsNumber()
  @IsOptional()
  radiusKm?: number;

  @ApiPropertyOptional({
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  take?: number;
}

export class JobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ example: ['electrical', 'hvac'] })
  requiredSkills: string[];

  @ApiPropertyOptional({
    example: 8500,
  })
  hourlyRate?: number;

  @ApiPropertyOptional({
    example: 50000,
  })
  totalBudget?: number;

  @ApiProperty({
    enum: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED'],
  })
  status: string;

  @ApiProperty()
  openPositions: number;

  @ApiProperty()
  createdAt: Date;
}

export class BidResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  jobId: string;

  @ApiProperty()
  bidderId: string;

  @ApiProperty({
    example: 8500,
  })
  amount: number;

  @ApiProperty()
  proposal: string;

  @ApiProperty({
    enum: ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  })
  status: string;

  @ApiPropertyOptional({
    example: 85,
    description: 'AI match score (0-100)',
  })
  aiScore?: number;

  @ApiProperty()
  createdAt: Date;
}

export class WorkerProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({
    example: 4.8,
    description: 'Average rating from jobs',
  })
  rating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty({ example: ['electrical_work', 'hvac', 'code_compliance'] })
  skills: string[];

  @ApiProperty()
  certifications: any[];

  @ApiProperty()
  portfolio: string[];

  @ApiProperty()
  createdAt: Date;
}
