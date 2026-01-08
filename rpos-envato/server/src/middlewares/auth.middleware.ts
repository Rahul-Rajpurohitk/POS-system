import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { Business } from '../entities/Business.entity';
import { Constants } from '../config/constants';
import { Role } from '../types/enums';

// JWT Strategy Options
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
  secretOrKey: Constants.JWTSecret,
};

// Initialize Passport JWT Strategy
passport.use(
  'Bearer',
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: jwtPayload.id, enabled: true },
        relations: ['business'],
      });

      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

/**
 * Base authentication middleware
 * Authenticates user and attaches user info to request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('Bearer', { session: false }, (err: Error, user: User) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
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

/**
 * Auth middleware - Basic authentication for any role
 */
export const auth = authenticate;

export default { authenticate, auth };
