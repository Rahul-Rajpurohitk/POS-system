import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as categoriesController from '../controllers/categories.controller';

const router = Router();

// GET /categories/sync
router.get('/sync', staff, readLimiter, catchAsync(categoriesController.syncCategories));

// GET /categories
router.get('/', staff, readLimiter, catchAsync(categoriesController.getCategories));

// POST /categories
router.post(
  '/',
  manager,
  createLimiter,
  [body('name').notEmpty().withMessage('Category name is required')],
  checkValidation,
  catchAsync(categoriesController.addCategory)
);

// PUT /categories/:id
router.put(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid category ID')],
  checkValidation,
  catchAsync(categoriesController.editCategory)
);

// DELETE /categories/:id
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid category ID')],
  checkValidation,
  catchAsync(categoriesController.deleteCategory)
);

export default router;
