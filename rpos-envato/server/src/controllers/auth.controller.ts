import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import authService from '../services/auth.service';

/**
 * Register new user and business
 * POST /users/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, businessName } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    businessName,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: result,
  });
});

/**
 * Login user
 * POST /users/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  res.json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

/**
 * Forgot password
 * POST /auth/forgotPassword
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  await authService.forgotPassword(email);

  res.json({
    success: true,
    message: 'If the email exists, a reset code has been sent',
  });
});

/**
 * Reset password
 * POST /auth/resetPassword
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, resetCode, newPassword } = req.body;

  await authService.resetPassword(email, resetCode, newPassword);

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

export default { register, login, forgotPassword, resetPassword };
