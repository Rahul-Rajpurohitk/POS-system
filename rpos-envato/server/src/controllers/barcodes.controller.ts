import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { barcodeService } from '../services/barcode.service';
import { BarcodeType } from '../entities/Barcode.entity';

/**
 * Validate a barcode
 * POST /barcodes/validate
 */
export const validateBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { barcode, type } = req.body;

  const result = barcodeService.validateBarcode(barcode, type);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Lookup product by barcode
 * GET /barcodes/lookup/:barcode
 */
export const lookupBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { barcode } = req.params;
  const locationId = req.query.locationId as string;
  const logScan = req.query.logScan !== 'false';

  const result = await barcodeService.lookupByBarcode(req.businessId!, barcode, {
    locationId,
    userId: req.userId,
    logScan,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Register barcode for a product
 * POST /barcodes
 */
export const registerBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const barcode = await barcodeService.registerBarcode({
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Barcode registered successfully',
    data: barcode,
  });
});

/**
 * Get barcodes for a product
 * GET /barcodes/product/:productId
 */
export const getProductBarcodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const barcodes = await barcodeService.getProductBarcodes(req.params.productId, req.businessId!);

  res.json({
    success: true,
    data: barcodes,
  });
});

/**
 * Update barcode
 * PUT /barcodes/:id
 */
export const updateBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const barcode = await barcodeService.updateBarcode(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Barcode updated successfully',
    data: barcode,
  });
});

/**
 * Delete barcode
 * DELETE /barcodes/:id
 */
export const deleteBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await barcodeService.deleteBarcode(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Barcode deleted successfully',
  });
});

// SKU Management

/**
 * Generate SKU for a product
 * POST /barcodes/sku/generate
 */
export const generateSKU = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { categoryId } = req.body;

  const sku = await barcodeService.generateSKU(req.businessId!, categoryId);

  res.json({
    success: true,
    data: { sku },
  });
});

/**
 * Get SKU configuration
 * GET /barcodes/sku/config
 */
export const getSKUConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const config = await barcodeService.getSKUConfiguration(req.businessId!);

  res.json({
    success: true,
    data: config,
  });
});

/**
 * Update SKU configuration
 * PUT /barcodes/sku/config
 */
export const updateSKUConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const config = await barcodeService.updateSKUConfiguration(req.businessId!, req.body);

  res.json({
    success: true,
    message: 'SKU configuration updated',
    data: config,
  });
});

// Batch/Lot Management

/**
 * Create product batch
 * POST /barcodes/batches
 */
export const createBatch = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const batch = await barcodeService.createBatch({
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Batch created successfully',
    data: batch,
  });
});

/**
 * Get batches for a product
 * GET /barcodes/batches/product/:productId
 */
export const getProductBatches = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const includeExpired = req.query.includeExpired === 'true';
  const includeEmpty = req.query.includeEmpty === 'true';

  const batches = await barcodeService.getProductBatches(req.params.productId, req.businessId!, {
    includeExpired,
    includeEmpty,
  });

  res.json({
    success: true,
    data: batches,
  });
});

/**
 * Get batch by ID
 * GET /barcodes/batches/:id
 */
export const getBatch = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const batch = await barcodeService.getBatchById(req.params.id, req.businessId!);

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: 'Batch not found',
    });
  }

  res.json({
    success: true,
    data: batch,
  });
});

/**
 * Update batch
 * PUT /barcodes/batches/:id
 */
export const updateBatch = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const batch = await barcodeService.updateBatch(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Batch updated successfully',
    data: batch,
  });
});

/**
 * Allocate stock from batches (FEFO)
 * POST /barcodes/batches/allocate
 */
export const allocateFromBatches = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { productId, quantity, locationId, preferBatch } = req.body;

  const allocations = await barcodeService.allocateFromBatches(productId, quantity, {
    locationId,
    preferBatch,
  });

  res.json({
    success: true,
    data: allocations,
  });
});

/**
 * Get expiring batches report
 * GET /barcodes/batches/expiring
 */
export const getExpiringBatches = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;

  const batches = await barcodeService.getExpiringBatches(req.businessId!, days);

  res.json({
    success: true,
    data: batches,
  });
});

// Scan Logs

/**
 * Get scan logs
 * GET /barcodes/scans
 */
export const getScanLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const userId = req.query.userId as string;
  const productId = req.query.productId as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const result = await barcodeService.getScanLogs(req.businessId!, {
    page,
    limit,
    userId,
    productId,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: result.logs,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Generate barcode image
 * GET /barcodes/image/:barcode
 */
export const generateBarcodeImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { barcode } = req.params;
  const type = (req.query.type as BarcodeType) || BarcodeType.CODE_128;
  const format = (req.query.format as string) || 'svg';

  const image = await barcodeService.generateBarcodeImage(barcode, type, format);

  const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';
  res.set('Content-Type', contentType);
  res.send(image);
});

export default {
  validateBarcode,
  lookupBarcode,
  registerBarcode,
  getProductBarcodes,
  updateBarcode,
  deleteBarcode,
  generateSKU,
  getSKUConfig,
  updateSKUConfig,
  createBatch,
  getProductBatches,
  getBatch,
  updateBatch,
  allocateFromBatches,
  getExpiringBatches,
  getScanLogs,
  generateBarcodeImage,
};
