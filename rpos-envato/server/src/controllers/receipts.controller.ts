import { Request, Response, NextFunction } from 'express';
import { receiptService } from '../services/receipt.service';

/**
 * Get receipt data as JSON
 */
export const getReceiptData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;

    const receiptData = await receiptService.generateReceipt(orderId, businessId);

    res.json({
      success: true,
      data: receiptData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get receipt as HTML for printing
 */
export const getReceiptHTML = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;
    const { paperWidth, fontSize, showLogo, showTaxBreakdown, currency } = req.query;

    const html = await receiptService.generateReceiptHTML(orderId, businessId, {
      paperWidth: paperWidth as '58mm' | '80mm' | undefined,
      fontSize: fontSize as 'small' | 'medium' | 'large' | undefined,
      showLogo: showLogo === 'true',
      showTaxBreakdown: showTaxBreakdown !== 'false',
      currency: currency as string | undefined,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * Get receipt as ESC/POS commands for thermal printer
 */
export const getReceiptESCPOS = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;

    const commands = await receiptService.generateESCPOSCommands(orderId, businessId);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${orderId}.bin"`);
    res.send(commands);
  } catch (error) {
    next(error);
  }
};

/**
 * Print receipt (sends to configured printer)
 * This would integrate with a print service or WebSocket to connected POS terminals
 */
export const printReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;
    const { printerId, copies = 1 } = req.body;

    // Generate receipt data
    const receiptData = await receiptService.generateReceipt(orderId, businessId);

    // In a real implementation, this would:
    // 1. Send to a print queue service
    // 2. Emit a WebSocket event to the POS terminal
    // 3. Use a cloud printing service

    res.json({
      success: true,
      message: 'Print job queued',
      data: {
        orderId,
        printerId: printerId || 'default',
        copies,
        queuedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Email receipt to customer
 */
export const emailReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const businessId = req.business!;
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
      return;
    }

    // Generate receipt HTML
    const html = await receiptService.generateReceiptHTML(orderId, businessId);

    // In a real implementation, this would:
    // 1. Send to an email service (SendGrid, SES, etc.)
    // 2. Queue the email job

    // For now, just acknowledge the request
    res.json({
      success: true,
      message: 'Receipt email queued',
      data: {
        orderId,
        email,
        queuedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
