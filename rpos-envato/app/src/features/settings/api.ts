import { apiClient } from '@/services/api/client';
import type { User } from '@/types';

export interface StaffMember extends User {
  isActive: boolean;
}

export interface CreateStaffRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier';
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'cashier';
  isActive?: boolean;
}

export interface AppSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  taxNumber: string;
  receiptFooter: string;
  currency: string;
  tax: number;
  language: string;
}

export const settingsApi = {
  // Staff management
  getStaff: () =>
    apiClient.get<StaffMember[]>('/settings/staff'),

  getStaffById: (id: string) =>
    apiClient.get<StaffMember>(`/settings/staff/${id}`),

  createStaff: (data: CreateStaffRequest) =>
    apiClient.post<StaffMember>('/settings/staff', data),

  updateStaff: (id: string, data: UpdateStaffRequest) =>
    apiClient.put<StaffMember>(`/settings/staff/${id}`, data),

  deleteStaff: (id: string) =>
    apiClient.delete(`/settings/staff/${id}`),

  resetStaffPassword: (id: string, newPassword: string) =>
    apiClient.post(`/settings/staff/${id}/reset-password`, { newPassword }),

  // App settings
  getSettings: () =>
    apiClient.get<AppSettings>('/settings'),

  updateSettings: (data: Partial<AppSettings>) =>
    apiClient.put<AppSettings>('/settings', data),
};
