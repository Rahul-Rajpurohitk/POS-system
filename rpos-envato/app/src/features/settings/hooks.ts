import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './api';
import type { CreateStaffRequest, UpdateStaffRequest, AppSettings } from './api';

export const settingsKeys = {
  all: ['settings'] as const,
  staff: () => [...settingsKeys.all, 'staff'] as const,
  staffMember: (id: string) => [...settingsKeys.staff(), id] as const,
  app: () => [...settingsKeys.all, 'app'] as const,
};

// Staff hooks
export function useStaff() {
  return useQuery({
    queryKey: settingsKeys.staff(),
    queryFn: () => settingsApi.getStaff(),
    select: (response) => response.data,
  });
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: settingsKeys.staffMember(id),
    queryFn: () => settingsApi.getStaffById(id),
    select: (response) => response.data,
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffRequest) => settingsApi.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.staff() });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffRequest }) =>
      settingsApi.updateStaff(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.staffMember(id) });
      queryClient.invalidateQueries({ queryKey: settingsKeys.staff() });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.staff() });
    },
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      settingsApi.resetStaffPassword(id, newPassword),
  });
}

// App settings hooks
export function useAppSettings() {
  return useQuery({
    queryKey: settingsKeys.app(),
    queryFn: () => settingsApi.getSettings(),
    select: (response) => response.data,
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.app() });
    },
  });
}
