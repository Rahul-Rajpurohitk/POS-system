import { Router } from 'express';
import { body } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
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

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
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
    body('email').isEmail().withMessage('Invalid email'),
    body('resetCode').isLength({ min: 6, max: 6 }).withMessage('Reset code must be 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  checkValidation,
  catchAsync(authController.resetPassword)
);

// POST /auth/verify-email - Verify email with code
router.post(
  '/verify-email',
  authLimiter,
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
  ],
  checkValidation,
  catchAsync(authController.verifyEmail)
);

// POST /auth/resend-verification - Resend verification email
router.post(
  '/resend-verification',
  passwordResetLimiter,
  [body('email').isEmail().withMessage('Invalid email')],
  checkValidation,
  catchAsync(authController.resendVerification)
);

export default router;
