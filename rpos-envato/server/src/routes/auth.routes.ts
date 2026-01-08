import { Router } from 'express';
import { body } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /users/register - Rate limited to prevent spam registrations
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  checkValidation,
  catchAsync(authController.register)
);

// POST /users/login - Strict rate limiting on auth attempts
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  checkValidation,
  catchAsync(authController.login)
);

// POST /users/forgot-password - Very strict rate limiting
router.post(
  '/forgot-password',
  passwordResetLimiter,
  [body('email').isEmail().withMessage('Invalid email')],
  checkValidation,
  catchAsync(authController.forgotPassword)
);

// POST /users/reset-password - Rate limited
router.post(
  '/reset-password',
  passwordResetLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  checkValidation,
  catchAsync(authController.resetPassword)
);

export default router;
