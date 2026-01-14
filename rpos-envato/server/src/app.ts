import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import path from 'path';

import routes from './routes';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware';
import { generalLimiter } from './middlewares/rateLimit.middleware';
import logger, { stream } from './config/logger';
import { setupSwagger } from './config/swagger';
import './middlewares/auth.middleware'; // Initialize passport strategy

/**
 * Create Express Application
 */
export function createApp(): Application {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security Middleware
  app.use(helmet());

  // CORS Configuration
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || '*';
  app.use(cors({
    origin: corsOrigins,
    credentials: process.env.CORS_CREDENTIALS === 'true',
  }));

  // Rate Limiting (apply to all routes)
  app.use(generalLimiter);

  // Request Parsing
  app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));
  app.use(cookieParser());

  // Logging with Winston
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev', { stream }));
  } else {
    app.use(morgan('combined', { stream }));
  }

  // Log application start
  logger.info('Express application initialized', {
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
  });

  // Passport
  app.use(passport.initialize());

  // Static Files
  app.use('/public', express.static(path.join(__dirname, '../public')));

  // API Routes
  app.use('/', routes);

  // Swagger API Documentation
  setupSwagger(app);

  // Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
