import { Router } from 'express';
import { param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { uploadLimiter, readLimiter, createLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as filesController from '../controllers/files.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /files/upload - Upload single image (strict rate limit)
router.post(
  '/upload',
  uploadLimiter,
  filesController.upload.single('image'),
  catchAsync(filesController.uploadImage)
);

// POST /files/upload-multiple - Upload multiple images (strict rate limit)
router.post(
  '/upload-multiple',
  uploadLimiter,
  filesController.upload.array('images', 10),
  catchAsync(filesController.uploadMultiple)
);

// GET /files - List files
router.get(
  '/',
  readLimiter,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['image', 'document', 'other']),
  ],
  checkValidation,
  catchAsync(filesController.listFiles)
);

// GET /files/:id - Get file by ID
router.get(
  '/:id',
  readLimiter,
  [param('id').isUUID().withMessage('Invalid file ID')],
  checkValidation,
  catchAsync(filesController.getFile)
);

// DELETE /files/:id - Delete file
router.delete(
  '/:id',
  createLimiter,
  [param('id').isUUID().withMessage('Invalid file ID')],
  checkValidation,
  catchAsync(filesController.deleteFile)
);

export default router;
