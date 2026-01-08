import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { shiftService } from '../services/shift.service';
import { CashMovementType } from '../entities/Shift.entity';

/**
 * Start a new shift
 * POST /shifts/start
 */
export const startShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { registerId, openingCash, locationId, notes } = req.body;

  const shift = await shiftService.startShift({
    businessId: req.businessId!,
    userId: req.userId!,
    registerId,
    openingCash,
    locationId,
    notes,
  });

  res.status(201).json({
    success: true,
    message: 'Shift started successfully',
    data: shift,
  });
});

/**
 * End current shift
 * POST /shifts/end
 */
export const endShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { shiftId, closingCash, notes } = req.body;

  const shift = await shiftService.endShift({
    shiftId,
    businessId: req.businessId!,
    userId: req.userId!,
    closingCash,
    notes,
  });

  res.json({
    success: true,
    message: 'Shift ended successfully',
    data: shift,
  });
});

/**
 * Get current active shift for user
 * GET /shifts/current
 */
export const getCurrentShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const shift = await shiftService.getCurrentShift(req.userId!, req.businessId!);

  res.json({
    success: true,
    data: shift,
  });
});

/**
 * Get shift by ID
 * GET /shifts/:id
 */
export const getShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const shift = await shiftService.getShiftById(req.params.id, req.businessId!);

  if (!shift) {
    return res.status(404).json({
      success: false,
      message: 'Shift not found',
    });
  }

  res.json({
    success: true,
    data: shift,
  });
});

/**
 * Get all shifts
 * GET /shifts
 */
export const getShifts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const userId = req.query.userId as string;
  const status = req.query.status as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const locationId = req.query.locationId as string;

  const result = await shiftService.getShifts(req.businessId!, {
    page,
    limit,
    userId,
    status,
    startDate,
    endDate,
    locationId,
  });

  res.json({
    success: true,
    data: result.shifts,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Record cash movement (pay in/out)
 * POST /shifts/:id/cash-movement
 */
export const recordCashMovement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, amount, reason, reference } = req.body;

  const movement = await shiftService.recordCashMovement({
    shiftId: req.params.id,
    businessId: req.businessId!,
    performedById: req.userId!,
    type: type as CashMovementType,
    amount,
    reason,
    reference,
  });

  res.status(201).json({
    success: true,
    message: `Cash ${type === CashMovementType.PAY_IN ? 'added to' : 'removed from'} drawer`,
    data: movement,
  });
});

/**
 * Get cash movements for a shift
 * GET /shifts/:id/cash-movements
 */
export const getCashMovements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const movements = await shiftService.getCashMovements(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: movements,
  });
});

/**
 * Get shift summary
 * GET /shifts/:id/summary
 */
export const getShiftSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const summary = await shiftService.getShiftSummary(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Perform blind count (without showing expected values)
 * POST /shifts/:id/blind-count
 */
export const blindCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { countedCash, denominations } = req.body;

  const result = await shiftService.performBlindCount({
    shiftId: req.params.id,
    businessId: req.businessId!,
    userId: req.userId!,
    countedCash,
    denominations,
  });

  res.json({
    success: true,
    message: 'Blind count recorded',
    data: result,
  });
});

/**
 * Get variance report for a shift
 * GET /shifts/:id/variance
 */
export const getVarianceReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const variance = await shiftService.getVarianceReport(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: variance,
  });
});

/**
 * Approve shift with variance
 * POST /shifts/:id/approve
 */
export const approveShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { varianceReason, approvalNotes } = req.body;

  const shift = await shiftService.approveShift({
    shiftId: req.params.id,
    businessId: req.businessId!,
    approvedById: req.userId!,
    varianceReason,
    approvalNotes,
  });

  res.json({
    success: true,
    message: 'Shift approved',
    data: shift,
  });
});

/**
 * Get active shifts for all registers
 * GET /shifts/active
 */
export const getActiveShifts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  const shifts = await shiftService.getActiveShifts(req.businessId!, locationId);

  res.json({
    success: true,
    data: shifts,
  });
});

export default {
  startShift,
  endShift,
  getCurrentShift,
  getShift,
  getShifts,
  recordCashMovement,
  getCashMovements,
  getShiftSummary,
  blindCount,
  getVarianceReport,
  approveShift,
  getActiveShifts,
};
