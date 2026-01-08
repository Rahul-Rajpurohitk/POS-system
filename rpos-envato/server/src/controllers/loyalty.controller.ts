import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { loyaltyService } from '../services/loyalty.service';

// Program Management

/**
 * Create loyalty program
 * POST /loyalty/programs
 */
export const createProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const program = await loyaltyService.createProgram({
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Loyalty program created',
    data: program,
  });
});

/**
 * Get loyalty program
 * GET /loyalty/programs/:id
 */
export const getProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const program = await loyaltyService.getProgramById(req.params.id, req.businessId!);

  if (!program) {
    return res.status(404).json({
      success: false,
      message: 'Loyalty program not found',
    });
  }

  res.json({
    success: true,
    data: program,
  });
});

/**
 * Get active loyalty program for business
 * GET /loyalty/programs/active
 */
export const getActiveProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const program = await loyaltyService.getActiveProgram(req.businessId!);

  res.json({
    success: true,
    data: program,
  });
});

/**
 * Update loyalty program
 * PUT /loyalty/programs/:id
 */
export const updateProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const program = await loyaltyService.updateProgram(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Loyalty program updated',
    data: program,
  });
});

/**
 * Delete loyalty program
 * DELETE /loyalty/programs/:id
 */
export const deleteProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await loyaltyService.deleteProgram(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Loyalty program deleted',
  });
});

// Tier Management

/**
 * Create loyalty tier
 * POST /loyalty/programs/:programId/tiers
 */
export const createTier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tier = await loyaltyService.createTier({
    programId: req.params.programId,
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Loyalty tier created',
    data: tier,
  });
});

/**
 * Get tiers for a program
 * GET /loyalty/programs/:programId/tiers
 */
export const getTiers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tiers = await loyaltyService.getTiers(req.params.programId, req.businessId!);

  res.json({
    success: true,
    data: tiers,
  });
});

/**
 * Update tier
 * PUT /loyalty/tiers/:id
 */
export const updateTier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tier = await loyaltyService.updateTier(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Loyalty tier updated',
    data: tier,
  });
});

/**
 * Delete tier
 * DELETE /loyalty/tiers/:id
 */
export const deleteTier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await loyaltyService.deleteTier(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Loyalty tier deleted',
  });
});

// Customer Accounts

/**
 * Enroll customer in loyalty program
 * POST /loyalty/accounts
 */
export const enrollCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { customerId, programId } = req.body;

  const account = await loyaltyService.enrollCustomer({
    customerId,
    programId,
    businessId: req.businessId!,
  });

  res.status(201).json({
    success: true,
    message: 'Customer enrolled in loyalty program',
    data: account,
  });
});

/**
 * Get customer loyalty account
 * GET /loyalty/accounts/customer/:customerId
 */
export const getCustomerAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const account = await loyaltyService.getCustomerAccount(req.params.customerId, req.businessId!);

  if (!account) {
    return res.status(404).json({
      success: false,
      message: 'Loyalty account not found',
    });
  }

  res.json({
    success: true,
    data: account,
  });
});

/**
 * Get loyalty account by ID
 * GET /loyalty/accounts/:id
 */
export const getAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const account = await loyaltyService.getAccountById(req.params.id, req.businessId!);

  if (!account) {
    return res.status(404).json({
      success: false,
      message: 'Loyalty account not found',
    });
  }

  res.json({
    success: true,
    data: account,
  });
});

/**
 * Get all loyalty accounts
 * GET /loyalty/accounts
 */
export const getAccounts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const tierId = req.query.tierId as string;
  const programId = req.query.programId as string;

  const result = await loyaltyService.getAccounts(req.businessId!, {
    page,
    limit,
    tierId,
    programId,
  });

  res.json({
    success: true,
    data: result.accounts,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

// Points Management

/**
 * Earn points (from purchase)
 * POST /loyalty/accounts/:id/earn
 */
export const earnPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { points, orderId, description } = req.body;

  const transaction = await loyaltyService.earnPoints({
    accountId: req.params.id,
    businessId: req.businessId!,
    points,
    orderId,
    description,
  });

  res.json({
    success: true,
    message: `${points} points earned`,
    data: transaction,
  });
});

/**
 * Redeem points
 * POST /loyalty/accounts/:id/redeem
 */
export const redeemPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { points, rewardId, orderId, description } = req.body;

  const transaction = await loyaltyService.redeemPoints({
    accountId: req.params.id,
    businessId: req.businessId!,
    points,
    rewardId,
    orderId,
    description,
  });

  res.json({
    success: true,
    message: `${points} points redeemed`,
    data: transaction,
  });
});

/**
 * Adjust points (admin correction)
 * POST /loyalty/accounts/:id/adjust
 */
export const adjustPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { points, reason } = req.body;

  const transaction = await loyaltyService.adjustPoints({
    accountId: req.params.id,
    businessId: req.businessId!,
    performedById: req.userId!,
    points,
    reason,
  });

  res.json({
    success: true,
    message: `Points adjusted by ${points}`,
    data: transaction,
  });
});

/**
 * Get points balance
 * GET /loyalty/accounts/:id/balance
 */
export const getPointsBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const balance = await loyaltyService.getPointsBalance(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: balance,
  });
});

/**
 * Get transaction history
 * GET /loyalty/accounts/:id/transactions
 */
export const getTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await loyaltyService.getTransactions(req.params.id, req.businessId!, {
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

// Rewards

/**
 * Create reward
 * POST /loyalty/rewards
 */
export const createReward = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reward = await loyaltyService.createReward({
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Reward created',
    data: reward,
  });
});

/**
 * Get available rewards
 * GET /loyalty/rewards
 */
export const getRewards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = req.query.programId as string;
  const tierId = req.query.tierId as string;
  const activeOnly = req.query.activeOnly !== 'false';

  const rewards = await loyaltyService.getRewards(req.businessId!, {
    programId,
    tierId,
    activeOnly,
  });

  res.json({
    success: true,
    data: rewards,
  });
});

/**
 * Get available rewards for customer
 * GET /loyalty/rewards/available/:accountId
 */
export const getAvailableRewards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rewards = await loyaltyService.getAvailableRewardsForAccount(req.params.accountId, req.businessId!);

  res.json({
    success: true,
    data: rewards,
  });
});

/**
 * Update reward
 * PUT /loyalty/rewards/:id
 */
export const updateReward = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reward = await loyaltyService.updateReward(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Reward updated',
    data: reward,
  });
});

/**
 * Delete reward
 * DELETE /loyalty/rewards/:id
 */
export const deleteReward = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await loyaltyService.deleteReward(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Reward deleted',
  });
});

// Statistics

/**
 * Get loyalty program statistics
 * GET /loyalty/stats
 */
export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = req.query.programId as string;

  const stats = await loyaltyService.getStatistics(req.businessId!, programId);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Calculate points for order
 * POST /loyalty/calculate
 */
export const calculatePoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { orderTotal, customerId } = req.body;

  const points = await loyaltyService.calculatePointsForOrder(
    req.businessId!,
    orderTotal,
    customerId
  );

  res.json({
    success: true,
    data: { points },
  });
});

export default {
  createProgram,
  getProgram,
  getActiveProgram,
  updateProgram,
  deleteProgram,
  createTier,
  getTiers,
  updateTier,
  deleteTier,
  enrollCustomer,
  getCustomerAccount,
  getAccount,
  getAccounts,
  earnPoints,
  redeemPoints,
  adjustPoints,
  getPointsBalance,
  getTransactions,
  createReward,
  getRewards,
  getAvailableRewards,
  updateReward,
  deleteReward,
  getStats,
  calculatePoints,
};
