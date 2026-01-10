import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

/**
 * Email templates for different notification types
 */
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email options for sending
 */
interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Order data for receipt emails
 */
interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  businessName: string;
  businessAddress?: string;
  createdAt: Date;
}

/**
 * Email service for sending notifications
 * Supports SMTP configuration with fallback for development
 */
class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  /**
   * Initialize the email transporter
   */
  async initialize(): Promise<void> {
    // Check if SMTP is configured
    if (!config.smtpHost || !config.smtpUser) {
      console.warn('Email service not configured - SMTP settings missing');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Email service not available, skipping email send');
      return false;
    }

    try {
      await this.transporter!.sendMail({
        from: config.smtpFrom,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        attachments: options.attachments,
      });
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send order receipt email
   */
  async sendOrderReceipt(email: string, data: OrderEmailData): Promise<boolean> {
    const template = this.generateOrderReceiptTemplate(data);
    return this.send({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}?token=${resetToken}"
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, please ignore this email. The link will expire in 1 hour.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email. Please do not reply.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Password Reset Request',
      html,
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcome(email: string, name: string, businessName: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${businessName}!</h2>
        <p>Hi ${name},</p>
        <p>Your account has been created successfully. You can now log in to the POS system.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
        </div>
        <p>If you have any questions, please contact your administrator.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email. Please do not reply.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Welcome to ${businessName}`,
      html,
    });
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(
    email: string,
    products: Array<{ name: string; sku: string; currentStock: number; minStock: number }>
  ): Promise<boolean> {
    const productRows = products
      .map(
        (p) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.sku}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #e74c3c;">${p.currentStock}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.minStock}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Low Stock Alert</h2>
        <p>The following products are running low on stock:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 12px; text-align: left;">Product</th>
              <th style="padding: 12px; text-align: left;">SKU</th>
              <th style="padding: 12px; text-align: left;">Current</th>
              <th style="padding: 12px; text-align: left;">Min Stock</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>
        <p>Please reorder these items to avoid stockouts.</p>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Low Stock Alert - ${products.length} products need attention`,
      html,
    });
  }

  /**
   * Send daily sales report
   */
  async sendDailySalesReport(
    email: string,
    data: {
      date: string;
      totalSales: number;
      totalOrders: number;
      averageOrderValue: number;
      topProducts: Array<{ name: string; quantity: number; revenue: number }>;
      currency: string;
    }
  ): Promise<boolean> {
    const topProductRows = data.topProducts
      .map(
        (p) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.currency}${p.revenue.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Daily Sales Report - ${data.date}</h2>

        <div style="display: flex; gap: 20px; margin: 20px 0;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px; flex: 1; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.currency}${data.totalSales.toFixed(2)}</p>
            <p style="margin: 5px 0 0; opacity: 0.9;">Total Sales</p>
          </div>
          <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px; flex: 1; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.totalOrders}</p>
            <p style="margin: 5px 0 0; opacity: 0.9;">Orders</p>
          </div>
          <div style="background-color: #FF9800; color: white; padding: 20px; border-radius: 8px; flex: 1; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold;">${data.currency}${data.averageOrderValue.toFixed(2)}</p>
            <p style="margin: 5px 0 0; opacity: 0.9;">Avg Order</p>
          </div>
        </div>

        <h3 style="color: #333; margin-top: 30px;">Top Selling Products</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 12px; text-align: left;">Product</th>
              <th style="padding: 12px; text-align: left;">Qty Sold</th>
              <th style="padding: 12px; text-align: left;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topProductRows}
          </tbody>
        </table>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Daily Sales Report - ${data.date}`,
      html,
    });
  }

  /**
   * Send EOD (End of Day) report
   */
  async sendEODReport(
    email: string,
    data: {
      date: string;
      cashier: string;
      openingFloat: number;
      totalSales: number;
      totalRefunds: number;
      cashPayments: number;
      cardPayments: number;
      otherPayments: number;
      expectedCash: number;
      actualCash: number;
      variance: number;
      currency: string;
    }
  ): Promise<boolean> {
    const varianceColor = data.variance === 0 ? '#4CAF50' : data.variance > 0 ? '#FF9800' : '#e74c3c';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">End of Day Report - ${data.date}</h2>
        <p><strong>Cashier:</strong> ${data.cashier}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Opening Float</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${data.currency}${data.openingFloat.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Total Sales</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #4CAF50;">${data.currency}${data.totalSales.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Total Refunds</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #e74c3c;">-${data.currency}${data.totalRefunds.toFixed(2)}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 12px;" colspan="2"><strong>Payment Breakdown</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Cash Payments</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${data.currency}${data.cashPayments.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Card Payments</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${data.currency}${data.cardPayments.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Other Payments</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${data.currency}${data.otherPayments.toFixed(2)}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 12px;" colspan="2"><strong>Cash Reconciliation</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Expected Cash</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${data.currency}${data.expectedCash.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">Actual Cash</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${data.currency}${data.actualCash.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">Variance</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; color: ${varianceColor};">
              ${data.variance >= 0 ? '+' : ''}${data.currency}${data.variance.toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
    `;

    return this.send({
      to: email,
      subject: `EOD Report - ${data.date} - ${data.cashier}`,
      html,
    });
  }

  /**
   * Generate order receipt email template
   */
  private generateOrderReceiptTemplate(data: OrderEmailData): EmailTemplate {
    const itemRows = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">${data.businessName}</h1>
          ${data.businessAddress ? `<p style="color: #666; margin: 5px 0;">${data.businessAddress}</p>` : ''}
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0;"><strong>Order #:</strong> ${data.orderNumber}</p>
          <p style="margin: 5px 0 0;"><strong>Date:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
          <p style="margin: 5px 0 0;"><strong>Customer:</strong> ${data.customerName}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #333; color: white;">
              <th style="padding: 12px; text-align: left;">Item</th>
              <th style="padding: 12px; text-align: center;">Qty</th>
              <th style="padding: 12px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div style="border-top: 2px solid #333; padding-top: 15px;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0;">Subtotal</td>
              <td style="padding: 5px 0; text-align: right;">$${data.subtotal.toFixed(2)}</td>
            </tr>
            ${data.discount > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #4CAF50;">Discount</td>
              <td style="padding: 5px 0; text-align: right; color: #4CAF50;">-$${data.discount.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${data.tax > 0 ? `
            <tr>
              <td style="padding: 5px 0;">Tax</td>
              <td style="padding: 5px 0; text-align: right;">$${data.tax.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr style="font-size: 18px; font-weight: bold;">
              <td style="padding: 10px 0; border-top: 1px solid #333;">Total</td>
              <td style="padding: 10px 0; border-top: 1px solid #333; text-align: right;">$${data.total.toFixed(2)}</td>
            </tr>
          </table>
          <p style="margin-top: 15px; color: #666;">Payment Method: ${data.paymentMethod}</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; margin: 0;">Thank you for your purchase!</p>
        </div>
      </div>
    `;

    const text = `
${data.businessName}
${data.businessAddress || ''}

Order #: ${data.orderNumber}
Date: ${new Date(data.createdAt).toLocaleString()}
Customer: ${data.customerName}

Items:
${data.items.map((item) => `  ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Subtotal: $${data.subtotal.toFixed(2)}
${data.discount > 0 ? `Discount: -$${data.discount.toFixed(2)}` : ''}
${data.tax > 0 ? `Tax: $${data.tax.toFixed(2)}` : ''}
Total: $${data.total.toFixed(2)}

Payment Method: ${data.paymentMethod}

Thank you for your purchase!
    `;

    return {
      subject: `Receipt for Order #${data.orderNumber} - ${data.businessName}`,
      html,
      text,
    };
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
