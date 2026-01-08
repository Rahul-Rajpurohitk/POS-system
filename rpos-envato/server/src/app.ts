import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import path from 'path';

import routes from './routes';
import { notFound, errorHandler } from './middlewares/error.middleware';
import './middlewares/auth.middleware'; // Initialize passport strategy

/**
 * Create Express Application
 */
export function createApp(): Application {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // Request Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Logging
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Passport
  app.use(passport.initialize());

  // Static Files
  app.use('/public', express.static(path.join(__dirname, '../public')));

  // API Routes
  app.use('/', routes);

  // Error Handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
