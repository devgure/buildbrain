import { IsString, IsOptional, IsNumber, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtractDocumentDto {
  @ApiProperty({
    example: 'doc-123',
    description: 'Document ID to extract from',
  })
  @IsString()
  documentId: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/buildbrain-docs/contract-123.pdf',
    description: 'URL to document file',
  })
  @IsString()
  documentUrl: string;

  @ApiProperty({
    example: 'CONTRACT',
    required: false,
    description: 'Document type hint (INVOICE, CONTRACT, BLUEPRINT, PERMIT, etc.)',
  })
  @IsOptional()
  @IsString()
  documentType?: string;
}

export class AnalyzeDocumentDto {
  @ApiProperty({
    example: 'doc-123',
    description: 'Document ID to analyze',
  })
  @IsString()
  documentId: string;

  @ApiProperty({
    example: 'CONTRACT',
    description: 'Type of document',
  })
  @IsString()
  documentType: string;

  @ApiProperty({
    example: {
      parties: ['John Doe', 'ABC Construction'],
      amount: 50000,
      startDate: '2024-01-01',
    },
    description: 'Extracted structured data from document',
  })
  @IsObject()
  extractedData: Record<string, any>;
}

export class MatchWorkersDto {
  @ApiProperty({
    example: 'job-456',
    description: 'Job ID to match workers for',
  })
  @IsString()
  jobId: string;

  @ApiProperty({
    example: 'Experienced electrician needed for commercial building wiring. Must have 5+ years experience.',
    description: 'Job description and requirements',
  })
  @IsString()
  jobDescription: string;
}

export class GenerateProposalDto {
  @ApiProperty({
    example: 'job-456',
    description: 'Job ID for proposal',
  })
  @IsString()
  jobId: string;

  @ApiProperty({
    example: 'Experienced electrician needed for commercial building wiring. Must have 5+ years experience.',
    description: 'Job description',
  })
  @IsString()
  jobDescription: string;
}

export class ExtractionResultDto {
  @ApiProperty({
    example: 'doc-123',
  })
  documentId: string;

  @ApiProperty({
    example: 'CONTRACT',
  })
  documentType: string;

  @ApiProperty({
    example: 'This is a contract between Party A and Party B...',
  })
  extractedText: string;

  @ApiProperty({
    example: {
      parties: ['Party A', 'Party B'],
      amount: 50000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  })
  structuredData: Record<string, any>;

  @ApiProperty({
    example: 87,
    description: 'Extraction confidence score 0-100',
  })
  confidence: number;

  @ApiProperty({
    example: 2340,
    description: 'Time taken for extraction in milliseconds',
  })
  extractionTime: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;
}

export class AnalysisResultDto {
  @ApiProperty({
    example: 'This contract outlines the agreement between parties for commercial construction services valued at $50,000.',
  })
  summary: string;

  @ApiProperty({
    example: ['payment terms', 'schedule', 'deliverables', 'liability', 'insurance'],
  })
  keyTerms: string[];

  @ApiProperty({
    example: ['No liability cap specified', 'Payment terms may favor contractor'],
  })
  risksIdentified: string[];

  @ApiProperty({
    example: ['Add liability cap to contract', 'Clarify payment schedule', 'Include insurance requirements'],
  })
  recommendations: string[];

  @ApiProperty({
    example: 50000,
    required: false,
  })
  estimatedValue?: number;

  @ApiProperty({
    example: '2024-12-31',
    required: false,
  })
  completionDate?: Date;
}

export class WorkerMatchDto {
  @ApiProperty({
    example: 'worker-789',
  })
  workerId: string;

  @ApiProperty({
    example: 92,
    description: 'Match score 0-100',
  })
  matchScore: number;

  @ApiProperty({
    example: 'Based on strong skill match and 8 years of experience in electrical work. Rating: 4.9/5',
  })
  reasoning: string;
}

export class ProposalResultDto {
  @ApiProperty({
    example: `
Project Overview:
This project involves complete electrical wiring installation for a commercial building. Our team will provide professional installation services...

Timeline:
- Week 1-2: Planning and Site Assessment
- Week 3-6: Main Installation
- Week 7: Testing and Inspection

Estimated Cost: $15,000
Quality Assurance: 100% inspection before completion
    `,
  })
  proposal: string;

  @ApiProperty({
    example: 15000,
    description: 'Estimated project cost',
  })
  estimatedCost: number;

  @ApiProperty({
    example: '3-4 weeks',
    description: 'Estimated project duration',
  })
  estimatedDuration: string;
}

export class DocumentClassificationDto {
  @ApiProperty({
    example: 'CONTRACT',
  })
  documentType: string;

  @ApiProperty({
    example: 88,
    description: 'Confidence score 0-100',
  })
  confidence: number;

  @ApiProperty({
    example: 'CONTRACT',
    enum: ['INVOICE', 'CONTRACT', 'BLUEPRINT', 'FORM', 'PERMIT', 'OTHER'],
  })
  category: string;
}

export class ExtractionProgressDto {
  @ApiProperty({
    example: 'doc-123',
  })
  documentId: string;

  @ApiProperty({
    example: 'PROCESSING',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  status: string;

  @ApiProperty({
    example: 65,
    description: 'Progress percentage 0-100',
  })
  progress: number;

  @ApiProperty({
    example: null,
    required: false,
  })
  result?: ExtractionResultDto;

  @ApiProperty({
    example: null,
    required: false,
  })
  error?: string;
}
