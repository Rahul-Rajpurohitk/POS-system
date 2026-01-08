import { Job } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES } from '../constants';
import {
  SendEmailData,
  OrderConfirmationData,
  LowStockNotificationData,
  PasswordResetData,
} from '../jobs/NotificationJob';
import nodemailer from 'nodemailer';
import { config } from '../../config';

type NotificationJobData =
  | SendEmailData
  | OrderConfirmationData
  | LowStockNotificationData
  | PasswordResetData;

// Email transporter (configured once)
let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (config.smtpHost) {
      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
    } else {
      // Use ethereal for testing if no SMTP configured
      console.warn('[NotificationWorker] No SMTP configured, emails will be logged only');
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}

/**
 * Notification Worker - Processes notification jobs (emails, etc.)
 */
export class NotificationWorker {
  /**
   * Initialize the notification worker
   */
  static async initialize(): Promise<void> {
    const queue = QueueFactory.getProvider();

    await queue.registerWorker<NotificationJobData>(
      QUEUE_NAMES.NOTIFICATIONS,
      async (job: Job<NotificationJobData>) => {
        console.log(`[NotificationWorker] Processing job: ${job.name} (${job.id})`);

        switch (job.name) {
          case JOB_NAMES.SEND_EMAIL:
            await NotificationWorker.sendEmail(job as Job<SendEmailData>);
            break;
          case JOB_NAMES.SEND_ORDER_CONFIRMATION:
            await NotificationWorker.sendOrderConfirmation(job as Job<OrderConfirmationData>);
            break;
          case JOB_NAMES.SEND_LOW_STOCK_NOTIFICATION:
            await NotificationWorker.sendLowStockNotification(
              job as Job<LowStockNotificationData>
            );
            break;
          case JOB_NAMES.SEND_PASSWORD_RESET:
            await NotificationWorker.sendPasswordReset(job as Job<PasswordResetData>);
            break;
          default:
            console.warn(`[NotificationWorker] Unknown job: ${job.name}`);
        }
      },
      3 // concurrency
    );

    console.log('[NotificationWorker] Initialized');
  }

  /**
   * Send a generic email
   */
  private static async sendEmail(job: Job<SendEmailData>): Promise<void> {
    const { to, subject, html, text } = job.data;

    await job.updateProgress(25);

    const transport = getTransporter();

    const result = await transport.sendMail({
      from: config.smtpFrom,
      to,
      subject,
      html,
      text,
    });

    await job.updateProgress(100);

    if (config.smtpHost) {
      console.log(`[NotificationWorker] Email sent to ${to}: ${subject}`);
    } else {
      console.log(`[NotificationWorker] Email logged (no SMTP):`, JSON.parse(result.message));
    }
  }

  /**
   * Send order confirmation email
   */
  private static async sendOrderConfirmation(job: Job<OrderConfirmationData>): Promise<void> {
    const { customerEmail, customerName, orderNumber, total, items } = job.data;

    await job.updateProgress(25);

    const itemsList = items
      .map((item) => `- ${item.name}: ${item.quantity} x $${item.price.toFixed(2)}`)
      .join('\n');

    const html = `
      <h1>Order Confirmation</h1>
      <p>Dear ${customerName},</p>
      <p>Thank you for your order!</p>
      <h2>Order #${orderNumber}</h2>
      <h3>Items:</h3>
      <pre>${itemsList}</pre>
      <h3>Total: $${total.toFixed(2)}</h3>
      <p>Thank you for your business!</p>
    `;

    const transport = getTransporter();

    await transport.sendMail({
      from: config.smtpFrom,
      to: customerEmail,
      subject: `Order Confirmation #${orderNumber}`,
      html,
      text: `Order Confirmation #${orderNumber}\n\nItems:\n${itemsList}\n\nTotal: $${total.toFixed(2)}`,
    });

    await job.updateProgress(100);
    console.log(`[NotificationWorker] Order confirmation sent for order #${orderNumber}`);
  }

  /**
   * Send low stock notification
   */
  private static async sendLowStockNotification(
    job: Job<LowStockNotificationData>
  ): Promise<void> {
    const { managerEmail, products } = job.data;

    if (!managerEmail) {
      console.warn('[NotificationWorker] No manager email provided for low stock notification');
      return;
    }

    await job.updateProgress(25);

    const productsList = products
      .map(
        (p) =>
          `- ${p.name}: ${p.currentQuantity} units remaining (threshold: ${p.threshold})`
      )
      .join('\n');

    const html = `
      <h1>Low Stock Alert</h1>
      <p>The following products are running low on stock:</p>
      <pre>${productsList}</pre>
      <p>Please restock these items soon.</p>
    `;

    const transport = getTransporter();

    await transport.sendMail({
      from: config.smtpFrom,
      to: managerEmail,
      subject: 'Low Stock Alert',
      html,
      text: `Low Stock Alert\n\n${productsList}`,
    });

    await job.updateProgress(100);
    console.log(`[NotificationWorker] Low stock notification sent to ${managerEmail}`);
  }

  /**
   * Send password reset email
   */
  private static async sendPasswordReset(job: Job<PasswordResetData>): Promise<void> {
    const { email, resetCode, userName } = job.data;

    await job.updateProgress(25);

    const html = `
      <h1>Password Reset</h1>
      <p>Dear ${userName},</p>
      <p>You have requested to reset your password.</p>
      <p>Your reset code is: <strong>${resetCode}</strong></p>
      <p>This code will expire in 15 minutes.</p>
      <p>If you did not request this reset, please ignore this email.</p>
    `;

    const transport = getTransporter();

    await transport.sendMail({
      from: config.smtpFrom,
      to: email,
      subject: 'Password Reset Code',
      html,
      text: `Password Reset\n\nYour reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.`,
    });

    await job.updateProgress(100);
    console.log(`[NotificationWorker] Password reset email sent to ${email}`);
  }
}

export default NotificationWorker;
