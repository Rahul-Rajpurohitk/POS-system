import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import { createLimiter, readLimiter, authLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as usersController from '../controllers/users.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /users/me - Get current user profile
router.get('/me', readLimiter, catchAsync(usersController.getProfile));

// PUT /users/me - Update current user profile
router.put(
  '/me',
  createLimiter,
  [
    body('firstName').optional().isString().trim().notEmpty(),
    body('lastName').optional().isString().trim().notEmpty(),
    body('avatar').optional().isString(),
  ],
  checkValidation,
  catchAsync(usersController.updateProfile)
);

// POST /users/change-password - Change password (rate limited for security)
router.post(
  '/change-password',
  authLimiter,
  [
    body('oldPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  checkValidation,
  catchAsync(usersController.changePassword)
);

// POST /users/verify-pin - Verify staff PIN (rate limited for security)
router.post(
  '/verify-pin',
  authLimiter,
  [body('pin').notEmpty().withMessage('PIN is required')],
  checkValidation,
  catchAsync(usersController.verifyPin)
);

// Staff management (manager only)

// GET /users/staff - Get all staff
router.get('/staff', managerOnly, readLimiter, catchAsync(usersController.getStaff));

// POST /users/staff - Add new staff
router.post(
  '/staff',
  managerOnly,
  createLimiter,
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('pin').optional().isString().isLength({ min: 4, max: 6 }),
  ],
  checkValidation,
  catchAsync(usersController.addStaff)
);

// PUT /users/staff/:id - Update staff
router.put(
  '/staff/:id',
  managerOnly,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid staff ID'),
    body('firstName').optional().isString().trim().notEmpty(),
    body('lastName').optional().isString().trim().notEmpty(),
    body('pin').optional().isString().isLength({ min: 4, max: 6 }),
    body('enabled').optional().isBoolean(),
  ],
  checkValidation,
  catchAsync(usersController.updateStaff)
);

// DELETE /users/staff/:id - Delete staff
router.delete(
  '/staff/:id',
  managerOnly,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid staff ID')],
  checkValidation,
  catchAsync(usersController.deleteStaff)
);

export default router;
