import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { eodService } from '../services/eod.service';

/**
 * Generate EOD report
 * POST /eod/generate
 */
export const generateEODReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date, locationId, includeOpenShifts } = req.body;

  const report = await eodService.generateEODReport({
    businessId: req.businessId!,
    generatedById: req.userId!,
    date: date ? new Date(date) : new Date(),
    locationId,
    includeOpenShifts,
  });

  res.status(201).json({
    success: true,
    message: 'EOD report generated successfully',
    data: report,
  });
});

/**
 * Get EOD report by ID
 * GET /eod/:id
 */
export const getEODReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await eodService.getEODReportById(req.params.id, req.businessId!);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'EOD report not found',
    });
  }

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get all EOD reports
 * GET /eod
 */
export const getEODReports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const locationId = req.query.locationId as string;

  const result = await eodService.getEODReports(req.businessId!, {
    page,
    limit,
    status,
    startDate,
    endDate,
    locationId,
  });

  res.json({
    success: true,
    data: result.reports,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get EOD report for specific date
 * GET /eod/date/:date
 */
export const getEODReportByDate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const date = new Date(req.params.date);
  const locationId = req.query.locationId as string;

  const report = await eodService.getEODReportByDate(req.businessId!, date, locationId);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'No EOD report found for this date',
    });
  }

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Review EOD report (manager approval)
 * POST /eod/:id/review
 */
export const reviewEODReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { approved, notes, adjustments } = req.body;

  const report = await eodService.reviewEODReport({
    reportId: req.params.id,
    businessId: req.businessId!,
    reviewedById: req.userId!,
    approved,
    notes,
    adjustments,
  });

  res.json({
    success: true,
    message: approved ? 'EOD report approved' : 'EOD report rejected',
    data: report,
  });
});

/**
 * Finalize EOD report
 * POST /eod/:id/finalize
 */
export const finalizeEODReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await eodService.finalizeEODReport(req.params.id, req.businessId!, req.userId!);

  res.json({
    success: true,
    message: 'EOD report finalized',
    data: report,
  });
});

/**
 * Get reconciliation details
 * GET /eod/:id/reconciliation
 */
export const getReconciliation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reconciliation = await eodService.getReconciliationDetails(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: reconciliation,
  });
});

/**
 * Add reconciliation note/adjustment
 * POST /eod/:id/reconciliation/note
 */
export const addReconciliationNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { category, amount, reason, reference } = req.body;

  const report = await eodService.addReconciliationAdjustment({
    reportId: req.params.id,
    businessId: req.businessId!,
    addedById: req.userId!,
    category,
    amount,
    reason,
    reference,
  });

  res.json({
    success: true,
    message: 'Reconciliation note added',
    data: report,
  });
});

/**
 * Get EOD summary statistics
 * GET /eod/summary
 */
export const getEODSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const locationId = req.query.locationId as string;

  const summary = await eodService.getEODSummary(req.businessId!, {
    startDate,
    endDate,
    locationId,
  });

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Export EOD report
 * GET /eod/:id/export
 */
export const exportEODReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const format = (req.query.format as string) || 'pdf';

  const exportData = await eodService.exportEODReport(req.params.id, req.businessId!, format);

  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  res.set({
    'Content-Type': contentTypes[format] || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="eod-report-${req.params.id}.${format}"`,
  });

  res.send(exportData);
});

/**
 * Check if EOD can be generated for today
 * GET /eod/check
 */
export const checkEODReadiness = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  const readiness = await eodService.checkEODReadiness(req.businessId!, locationId);

  res.json({
    success: true,
    data: readiness,
  });
});

/**
 * Get pending EOD items (open shifts, unreconciled transactions)
 * GET /eod/pending
 */
export const getPendingItems = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  const pending = await eodService.getPendingItems(req.businessId!, locationId);

  res.json({
    success: true,
    data: pending,
  });
});

export default {
  generateEODReport,
  getEODReport,
  getEODReports,
  getEODReportByDate,
  reviewEODReport,
  finalizeEODReport,
  getReconciliation,
  addReconciliationNote,
  getEODSummary,
  exportEODReport,
  checkEODReadiness,
  getPendingItems,
};
