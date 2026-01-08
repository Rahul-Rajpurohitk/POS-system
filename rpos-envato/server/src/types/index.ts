export * from './enums';

// Common types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// JWT Payload
export interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Request with user info
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  businessId: string;
}
