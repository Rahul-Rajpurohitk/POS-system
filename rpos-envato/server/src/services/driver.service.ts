import { AppDataSource } from '../config/database';
import { DriverProfile, WorkingHoursConfig } from '../entities/DriverProfile.entity';
import { User } from '../entities/User.entity';
import { DriverStatus, VehicleType, Role } from '../types/enums';
import { realtimeService, RealtimeEvent } from './realtime.service';

export interface CreateDriverParams {
  userId: string;
  businessId: string;
  vehicleType: VehicleType;
  workingHours?: WorkingHoursConfig;
  maxConcurrentDeliveries?: number;
}

export interface UpdateDriverParams {
  vehicleType?: VehicleType;
  workingHours?: WorkingHoursConfig;
  maxConcurrentDeliveries?: number;
  enabled?: boolean;
}

export interface UpdateLocationParams {
  driverId: string;
  latitude: number;
  longitude: number;
}

/**
 * Driver Service - Manages driver profiles and status
 */
export class DriverService {
  private driverRepository = AppDataSource.getRepository(DriverProfile);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new driver profile
   */
  async createDriver(params: CreateDriverParams): Promise<DriverProfile> {
    const {
      userId,
      businessId,
      vehicleType,
      workingHours,
      maxConcurrentDeliveries = 1,
    } = params;

    // Verify user exists and belongs to the business
    const user = await this.userRepository.findOne({
      where: { id: userId, businessId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if driver profile already exists
    const existingDriver = await this.driverRepository.findOne({
      where: { userId, businessId },
    });

    if (existingDriver) {
      throw new Error('Driver profile already exists for this user');
    }

    const driver = this.driverRepository.create({
      userId,
      businessId,
      vehicleType,
      workingHours: workingHours || null,
      maxConcurrentDeliveries,
      status: DriverStatus.OFFLINE,
      deliveriesToday: 0,
      totalDeliveries: 0,
      averageRating: 5.0,
      totalRatings: 0,
      enabled: true,
    });

    return this.driverRepository.save(driver);
  }

  /**
   * Get driver by ID
   */
  async getDriverById(driverId: string, businessId: string): Promise<DriverProfile | null> {
    return this.driverRepository.findOne({
      where: { id: driverId, businessId },
      relations: ['user'],
    });
  }

  /**
   * Get driver by user ID
   */
  async getDriverByUserId(userId: string, businessId: string): Promise<DriverProfile | null> {
    return this.driverRepository.findOne({
      where: { userId, businessId },
      relations: ['user'],
    });
  }

  /**
   * Get all drivers for a business
   */
  async getBusinessDrivers(
    businessId: string,
    options?: { enabledOnly?: boolean; availableOnly?: boolean }
  ): Promise<DriverProfile[]> {
    const { enabledOnly = false, availableOnly = false } = options || {};

    const query = this.driverRepository.createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('driver.businessId = :businessId', { businessId });

    if (enabledOnly) {
      query.andWhere('driver.enabled = :enabled', { enabled: true });
    }

    if (availableOnly) {
      query.andWhere('driver.status = :status', { status: DriverStatus.AVAILABLE });
    }

    return query.orderBy('driver.createdAt', 'DESC').getMany();
  }

  /**
   * Update driver profile
   */
  async updateDriver(
    driverId: string,
    businessId: string,
    params: UpdateDriverParams
  ): Promise<DriverProfile | null> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId, businessId },
    });

    if (!driver) {
      return null;
    }

    const updateData: Partial<DriverProfile> = {};

    if (params.vehicleType !== undefined) {
      updateData.vehicleType = params.vehicleType;
    }

    if (params.workingHours !== undefined) {
      updateData.workingHours = params.workingHours;
    }

    if (params.maxConcurrentDeliveries !== undefined) {
      updateData.maxConcurrentDeliveries = params.maxConcurrentDeliveries;
    }

    if (params.enabled !== undefined) {
      updateData.enabled = params.enabled;
      // If disabling, set status to offline
      if (!params.enabled) {
        updateData.status = DriverStatus.OFFLINE;
      }
    }

    await this.driverRepository.update(driverId, updateData);

    return this.getDriverById(driverId, businessId);
  }

  /**
   * Update driver status (online/offline/break)
   */
  async updateDriverStatus(
    driverId: string,
    businessId: string,
    status: DriverStatus
  ): Promise<DriverProfile | null> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId, businessId },
    });

    if (!driver) {
      return null;
    }

    // Can't go available if has active delivery
    if (status === DriverStatus.AVAILABLE && driver.activeDeliveryId) {
      throw new Error('Cannot set status to available while on active delivery');
    }

    // Can't go offline if has active delivery
    if (status === DriverStatus.OFFLINE && driver.activeDeliveryId) {
      throw new Error('Cannot go offline while on active delivery');
    }

    await this.driverRepository.update(driverId, { status });

    // Emit status change event
    this.emitDriverStatusChange(businessId, driverId, status);

    return this.getDriverById(driverId, businessId);
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(params: UpdateLocationParams): Promise<void> {
    const { driverId, latitude, longitude } = params;

    await this.driverRepository.update(driverId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      lastLocationUpdate: new Date(),
    });
  }

  /**
   * Get available drivers for assignment
   */
  async getAvailableDrivers(businessId: string): Promise<DriverProfile[]> {
    const now = new Date();

    // Get all available, enabled drivers
    const drivers = await this.driverRepository.find({
      where: {
        businessId,
        status: DriverStatus.AVAILABLE,
        enabled: true,
      },
      relations: ['user'],
    });

    // Filter by working hours
    return drivers.filter(driver => driver.isWithinWorkingHours(now));
  }

  /**
   * Reset daily delivery counts (should run at midnight)
   */
  async resetDailyDeliveryCounts(businessId: string): Promise<void> {
    await this.driverRepository.update(
      { businessId },
      { deliveriesToday: 0 }
    );
  }

  /**
   * Get driver statistics
   */
  async getDriverStats(driverId: string, businessId: string): Promise<{
    totalDeliveries: number;
    deliveriesToday: number;
    averageRating: number;
    totalRatings: number;
    status: DriverStatus;
  } | null> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId, businessId },
    });

    if (!driver) {
      return null;
    }

    return {
      totalDeliveries: driver.totalDeliveries,
      deliveriesToday: driver.deliveriesToday,
      averageRating: Number(driver.averageRating),
      totalRatings: driver.totalRatings,
      status: driver.status,
    };
  }

  /**
   * Delete driver profile
   */
  async deleteDriver(driverId: string, businessId: string): Promise<boolean> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId, businessId },
    });

    if (!driver) {
      return false;
    }

    if (driver.activeDeliveryId) {
      throw new Error('Cannot delete driver with active delivery');
    }

    await this.driverRepository.delete(driverId);
    return true;
  }

  /**
   * Emit driver status change event
   */
  private emitDriverStatusChange(
    businessId: string,
    driverId: string,
    status: DriverStatus
  ): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'driver:status:changed' as RealtimeEvent,
      { driverId, status, timestamp: Date.now() }
    );
  }

  // ============ ALIAS METHODS FOR API COMPATIBILITY ============

  /**
   * Get drivers by business (alias for getBusinessDrivers)
   */
  async getDriversByBusiness(
    businessId: string,
    status?: DriverStatus,
    enabled?: boolean
  ): Promise<DriverProfile[]> {
    return this.getBusinessDrivers(businessId, {
      enabledOnly: enabled,
      availableOnly: status === DriverStatus.AVAILABLE,
    });
  }

  /**
   * Update driver status (simplified)
   */
  async updateStatus(driverId: string, status: DriverStatus): Promise<DriverProfile | null> {
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (!driver) return null;

    driver.status = status;
    await this.driverRepository.save(driver);

    this.emitDriverStatusChange(driver.businessId, driverId, status);

    return driver;
  }

  /**
   * Update driver location (simplified)
   */
  async updateLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    await this.driverRepository.update(driverId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      lastLocationUpdate: new Date(),
    });
  }

  /**
   * Increment delivery count for driver
   */
  async incrementDeliveryCount(driverId: string): Promise<void> {
    await this.driverRepository.update(driverId, {
      deliveriesToday: () => 'deliveries_today + 1',
      totalDeliveries: () => 'total_deliveries + 1',
    } as any);
  }

  /**
   * Clear active delivery for driver
   */
  async clearActiveDelivery(driverId: string): Promise<void> {
    await this.driverRepository.update(driverId, {
      activeDeliveryId: null,
      status: DriverStatus.AVAILABLE,
    });
  }

  /**
   * Set active delivery for driver
   */
  async setActiveDelivery(driverId: string, deliveryId: string): Promise<void> {
    await this.driverRepository.update(driverId, {
      activeDeliveryId: deliveryId,
      status: DriverStatus.BUSY,
    });
  }
}

export const driverService = new DriverService();
export default driverService;
