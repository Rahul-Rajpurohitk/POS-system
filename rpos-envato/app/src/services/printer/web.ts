import type { PrinterService, PrinterDevice, ReceiptData } from './types';

class WebPrinterService implements PrinterService {
  async scan(): Promise<PrinterDevice[]> {
    // Web doesn't support Bluetooth scanning
    return [];
  }

  async connect(_device: PrinterDevice): Promise<boolean> {
    // Web uses browser print dialog
    return true;
  }

  async disconnect(): Promise<void> {
    // No-op for web
  }

  isConnected(): boolean {
    return true; // Web always "connected" via browser
  }

  async printReceipt(data: ReceiptData): Promise<boolean> {
    const receiptHtml = this.generateReceiptHtml(data);
    const printWindow = window.open('', '_blank', 'width=300,height=600');

    if (!printWindow) {
      console.error('Failed to open print window');
      return false;
    }

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    return true;
  }

  async printText(text: string): Promise<boolean> {
    const printWindow = window.open('', '_blank', 'width=300,height=400');

    if (!printWindow) return false;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 10px; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body><pre>${text}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    return true;
  }

  async openCashDrawer(): Promise<boolean> {
    console.warn('Cash drawer not supported on web');
    return false;
  }

  private generateReceiptHtml(data: ReceiptData): string {
    const itemsHtml = data.items
      .map(
        item => `
          <tr>
            <td>${item.name}</td>
            <td style="text-align: center">${item.quantity}</td>
            <td style="text-align: right">$${item.total.toFixed(2)}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 10px; }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { font-size: 14px; margin-bottom: 5px; }
            .header p { font-size: 10px; color: #666; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .info { font-size: 10px; margin-bottom: 10px; }
            table { width: 100%; font-size: 11px; }
            td { padding: 2px 0; }
            .totals { margin-top: 10px; }
            .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .totals .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
            @media print {
              body { width: 100%; }
              @page { margin: 0; size: 80mm auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.businessName}</h1>
            ${data.businessAddress ? `<p>${data.businessAddress}</p>` : ''}
            ${data.businessPhone ? `<p>Tel: ${data.businessPhone}</p>` : ''}
          </div>

          <div class="divider"></div>

          <div class="info">
            <div>Order: ${data.orderNumber}</div>
            <div>Date: ${data.date}</div>
            ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ''}
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left">Item</th>
                <th style="text-align: center">Qty</th>
                <th style="text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${data.subTotal.toFixed(2)}</span>
            </div>
            ${data.discount > 0 ? `
              <div class="row">
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
            <div class="row total">
              <span>TOTAL:</span>
              <span>$${data.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="info">
            <div>Payment: ${data.paymentMethod}</div>
          </div>

          ${data.footer ? `
            <div class="divider"></div>
            <div class="footer">${data.footer}</div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your purchase!</p>
          </div>
        </body>
      </html>
    `;
  }
}

export const printerService = new WebPrinterService();
