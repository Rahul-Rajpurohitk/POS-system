import { EntityManager, Repository, LessThan, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  LoyaltyProgram,
  LoyaltyProgramType,
  LoyaltyTier,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  LoyaltyReward,
  RewardType,
} from '../entities/Loyalty.entity';
import { Customer } from '../entities';
import { v4 as uuidv4 } from 'uuid';

// DTOs
export interface CreateProgramDTO {
  businessId: string;
  name: string;
  description?: string;
  type: LoyaltyProgramType;
  pointsPerDollar?: number;
  pointsValue?: number;
  minPointsRedeem?: number;
  pointsExpiryDays?: number;
  signupBonusPoints?: number;
  birthdayBonusPoints?: number;
  referralBonusPoints?: number;
}

export interface CreateTierDTO {
  programId: string;
  name: string;
  color?: string;
  minPoints: number;
  maxPoints?: number;
  pointsMultiplier?: number;
  discountPercentage?: number;
  customBenefits?: Array<{ name: string; description: string }>;
}

export interface EnrollCustomerDTO {
  businessId: string;
  customerId: string;
  referralCode?: string;
}

export interface EarnPointsDTO {
  accountId: string;
  orderId: string;
  orderTotal: number;
  processedById: string;
}

export interface RedeemPointsDTO {
  accountId: string;
  points: number;
  orderId: string;
  processedById: string;
  rewardId?: string;
}

class LoyaltyService {
  private programRepository: Repository<LoyaltyProgram>;
  private tierRepository: Repository<LoyaltyTier>;
  private accountRepository: Repository<LoyaltyAccount>;
  private transactionRepository: Repository<LoyaltyTransaction>;
  private rewardRepository: Repository<LoyaltyReward>;
  private customerRepository: Repository<Customer>;

  constructor() {
    this.programRepository = AppDataSource.getRepository(LoyaltyProgram);
    this.tierRepository = AppDataSource.getRepository(LoyaltyTier);
    this.accountRepository = AppDataSource.getRepository(LoyaltyAccount);
    this.transactionRepository = AppDataSource.getRepository(LoyaltyTransaction);
    this.rewardRepository = AppDataSource.getRepository(LoyaltyReward);
    this.customerRepository = AppDataSource.getRepository(Customer);
  }

  // ============ PROGRAM MANAGEMENT ============

  /**
   * Create loyalty program
   */
  async createProgram(dto: CreateProgramDTO): Promise<LoyaltyProgram> {
    const existing = await this.programRepository.findOne({
      where: { businessId: dto.businessId },
    });

    if (existing) {
      throw new Error('Business already has a loyalty program');
    }

    const program = this.programRepository.create({
      businessId: dto.businessId,
      name: dto.name,
      description: dto.description || null,
      type: dto.type,
      pointsPerDollar: dto.pointsPerDollar || 1,
      pointsValue: dto.pointsValue || 0.01,
      minPointsRedeem: dto.minPointsRedeem || 100,
      pointsExpiryDays: dto.pointsExpiryDays || null,
      signupBonusPoints: dto.signupBonusPoints || 0,
      birthdayBonusPoints: dto.birthdayBonusPoints || 0,
      referralBonusPoints: dto.referralBonusPoints || 0,
      isActive: true,
    });

    await this.programRepository.save(program);

    return program;
  }

  /**
   * Get program for business
   */
  async getProgram(businessId: string): Promise<LoyaltyProgram | null> {
    return this.programRepository.findOne({
      where: { businessId },
      relations: ['tiers'],
    });
  }

  /**
   * Update program
   */
  async updateProgram(
    programId: string,
    updates: Partial<LoyaltyProgram>
  ): Promise<LoyaltyProgram> {
    const program = await this.programRepository.findOne({
      where: { id: programId },
    });

    if (!program) {
      throw new Error('Program not found');
    }

    Object.assign(program, updates);
    await this.programRepository.save(program);

    return program;
  }

  // ============ TIER MANAGEMENT ============

  /**
   * Create tier
   */
  async createTier(dto: CreateTierDTO): Promise<LoyaltyTier> {
    const tier = this.tierRepository.create({
      programId: dto.programId,
      name: dto.name,
      color: dto.color || null,
      minPoints: dto.minPoints,
      maxPoints: dto.maxPoints || null,
      pointsMultiplier: dto.pointsMultiplier || 1,
      discountPercentage: dto.discountPercentage || 0,
      customBenefits: dto.customBenefits || null,
    });

    await this.tierRepository.save(tier);

    return tier;
  }

  /**
   * Get tiers for program
   */
  async getTiers(programId: string): Promise<LoyaltyTier[]> {
    return this.tierRepository.find({
      where: { programId },
      order: { minPoints: 'ASC' },
    });
  }

  // ============ CUSTOMER ENROLLMENT ============

  /**
   * Enroll customer in loyalty program
   */
  async enrollCustomer(dto: EnrollCustomerDTO): Promise<LoyaltyAccount> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // Check if already enrolled
      const existing = await manager.getRepository(LoyaltyAccount).findOne({
        where: { businessId: dto.businessId, customerId: dto.customerId },
      });

      if (existing) {
        throw new Error('Customer already enrolled in loyalty program');
      }

      // Get program
      const program = await manager.getRepository(LoyaltyProgram).findOne({
        where: { businessId: dto.businessId, isActive: true },
      });

      if (!program) {
        throw new Error('No active loyalty program');
      }

      // Generate membership number
      const membershipNumber = this.generateMembershipNumber();

      // Generate referral code
      const referralCode = this.generateReferralCode();

      // Check if referred by someone
      let referredById: string | null = null;
      if (dto.referralCode) {
        const referrer = await manager.getRepository(LoyaltyAccount).findOne({
          where: { businessId: dto.businessId, referralCode: dto.referralCode },
        });
        if (referrer) {
          referredById = referrer.id;
        }
      }

      // Create account
      const account = manager.create(LoyaltyAccount, {
        businessId: dto.businessId,
        customerId: dto.customerId,
        membershipNumber,
        referralCode,
        referredById,
        currentPoints: program.signupBonusPoints,
        lifetimePoints: program.signupBonusPoints,
        isActive: true,
      });

      await manager.save(account);

      // Record signup bonus if applicable
      if (program.signupBonusPoints > 0) {
        const transaction = manager.create(LoyaltyTransaction, {
          accountId: account.id,
          type: LoyaltyTransactionType.SIGNUP,
          points: program.signupBonusPoints,
          pointsBefore: 0,
          pointsAfter: program.signupBonusPoints,
          description: 'Signup bonus',
          expiresAt: program.pointsExpiryDays
            ? new Date(Date.now() + program.pointsExpiryDays * 24 * 60 * 60 * 1000)
            : null,
        });
        await manager.save(transaction);
      }

      // Credit referral bonus if applicable
      if (referredById && program.referralBonusPoints > 0) {
        const referrerAccount = await manager.getRepository(LoyaltyAccount).findOne({
          where: { id: referredById },
        });

        if (referrerAccount) {
          referrerAccount.currentPoints += program.referralBonusPoints;
          referrerAccount.lifetimePoints += program.referralBonusPoints;
          referrerAccount.referralCount += 1;
          await manager.save(referrerAccount);

          const referralTx = manager.create(LoyaltyTransaction, {
            accountId: referrerAccount.id,
            type: LoyaltyTransactionType.REFERRAL,
            points: program.referralBonusPoints,
            pointsBefore: referrerAccount.currentPoints - program.referralBonusPoints,
            pointsAfter: referrerAccount.currentPoints,
            description: 'Referral bonus',
          });
          await manager.save(referralTx);
        }

        // Credit referee bonus
        if (program.refereeBonusPoints > 0) {
          account.currentPoints += program.refereeBonusPoints;
          account.lifetimePoints += program.refereeBonusPoints;
          await manager.save(account);

          const refereeTx = manager.create(LoyaltyTransaction, {
            accountId: account.id,
            type: LoyaltyTransactionType.REFERRAL,
            points: program.refereeBonusPoints,
            pointsBefore: account.currentPoints - program.refereeBonusPoints,
            pointsAfter: account.currentPoints,
            description: 'Referral welcome bonus',
          });
          await manager.save(refereeTx);
        }
      }

      return account;
    });
  }

  /**
   * Get customer's loyalty account
   */
  async getAccount(customerId: string, businessId: string): Promise<LoyaltyAccount | null> {
    return this.accountRepository.findOne({
      where: { customerId, businessId },
      relations: ['currentTier', 'customer'],
    });
  }

  /**
   * Get account by membership number
   */
  async getAccountByMembership(membershipNumber: string): Promise<LoyaltyAccount | null> {
    return this.accountRepository.findOne({
      where: { membershipNumber },
      relations: ['currentTier', 'customer'],
    });
  }

  // ============ POINTS MANAGEMENT ============

  /**
   * Earn points from purchase
   */
  async earnPoints(dto: EarnPointsDTO): Promise<LoyaltyTransaction> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const account = await manager
        .getRepository(LoyaltyAccount)
        .createQueryBuilder('account')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('account.currentTier', 'tier')
        .where('account.id = :id', { id: dto.accountId })
        .getOne();

      if (!account) {
        throw new Error('Loyalty account not found');
      }

      const program = await manager.getRepository(LoyaltyProgram).findOne({
        where: { businessId: account.businessId },
      });

      if (!program || !program.isActive) {
        throw new Error('Loyalty program not active');
      }

      // Calculate points
      let basePoints = Math.floor(dto.orderTotal * Number(program.pointsPerDollar));

      // Apply tier multiplier
      if (account.currentTier) {
        basePoints = Math.floor(basePoints * Number(account.currentTier.pointsMultiplier));
      }

      if (basePoints <= 0) {
        throw new Error('No points to earn');
      }

      const pointsBefore = account.currentPoints;
      const pointsAfter = pointsBefore + basePoints;

      // Update account
      account.currentPoints = pointsAfter;
      account.lifetimePoints += basePoints;
      account.lifetimeSpend = Number(account.lifetimeSpend) + dto.orderTotal;
      account.totalVisits += 1;
      account.lastActivityAt = new Date();

      // Check for tier upgrade
      await this.checkTierUpgrade(manager, account, program);

      await manager.save(account);

      // Create transaction
      const transaction = manager.create(LoyaltyTransaction, {
        accountId: account.id,
        type: LoyaltyTransactionType.EARN,
        points: basePoints,
        pointsBefore,
        pointsAfter,
        orderId: dto.orderId,
        description: `Earned from purchase of $${dto.orderTotal.toFixed(2)}`,
        processedById: dto.processedById,
        expiresAt: program.pointsExpiryDays
          ? new Date(Date.now() + program.pointsExpiryDays * 24 * 60 * 60 * 1000)
          : null,
      });

      await manager.save(transaction);

      return transaction;
    });
  }

  /**
   * Redeem points
   */
  async redeemPoints(dto: RedeemPointsDTO): Promise<{ transaction: LoyaltyTransaction; monetaryValue: number }> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const account = await manager
        .getRepository(LoyaltyAccount)
        .createQueryBuilder('account')
        .setLock('pessimistic_write')
        .where('account.id = :id', { id: dto.accountId })
        .getOne();

      if (!account) {
        throw new Error('Loyalty account not found');
      }

      const program = await manager.getRepository(LoyaltyProgram).findOne({
        where: { businessId: account.businessId },
      });

      if (!program || !program.isActive) {
        throw new Error('Loyalty program not active');
      }

      if (dto.points < program.minPointsRedeem) {
        throw new Error(`Minimum ${program.minPointsRedeem} points required to redeem`);
      }

      if (account.currentPoints < dto.points) {
        throw new Error('Insufficient points');
      }

      // If redeeming a specific reward
      let monetaryValue = dto.points * Number(program.pointsValue);
      let description = `Redeemed ${dto.points} points`;

      if (dto.rewardId) {
        const reward = await manager.getRepository(LoyaltyReward).findOne({
          where: { id: dto.rewardId, programId: program.id },
        });

        if (!reward || !reward.isAvailable) {
          throw new Error('Reward not available');
        }

        if (reward.pointsCost > dto.points) {
          throw new Error('Insufficient points for this reward');
        }

        monetaryValue = Number(reward.value) || 0;
        description = `Redeemed: ${reward.name}`;

        // Update reward redemption count
        reward.currentRedemptions += 1;
        await manager.save(reward);
      }

      const pointsBefore = account.currentPoints;
      const pointsAfter = pointsBefore - dto.points;

      // Update account
      account.currentPoints = pointsAfter;
      account.redeemedPoints += dto.points;
      account.lastActivityAt = new Date();

      await manager.save(account);

      // Create transaction
      const transaction = manager.create(LoyaltyTransaction, {
        accountId: account.id,
        type: LoyaltyTransactionType.REDEEM,
        points: -dto.points,
        pointsBefore,
        pointsAfter,
        monetaryValue,
        orderId: dto.orderId,
        description,
        processedById: dto.processedById,
      });

      await manager.save(transaction);

      return { transaction, monetaryValue };
    });
  }

  /**
   * Award bonus points
   */
  async awardBonusPoints(
    accountId: string,
    points: number,
    reason: string,
    processedById: string
  ): Promise<LoyaltyTransaction> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const account = await manager
        .getRepository(LoyaltyAccount)
        .createQueryBuilder('account')
        .setLock('pessimistic_write')
        .where('account.id = :id', { id: accountId })
        .getOne();

      if (!account) {
        throw new Error('Loyalty account not found');
      }

      const pointsBefore = account.currentPoints;
      const pointsAfter = pointsBefore + points;

      account.currentPoints = pointsAfter;
      account.lifetimePoints += points;
      account.lastActivityAt = new Date();

      await manager.save(account);

      const transaction = manager.create(LoyaltyTransaction, {
        accountId: account.id,
        type: LoyaltyTransactionType.BONUS,
        points,
        pointsBefore,
        pointsAfter,
        description: reason,
        processedById,
      });

      await manager.save(transaction);

      return transaction;
    });
  }

  // ============ REWARDS MANAGEMENT ============

  /**
   * Create reward
   */
  async createReward(
    programId: string,
    data: Partial<LoyaltyReward>
  ): Promise<LoyaltyReward> {
    const reward = this.rewardRepository.create({
      programId,
      ...data,
    });

    await this.rewardRepository.save(reward);

    return reward;
  }

  /**
   * Get available rewards for customer
   */
  async getAvailableRewards(
    accountId: string
  ): Promise<{ rewards: LoyaltyReward[]; canRedeem: LoyaltyReward[] }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const program = await this.programRepository.findOne({
      where: { businessId: account.businessId },
    });

    if (!program) {
      return { rewards: [], canRedeem: [] };
    }

    const rewards = await this.rewardRepository.find({
      where: { programId: program.id, isActive: true },
      order: { pointsCost: 'ASC' },
    });

    const canRedeem = rewards.filter(
      (r) => r.isAvailable && r.pointsCost <= account.currentPoints
    );

    return { rewards, canRedeem };
  }

  // ============ TIER MANAGEMENT ============

  /**
   * Check and apply tier upgrade
   */
  private async checkTierUpgrade(
    manager: EntityManager,
    account: LoyaltyAccount,
    program: LoyaltyProgram
  ): Promise<void> {
    if (program.type !== LoyaltyProgramType.TIERED) {
      return;
    }

    const tiers = await manager.getRepository(LoyaltyTier).find({
      where: { programId: program.id },
      order: { minPoints: 'DESC' },
    });

    for (const tier of tiers) {
      if (account.lifetimePoints >= tier.minPoints) {
        if (account.currentTierId !== tier.id) {
          account.currentTierId = tier.id;
          account.tierAchievedAt = new Date();

          // Award tier bonus if configured
          // This could trigger additional rewards
        }
        break;
      }
    }
  }

  // ============ BIRTHDAY REWARDS ============

  /**
   * Process birthday rewards
   */
  async processBirthdayRewards(businessId: string): Promise<number> {
    const program = await this.programRepository.findOne({
      where: { businessId, isActive: true },
    });

    if (!program || program.birthdayBonusPoints <= 0) {
      return 0;
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get accounts with birthday today
    const accounts = await this.accountRepository
      .createQueryBuilder('account')
      .innerJoin('account.customer', 'customer')
      .where('account.businessId = :businessId', { businessId })
      .andWhere('account.isActive = :isActive', { isActive: true })
      .andWhere('EXTRACT(MONTH FROM customer.birthday) = :month', { month })
      .andWhere('EXTRACT(DAY FROM customer.birthday) = :day', { day })
      .getMany();

    let awarded = 0;

    for (const account of accounts) {
      // Check if already awarded this year
      const existingBirthday = await this.transactionRepository.findOne({
        where: {
          accountId: account.id,
          type: LoyaltyTransactionType.BIRTHDAY,
        },
        order: { createdAt: 'DESC' },
      });

      if (existingBirthday) {
        const lastBirthday = new Date(existingBirthday.createdAt);
        if (lastBirthday.getFullYear() === today.getFullYear()) {
          continue; // Already awarded this year
        }
      }

      await this.awardBonusPoints(
        account.id,
        program.birthdayBonusPoints,
        'Birthday bonus',
        'system'
      );

      awarded++;
    }

    return awarded;
  }

  // ============ EXPIRY MANAGEMENT ============

  /**
   * Expire old points
   */
  async expireOldPoints(): Promise<number> {
    const now = new Date();

    const expiredTransactions = await this.transactionRepository.find({
      where: {
        expiresAt: LessThan(now),
        expired: false,
        type: LoyaltyTransactionType.EARN,
      },
      relations: ['account'],
    });

    let expiredPoints = 0;

    for (const tx of expiredTransactions) {
      if (tx.points <= 0) continue;

      const account = tx.account;
      const pointsToExpire = Math.min(tx.points, account.currentPoints);

      if (pointsToExpire > 0) {
        account.currentPoints -= pointsToExpire;
        account.expiredPoints += pointsToExpire;
        await this.accountRepository.save(account);

        const expireTx = this.transactionRepository.create({
          accountId: account.id,
          type: LoyaltyTransactionType.EXPIRE,
          points: -pointsToExpire,
          pointsBefore: account.currentPoints + pointsToExpire,
          pointsAfter: account.currentPoints,
          description: `Points expired from ${tx.createdAt.toDateString()}`,
        });

        await this.transactionRepository.save(expireTx);
        expiredPoints += pointsToExpire;
      }

      tx.expired = true;
      await this.transactionRepository.save(tx);
    }

    return expiredPoints;
  }

  // ============ STATISTICS ============

  /**
   * Get loyalty statistics
   */
  async getStatistics(businessId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    totalPointsExpired: number;
    outstandingPoints: number;
    averagePointsPerMember: number;
    redemptionRate: number;
  }> {
    const stats = await this.accountRepository
      .createQueryBuilder('account')
      .select([
        'COUNT(account.id) as totalMembers',
        'COUNT(CASE WHEN account.isActive THEN 1 END) as activeMembers',
        'COALESCE(SUM(account.lifetimePoints), 0) as totalPointsIssued',
        'COALESCE(SUM(account.redeemedPoints), 0) as totalPointsRedeemed',
        'COALESCE(SUM(account.expiredPoints), 0) as totalPointsExpired',
        'COALESCE(SUM(account.currentPoints), 0) as outstandingPoints',
        'COALESCE(AVG(account.currentPoints), 0) as averagePointsPerMember',
      ])
      .where('account.businessId = :businessId', { businessId })
      .getRawOne();

    const totalIssued = parseFloat(stats?.totalPointsIssued || '0');
    const totalRedeemed = parseFloat(stats?.totalPointsRedeemed || '0');

    return {
      totalMembers: parseInt(stats?.totalMembers || '0'),
      activeMembers: parseInt(stats?.activeMembers || '0'),
      totalPointsIssued: Math.round(totalIssued),
      totalPointsRedeemed: Math.round(totalRedeemed),
      totalPointsExpired: Math.round(parseFloat(stats?.totalPointsExpired || '0')),
      outstandingPoints: Math.round(parseFloat(stats?.outstandingPoints || '0')),
      averagePointsPerMember: Math.round(parseFloat(stats?.averagePointsPerMember || '0')),
      redemptionRate: totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0,
    };
  }

  // ============ HELPERS ============

  private generateMembershipNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LYL-${timestamp}-${random}`;
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

export const loyaltyService = new LoyaltyService();
