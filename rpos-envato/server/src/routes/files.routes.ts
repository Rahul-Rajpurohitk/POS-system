import { Router } from 'express';
import { param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import * as filesController from '../controllers/files.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /files/upload - Upload single image
router.post(
  '/upload',
  filesController.upload.single('image'),
  filesController.uploadImage
);

// POST /files/upload-multiple - Upload multiple images
router.post(
  '/upload-multiple',
  filesController.upload.array('images', 10),
  filesController.uploadMultiple
);

// GET /files - List files
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['image', 'document', 'other']),
  ],
  checkValidation,
  filesController.listFiles
);

// GET /files/:id - Get file by ID
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid file ID')],
  checkValidation,
  filesController.getFile
);

// DELETE /files/:id - Delete file
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid file ID')],
  checkValidation,
  filesController.deleteFile
);

export default router;
