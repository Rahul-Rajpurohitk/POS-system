import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import * as usersController from '../controllers/users.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /users/me - Get current user profile
router.get('/me', usersController.getProfile);

// PUT /users/me - Update current user profile
router.put(
  '/me',
  [
    body('firstName').optional().isString().trim().notEmpty(),
    body('lastName').optional().isString().trim().notEmpty(),
    body('avatar').optional().isString(),
  ],
  checkValidation,
  usersController.updateProfile
);

// POST /users/change-password - Change password
router.post(
  '/change-password',
  [
    body('oldPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  checkValidation,
  usersController.changePassword
);

// POST /users/verify-pin - Verify staff PIN
router.post(
  '/verify-pin',
  [body('pin').notEmpty().withMessage('PIN is required')],
  checkValidation,
  usersController.verifyPin
);

// Staff management (manager only)

// GET /users/staff - Get all staff
router.get('/staff', managerOnly, usersController.getStaff);

// POST /users/staff - Add new staff
router.post(
  '/staff',
  managerOnly,
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('pin').optional().isString().isLength({ min: 4, max: 6 }),
  ],
  checkValidation,
  usersController.addStaff
);

// PUT /users/staff/:id - Update staff
router.put(
  '/staff/:id',
  managerOnly,
  [
    param('id').isUUID().withMessage('Invalid staff ID'),
    body('firstName').optional().isString().trim().notEmpty(),
    body('lastName').optional().isString().trim().notEmpty(),
    body('pin').optional().isString().isLength({ min: 4, max: 6 }),
    body('enabled').optional().isBoolean(),
  ],
  checkValidation,
  usersController.updateStaff
);

// DELETE /users/staff/:id - Delete staff
router.delete(
  '/staff/:id',
  managerOnly,
  [param('id').isUUID().withMessage('Invalid staff ID')],
  checkValidation,
  usersController.deleteStaff
);

export default router;
