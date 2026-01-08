import { Router } from 'express';
import { body } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /users/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  checkValidation,
  authController.register
);

// POST /users/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  checkValidation,
  authController.login
);

export default router;
