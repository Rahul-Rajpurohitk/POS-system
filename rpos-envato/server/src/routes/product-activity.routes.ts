import { Router, Request, Response } from 'express';
import { staff } from '../middlewares';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import { productActivityService } from '../services/product-activity.service';
import { ProductActivityType } from '../entities/ProductActivity.entity';

const router = Router();

/**
 * GET /api/product-activities
 * Get all product activities with optional filters
 */
router.get('/', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId, type, startDate, endDate, userId, limit, offset } = req.query;

  const result = await productActivityService.getActivities({
    businessId: req.business!,
    productId: productId as string,
    type: type as ProductActivityType,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    userId: userId as string,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  res.json(result);
}));

/**
 * GET /api/product-activities/product/:productId
 * Get activity history for a specific product
 */
router.get('/product/:productId', staff, catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit } = req.query;

  const activities = await productActivityService.getProductActivity(
    req.business!,
    productId,
    limit ? parseInt(limit as string, 10) : 20
  );

  res.json({ activities });
}));

export default router;
