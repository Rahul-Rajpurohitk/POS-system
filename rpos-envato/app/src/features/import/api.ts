import { apiClient } from '@/services/api/client';
import type {
  ValidateResponse,
  DuplicateCheckResponse,
  ImportResponse,
  ImportJob,
  ImportHistoryResponse,
  DuplicateAction,
} from './types';

/**
 * Download the CSV import template
 */
export const downloadTemplate = async (): Promise<Blob> => {
  const response = await apiClient.get('/products/import/template', {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Validate an import file
 */
export const validateImportFile = async (file: File): Promise<ValidateResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ValidateResponse>(
    '/products/import/validate',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Check for duplicates in the import file
 */
export const checkDuplicates = async (
  file: File,
  columnMapping?: Record<string, string>
): Promise<DuplicateCheckResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (columnMapping) {
    formData.append('columnMapping', JSON.stringify(columnMapping));
  }

  const response = await apiClient.post<DuplicateCheckResponse>(
    '/products/import/check-dupes',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Execute the product import
 */
export const executeImport = async (
  file: File,
  columnMapping?: Record<string, string>,
  duplicateAction: DuplicateAction = 'skip'
): Promise<ImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (columnMapping) {
    formData.append('columnMapping', JSON.stringify(columnMapping));
  }
  formData.append('duplicateAction', duplicateAction);

  const response = await apiClient.post<ImportResponse>(
    '/products/import',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Get import job status
 */
export const getImportJob = async (jobId: string): Promise<ImportJob> => {
  const response = await apiClient.get<ImportJob>(`/products/import/${jobId}`);
  return response.data;
};

/**
 * Rollback an import
 */
export const rollbackImport = async (
  jobId: string
): Promise<{ jobId: string; status: string; rolledBackProducts: number; rollbackAt: string }> => {
  const response = await apiClient.post<{
    jobId: string;
    status: string;
    rolledBackProducts: number;
    rollbackAt: string;
  }>(`/products/import/${jobId}/rollback`);
  return response.data;
};

/**
 * Get import history
 */
export const getImportHistory = async (
  page: number = 1,
  limit: number = 20
): Promise<ImportHistoryResponse> => {
  const response = await apiClient.get<ImportHistoryResponse>('/products/import/history', {
    params: { page, limit },
  });
  return response.data;
};
