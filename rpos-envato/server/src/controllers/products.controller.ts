import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import productService from '../services/product.service';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';

/**
 * Get all products (paginated)
 * GET /products
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, category, search } = req.query;

  const result = await productService.getProducts(req.business!, {
    page: Number(page),
    limit: Number(limit),
    categoryId: category as string,
    search: search as string,
  });

  res.json({
    success: true,
    data: result.products,
    pagination: {
      total: result.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(result.total / Number(limit)),
    },
  });
});

/**
 * Sync all products (for mobile app)
 * GET /products/sync
 */
export const syncProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await productService.syncProducts(req.business!);

  res.json({
    success: true,
    data: products,
  });
});

/**
 * Add new product
 * POST /products
 */
export const addProduct = asyncHandler(async (req: Request, res: Response) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  const product = await productService.createProduct(
    {
      ...req.body,
      businessId: req.business!,
    },
    user
  );

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

/**
 * Update product
 * PUT /products/:id
 */
export const editProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  const product = await productService.updateProduct(id, req.business!, req.body, user);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

/**
 * Delete product
 * DELETE /products/:id
 */
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await productService.deleteProduct(id, req.business!);

  if (!result) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});

/**
 * Get product logs
 * GET /products/:id/logs
 */
export const getProductLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await productService.getProductLogs(
    id,
    req.business!,
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: result.logs,
    pagination: {
      total: result.total,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

export default {
  getProducts,
  syncProducts,
  addProduct,
  editProduct,
  deleteProduct,
  getProductLogs,
};
