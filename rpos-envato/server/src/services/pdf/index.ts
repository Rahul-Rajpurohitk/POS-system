/**
 * PDF Print Engine - Service Exports
 *
 * This module provides enterprise-grade PDF generation for:
 * - Receipts
 * - Invoices
 * - Reports (daily summary, inventory, sales)
 *
 * Usage:
 *   import { pdfService, DocumentType } from '@/services/pdf';
 *
 *   const buffer = await pdfService.generatePdf({
 *     documentType: DocumentType.RECEIPT,
 *     // ... document data
 *   });
 */

// Core types
export {
  DocumentType,
  type BaseDocumentData,
  type BusinessInfo,
  type OrderData,
  type OrderItemData,
  type PaymentData,
  type CustomerInfo,
  type StaffInfo,
  type ReceiptDocumentData,
  type InvoiceDocumentData,
  type DailySummaryData,
  type PdfTemplate,
  type AnyDocumentData,
  type PdfGenerationOptions,
  type CurrencyFormatOptions,
} from './types';

// Service and utilities
export {
  PdfService,
  pdfService,
  formatCurrency,
  getCurrencySymbol,
  formatDate,
  formatTime,
  formatDateTime,
} from './pdf.service';

// Templates
export { ReceiptTemplate } from './templates/receipt.template';
export { InvoiceTemplate } from './templates/invoice.template';

// ============ INITIALIZED SERVICE ============

import { pdfService } from './pdf.service';
import { ReceiptTemplate } from './templates/receipt.template';
import { InvoiceTemplate } from './templates/invoice.template';

// Register built-in templates
pdfService.registerTemplate(new ReceiptTemplate());
pdfService.registerTemplate(new InvoiceTemplate());

// Export the initialized service as default
export default pdfService;
