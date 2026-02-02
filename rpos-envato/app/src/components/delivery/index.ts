/**
 * Delivery Components
 *
 * Components for the delivery tracking and management system.
 */

export { DeliveryMap } from './DeliveryMap';
export type { DeliveryMapProps, Coordinate, MapMarker, RouteSegment } from './DeliveryMap';

// Navigation-focused map (minimal, clean like Uber/DoorDash)
export { NavigationMap } from './NavigationMap.web';
export type { NavigationMapProps, NavigationMapRef, VehicleType } from './NavigationMap.web';

// Driver navigation map (turn-by-turn, follows driver)
export { DriverNavigationMap } from './DriverNavigationMap.web';
export type { DriverNavigationMapProps } from './DriverNavigationMap.web';

// Re-export existing delivery components
export { OnlineOrdersPanel } from './OnlineOrdersPanel';
export { ActiveDeliveriesPanel } from './ActiveDeliveriesPanel';
export { ActiveDeliveriesTracker } from './ActiveDeliveriesTracker';
export { DeliveryErrorBoundary } from './DeliveryErrorBoundary';
export { DriverAssignmentModal } from './DriverAssignmentModal';
export { OnlineOrderNotification } from './OnlineOrderNotification';
export { OrderAcceptanceModal } from './OrderAcceptanceModal';
export * from './DeliverySkeletons';
