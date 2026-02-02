import type PDFKit from 'pdfkit';
import {
  PdfTemplate,
  DocumentType,
  ReceiptDocumentData,
  OrderItemData,
} from '../types';
import { formatCurrency, formatDateTime, getCurrencySymbol } from '../pdf.service';

/**
 * Receipt Template
 *
 * Professional A4 receipt format with:
 * - Business header with contact info
 * - Order details with line items
 * - Itemized totals (subtotal, discount, tax, tip, total)
 * - Payment information
 * - Thank you footer
 */
export class ReceiptTemplate implements PdfTemplate<ReceiptDocumentData> {
  documentType = DocumentType.RECEIPT;

  async generate(doc: PDFKit.PDFDocument, data: ReceiptDocumentData): Promise<void> {
    const { businessInfo, order, payment, customer, cashier } = data;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftMargin = doc.page.margins.left;

    const currencyOpts = {
      currency: businessInfo.currency,
      locale: businessInfo.locale,
    };

    // ============ HEADER ============
    this.renderHeader(doc, businessInfo, pageWidth);

    doc.moveDown(1.5);

    // ============ ORDER INFO ============
    this.renderOrderInfo(doc, order, customer, cashier, leftMargin, pageWidth, businessInfo.locale);

    doc.moveDown(1);
    this.drawLine(doc, leftMargin, pageWidth, '#cccccc');
    doc.moveDown(1);

    // ============ ITEMS TABLE ============
    this.renderItemsTable(doc, order.items, leftMargin, pageWidth, currencyOpts);

    doc.moveDown(0.5);
    this.drawLine(doc, leftMargin, pageWidth, '#cccccc');
    doc.moveDown(1);

    // ============ TOTALS ============
    this.renderTotals(doc, order, leftMargin, pageWidth, currencyOpts);

    doc.moveDown(0.5);
    this.drawLine(doc, leftMargin, pageWidth, '#000000', 1);
    doc.moveDown(1);

    // ============ PAYMENT INFO ============
    this.renderPaymentInfo(doc, payment, leftMargin, pageWidth, currencyOpts);

    doc.moveDown(2);

    // ============ FOOTER ============
    this.renderFooter(doc, data.footerMessage, businessInfo.taxId, pageWidth);
  }

  /**
   * Render business header
   */
  private renderHeader(
    doc: PDFKit.PDFDocument,
    businessInfo: ReceiptDocumentData['businessInfo'],
    pageWidth: number
  ): void {
    // Business name - large and centered
    doc.fontSize(22)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(businessInfo.name, { align: 'center' });

    doc.moveDown(0.3);

    // Contact info - smaller, centered
    doc.fontSize(10).font('Helvetica').fillColor('#666666');

    if (businessInfo.address) {
      doc.text(businessInfo.address, { align: 'center' });
    }

    const contactParts: string[] = [];
    if (businessInfo.phone) contactParts.push(`Tel: ${businessInfo.phone}`);
    if (businessInfo.email) contactParts.push(businessInfo.email);

    if (contactParts.length > 0) {
      doc.text(contactParts.join('  |  '), { align: 'center' });
    }

    doc.fillColor('#000000');
  }

  /**
   * Render order information section
   */
  private renderOrderInfo(
    doc: PDFKit.PDFDocument,
    order: ReceiptDocumentData['order'],
    customer: ReceiptDocumentData['customer'],
    cashier: ReceiptDocumentData['cashier'],
    leftMargin: number,
    pageWidth: number,
    locale: string
  ): void {
    // Receipt title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('RECEIPT', { align: 'center' });

    doc.moveDown(0.5);

    // Order number and date
    doc.fontSize(11).font('Helvetica');

    const dateStr = formatDateTime(order.createdAt, locale);

    // Two-column layout for order info
    const col1Width = pageWidth * 0.5;
    const startY = doc.y;

    // Left column
    doc.text(`Order #${order.orderNumber}`, leftMargin, startY, { width: col1Width });
    if (cashier?.name) {
      doc.text(`Cashier: ${cashier.name}`, leftMargin, doc.y, { width: col1Width });
    }

    // Right column
    doc.text(dateStr, leftMargin + col1Width, startY, { width: col1Width, align: 'right' });

    // Customer info if present
    if (customer?.name) {
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666');
      doc.text(`Customer: ${customer.name}`, { align: 'left' });
      if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, { align: 'left' });
      }
      doc.fillColor('#000000');
    }
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
    // Column widths
    const colWidths = {
      qty: 35,
      item: pageWidth - 130,
      price: 45,
      total: 50,
    };

    // Header row
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#444444');

    const headerY = doc.y;
    doc.text('Qty', leftMargin, headerY, { width: colWidths.qty });
    doc.text('Item', leftMargin + colWidths.qty, headerY, { width: colWidths.item });
    doc.text('Price', leftMargin + colWidths.qty + colWidths.item, headerY, {
      width: colWidths.price,
      align: 'right',
    });
    doc.text('Total', leftMargin + colWidths.qty + colWidths.item + colWidths.price, headerY, {
      width: colWidths.total,
      align: 'right',
    });

    doc.moveDown(0.3);
    this.drawLine(doc, leftMargin, pageWidth, '#dddddd');
    doc.moveDown(0.3);

    // Item rows
    doc.font('Helvetica').fillColor('#000000');

    for (const item of items) {
      const itemY = doc.y;

      // Quantity
      doc.fontSize(10).text(item.quantity.toString(), leftMargin, itemY, { width: colWidths.qty });

      // Item name (with SKU if present)
      let itemName = item.name;
      doc.text(itemName, leftMargin + colWidths.qty, itemY, { width: colWidths.item });

      // Unit price
      doc.text(
        formatCurrency(item.unitPrice, currencyOpts),
        leftMargin + colWidths.qty + colWidths.item,
        itemY,
        { width: colWidths.price, align: 'right' }
      );

      // Line total
      doc.text(
        formatCurrency(item.total, currencyOpts),
        leftMargin + colWidths.qty + colWidths.item + colWidths.price,
        itemY,
        { width: colWidths.total, align: 'right' }
      );

      // Modifiers (if any)
      if (item.modifiers && item.modifiers.length > 0) {
        doc.fontSize(8).fillColor('#666666');
        for (const modifier of item.modifiers) {
          doc.text(`  + ${modifier}`, leftMargin + colWidths.qty);
        }
        doc.fillColor('#000000').fontSize(10);
      }

      // Notes (if any)
      if (item.notes) {
        doc.fontSize(8).fillColor('#888888');
        doc.text(`  Note: ${item.notes}`, leftMargin + colWidths.qty);
        doc.fillColor('#000000').fontSize(10);
      }

      // Item-level discount
      if (item.discount && item.discount > 0) {
        doc.fontSize(8).fillColor('#059669');
        doc.text(
          `  Discount: -${formatCurrency(item.discount, currencyOpts)}`,
          leftMargin + colWidths.qty
        );
        doc.fillColor('#000000').fontSize(10);
      }

      doc.moveDown(0.3);
    }
  }

  /**
   * Render totals section
   */
  private renderTotals(
    doc: PDFKit.PDFDocument,
    order: ReceiptDocumentData['order'],
    leftMargin: number,
    pageWidth: number,
    currencyOpts: { currency: string; locale: string }
  ): void {
    const totalsX = leftMargin + pageWidth - 180;
    const valueX = leftMargin + pageWidth - 80;

    doc.fontSize(10).font('Helvetica');

    // Subtotal
    this.renderTotalLine(doc, 'Subtotal:', order.subtotal, totalsX, valueX, currencyOpts);

    // Discount
    if (order.discount > 0) {
      this.renderTotalLine(doc, 'Discount:', -order.discount, totalsX, valueX, currencyOpts, '#059669');
    }

    // Tax
    const taxLabel = order.taxRate > 0 ? `Tax (${(order.taxRate * 100).toFixed(2)}%):` : 'Tax:';
    this.renderTotalLine(doc, taxLabel, order.tax, totalsX, valueX, currencyOpts);

    // Tip
    if (order.tip && order.tip > 0) {
      this.renderTotalLine(doc, 'Tip:', order.tip, totalsX, valueX, currencyOpts);
    }

    doc.moveDown(0.5);

    // Grand total
    doc.fontSize(14).font('Helvetica-Bold');
    const totalY = doc.y;
    doc.text('TOTAL:', totalsX, totalY, { width: 100 });
    doc.text(formatCurrency(order.total, currencyOpts), valueX, totalY, {
      width: 80,
      align: 'right',
    });
  }

  /**
   * Render a single total line
   */
  private renderTotalLine(
    doc: PDFKit.PDFDocument,
    label: string,
    value: number,
    labelX: number,
    valueX: number,
    currencyOpts: { currency: string; locale: string },
    color: string = '#000000'
  ): void {
    const y = doc.y;
    doc.fillColor('#000000').text(label, labelX, y, { width: 100 });
    doc.fillColor(color).text(formatCurrency(value, currencyOpts), valueX, y, {
      width: 80,
      align: 'right',
    });
    doc.fillColor('#000000');
    doc.moveDown(0.3);
  }

  /**
   * Render payment information
   */
  private renderPaymentInfo(
    doc: PDFKit.PDFDocument,
    payment: ReceiptDocumentData['payment'],
    leftMargin: number,
    pageWidth: number,
    currencyOpts: { currency: string; locale: string }
  ): void {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Payment Details', leftMargin);

    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    // Payment method
    doc.text(`Method: ${payment.methodDisplay || payment.method}`);

    // Card info if applicable
    if (payment.cardLastFour) {
      const cardInfo = payment.cardBrand
        ? `${payment.cardBrand} ****${payment.cardLastFour}`
        : `****${payment.cardLastFour}`;
      doc.text(`Card: ${cardInfo}`);
    }

    // Amount paid
    doc.text(`Amount Paid: ${formatCurrency(payment.amountPaid, currencyOpts)}`);

    // Change
    if (payment.change > 0) {
      doc.font('Helvetica-Bold');
      doc.text(`Change Due: ${formatCurrency(payment.change, currencyOpts)}`);
      doc.font('Helvetica');
    }

    // Transaction ID
    if (payment.transactionId) {
      doc.fontSize(8).fillColor('#666666');
      doc.text(`Transaction ID: ${payment.transactionId}`);
      doc.fillColor('#000000');
    }
  }

  /**
   * Render footer
   */
  private renderFooter(
    doc: PDFKit.PDFDocument,
    footerMessage: string | undefined,
    taxId: string | undefined,
    pageWidth: number
  ): void {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Thank you for your business!', { align: 'center' });

    if (footerMessage) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text(footerMessage, { align: 'center' });
    }

    if (taxId) {
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#888888');
      doc.text(`Tax ID: ${taxId}`, { align: 'center' });
    }

    // Add generation timestamp
    doc.moveDown(1);
    doc.fontSize(7).fillColor('#aaaaaa');
    doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.text('Powered by RPOS', { align: 'center' });
  }

  /**
   * Draw a horizontal line
   */
  private drawLine(
    doc: PDFKit.PDFDocument,
    x: number,
    width: number,
    color: string = '#cccccc',
    lineWidth: number = 0.5
  ): void {
    const y = doc.y;
    doc.strokeColor(color)
       .lineWidth(lineWidth)
       .moveTo(x, y)
       .lineTo(x + width, y)
       .stroke();
  }
}
