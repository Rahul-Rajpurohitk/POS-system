import { AppDataSource } from '../config/database';
import { Delivery, LocationPoint } from '../entities/Delivery.entity';
import { Order } from '../entities/Order.entity';
import { DriverProfile } from '../entities/DriverProfile.entity';
import { DeliveryStatus, OrderStatus, DriverStatus } from '../types/enums';
import { realtimeService, RealtimeEvent } from './realtime.service';
import { Between, In, IsNull, Not } from 'typeorm';

export interface CreateDeliveryParams {
  orderId: string;
  businessId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryInstructions?: string;
  customerName: string;
  customerPhone: string;
  deliveryFee?: number;
  driverTip?: number;
  distanceMeters?: number;
  estimatedDurationSeconds?: number;
}

export interface UpdateDeliveryStatusParams {
  deliveryId: string;
  businessId: string;
  status: DeliveryStatus;
  driverId?: string;
  latitude?: number;
  longitude?: number;
  deliveryPhoto?: string;
  signatureImage?: string;
  cancellationReason?: string;
}

/**
 * Delivery Service - Handles delivery lifecycle and tracking
 */
export class DeliveryService {
  private deliveryRepository = AppDataSource.getRepository(Delivery);
  private orderRepository = AppDataSource.getRepository(Order);
  private driverRepository = AppDataSource.getRepository(DriverProfile);

  /**
   * Create a new delivery for an order
   */
  async createDelivery(params: CreateDeliveryParams): Promise<Delivery> {
    const {
      orderId,
      businessId,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryInstructions,
      customerName,
      customerPhone,
      deliveryFee = 0,
      driverTip = 0,
      distanceMeters,
      estimatedDurationSeconds,
    } = params;

    // Verify order exists
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if delivery already exists for this order
    const existingDelivery = await this.deliveryRepository.findOne({
      where: { orderId },
    });

    if (existingDelivery) {
      throw new Error('Delivery already exists for this order');
    }

    // Calculate estimated arrival
    let estimatedArrival: Date | null = null;
    if (estimatedDurationSeconds) {
      estimatedArrival = new Date(Date.now() + estimatedDurationSeconds * 1000);
    }

    // Create delivery
    const delivery = this.deliveryRepository.create({
      orderId,
      businessId,
      status: DeliveryStatus.PENDING,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      deliveryAddress,
      deliveryLatitude: deliveryLatitude || null,
      deliveryLongitude: deliveryLongitude || null,
      deliveryInstructions: deliveryInstructions || null,
      customerName,
      customerPhone,
      deliveryFee,
      driverTip,
      distanceMeters: distanceMeters || null,
      estimatedDurationSeconds: estimatedDurationSeconds || null,
      estimatedArrival,
      locationHistory: [],
    });

    const savedDelivery = await this.deliveryRepository.save(delivery);

    // Update order with delivery flag
    await this.orderRepository.update(orderId, {
      isDelivery: true,
      deliveryAddress,
      deliveryLatitude: deliveryLatitude || null,
      deliveryLongitude: deliveryLongitude || null,
      deliveryFee,
    });

    // Emit real-time event
    this.emitDeliveryEvent(businessId, 'DELIVERY_CREATED', savedDelivery);

    return savedDelivery;
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(deliveryId: string, businessId: string): Promise<Delivery | null> {
    return this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
      relations: ['order', 'driver', 'driver.user'],
    });
  }

  /**
   * Get delivery by tracking token (public access)
   */
  async getDeliveryByTrackingToken(trackingToken: string): Promise<Delivery | null> {
    return this.deliveryRepository.findOne({
      where: { trackingToken },
      relations: ['order', 'driver', 'driver.user'],
    });
  }

  /**
   * Get delivery by order ID
   */
  async getDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
    return this.deliveryRepository.findOne({
      where: { orderId },
      relations: ['order', 'driver', 'driver.user'],
    });
  }

  /**
   * Get active deliveries for a business
   */
  async getActiveDeliveries(businessId: string): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      where: {
        businessId,
        status: In([
          DeliveryStatus.PENDING,
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.ASSIGNED,
          DeliveryStatus.PICKING_UP,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.ON_THE_WAY,
          DeliveryStatus.NEARBY,
        ]),
      },
      relations: ['order', 'driver', 'driver.user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get deliveries by driver (paginated)
   */
  async getDriverDeliveries(
    driverId: string,
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ deliveries: Delivery[]; total: number }> {
    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: { driverId, businessId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { deliveries, total };
  }

  /**
   * Get active deliveries for driver
   */
  async getActiveDriverDeliveries(driverId: string): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      where: {
        driverId,
        status: In([
          DeliveryStatus.ASSIGNED,
          DeliveryStatus.PICKING_UP,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.ON_THE_WAY,
          DeliveryStatus.NEARBY,
        ]),
      },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(params: UpdateDeliveryStatusParams): Promise<Delivery> {
    const {
      deliveryId,
      businessId,
      status,
      driverId,
      latitude,
      longitude,
      deliveryPhoto,
      signatureImage,
      cancellationReason,
    } = params;

    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
      relations: ['driver'],
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Validate status transition
    this.validateStatusTransition(delivery.status, status);

    // Build update object
    const updateData: Partial<Delivery> = { status };

    // Handle status-specific updates
    switch (status) {
      case DeliveryStatus.ACCEPTED:
        updateData.acceptedAt = new Date();
        break;

      case DeliveryStatus.ASSIGNED:
        if (!driverId) {
          throw new Error('Driver ID required for assignment');
        }
        updateData.driverId = driverId;
        updateData.assignedAt = new Date();
        // Update driver's active delivery
        await this.driverRepository.update(driverId, {
          activeDeliveryId: deliveryId,
          status: DriverStatus.BUSY,
        });
        break;

      case DeliveryStatus.PICKED_UP:
        updateData.pickedUpAt = new Date();
        break;

      case DeliveryStatus.DELIVERED:
        updateData.deliveredAt = new Date();
        if (deliveryPhoto) updateData.deliveryPhoto = deliveryPhoto;
        if (signatureImage) updateData.signatureImage = signatureImage;
        // Update order status
        await this.orderRepository.update(delivery.orderId, {
          status: OrderStatus.DELIVERED,
        });
        // Free up driver
        if (delivery.driverId) {
          await this.completeDriverDelivery(delivery.driverId);
        }
        break;

      case DeliveryStatus.CANCELLED:
      case DeliveryStatus.FAILED:
        updateData.cancelledAt = new Date();
        if (cancellationReason) updateData.cancellationReason = cancellationReason;
        // Free up driver if assigned
        if (delivery.driverId) {
          await this.freeUpDriver(delivery.driverId);
        }
        break;
    }

    // Add location to history if provided
    if (latitude !== undefined && longitude !== undefined) {
      const locationHistory = [...(delivery.locationHistory || [])];
      locationHistory.push({
        lat: latitude,
        lng: longitude,
        timestamp: Date.now(),
      });
      updateData.locationHistory = locationHistory;
    }

    await this.deliveryRepository.update(deliveryId, updateData);

    const updatedDelivery = await this.getDeliveryById(deliveryId, businessId);

    // Emit real-time event
    this.emitDeliveryEvent(businessId, 'DELIVERY_STATUS_UPDATED', updatedDelivery!);

    return updatedDelivery!;
  }

  /**
   * Update driver location for a delivery
   */
  async updateDriverLocation(
    deliveryId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<void> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery || !delivery.isActive) {
      return; // Silently ignore for inactive deliveries
    }

    // Add to location history (throttling should be done at API level)
    const locationPoint: LocationPoint = {
      lat: latitude,
      lng: longitude,
      timestamp: Date.now(),
      accuracy,
    };

    const locationHistory = [...(delivery.locationHistory || [])];
    locationHistory.push(locationPoint);

    // Keep only last 100 points
    if (locationHistory.length > 100) {
      locationHistory.splice(0, locationHistory.length - 100);
    }

    await this.deliveryRepository.update(deliveryId, { locationHistory });

    // Update driver's current location
    if (delivery.driverId) {
      await this.driverRepository.update(delivery.driverId, {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: new Date(),
      });
    }

    // Check if driver is nearby (within 200m)
    if (delivery.deliveryLatitude && delivery.deliveryLongitude) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        Number(delivery.deliveryLatitude),
        Number(delivery.deliveryLongitude)
      );

      if (distance <= 200 && delivery.status === DeliveryStatus.ON_THE_WAY) {
        await this.deliveryRepository.update(deliveryId, {
          status: DeliveryStatus.NEARBY,
        });
      }
    }

    // Emit location update (to tracking room)
    this.emitLocationUpdate(delivery.businessId, deliveryId, latitude, longitude);
  }

  /**
   * Update ETA for a delivery
   */
  async updateDeliveryETA(
    deliveryId: string,
    estimatedArrival: Date,
    estimatedDurationSeconds: number
  ): Promise<void> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) return;

    await this.deliveryRepository.update(deliveryId, {
      estimatedArrival,
      estimatedDurationSeconds,
    });

    this.emitDeliveryEvent(delivery.businessId, 'DELIVERY_ETA_UPDATED', {
      id: deliveryId,
      estimatedArrival,
      estimatedDurationSeconds,
    });
  }

  /**
   * Rate a delivery (customer feedback)
   */
  async rateDelivery(
    trackingToken: string,
    rating: number,
    feedback?: string
  ): Promise<Delivery> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const delivery = await this.deliveryRepository.findOne({
      where: { trackingToken },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      throw new Error('Can only rate delivered orders');
    }

    await this.deliveryRepository.update(delivery.id, {
      customerRating: rating,
      customerFeedback: feedback || null,
    });

    // Update driver's average rating
    if (delivery.driverId) {
      await this.updateDriverRating(delivery.driverId, rating);
    }

    return (await this.deliveryRepository.findOne({ where: { id: delivery.id } }))!;
  }

  /**
   * Get delivery statistics for a business
   */
  async getDeliveryStats(businessId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    averageDeliveryTime: number;
    averageRating: number;
  }> {
    const query = this.deliveryRepository.createQueryBuilder('delivery')
      .where('delivery.businessId = :businessId', { businessId });

    if (startDate && endDate) {
      query.andWhere('delivery.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const deliveries = await query.getMany();

    const completed = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED);
    const cancelled = deliveries.filter(d =>
      d.status === DeliveryStatus.CANCELLED || d.status === DeliveryStatus.FAILED
    );
    const inProgress = deliveries.filter(d => d.isActive);

    // Calculate average delivery time (from accepted to delivered)
    const deliveryTimes = completed
      .filter(d => d.acceptedAt && d.deliveredAt)
      .map(d => d.deliveredAt!.getTime() - d.acceptedAt!.getTime());

    const averageDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / 60000 // in minutes
      : 0;

    // Calculate average rating
    const ratings = completed.filter(d => d.customerRating).map(d => d.customerRating!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    return {
      total: deliveries.length,
      completed: completed.length,
      cancelled: cancelled.length,
      inProgress: inProgress.length,
      averageDeliveryTime,
      averageRating,
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): void {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.PENDING]: [DeliveryStatus.ACCEPTED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ACCEPTED]: [DeliveryStatus.ASSIGNED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKING_UP, DeliveryStatus.CANCELLED],
      [DeliveryStatus.PICKING_UP]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
      [DeliveryStatus.PICKED_UP]: [DeliveryStatus.ON_THE_WAY, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ON_THE_WAY]: [DeliveryStatus.NEARBY, DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
      [DeliveryStatus.NEARBY]: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.CANCELLED]: [],
      [DeliveryStatus.FAILED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Complete driver's delivery and update stats
   */
  private async completeDriverDelivery(driverId: string): Promise<void> {
    await this.driverRepository.update(driverId, {
      activeDeliveryId: null,
      status: DriverStatus.AVAILABLE,
      deliveriesToday: () => 'deliveries_today + 1',
      totalDeliveries: () => 'total_deliveries + 1',
    } as any);
  }

  /**
   * Free up driver without incrementing stats (for cancelled/failed)
   */
  private async freeUpDriver(driverId: string): Promise<void> {
    await this.driverRepository.update(driverId, {
      activeDeliveryId: null,
      status: DriverStatus.AVAILABLE,
    });
  }

  /**
   * Update driver's average rating
   */
  private async updateDriverRating(driverId: string, newRating: number): Promise<void> {
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (!driver) return;

    const totalRatings = driver.totalRatings + 1;
    const averageRating = (
      (Number(driver.averageRating) * driver.totalRatings + newRating) / totalRatings
    );

    await this.driverRepository.update(driverId, {
      averageRating,
      totalRatings,
    });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Emit delivery event via realtime service
   */
  private emitDeliveryEvent(businessId: string, eventType: string, data: any): void {
    // We'll add proper delivery events to RealtimeEvent enum later
    // For now, use a generic approach
    realtimeService.broadcastToBusiness(
      businessId,
      `delivery:${eventType.toLowerCase()}` as RealtimeEvent,
      data
    );
  }

  /**
   * Emit location update for tracking
   */
  private emitLocationUpdate(
    businessId: string,
    deliveryId: string,
    latitude: number,
    longitude: number
  ): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'delivery:location:updated' as RealtimeEvent,
      { deliveryId, latitude, longitude, timestamp: Date.now() }
    );
  }

  // ============ ADDITIONAL METHODS FOR API ============

  /**
   * Get paginated list of deliveries
   */
  async getDeliveries(
    businessId: string,
    page: number = 1,
    limit: number = 20,
    status?: DeliveryStatus
  ): Promise<{ deliveries: Delivery[]; total: number }> {
    const where: any = { businessId };
    if (status) {
      where.status = status;
    }

    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where,
      relations: ['order', 'driver', 'driver.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { deliveries, total };
  }

  /**
   * Assign a driver to a delivery
   */
  async assignDriver(
    deliveryId: string,
    driverId: string,
    businessId: string
  ): Promise<{ success: boolean; delivery?: Delivery; error?: string }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
      relations: ['order'],
    });

    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }

    if (delivery.status !== DeliveryStatus.ACCEPTED) {
      return { success: false, error: 'Delivery must be in ACCEPTED status to assign driver' };
    }

    const driver = await this.driverRepository.findOne({
      where: { id: driverId, businessId },
    });

    if (!driver) {
      return { success: false, error: 'Driver not found' };
    }

    if (driver.status !== DriverStatus.AVAILABLE) {
      return { success: false, error: 'Driver is not available' };
    }

    // Assign driver
    delivery.driverId = driverId;
    delivery.status = DeliveryStatus.ASSIGNED;
    delivery.assignedAt = new Date();

    await this.deliveryRepository.save(delivery);

    // Update driver status
    await this.driverRepository.update(driverId, {
      status: DriverStatus.BUSY,
      activeDeliveryId: deliveryId,
    });

    // Emit event
    realtimeService.emitDeliveryStatusUpdate(
      businessId,
      deliveryId,
      delivery.trackingToken,
      DeliveryStatus.ASSIGNED,
      { driverId }
    );

    return { success: true, delivery };
  }

  /**
   * Update delivery status (simplified)
   */
  async updateStatus(
    deliveryId: string,
    status: DeliveryStatus,
    businessId: string
  ): Promise<{ success: boolean; delivery?: Delivery; error?: string }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
    });

    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }

    try {
      this.validateStatusTransition(delivery.status, status);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    delivery.status = status;

    // Update timestamps based on status
    if (status === DeliveryStatus.PICKING_UP) {
      // Driver arrived at store
    } else if (status === DeliveryStatus.PICKED_UP) {
      delivery.pickedUpAt = new Date();
    } else if (status === DeliveryStatus.DELIVERED) {
      delivery.deliveredAt = new Date();
      if (delivery.driverId) {
        await this.completeDriverDelivery(delivery.driverId);
      }
    } else if (status === DeliveryStatus.CANCELLED || status === DeliveryStatus.FAILED) {
      if (delivery.driverId) {
        await this.freeUpDriver(delivery.driverId);
      }
    }

    await this.deliveryRepository.save(delivery);

    // Emit event
    realtimeService.emitDeliveryStatusUpdate(
      businessId,
      deliveryId,
      delivery.trackingToken,
      status
    );

    return { success: true, delivery };
  }

  /**
   * Complete a delivery with optional proof photo
   */
  async completeDelivery(
    deliveryId: string,
    photoUrl: string | null,
    businessId: string
  ): Promise<{ success: boolean; delivery?: Delivery; error?: string }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
    });

    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }

    const validStatuses = [DeliveryStatus.ON_THE_WAY, DeliveryStatus.NEARBY];
    if (!validStatuses.includes(delivery.status)) {
      return { success: false, error: 'Invalid status for completion' };
    }

    delivery.status = DeliveryStatus.DELIVERED;
    delivery.deliveredAt = new Date();
    if (photoUrl) {
      delivery.deliveryPhoto = photoUrl;
    }

    await this.deliveryRepository.save(delivery);

    if (delivery.driverId) {
      await this.completeDriverDelivery(delivery.driverId);
    }

    // Update order status
    await this.orderRepository.update(delivery.orderId, {
      status: OrderStatus.DELIVERED,
    });

    // Emit event
    realtimeService.emitDeliveryStatusUpdate(
      businessId,
      deliveryId,
      delivery.trackingToken,
      DeliveryStatus.DELIVERED,
      { deliveredAt: delivery.deliveredAt }
    );

    return { success: true, delivery };
  }

  /**
   * Update tip amount
   */
  async updateTip(deliveryId: string, tipAmount: number, businessId: string): Promise<void> {
    await this.deliveryRepository.update(
      { id: deliveryId, businessId },
      { driverTip: tipAmount }
    );
  }

  /**
   * Get driver-specific delivery stats
   */
  async getDriverStats(
    driverId: string,
    businessId: string
  ): Promise<{
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    averageDeliveryTime: number;
    onTimePercentage: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedToday = await this.deliveryRepository.count({
      where: {
        driverId,
        businessId,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: Between(startOfDay, now),
      },
    });

    const completedThisWeek = await this.deliveryRepository.count({
      where: {
        driverId,
        businessId,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: Between(startOfWeek, now),
      },
    });

    const completedThisMonth = await this.deliveryRepository.count({
      where: {
        driverId,
        businessId,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: Between(startOfMonth, now),
      },
    });

    // Calculate average delivery time (from pickup to delivery)
    const recentDeliveries = await this.deliveryRepository.find({
      where: {
        driverId,
        businessId,
        status: DeliveryStatus.DELIVERED,
        pickedUpAt: Not(IsNull()),
        deliveredAt: Not(IsNull()),
      },
      order: { deliveredAt: 'DESC' },
      take: 50,
    });

    let totalTime = 0;
    let onTimeCount = 0;

    for (const d of recentDeliveries) {
      if (d.pickedUpAt && d.deliveredAt) {
        const deliveryTime = d.deliveredAt.getTime() - d.pickedUpAt.getTime();
        totalTime += deliveryTime;

        // Consider "on time" if within estimated duration + 10 minutes
        if (d.estimatedDurationSeconds && d.estimatedArrival) {
          const wasOnTime = d.deliveredAt <= new Date(d.estimatedArrival.getTime() + 10 * 60 * 1000);
          if (wasOnTime) onTimeCount++;
        } else {
          onTimeCount++; // No estimate = on time by default
        }
      }
    }

    const averageDeliveryTime = recentDeliveries.length > 0
      ? Math.round(totalTime / recentDeliveries.length / 1000 / 60) // in minutes
      : 0;

    const onTimePercentage = recentDeliveries.length > 0
      ? Math.round((onTimeCount / recentDeliveries.length) * 100)
      : 100;

    return {
      completedToday,
      completedThisWeek,
      completedThisMonth,
      averageDeliveryTime,
      onTimePercentage,
    };
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;
