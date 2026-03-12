export enum UserRole {
  ADMIN = 'ADMIN',
  GENERAL_CONTRACTOR = 'GENERAL_CONTRACTOR',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  SUPERINTENDENT = 'SUPERINTENDENT',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
}

export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  companyId?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  companyId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}
