import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import * as barcodesController from '../controllers/barcodes.controller';

const router = Router();

router.use(auth);

// Barcode Validation & Lookup

// POST /barcodes/validate - Validate barcode format
router.post(
  '/validate',
  [
    body('barcode').notEmpty().withMessage('Barcode is required'),
    body('type').optional().isString(),
  ],
  checkValidation,
  barcodesController.validateBarcode
);

// GET /barcodes/lookup/:barcode - Lookup product by barcode
router.get(
  '/lookup/:barcode',
  [
    param('barcode').notEmpty(),
    query('locationId').optional().isUUID(),
    query('logScan').optional().isBoolean(),
  ],
  checkValidation,
  barcodesController.lookupBarcode
);

// Barcode Registration

// POST /barcodes - Register barcode
router.post(
  '/',
  [
    body('productId').isUUID().withMessage('Product ID required'),
    body('barcode').notEmpty().withMessage('Barcode required'),
    body('type').isIn(['upc_a', 'upc_e', 'ean_13', 'ean_8', 'code_39', 'code_128', 'itf_14', 'qr_code', 'data_matrix', 'pdf_417', 'internal', 'custom']),
    body('isPrimary').optional().isBoolean(),
  ],
  checkValidation,
  barcodesController.registerBarcode
);

// GET /barcodes/product/:productId - Get barcodes for product
router.get(
  '/product/:productId',
  [param('productId').isUUID()],
  checkValidation,
  barcodesController.getProductBarcodes
);

// PUT /barcodes/:id - Update barcode
router.put(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  barcodesController.updateBarcode
);

// DELETE /barcodes/:id - Delete barcode
router.delete(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  barcodesController.deleteBarcode
);

// SKU Management

// POST /barcodes/sku/generate - Generate SKU
router.post(
  '/sku/generate',
  [body('categoryId').optional().isUUID()],
  checkValidation,
  barcodesController.generateSKU
);

// GET /barcodes/sku/config - Get SKU configuration
router.get('/sku/config', barcodesController.getSKUConfig);

// PUT /barcodes/sku/config - Update SKU configuration
router.put(
  '/sku/config',
  managerOnly,
  [
    body('prefix').optional().isString(),
    body('format').optional().isIn(['sequential', 'category_prefix', 'random', 'custom']),
    body('length').optional().isInt({ min: 4, max: 20 }),
  ],
  checkValidation,
  barcodesController.updateSKUConfig
);

// Batch/Lot Management

// POST /barcodes/batches - Create batch
router.post(
  '/batches',
  [
    body('productId').isUUID().withMessage('Product ID required'),
    body('batchNumber').notEmpty().withMessage('Batch number required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity required'),
    body('manufacturingDate').optional().isISO8601(),
    body('expirationDate').optional().isISO8601(),
    body('locationId').optional().isUUID(),
  ],
  checkValidation,
  barcodesController.createBatch
);

// GET /barcodes/batches/product/:productId - Get product batches
router.get(
  '/batches/product/:productId',
  [
    param('productId').isUUID(),
    query('includeExpired').optional().isBoolean(),
    query('includeEmpty').optional().isBoolean(),
  ],
  checkValidation,
  barcodesController.getProductBatches
);

// GET /barcodes/batches/:id - Get batch by ID
router.get(
  '/batches/:id',
  [param('id').isUUID()],
  checkValidation,
  barcodesController.getBatch
);

// PUT /barcodes/batches/:id - Update batch
router.put(
  '/batches/:id',
  [param('id').isUUID()],
  checkValidation,
  barcodesController.updateBatch
);

// POST /barcodes/batches/allocate - Allocate from batches (FEFO)
router.post(
  '/batches/allocate',
  [
    body('productId').isUUID().withMessage('Product ID required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity required'),
    body('locationId').optional().isUUID(),
    body('preferBatch').optional().isUUID(),
  ],
  checkValidation,
  barcodesController.allocateFromBatches
);

// GET /barcodes/batches/expiring - Get expiring batches
router.get(
  '/batches/expiring',
  [query('days').optional().isInt({ min: 1, max: 365 })],
  checkValidation,
  barcodesController.getExpiringBatches
);

// Scan Logs

// GET /barcodes/scans - Get scan logs
router.get(
  '/scans',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isUUID(),
    query('productId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  checkValidation,
  barcodesController.getScanLogs
);

// GET /barcodes/image/:barcode - Generate barcode image
router.get(
  '/image/:barcode',
  [
    param('barcode').notEmpty(),
    query('type').optional().isString(),
    query('format').optional().isIn(['svg', 'png']),
  ],
  checkValidation,
  barcodesController.generateBarcodeImage
);

export default router;
