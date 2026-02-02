import type PDFDocument from 'pdfkit';

/**
 * PDF Print Engine - Core Types
 *
 * Extensible document type system using Template pattern.
 * Add new document types by:
 * 1. Add to DocumentType enum
 * 2. Create data interface extending BaseDocumentData
 * 3. Create template implementing PdfTemplate<YourDataType>
 * 4. Register template with PdfService
 */

// ============ DOCUMENT TYPES ============

/**
 * Supported document types - extend this enum for new document types
 */
export enum DocumentType {
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  DAILY_SUMMARY = 'daily_summary',
  INVENTORY_REPORT = 'inventory_report',
  SALES_REPORT = 'sales_report',
}

// ============ BUSINESS INFO ============

/**
 * Business branding and contact information
 */
export interface BusinessInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  taxId?: string;
  currency: string;
  currencySymbol: string;
  locale: string;
}

// ============ BASE DOCUMENT DATA ============

/**
 * Base interface for all document data types
 */
export interface BaseDocumentData {
  documentType: DocumentType;
  generatedAt: Date;
  businessInfo: BusinessInfo;
}

// ============ ORDER DATA ============

/**
 * Order item data for documents
 */
export interface OrderItemData {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sku?: string;
  modifiers?: string[];
  notes?: string;
  discount?: number;
}

/**
 * Order data shared between receipt and invoice
 */
export interface OrderData {
  id: string;
  orderNumber: string;
  items: OrderItemData[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  tip?: number;
  createdAt: Date;
  notes?: string;
}

/**
 * Payment data for receipts
 */
export interface PaymentData {
  method: string;
  methodDisplay: string;
  amountPaid: number;
  change: number;
  transactionId?: string;
  cardLastFour?: string;
  cardBrand?: string;
}

/**
 * Customer information for invoices
 */
export interface CustomerInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Cashier/staff information
 */
export interface StaffInfo {
  name: string;
  id?: string;
}

// ============ RECEIPT DOCUMENT ============

/**
 * Receipt document data
 */
export interface ReceiptDocumentData extends BaseDocumentData {
  documentType: DocumentType.RECEIPT;
  order: OrderData;
  payment: PaymentData;
  customer?: CustomerInfo;
  cashier?: StaffInfo;
  showBarcode?: boolean;
  footerMessage?: string;
}

// ============ INVOICE DOCUMENT ============

/**
 * Invoice document data
 */
export interface InvoiceDocumentData extends BaseDocumentData {
  documentType: DocumentType.INVOICE;
  invoiceNumber: string;
  order: OrderData;
  customer: CustomerInfo;
  dueDate?: Date;
  notes?: string;
  terms?: string;
  isPaid?: boolean;
}

// ============ DAILY SUMMARY DOCUMENT ============

/**
 * Daily summary report data
 */
export interface DailySummaryData extends BaseDocumentData {
  documentType: DocumentType.DAILY_SUMMARY;
  date: Date;
  summary: {
    totalOrders: number;
    totalSales: number;
    totalTax: number;
    totalDiscount: number;
    totalTips: number;
    netSales: number;
  };
  paymentBreakdown: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  topProducts?: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  hourlyBreakdown?: Array<{
    hour: number;
    orders: number;
    sales: number;
  }>;
}

// ============ TEMPLATE INTERFACE ============

/**
 * Template interface for PDF document generation
 * Implement this interface for new document types
 */
export interface PdfTemplate<T extends BaseDocumentData> {
  /**
   * Document type this template handles
   */
  documentType: DocumentType;

  /**
   * Generate PDF content
   * @param doc - PDFKit document instance
   * @param data - Document data
   */
  generate(doc: PDFKit.PDFDocument, data: T): Promise<void>;
}

// ============ UTILITY TYPES ============

/**
 * Type for any document data
 */
export type AnyDocumentData =
  | ReceiptDocumentData
  | InvoiceDocumentData
  | DailySummaryData;

/**
 * PDF generation options
 */
export interface PdfGenerationOptions {
  size?: 'A4' | 'LETTER' | 'RECEIPT';
  margin?: number;
  compress?: boolean;
}

/**
 * Currency formatting options
 */
export interface CurrencyFormatOptions {
  currency: string;
  locale: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}
