import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as customersController from '../controllers/customers.controller';

const router = Router();

// GET /customers/sync
router.get('/sync', staff, readLimiter, catchAsync(customersController.syncCustomers));

// GET /customers/count
router.get('/count', staff, readLimiter, catchAsync(customersController.getCustomerCount));

// POST /customers
router.post(
  '/',
  manager,
  createLimiter,
  [body('name').notEmpty().withMessage('Customer name is required')],
  checkValidation,
  catchAsync(customersController.addCustomer)
);

// PUT /customers/:id
router.put(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid customer ID')],
  checkValidation,
  catchAsync(customersController.editCustomer)
);

// DELETE /customers/:id
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid customer ID')],
  checkValidation,
  catchAsync(customersController.deleteCustomer)
);

export default router;
