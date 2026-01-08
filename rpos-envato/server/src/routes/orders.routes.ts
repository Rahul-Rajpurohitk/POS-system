import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import * as ordersController from '../controllers/orders.controller';

const router = Router();

// GET /orders/sync
router.get('/sync', staff, ordersController.syncOrders);

// GET /orders
router.get('/', staff, ordersController.getOrders);

// GET /orders/:id
router.get(
  '/:id',
  staff,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  ordersController.getOrder
);

// POST /orders
router.post(
  '/',
  staff,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isUUID().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  checkValidation,
  ordersController.addOrder
);

// PUT /orders/:id
router.put(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  ordersController.editOrder
);

// DELETE /orders/:id
router.delete(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  ordersController.deleteOrder
);

export default router;
