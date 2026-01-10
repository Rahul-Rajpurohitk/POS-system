import { apiClient } from '@/services/api/client';
import type { User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<LoginResponse>('/auth/register', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<{ message: string }>('/auth/change-password', data),

  getProfile: () =>
    apiClient.get<User>('/auth/profile'),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.put<User>('/auth/profile', data),

  logout: () =>
    apiClient.post('/auth/logout'),
};
