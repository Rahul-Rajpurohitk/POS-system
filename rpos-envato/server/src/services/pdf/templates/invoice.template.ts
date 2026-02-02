import type PDFKit from 'pdfkit';
import {
  PdfTemplate,
  DocumentType,
  InvoiceDocumentData,
  OrderItemData,
} from '../types';
import { formatCurrency, formatDate } from '../pdf.service';

/**
 * Invoice Template
 *
 * Professional invoice format with:
 * - Business branding header
 * - Bill To / Ship To sections
 * - Detailed line items table
 * - Totals breakdown
 * - Payment terms and notes
 * - Due date highlighting
 */
export class InvoiceTemplate implements PdfTemplate<InvoiceDocumentData> {
  documentType = DocumentType.INVOICE;

  async generate(doc: PDFKit.PDFDocument, data: InvoiceDocumentData): Promise<void> {
    const { businessInfo, order, customer, invoiceNumber } = data;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftMargin = doc.page.margins.left;

    const currencyOpts = {
      currency: businessInfo.currency,
      locale: businessInfo.locale,
    };

    // ============ HEADER ============
    this.renderHeader(doc, businessInfo, invoiceNumber, data, leftMargin, pageWidth);

    doc.moveDown(2);

    // ============ ADDRESSES ============
    this.renderAddresses(doc, businessInfo, customer, leftMargin, pageWidth);

    doc.moveDown(1.5);

    // ============ ITEMS TABLE ============
    this.renderItemsTable(doc, order.items, leftMargin, pageWidth, currencyOpts);

    doc.moveDown(1);

    // ============ TOTALS ============
    this.renderTotals(doc, order, leftMargin, pageWidth, currencyOpts);

    doc.moveDown(2);

    // ============ PAYMENT STATUS ============
    if (data.isPaid) {
      this.renderPaidStamp(doc, leftMargin, pageWidth);
      doc.moveDown(1);
    }

    // ============ TERMS & NOTES ============
    this.renderTermsAndNotes(doc, data.terms, data.notes, leftMargin, pageWidth);

    // ============ FOOTER ============
    this.renderFooter(doc, businessInfo.taxId, pageWidth);
  }

  /**
   * Render invoice header
   */
  private renderHeader(
    doc: PDFKit.PDFDocument,
    businessInfo: InvoiceDocumentData['businessInfo'],
    invoiceNumber: string,
    data: InvoiceDocumentData,
    leftMargin: number,
    pageWidth: number
  ): void {
    const startY = doc.y;

    // Left side - Business name
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(businessInfo.name, leftMargin, startY, { width: pageWidth * 0.6 });

    // Right side - INVOICE title and details
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text('INVOICE', leftMargin + pageWidth * 0.5, startY, {
         width: pageWidth * 0.5,
         align: 'right',
       });

    doc.moveDown(0.5);

    // Invoice details on the right
    const detailsY = doc.y;
    const rightX = leftMargin + pageWidth * 0.6;

    doc.fontSize(10).font('Helvetica');

    // Invoice number
    doc.fillColor('#666666').text('Invoice Number:', rightX, detailsY, { width: 100 });
    doc.fillColor('#000000').text(invoiceNumber, rightX + 100, detailsY, {
      width: pageWidth * 0.4 - 100,
      align: 'right',
    });

    // Invoice date
    const dateY = detailsY + 15;
    doc.fillColor('#666666').text('Invoice Date:', rightX, dateY, { width: 100 });
    doc.fillColor('#000000').text(formatDate(data.order.createdAt, businessInfo.locale), rightX + 100, dateY, {
      width: pageWidth * 0.4 - 100,
      align: 'right',
    });

    // Due date
    if (data.dueDate) {
      const dueY = dateY + 15;
      const isOverdue = new Date() > data.dueDate && !data.isPaid;
      doc.fillColor('#666666').text('Due Date:', rightX, dueY, { width: 100 });
      doc.fillColor(isOverdue ? '#dc2626' : '#000000')
         .font(isOverdue ? 'Helvetica-Bold' : 'Helvetica')
         .text(formatDate(data.dueDate, businessInfo.locale), rightX + 100, dueY, {
           width: pageWidth * 0.4 - 100,
           align: 'right',
         });
      doc.font('Helvetica');
    }

    // Move doc.y to below the header
    doc.y = Math.max(doc.y, detailsY + 50);
  }

  /**
   * Render From/To addresses
   */
  private renderAddresses(
    doc: PDFKit.PDFDocument,
    businessInfo: InvoiceDocumentData['businessInfo'],
    customer: InvoiceDocumentData['customer'],
    leftMargin: number,
    pageWidth: number
  ): void {
    const colWidth = (pageWidth - 40) / 2;
    const startY = doc.y;

    // FROM section
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#666666')
       .text('FROM:', leftMargin, startY);

    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#000000');
    doc.text(businessInfo.name);

    if (businessInfo.address) {
      doc.text(businessInfo.address);
    }
    if (businessInfo.phone) {
      doc.text(`Tel: ${businessInfo.phone}`);
    }
    if (businessInfo.email) {
      doc.text(businessInfo.email);
    }

    // BILL TO section
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#666666')
       .text('BILL TO:', leftMargin + colWidth + 40, startY);

    let billToY = startY + 15;
    doc.font('Helvetica').fillColor('#000000');
    doc.text(customer.name, leftMargin + colWidth + 40, billToY);

    if (customer.address) {
      billToY += 12;
      doc.text(customer.address, leftMargin + colWidth + 40, billToY);
    }
    if (customer.phone) {
      billToY += 12;
      doc.text(`Tel: ${customer.phone}`, leftMargin + colWidth + 40, billToY);
    }
    if (customer.email) {
      billToY += 12;
      doc.text(customer.email, leftMargin + colWidth + 40, billToY);
    }

    // Ensure doc.y is below both columns
    doc.y = Math.max(doc.y, billToY + 15);
  }

  /**
   * Render items table
   */
  private renderItemsTable(
    doc: PDFKit.PDFDocument,
    items: OrderItemData[],
    leftMargin: number,
    pageWidth: number,
    currencyOpts: { currency: string; locale: string }
  ): void {
    // Table header background
    const headerHeight = 25;
    doc.rect(leftMargin, doc.y, pageWidth, headerHeight)
       .fillColor('#f3f4f6')
       .fill();

    // Column configuration
    const cols = {
      item: { x: leftMargin + 10, width: pageWidth * 0.45 },
      qty: { x: leftMargin + pageWidth * 0.48, width: 50 },
      price: { x: leftMargin + pageWidth * 0.58, width: 80 },
      total: { x: leftMargin + pageWidth * 0.78, width: pageWidth * 0.2 },
    };

    const headerY = doc.y + 7;

    // Header text
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#374151');

    doc.text('Description', cols.item.x, headerY, { width: cols.item.width });
    doc.text('Qty', cols.qty.x, headerY, { width: cols.qty.width, align: 'center' });
    doc.text('Unit Price', cols.price.x, headerY, { width: cols.price.width, align: 'right' });
    doc.text('Amount', cols.total.x, headerY, { width: cols.total.width - 10, align: 'right' });

    doc.y += headerHeight;

    // Draw line under header
    this.drawLine(doc, leftMargin, pageWidth, '#d1d5db');
    doc.moveDown(0.3);

    // Item rows
    doc.font('Helvetica').fillColor('#000000');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowY = doc.y;

      // Alternate row background
      if (i % 2 === 1) {
        doc.rect(leftMargin, rowY - 2, pageWidth, 18)
           .fillColor('#fafafa')
           .fill();
        doc.fillColor('#000000');
      }

      // Item description
      let description = item.name;
      if (item.sku) {
        description += ` (${item.sku})`;
      }
      doc.fontSize(10).text(description, cols.item.x, rowY, { width: cols.item.width });

      // Quantity
      doc.text(item.quantity.toString(), cols.qty.x, rowY, {
        width: cols.qty.width,
        align: 'center',
      });

      // Unit price
      doc.text(formatCurrency(item.unitPrice, currencyOpts), cols.price.x, rowY, {
        width: cols.price.width,
        align: 'right',
      });

      // Line total
      doc.text(formatCurrency(item.total, currencyOpts), cols.total.x, rowY, {
        width: cols.total.width - 10,
        align: 'right',
      });

      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        doc.fontSize(8).fillColor('#6b7280');
        for (const mod of item.modifiers) {
          doc.y += 2;
          doc.text(`  + ${mod}`, cols.item.x);
        }
        doc.fillColor('#000000');
      }

      doc.moveDown(0.5);
    }

    // Bottom line
    this.drawLine(doc, leftMargin, pageWidth, '#d1d5db');
  }

  /**
   * Render totals section
   */
  private renderTotals(
    doc: PDFKit.PDFDocument,
    order: InvoiceDocumentData['order'],
    leftMargin: number,
    pageWidth: number,
    currencyOpts: { currency: string; locale: string }
  ): void {
    const totalsWidth = 200;
    const totalsX = leftMargin + pageWidth - totalsWidth;
    const labelX = totalsX;
    const valueX = totalsX + 120;

    doc.fontSize(10).font('Helvetica');

    // Subtotal
    this.renderTotalRow(doc, 'Subtotal', order.subtotal, labelX, valueX, currencyOpts);

    // Discount
    if (order.discount > 0) {
      this.renderTotalRow(doc, 'Discount', -order.discount, labelX, valueX, currencyOpts, '#059669');
    }

    // Tax
    const taxLabel = order.taxRate > 0 ? `Tax (${(order.taxRate * 100).toFixed(2)}%)` : 'Tax';
    this.renderTotalRow(doc, taxLabel, order.tax, labelX, valueX, currencyOpts);

    // Tip if applicable
    if (order.tip && order.tip > 0) {
      this.renderTotalRow(doc, 'Tip', order.tip, labelX, valueX, currencyOpts);
    }

    doc.moveDown(0.5);

    // Total box
    const totalY = doc.y;
    doc.rect(totalsX - 5, totalY - 3, totalsWidth + 10, 25)
       .fillColor('#1f2937')
       .fill();

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('TOTAL', labelX, totalY + 3, { width: 100 });

    doc.text(formatCurrency(order.total, currencyOpts), valueX, totalY + 3, {
      width: 75,
      align: 'right',
    });

    doc.fillColor('#000000');
    doc.y = totalY + 30;
  }

  /**
   * Render a single total row
   */
  private renderTotalRow(
    doc: PDFKit.PDFDocument,
    label: string,
    value: number,
    labelX: number,
    valueX: number,
    currencyOpts: { currency: string; locale: string },
    color: string = '#000000'
  ): void {
    const y = doc.y;
    doc.fillColor('#6b7280').text(label, labelX, y, { width: 100 });
    doc.fillColor(color).text(formatCurrency(value, currencyOpts), valueX, y, {
      width: 75,
      align: 'right',
    });
    doc.fillColor('#000000');
    doc.moveDown(0.3);
  }

  /**
   * Render PAID stamp
   */
  private renderPaidStamp(
    doc: PDFKit.PDFDocument,
    leftMargin: number,
    pageWidth: number
  ): void {
    const stampWidth = 120;
    const stampHeight = 35;
    const stampX = leftMargin + (pageWidth - stampWidth) / 2;
    const stampY = doc.y;

    // Stamp border
    doc.rect(stampX, stampY, stampWidth, stampHeight)
       .strokeColor('#059669')
       .lineWidth(3)
       .stroke();

    // PAID text
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#059669')
       .text('PAID', stampX, stampY + 5, {
         width: stampWidth,
         align: 'center',
       });

    doc.y = stampY + stampHeight + 10;
  }

  /**
   * Render terms and notes
   */
  private renderTermsAndNotes(
    doc: PDFKit.PDFDocument,
    terms: string | undefined,
    notes: string | undefined,
    leftMargin: number,
    pageWidth: number
  ): void {
    if (terms) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text('Payment Terms:', leftMargin);

      doc.moveDown(0.2);
      doc.font('Helvetica')
         .fillColor('#000000')
         .text(terms, leftMargin, doc.y, { width: pageWidth });

      doc.moveDown(1);
    }

    if (notes) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text('Notes:', leftMargin);

      doc.moveDown(0.2);
      doc.font('Helvetica')
         .fillColor('#6b7280')
         .text(notes, leftMargin, doc.y, { width: pageWidth });

      doc.moveDown(1);
    }
  }

  /**
   * Render footer
   */
  private renderFooter(
    doc: PDFKit.PDFDocument,
    taxId: string | undefined,
    pageWidth: number
  ): void {
    doc.moveDown(2);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#9ca3af')
       .text('Thank you for your business!', { align: 'center' });

    if (taxId) {
      doc.moveDown(0.3);
      doc.text(`Tax ID: ${taxId}`, { align: 'center' });
    }

    doc.moveDown(0.5);
    doc.fontSize(7).text('Generated by RPOS', { align: 'center' });
  }

  /**
   * Draw a horizontal line
   */
  private drawLine(
    doc: PDFKit.PDFDocument,
    x: number,
    width: number,
    color: string = '#cccccc'
  ): void {
    const y = doc.y;
    doc.strokeColor(color)
       .lineWidth(0.5)
       .moveTo(x, y)
       .lineTo(x + width, y)
       .stroke();
  }
}
