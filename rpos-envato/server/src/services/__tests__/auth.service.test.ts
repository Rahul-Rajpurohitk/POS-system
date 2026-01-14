// Mock dependencies BEFORE imports
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../queues/jobs/NotificationJob', () => ({
  NotificationJob: {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../config/constants', () => ({
  Constants: {
    JWTSecret: 'test-jwt-secret-key-for-testing-purposes-only',
    JWTExpiresIn: '7d',
    SALT_ROUNDS: 10,
  },
}));

// Now import after mocks are set up
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User } from '../../entities/User.entity';
import { Business } from '../../entities/Business.entity';
import { Role, AuthType, Currency, Language } from '../../types/enums';
import { AppDataSource } from '../../config/database';
import { NotificationJob } from '../../queues/jobs/NotificationJob';
import { Constants } from '../../config/constants';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockBusinessRepository: any;

  // Test data
  const mockUser: Partial<User> = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.MANAGER,
    authType: AuthType.EMAIL,
    businessId: 'business-uuid-123',
    enabled: true,
    emailVerified: false,
    emailVerificationToken: '123456',
    hash: '',
    resetCode: '',
    toJSON: jest.fn().mockReturnValue({
      id: 'user-uuid-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.MANAGER,
    }),
    validatePassword: jest.fn(),
    setPassword: jest.fn(),
    get fullName() {
      return 'John Doe';
    },
  };

  const mockBusiness: Partial<Business> = {
    id: 'business-uuid-123',
    name: 'Test Business',
    currency: Currency.USD,
    language: Language.EN,
    tax: 0,
    enabled: true,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      })),
    };

    mockBusinessRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    // Setup AppDataSource mock
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === User) return mockUserRepository;
      if (entity === Business) return mockBusinessRepository;
      return {};
    });

    // Create service instance
    authService = new AuthService();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = { id: 'user-123', email: 'test@example.com' } as User;

      const token = authService.generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token can be decoded
      const decoded = jwt.verify(token, Constants.JWTSecret) as any;
      expect(decoded.id).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should include expiration in the token', () => {
      const user = { id: 'user-123', email: 'test@example.com' } as User;

      const token = authService.generateToken(user);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const userWithBusiness = {
        ...mockUser,
        hash: await bcrypt.hash('password123', 10),
        business: mockBusiness,
        validatePassword: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        }),
      };

      const queryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userWithBusiness),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.business).toBeDefined();
      expect(userWithBusiness.validatePassword).toHaveBeenCalledWith('password123');
    });

    it('should throw error for non-existent user', async () => {
      const queryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      const userWithBusiness = {
        ...mockUser,
        business: mockBusiness,
        validatePassword: jest.fn().mockResolvedValue(false),
      };

      const queryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userWithBusiness),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for disabled business', async () => {
      const userWithDisabledBusiness = {
        ...mockUser,
        business: { ...mockBusiness, enabled: false },
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      const queryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userWithDisabledBusiness),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Business account is disabled');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user

      const mockManager = {
        create: jest.fn().mockImplementation((entity, data) => ({
          ...data,
          id: entity === Business ? 'new-business-id' : 'new-user-id',
          setPassword: jest.fn(),
          toJSON: jest.fn().mockReturnValue(data),
        })),
        save: jest.fn().mockImplementation((entity) => Promise.resolve({
          ...entity,
          id: entity.businessId ? 'new-user-id' : 'new-business-id',
          fullName: `${entity.firstName || ''} ${entity.lastName || ''}`.trim(),
          toJSON: () => entity,
        })),
      };

      (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        businessName: 'New Business',
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(NotificationJob.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser); // Existing user

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should use default business name if not provided', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const mockManager = {
        create: jest.fn().mockImplementation((entity, data) => ({
          ...data,
          id: entity === Business ? 'new-business-id' : 'new-user-id',
          setPassword: jest.fn(),
          toJSON: jest.fn().mockReturnValue(data),
        })),
        save: jest.fn().mockImplementation((entity) => Promise.resolve({
          ...entity,
          id: entity.businessId ? 'new-user-id' : 'new-business-id',
          fullName: 'Test User',
          toJSON: () => entity,
        })),
      };

      (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      await authService.register({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        // No businessName provided
      });

      // Check that business was created with default name
      expect(mockManager.create).toHaveBeenCalledWith(
        Business,
        expect.objectContaining({
          name: "Test's Business",
        })
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send reset code for existing user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await authService.forgotPassword('test@example.com');

      expect(result).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(NotificationJob.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUser.email,
        })
      );
    });

    it('should return true even for non-existent user (security)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await authService.forgotPassword('nonexistent@example.com');

      expect(result).toBe(true);
      expect(NotificationJob.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid code', async () => {
      const userWithResetCode = {
        ...mockUser,
        resetCode: '123456',
        setPassword: jest.fn(),
      };
      mockUserRepository.findOne.mockResolvedValue(userWithResetCode);
      mockUserRepository.save.mockResolvedValue(userWithResetCode);

      const result = await authService.resetPassword(
        'test@example.com',
        '123456',
        'newpassword123'
      );

      expect(result).toBe(true);
      expect(userWithResetCode.setPassword).toHaveBeenCalledWith('newpassword123');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw error for invalid reset code', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.resetPassword('test@example.com', 'invalid', 'newpassword')
      ).rejects.toThrow('Invalid reset code');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid code', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        emailVerificationToken: '123456',
      };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockResolvedValue({ ...unverifiedUser, emailVerified: true });

      const result = await authService.verifyEmail('test@example.com', '123456');

      expect(result).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw error for invalid verification code', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.verifyEmail('test@example.com', 'invalid')
      ).rejects.toThrow('Invalid verification code');
    });

    it('should throw error if email already verified', async () => {
      const verifiedUser = {
        ...mockUser,
        emailVerified: true,
        emailVerificationToken: '123456',
      };
      mockUserRepository.findOne.mockResolvedValue(verifiedUser);

      await expect(
        authService.verifyEmail('test@example.com', '123456')
      ).rejects.toThrow('Email already verified');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email for unverified user', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
      };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockResolvedValue(unverifiedUser);

      const result = await authService.resendVerificationEmail('test@example.com');

      expect(result).toBe(true);
      expect(NotificationJob.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw error if email already verified', async () => {
      const verifiedUser = {
        ...mockUser,
        emailVerified: true,
      };
      mockUserRepository.findOne.mockResolvedValue(verifiedUser);

      await expect(
        authService.resendVerificationEmail('test@example.com')
      ).rejects.toThrow('Email already verified');
    });

    it('should return true for non-existent user (security)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await authService.resendVerificationEmail('nonexistent@example.com');

      expect(result).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return user with business relation', async () => {
      const userWithBusiness = { ...mockUser, business: mockBusiness };
      mockUserRepository.findOne.mockResolvedValue(userWithBusiness);

      const result = await authService.getUserById('user-uuid-123');

      expect(result).toBeDefined();
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123', enabled: true },
        relations: ['business'],
      });
    });

    it('should return null for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await authService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const user = { id: 'user-123', email: 'test@example.com' } as User;
      const token = jwt.sign(
        { id: user.id, email: user.email },
        Constants.JWTSecret
      );

      const userWithBusiness = { ...mockUser, business: mockBusiness };
      mockUserRepository.findOne.mockResolvedValue(userWithBusiness);

      const result = await authService.validateToken(token);

      expect(result).toBeDefined();
    });

    it('should return null for invalid token', async () => {
      const result = await authService.validateToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com' },
        Constants.JWTSecret,
        { expiresIn: '-1s' } // Already expired
      );

      const result = await authService.validateToken(expiredToken);

      expect(result).toBeNull();
    });
  });
});
