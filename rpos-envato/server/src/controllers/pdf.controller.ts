import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order.entity';
import { Business } from '../entities/Business.entity';
import { User } from '../entities/User.entity';
import pdfService, {
  DocumentType,
  ReceiptDocumentData,
  InvoiceDocumentData,
  getCurrencySymbol,
} from '../services/pdf';
import { PaymentMethod, Currency } from '../types/enums';

/**
 * Get order by ID with all relations needed for PDF generation
 */
async function getOrderWithRelations(orderId: string, businessId: string): Promise<Order | null> {
  const orderRepository = AppDataSource.getRepository(Order);

  return orderRepository.findOne({
    where: { id: orderId, businessId },
    relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy', 'business'],
  });
}

/**
 * Get business details
 */
async function getBusinessDetails(businessId: string): Promise<Business | null> {
  const businessRepository = AppDataSource.getRepository(Business);
  return businessRepository.findOne({ where: { id: businessId } });
}

/**
 * Get currency symbol for a currency code
 */
function getCurrencySymbolForCode(currency: Currency | string): string {
  return getCurrencySymbol(typeof currency === 'string' ? currency : currency.toString());
}

/**
 * Map PaymentMethod enum to display string
 */
function getPaymentMethodDisplay(method: PaymentMethod): string {
  const displayMap: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Cash',
    [PaymentMethod.CREDIT_CARD]: 'Credit Card',
    [PaymentMethod.DEBIT_CARD]: 'Debit Card',
    [PaymentMethod.MOBILE_PAYMENT]: 'Mobile Payment',
    [PaymentMethod.GIFT_CARD]: 'Gift Card',
    [PaymentMethod.STORE_CREDIT]: 'Store Credit',
    [PaymentMethod.SPLIT]: 'Split Payment',
    [PaymentMethod.OTHER]: 'Other',
  };

  return displayMap[method] || method.toString();
}

/**
 * Get locale string from language code
 */
function getLocaleFromLanguage(language: string): string {
  const localeMap: Record<string, string> = {
    EN: 'en-US',
    ES: 'es-ES',
    FR: 'fr-FR',
    DE: 'de-DE',
    IT: 'it-IT',
    PT: 'pt-BR',
    ZH: 'zh-CN',
    JA: 'ja-JP',
    KO: 'ko-KR',
    AR: 'ar-SA',
    HI: 'hi-IN',
  };

  return localeMap[language?.toUpperCase()] || 'en-US';
}

/**
 * Generate Order Receipt PDF
 * GET /pdf/orders/:orderId/receipt.pdf
 */
export const generateOrderReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const businessId = req.business!;

  // Get order with all relations
  const order = await getOrderWithRelations(orderId, businessId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Get business details
  const business = order.business || (await getBusinessDetails(businessId));
  if (!business) {
    return res.status(404).json({
      success: false,
      message: 'Business not found',
    });
  }

  // Build receipt data
  const receiptData: ReceiptDocumentData = {
    documentType: DocumentType.RECEIPT,
    generatedAt: new Date(),
    businessInfo: {
      name: business.name,
      address: business.address || '',
      phone: undefined, // Add if business has phone field
      email: undefined, // Add if business has email field
      taxId: undefined, // Add if business has taxId field
      currency: business.currency?.toString() || 'USD',
      currencySymbol: getCurrencySymbolForCode(business.currency || 'USD'),
      locale: getLocaleFromLanguage(business.language?.toString() || 'EN'),
    },
    order: {
      id: order.id,
      orderNumber: order.formattedNumber,
      items: order.items.map((item) => ({
        name: item.product?.name || item.name || 'Unknown Item',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        sku: item.product?.sku,
        discount: item.discount ? Number(item.discount) : undefined,
        notes: item.notes,
      })),
      subtotal: Number(order.subTotal),
      tax: Number(order.taxAmount),
      taxRate: Number(order.taxRate),
      discount: Number(order.discount),
      total: Number(order.total),
      tip: Number(order.tipAmount),
      createdAt: order.createdAt,
      notes: order.notes,
    },
    payment: {
      method: order.paymentMethod?.toString() || 'CASH',
      methodDisplay: getPaymentMethodDisplay(order.paymentMethod),
      amountPaid: Number(order.amountPaid),
      change: Number(order.changeDue),
    },
    customer: order.customer
      ? {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : order.guestName
      ? {
          name: order.guestName,
          email: order.guestEmail || undefined,
          phone: order.guestPhone || undefined,
        }
      : undefined,
    cashier: order.createdBy
      ? {
          name: order.createdBy.name || order.createdBy.email,
          id: order.createdBy.id,
        }
      : undefined,
    footerMessage: 'Returns accepted within 30 days with receipt.',
  };

  try {
    // Generate PDF
    const pdfBuffer = await pdfService.generatePdf(receiptData);

    // Set response headers
    const filename = `receipt-${order.formattedNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate Order Invoice PDF
 * GET /pdf/orders/:orderId/invoice.pdf
 */
export const generateOrderInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const businessId = req.business!;

  // Get order with all relations
  const order = await getOrderWithRelations(orderId, businessId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Get business details
  const business = order.business || (await getBusinessDetails(businessId));
  if (!business) {
    return res.status(404).json({
      success: false,
      message: 'Business not found',
    });
  }

  // Determine customer info
  const customer = order.customer
    ? {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
      }
    : {
        name: order.guestName || 'Guest',
        email: order.guestEmail || undefined,
        phone: order.guestPhone || undefined,
        address: order.guestAddress || undefined,
      };

  // Build invoice data
  const invoiceData: InvoiceDocumentData = {
    documentType: DocumentType.INVOICE,
    generatedAt: new Date(),
    businessInfo: {
      name: business.name,
      address: business.address || '',
      phone: undefined,
      email: undefined,
      taxId: undefined,
      currency: business.currency?.toString() || 'USD',
      currencySymbol: getCurrencySymbolForCode(business.currency || 'USD'),
      locale: getLocaleFromLanguage(business.language?.toString() || 'EN'),
    },
    invoiceNumber: `INV-${order.formattedNumber}`,
    order: {
      id: order.id,
      orderNumber: order.formattedNumber,
      items: order.items.map((item) => ({
        name: item.product?.name || item.name || 'Unknown Item',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        sku: item.product?.sku,
        discount: item.discount ? Number(item.discount) : undefined,
      })),
      subtotal: Number(order.subTotal),
      tax: Number(order.taxAmount),
      taxRate: Number(order.taxRate),
      discount: Number(order.discount),
      total: Number(order.total),
      tip: Number(order.tipAmount),
      createdAt: order.createdAt,
    },
    customer,
    isPaid: order.isCompleted || order.amountDue <= 0,
    dueDate: undefined, // Could be set for unpaid orders
    terms: 'Payment due upon receipt.',
    notes: order.notes || undefined,
  };

  try {
    // Generate PDF
    const pdfBuffer = await pdfService.generatePdf(invoiceData);

    // Set response headers
    const filename = `invoice-${order.formattedNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Download Order Receipt PDF (forces download instead of inline display)
 * GET /pdf/orders/:orderId/receipt.pdf?download=true
 */
export const downloadOrderReceipt = asyncHandler(async (req: Request, res: Response) => {
  // Use same logic as generateOrderReceipt but with attachment disposition
  const { orderId } = req.params;
  const businessId = req.business!;

  const order = await getOrderWithRelations(orderId, businessId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const business = order.business || (await getBusinessDetails(businessId));
  if (!business) {
    return res.status(404).json({ success: false, message: 'Business not found' });
  }

  // Build receipt data (same as generateOrderReceipt)
  const receiptData: ReceiptDocumentData = {
    documentType: DocumentType.RECEIPT,
    generatedAt: new Date(),
    businessInfo: {
      name: business.name,
      address: business.address || '',
      currency: business.currency?.toString() || 'USD',
      currencySymbol: getCurrencySymbolForCode(business.currency || 'USD'),
      locale: getLocaleFromLanguage(business.language?.toString() || 'EN'),
    },
    order: {
      id: order.id,
      orderNumber: order.formattedNumber,
      items: order.items.map((item) => ({
        name: item.product?.name || item.name || 'Unknown Item',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        sku: item.product?.sku,
      })),
      subtotal: Number(order.subTotal),
      tax: Number(order.taxAmount),
      taxRate: Number(order.taxRate),
      discount: Number(order.discount),
      total: Number(order.total),
      tip: Number(order.tipAmount),
      createdAt: order.createdAt,
    },
    payment: {
      method: order.paymentMethod?.toString() || 'CASH',
      methodDisplay: getPaymentMethodDisplay(order.paymentMethod),
      amountPaid: Number(order.amountPaid),
      change: Number(order.changeDue),
    },
  };

  try {
    const pdfBuffer = await pdfService.generatePdf(receiptData);

    const filename = `receipt-${order.formattedNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
    });
  }
});
