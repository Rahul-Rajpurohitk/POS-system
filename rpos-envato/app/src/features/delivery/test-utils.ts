/**
 * Delivery System Test Utilities & Mock Data
 * Used for development, testing, and demo purposes
 */

import type { Delivery, DriverProfile, Order, Customer, Product, DeliveryStatus, DriverStatus, VehicleType } from '@/types';
import type { OnlineOrderQueueItem, DriverSuggestion, DeliveryStats, QueueStats } from './api';

// ============================================
// ID Generators
// ============================================

let idCounter = 0;
export const generateId = (prefix = 'test') => `${prefix}-${Date.now()}-${++idCounter}`;
export const generateTrackingToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// ============================================
// Mock Customer Generator
// ============================================

const customerNames = [
  { firstName: 'John', lastName: 'Smith' },
  { firstName: 'Sarah', lastName: 'Johnson' },
  { firstName: 'Michael', lastName: 'Williams' },
  { firstName: 'Emily', lastName: 'Brown' },
  { firstName: 'David', lastName: 'Jones' },
  { firstName: 'Jessica', lastName: 'Garcia' },
  { firstName: 'Chris', lastName: 'Miller' },
  { firstName: 'Amanda', lastName: 'Davis' },
];

const addresses = [
  '123 Main Street, Apt 4B',
  '456 Oak Avenue',
  '789 Pine Road, Suite 100',
  '321 Elm Boulevard',
  '654 Maple Drive',
  '987 Cedar Lane',
  '147 Birch Street',
  '258 Walnut Court',
];

export function createMockCustomer(overrides?: Partial<Customer>): Customer {
  const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
  return {
    id: generateId('cust'),
    name: `${randomName.firstName} ${randomName.lastName}`,
    firstName: randomName.firstName,
    lastName: randomName.lastName,
    email: `${randomName.firstName.toLowerCase()}@example.com`,
    phone: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
    address: addresses[Math.floor(Math.random() * addresses.length)],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Mock Product Generator
// ============================================

const productNames = [
  'Classic Burger',
  'Cheese Pizza',
  'Caesar Salad',
  'Grilled Chicken',
  'Fish & Chips',
  'Pasta Carbonara',
  'Veggie Wrap',
  'Club Sandwich',
];

export function createMockProduct(overrides?: Partial<Product>): Product {
  const name = productNames[Math.floor(Math.random() * productNames.length)];
  const price = Math.floor(8 + Math.random() * 20);
  return {
    id: generateId('prod'),
    name,
    sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    images: [],
    quantity: Math.floor(50 + Math.random() * 100),
    sellingPrice: price,
    purchasePrice: price * 0.6,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Mock Order Generator
// ============================================

export function createMockOrder(overrides?: Partial<Order>): Order {
  const customer = createMockCustomer();
  const itemCount = Math.floor(1 + Math.random() * 4);
  const items = Array.from({ length: itemCount }, () => ({
    id: generateId('item'),
    product: createMockProduct(),
    quantity: Math.floor(1 + Math.random() * 3),
  }));

  const subtotal = items.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const tax = subtotal * 0.08;
  const deliveryFee = 3.99;
  const total = subtotal + tax + deliveryFee;

  return {
    id: generateId('order'),
    number: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    items,
    payment: {
      subTotal: subtotal,
      subtotal,
      discount: 0,
      vat: tax,
      tax,
      total,
    },
    customer,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    status: 'pending',
    subTotal: subtotal,
    tax,
    total,
    isDelivery: true,
    deliveryAddress: customer.address,
    deliveryFee,
    ...overrides,
  };
}

// ============================================
// Mock Driver Generator
// ============================================

const driverNames = [
  { firstName: 'Alex', lastName: 'Thompson' },
  { firstName: 'Maria', lastName: 'Rodriguez' },
  { firstName: 'James', lastName: 'Wilson' },
  { firstName: 'Lisa', lastName: 'Anderson' },
  { firstName: 'Robert', lastName: 'Martinez' },
];

const vehicleTypes: VehicleType[] = ['car', 'motorcycle', 'bicycle', 'e_scooter'];
const driverStatuses: DriverStatus[] = ['available', 'busy', 'offline', 'on_break'];

export function createMockDriverProfile(overrides?: Partial<DriverProfile>): DriverProfile {
  const randomName = driverNames[Math.floor(Math.random() * driverNames.length)];
  const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

  return {
    id: generateId('driver'),
    userId: generateId('user'),
    user: {
      id: generateId('user'),
      email: `${randomName.firstName.toLowerCase()}@driver.com`,
      firstName: randomName.firstName,
      lastName: randomName.lastName,
      role: 'driver',
    },
    businessId: generateId('biz'),
    status: 'available',
    vehicleType,
    currentLatitude: 37.7749 + (Math.random() - 0.5) * 0.1,
    currentLongitude: -122.4194 + (Math.random() - 0.5) * 0.1,
    lastLocationUpdate: new Date().toISOString(),
    deliveriesToday: Math.floor(Math.random() * 10),
    totalDeliveries: Math.floor(50 + Math.random() * 500),
    averageRating: 4 + Math.random(),
    totalRatings: Math.floor(20 + Math.random() * 200),
    maxConcurrentDeliveries: 1,
    enabled: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Mock Delivery Generator
// ============================================

const deliveryStatuses: DeliveryStatus[] = [
  'pending',
  'accepted',
  'assigned',
  'picking_up',
  'picked_up',
  'on_the_way',
  'nearby',
  'delivered',
];

export function createMockDelivery(overrides?: Partial<Delivery>): Delivery {
  const order = createMockOrder();
  const driver = Math.random() > 0.3 ? createMockDriverProfile() : undefined;
  const status = deliveryStatuses[Math.floor(Math.random() * 6)]; // Exclude delivered most times

  return {
    id: generateId('del'),
    orderId: order.id,
    order,
    businessId: generateId('biz'),
    driverId: driver?.id,
    driver,
    status,
    pickupAddress: '100 Store Street, Downtown',
    pickupLatitude: 37.7749,
    pickupLongitude: -122.4194,
    deliveryAddress: order.deliveryAddress || '456 Customer Ave',
    deliveryLatitude: 37.7849,
    deliveryLongitude: -122.4094,
    customerName: order.customer?.name || 'Customer',
    customerPhone: order.customer?.phone || '+1 555-0000',
    trackingToken: generateTrackingToken(),
    distanceMeters: Math.floor(1000 + Math.random() * 5000),
    estimatedDurationSeconds: Math.floor(600 + Math.random() * 1800),
    estimatedArrival: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    deliveryFee: 3.99,
    driverTip: Math.random() > 0.5 ? Math.floor(2 + Math.random() * 8) : 0,
    locationHistory: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Mock Queue Item Generator
// ============================================

export function createMockQueueItem(overrides?: Partial<OnlineOrderQueueItem>): OnlineOrderQueueItem {
  const order = createMockOrder();
  const minutesUntilExpiry = Math.floor(2 + Math.random() * 13);

  return {
    id: generateId('queue'),
    orderId: order.id,
    order,
    status: 'pending',
    expiresAt: new Date(Date.now() + minutesUntilExpiry * 60 * 1000).toISOString(),
    reminderCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Mock Driver Suggestion Generator
// ============================================

export function createMockDriverSuggestion(overrides?: Partial<DriverSuggestion>): DriverSuggestion {
  const driver = createMockDriverProfile({ status: 'available' });

  return {
    driver,
    score: Math.floor(70 + Math.random() * 30),
    distanceMeters: Math.floor(500 + Math.random() * 3000),
    estimatedPickupMinutes: Math.floor(3 + Math.random() * 15),
    reason: 'Closest available driver with excellent rating',
    ...overrides,
  };
}

// ============================================
// Mock Stats Generators
// ============================================

export function createMockDeliveryStats(): DeliveryStats {
  return {
    pendingOrders: Math.floor(Math.random() * 5),
    activeDeliveries: Math.floor(Math.random() * 8),
    completedToday: Math.floor(10 + Math.random() * 40),
    cancelledToday: Math.floor(Math.random() * 3),
    averageDeliveryTime: Math.floor(20 + Math.random() * 15),
    availableDrivers: Math.floor(2 + Math.random() * 6),
  };
}

export function createMockQueueStats(): QueueStats {
  return {
    pending: Math.floor(Math.random() * 5),
    expiringSoon: Math.floor(Math.random() * 2),
    acceptedToday: Math.floor(20 + Math.random() * 30),
    rejectedToday: Math.floor(Math.random() * 5),
    expiredToday: Math.floor(Math.random() * 2),
    averageAcceptanceTime: Math.floor(60 + Math.random() * 180),
  };
}

// ============================================
// Batch Generators (for lists)
// ============================================

export function createMockPendingOrders(count = 3): OnlineOrderQueueItem[] {
  return Array.from({ length: count }, () => createMockQueueItem());
}

export function createMockActiveDeliveries(count = 5): Delivery[] {
  const statuses: DeliveryStatus[] = ['accepted', 'assigned', 'picking_up', 'picked_up', 'on_the_way'];
  return Array.from({ length: count }, (_, i) =>
    createMockDelivery({ status: statuses[i % statuses.length] })
  );
}

export function createMockAvailableDrivers(count = 4): DriverProfile[] {
  return Array.from({ length: count }, () =>
    createMockDriverProfile({ status: 'available' })
  );
}

export function createMockDriverSuggestions(count = 3): DriverSuggestion[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDriverSuggestion({ score: 95 - i * 10 })
  ).sort((a, b) => b.score - a.score);
}

// ============================================
// Simulation Helpers
// ============================================

export function simulateDeliveryProgress(delivery: Delivery): Delivery {
  const statusProgression: DeliveryStatus[] = [
    'pending',
    'accepted',
    'assigned',
    'picking_up',
    'picked_up',
    'on_the_way',
    'nearby',
    'delivered',
  ];

  const currentIndex = statusProgression.indexOf(delivery.status);
  if (currentIndex < statusProgression.length - 1) {
    return {
      ...delivery,
      status: statusProgression[currentIndex + 1],
      updatedAt: new Date().toISOString(),
    };
  }
  return delivery;
}

export function simulateLocationUpdate(delivery: Delivery): Delivery {
  if (!delivery.deliveryLatitude || !delivery.deliveryLongitude) return delivery;

  const progress = Math.random() * 0.1;
  const newLat = (delivery.driver?.currentLatitude || delivery.pickupLatitude) +
    (delivery.deliveryLatitude - delivery.pickupLatitude) * progress;
  const newLng = (delivery.driver?.currentLongitude || delivery.pickupLongitude) +
    (delivery.deliveryLongitude - delivery.pickupLongitude) * progress;

  return {
    ...delivery,
    locationHistory: [
      ...(delivery.locationHistory || []),
      { lat: newLat, lng: newLng, timestamp: Date.now() },
    ],
  };
}

// ============================================
// Validation Helpers
// ============================================

export function isValidDeliveryStatus(status: string): status is DeliveryStatus {
  return [
    'pending', 'accepted', 'assigned', 'picking_up', 'picked_up',
    'on_the_way', 'nearby', 'delivered', 'cancelled', 'failed',
  ].includes(status);
}

export function isValidDriverStatus(status: string): status is DriverStatus {
  return ['offline', 'available', 'busy', 'on_break'].includes(status);
}

export function canTransitionDeliveryStatus(current: DeliveryStatus, next: DeliveryStatus): boolean {
  const allowedTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    pending: ['accepted', 'cancelled'],
    accepted: ['assigned', 'cancelled'],
    assigned: ['picking_up', 'cancelled'],
    picking_up: ['picked_up', 'cancelled'],
    picked_up: ['on_the_way', 'cancelled'],
    on_the_way: ['nearby', 'delivered', 'failed'],
    nearby: ['delivered', 'failed'],
    delivered: [],
    cancelled: [],
    failed: [],
  };

  return allowedTransitions[current]?.includes(next) ?? false;
}

// ============================================
// Export for testing
// ============================================

export const mockData = {
  customer: createMockCustomer,
  product: createMockProduct,
  order: createMockOrder,
  driver: createMockDriverProfile,
  delivery: createMockDelivery,
  queueItem: createMockQueueItem,
  driverSuggestion: createMockDriverSuggestion,
  deliveryStats: createMockDeliveryStats,
  queueStats: createMockQueueStats,
  pendingOrders: createMockPendingOrders,
  activeDeliveries: createMockActiveDeliveries,
  availableDrivers: createMockAvailableDrivers,
  driverSuggestions: createMockDriverSuggestions,
};
