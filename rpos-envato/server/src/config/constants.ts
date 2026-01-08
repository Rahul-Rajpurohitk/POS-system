import { Role, AuthType, CouponType, Currency, Language, MediaType, LogType } from '../types/enums';

export const Constants = {
  // Roles
  Role,

  // Auth Types
  AuthType,

  // Coupon Types
  CouponType,

  // Currencies
  Currency,

  // Languages
  Language,

  // Media Types
  MediaType,

  // Log Types
  LogType,

  // JWT
  JWTSecret: process.env.JWT_SECRET || '94rEvCERhR',
  JWTExpiresIn: '7d',

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // File Storage
  FileStorage: {
    server: {
      enabled: true,
      imageDirectory: 'public/images',
    },
    firebase: {
      enabled: false,
      bucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    },
  },

  // Order Number
  ORDER_NUMBER_LENGTH: 6,

  // Bcrypt
  SALT_ROUNDS: 10,

  // Default Social Password
  DEFAULT_SOCIAL_PASSWORD: process.env.DEFAULT_SOCIAL_PASSWORD || 'w6ohXfbg85',
};

export default Constants;
