import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './Business.entity';
import { Customer } from './Customer.entity';

// ============ LOYALTY PROGRAM CONFIGURATION ============

export enum LoyaltyProgramType {
  POINTS = 'points',           // Earn points per dollar
  VISITS = 'visits',           // Earn stamps per visit
  TIERED = 'tiered',          // Points + tier levels
}

@Entity('loyalty_programs')
@Index(['businessId'], { unique: true })
export class LoyaltyProgram {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: LoyaltyProgramType, default: LoyaltyProgramType.POINTS })
  type!: LoyaltyProgramType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // Points configuration
  @Column({ name: 'points_per_dollar', type: 'decimal', precision: 8, scale: 2, default: 1 })
  pointsPerDollar!: number; // e.g., 1 point per $1

  @Column({ name: 'points_value', type: 'decimal', precision: 8, scale: 4, default: 0.01 })
  pointsValue!: number; // e.g., 1 point = $0.01

  @Column({ name: 'min_points_redeem', type: 'integer', default: 100 })
  minPointsRedeem!: number; // Minimum points to redeem

  @Column({ name: 'max_points_per_order', type: 'integer', nullable: true })
  maxPointsPerOrder!: number | null; // Max points redeemable per order

  @Column({ name: 'points_expiry_days', type: 'integer', nullable: true })
  pointsExpiryDays!: number | null; // Points expire after X days

  // Visit-based configuration
  @Column({ name: 'visits_for_reward', type: 'integer', default: 10 })
  visitsForReward!: number; // e.g., 10 visits = 1 free item

  @Column({ name: 'min_purchase_for_visit', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minPurchaseForVisit!: number; // Minimum purchase to count as visit

  // Signup bonus
  @Column({ name: 'signup_bonus_points', type: 'integer', default: 0 })
  signupBonusPoints!: number;

  // Birthday reward
  @Column({ name: 'birthday_bonus_points', type: 'integer', default: 0 })
  birthdayBonusPoints!: number;

  // Referral bonus
  @Column({ name: 'referral_bonus_points', type: 'integer', default: 0 })
  referralBonusPoints!: number;

  @Column({ name: 'referee_bonus_points', type: 'integer', default: 0 })
  refereeBonusPoints!: number;

  // Terms
  @Column({ type: 'text', nullable: true })
  terms!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @OneToMany(() => LoyaltyTier, (tier) => tier.program)
  tiers!: LoyaltyTier[];
}

// ============ LOYALTY TIERS ============

@Entity('loyalty_tiers')
@Index(['programId', 'minPoints'])
export class LoyaltyTier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string; // e.g., Bronze, Silver, Gold, Platinum

  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null; // For UI display

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon!: string | null; // Icon identifier

  @Column({ name: 'min_points', type: 'integer', default: 0 })
  minPoints!: number; // Minimum lifetime points for this tier

  @Column({ name: 'max_points', type: 'integer', nullable: true })
  maxPoints!: number | null; // Max points for this tier (null = unlimited)

  // Tier benefits
  @Column({ name: 'points_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1 })
  pointsMultiplier!: number; // e.g., 1.5x points for Gold members

  @Column({ name: 'discount_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage!: number; // Automatic discount for tier members

  @Column({ name: 'free_shipping', type: 'boolean', default: false })
  freeShipping!: boolean;

  @Column({ name: 'early_access', type: 'boolean', default: false })
  earlyAccess!: boolean; // Early access to sales/products

  @Column({ name: 'exclusive_offers', type: 'boolean', default: false })
  exclusiveOffers!: boolean;

  // Custom benefits (JSON)
  @Column({ name: 'custom_benefits', type: 'jsonb', nullable: true })
  customBenefits!: Array<{ name: string; description: string }> | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @Column({ name: 'program_id', type: 'uuid' })
  programId!: string;

  @ManyToOne(() => LoyaltyProgram, (program) => program.tiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program!: LoyaltyProgram;
}

// ============ CUSTOMER LOYALTY ACCOUNT ============

@Entity('loyalty_accounts')
@Index(['businessId', 'customerId'], { unique: true })
@Index(['membershipNumber'], { unique: true })
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'membership_number', type: 'varchar', length: 50 })
  membershipNumber!: string;

  // Points
  @Column({ name: 'current_points', type: 'integer', default: 0 })
  currentPoints!: number;

  @Column({ name: 'lifetime_points', type: 'integer', default: 0 })
  lifetimePoints!: number;

  @Column({ name: 'redeemed_points', type: 'integer', default: 0 })
  redeemedPoints!: number;

  @Column({ name: 'expired_points', type: 'integer', default: 0 })
  expiredPoints!: number;

  // Visits (for visit-based programs)
  @Column({ name: 'total_visits', type: 'integer', default: 0 })
  totalVisits!: number;

  @Column({ name: 'current_visit_streak', type: 'integer', default: 0 })
  currentVisitStreak!: number; // Visits toward next reward

  // Spending
  @Column({ name: 'lifetime_spend', type: 'decimal', precision: 14, scale: 2, default: 0 })
  lifetimeSpend!: number;

  // Current tier
  @Column({ name: 'current_tier_id', type: 'uuid', nullable: true })
  currentTierId!: string | null;

  @Column({ name: 'tier_achieved_at', type: 'timestamp with time zone', nullable: true })
  tierAchievedAt!: Date | null;

  // Referral tracking
  @Column({ name: 'referral_code', type: 'varchar', length: 20, nullable: true })
  referralCode!: string | null;

  @Column({ name: 'referred_by_id', type: 'uuid', nullable: true })
  referredById!: string | null;

  @Column({ name: 'referral_count', type: 'integer', default: 0 })
  referralCount!: number;

  // Status
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'opted_in_marketing', type: 'boolean', default: true })
  optedInMarketing!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_activity_at', type: 'timestamp with time zone', nullable: true })
  lastActivityAt!: Date | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @ManyToOne(() => LoyaltyTier, { nullable: true })
  @JoinColumn({ name: 'current_tier_id' })
  currentTier!: LoyaltyTier | null;

  @OneToMany(() => LoyaltyTransaction, (tx) => tx.account)
  transactions!: LoyaltyTransaction[];

  // Helpers
  get pointsToNextReward(): number {
    // This would be calculated based on program settings
    return 0;
  }
}

// ============ LOYALTY TRANSACTIONS ============

export enum LoyaltyTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
  EXPIRE = 'expire',
  REFUND = 'refund',
  SIGNUP = 'signup',
  BIRTHDAY = 'birthday',
  REFERRAL = 'referral',
  TIER_BONUS = 'tier_bonus',
}

@Entity('loyalty_transactions')
@Index(['accountId', 'createdAt'])
@Index(['orderId'])
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: LoyaltyTransactionType })
  type!: LoyaltyTransactionType;

  @Column({ type: 'integer' })
  points!: number; // Positive for earn, negative for redeem

  @Column({ name: 'points_before', type: 'integer' })
  pointsBefore!: number;

  @Column({ name: 'points_after', type: 'integer' })
  pointsAfter!: number;

  // Monetary value (if redemption)
  @Column({ name: 'monetary_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  monetaryValue!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Reference to order
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  // For expiring points
  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'expired', type: 'boolean', default: false })
  expired!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => LoyaltyAccount, (account) => account.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: LoyaltyAccount;

  @Column({ name: 'processed_by_id', type: 'uuid', nullable: true })
  processedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy!: User | null;
}

// ============ LOYALTY REWARDS ============

export enum RewardType {
  DISCOUNT_PERCENTAGE = 'discount_percentage',
  DISCOUNT_FIXED = 'discount_fixed',
  FREE_PRODUCT = 'free_product',
  FREE_SHIPPING = 'free_shipping',
  BONUS_POINTS = 'bonus_points',
  CUSTOM = 'custom',
}

@Entity('loyalty_rewards')
@Index(['programId', 'isActive'])
export class LoyaltyReward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: RewardType })
  type!: RewardType;

  // Points cost to redeem
  @Column({ name: 'points_cost', type: 'integer' })
  pointsCost!: number;

  // Reward value
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  value!: number | null; // Dollar value or percentage

  // For free product rewards
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  // Restrictions
  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderAmount!: number | null;

  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount!: number | null;

  @Column({ name: 'tier_required', type: 'uuid', nullable: true })
  tierRequired!: string | null;

  // Availability
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'valid_from', type: 'timestamp with time zone', nullable: true })
  validFrom!: Date | null;

  @Column({ name: 'valid_until', type: 'timestamp with time zone', nullable: true })
  validUntil!: Date | null;

  @Column({ name: 'max_redemptions', type: 'integer', nullable: true })
  maxRedemptions!: number | null;

  @Column({ name: 'current_redemptions', type: 'integer', default: 0 })
  currentRedemptions!: number;

  @Column({ name: 'per_customer_limit', type: 'integer', nullable: true })
  perCustomerLimit!: number | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'program_id', type: 'uuid' })
  programId!: string;

  @ManyToOne(() => LoyaltyProgram, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program!: LoyaltyProgram;

  // Helpers
  get isAvailable(): boolean {
    const now = new Date();
    if (!this.isActive) return false;
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validUntil && now > this.validUntil) return false;
    if (this.maxRedemptions && this.currentRedemptions >= this.maxRedemptions) return false;
    return true;
  }
}
