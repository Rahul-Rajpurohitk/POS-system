/**
 * Comprehensive Seed Script - Production-Ready Data for 2 Food Business Tenants
 *
 * Tenant 1: Bella's Italian Kitchen (Italian Restaurant)
 * Tenant 2: Urban Brew Coffee House (Coffee Shop)
 *
 * Each tenant has:
 * - Business with real addresses
 * - Locations (stores) with operating hours
 * - Users (admin, manager, staff, drivers)
 * - Categories with food products
 * - Products with realistic pricing and inventory
 * - Suppliers with purchase orders
 * - Customers with order history
 * - Orders with payments and deliveries
 * - Driver profiles with delivery assignments
 * - Delivery zones with pricing
 * - Stock adjustments for audit trail
 * - Coupons and promotions
 *
 * Run: npm run seed
 * Reset: npm run seed:reset
 */

import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource, initializePostgres } from '../config/database';
import { Business } from '../entities/Business.entity';
import { User } from '../entities/User.entity';
import { Category } from '../entities/Category.entity';
import { Product } from '../entities/Product.entity';
import { Customer } from '../entities/Customer.entity';
import { Coupon } from '../entities/Coupon.entity';
import { Order } from '../entities/Order.entity';
import { OrderItem } from '../entities/OrderItem.entity';
import { Payment } from '../entities/Payment.entity';
import { Location, LocationType, LocationStatus } from '../entities/Location.entity';
import { Supplier, SupplierStatus, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, PaymentTerms } from '../entities/Supplier.entity';
import { DriverProfile } from '../entities/DriverProfile.entity';
import { Delivery } from '../entities/Delivery.entity';
import { DeliveryZone } from '../entities/DeliveryZone.entity';
import { StockAdjustment, StockAdjustmentType, StockAdjustmentStatus } from '../entities/StockAdjustment.entity';
import { Shift, ShiftStatus, CashMovement, CashMovementType } from '../entities/Shift.entity';
import { GiftCard, GiftCardStatus, GiftCardType, GiftCardTransaction } from '../entities/GiftCard.entity';
import {
  Role,
  AuthType,
  Currency,
  Language,
  CouponType,
  OrderStatus,
  OrderType,
  TaxType,
  PaymentMethod,
  PaymentStatus,
  DriverStatus,
  VehicleType,
  DeliveryStatus,
  DeliveryZoneType,
} from '../types/enums';

// ============ UTILITY FUNCTIONS ============

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateTrackingToken(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
}

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============ SEED DATA DEFINITIONS ============

interface TenantConfig {
  business: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
    latitude: number;
    longitude: number;
  };
  location: {
    code: string;
    name: string;
  };
  categories: Array<{ name: string; color: string }>;
  products: Array<{
    name: string;
    sku: string;
    categoryIndex: number;
    sellingPrice: number;
    purchasePrice: number;
    quantity: number;
    description: string;
    prepTime?: number;
  }>;
  suppliers: Array<{
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }>;
  users: Array<{
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    phone?: string;
  }>;
  customers: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>;
  coupons: Array<{
    code: string;
    name: string;
    type: CouponType;
    amount: number;
  }>;
  deliveryZones: Array<{
    name: string;
    radiusMeters: number;
    baseFee: number;
    perKmFee: number;
    minOrderAmount: number;
    freeDeliveryThreshold: number | null;
    estimatedMinMinutes: number;
    estimatedMaxMinutes: number;
    color: string;
  }>;
}

// ============ TENANT 1: BELLA'S ITALIAN KITCHEN ============

const bellasConfig: TenantConfig = {
  business: {
    name: "Bella's Italian Kitchen",
    address: '245 Columbus Avenue',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94133',
    phone: '+1-415-555-2456',
    email: 'contact@bellasitaliankitchen.com',
    latitude: 37.7997,
    longitude: -122.4108,
  },
  location: {
    code: 'BELLA-SF-01',
    name: "Bella's Italian Kitchen - North Beach",
  },
  categories: [
    { name: 'Appetizers', color: '#F97316' },
    { name: 'Pizza', color: '#EF4444' },
    { name: 'Pasta', color: '#FBBF24' },
    { name: 'Salads', color: '#22C55E' },
    { name: 'Desserts', color: '#EC4899' },
    { name: 'Beverages', color: '#3B82F6' },
  ],
  products: [
    // Appetizers
    { name: 'Bruschetta al Pomodoro', sku: 'BIK-APP-001', categoryIndex: 0, sellingPrice: 12.99, purchasePrice: 4.50, quantity: 50, description: 'Grilled bread topped with fresh tomatoes, basil, garlic, and extra virgin olive oil', prepTime: 10 },
    { name: 'Calamari Fritti', sku: 'BIK-APP-002', categoryIndex: 0, sellingPrice: 16.99, purchasePrice: 7.00, quantity: 40, description: 'Crispy fried calamari served with marinara sauce and lemon aioli', prepTime: 12 },
    { name: 'Caprese Salad', sku: 'BIK-APP-003', categoryIndex: 0, sellingPrice: 14.99, purchasePrice: 5.50, quantity: 45, description: 'Fresh mozzarella, vine-ripened tomatoes, and basil with balsamic glaze', prepTime: 8 },
    { name: 'Arancini', sku: 'BIK-APP-004', categoryIndex: 0, sellingPrice: 11.99, purchasePrice: 4.00, quantity: 55, description: 'Crispy risotto balls stuffed with mozzarella and served with marinara', prepTime: 10 },

    // Pizza
    { name: 'Margherita Pizza', sku: 'BIK-PIZ-001', categoryIndex: 1, sellingPrice: 18.99, purchasePrice: 6.00, quantity: 100, description: 'San Marzano tomatoes, fresh mozzarella, basil, extra virgin olive oil', prepTime: 15 },
    { name: 'Pepperoni Pizza', sku: 'BIK-PIZ-002', categoryIndex: 1, sellingPrice: 21.99, purchasePrice: 7.50, quantity: 100, description: 'Classic pepperoni with mozzarella and our house-made tomato sauce', prepTime: 15 },
    { name: 'Quattro Formaggi', sku: 'BIK-PIZ-003', categoryIndex: 1, sellingPrice: 23.99, purchasePrice: 8.50, quantity: 80, description: 'Four cheese pizza with mozzarella, gorgonzola, fontina, and parmesan', prepTime: 15 },
    { name: 'Diavola Pizza', sku: 'BIK-PIZ-004', categoryIndex: 1, sellingPrice: 22.99, purchasePrice: 8.00, quantity: 75, description: 'Spicy salami, fresh chili, mozzarella, and tomato sauce', prepTime: 15 },
    { name: 'Prosciutto e Rucola', sku: 'BIK-PIZ-005', categoryIndex: 1, sellingPrice: 24.99, purchasePrice: 9.00, quantity: 70, description: 'Prosciutto di Parma, arugula, shaved parmesan, and truffle oil', prepTime: 15 },
    { name: 'Vegetariana Pizza', sku: 'BIK-PIZ-006', categoryIndex: 1, sellingPrice: 20.99, purchasePrice: 7.00, quantity: 60, description: 'Grilled vegetables, olives, artichokes, and fresh mozzarella', prepTime: 15 },

    // Pasta
    { name: 'Spaghetti Carbonara', sku: 'BIK-PAS-001', categoryIndex: 2, sellingPrice: 19.99, purchasePrice: 6.50, quantity: 80, description: 'Classic Roman pasta with guanciale, egg, pecorino, and black pepper', prepTime: 12 },
    { name: 'Fettuccine Alfredo', sku: 'BIK-PAS-002', categoryIndex: 2, sellingPrice: 18.99, purchasePrice: 6.00, quantity: 85, description: 'Fresh fettuccine in creamy parmesan sauce', prepTime: 12 },
    { name: 'Penne Arrabbiata', sku: 'BIK-PAS-003', categoryIndex: 2, sellingPrice: 17.99, purchasePrice: 5.50, quantity: 90, description: 'Penne in spicy tomato sauce with garlic and red chili', prepTime: 12 },
    { name: 'Lasagna Bolognese', sku: 'BIK-PAS-004', categoryIndex: 2, sellingPrice: 21.99, purchasePrice: 8.00, quantity: 50, description: 'Layers of fresh pasta, beef ragu, bechamel, and parmesan', prepTime: 20 },
    { name: 'Ravioli di Ricotta', sku: 'BIK-PAS-005', categoryIndex: 2, sellingPrice: 22.99, purchasePrice: 8.50, quantity: 45, description: 'Handmade ricotta ravioli in sage brown butter sauce', prepTime: 15 },
    { name: 'Linguine alle Vongole', sku: 'BIK-PAS-006', categoryIndex: 2, sellingPrice: 25.99, purchasePrice: 10.00, quantity: 40, description: 'Linguine with fresh clams, white wine, garlic, and parsley', prepTime: 15 },

    // Salads
    { name: 'Caesar Salad', sku: 'BIK-SAL-001', categoryIndex: 3, sellingPrice: 13.99, purchasePrice: 4.00, quantity: 60, description: 'Romaine lettuce, house-made Caesar dressing, croutons, and parmesan', prepTime: 8 },
    { name: 'Italian Garden Salad', sku: 'BIK-SAL-002', categoryIndex: 3, sellingPrice: 12.99, purchasePrice: 3.50, quantity: 65, description: 'Mixed greens, cherry tomatoes, cucumbers, red onion, and Italian vinaigrette', prepTime: 8 },
    { name: 'Panzanella Salad', sku: 'BIK-SAL-003', categoryIndex: 3, sellingPrice: 14.99, purchasePrice: 5.00, quantity: 50, description: 'Tuscan bread salad with tomatoes, cucumbers, and red wine vinaigrette', prepTime: 10 },

    // Desserts
    { name: 'Tiramisu', sku: 'BIK-DES-001', categoryIndex: 4, sellingPrice: 9.99, purchasePrice: 3.50, quantity: 40, description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone', prepTime: 5 },
    { name: 'Panna Cotta', sku: 'BIK-DES-002', categoryIndex: 4, sellingPrice: 8.99, purchasePrice: 3.00, quantity: 45, description: 'Vanilla bean panna cotta with seasonal berry compote', prepTime: 5 },
    { name: 'Cannoli', sku: 'BIK-DES-003', categoryIndex: 4, sellingPrice: 7.99, purchasePrice: 2.50, quantity: 60, description: 'Crispy pastry shells filled with sweet ricotta and chocolate chips', prepTime: 5 },
    { name: 'Gelato (3 Scoops)', sku: 'BIK-DES-004', categoryIndex: 4, sellingPrice: 8.99, purchasePrice: 3.00, quantity: 100, description: 'Choice of stracciatella, pistachio, or hazelnut', prepTime: 3 },

    // Beverages
    { name: 'San Pellegrino', sku: 'BIK-BEV-001', categoryIndex: 5, sellingPrice: 4.99, purchasePrice: 1.50, quantity: 200, description: 'Sparkling mineral water (750ml)', prepTime: 1 },
    { name: 'Italian Soda', sku: 'BIK-BEV-002', categoryIndex: 5, sellingPrice: 3.99, purchasePrice: 1.00, quantity: 150, description: 'Choice of blood orange, lemon, or grapefruit', prepTime: 2 },
    { name: 'Espresso', sku: 'BIK-BEV-003', categoryIndex: 5, sellingPrice: 3.49, purchasePrice: 0.80, quantity: 300, description: 'Double shot Italian espresso', prepTime: 2 },
    { name: 'Cappuccino', sku: 'BIK-BEV-004', categoryIndex: 5, sellingPrice: 4.99, purchasePrice: 1.20, quantity: 250, description: 'Espresso with steamed milk and foam', prepTime: 3 },
    { name: 'House Red Wine (Glass)', sku: 'BIK-BEV-005', categoryIndex: 5, sellingPrice: 9.99, purchasePrice: 3.50, quantity: 100, description: 'Chianti Classico DOCG', prepTime: 1 },
    { name: 'Limoncello', sku: 'BIK-BEV-006', categoryIndex: 5, sellingPrice: 8.99, purchasePrice: 2.50, quantity: 80, description: 'Traditional Italian lemon liqueur (2oz)', prepTime: 1 },

    // LOW STOCK & OUT OF STOCK ITEMS (for inventory alerts demo)
    { name: 'Truffle Oil Pasta', sku: 'BIK-PAS-007', categoryIndex: 2, sellingPrice: 34.99, purchasePrice: 15.00, quantity: 3, description: 'SEASONAL: Fresh tagliatelle with black truffle oil and parmesan', prepTime: 18 },
    { name: 'Imported Prosciutto Platter', sku: 'BIK-APP-005', categoryIndex: 0, sellingPrice: 28.99, purchasePrice: 12.00, quantity: 5, description: 'LOW STOCK: 24-month aged Prosciutto di Parma with melon', prepTime: 8 },
    { name: 'Lobster Ravioli', sku: 'BIK-PAS-008', categoryIndex: 2, sellingPrice: 38.99, purchasePrice: 18.00, quantity: 0, description: 'OUT OF STOCK: Handmade ravioli stuffed with Maine lobster in saffron cream', prepTime: 20 },
    { name: 'Amarone Wine (Glass)', sku: 'BIK-BEV-007', categoryIndex: 5, sellingPrice: 24.99, purchasePrice: 10.00, quantity: 0, description: 'OUT OF STOCK: Premium Amarone della Valpolicella DOCG', prepTime: 1 },
  ],
  suppliers: [
    {
      name: 'Bay Area Produce Co.',
      contactName: 'Marco Bianchi',
      email: 'marco@bayareaproduce.com',
      phone: '+1-415-555-3001',
      address: '890 Produce Lane',
      city: 'South San Francisco',
      state: 'CA',
      zipCode: '94080',
    },
    {
      name: 'Artisan Cheese & Dairy',
      contactName: 'Lisa Romano',
      email: 'lisa@artisancheese.com',
      phone: '+1-415-555-3002',
      address: '456 Dairy Way',
      city: 'Petaluma',
      state: 'CA',
      zipCode: '94952',
    },
    {
      name: 'Premium Italian Imports',
      contactName: 'Giovanni Martini',
      email: 'orders@italiangoods.com',
      phone: '+1-415-555-3003',
      address: '123 Import Drive',
      city: 'Oakland',
      state: 'CA',
      zipCode: '94607',
    },
    {
      name: 'Pacific Seafood Distributors',
      contactName: 'James Chen',
      email: 'james@pacificseafood.com',
      phone: '+1-415-555-3004',
      address: '789 Harbor Blvd',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94124',
    },
  ],
  users: [
    { firstName: 'Isabella', lastName: 'Rossi', email: 'isabella@bellaskitchen.com', role: Role.ADMIN, phone: '+1-415-555-0001' },
    { firstName: 'Marco', lastName: 'Conti', email: 'marco@bellaskitchen.com', role: Role.MANAGER, phone: '+1-415-555-0002' },
    { firstName: 'Sofia', lastName: 'Benedetti', email: 'sofia@bellaskitchen.com', role: Role.STAFF, phone: '+1-415-555-0003' },
    { firstName: 'Luca', lastName: 'Ferrari', email: 'luca@bellaskitchen.com', role: Role.STAFF, phone: '+1-415-555-0004' },
    { firstName: 'Antonio', lastName: 'Greco', email: 'antonio.driver@bellaskitchen.com', role: Role.DRIVER, phone: '+1-415-555-0005' },
    { firstName: 'Paolo', lastName: 'Marino', email: 'paolo.driver@bellaskitchen.com', role: Role.DRIVER, phone: '+1-415-555-0006' },
  ],
  customers: [
    { name: 'Emma Thompson', email: 'emma.thompson@gmail.com', phone: '+1-415-555-1001', address: '123 Pacific Heights Blvd, San Francisco, CA 94115' },
    { name: 'David Chen', email: 'david.chen@outlook.com', phone: '+1-415-555-1002', address: '456 Marina District Ave, San Francisco, CA 94123' },
    { name: 'Rachel Martinez', email: 'rachel.m@yahoo.com', phone: '+1-415-555-1003', address: '789 Russian Hill Lane, San Francisco, CA 94109' },
    { name: 'Michael Johnson', email: 'mjohnson@gmail.com', phone: '+1-415-555-1004', address: '321 Nob Hill Place, San Francisco, CA 94108' },
    { name: 'Sarah Williams', email: 'sarah.w@icloud.com', phone: '+1-415-555-1005', address: '654 Telegraph Hill Rd, San Francisco, CA 94133' },
    { name: 'James Anderson', email: 'janderson@gmail.com', phone: '+1-415-555-1006', address: '987 Fisherman\'s Wharf, San Francisco, CA 94133' },
    { name: 'Olivia Davis', email: 'olivia.d@hotmail.com', phone: '+1-415-555-1007', address: '246 Union Square, San Francisco, CA 94102' },
    { name: 'William Brown', email: 'wbrown@gmail.com', phone: '+1-415-555-1008', address: '135 Financial District, San Francisco, CA 94111' },
    { name: 'Sophia Garcia', email: 'sophia.garcia@yahoo.com', phone: '+1-415-555-1009', address: '864 SOMA District, San Francisco, CA 94103' },
    { name: 'Alexander Lee', email: 'alex.lee@gmail.com', phone: '+1-415-555-1010', address: '753 Mission Bay, San Francisco, CA 94158' },
  ],
  coupons: [
    { code: 'WELCOME15', name: 'Welcome 15% Off', type: CouponType.PERCENTAGE, amount: 15 },
    { code: 'PIZZA10', name: '$10 Off Pizza Orders', type: CouponType.FIXED, amount: 10 },
    { code: 'FAMILY20', name: 'Family Meal 20% Off', type: CouponType.PERCENTAGE, amount: 20 },
    { code: 'FREEDEL', name: 'Free Delivery', type: CouponType.FIXED, amount: 5 },
  ],
  deliveryZones: [
    {
      name: 'Zone 1 - Nearby',
      radiusMeters: 2000,
      baseFee: 2.99,
      perKmFee: 0,
      minOrderAmount: 10, // Minimum $10 for Zone 1
      freeDeliveryThreshold: 30,
      estimatedMinMinutes: 15,
      estimatedMaxMinutes: 25,
      color: '#22C55E',
    },
    {
      name: 'Zone 2 - Standard',
      radiusMeters: 5000,
      baseFee: 5.99,
      perKmFee: 0.50,
      minOrderAmount: 50, // Minimum $50 for Zone 2
      freeDeliveryThreshold: 80,
      estimatedMinMinutes: 25,
      estimatedMaxMinutes: 40,
      color: '#FBBF24',
    },
    {
      name: 'Zone 3 - Extended',
      radiusMeters: 8000,
      baseFee: 8.99,
      perKmFee: 0.75,
      minOrderAmount: 7, // Minimum $7 for Zone 3 (Extended)
      freeDeliveryThreshold: null,
      estimatedMinMinutes: 35,
      estimatedMaxMinutes: 55,
      color: '#F97316',
    },
  ],
};

// ============ TENANT 2: URBAN BREW COFFEE HOUSE ============

const urbanBrewConfig: TenantConfig = {
  business: {
    name: 'Urban Brew Coffee House',
    address: '1847 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94103',
    phone: '+1-415-555-8765',
    email: 'hello@urbanbrewcoffee.com',
    latitude: 37.7699,
    longitude: -122.4264,
  },
  location: {
    code: 'URBAN-SF-01',
    name: 'Urban Brew - Market Street',
  },
  categories: [
    { name: 'Hot Coffee', color: '#92400E' },
    { name: 'Cold Coffee', color: '#3B82F6' },
    { name: 'Tea', color: '#22C55E' },
    { name: 'Pastries', color: '#F97316' },
    { name: 'Sandwiches', color: '#EF4444' },
    { name: 'Breakfast', color: '#FBBF24' },
  ],
  products: [
    // Hot Coffee
    { name: 'House Blend Drip', sku: 'UBC-HOT-001', categoryIndex: 0, sellingPrice: 3.49, purchasePrice: 0.60, quantity: 500, description: 'Our signature medium roast blend, smooth with notes of chocolate and nuts', prepTime: 2 },
    { name: 'Single Origin Pour Over', sku: 'UBC-HOT-002', categoryIndex: 0, sellingPrice: 5.49, purchasePrice: 1.20, quantity: 200, description: 'Hand-poured Ethiopian Yirgacheffe with bright citrus notes', prepTime: 4 },
    { name: 'Espresso', sku: 'UBC-HOT-003', categoryIndex: 0, sellingPrice: 3.29, purchasePrice: 0.50, quantity: 400, description: 'Double shot of our house espresso blend', prepTime: 2 },
    { name: 'Americano', sku: 'UBC-HOT-004', categoryIndex: 0, sellingPrice: 3.99, purchasePrice: 0.60, quantity: 350, description: 'Espresso with hot water for a rich, full-bodied coffee', prepTime: 2 },
    { name: 'Cappuccino', sku: 'UBC-HOT-005', categoryIndex: 0, sellingPrice: 4.99, purchasePrice: 0.90, quantity: 300, description: 'Espresso with steamed milk and velvety foam', prepTime: 3 },
    { name: 'Latte', sku: 'UBC-HOT-006', categoryIndex: 0, sellingPrice: 5.49, purchasePrice: 1.00, quantity: 400, description: 'Espresso with silky steamed milk', prepTime: 3 },
    { name: 'Vanilla Latte', sku: 'UBC-HOT-007', categoryIndex: 0, sellingPrice: 5.99, purchasePrice: 1.20, quantity: 350, description: 'Latte with house-made vanilla syrup', prepTime: 3 },
    { name: 'Caramel Macchiato', sku: 'UBC-HOT-008', categoryIndex: 0, sellingPrice: 6.29, purchasePrice: 1.30, quantity: 300, description: 'Vanilla latte marked with espresso and caramel drizzle', prepTime: 3 },
    { name: 'Mocha', sku: 'UBC-HOT-009', categoryIndex: 0, sellingPrice: 5.99, purchasePrice: 1.25, quantity: 280, description: 'Espresso with rich chocolate and steamed milk', prepTime: 3 },
    { name: 'Flat White', sku: 'UBC-HOT-010', categoryIndex: 0, sellingPrice: 5.29, purchasePrice: 0.95, quantity: 250, description: 'Ristretto shots with micro-foam milk', prepTime: 3 },

    // Cold Coffee
    { name: 'Iced Coffee', sku: 'UBC-COLD-001', categoryIndex: 1, sellingPrice: 4.49, purchasePrice: 0.70, quantity: 400, description: 'Cold-brewed house blend over ice', prepTime: 2 },
    { name: 'Cold Brew', sku: 'UBC-COLD-002', categoryIndex: 1, sellingPrice: 5.29, purchasePrice: 1.00, quantity: 300, description: '20-hour steeped cold brew, smooth and bold', prepTime: 1 },
    { name: 'Nitro Cold Brew', sku: 'UBC-COLD-003', categoryIndex: 1, sellingPrice: 5.99, purchasePrice: 1.30, quantity: 200, description: 'Nitrogen-infused cold brew with creamy cascading effect', prepTime: 1 },
    { name: 'Iced Latte', sku: 'UBC-COLD-004', categoryIndex: 1, sellingPrice: 5.49, purchasePrice: 1.00, quantity: 350, description: 'Espresso and cold milk over ice', prepTime: 2 },
    { name: 'Iced Vanilla Latte', sku: 'UBC-COLD-005', categoryIndex: 1, sellingPrice: 5.99, purchasePrice: 1.20, quantity: 300, description: 'Iced latte with vanilla syrup', prepTime: 2 },
    { name: 'Iced Mocha', sku: 'UBC-COLD-006', categoryIndex: 1, sellingPrice: 6.29, purchasePrice: 1.40, quantity: 250, description: 'Espresso, chocolate, and cold milk over ice', prepTime: 2 },
    { name: 'Vietnamese Iced Coffee', sku: 'UBC-COLD-007', categoryIndex: 1, sellingPrice: 5.49, purchasePrice: 1.10, quantity: 200, description: 'Strong coffee with sweetened condensed milk', prepTime: 3 },
    { name: 'Affogato', sku: 'UBC-COLD-008', categoryIndex: 1, sellingPrice: 6.99, purchasePrice: 1.80, quantity: 150, description: 'Espresso poured over vanilla gelato', prepTime: 2 },

    // Tea
    { name: 'English Breakfast Tea', sku: 'UBC-TEA-001', categoryIndex: 2, sellingPrice: 3.49, purchasePrice: 0.40, quantity: 300, description: 'Classic black tea blend, robust and full-bodied', prepTime: 3 },
    { name: 'Earl Grey', sku: 'UBC-TEA-002', categoryIndex: 2, sellingPrice: 3.49, purchasePrice: 0.45, quantity: 250, description: 'Black tea with bergamot oil', prepTime: 3 },
    { name: 'Green Tea', sku: 'UBC-TEA-003', categoryIndex: 2, sellingPrice: 3.49, purchasePrice: 0.40, quantity: 280, description: 'Japanese sencha green tea', prepTime: 3 },
    { name: 'Chai Latte', sku: 'UBC-TEA-004', categoryIndex: 2, sellingPrice: 5.29, purchasePrice: 1.00, quantity: 300, description: 'Spiced tea with steamed milk', prepTime: 3 },
    { name: 'Matcha Latte', sku: 'UBC-TEA-005', categoryIndex: 2, sellingPrice: 5.99, purchasePrice: 1.50, quantity: 200, description: 'Ceremonial grade matcha with steamed milk', prepTime: 3 },
    { name: 'London Fog', sku: 'UBC-TEA-006', categoryIndex: 2, sellingPrice: 5.49, purchasePrice: 1.10, quantity: 180, description: 'Earl grey with vanilla and steamed milk', prepTime: 3 },

    // Pastries
    { name: 'Butter Croissant', sku: 'UBC-PAS-001', categoryIndex: 3, sellingPrice: 4.29, purchasePrice: 1.20, quantity: 60, description: 'Flaky, buttery French croissant baked fresh daily', prepTime: 1 },
    { name: 'Almond Croissant', sku: 'UBC-PAS-002', categoryIndex: 3, sellingPrice: 5.29, purchasePrice: 1.60, quantity: 45, description: 'Croissant filled with almond cream and topped with sliced almonds', prepTime: 1 },
    { name: 'Chocolate Croissant', sku: 'UBC-PAS-003', categoryIndex: 3, sellingPrice: 4.79, purchasePrice: 1.40, quantity: 50, description: 'Buttery croissant with dark chocolate batons', prepTime: 1 },
    { name: 'Blueberry Muffin', sku: 'UBC-PAS-004', categoryIndex: 3, sellingPrice: 3.99, purchasePrice: 1.00, quantity: 55, description: 'Fresh-baked muffin loaded with blueberries', prepTime: 1 },
    { name: 'Banana Nut Bread', sku: 'UBC-PAS-005', categoryIndex: 3, sellingPrice: 4.29, purchasePrice: 1.10, quantity: 40, description: 'Moist banana bread with toasted walnuts', prepTime: 1 },
    { name: 'Cinnamon Roll', sku: 'UBC-PAS-006', categoryIndex: 3, sellingPrice: 4.99, purchasePrice: 1.30, quantity: 35, description: 'Warm cinnamon roll with cream cheese frosting', prepTime: 2 },
    { name: 'Scone (Seasonal)', sku: 'UBC-PAS-007', categoryIndex: 3, sellingPrice: 3.79, purchasePrice: 0.90, quantity: 50, description: 'Today\'s fresh-baked scone with clotted cream', prepTime: 1 },
    { name: 'Cookie (Chocolate Chip)', sku: 'UBC-PAS-008', categoryIndex: 3, sellingPrice: 2.99, purchasePrice: 0.70, quantity: 80, description: 'Warm, gooey chocolate chip cookie', prepTime: 1 },

    // Sandwiches
    { name: 'Avocado Toast', sku: 'UBC-SAN-001', categoryIndex: 4, sellingPrice: 9.99, purchasePrice: 3.50, quantity: 40, description: 'Smashed avocado on sourdough with cherry tomatoes and microgreens', prepTime: 5 },
    { name: 'Turkey Pesto Panini', sku: 'UBC-SAN-002', categoryIndex: 4, sellingPrice: 11.99, purchasePrice: 4.50, quantity: 35, description: 'Sliced turkey, pesto, mozzarella, and sun-dried tomatoes on ciabatta', prepTime: 8 },
    { name: 'Caprese Sandwich', sku: 'UBC-SAN-003', categoryIndex: 4, sellingPrice: 10.99, purchasePrice: 4.00, quantity: 30, description: 'Fresh mozzarella, tomato, basil, and balsamic on focaccia', prepTime: 5 },
    { name: 'Ham & Cheese Croissant', sku: 'UBC-SAN-004', categoryIndex: 4, sellingPrice: 8.99, purchasePrice: 3.20, quantity: 40, description: 'Black forest ham and gruyere on a warm croissant', prepTime: 6 },
    { name: 'Veggie Wrap', sku: 'UBC-SAN-005', categoryIndex: 4, sellingPrice: 9.49, purchasePrice: 3.00, quantity: 35, description: 'Hummus, roasted vegetables, and feta in a spinach wrap', prepTime: 5 },
    { name: 'Chicken Caesar Wrap', sku: 'UBC-SAN-006', categoryIndex: 4, sellingPrice: 10.99, purchasePrice: 4.00, quantity: 30, description: 'Grilled chicken, romaine, parmesan, and Caesar dressing', prepTime: 6 },

    // Breakfast
    { name: 'Breakfast Burrito', sku: 'UBC-BRK-001', categoryIndex: 5, sellingPrice: 10.99, purchasePrice: 4.00, quantity: 35, description: 'Scrambled eggs, bacon, cheese, potatoes, and salsa verde', prepTime: 8 },
    { name: 'Egg & Cheese Sandwich', sku: 'UBC-BRK-002', categoryIndex: 5, sellingPrice: 7.99, purchasePrice: 2.50, quantity: 45, description: 'Fried egg and cheddar on an English muffin', prepTime: 5 },
    { name: 'Bacon Egg & Cheese', sku: 'UBC-BRK-003', categoryIndex: 5, sellingPrice: 9.49, purchasePrice: 3.20, quantity: 40, description: 'Fried egg, crispy bacon, and cheddar on ciabatta', prepTime: 6 },
    { name: 'Acai Bowl', sku: 'UBC-BRK-004', categoryIndex: 5, sellingPrice: 11.99, purchasePrice: 4.50, quantity: 25, description: 'Acai blend topped with granola, banana, and fresh berries', prepTime: 5 },
    { name: 'Overnight Oats', sku: 'UBC-BRK-005', categoryIndex: 5, sellingPrice: 6.99, purchasePrice: 2.00, quantity: 30, description: 'Oats, almond milk, chia seeds with seasonal fruit', prepTime: 1 },
    { name: 'Yogurt Parfait', sku: 'UBC-BRK-006', categoryIndex: 5, sellingPrice: 7.49, purchasePrice: 2.20, quantity: 35, description: 'Greek yogurt layered with granola and mixed berries', prepTime: 2 },

    // LOW STOCK & OUT OF STOCK ITEMS (for inventory alerts demo)
    { name: 'Reserve Single Origin (Kenya)', sku: 'UBC-HOT-011', categoryIndex: 0, sellingPrice: 7.99, purchasePrice: 2.50, quantity: 4, description: 'LOW STOCK: Limited reserve Kenyan AA with wine-like acidity', prepTime: 5 },
    { name: 'Pistachio Croissant', sku: 'UBC-PAS-009', categoryIndex: 3, sellingPrice: 6.49, purchasePrice: 2.00, quantity: 2, description: 'LOW STOCK: Flaky croissant with pistachio cream and crushed pistachios', prepTime: 1 },
    { name: 'Geisha Pour Over', sku: 'UBC-HOT-012', categoryIndex: 0, sellingPrice: 12.99, purchasePrice: 5.00, quantity: 0, description: 'OUT OF STOCK: Rare Panama Geisha with jasmine and bergamot notes', prepTime: 5 },
    { name: 'Smoked Salmon Bagel', sku: 'UBC-BRK-007', categoryIndex: 5, sellingPrice: 14.99, purchasePrice: 6.00, quantity: 0, description: 'OUT OF STOCK: Everything bagel with lox, capers, cream cheese, and red onion', prepTime: 4 },
  ],
  suppliers: [
    {
      name: 'Mountain Peak Coffee Roasters',
      contactName: 'Jennifer Walsh',
      email: 'jen@mountainpeakcoffee.com',
      phone: '+1-510-555-4001',
      address: '234 Roaster Lane',
      city: 'Oakland',
      state: 'CA',
      zipCode: '94612',
    },
    {
      name: 'Golden Gate Bakery Supply',
      contactName: 'Robert Kim',
      email: 'robert@ggbakery.com',
      phone: '+1-415-555-4002',
      address: '567 Baker Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
    },
    {
      name: 'Sunrise Dairy Farms',
      contactName: 'Amanda Foster',
      email: 'amanda@sunrisedairy.com',
      phone: '+1-707-555-4003',
      address: '890 Dairy Road',
      city: 'Petaluma',
      state: 'CA',
      zipCode: '94954',
    },
    {
      name: 'Fresh Start Produce',
      contactName: 'Carlos Mendez',
      email: 'carlos@freshstartproduce.com',
      phone: '+1-415-555-4004',
      address: '123 Produce Market',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94124',
    },
  ],
  users: [
    { firstName: 'Jennifer', lastName: 'Walsh', email: 'jennifer@urbanbrew.com', role: Role.ADMIN, phone: '+1-415-555-8001' },
    { firstName: 'Michael', lastName: 'Torres', email: 'michael@urbanbrew.com', role: Role.MANAGER, phone: '+1-415-555-8002' },
    { firstName: 'Emily', lastName: 'Chen', email: 'emily@urbanbrew.com', role: Role.STAFF, phone: '+1-415-555-8003' },
    { firstName: 'Brandon', lastName: 'Lee', email: 'brandon@urbanbrew.com', role: Role.STAFF, phone: '+1-415-555-8004' },
    { firstName: 'Carlos', lastName: 'Rivera', email: 'carlos.driver@urbanbrew.com', role: Role.DRIVER, phone: '+1-415-555-8005' },
    { firstName: 'Lisa', lastName: 'Nguyen', email: 'lisa.driver@urbanbrew.com', role: Role.DRIVER, phone: '+1-415-555-8006' },
  ],
  customers: [
    { name: 'Christopher Moore', email: 'chris.moore@gmail.com', phone: '+1-415-555-2001', address: '456 Hayes Valley, San Francisco, CA 94102' },
    { name: 'Jessica Taylor', email: 'jtaylor@outlook.com', phone: '+1-415-555-2002', address: '789 Castro District, San Francisco, CA 94114' },
    { name: 'Daniel Kim', email: 'dkim@yahoo.com', phone: '+1-415-555-2003', address: '321 Mission District, San Francisco, CA 94110' },
    { name: 'Ashley Rodriguez', email: 'ashley.r@gmail.com', phone: '+1-415-555-2004', address: '654 Potrero Hill, San Francisco, CA 94107' },
    { name: 'Matthew Johnson', email: 'mjohnson@icloud.com', phone: '+1-415-555-2005', address: '987 Dogpatch, San Francisco, CA 94107' },
    { name: 'Lauren Williams', email: 'lauren.w@gmail.com', phone: '+1-415-555-2006', address: '135 South Beach, San Francisco, CA 94105' },
    { name: 'Ryan Thompson', email: 'rthompson@hotmail.com', phone: '+1-415-555-2007', address: '246 Rincon Hill, San Francisco, CA 94105' },
    { name: 'Megan Davis', email: 'megan.d@yahoo.com', phone: '+1-415-555-2008', address: '753 Noe Valley, San Francisco, CA 94114' },
    { name: 'Kevin Garcia', email: 'kevin.garcia@gmail.com', phone: '+1-415-555-2009', address: '864 Glen Park, San Francisco, CA 94131' },
    { name: 'Amanda Brown', email: 'abrown@outlook.com', phone: '+1-415-555-2010', address: '951 Bernal Heights, San Francisco, CA 94110' },
  ],
  coupons: [
    { code: 'BREWFIRST', name: 'First Visit 20% Off', type: CouponType.PERCENTAGE, amount: 20 },
    { code: 'MORNING10', name: 'Early Bird $2 Off', type: CouponType.FIXED, amount: 2 },
    { code: 'LOYALBEAN', name: 'Loyalty 15% Off', type: CouponType.PERCENTAGE, amount: 15 },
    { code: 'FREECOFFEE', name: 'Free Drip Coffee (min $10)', type: CouponType.FIXED, amount: 3.49 },
  ],
  deliveryZones: [
    {
      name: 'Zone 1 - Express',
      radiusMeters: 1500,
      baseFee: 1.99,
      perKmFee: 0,
      minOrderAmount: 10, // Minimum $10 for Zone 1
      freeDeliveryThreshold: 20,
      estimatedMinMinutes: 10,
      estimatedMaxMinutes: 20,
      color: '#22C55E',
    },
    {
      name: 'Zone 2 - Standard',
      radiusMeters: 4000,
      baseFee: 4.99,
      perKmFee: 0.40,
      minOrderAmount: 50, // Minimum $50 for Zone 2
      freeDeliveryThreshold: 70,
      estimatedMinMinutes: 20,
      estimatedMaxMinutes: 35,
      color: '#FBBF24',
    },
    {
      name: 'Zone 3 - Extended',
      radiusMeters: 7000,
      baseFee: 6.99,
      perKmFee: 0.60,
      minOrderAmount: 7, // Minimum $7 for Zone 3 (Extended)
      freeDeliveryThreshold: null,
      estimatedMinMinutes: 30,
      estimatedMaxMinutes: 50,
      color: '#F97316',
    },
  ],
};

// ============ MAIN SEED FUNCTION ============

async function seed() {
  console.log('\n========================================');
  console.log('  RPOS Comprehensive Database Seed');
  console.log('========================================\n');
  console.log('Creating production-ready data for 2 food business tenants...\n');

  try {
    await initializePostgres();
    console.log('Database connected.\n');

    const businessRepo = AppDataSource.getRepository(Business);
    const userRepo = AppDataSource.getRepository(User);
    const categoryRepo = AppDataSource.getRepository(Category);
    const productRepo = AppDataSource.getRepository(Product);
    const customerRepo = AppDataSource.getRepository(Customer);
    const couponRepo = AppDataSource.getRepository(Coupon);
    const orderRepo = AppDataSource.getRepository(Order);
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const locationRepo = AppDataSource.getRepository(Location);
    const supplierRepo = AppDataSource.getRepository(Supplier);
    const purchaseOrderRepo = AppDataSource.getRepository(PurchaseOrder);
    const purchaseOrderItemRepo = AppDataSource.getRepository(PurchaseOrderItem);
    const driverProfileRepo = AppDataSource.getRepository(DriverProfile);
    const deliveryRepo = AppDataSource.getRepository(Delivery);
    const deliveryZoneRepo = AppDataSource.getRepository(DeliveryZone);
    const stockAdjustmentRepo = AppDataSource.getRepository(StockAdjustment);
    const shiftRepo = AppDataSource.getRepository(Shift);
    const cashMovementRepo = AppDataSource.getRepository(CashMovement);
    const giftCardRepo = AppDataSource.getRepository(GiftCard);
    const giftCardTxRepo = AppDataSource.getRepository(GiftCardTransaction);

    // Check if already seeded
    const existingBusiness = await businessRepo.findOne({
      where: { name: bellasConfig.business.name },
    });

    if (existingBusiness) {
      console.log('Database already seeded. Run seed:reset to clear and reseed.\n');
      console.log('Login Credentials (password: Password123! for all):');
      console.log('\nBella\'s Italian Kitchen:');
      console.log('  - Admin: isabella@bellaskitchen.com');
      console.log('  - Manager: marco@bellaskitchen.com');
      console.log('  - Driver: antonio.driver@bellaskitchen.com');
      console.log('\nUrban Brew Coffee House:');
      console.log('  - Admin: jennifer@urbanbrew.com');
      console.log('  - Manager: michael@urbanbrew.com');
      console.log('  - Driver: carlos.driver@urbanbrew.com\n');
      await AppDataSource.destroy();
      return;
    }

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const tenantConfigs = [bellasConfig, urbanBrewConfig];
    const allTenantData: Array<{
      business: Business;
      location: Location;
      users: User[];
      categories: Category[];
      products: Product[];
      suppliers: Supplier[];
      customers: Customer[];
      coupons: Coupon[];
      deliveryZones: DeliveryZone[];
      driverProfiles: DriverProfile[];
    }> = [];

    // ============ CREATE TENANTS ============

    for (const config of tenantConfigs) {
      console.log(`\n--- Creating Tenant: ${config.business.name} ---\n`);

      // 1. Create Business
      console.log('1. Creating business...');
      const business = businessRepo.create({
        name: config.business.name,
        currency: Currency.USD,
        language: Language.EN,
        tax: 8.625, // SF sales tax
        address: config.business.address,
        city: config.business.city,
        state: config.business.state,
        zipCode: config.business.zipCode,
        country: 'US',
        timezone: 'America/Los_Angeles',
        enabled: true,
      });
      await businessRepo.save(business);
      console.log(`   Created: ${business.name} (ID: ${business.id})`);

      // 2. Create Location
      console.log('2. Creating location...');
      const location = locationRepo.create({
        code: config.location.code,
        name: config.location.name,
        type: LocationType.RETAIL_STORE,
        status: LocationStatus.ACTIVE,
        addressLine1: config.business.address,
        city: config.business.city,
        state: config.business.state,
        postalCode: config.business.zipCode,
        country: 'US',
        phone: config.business.phone,
        email: config.business.email,
        latitude: config.business.latitude,
        longitude: config.business.longitude,
        timezone: 'America/Los_Angeles',
        taxRate: 0.08625,
        isPrimary: true,
        acceptsReturns: true,
        canTransferStock: true,
        trackInventory: true,
        allowNegativeStock: false,
        businessId: business.id,
        operatingHours: {
          monday: { open: '07:00', close: '21:00' },
          tuesday: { open: '07:00', close: '21:00' },
          wednesday: { open: '07:00', close: '21:00' },
          thursday: { open: '07:00', close: '21:00' },
          friday: { open: '07:00', close: '22:00' },
          saturday: { open: '08:00', close: '22:00' },
          sunday: { open: '08:00', close: '20:00' },
        },
      });
      await locationRepo.save(location);
      console.log(`   Created: ${location.name}`);

      // 3. Create Users
      console.log('3. Creating users...');
      const users: User[] = [];
      for (const userData of config.users) {
        const user = userRepo.create({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          hash: passwordHash,
          role: userData.role,
          authType: AuthType.EMAIL,
          phone: userData.phone,
          businessId: business.id,
          enabled: true,
          emailVerified: true,
        });
        await userRepo.save(user);
        users.push(user);
        console.log(`   Created: ${user.email} (${user.role})`);
      }

      // Set location manager
      const manager = users.find(u => u.role === Role.MANAGER);
      if (manager) {
        location.managerId = manager.id;
        await locationRepo.save(location);
      }

      // 4. Create Categories
      console.log('4. Creating categories...');
      const categories: Category[] = [];
      for (const catData of config.categories) {
        const category = categoryRepo.create({
          name: catData.name,
          color: catData.color,
          image: '',
          businessId: business.id,
          enabled: true,
          count: 0,
        });
        await categoryRepo.save(category);
        categories.push(category);
        console.log(`   Created: ${category.name}`);
      }

      // 5. Create Suppliers
      console.log('5. Creating suppliers...');
      const suppliers: Supplier[] = [];
      for (const supData of config.suppliers) {
        const supplier = supplierRepo.create({
          name: supData.name,
          code: supData.name.substring(0, 3).toUpperCase() + '-' + randomInt(100, 999),
          contactName: supData.contactName,
          email: supData.email,
          phone: supData.phone,
          addressLine1: supData.address,
          city: supData.city,
          state: supData.state,
          postalCode: supData.zipCode,
          country: 'US',
          paymentTerms: PaymentTerms.NET_30,
          status: SupplierStatus.ACTIVE,
          businessId: business.id,
        });
        await supplierRepo.save(supplier);
        suppliers.push(supplier);
        console.log(`   Created: ${supplier.name}`);
      }

      // 6. Create Products
      console.log('6. Creating products...');
      const products: Product[] = [];
      for (const prodData of config.products) {
        const product = productRepo.create({
          name: prodData.name,
          sku: prodData.sku,
          description: prodData.description,
          sellingPrice: prodData.sellingPrice,
          purchasePrice: prodData.purchasePrice,
          quantity: prodData.quantity,
          categoryId: categories[prodData.categoryIndex].id,
          businessId: business.id,
          defaultSupplierId: suppliers[prodData.categoryIndex % suppliers.length].id,
          images: [],
          enabled: true,
          taxClass: 'standard',
          partnerAvailability: {
            doordash: Math.random() > 0.3,
            uber_eats: Math.random() > 0.3,
            grubhub: Math.random() > 0.4,
          },
        });
        await productRepo.save(product);
        products.push(product);
      }
      console.log(`   Created ${products.length} products`);

      // Update category counts
      for (let i = 0; i < categories.length; i++) {
        const count = products.filter(p => p.categoryId === categories[i].id).length;
        await categoryRepo.update(categories[i].id, { count });
      }

      // 7. Create Customers
      console.log('7. Creating customers...');
      const customers: Customer[] = [];
      for (const custData of config.customers) {
        const customer = customerRepo.create({
          name: custData.name,
          email: custData.email,
          phone: custData.phone,
          address: custData.address,
          businessId: business.id,
          enabled: true,
        });
        await customerRepo.save(customer);
        customers.push(customer);
      }
      console.log(`   Created ${customers.length} customers`);

      // 8. Create Coupons
      console.log('8. Creating coupons...');
      const coupons: Coupon[] = [];
      const couponExpiry = new Date();
      couponExpiry.setDate(couponExpiry.getDate() + 90);
      for (const coupData of config.coupons) {
        const coupon = couponRepo.create({
          code: coupData.code,
          name: coupData.name,
          type: coupData.type,
          amount: coupData.amount,
          expiredAt: couponExpiry,
          businessId: business.id,
          enabled: true,
        });
        await couponRepo.save(coupon);
        coupons.push(coupon);
        console.log(`   Created: ${coupon.code}`);
      }

      // 9. Create Delivery Zones
      console.log('9. Creating delivery zones...');
      const deliveryZones: DeliveryZone[] = [];
      for (let i = 0; i < config.deliveryZones.length; i++) {
        const zoneData = config.deliveryZones[i];
        const zone = deliveryZoneRepo.create({
          name: zoneData.name,
          color: zoneData.color,
          zoneType: DeliveryZoneType.RADIUS,
          centerLatitude: config.business.latitude,
          centerLongitude: config.business.longitude,
          radiusMeters: zoneData.radiusMeters,
          baseFee: zoneData.baseFee,
          perKmFee: zoneData.perKmFee,
          minOrderAmount: zoneData.minOrderAmount,
          freeDeliveryThreshold: zoneData.freeDeliveryThreshold,
          estimatedMinMinutes: zoneData.estimatedMinMinutes,
          estimatedMaxMinutes: zoneData.estimatedMaxMinutes,
          priority: config.deliveryZones.length - i,
          enabled: true,
          businessId: business.id,
        });
        await deliveryZoneRepo.save(zone);
        deliveryZones.push(zone);
        console.log(`   Created: ${zone.name}`);
      }

      // 10. Create Driver Profiles
      console.log('10. Creating driver profiles...');
      const driverProfiles: DriverProfile[] = [];
      const drivers = users.filter(u => u.role === Role.DRIVER);
      const vehicleTypes = [VehicleType.CAR, VehicleType.MOTORCYCLE, VehicleType.BICYCLE];
      for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const profile = driverProfileRepo.create({
          userId: driver.id,
          businessId: business.id,
          status: DriverStatus.AVAILABLE,
          vehicleType: vehicleTypes[i % vehicleTypes.length],
          currentLatitude: config.business.latitude + (Math.random() - 0.5) * 0.02,
          currentLongitude: config.business.longitude + (Math.random() - 0.5) * 0.02,
          lastLocationUpdate: new Date(),
          deliveriesToday: randomInt(2, 8),
          totalDeliveries: randomInt(50, 200),
          averageRating: round2(4.2 + Math.random() * 0.8),
          maxConcurrentDeliveries: 2,
          enabled: true,
          workingHours: {
            monday: { start: '10:00', end: '20:00' },
            tuesday: { start: '10:00', end: '20:00' },
            wednesday: { start: '10:00', end: '20:00' },
            thursday: { start: '10:00', end: '20:00' },
            friday: { start: '10:00', end: '22:00' },
            saturday: { start: '11:00', end: '22:00' },
            sunday: { start: '11:00', end: '19:00' },
          },
        });
        await driverProfileRepo.save(profile);
        driverProfiles.push(profile);
        console.log(`   Created profile for: ${driver.firstName} ${driver.lastName}`);
      }

      // 11. Create Purchase Orders with Initial Stock
      console.log('11. Creating purchase orders...');
      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];
        const supplierProducts = products.filter(p => p.defaultSupplierId === supplier.id);
        if (supplierProducts.length === 0) continue;

        const poNumber = `PO-${business.name.substring(0, 3).toUpperCase()}-${1001 + i}`;
        const poDate = new Date();
        poDate.setDate(poDate.getDate() - randomInt(7, 30));

        const po = purchaseOrderRepo.create({
          orderNumber: poNumber,
          status: PurchaseOrderStatus.RECEIVED,
          supplierId: supplier.id,
          businessId: business.id,
          shipToLocationId: location.id,
          createdById: manager?.id || users[0].id,
          orderDate: poDate,
          expectedDelivery: new Date(poDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          receivedAt: new Date(poDate.getTime() + 5 * 24 * 60 * 60 * 1000),
          notes: `Regular inventory replenishment order from ${supplier.name}`,
        });

        let subtotal = 0;
        for (const prod of supplierProducts) {
          const qty = randomInt(20, 50);
          const lineTotal = round2(prod.purchasePrice * qty);
          subtotal += lineTotal;
        }
        po.subtotal = subtotal;
        po.taxAmount = round2(subtotal * 0.08625);
        po.total = round2(subtotal + po.taxAmount);

        await purchaseOrderRepo.save(po);

        // Create PO items and stock adjustments
        for (const prod of supplierProducts) {
          const qty = randomInt(20, 50);
          const lineTotal = round2(prod.purchasePrice * qty);

          const poItem = purchaseOrderItemRepo.create({
            purchaseOrderId: po.id,
            productId: prod.id,
            quantityOrdered: qty,
            quantityReceived: qty,
            unitCost: prod.purchasePrice,
            lineTotal,
          });
          await purchaseOrderItemRepo.save(poItem);

          // Create stock adjustment for this receipt
          const stockAdj = stockAdjustmentRepo.create({
            type: StockAdjustmentType.PURCHASE_ORDER,
            status: StockAdjustmentStatus.COMPLETED,
            quantity: qty,
            previousStock: prod.quantity - qty,
            newStock: prod.quantity,
            unitCost: prod.purchasePrice,
            totalCost: lineTotal,
            reason: `Received from PO ${poNumber}`,
            productId: prod.id,
            businessId: business.id,
            locationId: location.id,
            supplierId: supplier.id,
            purchaseOrderId: po.id,
            createdById: manager?.id || users[0].id,
            adjustmentDate: po.receivedAt!,
          });
          await stockAdjustmentRepo.save(stockAdj);
        }
        console.log(`   Created: ${poNumber} (${supplierProducts.length} items)`);
      }

      // Store tenant data for order/delivery creation
      allTenantData.push({
        business,
        location,
        users,
        categories,
        products,
        suppliers,
        customers,
        coupons,
        deliveryZones,
        driverProfiles,
      });
    }

    // ============ CREATE ORDERS & DELIVERIES (90 Days History) ============

    console.log('\n--- Creating Orders and Deliveries (90 Days) ---\n');

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const paymentMethods = [
      PaymentMethod.CASH, PaymentMethod.CASH,
      PaymentMethod.CREDIT_CARD, PaymentMethod.CREDIT_CARD, PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD, PaymentMethod.DEBIT_CARD,
      PaymentMethod.MOBILE_PAYMENT,
    ];
    const orderTypes = [
      OrderType.WALK_IN, OrderType.WALK_IN, OrderType.WALK_IN,
      OrderType.ONLINE, OrderType.ONLINE,
      OrderType.PHONE,
      OrderType.DOORDASH, OrderType.UBER_EATS,
    ];

    for (const tenant of allTenantData) {
      console.log(`Creating orders for ${tenant.business.name}...`);

      let orderNumber = 1000;
      let totalOrders = 0;
      let totalDeliveries = 0;

      // Create shifts for the period
      const staffUsers = tenant.users.filter(u => [Role.STAFF, Role.MANAGER].includes(u.role));
      let shiftNumber = 1;

      for (let dayOffset = 0; dayOffset <= 90; dayOffset++) {
        const orderDate = new Date(ninetyDaysAgo.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const dayOfWeek = orderDate.getDay();

        // Create shift for this day
        const shiftUser = staffUsers[dayOffset % staffUsers.length];
        const shiftStart = new Date(orderDate);
        shiftStart.setHours(8, 0, 0, 0);
        const shiftEnd = new Date(orderDate);
        shiftEnd.setHours(20, 0, 0, 0);

        const shift = shiftRepo.create({
          shiftNumber: shiftNumber++,
          status: ShiftStatus.CLOSED,
          openingFloat: 200,
          openedAt: shiftStart,
          closedAt: shiftEnd,
          businessId: tenant.business.id,
          userId: shiftUser.id,
          closedById: shiftUser.id,
          terminalId: 'POS-01',
        });

        // Orders per day based on day of week
        const ordersForDay = dayOfWeek === 0 || dayOfWeek === 6
          ? randomInt(15, 25) // Weekend
          : randomInt(8, 18); // Weekday

        let shiftCashSales = 0;
        let shiftCardSales = 0;
        let shiftTotalSales = 0;
        let shiftTaxTotal = 0;

        for (let i = 0; i < ordersForDay; i++) {
          orderNumber++;
          const orderTime = new Date(orderDate);
          orderTime.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));

          const orderType = randomItem(orderTypes);
          const isDelivery = [OrderType.ONLINE, OrderType.DOORDASH, OrderType.UBER_EATS].includes(orderType);
          const customer = Math.random() < 0.75 ? randomItem(tenant.customers) : null;

          // Select products
          const itemCount = randomInt(1, isDelivery ? 4 : 6);
          const selectedProducts: Product[] = [];
          for (let j = 0; j < itemCount; j++) {
            const product = randomItem(tenant.products);
            if (!selectedProducts.find(p => p.id === product.id)) {
              selectedProducts.push(product);
            }
          }

          // Calculate totals
          let subTotal = 0;
          const orderItems: Array<{ product: Product; qty: number; lineTotal: number }> = [];

          for (const product of selectedProducts) {
            const qty = randomInt(1, 3);
            const lineTotal = round2(product.sellingPrice * qty);
            subTotal += lineTotal;
            orderItems.push({ product, qty, lineTotal });
          }

          // Discount
          let discount = 0;
          let couponId: string | null = null;
          if (Math.random() < 0.15 && tenant.coupons.length > 0) {
            const coupon = randomItem(tenant.coupons);
            couponId = coupon.id;
            discount = coupon.type === CouponType.PERCENTAGE
              ? round2(subTotal * (coupon.amount / 100))
              : Math.min(coupon.amount, subTotal);
          }

          // Delivery fee
          const deliveryFee = isDelivery ? round2(randomInt(3, 8)) : 0;

          const taxableAmount = subTotal - discount;
          const taxAmount = round2(taxableAmount * 0.08625);
          const total = round2(taxableAmount + taxAmount + deliveryFee);

          // Create order
          const order = orderRepo.create({
            number: orderNumber,
            status: OrderStatus.COMPLETED,
            orderType,
            customerId: customer?.id || null,
            guestName: !customer ? 'Guest Customer' : null,
            couponId,
            subTotal,
            discount,
            taxType: TaxType.EXCLUSIVE,
            taxRate: 0.08625,
            taxAmount,
            deliveryFee,
            total,
            amountPaid: total,
            amountDue: 0,
            changeDue: 0,
            tipAmount: Math.random() < 0.4 ? round2(total * 0.15) : 0,
            isDelivery,
            deliveryAddress: isDelivery && customer ? customer.address : null,
            businessId: tenant.business.id,
            createdById: randomItem(staffUsers).id,
            createdAt: orderTime,
            updatedAt: orderTime,
            completedAt: new Date(orderTime.getTime() + randomInt(15, 45) * 60 * 1000),
          });

          await orderRepo.save(order);
          totalOrders++;

          // Create order items
          for (const item of orderItems) {
            const orderItem = orderItemRepo.create({
              orderId: order.id,
              productId: item.product.id,
              quantity: item.qty,
              unitPrice: item.product.sellingPrice,
              lineTotal: item.lineTotal,
            });
            await orderItemRepo.save(orderItem);

            // Create stock adjustment for sale
            const stockAdj = stockAdjustmentRepo.create({
              type: StockAdjustmentType.SALE,
              status: StockAdjustmentStatus.COMPLETED,
              quantity: -item.qty,
              previousStock: item.product.quantity + item.qty,
              newStock: item.product.quantity,
              productId: item.product.id,
              businessId: tenant.business.id,
              locationId: tenant.location.id,
              orderId: order.id,
              createdById: order.createdById,
              adjustmentDate: orderTime,
            });
            await stockAdjustmentRepo.save(stockAdj);
          }

          // Create payment
          const paymentMethod = randomItem(paymentMethods);
          const payment = paymentRepo.create({
            referenceId: `PAY-${uuidv4().substring(0, 8).toUpperCase()}`,
            method: paymentMethod,
            status: PaymentStatus.CAPTURED,
            amountTendered: total,
            amountApplied: total,
            changeAmount: 0,
            tipAmount: order.tipAmount,
            orderId: order.id,
            businessId: tenant.business.id,
            processedById: order.createdById,
            cardLastFour: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD].includes(paymentMethod)
              ? String(randomInt(1000, 9999)) : null,
            cardBrand: paymentMethod === PaymentMethod.CREDIT_CARD
              ? randomItem(['Visa', 'Mastercard', 'Amex']) : null,
            transactionId: paymentMethod !== PaymentMethod.CASH
              ? `TXN-${uuidv4().substring(0, 12).toUpperCase()}` : null,
            createdAt: orderTime,
            updatedAt: orderTime,
          });
          await paymentRepo.save(payment);

          // Update shift totals
          shiftTotalSales += total;
          shiftTaxTotal += taxAmount;
          if (paymentMethod === PaymentMethod.CASH) {
            shiftCashSales += total;
          } else {
            shiftCardSales += total;
          }

          // Create delivery for delivery orders
          if (isDelivery && customer && tenant.driverProfiles.length > 0) {
            const driverProfile = randomItem(tenant.driverProfiles);
            const deliveryTime = new Date(orderTime.getTime() + randomInt(20, 50) * 60 * 1000);

            const delivery = new Delivery();
            delivery.orderId = order.id;
            delivery.businessId = tenant.business.id;
            delivery.driverId = driverProfile.id;
            delivery.status = DeliveryStatus.DELIVERED;
            delivery.pickupAddress = `${tenant.business.address}, ${tenant.business.city}, ${tenant.business.state} ${tenant.business.zipCode}`;
            delivery.pickupLatitude = tenant.location.latitude || 40.7128;
            delivery.pickupLongitude = tenant.location.longitude || -74.0060;
            delivery.deliveryAddress = customer.address;
            delivery.deliveryLatitude = (tenant.location.latitude || 0) + (Math.random() - 0.5) * 0.05;
            delivery.deliveryLongitude = (tenant.location.longitude || 0) + (Math.random() - 0.5) * 0.05;
            delivery.customerName = customer.name;
            delivery.customerPhone = customer.phone;
            delivery.trackingToken = generateTrackingToken();
            delivery.distanceMeters = randomInt(1000, 7000);
            delivery.estimatedDurationSeconds = randomInt(15, 45) * 60;
            delivery.estimatedArrival = deliveryTime;
            delivery.deliveryFee = deliveryFee;
            delivery.driverTip = order.tipAmount;
            delivery.acceptedAt = new Date(orderTime.getTime() + 2 * 60 * 1000);
            delivery.assignedAt = new Date(orderTime.getTime() + 5 * 60 * 1000);
            delivery.pickedUpAt = new Date(orderTime.getTime() + 15 * 60 * 1000);
            delivery.deliveredAt = deliveryTime;
            delivery.customerRating = Math.random() < 0.7 ? randomInt(4, 5) : null;
            delivery.customerFeedback = Math.random() < 0.3 ? randomItem(['Great service!', 'Fast delivery', 'Food was still hot!', 'Very friendly driver']) : null;
            await deliveryRepo.save(delivery);
            totalDeliveries++;
          }

        }

        // Save shift with totals
        shift.totalSales = shiftTotalSales;
        shift.totalTax = shiftTaxTotal;
        shift.cashSales = shiftCashSales;
        shift.cardSales = shiftCardSales;
        shift.transactionCount = ordersForDay;
        shift.expectedCash = 200 + shiftCashSales;
        shift.actualCash = shift.expectedCash + randomInt(-5, 5);
        shift.cashDifference = shift.actualCash - shift.expectedCash;
        await shiftRepo.save(shift);
      }

      console.log(`   Created ${totalOrders} orders, ${totalDeliveries} deliveries`);

      // Create gift cards
      console.log('   Creating gift cards...');
      for (let i = 0; i < 5; i++) {
        const initialValue = randomItem([25, 50, 75, 100]);
        const usedAmount = Math.random() < 0.6 ? round2(initialValue * Math.random() * 0.7) : 0;
        const balance = round2(initialValue - usedAmount);

        const giftCard = giftCardRepo.create({
          code: generateGiftCardCode(),
          pin: String(randomInt(1000, 9999)),
          type: randomItem([GiftCardType.DIGITAL, GiftCardType.PHYSICAL]),
          status: balance > 0 ? GiftCardStatus.ACTIVE : GiftCardStatus.REDEEMED,
          initialValue,
          balance,
          currency: 'USD',
          validFrom: new Date(now.getTime() - randomInt(30, 60) * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
          customerId: randomItem(tenant.customers).id,
          businessId: tenant.business.id,
          issuedById: randomItem(staffUsers).id,
        });
        await giftCardRepo.save(giftCard);

        // Create issue transaction
        const issueTx = giftCardTxRepo.create({
          type: 'issue',
          amount: initialValue,
          balanceBefore: 0,
          balanceAfter: initialValue,
          description: 'Gift card issued',
          giftCardId: giftCard.id,
          processedById: giftCard.issuedById,
        });
        await giftCardTxRepo.save(issueTx);

        // Create redemption if used
        if (usedAmount > 0) {
          const redeemTx = giftCardTxRepo.create({
            type: 'redeem',
            amount: -usedAmount,
            balanceBefore: initialValue,
            balanceAfter: balance,
            description: 'Redeemed for purchase',
            giftCardId: giftCard.id,
            processedById: randomItem(staffUsers).id,
          });
          await giftCardTxRepo.save(redeemTx);
        }
      }
      console.log('   Created 5 gift cards');
    }

    // ============ CREATE CUSTOMER USERS (For Customer App) ============

    console.log('\n--- Creating Customer App Users ---\n');

    for (const tenant of allTenantData) {
      // Create 3 customer users for each tenant
      const customerUsers = [
        { firstName: 'Alex', lastName: 'Customer', email: `customer1@${tenant.business.name.toLowerCase().replace(/[^a-z]/g, '')}.app` },
        { firstName: 'Jordan', lastName: 'User', email: `customer2@${tenant.business.name.toLowerCase().replace(/[^a-z]/g, '')}.app` },
        { firstName: 'Taylor', lastName: 'Buyer', email: `customer3@${tenant.business.name.toLowerCase().replace(/[^a-z]/g, '')}.app` },
      ];

      for (const custUser of customerUsers) {
        const user = userRepo.create({
          firstName: custUser.firstName,
          lastName: custUser.lastName,
          email: custUser.email,
          hash: passwordHash,
          role: Role.CUSTOMER,
          authType: AuthType.EMAIL,
          businessId: tenant.business.id,
          enabled: true,
          emailVerified: true,
        });
        await userRepo.save(user);
        console.log(`   Created customer user: ${user.email}`);
      }
    }

    // ============ SUMMARY ============

    console.log('\n========================================');
    console.log('  Seed Completed Successfully!');
    console.log('========================================\n');

    console.log('Tenants Created:');
    for (const tenant of allTenantData) {
      console.log(`\n  ${tenant.business.name}:`);
      console.log(`    - Location: ${tenant.location.name}`);
      console.log(`    - Users: ${tenant.users.length} (incl. drivers)`);
      console.log(`    - Categories: ${tenant.categories.length}`);
      console.log(`    - Products: ${tenant.products.length}`);
      console.log(`    - Suppliers: ${tenant.suppliers.length}`);
      console.log(`    - Customers: ${tenant.customers.length}`);
      console.log(`    - Delivery Zones: ${tenant.deliveryZones.length}`);
    }

    console.log('\n========================================');
    console.log('  Login Credentials');
    console.log('  Password: Password123! (for all users)');
    console.log('========================================\n');

    console.log("Bella's Italian Kitchen:");
    console.log('  POS Admin:     isabella@bellaskitchen.com');
    console.log('  POS Manager:   marco@bellaskitchen.com');
    console.log('  POS Staff:     sofia@bellaskitchen.com');
    console.log('  Driver App:    antonio.driver@bellaskitchen.com');
    console.log('  Customer App:  customer1@bellasitaliankitchen.app');

    console.log('\nUrban Brew Coffee House:');
    console.log('  POS Admin:     jennifer@urbanbrew.com');
    console.log('  POS Manager:   michael@urbanbrew.com');
    console.log('  POS Staff:     emily@urbanbrew.com');
    console.log('  Driver App:    carlos.driver@urbanbrew.com');
    console.log('  Customer App:  customer1@urbanbrewcoffeehouse.app');

    console.log('\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
