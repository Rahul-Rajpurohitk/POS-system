import { useEffect } from 'react';
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

// US State Tax Rates for auto-calculation
const US_STATE_TAX_RATES: Record<string, { rate: number }> = {
  'AL': { rate: 4 }, 'AK': { rate: 0 }, 'AZ': { rate: 5.6 }, 'AR': { rate: 6.5 },
  'CA': { rate: 7.25 }, 'CO': { rate: 2.9 }, 'CT': { rate: 6.35 }, 'DE': { rate: 0 },
  'FL': { rate: 6 }, 'GA': { rate: 4 }, 'HI': { rate: 4 }, 'ID': { rate: 6 },
  'IL': { rate: 6.25 }, 'IN': { rate: 7 }, 'IA': { rate: 6 }, 'KS': { rate: 6.5 },
  'KY': { rate: 6 }, 'LA': { rate: 4.45 }, 'ME': { rate: 5.5 }, 'MD': { rate: 6 },
  'MA': { rate: 6.25 }, 'MI': { rate: 6 }, 'MN': { rate: 6.875 }, 'MS': { rate: 7 },
  'MO': { rate: 4.225 }, 'MT': { rate: 0 }, 'NE': { rate: 5.5 }, 'NV': { rate: 6.85 },
  'NH': { rate: 0 }, 'NJ': { rate: 6.625 }, 'NM': { rate: 5.125 }, 'NY': { rate: 8 },
  'NC': { rate: 4.75 }, 'ND': { rate: 5 }, 'OH': { rate: 5.75 }, 'OK': { rate: 4.5 },
  'OR': { rate: 0 }, 'PA': { rate: 6 }, 'RI': { rate: 7 }, 'SC': { rate: 6 },
  'SD': { rate: 4.5 }, 'TN': { rate: 7 }, 'TX': { rate: 6.25 }, 'UT': { rate: 6.1 },
  'VT': { rate: 6 }, 'VA': { rate: 5.3 }, 'WA': { rate: 6.5 }, 'WV': { rate: 6 },
  'WI': { rate: 5 }, 'WY': { rate: 4 }, 'DC': { rate: 6 },
};

import { useSettingsStore } from '@/store';

// Helper function to calculate tax rate
function calculateTaxRate(data: AppSettings | null | undefined): number {
  if (!data) return 0;

  const businessState = data.state;
  const businessCountry = data.country || 'US';
  let taxRate = data.tax || 0;

  // Use state-based tax if applicable
  if (businessCountry === 'US' && businessState && US_STATE_TAX_RATES[businessState]) {
    taxRate = US_STATE_TAX_RATES[businessState].rate;
  }

  return taxRate;
}

// App settings hooks
export function useAppSettings() {
  const setTax = useSettingsStore((state) => state.setTax);

  const query = useQuery({
    queryKey: settingsKeys.app(),
    queryFn: () => settingsApi.getSettings(),
    select: (response) => response.data,
  });

  // Sync tax rate to settings store when data changes (outside of render)
  useEffect(() => {
    if (query.data) {
      const taxRate = calculateTaxRate(query.data);
      setTax(taxRate);
    }
  }, [query.data, setTax]);

  return query;
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
