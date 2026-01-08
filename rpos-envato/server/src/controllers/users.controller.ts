import { Response } from 'express';
import bcrypt from 'bcrypt';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { AppDataSource } from '../config/database';
import { User, Role } from '../entities/User.entity';
import { auditService, AuditEventType } from '../services/audit.service';

const userRepository = AppDataSource.getRepository(User);

/**
 * Get current user profile
 * GET /users/me
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userRepository.findOne({
    where: { id: req.userId },
    select: ['id', 'email', 'firstName', 'lastName', 'role', 'avatar', 'createdAt'],
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    data: user,
  });
});

/**
 * Update current user profile
 * PUT /users/me
 */
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { firstName, lastName, avatar } = req.body;

  const user = await userRepository.findOne({
    where: { id: req.userId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (avatar !== undefined) user.avatar = avatar;

  await userRepository.save(user);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    },
  });
});

/**
 * Change password
 * POST /users/change-password
 */
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const user = await userRepository.findOne({
    where: { id: req.userId },
    select: ['id', 'passwordHash'],
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValidPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.save(user);

  await auditService.log({
    eventType: AuditEventType.PASSWORD_CHANGE,
    userId: req.userId!,
    businessId: req.businessId!,
    description: 'User changed their password',
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * Get all staff members
 * GET /users/staff
 */
export const getStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const staff = await userRepository.find({
    where: {
      businessId: req.businessId,
      role: Role.STAFF,
      enabled: true,
    },
    select: ['id', 'email', 'firstName', 'lastName', 'avatar', 'createdAt'],
    order: { createdAt: 'DESC' },
  });

  res.json({
    success: true,
    data: staff,
  });
});

/**
 * Add new staff member
 * POST /users/staff
 */
export const addStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, firstName, lastName, pin } = req.body;

  // Check if email already exists
  const existingUser = await userRepository.findOne({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email already in use',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const staff = userRepository.create({
    email,
    passwordHash,
    firstName,
    lastName,
    pin,
    role: Role.STAFF,
    businessId: req.businessId,
    enabled: true,
  });

  await userRepository.save(staff);

  await auditService.log({
    eventType: AuditEventType.USER_CREATE,
    userId: req.userId!,
    businessId: req.businessId!,
    entityType: 'user',
    entityId: staff.id,
    description: `Staff member created: ${email}`,
  });

  res.status(201).json({
    success: true,
    message: 'Staff member added successfully',
    data: {
      id: staff.id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
    },
  });
});

/**
 * Update staff member
 * PUT /users/staff/:id
 */
export const updateStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, pin, enabled } = req.body;

  const staff = await userRepository.findOne({
    where: {
      id,
      businessId: req.businessId,
      role: Role.STAFF,
    },
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found',
    });
  }

  if (firstName !== undefined) staff.firstName = firstName;
  if (lastName !== undefined) staff.lastName = lastName;
  if (pin !== undefined) staff.pin = pin;
  if (enabled !== undefined) staff.enabled = enabled;

  await userRepository.save(staff);

  res.json({
    success: true,
    message: 'Staff member updated successfully',
    data: {
      id: staff.id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      enabled: staff.enabled,
    },
  });
});

/**
 * Delete (disable) staff member
 * DELETE /users/staff/:id
 */
export const deleteStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const staff = await userRepository.findOne({
    where: {
      id,
      businessId: req.businessId,
      role: Role.STAFF,
    },
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found',
    });
  }

  staff.enabled = false;
  await userRepository.save(staff);

  await auditService.log({
    eventType: AuditEventType.USER_DELETE,
    userId: req.userId!,
    businessId: req.businessId!,
    entityType: 'user',
    entityId: staff.id,
    description: `Staff member disabled: ${staff.email}`,
  });

  res.json({
    success: true,
    message: 'Staff member deleted successfully',
  });
});

/**
 * Verify staff PIN
 * POST /users/verify-pin
 */
export const verifyPin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { pin } = req.body;

  const user = await userRepository.findOne({
    where: { id: req.userId },
    select: ['id', 'pin'],
  });

  if (!user || user.pin !== pin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid PIN',
    });
  }

  res.json({
    success: true,
    message: 'PIN verified',
  });
});

export default {
  getProfile,
  updateProfile,
  changePassword,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  verifyPin,
};
