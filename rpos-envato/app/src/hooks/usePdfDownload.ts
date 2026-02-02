/**
 * usePdfDownload Hook
 *
 * A React hook for downloading PDF documents (receipts, invoices, reports).
 * Provides loading state, error handling, and cross-platform support.
 */

import { useState, useCallback } from 'react';
import { pdfService, PdfDownloadResult } from '@/services/pdf';

export type PdfType = 'receipt' | 'invoice';

export interface UsePdfDownloadResult {
  /**
   * Whether a download is currently in progress
   */
  downloading: boolean;

  /**
   * Error message if the last download failed
   */
  error: string | null;

  /**
   * Clear any error state
   */
  clearError: () => void;

  /**
   * Download a receipt PDF for an order
   * @param orderId - The order ID
   * @returns Promise resolving to the download result
   */
  downloadReceipt: (orderId: string) => Promise<PdfDownloadResult>;

  /**
   * Download an invoice PDF for an order
   * @param orderId - The order ID
   * @returns Promise resolving to the download result
   */
  downloadInvoice: (orderId: string) => Promise<PdfDownloadResult>;

  /**
   * Download a report PDF
   * @param reportType - Type of report (daily, inventory, sales)
   * @param params - Optional parameters for the report
   * @returns Promise resolving to the download result
   */
  downloadReport: (
    reportType: string,
    params?: Record<string, string>
  ) => Promise<PdfDownloadResult>;

  /**
   * Download a PDF by type (convenience method)
   * @param type - 'receipt' or 'invoice'
   * @param orderId - The order ID
   * @returns Promise resolving to the download result
   */
  downloadPdf: (type: PdfType, orderId: string) => Promise<PdfDownloadResult>;

  /**
   * Whether PDF download is supported on this platform
   */
  isSupported: boolean;
}

/**
 * Hook for downloading PDF documents
 *
 * @example
 * ```tsx
 * const { downloadReceipt, downloading, error } = usePdfDownload();
 *
 * const handleDownload = async () => {
 *   const result = await downloadReceipt(orderId);
 *   if (result.success) {
 *     console.log('Downloaded to:', result.filePath);
 *   }
 * };
 * ```
 */
export function usePdfDownload(): UsePdfDownloadResult {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const downloadReceipt = useCallback(async (orderId: string): Promise<PdfDownloadResult> => {
    setDownloading(true);
    setError(null);

    try {
      const result = await pdfService.downloadReceipt(orderId);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setDownloading(false);
    }
  }, []);

  const downloadInvoice = useCallback(async (orderId: string): Promise<PdfDownloadResult> => {
    setDownloading(true);
    setError(null);

    try {
      const result = await pdfService.downloadInvoice(orderId);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setDownloading(false);
    }
  }, []);

  const downloadReport = useCallback(
    async (
      reportType: string,
      params?: Record<string, string>
    ): Promise<PdfDownloadResult> => {
      setDownloading(true);
      setError(null);

      try {
        const result = await pdfService.downloadReport(reportType, params);
        if (!result.success && result.error) {
          setError(result.error);
        }
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Download failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setDownloading(false);
      }
    },
    []
  );

  const downloadPdf = useCallback(
    async (type: PdfType, orderId: string): Promise<PdfDownloadResult> => {
      if (type === 'receipt') {
        return downloadReceipt(orderId);
      } else {
        return downloadInvoice(orderId);
      }
    },
    [downloadReceipt, downloadInvoice]
  );

  return {
    downloading,
    error,
    clearError,
    downloadReceipt,
    downloadInvoice,
    downloadReport,
    downloadPdf,
    isSupported: pdfService.isAvailable(),
  };
}

export default usePdfDownload;
