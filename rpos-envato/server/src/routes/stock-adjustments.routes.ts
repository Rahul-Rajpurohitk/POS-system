import { Router, Request, Response } from 'express';
import { staff } from '../middlewares';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import {
  stockAdjustmentService,
  CreateStockAdjustmentDTO,
} from '../services/stock-adjustment.service';
import { StockAdjustmentType } from '../entities/StockAdjustment.entity';

const router = Router();

/**
 * GET /api/stock-adjustments
 * Get stock adjustments with optional filters
 */
router.get('/', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId, type, startDate, endDate, supplierId, locationId, limit, offset } = req.query;

  const result = await stockAdjustmentService.getStockHistory({
    businessId: req.business!,
    productId: productId as string,
    type: type as StockAdjustmentType,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    supplierId: supplierId as string,
    locationId: locationId as string,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  res.json(result);
}));

/**
 * GET /api/stock-adjustments/product/:productId
 * Get stock history for a specific product
 */
router.get('/product/:productId', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit } = req.query;

  const result = await stockAdjustmentService.getStockHistory({
    businessId: req.business!,
    productId,
    limit: limit ? parseInt(limit as string, 10) : 50,
  });

  res.json(result);
}));

/**
 * GET /api/stock-adjustments/product/:productId/recent
 * Get recent activity for a product
 */
router.get('/product/:productId/recent', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit } = req.query;

  const adjustments = await stockAdjustmentService.getRecentActivity(
    req.business!,
    productId,
    limit ? parseInt(limit as string, 10) : 10
  );

  res.json({ adjustments });
}));

/**
 * GET /api/stock-adjustments/product/:productId/last-batch-order
 * Get the last batch order for a product
 */
router.get('/product/:productId/last-batch-order', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;

  const result = await stockAdjustmentService.getLastBatchOrder(
    req.business!,
    productId
  );

  res.json(result || { purchaseOrder: null, receivedQuantity: 0, unitCost: 0, totalCost: 0 });
}));

/**
 * GET /api/stock-adjustments/product/:productId/stats
 * Get stock statistics for a product
 */
router.get('/product/:productId/stats', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { days } = req.query;

  const stats = await stockAdjustmentService.getProductStockStats(
    req.business!,
    productId,
    days ? parseInt(days as string, 10) : 30
  );

  res.json(stats);
}));

/**
 * POST /api/stock-adjustments
 * Create a new stock adjustment
 */
router.post('/', staff, catchAsync(async (req: Request, res: Response) => {
  const data: CreateStockAdjustmentDTO = {
    ...req.body,
    businessId: req.business!,
    createdById: req.userId!,
  };

  const adjustment = await stockAdjustmentService.createAdjustment(data);
  res.status(201).json(adjustment);
}));

/**
 * POST /api/stock-adjustments/damage
 * Record damage/loss
 */
router.post('/damage', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId, quantity, reason, notes } = req.body;

  const adjustment = await stockAdjustmentService.createAdjustment({
    businessId: req.business!,
    productId,
    type: StockAdjustmentType.DAMAGE,
    quantity: -Math.abs(quantity), // Always negative
    reason: reason || 'Damage/Loss',
    notes,
    createdById: req.userId!,
  });

  res.status(201).json(adjustment);
}));

/**
 * POST /api/stock-adjustments/count
 * Record inventory count adjustment
 */
router.post('/count', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId, newQuantity, reason, notes } = req.body;

  // We need to calculate the difference
  const result = await stockAdjustmentService.getStockHistory({
    businessId: req.business!,
    productId,
    limit: 1,
  });

  // Get current stock from the last adjustment or product
  const currentStock = result.adjustments.length > 0
    ? result.adjustments[0].newStock
    : 0;

  const difference = newQuantity - currentStock;

  if (difference === 0) {
    res.json({ message: 'No adjustment needed, stock matches' });
    return;
  }

  const adjustment = await stockAdjustmentService.createAdjustment({
    businessId: req.business!,
    productId,
    type: StockAdjustmentType.COUNT,
    quantity: difference,
    reason: reason || 'Inventory count adjustment',
    notes,
    createdById: req.userId!,
  });

  res.status(201).json(adjustment);
}));

/**
 * POST /api/stock-adjustments/case-receiving
 * Record receiving stock in cases (for case-based ordering)
 *
 * Example: Liquor store receives 5 cases of wine, 12 bottles/case, $120/case
 * Request body: { productId, caseQuantity: 5, caseCost: 120, ... }
 * Result: Stock increases by 60 bottles, unit cost = $10/bottle
 */
router.post('/case-receiving', staff, catchAsync(async (req: Request, res: Response) => {
  const {
    productId,
    caseQuantity,
    caseCost,
    supplierId,
    purchaseOrderId,
    batchNumber,
    lotNumber,
    expirationDate,
    notes,
  } = req.body;

  // Validate required fields
  if (!productId || !caseQuantity || !caseCost) {
    res.status(400).json({
      error: 'Missing required fields: productId, caseQuantity, caseCost',
    });
    return;
  }

  // Get product to determine units per case
  const { AppDataSource } = await import('../config/database');
  const { Product } = await import('../entities/Product.entity');
  const productRepository = AppDataSource.getRepository(Product);

  const product = await productRepository.findOne({
    where: { id: productId, businessId: req.business! },
  });

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (!product.caseSize) {
    res.status(400).json({
      error: 'Product does not have case configuration. Set caseSize first.',
    });
    return;
  }

  const adjustment = await stockAdjustmentService.recordCaseReceiving({
    businessId: req.business!,
    productId,
    caseQuantity: parseInt(caseQuantity, 10),
    unitsPerCase: product.unitsPerCase,
    caseCost: parseFloat(caseCost),
    supplierId,
    purchaseOrderId,
    batchNumber,
    lotNumber,
    expirationDate: expirationDate ? new Date(expirationDate) : undefined,
    createdById: req.userId!,
    notes,
  });

  res.status(201).json(adjustment);
}));

/**
 * POST /api/stock-adjustments/pack-receiving
 * Record receiving stock in packs (for pack-based ordering)
 */
router.post('/pack-receiving', staff, catchAsync(async (req: Request, res: Response) => {
  const {
    productId,
    packQuantity,
    packCost,
    supplierId,
    purchaseOrderId,
    batchNumber,
    lotNumber,
    expirationDate,
    notes,
  } = req.body;

  // Validate required fields
  if (!productId || !packQuantity || !packCost) {
    res.status(400).json({
      error: 'Missing required fields: productId, packQuantity, packCost',
    });
    return;
  }

  // Get product to determine units per pack
  const { AppDataSource } = await import('../config/database');
  const { Product } = await import('../entities/Product.entity');
  const productRepository = AppDataSource.getRepository(Product);

  const product = await productRepository.findOne({
    where: { id: productId, businessId: req.business! },
  });

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (!product.packSize) {
    res.status(400).json({
      error: 'Product does not have pack configuration. Set packSize first.',
    });
    return;
  }

  const adjustment = await stockAdjustmentService.recordPackReceiving({
    businessId: req.business!,
    productId,
    packQuantity: parseInt(packQuantity, 10),
    unitsPerPack: product.unitsPerPack,
    packCost: parseFloat(packCost),
    supplierId,
    purchaseOrderId,
    batchNumber,
    lotNumber,
    expirationDate: expirationDate ? new Date(expirationDate) : undefined,
    createdById: req.userId!,
    notes,
  });

  res.status(201).json(adjustment);
}));

export default router;
