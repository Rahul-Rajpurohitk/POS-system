import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as productsController from '../controllers/products.controller';

const router = Router();

// GET /products/sync
router.get('/sync', staff, readLimiter, catchAsync(productsController.syncProducts));

// GET /products
router.get('/', staff, readLimiter, catchAsync(productsController.getProducts));

// POST /products
router.post(
  '/',
  manager,
  createLimiter,
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sellingPrice').isNumeric().withMessage('Selling price is required'),
  ],
  checkValidation,
  catchAsync(productsController.addProduct)
);

// PUT /products/:id
router.put(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid product ID')],
  checkValidation,
  catchAsync(productsController.editProduct)
);

// DELETE /products/:id
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid product ID')],
  checkValidation,
  catchAsync(productsController.deleteProduct)
);

// GET /products/:id/logs
router.get(
  '/:id/logs',
  manager,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid product ID')],
  checkValidation,
  catchAsync(productsController.getProductLogs)
);

export default router;
