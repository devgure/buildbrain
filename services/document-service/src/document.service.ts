import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/database/prisma.service';
import * as AWS from 'aws-sdk';

@Injectable()
export class DocumentService {
  private s3Client: AWS.S3;
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const awsAccessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'buildbrain-documents';

    // Initialize S3 client if credentials available
    if (awsAccessKeyId && awsSecretAccessKey) {
      this.s3Client = new AWS.S3({
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      });
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    projectId?: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Generate document key
      const docKey = `${projectId || 'general'}/${userId}/${Date.now()}-${file.originalname}`;

      // Upload to S3 if configured, otherwise mock
      let s3Url = '';
      if (this.s3Client) {
        const uploadResult = await this.s3Client
          .putObject({
            Bucket: this.bucketName,
            Key: docKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            ServerSideEncryption: 'AES256',
            Metadata: {
              'user-id': userId,
              'upload-date': new Date().toISOString(),
            },
          })
          .promise();

        s3Url = `https://${this.bucketName}.s3.amazonaws.com/${docKey}`;
      } else {
        // Mock URL for development
        s3Url = `http://localhost:3010/documents/${docKey}`;
      }

      // Create document record
      const document = await this.prisma.document.create({
        data: {
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          s3Key: docKey,
          s3Url,
          uploadedBy: userId,
          projectId,
          currentVersion: 1,
          metadata: metadata || {},
          isActive: true,
        },
      });

      // Create initial version record
      await this.prisma.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          s3Key: docKey,
          s3Url,
          uploadedBy: userId,
          fileSize: file.size,
          description: 'Initial upload',
        },
      });

      return {
        id: document.id,
        name: document.name,
        size: document.size,
        mimeType: document.mimetype,
        uploadedAt: document.createdAt,
        url: s3Url,
        version: 1,
      };
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new BadRequestException(
        error.message || 'Failed to upload document',
      );
    }
  }

  /**
   * Get document
   */
  async getDocument(documentId: string, userId: string): Promise<any> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { versions: true },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Check access
      if (!await this.checkDocumentAccess(documentId, userId, 'READ')) {
        throw new BadRequestException('Access denied');
      }

      return {
        id: document.id,
        name: document.name,
        size: document.size,
        mimeType: document.mimetype,
        uploadedAt: document.createdAt,
        uploadedBy: document.uploadedBy,
        url: document.s3Url,
        version: document.currentVersion,
        versionCount: document.versions.length,
        metadata: document.metadata,
      };
    } catch (error) {
      console.error('Get document failed:', error);
      throw new BadRequestException(error.message || 'Failed to get document');
    }
  }

  /**
   * List documents for project
   */
  async listDocuments(
    projectId: string,
    userId: string,
    skip = 0,
    take = 20,
  ): Promise<any> {
    try {
      // Check project access
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (project.createdBy !== userId && project.assignedTo !== userId) {
        throw new BadRequestException('Access denied');
      }

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: { projectId, isActive: true },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.document.count({
          where: { projectId, isActive: true },
        }),
      ]);

      return {
        items: documents.map(d => ({
          id: d.id,
          name: d.name,
          size: d.size,
          mimeType: d.mimetype,
          uploadedAt: d.createdAt,
          uploadedBy: d.uploadedBy,
          version: d.currentVersion,
        })),
        total,
        skip,
        take,
      };
    } catch (error) {
      console.error('List documents failed:', error);
      throw new BadRequestException(error.message || 'Failed to list documents');
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Check ownership
      if (document.uploadedBy !== userId) {
        throw new BadRequestException('Only document owner can delete');
      }

      // Soft delete
      await this.prisma.document.update({
        where: { id: documentId },
        data: { isActive: false, deletedAt: new Date() },
      });

      // Delete from S3 if configured
      if (this.s3Client) {
        try {
          await this.s3Client
            .deleteObject({
              Bucket: this.bucketName,
              Key: document.s3Key,
            })
            .promise();
        } catch (s3Error) {
          console.error('S3 deletion failed:', s3Error);
        }
      }
    } catch (error) {
      console.error('Delete document failed:', error);
      throw new BadRequestException(error.message || 'Failed to delete document');
    }
  }

  /**
   * Create new document version
   */
  async createVersion(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
    description?: string,
  ): Promise<any> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (document.uploadedBy !== userId) {
        throw new BadRequestException('Only document owner can create versions');
      }

      // Generate new version key
      const versionNumber = document.currentVersion + 1;
      const newKey = `${document.projectId || 'general'}/${userId}/${documentId}-v${versionNumber}-${file.originalname}`;

      // Upload to S3
      let s3Url = '';
      if (this.s3Client) {
        await this.s3Client
          .putObject({
            Bucket: this.bucketName,
            Key: newKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            ServerSideEncryption: 'AES256',
          })
          .promise();

        s3Url = `https://${this.bucketName}.s3.amazonaws.com/${newKey}`;
      } else {
        s3Url = `http://localhost:3010/documents/${newKey}`;
      }

      // Create version record
      const version = await this.prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber,
          s3Key: newKey,
          s3Url,
          uploadedBy: userId,
          fileSize: file.size,
          description: description || `Version ${versionNumber}`,
        },
      });

      // Update document current version
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          currentVersion: versionNumber,
          s3Key: newKey,
          s3Url,
          size: file.size,
        },
      });

      return {
        id: document.id,
        version: versionNumber,
        uploadedAt: version.createdAt,
        url: s3Url,
        size: file.size,
      };
    } catch (error) {
      console.error('Create version failed:', error);
      throw new BadRequestException(error.message || 'Failed to create version');
    }
  }

  /**
   * Get document versions
   */
  async getVersions(documentId: string, userId: string): Promise<any[]> {
    try {
      // Check access
      if (!await this.checkDocumentAccess(documentId, userId, 'READ')) {
        throw new BadRequestException('Access denied');
      }

      const versions = await this.prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
      });

      return versions.map(v => ({
        version: v.versionNumber,
        uploadedAt: v.createdAt,
        uploadedBy: v.uploadedBy,
        fileSize: v.fileSize,
        description: v.description,
        url: v.s3Url,
      }));
    } catch (error) {
      console.error('Get versions failed:', error);
      throw new BadRequestException(error.message || 'Failed to get versions');
    }
  }

  /**
   * Grant document access to user
   */
  async grantAccess(
    documentId: string,
    targetUserId: string,
    permission: 'READ' | 'COMMENT' | 'EDIT',
    grantedBy: string,
  ): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (document.uploadedBy !== grantedBy) {
        throw new BadRequestException('Only document owner can grant access');
      }

      await this.prisma.documentAccess.upsert({
        where: { documentId_userId: { documentId, userId: targetUserId } },
        update: { permission },
        create: {
          documentId,
          userId: targetUserId,
          permission,
          grantedBy,
        },
      });
    } catch (error) {
      console.error('Grant access failed:', error);
      throw new BadRequestException(error.message || 'Failed to grant access');
    }
  }

  /**
   * Revoke document access
   */
  async revokeAccess(
    documentId: string,
    targetUserId: string,
    revokedBy: string,
  ): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (document.uploadedBy !== revokedBy) {
        throw new BadRequestException('Only document owner can revoke access');
      }

      await this.prisma.documentAccess.delete({
        where: { documentId_userId: { documentId, userId: targetUserId } },
      });
    } catch (error) {
      console.error('Revoke access failed:', error);
      // Silently fail if not found
    }
  }

  /**
   * Check document access
   */
  private async checkDocumentAccess(
    documentId: string,
    userId: string,
    requiredPermission: string,
  ): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) return false;

    // Owner has full access
    if (document.uploadedBy === userId) return true;

    // Check explicit access grants
    const access = await this.prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });

    if (!access) return false;

    // Check permission hierarchy: EDIT > COMMENT > READ
    const permissions = ['READ', 'COMMENT', 'EDIT'];
    const requiredIndex = permissions.indexOf(requiredPermission);
    const grantedIndex = permissions.indexOf(access.permission);

    return grantedIndex >= requiredIndex;
  }

  /**
   * Get document metadata
   */
  async getMetadata(documentId: string, userId: string): Promise<any> {
    try {
      if (!await this.checkDocumentAccess(documentId, userId, 'READ')) {
        throw new BadRequestException('Access denied');
      }

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      return {
        id: document?.id,
        name: document?.name,
        mimeType: document?.mimetype,
        size: document?.size,
        uploadedAt: document?.createdAt,
        uploadedBy: document?.uploadedBy,
        version: document?.currentVersion,
        metadata: document?.metadata,
      };
    } catch (error) {
      console.error('Get metadata failed:', error);
      throw new BadRequestException(error.message || 'Failed to get metadata');
    }
  }
}
