import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User } from '../entities/User.entity';
import { Role } from '../types/enums';

/**
 * Manager middleware - Only allows manager role
 */
export const manager = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('Bearer', { session: false }, (err: Error, user: User) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (user.role !== Role.MANAGER) {
      return res.status(403).json({ message: 'Manager access required' });
    }

    if (!user.business || !user.business.enabled) {
      return res.status(401).json({ message: 'Business account is disabled' });
    }

    // Attach user info to request
    req.userId = user.id;
    req.business = user.businessId;
    req.userInfo = {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    };

    next();
  })(req, res, next);
};

export default manager;
