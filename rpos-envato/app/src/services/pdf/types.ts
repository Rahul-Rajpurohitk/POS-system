/**
 * PDF Service Types
 *
 * Defines the interface for PDF download operations.
 * Supports cross-platform implementation (web and native).
 */

export type PdfDocumentType = 'receipt' | 'invoice';

export interface PdfDownloadOptions {
  /**
   * Order ID for order-specific documents
   */
  orderId?: string;

  /**
   * Report type for report documents
   */
  reportType?: 'daily' | 'inventory' | 'sales';

  /**
   * Date parameter for dated reports
   */
  date?: string;

  /**
   * Start date for range reports
   */
  startDate?: string;

  /**
   * End date for range reports
   */
  endDate?: string;

  /**
   * Custom filename (without .pdf extension)
   */
  filename?: string;
}

export interface PdfDownloadResult {
  /**
   * Whether the download was successful
   */
  success: boolean;

  /**
   * Local file path (native) or blob URL (web)
   */
  filePath?: string;

  /**
   * Error message if download failed
   */
  error?: string;
}

/**
 * PDF Service Interface
 *
 * Implemented by both web and native services.
 * Provides methods for downloading PDF documents.
 */
/**
 * Receipt data for generating PDF receipts locally
 */
export interface ReceiptPdfData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxId?: string;
  orderNumber: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    modifiers?: string[];
  }>;
  subTotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  customerName?: string;
  customerPhone?: string;
  footer?: string;
}

export interface IPdfService {
  /**
   * Check if the PDF service is available on this platform
   */
  isAvailable(): boolean;

  /**
   * Download a receipt PDF for an order
   * @param orderId - The order ID
   * @returns Promise resolving to download result
   */
  downloadReceipt(orderId: string): Promise<PdfDownloadResult>;

  /**
   * Download an invoice PDF for an order
   * @param orderId - The order ID
   * @returns Promise resolving to download result
   */
  downloadInvoice(orderId: string): Promise<PdfDownloadResult>;

  /**
   * Download a report PDF
   * @param reportType - Type of report to download
   * @param params - Additional parameters for the report
   * @returns Promise resolving to download result
   */
  downloadReport(
    reportType: string,
    params?: Record<string, string>
  ): Promise<PdfDownloadResult>;

  /**
   * Generate and save a receipt PDF locally from order data
   * @param data - Receipt data
   * @param filename - Optional filename
   * @returns Promise resolving to download result
   */
  generateReceipt(data: ReceiptPdfData, filename?: string): Promise<PdfDownloadResult>;

  /**
   * Get the base URL for PDF endpoints
   */
  getBaseUrl(): string;
}
