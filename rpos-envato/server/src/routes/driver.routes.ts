import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as driverController from '../controllers/driver.controller';
import { DriverStatus, VehicleType } from '../types/enums';

const router = Router();

// ============ DRIVER MANAGEMENT (POS Admin) ============

// GET /drivers/available - Get available drivers
router.get('/available', staff, readLimiter, catchAsync(driverController.getAvailableDrivers));

// GET /drivers - List all drivers
router.get(
  '/',
  staff,
  readLimiter,
  [
    query('status').optional().isIn(Object.values(DriverStatus)).withMessage('Invalid status'),
    query('enabled').optional().isBoolean().withMessage('Enabled must be boolean'),
  ],
  checkValidation,
  catchAsync(driverController.getDrivers)
);

// GET /drivers/:id - Get single driver
router.get(
  '/:id',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid driver ID')],
  checkValidation,
  catchAsync(driverController.getDriver)
);

// POST /drivers - Create driver profile
router.post(
  '/',
  manager,
  createLimiter,
  [
    body('userId').isUUID().withMessage('User ID is required'),
    body('vehicleType').isIn(Object.values(VehicleType)).withMessage('Invalid vehicle type'),
    body('maxConcurrentDeliveries')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Max concurrent deliveries must be 1-5'),
  ],
  checkValidation,
  catchAsync(driverController.createDriver)
);

// PUT /drivers/:id - Update driver profile
router.put(
  '/:id',
  manager,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid driver ID'),
    body('vehicleType').optional().isIn(Object.values(VehicleType)).withMessage('Invalid vehicle type'),
  ],
  checkValidation,
  catchAsync(driverController.updateDriver)
);

// DELETE /drivers/:id - Delete/disable driver
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid driver ID')],
  checkValidation,
  catchAsync(driverController.deleteDriver)
);

export default router;
