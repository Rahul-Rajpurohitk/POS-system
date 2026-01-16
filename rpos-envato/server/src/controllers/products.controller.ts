import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import productService from '../services/product.service';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';

/**
 * Get all products (paginated with advanced filtering)
 * GET /products
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    category,
    search,
    supplier,
    brand,
    hasBarcode,
    partner,
    tags,
    minMargin,
    maxMargin,
  } = req.query;

  const result = await productService.getProducts(req.business!, {
    page: Number(page),
    limit: Number(limit),
    categoryId: category as string,
    search: search as string,
    supplierId: supplier as string,
    brand: brand as string,
    hasBarcode: hasBarcode === 'true' ? true : hasBarcode === 'false' ? false : undefined,
    partnerAvailable: partner as string,
    tags: tags ? (tags as string).split(',') : undefined,
    minMargin: minMargin ? Number(minMargin) : undefined,
    maxMargin: maxMargin ? Number(maxMargin) : undefined,
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
 * Get product count
 * GET /products/count
 */
export const getProductCount = asyncHandler(async (req: Request, res: Response) => {
  const total = await productService.getProductCount(req.business!);

  res.json({
    success: true,
    data: { total },
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

/**
 * Get unique brands for filter dropdown
 * GET /products/brands
 */
export const getBrands = asyncHandler(async (req: Request, res: Response) => {
  const brands = await productService.getBrands(req.business!);

  res.json({
    success: true,
    data: brands,
  });
});

/**
 * Get unique tags for filter dropdown
 * GET /products/tags
 */
export const getTags = asyncHandler(async (req: Request, res: Response) => {
  const tags = await productService.getTags(req.business!);

  res.json({
    success: true,
    data: tags,
  });
});

/**
 * Export products for a specific partner
 * GET /products/export/:partner
 */
export const exportForPartner = asyncHandler(async (req: Request, res: Response) => {
  const { partner } = req.params;

  if (!partner) {
    return res.status(400).json({ message: 'Partner name is required' });
  }

  const exportData = await productService.exportForPartner(req.business!, partner);

  res.json({
    success: true,
    data: exportData,
  });
});

/**
 * Get product by barcode
 * GET /products/barcode/:barcode
 */
export const getProductByBarcode = asyncHandler(async (req: Request, res: Response) => {
  const { barcode } = req.params;

  const product = await productService.getProductByBarcode(req.business!, barcode);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json({
    success: true,
    data: product,
  });
});

/**
 * Get partner availability summary
 * GET /products/partners/summary
 */
export const getPartnerSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await productService.getPartnerSummary(req.business!);

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Bulk update partner availability
 * POST /products/partners/bulk-update
 */
export const bulkUpdatePartnerAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { productIds, partner, available } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ message: 'Product IDs are required' });
  }

  if (!partner) {
    return res.status(400).json({ message: 'Partner name is required' });
  }

  if (typeof available !== 'boolean') {
    return res.status(400).json({ message: 'Available must be a boolean' });
  }

  const updated = await productService.bulkUpdatePartnerAvailability(
    req.business!,
    productIds,
    partner,
    available
  );

  res.json({
    success: true,
    message: `Updated ${updated} products`,
    data: { updated },
  });
});

export default {
  getProducts,
  syncProducts,
  addProduct,
  editProduct,
  deleteProduct,
  getProductLogs,
  getBrands,
  getTags,
  exportForPartner,
  getProductByBarcode,
  getPartnerSummary,
  bulkUpdatePartnerAvailability,
};
