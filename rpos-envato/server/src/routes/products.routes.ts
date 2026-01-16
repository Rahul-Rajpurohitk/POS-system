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
 * /products/brands:
 *   get:
 *     summary: Get unique brands for filter dropdown
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unique brands
 */
router.get('/brands', staff, readLimiter, catchAsync(productsController.getBrands));

/**
 * @swagger
 * /products/tags:
 *   get:
 *     summary: Get unique tags for filter dropdown
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unique tags
 */
router.get('/tags', staff, readLimiter, catchAsync(productsController.getTags));

/**
 * @swagger
 * /products/partners/summary:
 *   get:
 *     summary: Get partner availability summary
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partner availability counts
 */
router.get('/partners/summary', staff, readLimiter, catchAsync(productsController.getPartnerSummary));

/**
 * @swagger
 * /products/partners/bulk-update:
 *   post:
 *     summary: Bulk update partner availability for products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               partner:
 *                 type: string
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Products updated
 */
router.post('/partners/bulk-update', manager, createLimiter, catchAsync(productsController.bulkUpdatePartnerAvailability));

/**
 * @swagger
 * /products/export/{partner}:
 *   get:
 *     summary: Export products available for a specific partner
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partner
 *         required: true
 *         schema:
 *           type: string
 *         description: Partner name (doordash, ubereats, grubhub, etc.)
 *     responses:
 *       200:
 *         description: Partner export data
 */
router.get('/export/:partner', manager, readLimiter, catchAsync(productsController.exportForPartner));

/**
 * @swagger
 * /products/barcode/{barcode}:
 *   get:
 *     summary: Get product by barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Product barcode/UPC
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get('/barcode/:barcode', staff, readLimiter, catchAsync(productsController.getProductByBarcode));

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
 *     summary: Get all products with advanced filtering
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
 *         description: Search by name, SKU, description, brand, or barcode
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by default supplier ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *       - in: query
 *         name: hasBarcode
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by barcode presence
 *       - in: query
 *         name: partner
 *         schema:
 *           type: string
 *         description: Filter by partner availability (doordash, ubereats, etc.)
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: minMargin
 *         schema:
 *           type: number
 *         description: Minimum profit margin percentage
 *       - in: query
 *         name: maxMargin
 *         schema:
 *           type: number
 *         description: Maximum profit margin percentage
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
