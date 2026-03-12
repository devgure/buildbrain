import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsObject } from 'class-validator';

export class DocumentUploadDto {
  @ApiProperty({
    description: 'Document file',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Project ID',
    example: 'project-uuid-123',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Document metadata',
    example: { category: 'blueprints', phase: '1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DocumentResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: 'doc-uuid-123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'File name',
    example: 'building_blueprint.pdf',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'File size (bytes)',
    example: 2456789,
  })
  @IsNumber()
  size: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2025-02-15T10:30:00Z',
  })
  uploadedAt: Date;

  @ApiPropertyOptional({
    description: 'Uploader user ID',
    example: 'user-uuid-123',
  })
  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @ApiProperty({
    description: 'Document URL',
    example: 'https://s3.amazonaws.com/buildbrain/documents/...',
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Current version number',
    example: 1,
  })
  @IsNumber()
  version: number;

  @ApiPropertyOptional({
    description: 'Total versions count',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  versionCount?: number;

  @ApiPropertyOptional({
    description: 'Document metadata',
    example: { category: 'blueprints' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DocumentListResponseDto {
  @ApiProperty({
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  @IsArray()
  items: DocumentResponseDto[];

  @ApiProperty({
    description: 'Total count',
    example: 24,
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    description: 'Skip count',
    example: 0,
  })
  @IsNumber()
  skip: number;

  @ApiProperty({
    description: 'Take count',
    example: 20,
  })
  @IsNumber()
  take: number;
}

export class DocumentVersionDto {
  @ApiProperty({
    description: 'Version number',
    example: 2,
  })
  @IsNumber()
  version: number;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2025-02-16T14:22:00Z',
  })
  uploadedAt: Date;

  @ApiProperty({
    description: 'User who uploaded version',
    example: 'user-uuid-123',
  })
  @IsString()
  uploadedBy: string;

  @ApiProperty({
    description: 'File size (bytes)',
    example: 2456789,
  })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({
    description: 'Version description',
    example: 'Updated blueprints with HVAC corrections',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Version URL',
    example: 'https://s3.amazonaws.com/buildbrain/documents/...',
  })
  @IsString()
  url: string;
}

export class CreateVersionDto {
  @ApiProperty({
    description: 'New version file',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Version description',
    example: 'Updated with client feedback',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class GrantAccessDto {
  @ApiProperty({
    description: 'User ID to grant access to',
    example: 'user-uuid-456',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Permission level',
    enum: ['READ', 'COMMENT', 'EDIT'],
    example: 'READ',
  })
  @IsEnum(['READ', 'COMMENT', 'EDIT'])
  permission: 'READ' | 'COMMENT' | 'EDIT';
}

export class DocumentAccessDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-456',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Permission level',
    enum: ['READ', 'COMMENT', 'EDIT'],
    example: 'READ',
  })
  @IsEnum(['READ', 'COMMENT', 'EDIT'])
  permission: 'READ' | 'COMMENT' | 'EDIT';

  @ApiProperty({
    description: 'Granted by user ID',
    example: 'user-uuid-123',
  })
  @IsString()
  grantedBy: string;

  @ApiProperty({
    description: 'Grant date',
    example: '2025-02-15T10:30:00Z',
  })
  grantedAt: Date;
}

export class DocumentMetadataDto {
  @ApiProperty({
    description: 'Document ID',
    example: 'doc-uuid-123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'File name',
    example: 'blueprint.pdf',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'File size',
    example: 2456789,
  })
  @IsNumber()
  size: number;

  @ApiProperty({
    description: 'Upload date',
    example: '2025-02-15T10:30:00Z',
  })
  uploadedAt: Date;

  @ApiProperty({
    description: 'Uploader user ID',
    example: 'user-uuid-123',
  })
  @IsString()
  uploadedBy: string;

  @ApiProperty({
    description: 'Current version',
    example: 1,
  })
  @IsNumber()
  version: number;

  @ApiPropertyOptional({
    description: 'Custom metadata',
    example: { category: 'blueprints', phase: '1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DocumentDownloadDto {
  @ApiProperty({
    description: 'Presigned download URL',
    example: 'https://s3.amazonaws.com/...',
  })
  @IsString()
  downloadUrl: string;

  @ApiProperty({
    description: 'File name',
    example: 'blueprint.pdf',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'URL expiration (seconds)',
    example: 3600,
  })
  @IsNumber()
  expiresIn: number;
}

export class DocumentSearchDto {
  @ApiPropertyOptional({
    description: 'File name search',
    example: 'blueprint',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Min file size (bytes)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  minSize?: number;

  @ApiPropertyOptional({
    description: 'Max file size (bytes)',
    example: 10000000,
  })
  @IsOptional()
  @IsNumber()
  maxSize?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['name', 'uploadedAt', 'size'],
    example: 'uploadedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class BulkUploadDto {
  @ApiProperty({
    description: 'List of files',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  files: Express.Multer.File[];

  @ApiPropertyOptional({
    description: 'Project ID',
    example: 'project-uuid-123',
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class DocumentActivityDto {
  @ApiProperty({
    description: 'Activity type',
    enum: ['CREATED', 'UPDATED', 'VIEWED', 'SHARED', 'DELETED'],
    example: 'CREATED',
  })
  @IsEnum(['CREATED', 'UPDATED', 'VIEWED', 'SHARED', 'DELETED'])
  type: string;

  @ApiProperty({
    description: 'User who performed action',
    example: 'user-uuid-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Timestamp',
    example: '2025-02-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Activity details',
    example: { version: 2 },
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}
