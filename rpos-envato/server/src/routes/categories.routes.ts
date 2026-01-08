import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import * as categoriesController from '../controllers/categories.controller';

const router = Router();

// GET /categories/sync
router.get('/sync', staff, categoriesController.syncCategories);

// GET /categories
router.get('/', staff, categoriesController.getCategories);

// POST /categories
router.post(
  '/',
  manager,
  [body('name').notEmpty().withMessage('Category name is required')],
  checkValidation,
  categoriesController.addCategory
);

// PUT /categories/:id
router.put(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid category ID')],
  checkValidation,
  categoriesController.editCategory
);

// DELETE /categories/:id
router.delete(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid category ID')],
  checkValidation,
  categoriesController.deleteCategory
);

export default router;
