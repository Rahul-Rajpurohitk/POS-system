import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { param, query, body } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import * as productImportController from '../controllers/product-import.controller';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['csv', 'xls', 'xlsx'];
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (allowedTypes.includes(file.mimetype) || (ext && allowedExtensions.includes(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
});

// Rate limiter for import operations (5 per minute)
const importLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, message: 'Too many import requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(auth);

// GET /products/import/template - Download CSV template
router.get('/template', productImportController.getTemplate);

// POST /products/import/validate - Validate import file without importing
router.post(
  '/validate',
  importLimiter,
  upload.single('file'),
  productImportController.validateImport
);

// POST /products/import/check-dupes - Check for duplicate products
router.post(
  '/check-dupes',
  upload.single('file'),
  [body('columnMapping').optional().isString()],
  checkValidation,
  productImportController.checkDuplicates
);

// POST /products/import - Execute import
router.post(
  '/',
  managerOnly,
  importLimiter,
  upload.single('file'),
  [
    body('columnMapping').optional(),
    body('duplicateAction')
      .optional()
      .isIn(['skip', 'update', 'create_new'])
      .withMessage('Invalid duplicate action'),
  ],
  checkValidation,
  productImportController.executeImport
);

// GET /products/import/history - Get import history
router.get(
  '/history',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  checkValidation,
  productImportController.getImportHistory
);

// GET /products/import/:id - Get import job status
router.get(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  productImportController.getImportJob
);

// POST /products/import/:id/rollback - Rollback import
router.post(
  '/:id/rollback',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  productImportController.rollbackImport
);

export default router;
