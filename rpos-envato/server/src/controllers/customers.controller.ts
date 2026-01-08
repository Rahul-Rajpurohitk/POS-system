import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import customerService from '../services/customer.service';

/**
 * Sync all customers (for mobile app)
 * GET /customers/sync
 */
export const syncCustomers = asyncHandler(async (req: Request, res: Response) => {
  const customers = await customerService.syncCustomers(req.business!);

  res.json({
    success: true,
    data: customers,
  });
});

/**
 * Add new customer
 * POST /customers
 */
export const addCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer({
    ...req.body,
    businessId: req.business!,
  });

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: customer,
  });
});

/**
 * Update customer
 * PUT /customers/:id
 */
export const editCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const customer = await customerService.updateCustomer(id, req.business!, req.body);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  res.json({
    success: true,
    message: 'Customer updated successfully',
    data: customer,
  });
});

/**
 * Delete customer
 * DELETE /customers/:id
 */
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await customerService.deleteCustomer(id, req.business!);

  if (!result) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  res.json({
    success: true,
    message: 'Customer deleted successfully',
  });
});

export default {
  syncCustomers,
  addCustomer,
  editCustomer,
  deleteCustomer,
};
