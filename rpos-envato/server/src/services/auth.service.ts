import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { Business } from '../entities/Business.entity';
import { Role, AuthType, Currency, Language } from '../types/enums';
import { Constants } from '../config/constants';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { NotificationJob } from '../queues/jobs/NotificationJob';

export interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Partial<User>;
  business: Partial<Business>;
  token: string;
}

/**
 * Auth Service - Handles authentication business logic
 */
export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private businessRepository = AppDataSource.getRepository(Business);

  /**
   * Generate JWT token
   */
  generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      Constants.JWTSecret,
      { expiresIn: Constants.JWTExpiresIn }
    );
  }

  /**
   * Register a new user and business
   */
  async register(params: RegisterParams): Promise<AuthResponse> {
    const { email, password, firstName, lastName, businessName } = params;

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email, authType: AuthType.EMAIL },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    return AppDataSource.transaction(async (manager) => {
      // Create business
      const business = manager.create(Business, {
        name: businessName || `${firstName}'s Business`,
        currency: Currency.USD,
        language: Language.EN,
        tax: 0,
        enabled: true,
      });

      const savedBusiness = await manager.save(business);

      // Create user
      const user = manager.create(User, {
        email,
        firstName,
        lastName,
        role: Role.MANAGER,
        authType: AuthType.EMAIL,
        businessId: savedBusiness.id,
        enabled: true,
      });

      user.setPassword(password);
      const savedUser = await manager.save(user);

      // Generate token
      const token = this.generateToken(savedUser);

      return {
        user: savedUser.toJSON(),
        business: {
          id: savedBusiness.id,
          name: savedBusiness.name,
          currency: savedBusiness.currency,
          language: savedBusiness.language,
          tax: savedBusiness.tax,
        },
        token,
      };
    });
  }

  /**
   * Login user
   */
  async login(params: LoginParams): Promise<AuthResponse> {
    const { email, password } = params;

    // Find user with password hash
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.hash')
      .leftJoinAndSelect('user.business', 'business')
      .where('user.email = :email', { email })
      .andWhere('user.authType = :authType', { authType: AuthType.EMAIL })
      .andWhere('user.enabled = true')
      .getOne();

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check if business is enabled
    if (!user.business?.enabled) {
      throw new Error('Business account is disabled');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user: user.toJSON(),
      business: {
        id: user.business.id,
        name: user.business.name,
        currency: user.business.currency,
        language: user.business.language,
        tax: user.business.tax,
      },
      token,
    };
  }

  /**
   * Forgot password - send reset code
   */
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email, authType: AuthType.EMAIL, enabled: true },
    });

    if (!user) {
      // Don't reveal if email exists
      return true;
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save reset code
    await this.userRepository.update(user.id, { resetCode });

    // Send email via queue
    await NotificationJob.sendPasswordReset({
      email: user.email,
      resetCode,
      userName: user.fullName,
    });

    return true;
  }

  /**
   * Reset password with code
   */
  async resetPassword(email: string, resetCode: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email, resetCode, authType: AuthType.EMAIL, enabled: true },
    });

    if (!user || !resetCode) {
      throw new Error('Invalid reset code');
    }

    // Update password
    user.setPassword(newPassword);
    user.resetCode = '';
    await this.userRepository.save(user);

    return true;
  }

  /**
   * Get user by ID with business
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, enabled: true },
      relations: ['business'],
    });
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, Constants.JWTSecret) as { id: string; email: string };
      return this.getUserById(decoded.id);
    } catch {
      return null;
    }
  }
}

export default new AuthService();
