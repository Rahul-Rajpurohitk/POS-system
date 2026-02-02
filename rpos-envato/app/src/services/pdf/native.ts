/**
 * Native PDF Service
 *
 * Handles PDF downloads on native platforms (iOS/Android)
 * using expo-file-system for downloading and expo-sharing
 * for presenting the native share dialog.
 */

import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform, Alert } from 'react-native';
import { useAuthStore } from '@/store';
import type { IPdfService, PdfDownloadResult, ReceiptPdfData } from './types';

// API Base URL - matches the api client configuration
const API_BASE_URL = __DEV__
  ? Platform.select({
      ios: 'http://localhost:3000/api',
      android: 'http://10.0.2.2:3000/api',
      default: 'http://localhost:3000/api',
    })
  : 'https://your-production-api.com/api';

class NativePdfService implements IPdfService {
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  getBaseUrl(): string {
    return API_BASE_URL || '';
  }

  async downloadReceipt(orderId: string): Promise<PdfDownloadResult> {
    return this.downloadAndShare(
      `/pdf/orders/${orderId}/receipt.pdf`,
      `receipt-${orderId}.pdf`
    );
  }

  async downloadInvoice(orderId: string): Promise<PdfDownloadResult> {
    return this.downloadAndShare(
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
    return this.downloadAndShare(`/pdf/reports/${reportType}${queryString}`, filename);
  }

  /**
   * Download PDF to cache directory and open share dialog
   */
  private async downloadAndShare(
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

      // Ensure cache directory exists
      const cacheDir = Paths.cache.uri;
      if (!cacheDir) {
        return {
          success: false,
          error: 'Cache directory not available',
        };
      }

      // Create file path in cache directory
      const fileUri = `${cacheDir}${filename}`;

      // Download PDF to cache
      const downloadResult = await FileSystemLegacy.downloadAsync(
        `${API_BASE_URL}${endpoint}`,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
        }
      );

      // Check download result
      if (downloadResult.status !== 200) {
        // Try to read error message from file if it exists
        let errorMessage = `Download failed with status ${downloadResult.status}`;
        try {
          const errorContent = await FileSystemLegacy.readAsStringAsync(fileUri);
          const errorData = JSON.parse(errorContent);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Could not read error, use default message
        }

        // Clean up failed download
        try {
          await FileSystemLegacy.deleteAsync(fileUri, { idempotent: true });
        } catch {
          // Ignore cleanup errors
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      // Verify the file exists and has content
      const fileInfo = await FileSystemLegacy.getInfoAsync(fileUri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size === 0)) {
        return {
          success: false,
          error: 'Downloaded file is empty',
        };
      }

      // Check if sharing is available
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        // Sharing not available, but file was downloaded
        return {
          success: true,
          filePath: fileUri,
          error: 'Sharing is not available on this device. File saved to: ' + fileUri,
        };
      }

      // Open native share dialog
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${filename}`,
        UTI: 'com.adobe.pdf', // iOS-specific
      });

      return {
        success: true,
        filePath: downloadResult.uri,
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
   * Download PDF and save to a specific location (optional enhancement)
   */
  async downloadToPath(
    endpoint: string,
    destinationPath: string
  ): Promise<PdfDownloadResult> {
    try {
      const token = useAuthStore.getState().token;

      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const downloadResult = await FileSystemLegacy.downloadAsync(
        `${API_BASE_URL}${endpoint}`,
        destinationPath,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
        }
      );

      if (downloadResult.status !== 200) {
        return {
          success: false,
          error: `Download failed with status ${downloadResult.status}`,
        };
      }

      return {
        success: true,
        filePath: downloadResult.uri,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Clean up cached PDF files
   */
  async cleanupCache(): Promise<void> {
    try {
      const cacheDir = Paths.cache.uri;
      if (!cacheDir) return;

      const cacheContent = await FileSystemLegacy.readDirectoryAsync(cacheDir);
      const pdfFiles = cacheContent.filter((file) => file.endsWith('.pdf'));

      for (const file of pdfFiles) {
        await FileSystemLegacy.deleteAsync(`${cacheDir}${file}`, { idempotent: true });
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Generate a receipt PDF locally from order data
   * Uses expo-print to create PDF from HTML and share it
   */
  async generateReceipt(data: ReceiptPdfData, filename?: string): Promise<PdfDownloadResult> {
    try {
      const receiptHtml = this.generateReceiptHtml(data);

      // Use expo-print to generate PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html: receiptHtml,
        base64: false,
      });

      // Rename file to desired filename
      const finalFilename = filename || `receipt-${data.orderNumber}.pdf`;
      const cacheDir = Paths.cache.uri;
      const finalUri = `${cacheDir}${finalFilename}`;

      // Move the file to cache with proper name
      await FileSystemLegacy.moveAsync({
        from: uri,
        to: finalUri,
      });

      // Check if sharing is available
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(finalUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Receipt`,
          UTI: 'com.adobe.pdf',
        });
      }

      return {
        success: true,
        filePath: finalUri,
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
   * Generate professional receipt HTML (same as web version)
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
}

export const pdfService = new NativePdfService();
