import { EntityManager, Repository, LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { GiftCard, GiftCardTransaction, GiftCardStatus, GiftCardType } from '../entities/GiftCard.entity';
import { v4 as uuidv4 } from 'uuid';

// DTOs
export interface IssueGiftCardDTO {
  businessId: string;
  issuedById: string;
  type: GiftCardType;
  initialValue: number;
  currency?: string;
  expiresAt?: Date;
  customerId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  message?: string;
  purchaseOrderId?: string;
}

export interface RedeemGiftCardDTO {
  code: string;
  pin?: string;
  businessId: string;
  amount: number;
  orderId: string;
  processedById: string;
}

export interface ReloadGiftCardDTO {
  giftCardId: string;
  businessId: string;
  amount: number;
  processedById: string;
}

class GiftCardService {
  private giftCardRepository: Repository<GiftCard>;
  private transactionRepository: Repository<GiftCardTransaction>;

  constructor() {
    this.giftCardRepository = AppDataSource.getRepository(GiftCard);
    this.transactionRepository = AppDataSource.getRepository(GiftCardTransaction);
  }

  /**
   * Generate a unique gift card code
   */
  private generateCode(): string {
    // Generate 16-digit code in format: XXXX-XXXX-XXXX-XXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate a PIN
   */
  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Issue a new gift card
   */
  async issueGiftCard(dto: IssueGiftCardDTO): Promise<GiftCard> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // Generate unique code
      let code: string;
      let exists = true;

      while (exists) {
        code = this.generateCode();
        const existing = await manager.getRepository(GiftCard).findOne({
          where: { businessId: dto.businessId, code },
        });
        exists = !!existing;
      }

      const pin = dto.type === GiftCardType.PHYSICAL ? this.generatePin() : null;

      const giftCard = manager.create(GiftCard, {
        code: code!,
        pin,
        type: dto.type,
        status: GiftCardStatus.ACTIVE,
        initialValue: dto.initialValue,
        balance: dto.initialValue,
        currency: dto.currency || 'USD',
        validFrom: new Date(),
        expiresAt: dto.expiresAt || null,
        businessId: dto.businessId,
        issuedById: dto.issuedById,
        customerId: dto.customerId || null,
        recipientName: dto.recipientName || null,
        recipientEmail: dto.recipientEmail || null,
        recipientPhone: dto.recipientPhone || null,
        message: dto.message || null,
        purchaseOrderId: dto.purchaseOrderId || null,
      });

      await manager.save(giftCard);

      // Record issuance transaction
      const transaction = manager.create(GiftCardTransaction, {
        giftCardId: giftCard.id,
        type: 'issue',
        amount: dto.initialValue,
        balanceBefore: 0,
        balanceAfter: dto.initialValue,
        description: `Gift card issued`,
        processedById: dto.issuedById,
      });

      await manager.save(transaction);

      return giftCard;
    });
  }

  /**
   * Check gift card balance
   */
  async checkBalance(code: string, businessId: string, pin?: string): Promise<{
    valid: boolean;
    balance: number;
    status: GiftCardStatus;
    expiresAt: Date | null;
    message?: string;
  }> {
    const giftCard = await this.giftCardRepository.findOne({
      where: { code, businessId },
    });

    if (!giftCard) {
      return { valid: false, balance: 0, status: GiftCardStatus.CANCELLED, message: 'Gift card not found' };
    }

    if (giftCard.pin && giftCard.pin !== pin) {
      return { valid: false, balance: 0, status: giftCard.status, message: 'Invalid PIN' };
    }

    if (giftCard.status !== GiftCardStatus.ACTIVE) {
      return { valid: false, balance: Number(giftCard.balance), status: giftCard.status, message: `Gift card is ${giftCard.status}` };
    }

    if (giftCard.isExpired) {
      return { valid: false, balance: Number(giftCard.balance), status: GiftCardStatus.EXPIRED, expiresAt: giftCard.expiresAt, message: 'Gift card has expired' };
    }

    return {
      valid: true,
      balance: Number(giftCard.balance),
      status: giftCard.status,
      expiresAt: giftCard.expiresAt,
    };
  }

  /**
   * Redeem gift card
   */
  async redeem(dto: RedeemGiftCardDTO): Promise<{ success: boolean; amountApplied: number; remainingBalance: number; error?: string }> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const giftCard = await manager
        .getRepository(GiftCard)
        .createQueryBuilder('gc')
        .setLock('pessimistic_write')
        .where('gc.code = :code', { code: dto.code })
        .andWhere('gc.businessId = :businessId', { businessId: dto.businessId })
        .getOne();

      if (!giftCard) {
        return { success: false, amountApplied: 0, remainingBalance: 0, error: 'Gift card not found' };
      }

      if (giftCard.pin && giftCard.pin !== dto.pin) {
        return { success: false, amountApplied: 0, remainingBalance: Number(giftCard.balance), error: 'Invalid PIN' };
      }

      if (!giftCard.isActive) {
        return { success: false, amountApplied: 0, remainingBalance: Number(giftCard.balance), error: `Gift card is ${giftCard.status}` };
      }

      const balanceBefore = Number(giftCard.balance);
      const amountToRedeem = Math.min(dto.amount, balanceBefore);

      if (amountToRedeem <= 0) {
        return { success: false, amountApplied: 0, remainingBalance: balanceBefore, error: 'Insufficient balance' };
      }

      const balanceAfter = this.round(balanceBefore - amountToRedeem);

      giftCard.balance = balanceAfter;
      giftCard.lastUsedAt = new Date();

      if (balanceAfter === 0) {
        giftCard.status = GiftCardStatus.REDEEMED;
      }

      await manager.save(giftCard);

      // Record transaction
      const transaction = manager.create(GiftCardTransaction, {
        giftCardId: giftCard.id,
        type: 'redeem',
        amount: -amountToRedeem,
        balanceBefore,
        balanceAfter,
        description: `Redeemed for order`,
        orderId: dto.orderId,
        processedById: dto.processedById,
      });

      await manager.save(transaction);

      return {
        success: true,
        amountApplied: amountToRedeem,
        remainingBalance: balanceAfter,
      };
    });
  }

  /**
   * Reload gift card
   */
  async reload(dto: ReloadGiftCardDTO): Promise<GiftCard> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const giftCard = await manager
        .getRepository(GiftCard)
        .createQueryBuilder('gc')
        .setLock('pessimistic_write')
        .where('gc.id = :id', { id: dto.giftCardId })
        .andWhere('gc.businessId = :businessId', { businessId: dto.businessId })
        .getOne();

      if (!giftCard) {
        throw new Error('Gift card not found');
      }

      if (giftCard.status === GiftCardStatus.CANCELLED) {
        throw new Error('Cannot reload cancelled gift card');
      }

      const balanceBefore = Number(giftCard.balance);
      const balanceAfter = this.round(balanceBefore + dto.amount);

      giftCard.balance = balanceAfter;
      giftCard.status = GiftCardStatus.ACTIVE;

      await manager.save(giftCard);

      // Record transaction
      const transaction = manager.create(GiftCardTransaction, {
        giftCardId: giftCard.id,
        type: 'reload',
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        description: `Gift card reloaded`,
        processedById: dto.processedById,
      });

      await manager.save(transaction);

      return giftCard;
    });
  }

  /**
   * Refund to gift card
   */
  async refund(
    giftCardId: string,
    businessId: string,
    amount: number,
    orderId: string,
    processedById: string
  ): Promise<GiftCard> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const giftCard = await manager
        .getRepository(GiftCard)
        .createQueryBuilder('gc')
        .setLock('pessimistic_write')
        .where('gc.id = :id', { id: giftCardId })
        .andWhere('gc.businessId = :businessId', { businessId })
        .getOne();

      if (!giftCard) {
        throw new Error('Gift card not found');
      }

      const balanceBefore = Number(giftCard.balance);
      const balanceAfter = this.round(balanceBefore + amount);

      giftCard.balance = balanceAfter;
      giftCard.status = GiftCardStatus.ACTIVE;

      await manager.save(giftCard);

      // Record transaction
      const transaction = manager.create(GiftCardTransaction, {
        giftCardId: giftCard.id,
        type: 'refund',
        amount,
        balanceBefore,
        balanceAfter,
        description: `Refund from order`,
        orderId,
        processedById,
      });

      await manager.save(transaction);

      return giftCard;
    });
  }

  /**
   * Suspend gift card
   */
  async suspend(giftCardId: string, businessId: string): Promise<GiftCard> {
    const giftCard = await this.giftCardRepository.findOne({
      where: { id: giftCardId, businessId },
    });

    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    giftCard.status = GiftCardStatus.SUSPENDED;
    await this.giftCardRepository.save(giftCard);

    return giftCard;
  }

  /**
   * Cancel gift card
   */
  async cancel(giftCardId: string, businessId: string): Promise<GiftCard> {
    const giftCard = await this.giftCardRepository.findOne({
      where: { id: giftCardId, businessId },
    });

    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    giftCard.status = GiftCardStatus.CANCELLED;
    await this.giftCardRepository.save(giftCard);

    return giftCard;
  }

  /**
   * Get gift card by code
   */
  async getByCode(code: string, businessId: string): Promise<GiftCard | null> {
    return this.giftCardRepository.findOne({
      where: { code, businessId },
      relations: ['customer', 'issuedBy'],
    });
  }

  /**
   * Get gift card transactions
   */
  async getTransactions(giftCardId: string): Promise<GiftCardTransaction[]> {
    return this.transactionRepository.find({
      where: { giftCardId },
      order: { createdAt: 'DESC' },
      relations: ['processedBy'],
    });
  }

  /**
   * Get customer's gift cards
   */
  async getCustomerGiftCards(customerId: string, businessId: string): Promise<GiftCard[]> {
    return this.giftCardRepository.find({
      where: { customerId, businessId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Expire old gift cards
   */
  async expireOldCards(): Promise<number> {
    const now = new Date();

    const expiredCards = await this.giftCardRepository.find({
      where: {
        status: GiftCardStatus.ACTIVE,
        expiresAt: LessThan(now),
      },
    });

    for (const card of expiredCards) {
      card.status = GiftCardStatus.EXPIRED;

      const transaction = this.transactionRepository.create({
        giftCardId: card.id,
        type: 'expire',
        amount: 0,
        balanceBefore: Number(card.balance),
        balanceAfter: Number(card.balance),
        description: 'Gift card expired',
      });

      await this.giftCardRepository.save(card);
      await this.transactionRepository.save(transaction);
    }

    return expiredCards.length;
  }

  /**
   * Get gift card statistics
   */
  async getStatistics(businessId: string): Promise<{
    totalIssued: number;
    totalValue: number;
    totalRedeemed: number;
    outstandingBalance: number;
    activeCards: number;
  }> {
    const stats = await this.giftCardRepository
      .createQueryBuilder('gc')
      .select([
        'COUNT(gc.id) as totalIssued',
        'COALESCE(SUM(gc.initialValue), 0) as totalValue',
        'COALESCE(SUM(gc.initialValue - gc.balance), 0) as totalRedeemed',
        'COALESCE(SUM(gc.balance), 0) as outstandingBalance',
        'COUNT(CASE WHEN gc.status = :active THEN 1 END) as activeCards',
      ])
      .where('gc.businessId = :businessId', { businessId })
      .setParameter('active', GiftCardStatus.ACTIVE)
      .getRawOne();

    return {
      totalIssued: parseInt(stats?.totalIssued || '0'),
      totalValue: this.round(parseFloat(stats?.totalValue || '0')),
      totalRedeemed: this.round(parseFloat(stats?.totalRedeemed || '0')),
      outstandingBalance: this.round(parseFloat(stats?.outstandingBalance || '0')),
      activeCards: parseInt(stats?.activeCards || '0'),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const giftCardService = new GiftCardService();
