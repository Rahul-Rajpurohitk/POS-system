import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import * as productsController from '../controllers/products.controller';

const router = Router();

// GET /products/sync
router.get('/sync', staff, productsController.syncProducts);

// GET /products
router.get('/', staff, productsController.getProducts);

// POST /products
router.post(
  '/',
  manager,
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sellingPrice').isNumeric().withMessage('Selling price is required'),
  ],
  checkValidation,
  productsController.addProduct
);

// PUT /products/:id
router.put(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid product ID')],
  checkValidation,
  productsController.editProduct
);

// DELETE /products/:id
router.delete(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid product ID')],
  checkValidation,
  productsController.deleteProduct
);

// GET /products/:id/logs
router.get(
  '/:id/logs',
  manager,
  [param('id').isUUID().withMessage('Invalid product ID')],
  checkValidation,
  productsController.getProductLogs
);

export default router;
