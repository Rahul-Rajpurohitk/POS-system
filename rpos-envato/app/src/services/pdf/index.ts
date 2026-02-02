/**
 * PDF Service - Platform Factory
 *
 * Exports the appropriate PDF service based on the current platform.
 * Web uses blob download, native uses expo-file-system + expo-sharing.
 */

import { Platform } from 'react-native';
import type { IPdfService } from './types';

// Re-export types for convenience
export * from './types';

/**
 * Platform-specific PDF service instance
 *
 * Dynamically loads the correct implementation:
 * - Web: Uses blob download and creates download links
 * - Native (iOS/Android): Uses expo-file-system and expo-sharing
 */
export const pdfService: IPdfService = Platform.select({
  web: () => require('./web').pdfService,
  default: () => require('./native').pdfService,
})();

/**
 * Check if PDF download is supported on this platform
 */
export function isPdfDownloadSupported(): boolean {
  return pdfService.isAvailable();
}

/**
 * Helper function to download a receipt
 */
export async function downloadReceipt(orderId: string) {
  return pdfService.downloadReceipt(orderId);
}

/**
 * Helper function to download an invoice
 */
export async function downloadInvoice(orderId: string) {
  return pdfService.downloadInvoice(orderId);
}

/**
 * Helper function to download a report
 */
export async function downloadReport(
  reportType: string,
  params?: Record<string, string>
) {
  return pdfService.downloadReport(reportType, params);
}

/**
 * Helper function to generate a receipt PDF locally
 */
export async function generateReceipt(
  data: import('./types').ReceiptPdfData,
  filename?: string
) {
  return pdfService.generateReceipt(data, filename);
}
