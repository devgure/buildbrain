import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create new project
   * Only GCs can create projects
   */
  async createProject(userId: string, dto: CreateProjectDto) {
    // Validate user is a GC
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user.role !== 'GC') {
      throw new ForbiddenException('Only GCs can create projects');
    }

    // Create project with initial status PLANNING
    const project = await this.prisma.project.create({
      data: {
        gcId: userId,
        title: dto.title,
        description: dto.description,
        status: 'PLANNING',
        budget: new Decimal(dto.budget),
        scope: dto.scope,
        location: dto.location,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        estimatedDurationDays: dto.estimatedDurationDays || 0,
        projectType: dto.projectType || 'GENERAL',
      },
      include: {
        gc: { select: { id: true, email: true, companyName: true } },
        milestones: true,
      },
    });

    return project;
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string, userId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        gc: { select: { id: true, email: true, companyName: true, phone: true } },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            status: true,
            uploadedAt: true,
            uploadedBy: { select: { email: true } },
          },
        },
        bids: {
          select: {
            id: true,
            bidder: { select: { email: true, companyName: true } },
            amount: true,
            status: true,
            createdAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * List projects (with filters)
   */
  async listProjects(
    userId: string,
    filters?: {
      status?: string;
      role?: 'GC' | 'SUBCONTRACTOR' | 'WORKER';
      skip?: number;
      take?: number;
    },
  ) {
    const skip = filters?.skip || 0;
    const take = filters?.take || 20;

    // Determine what projects to show based on user role
    let where: any = {};

    if (filters?.role === 'GC') {
      where.gcId = userId;
    } else if (filters?.role === 'SUBCONTRACTOR') {
      // Show projects where user has submitted a bid
      where.bids = {
        some: { bidderId: userId },
      };
    } else if (filters?.role === 'WORKER') {
      // Show projects where user has been assigned
      where.assignments = {
        some: { workerId: userId },
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        gc: { select: { companyName: true } },
        milestones: { select: { amount: true, status: true } },
      },
    });

    const total = await this.prisma.project.count({ where });

    return { data: projects, total, skip, take };
  }

  /**
   * Update project
   * Only GC can update (until locked)
   */
  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.getProject(projectId);

    if (project.gc.id !== userId) {
      throw new ForbiddenException('Only project GC can modify project');
    }

    if (project.status !== 'PLANNING' && project.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot modify completed or cancelled project');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.budget && { budget: new Decimal(dto.budget) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
      include: { milestones: true },
    });

    return updated;
  }

  /**
   * Create milestone (payment breakpoint)
   */
  async createMilestone(projectId: string, userId: string, dto: CreateMilestoneDto) {
    const project = await this.getProject(projectId);

    if (project.gc.id !== userId) {
      throw new ForbiddenException('Only project GC can create milestones');
    }

    // Calculate total milestone amount already allocated
    const existingMilestones = await this.prisma.milestone.findMany({
      where: { projectId },
    });

    const totalAllocated = existingMilestones.reduce(
      (sum, m) => sum + (m.amount?.toNumber() || 0),
      0,
    );

    if (totalAllocated + dto.amount > project.budget.toNumber()) {
      throw new BadRequestException(
        `Milestone amount exceeds project budget. Remaining: ${project.budget.toNumber() - totalAllocated}`,
      );
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        amount: new Decimal(dto.amount),
        percentage: new Decimal(dto.percentage || (dto.amount / project.budget.toNumber()) * 100),
        status: 'PENDING',
        dueDate: new Date(dto.dueDate),
        order: existingMilestones.length + 1,
        deliverables: dto.deliverables || [],
      },
    });

    return milestone;
  }

  /**
   * List milestones for project
   */
  async listMilestones(projectId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return milestones;
  }

  /**
   * Complete milestone (update status)
   */
  async completeMilestone(projectId: string, milestoneId: string, userId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.project.gcId !== userId) {
      throw new ForbiddenException('Only project GC can complete milestones');
    }

    // Mark as COMPLETED (ready for payment approval)
    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Upload project document (blueprint, spec, RFI, etc.)
   */
  async uploadDocument(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
    dto: { documentType: string; description?: string },
  ) {
    const project = await this.getProject(projectId);

    // Only GC, subs, and workers on project can upload
    const isAuthorized =
      project.gc.id === userId ||
      (await this.isUserOnProject(userId, projectId));

    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to upload to this project');
    }

    // Store file (in production: S3 or GCS)
    const fileUrl = `s3://buildbrain-documents/${projectId}/${file.originalname}`;

    const document = await this.prisma.document.create({
      data: {
        projectId,
        fileName: file.originalname,
        fileType: dto.documentType,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: fileUrl,
        status: 'UPLOADED',
        description: dto.description,
        uploadedById: userId,
      },
    });

    // TODO: Trigger AI parsing (OCR, extraction, etc.)
    // await this.aiService.parseDocument(document.id);

    return document;
  }

  /**
   * Get project documents
   */
  async getProjectDocuments(projectId: string) {
    const documents = await this.prisma.document.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: { select: { email: true, companyName: true } },
      },
    });

    return documents;
  }

  /**
   * Assign worker to project
   */
  async assignWorker(projectId: string, userId: string, workerId: string, role: string) {
    const project = await this.getProject(projectId);

    if (project.gc.id !== userId) {
      throw new ForbiddenException('Only project GC can assign workers');
    }

    // Verify worker exists
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
    });

    if (!worker || worker.role !== 'WORKER') {
      throw new BadRequestException('Worker not found or invalid');
    }

    // Create assignment
    const assignment = await this.prisma.projectAssignment.create({
      data: {
        projectId,
        workerId,
        role,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      },
    });

    return assignment;
  }

  /**
   * Check if user is on project (worker/subcontractor)
   */
  private async isUserOnProject(userId: string, projectId: string): Promise<boolean> {
    const assignment = await this.prisma.projectAssignment.findFirst({
      where: { projectId, workerId: userId },
    });

    return !!assignment;
  }

  /**
   * Get project budget breakdown
   */
  async getBudgetAnalysis(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: true,
        payments: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalMilestoneAmount = project.milestones.reduce(
      (sum, m) => sum + (m.amount?.toNumber() || 0),
      0,
    );

    const totalPaid = project.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.amount?.toNumber() || 0), 0);

    const totalPending = project.payments
      .filter((p) => p.status === 'PENDING' || p.status === 'APPROVED')
      .reduce((sum, p) => sum + (p.amount?.toNumber() || 0), 0);

    const remaining = project.budget.toNumber() - totalMilestoneAmount;

    return {
      budget: project.budget.toNumber(),
      milestonesAllocated: totalMilestoneAmount,
      paid: totalPaid,
      pending: totalPending,
      remaining,
      percentageSpent: (totalMilestoneAmount / project.budget.toNumber()) * 100,
    };
  }

  /**
   * Get project timeline status
   */
  async getTimeline(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const now = new Date();
    const timeDiff = project.endDate ? project.endDate.getTime() - now.getTime() : 0;
    const daysDifference = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const completedMilestones = project.milestones.filter(
      (m) => m.status === 'COMPLETED' || m.status === 'PAID',
    ).length;

    const percentageComplete = (completedMilestones / project.milestones.length) * 100;

    return {
      projectId: project.id,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      daysRemaining: daysDifference,
      percentageComplete,
      completedMilestones,
      totalMilestones: project.milestones.length,
      milestones: project.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        dueDate: m.dueDate,
        isOverdue: m.dueDate < now && m.status !== 'PAID',
      })),
    };
  }
}
