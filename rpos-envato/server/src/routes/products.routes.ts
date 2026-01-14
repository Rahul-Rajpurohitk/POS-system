import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as productsController from '../controllers/products.controller';

const router = Router();

/**
 * @swagger
 * /products/sync:
 *   get:
 *     summary: Sync products with external sources
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products synced successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sync', staff, readLimiter, catchAsync(productsController.syncProducts));

/**
 * @swagger
 * /products/count:
 *   get:
 *     summary: Get total product count
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 */
router.get('/count', staff, readLimiter, catchAsync(productsController.getProductCount));

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, SKU, or description
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', staff, readLimiter, catchAsync(productsController.getProducts));

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sellingPrice]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sellingPrice:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               sku:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager role required
 */
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
