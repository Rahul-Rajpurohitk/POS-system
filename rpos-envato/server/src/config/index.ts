export * from './constants';
export * from './database';
export * from './redis';

// Environment configuration
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://pos_user:pos_password@localhost:5432/pos_db',
  mongodbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/pos_logs',

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Queue
  queueProvider: process.env.QUEUE_PROVIDER || 'bullmq',

  // JWT
  jwtSecret: process.env.JWT_SECRET || '94rEvCERhR',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Firebase (optional)
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',

  // Email (SMTP)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@pos.com',
};

export default config;
