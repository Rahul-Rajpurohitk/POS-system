import { AppDataSource } from '../config/database';
import { DriverProfile } from '../entities/DriverProfile.entity';
import { Delivery } from '../entities/Delivery.entity';
import { DriverStatus, VehicleType, DeliveryStatus } from '../types/enums';
import { driverService } from './driver.service';
import { deliveryService } from './delivery.service';

/**
 * Driver score breakdown for transparency
 */
export interface DriverScore {
  driverId: string;
  driverName: string;
  totalScore: number;
  breakdown: {
    loadBalancing: number;
    proximity: number;
    vehicleSuitability: number;
    rating: number;
    concurrentPenalty: number;
  };
  distanceToPickup: number;
  vehicleType: VehicleType;
  deliveriesToday: number;
  averageRating: number;
  hasActiveDelivery: boolean;
}

/**
 * Scoring weights (configurable)
 */
const SCORING_WEIGHTS = {
  LOAD_BALANCING: 20,      // Points for fewer deliveries today
  PROXIMITY: 30,           // Points for being closer to pickup
  VEHICLE_SUITABILITY: 20, // Points for appropriate vehicle type
  DRIVER_RATING: 10,       // Points for higher rating
  CONCURRENT_PENALTY: -50, // Penalty for already having delivery
};

/**
 * Vehicle suitability scoring matrix
 * Rows: Vehicle types, Columns: Distance ranges (km)
 */
const VEHICLE_SUITABILITY: Record<VehicleType, number[]> = {
  // Distance ranges: [<1km, 1-3km, 3-5km, 5-10km, >10km]
  [VehicleType.WALKING]: [20, 10, -20, -50, -100],
  [VehicleType.BICYCLE]: [15, 20, 10, -10, -30],
  [VehicleType.E_SCOOTER]: [10, 15, 20, 15, 0],
  [VehicleType.MOTORCYCLE]: [0, 10, 15, 20, 15],
  [VehicleType.CAR]: [-10, 0, 10, 15, 20],
};

/**
 * Distance ranges in km
 */
const DISTANCE_RANGES = [1, 3, 5, 10]; // Upper bounds

/**
 * Driver Assignment Service - Implements weighted scoring algorithm
 * for fair and efficient driver assignment
 */
export class DriverAssignmentService {
  private driverRepository = AppDataSource.getRepository(DriverProfile);
  private deliveryRepository = AppDataSource.getRepository(Delivery);

  /**
   * Get driver suggestions for a delivery, ranked by score
   */
  async getSuggestedDrivers(
    businessId: string,
    pickupLatitude: number,
    pickupLongitude: number,
    deliveryLatitude: number,
    deliveryLongitude: number,
    limit: number = 5
  ): Promise<DriverScore[]> {
    // Calculate total delivery distance for vehicle suitability
    const deliveryDistanceKm = this.calculateDistance(
      pickupLatitude,
      pickupLongitude,
      deliveryLatitude,
      deliveryLongitude
    ) / 1000;

    // Get available drivers
    const availableDrivers = await driverService.getAvailableDrivers(businessId);

    if (availableDrivers.length === 0) {
      return [];
    }

    // Get max deliveries today for load balancing calculation
    const maxDeliveriesToday = Math.max(...availableDrivers.map(d => d.deliveriesToday), 1);

    // Score each driver
    const driverScores: DriverScore[] = [];

    for (const driver of availableDrivers) {
      const score = this.calculateDriverScore(
        driver,
        pickupLatitude,
        pickupLongitude,
        deliveryDistanceKm,
        maxDeliveriesToday
      );

      driverScores.push(score);
    }

    // Sort by total score (descending)
    driverScores.sort((a, b) => b.totalScore - a.totalScore);

    // Return top N suggestions
    return driverScores.slice(0, limit);
  }

  /**
   * Auto-assign the best available driver to a delivery
   */
  async autoAssignDriver(deliveryId: string, businessId: string): Promise<{
    assigned: boolean;
    driverId?: string;
    driverName?: string;
    reason?: string;
  }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
    });

    if (!delivery) {
      return { assigned: false, reason: 'Delivery not found' };
    }

    if (delivery.driverId) {
      return { assigned: false, reason: 'Driver already assigned' };
    }

    if (!delivery.deliveryLatitude || !delivery.deliveryLongitude) {
      return { assigned: false, reason: 'Delivery coordinates missing' };
    }

    // Get driver suggestions
    const suggestions = await this.getSuggestedDrivers(
      businessId,
      Number(delivery.pickupLatitude),
      Number(delivery.pickupLongitude),
      Number(delivery.deliveryLatitude),
      Number(delivery.deliveryLongitude),
      1
    );

    if (suggestions.length === 0) {
      return { assigned: false, reason: 'No available drivers' };
    }

    const bestDriver = suggestions[0];

    // Assign the driver
    await deliveryService.updateDeliveryStatus({
      deliveryId,
      businessId,
      status: DeliveryStatus.ASSIGNED,
      driverId: bestDriver.driverId,
    });

    return {
      assigned: true,
      driverId: bestDriver.driverId,
      driverName: bestDriver.driverName,
    };
  }

  /**
   * Calculate score for a single driver
   */
  private calculateDriverScore(
    driver: DriverProfile,
    pickupLatitude: number,
    pickupLongitude: number,
    deliveryDistanceKm: number,
    maxDeliveriesToday: number
  ): DriverScore {
    const breakdown = {
      loadBalancing: 0,
      proximity: 0,
      vehicleSuitability: 0,
      rating: 0,
      concurrentPenalty: 0,
    };

    // 1. Load Balancing Score (fewer deliveries = higher score)
    const deliveryRatio = driver.deliveriesToday / maxDeliveriesToday;
    breakdown.loadBalancing = Math.round(
      SCORING_WEIGHTS.LOAD_BALANCING * (1 - deliveryRatio)
    );

    // 2. Proximity Score (closer = higher score)
    let distanceToPickup = Infinity;
    if (driver.currentLatitude && driver.currentLongitude) {
      distanceToPickup = this.calculateDistance(
        Number(driver.currentLatitude),
        Number(driver.currentLongitude),
        pickupLatitude,
        pickupLongitude
      );

      // Max score at 0m, scales down to 0 at 5km
      const proximityScore = Math.max(0, 1 - (distanceToPickup / 5000));
      breakdown.proximity = Math.round(
        SCORING_WEIGHTS.PROXIMITY * proximityScore
      );
    } else {
      // No location available, give average score
      breakdown.proximity = Math.round(SCORING_WEIGHTS.PROXIMITY * 0.5);
    }

    // 3. Vehicle Suitability Score
    breakdown.vehicleSuitability = this.getVehicleSuitabilityScore(
      driver.vehicleType,
      deliveryDistanceKm
    );

    // 4. Driver Rating Score
    // Scale rating (1-5) to points
    const ratingNormalized = (Number(driver.averageRating) - 1) / 4; // 0-1 scale
    breakdown.rating = Math.round(
      SCORING_WEIGHTS.DRIVER_RATING * ratingNormalized
    );

    // 5. Concurrent Delivery Penalty
    if (driver.activeDeliveryId) {
      breakdown.concurrentPenalty = SCORING_WEIGHTS.CONCURRENT_PENALTY;
    }

    // Calculate total score
    const totalScore =
      breakdown.loadBalancing +
      breakdown.proximity +
      breakdown.vehicleSuitability +
      breakdown.rating +
      breakdown.concurrentPenalty;

    return {
      driverId: driver.id,
      driverName: driver.user?.fullName || 'Unknown',
      totalScore,
      breakdown,
      distanceToPickup: distanceToPickup === Infinity ? -1 : Math.round(distanceToPickup),
      vehicleType: driver.vehicleType,
      deliveriesToday: driver.deliveriesToday,
      averageRating: Number(driver.averageRating),
      hasActiveDelivery: !!driver.activeDeliveryId,
    };
  }

  /**
   * Get vehicle suitability score based on distance
   */
  private getVehicleSuitabilityScore(vehicleType: VehicleType, distanceKm: number): number {
    const suitabilityArray = VEHICLE_SUITABILITY[vehicleType];

    // Find the appropriate distance range index
    let rangeIndex = DISTANCE_RANGES.length; // Default to last range (>10km)

    for (let i = 0; i < DISTANCE_RANGES.length; i++) {
      if (distanceKm <= DISTANCE_RANGES[i]) {
        rangeIndex = i;
        break;
      }
    }

    return suitabilityArray[rangeIndex];
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
   * Get scoring configuration (for admin visibility)
   */
  getScoringConfig(): {
    weights: typeof SCORING_WEIGHTS;
    vehicleSuitability: typeof VEHICLE_SUITABILITY;
    distanceRanges: typeof DISTANCE_RANGES;
  } {
    return {
      weights: SCORING_WEIGHTS,
      vehicleSuitability: VEHICLE_SUITABILITY,
      distanceRanges: DISTANCE_RANGES,
    };
  }
}

export const driverAssignmentService = new DriverAssignmentService();
export default driverAssignmentService;
