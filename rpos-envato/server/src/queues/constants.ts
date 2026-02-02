// Queue Names
export const QUEUE_NAMES = {
  ORDERS: 'orders',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  DELIVERY: 'delivery',
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
  SEND_EMAIL_VERIFICATION: 'send-email-verification',

  // Analytics Jobs
  REFRESH_ABC_CLASSIFICATION: 'refresh-abc-classification',
  REFRESH_RFM_SEGMENTATION: 'refresh-rfm-segmentation',
  REFRESH_PEAK_HOURS: 'refresh-peak-hours',
  REFRESH_INVENTORY_INTELLIGENCE: 'refresh-inventory-intelligence',
  REFRESH_CUSTOMER_COHORTS: 'refresh-customer-cohorts',
  WARM_ANALYTICS_CACHE: 'warm-analytics-cache',
  INVALIDATE_TIME_SENSITIVE: 'invalidate-time-sensitive',

  // Delivery Jobs
  ONLINE_ORDER_TIMEOUT: 'online-order-timeout',
  ONLINE_ORDER_REMINDER: 'online-order-reminder',
  ASSIGN_DRIVER: 'assign-driver',
  UPDATE_DELIVERY_ETA: 'update-delivery-eta',
  DELIVERY_COMPLETED: 'delivery-completed',
  DELIVERY_CANCELLED: 'delivery-cancelled',
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
