import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';

@ApiTags('Projects')
@Controller('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Create new project
   */
  @Post()
  @ApiOperation({
    summary: 'Create project',
    description: 'GC creates new project with initial scope and budget',
  })
  @ApiCreatedResponse({
    description: 'Project created successfully',
  })
  async createProject(
    @CurrentUser() userId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectService.createProject(userId, createProjectDto);
  }

  /**
   * Get project by ID
   */
  @Get(':projectId')
  @ApiOperation({
    summary: 'Get project',
    description: 'Retrieve project details including milestones and documents',
  })
  @ApiOkResponse({
    description: 'Project details',
  })
  async getProject(@Param('projectId') projectId: string) {
    return this.projectService.getProject(projectId);
  }

  /**
   * List projects
   */
  @Get()
  @ApiOperation({
    summary: 'List projects',
    description: 'List projects for current user (GC, subcontractor, or worker)',
  })
  @ApiOkResponse({
    description: 'List of projects',
  })
  async listProjects(
    @CurrentUser() userId: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.projectService.listProjects(userId, {
      status,
      skip: parseInt(skip) || 0,
      take: parseInt(take) || 20,
    });
  }

  /**
   * Update project
   */
  @Patch(':projectId')
  @ApiOperation({
    summary: 'Update project',
    description: 'GC updates project details (title, scope, schedule)',
  })
  @ApiOkResponse({
    description: 'Project updated',
  })
  async updateProject(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(projectId, userId, updateProjectDto);
  }

  /**
   * Create milestone
   */
  @Post(':projectId/milestones')
  @ApiOperation({
    summary: 'Create milestone',
    description: 'GC creates payment milestone for project',
  })
  @ApiCreatedResponse({
    description: 'Milestone created',
  })
  async createMilestone(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.projectService.createMilestone(projectId, userId, createMilestoneDto);
  }

  /**
   * List milestones
   */
  @Get(':projectId/milestones')
  @ApiOperation({
    summary: 'List milestones',
    description: 'Get all milestones for project',
  })
  @ApiOkResponse({
    description: 'Milestones list',
  })
  async listMilestones(@Param('projectId') projectId: string) {
    return this.projectService.listMilestones(projectId);
  }

  /**
   * Complete milestone
   */
  @Patch(':projectId/milestones/:milestoneId/complete')
  @ApiOperation({
    summary: 'Complete milestone',
    description: 'GC marks milestone as complete, ready for payment request',
  })
  @ApiOkResponse({
    description: 'Milestone marked as complete',
  })
  async completeMilestone(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.projectService.completeMilestone(projectId, milestoneId, userId);
  }

  /**
   * Upload document
   */
  @Post(':projectId/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload document',
    description: 'Upload blueprint, spec, RFI, lien waiver, or other document',
  })
  @ApiCreatedResponse({
    description: 'Document uploaded',
  })
  async uploadDocument(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { documentType: string; description?: string },
  ) {
    return this.projectService.uploadDocument(projectId, userId, file, dto);
  }

  /**
   * Get project documents
   */
  @Get(':projectId/documents')
  @ApiOperation({
    summary: 'Get documents',
    description: 'List uploaded documents for project',
  })
  @ApiOkResponse({
    description: 'Documents list',
  })
  async getProjectDocuments(@Param('projectId') projectId: string) {
    return this.projectService.getProjectDocuments(projectId);
  }

  /**
   * Assign worker
   */
  @Post(':projectId/workers/:workerId')
  @ApiOperation({
    summary: 'Assign worker',
    description: 'GC assigns worker to project',
  })
  @ApiCreatedResponse({
    description: 'Worker assigned',
  })
  async assignWorker(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Param('workerId') workerId: string,
    @Body('role') role: string,
  ) {
    return this.projectService.assignWorker(projectId, userId, workerId, role);
  }

  /**
   * Get budget analysis
   */
  @Get(':projectId/budget')
  @ApiOperation({
    summary: 'Get budget analysis',
    description: 'Budget breakdown: allocated, paid, pending, remaining',
  })
  @ApiOkResponse({
    description: 'Budget analysis',
  })
  async getBudgetAnalysis(@Param('projectId') projectId: string) {
    return this.projectService.getBudgetAnalysis(projectId);
  }

  /**
   * Get project timeline
   */
  @Get(':projectId/timeline')
  @ApiOperation({
    summary: 'Get timeline',
    description: 'Project timeline with milestone status and remaining days',
  })
  @ApiOkResponse({
    description: 'Timeline data',
  })
  async getTimeline(@Param('projectId') projectId: string) {
    return this.projectService.getTimeline(projectId);
  }
}
