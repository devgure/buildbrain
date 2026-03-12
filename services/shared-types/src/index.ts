// User types
export * from './types/user.interface';

// Project types
export * from './types/project.interface';

// Bid types
export * from './types/bid.interface';

// Payment types
export * from './types/payment.interface';

// Document types
export * from './types/document.interface';

// Compliance types
export * from './types/compliance.interface';

// Common types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
