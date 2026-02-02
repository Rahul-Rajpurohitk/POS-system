import PDFDocument from 'pdfkit';
import {
  DocumentType,
  BaseDocumentData,
  PdfTemplate,
  PdfGenerationOptions,
  CurrencyFormatOptions,
} from './types';

/**
 * PDF Print Engine - Main Service
 *
 * Enterprise-grade PDF generation service with extensible template registry.
 * Supports streaming PDF generation for memory efficiency.
 *
 * Usage:
 *   const pdfService = new PdfService();
 *   const buffer = await pdfService.generatePdf(receiptData);
 */
export class PdfService {
  private templates: Map<DocumentType, PdfTemplate<any>> = new Map();

  constructor() {
    // Templates are registered externally after construction
    // This allows for flexible template loading and testing
  }

  /**
   * Register a template for a document type
   * Allows runtime extension of the PDF engine
   */
  registerTemplate<T extends BaseDocumentData>(template: PdfTemplate<T>): void {
    this.templates.set(template.documentType, template);
  }

  /**
   * Check if a template is registered for a document type
   */
  hasTemplate(documentType: DocumentType): boolean {
    return this.templates.has(documentType);
  }

  /**
   * Get registered document types
   */
  getRegisteredTypes(): DocumentType[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Generate PDF document
   * Returns a Buffer containing the complete PDF
   */
  async generatePdf<T extends BaseDocumentData>(
    data: T,
    options: PdfGenerationOptions = {}
  ): Promise<Buffer> {
    const template = this.templates.get(data.documentType);
    if (!template) {
      throw new Error(
        `No template registered for document type: ${data.documentType}. ` +
        `Available types: ${this.getRegisteredTypes().join(', ')}`
      );
    }

    // Determine page size
    const pageSize = this.getPageSize(options.size);

    // Create PDF document with optimized settings
    const doc = new PDFDocument({
      size: pageSize.size,
      margin: options.margin ?? pageSize.margin,
      bufferPages: true,
      compress: options.compress ?? true,
      info: {
        Title: this.getDocumentTitle(data),
        Author: data.businessInfo.name,
        Creator: 'RPOS PDF Engine v1.0',
        Producer: 'PDFKit',
        CreationDate: data.generatedAt,
      },
    });

    // Collect buffer chunks using streaming
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Generate content using template
    await template.generate(doc, data);

    // Finalize document
    doc.end();

    // Return complete buffer when generation completes
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on('error', (error: Error) => {
        reject(new Error(`PDF generation failed: ${error.message}`));
      });
    });
  }

  /**
   * Generate PDF and stream directly to response
   * More memory efficient for large documents
   */
  async streamPdf<T extends BaseDocumentData>(
    data: T,
    outputStream: NodeJS.WritableStream,
    options: PdfGenerationOptions = {}
  ): Promise<void> {
    const template = this.templates.get(data.documentType);
    if (!template) {
      throw new Error(`No template registered for document type: ${data.documentType}`);
    }

    const pageSize = this.getPageSize(options.size);

    const doc = new PDFDocument({
      size: pageSize.size,
      margin: options.margin ?? pageSize.margin,
      bufferPages: true,
      compress: options.compress ?? true,
      info: {
        Title: this.getDocumentTitle(data),
        Author: data.businessInfo.name,
        Creator: 'RPOS PDF Engine v1.0',
        Producer: 'PDFKit',
        CreationDate: data.generatedAt,
      },
    });

    // Pipe to output stream
    doc.pipe(outputStream);

    // Generate content
    await template.generate(doc, data);

    // Finalize
    doc.end();

    return new Promise((resolve, reject) => {
      outputStream.on('finish', () => resolve());
      outputStream.on('error', reject);
    });
  }

  /**
   * Get page size configuration
   */
  private getPageSize(size?: 'A4' | 'LETTER' | 'RECEIPT'): { size: string | [number, number]; margin: number } {
    switch (size) {
      case 'RECEIPT':
        // 80mm thermal receipt paper
        return { size: [226, 1000], margin: 10 }; // Width in points, tall for variable content
      case 'LETTER':
        return { size: 'LETTER', margin: 50 };
      case 'A4':
      default:
        return { size: 'A4', margin: 50 };
    }
  }

  /**
   * Generate document title based on type and data
   */
  private getDocumentTitle(data: BaseDocumentData): string {
    const timestamp = data.generatedAt.toISOString().split('T')[0];

    switch (data.documentType) {
      case DocumentType.RECEIPT:
        return `Receipt - ${timestamp}`;
      case DocumentType.INVOICE:
        return `Invoice - ${timestamp}`;
      case DocumentType.DAILY_SUMMARY:
        return `Daily Summary - ${timestamp}`;
      case DocumentType.INVENTORY_REPORT:
        return `Inventory Report - ${timestamp}`;
      case DocumentType.SALES_REPORT:
        return `Sales Report - ${timestamp}`;
      default:
        return `Document - ${timestamp}`;
    }
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format currency value
 */
export function formatCurrency(
  value: number,
  options: CurrencyFormatOptions
): string {
  const { currency, locale, minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch {
    // Fallback for unsupported locales/currencies
    return `${getCurrencySymbol(currency)}${value.toFixed(2)}`;
  }
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    MXN: 'MX$',
    BRL: 'R$',
    KRW: '₩',
    RUB: '₽',
  };

  return symbols[currency.toUpperCase()] || currency + ' ';
}

/**
 * Format date for documents
 */
export function formatDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format time for documents
 */
export function formatTime(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * Format date and time for documents
 */
export function formatDateTime(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Export singleton instance for convenience
export const pdfService = new PdfService();
