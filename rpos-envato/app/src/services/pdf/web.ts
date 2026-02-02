/**
 * Web PDF Service
 *
 * Handles PDF downloads in web browsers using blob URLs
 * and automatic download triggering.
 */

import { Platform } from 'react-native';
import { useAuthStore } from '@/store';
import type { IPdfService, PdfDownloadResult, ReceiptPdfData } from './types';

// API Base URL - matches the api client configuration
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

class WebPdfService implements IPdfService {
  isAvailable(): boolean {
    return Platform.OS === 'web' && typeof window !== 'undefined';
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async downloadReceipt(orderId: string): Promise<PdfDownloadResult> {
    return this.downloadFile(
      `/pdf/orders/${orderId}/receipt.pdf`,
      `receipt-${orderId}.pdf`
    );
  }

  async downloadInvoice(orderId: string): Promise<PdfDownloadResult> {
    return this.downloadFile(
      `/pdf/orders/${orderId}/invoice.pdf`,
      `invoice-${orderId}.pdf`
    );
  }

  async downloadReport(
    reportType: string,
    params?: Record<string, string>
  ): Promise<PdfDownloadResult> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    return this.downloadFile(`/pdf/reports/${reportType}${queryString}`, filename);
  }

  /**
   * Download a PDF file from the server
   *
   * Uses fetch to get the PDF as a blob, then creates a temporary
   * download link to trigger the browser's download behavior.
   */
  private async downloadFile(
    endpoint: string,
    filename: string
  ): Promise<PdfDownloadResult> {
    try {
      const token = useAuthStore.getState().token;

      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // Fetch PDF as blob
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
      });

      if (!response.ok) {
        // Try to extract error message from response
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Get the blob from response
      const blob = await response.blob();

      // Verify content type
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.includes('application/pdf')) {
        return {
          success: false,
          error: 'Server did not return a PDF file',
        };
      }

      // Create blob URL
      const blobUrl = window.URL.createObjectURL(blob);

      // Create and trigger download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      return {
        success: true,
        filePath: blobUrl,
      };
    } catch (error) {
      console.error('PDF download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Generate a receipt PDF locally from order data
   * Creates an HTML receipt and opens print dialog for saving as PDF
   */
  async generateReceipt(data: ReceiptPdfData, filename?: string): Promise<PdfDownloadResult> {
    try {
      const receiptHtml = this.generateReceiptHtml(data);
      const printWindow = window.open('', '_blank', 'width=400,height=700');

      if (!printWindow) {
        return {
          success: false,
          error: 'Failed to open print window. Please allow popups.',
        };
      }

      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();

      // Trigger print dialog which allows saving as PDF
      setTimeout(() => {
        printWindow.print();
      }, 500);

      return {
        success: true,
        filePath: filename || `receipt-${data.orderNumber}.pdf`,
      };
    } catch (error) {
      console.error('Receipt generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate receipt',
      };
    }
  }

  /**
   * Generate professional receipt HTML
   */
  private generateReceiptHtml(data: ReceiptPdfData): string {
    const itemsHtml = data.items
      .map(
        item => `
          <tr>
            <td class="item-name">
              ${item.name}
              ${item.modifiers?.length ? `<br><span class="modifiers">${item.modifiers.join(', ')}</span>` : ''}
            </td>
            <td class="qty">${item.quantity}</td>
            <td class="price">$${item.price.toFixed(2)}</td>
            <td class="total">$${item.total.toFixed(2)}</td>
          </tr>
        `
      )
      .join('');

    const date = new Date(data.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt - ${data.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12px;
              width: 320px;
              margin: 0 auto;
              padding: 20px;
              background: white;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .header h1 {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #111;
            }
            .header p {
              font-size: 11px;
              color: #666;
              line-height: 1.5;
            }
            .divider {
              border-top: 1px dashed #ccc;
              margin: 12px 0;
            }
            .divider-double {
              border-top: 2px solid #333;
              margin: 15px 0;
            }
            .order-info {
              background: #f8f8f8;
              padding: 10px;
              border-radius: 4px;
              margin-bottom: 15px;
            }
            .order-info .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .order-info .row:last-child { margin-bottom: 0; }
            .order-info .label { color: #666; }
            .order-info .value { font-weight: 600; }
            .order-number {
              font-size: 14px;
              font-weight: bold;
              color: #2563eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            thead th {
              text-align: left;
              font-size: 10px;
              color: #666;
              font-weight: 600;
              text-transform: uppercase;
              padding: 8px 4px;
              border-bottom: 1px solid #ddd;
            }
            thead th.qty, thead th.price, thead th.total { text-align: right; }
            tbody td {
              padding: 8px 4px;
              vertical-align: top;
              border-bottom: 1px solid #eee;
            }
            .item-name { font-weight: 500; }
            .modifiers { font-size: 10px; color: #888; font-style: italic; }
            .qty, .price, .total { text-align: right; }
            .totals {
              background: #f8f8f8;
              padding: 12px;
              border-radius: 4px;
            }
            .totals .row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }
            .totals .row.discount { color: #059669; }
            .totals .row.grand-total {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid #333;
              margin-top: 8px;
              padding-top: 10px;
            }
            .payment-info {
              margin-top: 15px;
              padding: 10px;
              background: #e0f2fe;
              border-radius: 4px;
            }
            .payment-info .row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
            }
            .payment-info .method { font-weight: 600; color: #0369a1; }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px dashed #ccc;
            }
            .footer .thank-you {
              font-size: 14px;
              font-weight: 600;
              color: #111;
              margin-bottom: 8px;
            }
            .footer .message {
              font-size: 10px;
              color: #666;
              line-height: 1.5;
            }
            .footer .tax-id {
              font-size: 9px;
              color: #999;
              margin-top: 10px;
            }
            @media print {
              body { width: 100%; padding: 10px; }
              @page { margin: 10mm; size: 80mm auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.businessName}</h1>
            ${data.businessAddress ? `<p>${data.businessAddress}</p>` : ''}
            ${data.businessPhone ? `<p>Tel: ${data.businessPhone}</p>` : ''}
            ${data.businessEmail ? `<p>${data.businessEmail}</p>` : ''}
          </div>

          <div class="order-info">
            <div class="row">
              <span class="label">Order:</span>
              <span class="value order-number">${data.orderNumber}</span>
            </div>
            <div class="row">
              <span class="label">Date:</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="row">
              <span class="label">Time:</span>
              <span class="value">${formattedTime}</span>
            </div>
            ${data.customerName ? `
              <div class="row">
                <span class="label">Customer:</span>
                <span class="value">${data.customerName}</span>
              </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="price">Price</th>
                <th class="total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${data.subTotal.toFixed(2)}</span>
            </div>
            ${data.discount > 0 ? `
              <div class="row discount">
                <span>Discount:</span>
                <span>-$${data.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${data.tax > 0 ? `
              <div class="row">
                <span>Tax:</span>
                <span>$${data.tax.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="row grand-total">
              <span>TOTAL:</span>
              <span>$${data.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="payment-info">
            <div class="row">
              <span>Payment Method:</span>
              <span class="method">${data.paymentMethod}</span>
            </div>
            ${data.amountPaid ? `
              <div class="row">
                <span>Amount Paid:</span>
                <span>$${data.amountPaid.toFixed(2)}</span>
              </div>
            ` : ''}
            ${data.change && data.change > 0 ? `
              <div class="row">
                <span>Change:</span>
                <span>$${data.change.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="thank-you">Thank You For Your Purchase!</div>
            ${data.footer ? `<div class="message">${data.footer}</div>` : ''}
            ${data.taxId ? `<div class="tax-id">Tax ID: ${data.taxId}</div>` : ''}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Open PDF in a new browser tab (alternative to download)
   */
  async openInNewTab(endpoint: string): Promise<PdfDownloadResult> {
    try {
      const token = useAuthStore.getState().token;

      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // For opening in new tab, we can't easily add auth headers
      // So we use the download method and open the blob URL
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error ${response.status}`,
        };
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Open in new tab
      window.open(blobUrl, '_blank');

      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000); // Keep URL valid for 1 minute

      return {
        success: true,
        filePath: blobUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open PDF',
      };
    }
  }
}

export const pdfService = new WebPdfService();
