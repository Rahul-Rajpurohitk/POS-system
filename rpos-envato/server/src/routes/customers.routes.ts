import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import * as customersController from '../controllers/customers.controller';

const router = Router();

// GET /customers/sync
router.get('/sync', staff, customersController.syncCustomers);

// POST /customers
router.post(
  '/',
  manager,
  [body('name').notEmpty().withMessage('Customer name is required')],
  checkValidation,
  customersController.addCustomer
);

// PUT /customers/:id
router.put(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid customer ID')],
  checkValidation,
  customersController.editCustomer
);

// DELETE /customers/:id
router.delete(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid customer ID')],
  checkValidation,
  customersController.deleteCustomer
);

export default router;
