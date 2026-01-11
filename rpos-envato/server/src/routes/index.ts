import { Router } from 'express';
import mongoose from 'mongoose';
import { AppDataSource } from '../config/database';
import { cacheService } from '../services/cache.service';
import { emailService } from '../services/email.service';

// Core routes
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import ordersRoutes from './orders.routes';
import categoriesRoutes from './categories.routes';
import customersRoutes from './customers.routes';
import couponsRoutes from './coupons.routes';
import paymentsRoutes from './payments.routes';
import analyticsRoutes from './analytics.routes';
import receiptsRoutes from './receipts.routes';

// Additional routes
import businessesRoutes from './businesses.routes';
import usersRoutes from './users.routes';
import filesRoutes from './files.routes';
import assetsRoutes from './assets.routes';

// Feature routes
import locationsRoutes from './locations.routes';
import barcodesRoutes from './barcodes.routes';
import suppliersRoutes from './suppliers.routes';
import reportsRoutes from './reports.routes';
import shiftsRoutes from './shifts.routes';
import eodRoutes from './eod.routes';
import giftcardsRoutes from './giftcards.routes';
import loyaltyRoutes from './loyalty.routes';
import syncRoutes from './sync.routes';
import analyticsAdvancedRoutes from './analytics-advanced.routes';

const router = Router();

// ============ HEALTH CHECK ENDPOINTS ============

/**
 * Basic health check - always returns ok if server is running
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Liveness probe - is the server alive?
 */
router.get('/health/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * Readiness probe - is the server ready to accept traffic?
 * Checks all critical dependencies
 */
router.get('/health/ready', async (req, res) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let allHealthy = true;

  // Check PostgreSQL
  const pgStart = Date.now();
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      checks.postgresql = { status: 'healthy', latency: Date.now() - pgStart };
    } else {
      checks.postgresql = { status: 'unhealthy', error: 'Not initialized' };
      allHealthy = false;
    }
  } catch (error) {
    checks.postgresql = { status: 'unhealthy', error: (error as Error).message };
    allHealthy = false;
  }

  // Check Redis
  const redisStart = Date.now();
  try {
    const isConnected = cacheService.connected;
    if (isConnected) {
      checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
    } else {
      checks.redis = { status: 'degraded', error: 'Not connected (using fallback)' };
    }
  } catch (error) {
    checks.redis = { status: 'degraded', error: (error as Error).message };
  }

  // Check MongoDB (for logs/events)
  const mongoStart = Date.now();
  try {
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = { status: 'healthy', latency: Date.now() - mongoStart };
    } else {
      checks.mongodb = { status: 'degraded', error: 'Not connected' };
    }
  } catch (error) {
    checks.mongodb = { status: 'degraded', error: (error as Error).message };
  }

  // Check Email Service
  checks.email = {
    status: emailService.isAvailable() ? 'healthy' : 'degraded',
    error: emailService.isAvailable() ? undefined : 'Not configured',
  };

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * Detailed health check - comprehensive system status
 */
router.get('/health/detailed', async (req, res) => {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    services: {},
  };

  // PostgreSQL check
  try {
    if (AppDataSource.isInitialized) {
      const start = Date.now();
      await AppDataSource.query('SELECT 1');
      (health.services as Record<string, unknown>).postgresql = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } else {
      (health.services as Record<string, unknown>).postgresql = {
        status: 'unhealthy',
        error: 'DataSource not initialized',
      };
      health.status = 'degraded';
    }
  } catch (error) {
    (health.services as Record<string, unknown>).postgresql = {
      status: 'unhealthy',
      error: (error as Error).message,
    };
    health.status = 'degraded';
  }

  // Redis check
  try {
    const isConnected = cacheService.connected;
    (health.services as Record<string, unknown>).redis = {
      status: isConnected ? 'healthy' : 'degraded',
      connected: isConnected,
    };
  } catch (error) {
    (health.services as Record<string, unknown>).redis = {
      status: 'degraded',
      error: (error as Error).message,
    };
  }

  // MongoDB check (for logs/events)
  try {
    const mongoState = mongoose.connection.readyState;
    const stateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    (health.services as Record<string, unknown>).mongodb = {
      status: mongoState === 1 ? 'healthy' : 'degraded',
      state: stateMap[mongoState] || 'unknown',
      purpose: 'logs and events storage',
    };
  } catch (error) {
    (health.services as Record<string, unknown>).mongodb = {
      status: 'degraded',
      error: (error as Error).message,
    };
  }

  // Email service check
  (health.services as Record<string, unknown>).email = {
    status: emailService.isAvailable() ? 'healthy' : 'not_configured',
    available: emailService.isAvailable(),
  };

  res.json(health);
});

// Core API routes
router.use('/users', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/customers', customersRoutes);
router.use('/coupons', couponsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/analytics/v2', analyticsAdvancedRoutes);
router.use('/receipts', receiptsRoutes);

// Business & Files
router.use('/businesses', businessesRoutes);
router.use('/files', filesRoutes);
router.use('/assets', assetsRoutes);

// Feature routes
router.use('/locations', locationsRoutes);
router.use('/barcodes', barcodesRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/reports', reportsRoutes);
router.use('/shifts', shiftsRoutes);
router.use('/eod', eodRoutes);
router.use('/giftcards', giftcardsRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/sync', syncRoutes);

// Auth routes (alternative path)
router.use('/auth', authRoutes);

export default router;
