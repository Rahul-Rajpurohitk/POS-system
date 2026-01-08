// Queue Names
export const QUEUE_NAMES = {
  ORDERS: 'orders',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job Names
export const JOB_NAMES = {
  // Order Jobs
  PROCESS_ORDER: 'process-order',
  CALCULATE_ORDER_TOTALS: 'calculate-order-totals',

  // Inventory Jobs
  UPDATE_INVENTORY: 'update-inventory',
  LOW_STOCK_ALERT: 'low-stock-alert',
  RESTORE_INVENTORY: 'restore-inventory',

  // Report Jobs
  GENERATE_DAILY_REPORT: 'generate-daily-report',
  GENERATE_WEEKLY_REPORT: 'generate-weekly-report',
  GENERATE_MONTHLY_REPORT: 'generate-monthly-report',
  GENERATE_TOP_PRODUCTS_REPORT: 'generate-top-products-report',

  // Notification Jobs
  SEND_EMAIL: 'send-email',
  SEND_ORDER_CONFIRMATION: 'send-order-confirmation',
  SEND_LOW_STOCK_NOTIFICATION: 'send-low-stock-notification',
  SEND_PASSWORD_RESET: 'send-password-reset',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

// Default Job Options
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 1000,
};
