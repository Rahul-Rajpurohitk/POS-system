import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import categoryService from '../services/category.service';

/**
 * Get all categories
 * GET /categories
 */
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.getCategories(req.business!);

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * Sync all categories (for mobile app)
 * GET /categories/sync
 */
export const syncCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.syncCategories(req.business!);

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * Add new category
 * POST /categories
 */
export const addCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory({
    ...req.body,
    businessId: req.business!,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

/**
 * Update category
 * PUT /categories/:id
 */
export const editCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await categoryService.updateCategory(id, req.business!, req.body);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

/**
 * Delete category
 * DELETE /categories/:id
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await categoryService.deleteCategory(id, req.business!);

  if (!result) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

export default {
  getCategories,
  syncCategories,
  addCategory,
  editCategory,
  deleteCategory,
};
