import { EntityManager, Repository, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Shift, CashMovement, ShiftStatus, CashMovementType } from '../entities/Shift.entity';
import { Order, Payment } from '../entities';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../types/enums';
import { auditService, AuditEventType } from './audit.service';

// DTOs
export interface OpenShiftDTO {
  businessId: string;
  userId: string;
  userName: string;
  openingFloat: number;
  terminalId?: string;
  notes?: string;
}

export interface CloseShiftDTO {
  shiftId: string;
  userId: string;
  userName: string;
  actualCash: number;
  notes?: string;
}

export interface CashMovementDTO {
  shiftId: string;
  userId: string;
  userName: string;
  type: CashMovementType;
  amount: number;
  reason?: string;
  referenceId?: string;
}

export interface ShiftSummary {
  shift: Shift;
  salesBreakdown: {
    cash: number;
    card: number;
    other: number;
    total: number;
  };
  refundsBreakdown: {
    cash: number;
    card: number;
    total: number;
  };
  cashDrawer: {
    opening: number;
    sales: number;
    refunds: number;
    cashIn: number;
    cashOut: number;
    expected: number;
    actual: number | null;
    difference: number | null;
  };
  transactions: {
    count: number;
    average: number;
    refunds: number;
    voids: number;
  };
  hourlyBreakdown: Array<{ hour: number; sales: number; transactions: number }>;
}

class ShiftService {
  private shiftRepository: Repository<Shift>;
  private cashMovementRepository: Repository<CashMovement>;
  private orderRepository: Repository<Order>;
  private paymentRepository: Repository<Payment>;

  constructor() {
    this.shiftRepository = AppDataSource.getRepository(Shift);
    this.cashMovementRepository = AppDataSource.getRepository(CashMovement);
    this.orderRepository = AppDataSource.getRepository(Order);
    this.paymentRepository = AppDataSource.getRepository(Payment);
  }

  /**
   * Open a new shift
   */
  async openShift(dto: OpenShiftDTO): Promise<Shift> {
    // Check if user already has an open shift
    const existingShift = await this.shiftRepository.findOne({
      where: {
        businessId: dto.businessId,
        userId: dto.userId,
        status: ShiftStatus.OPEN,
      },
    });

    if (existingShift) {
      throw new Error('You already have an open shift. Please close it before opening a new one.');
    }

    // Check if terminal has an open shift (if terminal-based)
    if (dto.terminalId) {
      const terminalShift = await this.shiftRepository.findOne({
        where: {
          businessId: dto.businessId,
          terminalId: dto.terminalId,
          status: ShiftStatus.OPEN,
        },
      });

      if (terminalShift) {
        throw new Error('This terminal already has an open shift.');
      }
    }

    return AppDataSource.transaction(async (manager: EntityManager) => {
      // Get next shift number for this business
      const lastShift = await manager.getRepository(Shift).findOne({
        where: { businessId: dto.businessId },
        order: { shiftNumber: 'DESC' },
      });

      const shiftNumber = (lastShift?.shiftNumber || 0) + 1;

      // Create shift
      const shift = manager.create(Shift, {
        shiftNumber,
        businessId: dto.businessId,
        userId: dto.userId,
        terminalId: dto.terminalId || null,
        status: ShiftStatus.OPEN,
        openingFloat: dto.openingFloat,
        expectedCash: dto.openingFloat,
        openedAt: new Date(),
        openingNotes: dto.notes || null,
      });

      await manager.save(shift);

      // Record opening float as first cash movement
      if (dto.openingFloat > 0) {
        const movement = manager.create(CashMovement, {
          shiftId: shift.id,
          userId: dto.userId,
          type: CashMovementType.OPENING_FLOAT,
          amount: dto.openingFloat,
          runningBalance: dto.openingFloat,
          reason: 'Opening float',
        });
        await manager.save(movement);
      }

      // Audit log
      await auditService.logCashDrawer(
        AuditEventType.CASH_DRAWER_OPENED,
        dto.businessId,
        dto.userId,
        dto.userName,
        dto.openingFloat,
        'Shift opened',
        { shiftId: shift.id, shiftNumber }
      );

      return shift;
    });
  }

  /**
   * Close a shift
   */
  async closeShift(dto: CloseShiftDTO): Promise<ShiftSummary> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const shift = await manager
        .getRepository(Shift)
        .createQueryBuilder('shift')
        .setLock('pessimistic_write')
        .where('shift.id = :id', { id: dto.shiftId })
        .andWhere('shift.status = :status', { status: ShiftStatus.OPEN })
        .getOne();

      if (!shift) {
        throw new Error('Shift not found or already closed');
      }

      // Calculate shift totals from orders
      const salesData = await this.calculateShiftSales(shift.id, shift.businessId, shift.openedAt);

      // Update shift with calculated totals
      shift.totalSales = salesData.totalSales;
      shift.totalRefunds = salesData.totalRefunds;
      shift.totalDiscounts = salesData.totalDiscounts;
      shift.totalTax = salesData.totalTax;
      shift.totalTips = salesData.totalTips;
      shift.transactionCount = salesData.transactionCount;
      shift.refundCount = salesData.refundCount;
      shift.cashSales = salesData.cashSales;
      shift.cardSales = salesData.cardSales;
      shift.otherSales = salesData.otherSales;

      // Calculate expected cash
      const expectedCash =
        Number(shift.openingFloat) +
        Number(salesData.cashSales) -
        Number(salesData.cashRefunds) +
        Number(shift.cashInTotal) -
        Number(shift.cashOutTotal);

      shift.expectedCash = this.round(expectedCash);
      shift.actualCash = dto.actualCash;
      shift.cashDifference = this.round(dto.actualCash - expectedCash);
      shift.status = ShiftStatus.CLOSED;
      shift.closedAt = new Date();
      shift.closedById = dto.userId;
      shift.closingNotes = dto.notes || null;

      await manager.save(shift);

      // Record closing count
      const movement = manager.create(CashMovement, {
        shiftId: shift.id,
        userId: dto.userId,
        type: CashMovementType.CLOSING_COUNT,
        amount: dto.actualCash,
        runningBalance: dto.actualCash,
        reason: `Closing count. Expected: ${expectedCash.toFixed(2)}, Actual: ${dto.actualCash.toFixed(2)}, Diff: ${shift.cashDifference?.toFixed(2)}`,
      });
      await manager.save(movement);

      // Audit log
      await auditService.logCashDrawer(
        AuditEventType.CASH_DRAWER_COUNTED,
        shift.businessId,
        dto.userId,
        dto.userName,
        dto.actualCash,
        'Shift closed',
        {
          shiftId: shift.id,
          shiftNumber: shift.shiftNumber,
          expectedCash,
          difference: shift.cashDifference,
        }
      );

      return this.getShiftSummary(shift.id);
    });
  }

  /**
   * Record a cash movement (cash in/out)
   */
  async recordCashMovement(dto: CashMovementDTO): Promise<CashMovement> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const shift = await manager
        .getRepository(Shift)
        .createQueryBuilder('shift')
        .setLock('pessimistic_write')
        .where('shift.id = :id', { id: dto.shiftId })
        .andWhere('shift.status = :status', { status: ShiftStatus.OPEN })
        .getOne();

      if (!shift) {
        throw new Error('Shift not found or not open');
      }

      // Get current running balance
      const lastMovement = await manager.getRepository(CashMovement).findOne({
        where: { shiftId: dto.shiftId },
        order: { createdAt: 'DESC' },
      });

      const previousBalance = lastMovement?.runningBalance || shift.openingFloat;

      // Calculate new balance based on movement type
      let newBalance: number;
      let isPositive: boolean;

      switch (dto.type) {
        case CashMovementType.CASH_IN:
        case CashMovementType.CASH_SALE:
          newBalance = Number(previousBalance) + dto.amount;
          isPositive = true;
          shift.cashInTotal = Number(shift.cashInTotal) + dto.amount;
          break;
        case CashMovementType.CASH_OUT:
        case CashMovementType.PAY_OUT:
        case CashMovementType.DROP:
        case CashMovementType.CASH_REFUND:
          newBalance = Number(previousBalance) - dto.amount;
          isPositive = false;
          shift.cashOutTotal = Number(shift.cashOutTotal) + dto.amount;
          break;
        default:
          newBalance = Number(previousBalance);
          isPositive = true;
      }

      // Update expected cash
      if (isPositive) {
        shift.expectedCash = Number(shift.expectedCash) + dto.amount;
      } else {
        shift.expectedCash = Number(shift.expectedCash) - dto.amount;
      }

      await manager.save(shift);

      // Create movement record
      const movement = manager.create(CashMovement, {
        shiftId: dto.shiftId,
        userId: dto.userId,
        type: dto.type,
        amount: dto.amount,
        runningBalance: this.round(newBalance),
        reason: dto.reason || null,
        referenceId: dto.referenceId || null,
      });

      await manager.save(movement);

      // Audit log
      const eventType = dto.type === CashMovementType.CASH_IN
        ? AuditEventType.CASH_IN
        : AuditEventType.CASH_OUT;

      await auditService.logCashDrawer(
        eventType,
        shift.businessId,
        dto.userId,
        dto.userName,
        dto.amount,
        dto.reason || dto.type,
        { shiftId: shift.id, movementType: dto.type }
      );

      return movement;
    });
  }

  /**
   * Get current open shift for user
   */
  async getCurrentShift(businessId: string, userId: string): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: {
        businessId,
        userId,
        status: ShiftStatus.OPEN,
      },
      relations: ['user'],
    });
  }

  /**
   * Get shift by terminal
   */
  async getTerminalShift(businessId: string, terminalId: string): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: {
        businessId,
        terminalId,
        status: ShiftStatus.OPEN,
      },
      relations: ['user'],
    });
  }

  /**
   * Get shift summary with full breakdown
   */
  async getShiftSummary(shiftId: string): Promise<ShiftSummary> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['user', 'closedBy', 'cashMovements'],
    });

    if (!shift) {
      throw new Error('Shift not found');
    }

    // Get detailed breakdown
    const salesData = await this.calculateShiftSales(
      shift.id,
      shift.businessId,
      shift.openedAt,
      shift.closedAt || undefined
    );

    // Get hourly breakdown
    const hourlyBreakdown = await this.getHourlyBreakdown(
      shift.businessId,
      shift.openedAt,
      shift.closedAt || new Date()
    );

    return {
      shift,
      salesBreakdown: {
        cash: salesData.cashSales,
        card: salesData.cardSales,
        other: salesData.otherSales,
        total: salesData.totalSales,
      },
      refundsBreakdown: {
        cash: salesData.cashRefunds,
        card: salesData.cardRefunds,
        total: salesData.totalRefunds,
      },
      cashDrawer: {
        opening: Number(shift.openingFloat),
        sales: salesData.cashSales,
        refunds: salesData.cashRefunds,
        cashIn: Number(shift.cashInTotal),
        cashOut: Number(shift.cashOutTotal),
        expected: Number(shift.expectedCash),
        actual: shift.actualCash ? Number(shift.actualCash) : null,
        difference: shift.cashDifference ? Number(shift.cashDifference) : null,
      },
      transactions: {
        count: salesData.transactionCount,
        average: salesData.transactionCount > 0
          ? this.round(salesData.totalSales / salesData.transactionCount)
          : 0,
        refunds: salesData.refundCount,
        voids: shift.voidCount,
      },
      hourlyBreakdown,
    };
  }

  /**
   * Get all shifts for a business (with pagination)
   */
  async getShifts(
    businessId: string,
    options: {
      status?: ShiftStatus;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ shifts: Shift[]; total: number }> {
    const query = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.businessId = :businessId', { businessId })
      .leftJoinAndSelect('shift.user', 'user')
      .leftJoinAndSelect('shift.closedBy', 'closedBy');

    if (options.status) {
      query.andWhere('shift.status = :status', { status: options.status });
    }

    if (options.userId) {
      query.andWhere('shift.userId = :userId', { userId: options.userId });
    }

    if (options.startDate) {
      query.andWhere('shift.openedAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      query.andWhere('shift.openedAt <= :endDate', { endDate: options.endDate });
    }

    const total = await query.getCount();

    query
      .orderBy('shift.openedAt', 'DESC')
      .skip(options.offset || 0)
      .take(options.limit || 20);

    const shifts = await query.getMany();

    return { shifts, total };
  }

  /**
   * Get cash movements for a shift
   */
  async getShiftMovements(shiftId: string): Promise<CashMovement[]> {
    return this.cashMovementRepository.find({
      where: { shiftId },
      order: { createdAt: 'ASC' },
      relations: ['user'],
    });
  }

  // Private helpers

  private async calculateShiftSales(
    shiftId: string,
    businessId: string,
    startTime: Date,
    endTime?: Date
  ): Promise<{
    totalSales: number;
    totalRefunds: number;
    totalDiscounts: number;
    totalTax: number;
    totalTips: number;
    transactionCount: number;
    refundCount: number;
    cashSales: number;
    cardSales: number;
    otherSales: number;
    cashRefunds: number;
    cardRefunds: number;
  }> {
    const end = endTime || new Date();

    // Get completed orders
    const ordersQuery = this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as totalSales',
        'COALESCE(SUM(order.discount), 0) as totalDiscounts',
        'COALESCE(SUM(order.taxAmount), 0) as totalTax',
        'COALESCE(SUM(order.tipAmount), 0) as totalTips',
        'COUNT(order.id) as transactionCount',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt >= :startTime', { startTime })
      .andWhere('order.completedAt <= :endTime', { endTime: end });

    const orderStats = await ordersQuery.getRawOne();

    // Get payments by method
    const paymentsQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.method as method',
        'COALESCE(SUM(payment.amountApplied), 0) as amount',
      ])
      .innerJoin('payment.order', 'order')
      .where('payment.businessId = :businessId', { businessId })
      .andWhere('payment.status = :status', { status: PaymentStatus.CAPTURED })
      .andWhere('order.completedAt >= :startTime', { startTime })
      .andWhere('order.completedAt <= :endTime', { endTime: end })
      .groupBy('payment.method');

    const paymentStats = await paymentsQuery.getRawMany();

    let cashSales = 0;
    let cardSales = 0;
    let otherSales = 0;

    for (const stat of paymentStats) {
      const amount = parseFloat(stat.amount || '0');
      if (stat.method === PaymentMethod.CASH) {
        cashSales = amount;
      } else if ([PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD].includes(stat.method)) {
        cardSales += amount;
      } else {
        otherSales += amount;
      }
    }

    // Get refunds (simplified - would need Refund entity join in production)
    const refundedOrders = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'count')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.updatedAt >= :startTime', { startTime })
      .andWhere('order.updatedAt <= :endTime', { endTime: end })
      .getRawOne();

    return {
      totalSales: this.round(parseFloat(orderStats?.totalSales || '0')),
      totalRefunds: 0, // Would calculate from Refund entity
      totalDiscounts: this.round(parseFloat(orderStats?.totalDiscounts || '0')),
      totalTax: this.round(parseFloat(orderStats?.totalTax || '0')),
      totalTips: this.round(parseFloat(orderStats?.totalTips || '0')),
      transactionCount: parseInt(orderStats?.transactionCount || '0'),
      refundCount: parseInt(refundedOrders?.count || '0'),
      cashSales: this.round(cashSales),
      cardSales: this.round(cardSales),
      otherSales: this.round(otherSales),
      cashRefunds: 0, // Would calculate from Refund entity
      cardRefunds: 0,
    };
  }

  private async getHourlyBreakdown(
    businessId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ hour: number; sales: number; transactions: number }>> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'EXTRACT(HOUR FROM order.completedAt) as hour',
        'COUNT(order.id) as transactions',
        'COALESCE(SUM(order.total), 0) as sales',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt >= :startTime', { startTime })
      .andWhere('order.completedAt <= :endTime', { endTime })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Fill in all 24 hours
    const hourlyData: Array<{ hour: number; sales: number; transactions: number }> = [];
    for (let h = 0; h < 24; h++) {
      const found = result.find((r) => parseInt(r.hour) === h);
      hourlyData.push({
        hour: h,
        sales: found ? this.round(parseFloat(found.sales)) : 0,
        transactions: found ? parseInt(found.transactions) : 0,
      });
    }

    return hourlyData;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const shiftService = new ShiftService();
