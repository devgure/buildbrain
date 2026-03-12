import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/auth/decorators/current-user.decorator';
import { AIService } from './ai.service';
import { User } from '@prisma/client';
import {
  ExtractDocumentDto,
  AnalyzeDocumentDto,
  MatchWorkersDto,
  GenerateProposalDto,
  ExtractionResultDto,
  AnalysisResultDto,
  WorkerMatchDto,
  ProposalResultDto,
} from './ai.dto';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('documents/extract')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Extract text and data from document',
    description: 'Use OCR and AI to extract structured data from uploaded documents',
  })
  @ApiCreatedResponse({
    description: 'Document extraction completed',
    type: ExtractionResultDto,
  })
  async extractDocument(
    @CurrentUser() user: User,
    @Body() extractDto: ExtractDocumentDto,
  ): Promise<ExtractionResultDto> {
    return this.aiService.extractDocumentData(
      extractDto.documentId,
      extractDto.documentUrl,
      extractDto.documentType,
    );
  }

  @Post('documents/analyze')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Analyze document content for risks and recommendations',
    description: 'Use AI to identify risks and generate recommendations for a document',
  })
  @ApiCreatedResponse({
    description: 'Document analysis completed',
    type: AnalysisResultDto,
  })
  async analyzeDocument(
    @CurrentUser() user: User,
    @Body() analyzeDto: AnalyzeDocumentDto,
  ): Promise<AnalysisResultDto> {
    return this.aiService.analyzeDocumentContent(
      analyzeDto.documentId,
      analyzeDto.documentType,
      analyzeDto.extractedData,
    );
  }

  @Post('jobs/match-workers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Find best workers for a job',
    description: 'Use AI to match job requirements with worker skills and experience',
  })
  @ApiCreatedResponse({
    description: 'Worker matching completed',
    isArray: true,
    type: WorkerMatchDto,
  })
  async matchWorkersForJob(
    @CurrentUser() user: User,
    @Body() matchDto: MatchWorkersDto,
  ): Promise<WorkerMatchDto[]> {
    return this.aiService.matchWorkersForJob(
      matchDto.jobId,
      matchDto.jobDescription,
    );
  }

  @Post('proposals/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate job proposal',
    description: 'Use AI to create a professional proposal for a job',
  })
  @ApiCreatedResponse({
    description: 'Proposal generated successfully',
    type: ProposalResultDto,
  })
  async generateProposal(
    @CurrentUser() user: User,
    @Body() proposalDto: GenerateProposalDto,
  ): Promise<ProposalResultDto> {
    return this.aiService.generateJobProposal(
      proposalDto.jobId,
      user.id,
      proposalDto.jobDescription,
    );
  }

  @Get('documents/:documentId/classification')
  @ApiOperation({
    summary: 'Classify document type',
    description: 'Determine what type of document this is (invoice, contract, etc.)',
  })
  @ApiOkResponse({
    description: 'Document classified',
  })
  async classifyDocument(
    @Param('documentId') documentId: string,
    @Body() body: { text: string; providedType?: string },
  ) {
    return this.aiService.classifyDocument(body.text, body.providedType);
  }

  @Get('documents/:documentId/extraction')
  @ApiOperation({
    summary: 'Get document extraction results',
    description: 'Retrieve previously extracted data from a document',
  })
  @ApiOkResponse({
    description: 'Extraction results retrieved',
  })
  async getExtractionResults(@Param('documentId') documentId: string) {
    // Fetch from database
    const document = await this.aiService['prisma'].document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        extractedData: true,
        aiScore: true,
        aiVerified: true,
      },
    });

    return document;
  }

  @Get('workers/:workerId/matching-score')
  @ApiOperation({
    summary: 'Get worker AI matching profile',
    description: 'Get AI-calculated matching data for a specific worker',
  })
  @ApiOkResponse({
    description: 'Worker matching profile retrieved',
  })
  async getWorkerMatchingScore(@Param('workerId') workerId: string) {
    const worker = await this.aiService['prisma'].user.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        rating: true,
        skills: true,
        certifications: true,
      },
    });

    return {
      ...worker,
      aiProfile: {
        skillsCount: worker?.skills.length || 0,
        certificationsCount: worker?.certifications.length || 0,
        averageRating: worker?.rating || 0,
        matchingEligibility: true,
      },
    };
  }
}
