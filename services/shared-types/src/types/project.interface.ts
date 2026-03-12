export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectUserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  status: ProjectStatus;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProject {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectUserRole;
  joinedAt: Date;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  companyId: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  status?: ProjectStatus;
}

export interface AddUserToProjectDto {
  userId: string;
  role: ProjectUserRole;
}
