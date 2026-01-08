import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { PaymentMethod, RefundReason } from '../types/enums';

/**
 * Process a payment for an order
 */
export const processPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;
    const processedById = req.user!.id;

    const {
      method,
      amountTendered,
      tipAmount,
      transactionId,
      cardLastFour,
      cardBrand,
      giftCardCode,
      metadata,
    } = req.body;

    const payment = await paymentService.processPayment({
      orderId,
      businessId,
      processedById,
      method: method as PaymentMethod,
      amountTendered: parseFloat(amountTendered),
      tipAmount: tipAmount ? parseFloat(tipAmount) : undefined,
      transactionId,
      cardLastFour,
      cardBrand,
      giftCardCode,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process split payment (multiple methods)
 */
export const processSplitPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;
    const processedById = req.user!.id;
    const { payments } = req.body;

    const result = await paymentService.processSplitPayment({
      orderId,
      businessId,
      processedById,
      payments: payments.map((p: any) => ({
        method: p.method as PaymentMethod,
        amount: parseFloat(p.amount),
        tipAmount: p.tipAmount ? parseFloat(p.tipAmount) : undefined,
        transactionId: p.transactionId,
        cardLastFour: p.cardLastFour,
        cardBrand: p.cardBrand,
        giftCardCode: p.giftCardCode,
      })),
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Split payment processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a refund
 */
export const processRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;
    const requestedById = req.user!.id;

    const {
      reason,
      reasonNotes,
      amount,
      refundMethod,
      refundedItems,
      restoreInventory,
    } = req.body;

    const refund = await paymentService.processRefund({
      orderId,
      businessId,
      requestedById,
      reason: reason as RefundReason,
      reasonNotes,
      amount: amount ? parseFloat(amount) : undefined,
      refundMethod: refundMethod ? (refundMethod as PaymentMethod) : undefined,
      refundedItems,
      restoreInventory,
    });

    res.status(201).json({
      success: true,
      data: refund,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment history for an order
 */
export const getOrderPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;

    const payments = await paymentService.getOrderPayments(orderId, businessId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get refund history for an order
 */
export const getOrderRefunds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;

    const refunds = await paymentService.getOrderRefunds(orderId, businessId);

    res.json({
      success: true,
      data: refunds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Void a pending payment
 */
export const voidPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const businessId = req.business!;

    const payment = await paymentService.voidPayment(paymentId, businessId);

    res.json({
      success: true,
      data: payment,
      message: 'Payment voided successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete an order
 */
export const completeOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;

    const order = await paymentService.completeOrder(orderId, businessId);

    res.json({
      success: true,
      data: order,
      message: 'Order completed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an order
 */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;

    const order = await paymentService.cancelOrder(orderId, businessId);

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate order totals (preview)
 */
export const calculateTotals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subTotal, discount, taxType, taxRate, tipAmount } = req.body;

    const totals = paymentService.calculateTotals({
      subTotal: parseFloat(subTotal),
      discount: parseFloat(discount || '0'),
      taxType,
      taxRate: parseFloat(taxRate || '0'),
      tipAmount: tipAmount ? parseFloat(tipAmount) : undefined,
    });

    res.json({
      success: true,
      data: totals,
    });
  } catch (error) {
    next(error);
  }
};
