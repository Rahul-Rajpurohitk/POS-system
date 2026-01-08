import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order, OrderItem, Payment, Business } from '../entities';
import { PaymentMethod, PaymentStatus, TaxType } from '../types/enums';

export interface ReceiptData {
  // Business info
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId?: string;
    logo?: string;
  };

  // Order info
  order: {
    id: string;
    number: string;
    date: string;
    time: string;
    status: string;
  };

  // Customer info
  customer: {
    name: string;
    email?: string;
    phone?: string;
  } | null;

  // Staff info
  cashier: {
    name: string;
  };

  // Items
  items: ReceiptItem[];

  // Totals
  totals: {
    subtotal: number;
    discount: number;
    discountLabel?: string;
    taxType: string;
    taxRate: number;
    taxAmount: number;
    total: number;
    tip: number;
    grandTotal: number;
  };

  // Payments
  payments: ReceiptPayment[];

  // Change
  change: number;

  // Footer
  footer?: {
    returnPolicy?: string;
    thankYouMessage?: string;
    promoMessage?: string;
  };

  // QR code data (for digital receipts)
  qrCodeData?: string;
}

export interface ReceiptItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  notes?: string;
}

export interface ReceiptPayment {
  method: string;
  methodDisplay: string;
  amount: number;
  reference?: string;
  cardLastFour?: string;
  cardBrand?: string;
}

export interface ReceiptConfig {
  showLogo: boolean;
  showTaxBreakdown: boolean;
  showBarcode: boolean;
  showQRCode: boolean;
  paperWidth: '58mm' | '80mm';
  fontSize: 'small' | 'medium' | 'large';
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeFormat: string;
}

class ReceiptService {
  private orderRepository: Repository<Order>;
  private paymentRepository: Repository<Payment>;
  private businessRepository: Repository<Business>;

  private defaultConfig: ReceiptConfig = {
    showLogo: true,
    showTaxBreakdown: true,
    showBarcode: true,
    showQRCode: false,
    paperWidth: '80mm',
    fontSize: 'medium',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
  };

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.businessRepository = AppDataSource.getRepository(Business);
  }

  /**
   * Generate receipt data for an order
   */
  async generateReceipt(
    orderId: string,
    businessId: string,
    config?: Partial<ReceiptConfig>
  ): Promise<ReceiptData> {
    const receiptConfig = { ...this.defaultConfig, ...config };

    // Get order with all relations
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items', 'items.product', 'customer', 'createdBy', 'coupon'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Get business
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    // Get payments
    const payments = await this.paymentRepository.find({
      where: { orderId, status: PaymentStatus.CAPTURED },
      order: { createdAt: 'ASC' },
    });

    // Format date and time
    const orderDate = new Date(order.createdAt);
    const dateStr = this.formatDate(orderDate, receiptConfig.dateFormat);
    const timeStr = this.formatTime(orderDate, receiptConfig.timeFormat);

    // Build receipt data
    const receiptData: ReceiptData = {
      business: {
        name: business.name,
        address: business.address || '',
        phone: business.phone || '',
        email: business.email || '',
        taxId: business.taxId || undefined,
        logo: business.logo || undefined,
      },

      order: {
        id: order.id,
        number: order.formattedNumber,
        date: dateStr,
        time: timeStr,
        status: order.status,
      },

      customer: order.customer
        ? {
            name: order.customer.name,
            email: order.customer.email || undefined,
            phone: order.customer.phone || undefined,
          }
        : order.guestName
          ? {
              name: order.guestName,
              email: order.guestEmail || undefined,
              phone: order.guestPhone || undefined,
            }
          : null,

      cashier: {
        name: order.createdBy?.name || 'Staff',
      },

      items: order.items.map((item) => ({
        name: item.product?.name || item.productName,
        sku: item.product?.sku || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
        notes: item.notes || undefined,
      })),

      totals: {
        subtotal: Number(order.subTotal),
        discount: Number(order.discount),
        discountLabel: order.coupon ? `Coupon: ${order.coupon.code}` : undefined,
        taxType: this.getTaxTypeDisplay(order.taxType),
        taxRate: Number(order.taxRate) * 100, // Convert to percentage
        taxAmount: Number(order.taxAmount),
        total: Number(order.total),
        tip: Number(order.tipAmount),
        grandTotal: Number(order.total) + Number(order.tipAmount),
      },

      payments: payments.map((payment) => ({
        method: payment.method,
        methodDisplay: this.getPaymentMethodDisplay(payment.method),
        amount: Number(payment.amountApplied),
        reference: payment.transactionId || undefined,
        cardLastFour: payment.cardLastFour || undefined,
        cardBrand: payment.cardBrand || undefined,
      })),

      change: Number(order.changeDue),

      footer: {
        returnPolicy: business.returnPolicy || 'Returns accepted within 30 days with receipt.',
        thankYouMessage: 'Thank you for your purchase!',
        promoMessage: business.promoMessage || undefined,
      },

      qrCodeData: receiptConfig.showQRCode
        ? this.generateQRCodeData(order, business)
        : undefined,
    };

    return receiptData;
  }

  /**
   * Generate receipt HTML for printing
   */
  async generateReceiptHTML(
    orderId: string,
    businessId: string,
    config?: Partial<ReceiptConfig>
  ): Promise<string> {
    const receipt = await this.generateReceipt(orderId, businessId, config);
    const receiptConfig = { ...this.defaultConfig, ...config };

    const paperWidth = receiptConfig.paperWidth === '58mm' ? '220px' : '302px';
    const fontSize =
      receiptConfig.fontSize === 'small'
        ? '10px'
        : receiptConfig.fontSize === 'large'
          ? '14px'
          : '12px';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: ${fontSize};
      width: ${paperWidth};
      padding: 10px;
      background: white;
    }
    .receipt {
      width: 100%;
    }
    .center {
      text-align: center;
    }
    .right {
      text-align: right;
    }
    .bold {
      font-weight: bold;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    .header {
      margin-bottom: 10px;
    }
    .business-name {
      font-size: 1.4em;
      font-weight: bold;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .item-name {
      flex: 1;
    }
    .item-qty {
      width: 40px;
      text-align: center;
    }
    .item-price {
      width: 60px;
      text-align: right;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .grand-total {
      font-size: 1.2em;
      font-weight: bold;
      margin: 10px 0;
    }
    .payment-row {
      margin: 4px 0;
    }
    .footer {
      margin-top: 15px;
      font-size: 0.9em;
    }
    @media print {
      body {
        width: ${paperWidth};
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header center">
      ${receipt.business.logo && receiptConfig.showLogo ? `<img src="${receipt.business.logo}" alt="Logo" style="max-width: 150px; margin-bottom: 10px;">` : ''}
      <div class="business-name">${this.escapeHtml(receipt.business.name)}</div>
      ${receipt.business.address ? `<div>${this.escapeHtml(receipt.business.address)}</div>` : ''}
      ${receipt.business.phone ? `<div>Tel: ${this.escapeHtml(receipt.business.phone)}</div>` : ''}
      ${receipt.business.taxId ? `<div>Tax ID: ${this.escapeHtml(receipt.business.taxId)}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Order Info -->
    <div>
      <div class="item-row">
        <span>Receipt #:</span>
        <span class="bold">${receipt.order.number}</span>
      </div>
      <div class="item-row">
        <span>Date:</span>
        <span>${receipt.order.date}</span>
      </div>
      <div class="item-row">
        <span>Time:</span>
        <span>${receipt.order.time}</span>
      </div>
      <div class="item-row">
        <span>Cashier:</span>
        <span>${this.escapeHtml(receipt.cashier.name)}</span>
      </div>
      ${receipt.customer ? `
      <div class="item-row">
        <span>Customer:</span>
        <span>${this.escapeHtml(receipt.customer.name)}</span>
      </div>
      ` : ''}
    </div>

    <div class="double-divider"></div>

    <!-- Items -->
    <div>
      ${receipt.items
        .map(
          (item) => `
        <div style="margin-bottom: 6px;">
          <div class="item-row">
            <span class="item-name">${this.escapeHtml(item.name)}</span>
          </div>
          <div class="item-row">
            <span class="item-qty">${item.quantity} x ${this.formatCurrency(item.unitPrice, receiptConfig)}</span>
            <span class="item-price">${this.formatCurrency(item.total, receiptConfig)}</span>
          </div>
          ${item.discount > 0 ? `<div class="item-row" style="color: #666;"><span>Discount</span><span>-${this.formatCurrency(item.discount, receiptConfig)}</span></div>` : ''}
          ${item.notes ? `<div style="font-size: 0.85em; color: #666;">Note: ${this.escapeHtml(item.notes)}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>

    <div class="divider"></div>

    <!-- Totals -->
    <div>
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${this.formatCurrency(receipt.totals.subtotal, receiptConfig)}</span>
      </div>
      ${receipt.totals.discount > 0 ? `
      <div class="total-row">
        <span>${receipt.totals.discountLabel || 'Discount'}:</span>
        <span>-${this.formatCurrency(receipt.totals.discount, receiptConfig)}</span>
      </div>
      ` : ''}
      ${receiptConfig.showTaxBreakdown && receipt.totals.taxAmount > 0 ? `
      <div class="total-row">
        <span>Tax (${receipt.totals.taxRate.toFixed(2)}% ${receipt.totals.taxType}):</span>
        <span>${this.formatCurrency(receipt.totals.taxAmount, receiptConfig)}</span>
      </div>
      ` : ''}
      ${receipt.totals.tip > 0 ? `
      <div class="total-row">
        <span>Tip:</span>
        <span>${this.formatCurrency(receipt.totals.tip, receiptConfig)}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>${this.formatCurrency(receipt.totals.grandTotal, receiptConfig)}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Payments -->
    <div>
      ${receipt.payments
        .map(
          (payment) => `
        <div class="payment-row">
          <div class="item-row">
            <span>${payment.methodDisplay}${payment.cardLastFour ? ` (**** ${payment.cardLastFour})` : ''}:</span>
            <span>${this.formatCurrency(payment.amount, receiptConfig)}</span>
          </div>
        </div>
      `
        )
        .join('')}
      ${receipt.change > 0 ? `
      <div class="item-row bold">
        <span>Change:</span>
        <span>${this.formatCurrency(receipt.change, receiptConfig)}</span>
      </div>
      ` : ''}
    </div>

    <div class="double-divider"></div>

    <!-- Footer -->
    <div class="footer center">
      ${receipt.footer?.thankYouMessage ? `<div class="bold">${this.escapeHtml(receipt.footer.thankYouMessage)}</div>` : ''}
      ${receipt.footer?.returnPolicy ? `<div style="margin-top: 8px; font-size: 0.85em;">${this.escapeHtml(receipt.footer.returnPolicy)}</div>` : ''}
      ${receipt.footer?.promoMessage ? `<div style="margin-top: 8px;">${this.escapeHtml(receipt.footer.promoMessage)}</div>` : ''}
    </div>

    ${receipt.qrCodeData ? `
    <div class="center" style="margin-top: 15px;">
      <img src="${receipt.qrCodeData}" alt="QR Code" style="width: 100px; height: 100px;">
    </div>
    ` : ''}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate ESC/POS commands for thermal printers
   */
  async generateESCPOSCommands(
    orderId: string,
    businessId: string,
    config?: Partial<ReceiptConfig>
  ): Promise<Buffer> {
    const receipt = await this.generateReceipt(orderId, businessId, config);
    const receiptConfig = { ...this.defaultConfig, ...config };
    const commands: number[] = [];

    // ESC/POS command codes
    const ESC = 0x1b;
    const GS = 0x1d;
    const LF = 0x0a;

    // Initialize printer
    commands.push(ESC, 0x40); // ESC @

    // Center alignment
    commands.push(ESC, 0x61, 0x01); // ESC a 1

    // Business name (double width/height)
    commands.push(GS, 0x21, 0x11); // GS ! n (double width + height)
    this.addText(commands, receipt.business.name);
    commands.push(LF);

    // Reset size
    commands.push(GS, 0x21, 0x00);

    // Business info
    if (receipt.business.address) {
      this.addText(commands, receipt.business.address);
      commands.push(LF);
    }
    if (receipt.business.phone) {
      this.addText(commands, `Tel: ${receipt.business.phone}`);
      commands.push(LF);
    }

    // Divider
    commands.push(LF);
    this.addText(commands, '-'.repeat(32));
    commands.push(LF);

    // Left align
    commands.push(ESC, 0x61, 0x00);

    // Order info
    this.addText(commands, `Receipt #: ${receipt.order.number}`);
    commands.push(LF);
    this.addText(commands, `Date: ${receipt.order.date} ${receipt.order.time}`);
    commands.push(LF);
    this.addText(commands, `Cashier: ${receipt.cashier.name}`);
    commands.push(LF);

    if (receipt.customer) {
      this.addText(commands, `Customer: ${receipt.customer.name}`);
      commands.push(LF);
    }

    // Divider
    this.addText(commands, '='.repeat(32));
    commands.push(LF);

    // Items
    for (const item of receipt.items) {
      this.addText(commands, item.name);
      commands.push(LF);
      const itemLine = this.padLine(
        `  ${item.quantity} x ${this.formatCurrency(item.unitPrice, receiptConfig)}`,
        this.formatCurrency(item.total, receiptConfig),
        32
      );
      this.addText(commands, itemLine);
      commands.push(LF);

      if (item.discount > 0) {
        const discLine = this.padLine(
          '  Discount',
          `-${this.formatCurrency(item.discount, receiptConfig)}`,
          32
        );
        this.addText(commands, discLine);
        commands.push(LF);
      }
    }

    // Divider
    this.addText(commands, '-'.repeat(32));
    commands.push(LF);

    // Totals
    this.addText(
      commands,
      this.padLine('Subtotal:', this.formatCurrency(receipt.totals.subtotal, receiptConfig), 32)
    );
    commands.push(LF);

    if (receipt.totals.discount > 0) {
      this.addText(
        commands,
        this.padLine('Discount:', `-${this.formatCurrency(receipt.totals.discount, receiptConfig)}`, 32)
      );
      commands.push(LF);
    }

    if (receipt.totals.taxAmount > 0) {
      this.addText(
        commands,
        this.padLine(
          `Tax (${receipt.totals.taxRate.toFixed(2)}%):`,
          this.formatCurrency(receipt.totals.taxAmount, receiptConfig),
          32
        )
      );
      commands.push(LF);
    }

    if (receipt.totals.tip > 0) {
      this.addText(
        commands,
        this.padLine('Tip:', this.formatCurrency(receipt.totals.tip, receiptConfig), 32)
      );
      commands.push(LF);
    }

    // Bold total
    commands.push(ESC, 0x45, 0x01); // ESC E 1 (bold on)
    this.addText(
      commands,
      this.padLine('TOTAL:', this.formatCurrency(receipt.totals.grandTotal, receiptConfig), 32)
    );
    commands.push(LF);
    commands.push(ESC, 0x45, 0x00); // ESC E 0 (bold off)

    // Divider
    this.addText(commands, '-'.repeat(32));
    commands.push(LF);

    // Payments
    for (const payment of receipt.payments) {
      const paymentLine = `${payment.methodDisplay}${payment.cardLastFour ? ` (**** ${payment.cardLastFour})` : ''}`;
      this.addText(
        commands,
        this.padLine(paymentLine, this.formatCurrency(payment.amount, receiptConfig), 32)
      );
      commands.push(LF);
    }

    if (receipt.change > 0) {
      commands.push(ESC, 0x45, 0x01);
      this.addText(
        commands,
        this.padLine('Change:', this.formatCurrency(receipt.change, receiptConfig), 32)
      );
      commands.push(LF);
      commands.push(ESC, 0x45, 0x00);
    }

    // Footer
    commands.push(LF);
    commands.push(ESC, 0x61, 0x01); // Center

    if (receipt.footer?.thankYouMessage) {
      commands.push(ESC, 0x45, 0x01);
      this.addText(commands, receipt.footer.thankYouMessage);
      commands.push(LF);
      commands.push(ESC, 0x45, 0x00);
    }

    if (receipt.footer?.returnPolicy) {
      commands.push(LF);
      this.addText(commands, receipt.footer.returnPolicy);
      commands.push(LF);
    }

    // Feed and cut
    commands.push(LF, LF, LF);
    commands.push(GS, 0x56, 0x00); // GS V 0 (full cut)

    return Buffer.from(commands);
  }

  // Helper methods

  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const year = date.getFullYear();

    return format
      .replace('MM', month)
      .replace('DD', day)
      .replace('YYYY', year.toString())
      .replace('YY', year.toString().slice(-2));
  }

  private formatTime(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';

    if (format.includes('hh')) {
      hours = hours % 12 || 12;
    }

    return format
      .replace('hh', pad(hours))
      .replace('HH', pad(date.getHours()))
      .replace('mm', minutes)
      .replace('A', ampm);
  }

  private formatCurrency(amount: number, config: ReceiptConfig): string {
    return `${config.currencySymbol}${amount.toFixed(2)}`;
  }

  private getTaxTypeDisplay(taxType: TaxType): string {
    switch (taxType) {
      case TaxType.INCLUSIVE:
        return 'Incl.';
      case TaxType.EXCLUSIVE:
        return 'Excl.';
      case TaxType.EXEMPT:
        return 'Exempt';
      default:
        return '';
    }
  }

  private getPaymentMethodDisplay(method: PaymentMethod): string {
    const displays: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Cash',
      [PaymentMethod.CREDIT_CARD]: 'Credit Card',
      [PaymentMethod.DEBIT_CARD]: 'Debit Card',
      [PaymentMethod.MOBILE_PAYMENT]: 'Mobile Pay',
      [PaymentMethod.QR_CODE]: 'QR Code',
      [PaymentMethod.GIFT_CARD]: 'Gift Card',
      [PaymentMethod.STORE_CREDIT]: 'Store Credit',
      [PaymentMethod.CHECK]: 'Check',
      [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
      [PaymentMethod.SPLIT]: 'Split Payment',
    };
    return displays[method] || method;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private generateQRCodeData(order: Order, business: Business): string {
    // Generate a URL or data string for QR code
    // This would typically point to a digital receipt or order lookup
    const data = {
      orderId: order.id,
      orderNumber: order.formattedNumber,
      businessId: business.id,
      total: order.total,
      date: order.createdAt.toISOString(),
    };
    // Return as base64 encoded JSON (would normally be a QR code image)
    return `data:application/json;base64,${Buffer.from(JSON.stringify(data)).toString('base64')}`;
  }

  private addText(commands: number[], text: string): void {
    for (let i = 0; i < text.length; i++) {
      commands.push(text.charCodeAt(i));
    }
  }

  private padLine(left: string, right: string, width: number): string {
    const padding = width - left.length - right.length;
    return `${left}${' '.repeat(Math.max(1, padding))}${right}`;
  }
}

export const receiptService = new ReceiptService();
