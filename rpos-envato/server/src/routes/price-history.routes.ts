import { Router, Request, Response } from 'express';
import { staff } from '../middlewares';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import {
  priceHistoryService,
  RecordPriceChangeDTO,
} from '../services/price-history.service';
import { PriceChangeType, PriceChangeReason } from '../entities/PriceHistory.entity';

const router = Router();

/**
 * GET /api/price-history
 * Get price history with optional filters
 */
router.get('/', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId, priceType, startDate, endDate, limit, offset } = req.query;

  const history = await priceHistoryService.getProductPriceHistory({
    businessId: req.business!,
    productId: productId as string,
    priceType: priceType as PriceChangeType,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });

  res.json({ history });
}));

/**
 * GET /api/price-history/product/:productId
 * Get price history for a specific product
 */
router.get('/product/:productId', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { priceType, limit } = req.query;

  const history = await priceHistoryService.getProductPriceHistory({
    businessId: req.business!,
    productId,
    priceType: priceType as PriceChangeType,
    limit: limit ? parseInt(limit as string, 10) : 20,
  });

  res.json({ history });
}));

/**
 * GET /api/price-history/product/:productId/margin-trend
 * Get margin trend for a product
 */
router.get('/product/:productId/margin-trend', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { days } = req.query;

  const trend = await priceHistoryService.getMarginTrend(
    req.business!,
    productId,
    days ? parseInt(days as string, 10) : 90
  );

  res.json(trend);
}));

/**
 * GET /api/price-history/product/:productId/cost-trend
 * Get cost trend for a product
 */
router.get('/product/:productId/cost-trend', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { days } = req.query;

  const trend = await priceHistoryService.getCostTrend(
    req.business!,
    productId,
    days ? parseInt(days as string, 10) : 90
  );

  res.json(trend);
}));

/**
 * GET /api/price-history/product/:productId/recent
 * Get recent price changes for a product
 */
router.get('/product/:productId/recent', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit } = req.query;

  const changes = await priceHistoryService.getRecentPriceChanges(
    req.business!,
    productId,
    limit ? parseInt(limit as string, 10) : 10
  );

  res.json({ changes });
}));

/**
 * GET /api/price-history/volatility-report
 * Get price volatility report for business
 */
router.get('/volatility-report', staff, catchAsync(async (req: Request, res: Response) => {
  const { days } = req.query;

  const report = await priceHistoryService.getPriceVolatilityReport(
    req.business!,
    days ? parseInt(days as string, 10) : 30
  );

  res.json(report);
}));

/**
 * GET /api/price-history/margin-alerts
 * Get margin erosion alerts for business
 */
router.get('/margin-alerts', staff, catchAsync(async (req: Request, res: Response) => {
  const { threshold } = req.query;

  const alerts = await priceHistoryService.getMarginErosionAlerts(
    req.business!,
    threshold ? parseFloat(threshold as string) : 5
  );

  res.json({ alerts });
}));

/**
 * GET /api/price-history/cost-changes
 * Get cost changes report for business
 */
router.get('/cost-changes', staff, catchAsync(async (req: Request, res: Response) => {
  const { days } = req.query;

  const report = await priceHistoryService.getCostChanges(
    req.business!,
    days ? parseInt(days as string, 10) : 30
  );

  res.json(report);
}));

/**
 * POST /api/price-history
 * Manually record a price change (for imports or manual adjustments)
 */
router.post('/', staff, catchAsync(async (req: Request, res: Response) => {
  const {
    productId,
    priceType,
    oldPrice,
    newPrice,
    reason,
    notes,
    supplierId,
    purchaseOrderId,
    effectiveDate,
    costAtChange,
  } = req.body;

  // Validate required fields
  if (!productId || !priceType || newPrice === undefined) {
    res.status(400).json({
      error: 'Missing required fields: productId, priceType, newPrice',
    });
    return;
  }

  // Validate priceType
  if (!Object.values(PriceChangeType).includes(priceType)) {
    res.status(400).json({
      error: `Invalid priceType. Must be one of: ${Object.values(PriceChangeType).join(', ')}`,
    });
    return;
  }

  const data: RecordPriceChangeDTO = {
    businessId: req.business!,
    productId,
    priceType,
    oldPrice: oldPrice !== undefined ? parseFloat(oldPrice) : null,
    newPrice: parseFloat(newPrice),
    reason: reason as PriceChangeReason || PriceChangeReason.MANUAL,
    notes,
    supplierId,
    purchaseOrderId,
    changedById: req.userId!,
    effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
    costAtChange: costAtChange !== undefined ? parseFloat(costAtChange) : undefined,
  };

  const priceHistory = await priceHistoryService.recordPriceChange(data);

  res.status(201).json(priceHistory);
}));

export default router;
