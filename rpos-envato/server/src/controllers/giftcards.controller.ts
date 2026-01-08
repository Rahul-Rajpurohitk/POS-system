import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { giftCardService } from '../services/giftcard.service';

/**
 * Create a new gift card
 * POST /giftcards
 */
export const createGiftCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const giftCard = await giftCardService.createGiftCard({
    businessId: req.businessId!,
    issuedById: req.userId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Gift card created successfully',
    data: giftCard,
  });
});

/**
 * Get all gift cards
 * GET /giftcards
 */
export const getGiftCards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const customerId = req.query.customerId as string;
  const type = req.query.type as string;

  const result = await giftCardService.getGiftCards(req.businessId!, {
    page,
    limit,
    status,
    customerId,
    type,
  });

  res.json({
    success: true,
    data: result.giftCards,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get gift card by code
 * GET /giftcards/code/:code
 */
export const getGiftCardByCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const giftCard = await giftCardService.getGiftCardByCode(req.params.code, req.businessId!);

  if (!giftCard) {
    return res.status(404).json({
      success: false,
      message: 'Gift card not found',
    });
  }

  res.json({
    success: true,
    data: giftCard,
  });
});

/**
 * Get gift card by ID
 * GET /giftcards/:id
 */
export const getGiftCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const giftCard = await giftCardService.getGiftCardById(req.params.id, req.businessId!);

  if (!giftCard) {
    return res.status(404).json({
      success: false,
      message: 'Gift card not found',
    });
  }

  res.json({
    success: true,
    data: giftCard,
  });
});

/**
 * Check gift card balance
 * GET /giftcards/balance/:code
 */
export const checkBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const balance = await giftCardService.checkBalance(req.params.code, req.businessId!);

  res.json({
    success: true,
    data: balance,
  });
});

/**
 * Activate a gift card
 * POST /giftcards/:id/activate
 */
export const activateGiftCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const giftCard = await giftCardService.activateGiftCard(req.params.id, req.businessId!, req.userId!);

  res.json({
    success: true,
    message: 'Gift card activated',
    data: giftCard,
  });
});

/**
 * Deactivate a gift card
 * POST /giftcards/:id/deactivate
 */
export const deactivateGiftCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;

  const giftCard = await giftCardService.deactivateGiftCard(req.params.id, req.businessId!, req.userId!, reason);

  res.json({
    success: true,
    message: 'Gift card deactivated',
    data: giftCard,
  });
});

/**
 * Add value to gift card (reload)
 * POST /giftcards/:id/reload
 */
export const reloadGiftCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { amount, paymentMethod, paymentReference } = req.body;

  const transaction = await giftCardService.reloadGiftCard({
    giftCardId: req.params.id,
    businessId: req.businessId!,
    performedById: req.userId!,
    amount,
    paymentMethod,
    paymentReference,
  });

  res.json({
    success: true,
    message: 'Gift card reloaded successfully',
    data: transaction,
  });
});

/**
 * Redeem gift card (deduct value)
 * POST /giftcards/:id/redeem
 */
export const redeemGiftCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { amount, orderId, notes } = req.body;

  const transaction = await giftCardService.redeemGiftCard({
    giftCardId: req.params.id,
    businessId: req.businessId!,
    performedById: req.userId!,
    amount,
    orderId,
    notes,
  });

  res.json({
    success: true,
    message: 'Gift card redeemed successfully',
    data: transaction,
  });
});

/**
 * Redeem gift card by code
 * POST /giftcards/redeem
 */
export const redeemByCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { code, amount, orderId, notes } = req.body;

  const transaction = await giftCardService.redeemByCode({
    code,
    businessId: req.businessId!,
    performedById: req.userId!,
    amount,
    orderId,
    notes,
  });

  res.json({
    success: true,
    message: 'Gift card redeemed successfully',
    data: transaction,
  });
});

/**
 * Transfer balance to another gift card
 * POST /giftcards/:id/transfer
 */
export const transferBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { targetGiftCardId, amount } = req.body;

  const result = await giftCardService.transferBalance({
    sourceGiftCardId: req.params.id,
    targetGiftCardId,
    businessId: req.businessId!,
    performedById: req.userId!,
    amount,
  });

  res.json({
    success: true,
    message: 'Balance transferred successfully',
    data: result,
  });
});

/**
 * Get transaction history for a gift card
 * GET /giftcards/:id/transactions
 */
export const getTransactionHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await giftCardService.getTransactionHistory(req.params.id, req.businessId!, {
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.transactions,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Generate batch of gift cards
 * POST /giftcards/batch
 */
export const generateBatch = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { quantity, initialBalance, type, expirationDate, prefix } = req.body;

  const giftCards = await giftCardService.generateBatch({
    businessId: req.businessId!,
    issuedById: req.userId!,
    quantity,
    initialBalance,
    type,
    expirationDate,
    prefix,
  });

  res.status(201).json({
    success: true,
    message: `${giftCards.length} gift cards generated`,
    data: giftCards,
  });
});

/**
 * Get gift card statistics
 * GET /giftcards/stats
 */
export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await giftCardService.getStatistics(req.businessId!);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Assign gift card to customer
 * POST /giftcards/:id/assign
 */
export const assignToCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.body;

  const giftCard = await giftCardService.assignToCustomer(req.params.id, req.businessId!, customerId);

  res.json({
    success: true,
    message: 'Gift card assigned to customer',
    data: giftCard,
  });
});

/**
 * Get gift cards for a customer
 * GET /giftcards/customer/:customerId
 */
export const getCustomerGiftCards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const giftCards = await giftCardService.getCustomerGiftCards(req.params.customerId, req.businessId!);

  res.json({
    success: true,
    data: giftCards,
  });
});

export default {
  createGiftCard,
  getGiftCards,
  getGiftCardByCode,
  getGiftCard,
  checkBalance,
  activateGiftCard,
  deactivateGiftCard,
  reloadGiftCard,
  redeemGiftCard,
  redeemByCode,
  transferBalance,
  getTransactionHistory,
  generateBatch,
  getStats,
  assignToCustomer,
  getCustomerGiftCards,
};
