import { Router } from 'express';

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

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
