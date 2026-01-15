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
  // Location fields for auto tax calculation
  address?: string;
  city?: string;
  state?: string; // US state code (CA, NY, TX, etc.)
  zipCode?: string;
  country?: string; // ISO country code (US, CA, etc.)
  timezone?: string;
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

  // App settings - uses business endpoint
  getSettings: () =>
    apiClient.get<{ data: AppSettings }>('/businesses/me').then(res => ({ data: res.data.data as unknown as AppSettings })),

  updateSettings: (data: Partial<AppSettings>) =>
    apiClient.put<AppSettings>('/businesses/me', data),
};
