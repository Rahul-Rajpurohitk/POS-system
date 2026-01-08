import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { Role } from '../entities/User.entity';

/**
 * Check if user has admin role
 */
export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== Role.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};

/**
 * Check if user has manager or admin role
 */
export const managerOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== Role.ADMIN && req.userRole !== Role.MANAGER) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Manager privileges required.',
    });
  }
  next();
};

/**
 * Check if user has staff, manager, or admin role
 */
export const staffOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== Role.ADMIN && req.userRole !== Role.MANAGER && req.userRole !== Role.STAFF) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Staff privileges required.',
    });
  }
  next();
};

/**
 * Check if user has any of the specified roles
 */
export const hasRole = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole as Role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

export default {
  adminOnly,
  managerOnly,
  staffOnly,
  hasRole,
};
