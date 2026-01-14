import { JobData } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../constants';

// Job Data Types
export interface SendEmailData extends JobData {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export interface OrderConfirmationData extends JobData {
  orderId: string;
  businessId: string;
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface LowStockNotificationData extends JobData {
  businessId: string;
  managerEmail: string;
  products: Array<{
    id: string;
    name: string;
    currentQuantity: number;
    threshold: number;
  }>;
}

export interface PasswordResetData extends JobData {
  email: string;
  resetCode: string;
  userName: string;
}

export interface EmailVerificationData extends JobData {
  email: string;
  verificationCode: string;
  userName: string;
}

/**
 * Notification Jobs
 */
export class NotificationJob {
  /**
   * Dispatch a generic email job
   */
  static async sendEmail(data: SendEmailData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      JOB_NAMES.SEND_EMAIL,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 3,
      }
    );
  }

  /**
   * Dispatch an order confirmation email job
   */
  static async sendOrderConfirmation(data: OrderConfirmationData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      JOB_NAMES.SEND_ORDER_CONFIRMATION,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 2,
      }
    );
  }

  /**
   * Dispatch a low stock notification job
   */
  static async sendLowStockNotification(data: LowStockNotificationData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      JOB_NAMES.SEND_LOW_STOCK_NOTIFICATION,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 4,
        // Delay to batch multiple low stock alerts
        delay: 60000, // 1 minute
      }
    );
  }

  /**
   * Dispatch a password reset email job
   */
  static async sendPasswordReset(data: PasswordResetData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      JOB_NAMES.SEND_PASSWORD_RESET,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 1, // High priority
      }
    );
  }

  /**
   * Dispatch an email verification job
   */
  static async sendEmailVerification(data: EmailVerificationData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      JOB_NAMES.SEND_EMAIL_VERIFICATION,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 1, // High priority
      }
    );
  }

  /**
   * Dispatch bulk emails
   */
  static async sendBulkEmails(emails: SendEmailData[]): Promise<string[]> {
    const queue = QueueFactory.getProvider();
    return queue.addBulkJobs(
      QUEUE_NAMES.NOTIFICATIONS,
      emails.map((data) => ({
        name: JOB_NAMES.SEND_EMAIL,
        data,
        options: {
          ...DEFAULT_JOB_OPTIONS,
          priority: 3,
        },
      }))
    );
  }
}

export default NotificationJob;
