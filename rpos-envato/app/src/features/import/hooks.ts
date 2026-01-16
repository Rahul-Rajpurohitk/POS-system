import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  validateImportFile,
  checkDuplicates,
  executeImport,
  getImportJob,
  rollbackImport,
  getImportHistory,
  downloadTemplate,
} from './api';
import type { DuplicateAction } from './types';

export const importKeys = {
  all: ['import'] as const,
  history: (page?: number) => [...importKeys.all, 'history', page] as const,
  job: (id: string) => [...importKeys.all, 'job', id] as const,
};

/**
 * Hook to validate import file
 */
export function useValidateImport() {
  return useMutation({
    mutationFn: validateImportFile,
  });
}

/**
 * Hook to check duplicates
 */
export function useCheckDuplicates() {
  return useMutation({
    mutationFn: ({
      file,
      columnMapping,
    }: {
      file: File;
      columnMapping?: Record<string, string>;
    }) => checkDuplicates(file, columnMapping),
  });
}

/**
 * Hook to execute import
 */
export function useExecuteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      columnMapping,
      duplicateAction,
    }: {
      file: File;
      columnMapping?: Record<string, string>;
      duplicateAction?: DuplicateAction;
    }) => executeImport(file, columnMapping, duplicateAction),
    onSuccess: () => {
      // Invalidate product queries after import
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: importKeys.history() });
    },
  });
}

/**
 * Hook to get import job status
 */
export function useImportJob(jobId: string | null, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: importKeys.job(jobId || ''),
    queryFn: () => getImportJob(jobId!),
    enabled: !!jobId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Hook to rollback import
 */
export function useRollbackImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rollbackImport,
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: importKeys.job(jobId) });
      queryClient.invalidateQueries({ queryKey: importKeys.history() });
    },
  });
}

/**
 * Hook to get import history
 */
export function useImportHistory(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: importKeys.history(page),
    queryFn: () => getImportHistory(page, limit),
    staleTime: 60000,
  });
}

/**
 * Hook to download template
 * In React Native, this returns the template data for manual handling
 */
export function useDownloadTemplate() {
  return useMutation({
    mutationFn: async () => {
      const blob = await downloadTemplate();
      // Return blob for React Native file handling
      // The component will use expo-file-system and expo-sharing
      return blob;
    },
  });
}
