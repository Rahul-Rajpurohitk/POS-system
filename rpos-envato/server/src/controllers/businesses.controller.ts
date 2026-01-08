import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business.entity';
import { logService } from '../services/log.service';
import { auditService, AuditEventType } from '../services/audit.service';

const businessRepository = AppDataSource.getRepository(Business);

/**
 * Get current business details
 * GET /businesses/me
 */
export const getCurrentBusiness = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const business = await businessRepository.findOne({
    where: { id: req.businessId },
  });

  if (!business) {
    return res.status(404).json({
      success: false,
      message: 'Business not found',
    });
  }

  res.json({
    success: true,
    data: business,
  });
});

/**
 * Update business settings
 * PUT /businesses/me
 */
export const updateBusiness = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, tax, currency, language, timezone, settings } = req.body;

  const business = await businessRepository.findOne({
    where: { id: req.businessId },
  });

  if (!business) {
    return res.status(404).json({
      success: false,
      message: 'Business not found',
    });
  }

  const previousValues = { ...business };

  if (name !== undefined) business.name = name;
  if (tax !== undefined) business.tax = tax;
  if (currency !== undefined) business.currency = currency;
  if (language !== undefined) business.language = language;
  if (timezone !== undefined) business.timezone = timezone;
  if (settings !== undefined) {
    business.settings = { ...business.settings, ...settings };
  }

  await businessRepository.save(business);

  // Audit log
  await auditService.log({
    eventType: AuditEventType.SETTINGS_CHANGE,
    userId: req.userId!,
    businessId: req.businessId!,
    description: 'Business settings updated',
    metadata: {
      previousValues: { name: previousValues.name, tax: previousValues.tax },
      newValues: { name: business.name, tax: business.tax },
    },
  });

  res.json({
    success: true,
    message: 'Business updated successfully',
    data: business,
  });
});

/**
 * Get activity logs
 * GET /businesses/logs
 */
export const getLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const type = req.query.type as string;

  const logs = await logService.getLogs(req.businessId!, {
    page,
    limit,
    type,
  });

  res.json({
    success: true,
    data: logs.items,
    pagination: {
      page: logs.page,
      limit: logs.limit,
      total: logs.total,
      pages: Math.ceil(logs.total / logs.limit),
    },
  });
});

/**
 * Get business statistics dashboard
 * GET /businesses/stats
 */
export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const business = await businessRepository.findOne({
    where: { id: req.businessId },
    relations: ['users', 'products', 'categories', 'customers', 'orders'],
  });

  if (!business) {
    return res.status(404).json({
      success: false,
      message: 'Business not found',
    });
  }

  res.json({
    success: true,
    data: {
      usersCount: business.users?.length || 0,
      productsCount: business.products?.length || 0,
      categoriesCount: business.categories?.length || 0,
      customersCount: business.customers?.length || 0,
      ordersCount: business.orders?.length || 0,
    },
  });
});

export default {
  getCurrentBusiness,
  updateBusiness,
  getLogs,
  getStats,
};
