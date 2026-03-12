import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { DocumentService } from './document.service';
import {
  DocumentUploadDto,
  DocumentResponseDto,
  DocumentListResponseDto,
  DocumentVersionDto,
} from './document.dto';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  /**
   * Upload document
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload document',
    description: 'Upload a document file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'Document uploaded',
    type: DocumentResponseDto,
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Query('projectId') projectId?: string,
    @Body() body?: { metadata?: string },
    @CurrentUser() user?: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const metadata = body?.metadata ? JSON.parse(body.metadata) : undefined;

    return this.documentService.uploadDocument(user.id, file, projectId, metadata);
  }

  /**
   * Get document
   */
  @Get(':documentId')
  @ApiOperation({
    summary: 'Get document',
    description: 'Retrieve document details',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Document retrieved',
    type: DocumentResponseDto,
  })
  async getDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.getDocument(documentId, user.id);
  }

  /**
   * List documents for project
   */
  @Get('project/:projectId')
  @ApiOperation({
    summary: 'List project documents',
    description: 'List all documents for a project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Skip count',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Take count',
  })
  @ApiOkResponse({
    description: 'Documents retrieved',
    type: DocumentListResponseDto,
  })
  async listDocuments(
    @Param('projectId') projectId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @CurrentUser() user: any,
  ) {
    return this.documentService.listDocuments(
      projectId,
      user.id,
      parseInt(skip, 10),
      parseInt(take, 10),
    );
  }

  /**
   * Delete document
   */
  @Delete(':documentId')
  @ApiOperation({
    summary: 'Delete document',
    description: 'Delete a document',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Document deleted',
  })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ) {
    await this.documentService.deleteDocument(documentId, user.id);
    return { success: true, message: 'Document deleted' };
  }

  /**
   * Create new document version
   */
  @Post(':documentId/versions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Create version',
    description: 'Upload a new version of document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiCreatedResponse({
    description: 'Version created',
  })
  async createVersion(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('description') description?: string,
    @CurrentUser() user?: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentService.createVersion(documentId, file, user.id, description);
  }

  /**
   * Get document versions
   */
  @Get(':documentId/versions')
  @ApiOperation({
    summary: 'Get versions',
    description: 'Get all versions of a document',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Versions retrieved',
    type: [DocumentVersionDto],
  })
  async getVersions(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.getVersions(documentId, user.id);
  }

  /**
   * Grant document access
   */
  @Post(':documentId/access/grant')
  @ApiOperation({
    summary: 'Grant access',
    description: 'Grant another user access to document',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiCreatedResponse({
    description: 'Access granted',
  })
  async grantAccess(
    @Param('documentId') documentId: string,
    @Body() body: { userId: string; permission: 'READ' | 'COMMENT' | 'EDIT' },
    @CurrentUser() user: any,
  ) {
    await this.documentService.grantAccess(
      documentId,
      body.userId,
      body.permission,
      user.id,
    );
    return { success: true, message: 'Access granted' };
  }

  /**
   * Revoke document access
   */
  @Delete(':documentId/access/revoke/:userId')
  @ApiOperation({
    summary: 'Revoke access',
    description: 'Revoke user access to document',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Access revoked',
  })
  async revokeAccess(
    @Param('documentId') documentId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    await this.documentService.revokeAccess(documentId, userId, user.id);
    return { success: true, message: 'Access revoked' };
  }

  /**
   * Get document metadata
   */
  @Get(':documentId/metadata')
  @ApiOperation({
    summary: 'Get metadata',
    description: 'Get document metadata',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Metadata retrieved',
  })
  async getMetadata(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.getMetadata(documentId, user.id);
  }

  /**
   * Download document
   */
  @Get(':documentId/download')
  @ApiOperation({
    summary: 'Download document',
    description: 'Get presigned URL for document download',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Download URL',
  })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ) {
    const document = await this.documentService.getDocument(documentId, user.id);
    return {
      downloadUrl: document.url,
      name: document.name,
      expiresIn: 3600, // 1 hour
    };
  }
}
