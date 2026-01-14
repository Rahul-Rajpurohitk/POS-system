/**
 * Comprehensive Seed Script - Creates realistic demo data with 90 days of history
 * Run with: npm run seed
 * Reset and reseed with: npm run seed:reset
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
import {
  Role,
  AuthType,
  Currency,
  Language,
  CouponType,
  OrderStatus,
  TaxType,
  PaymentMethod,
  PaymentStatus,
} from '../types/enums';

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to pick random items from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to pick random number in range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to round to 2 decimal places
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function seed() {
  console.log('Starting comprehensive database seed...\n');
  console.log('This will create 90 days of realistic data for testing.\n');

  try {
    // Initialize database connection
    await initializePostgres();
    console.log('Database connected.\n');

    // Get repositories
    const businessRepo = AppDataSource.getRepository(Business);
    const userRepo = AppDataSource.getRepository(User);
    const categoryRepo = AppDataSource.getRepository(Category);
    const productRepo = AppDataSource.getRepository(Product);
    const customerRepo = AppDataSource.getRepository(Customer);
    const couponRepo = AppDataSource.getRepository(Coupon);
    const orderRepo = AppDataSource.getRepository(Order);
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const paymentRepo = AppDataSource.getRepository(Payment);

    // Check if demo business already exists
    const existingBusiness = await businessRepo.findOne({
      where: { name: 'Demo POS Store' },
    });

    if (existingBusiness) {
      console.log('Demo data already exists. Skipping seed.\n');
      console.log('To reset and reseed, run: npm run seed:reset\n');
      console.log('Demo Login Credentials:');
      console.log('  Email: demo@example.com');
      console.log('  Password: demo123456\n');
      await AppDataSource.destroy();
      return;
    }

    // ============ CREATE BUSINESS ============
    console.log('Creating demo business...');
    const business = businessRepo.create({
      name: 'Demo POS Store',
      currency: Currency.USD,
      language: Language.EN,
      tax: 8.5,
      enabled: true,
    });
    await businessRepo.save(business);
    console.log(`  Created: ${business.name} (ID: ${business.id})\n`);

    // ============ CREATE USERS ============
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('demo123456', 10);

    const usersData = [
      { firstName: 'Demo', lastName: 'Manager', email: 'demo@example.com', role: Role.MANAGER },
      { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: Role.ADMIN },
      { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', role: Role.STAFF },
      { firstName: 'Mike', lastName: 'Wilson', email: 'mike@example.com', role: Role.STAFF },
    ];

    const users: User[] = [];
    for (const userData of usersData) {
      const user = userRepo.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        hash: passwordHash,
        role: userData.role,
        authType: AuthType.EMAIL,
        businessId: business.id,
        enabled: true,
      });
      await userRepo.save(user);
      users.push(user);
      console.log(`  Created: ${user.email} (Role: ${user.role})`);
    }
    console.log('');

    // ============ CREATE CATEGORIES ============
    console.log('Creating categories...');
    const categoryData = [
      { name: 'Electronics', image: '' },
      { name: 'Clothing', image: '' },
      { name: 'Food & Beverages', image: '' },
      { name: 'Home & Garden', image: '' },
      { name: 'Sports & Outdoors', image: '' },
    ];

    const categories: Category[] = [];
    for (const cat of categoryData) {
      const category = categoryRepo.create({
        name: cat.name,
        image: cat.image,
        businessId: business.id,
        enabled: true,
        count: 0,
      });
      await categoryRepo.save(category);
      categories.push(category);
      console.log(`  Created: ${category.name}`);
    }
    console.log('');

    // ============ CREATE PRODUCTS ============
    console.log('Creating products...');
    const productsData = [
      // Electronics (popular items)
      { name: 'Wireless Earbuds', sku: 'ELEC-001', category: 0, price: 79.99, cost: 45.00, qty: 50 },
      { name: 'Bluetooth Speaker', sku: 'ELEC-002', category: 0, price: 49.99, cost: 28.00, qty: 35 },
      { name: 'Phone Charger', sku: 'ELEC-003', category: 0, price: 19.99, cost: 8.00, qty: 100 },
      { name: 'USB-C Cable', sku: 'ELEC-004', category: 0, price: 14.99, cost: 5.00, qty: 150 },
      // Clothing
      { name: 'Cotton T-Shirt', sku: 'CLTH-001', category: 1, price: 24.99, cost: 12.00, qty: 80 },
      { name: 'Denim Jeans', sku: 'CLTH-002', category: 1, price: 59.99, cost: 32.00, qty: 45 },
      { name: 'Baseball Cap', sku: 'CLTH-003', category: 1, price: 19.99, cost: 8.00, qty: 60 },
      { name: 'Running Shoes', sku: 'CLTH-004', category: 1, price: 89.99, cost: 48.00, qty: 30 },
      // Food & Beverages (high volume)
      { name: 'Coffee Beans 1lb', sku: 'FOOD-001', category: 2, price: 14.99, cost: 7.50, qty: 200 },
      { name: 'Green Tea Box', sku: 'FOOD-002', category: 2, price: 9.99, cost: 4.00, qty: 150 },
      { name: 'Protein Bar (6pk)', sku: 'FOOD-003', category: 2, price: 12.99, cost: 6.50, qty: 180 },
      { name: 'Sparkling Water (12pk)', sku: 'FOOD-004', category: 2, price: 8.99, cost: 4.00, qty: 120 },
      // Home & Garden
      { name: 'Scented Candle', sku: 'HOME-001', category: 3, price: 18.99, cost: 8.00, qty: 65 },
      { name: 'Plant Pot Set', sku: 'HOME-002', category: 3, price: 29.99, cost: 14.00, qty: 40 },
      { name: 'LED Desk Lamp', sku: 'HOME-003', category: 3, price: 34.99, cost: 18.00, qty: 55 },
      { name: 'Door Mat', sku: 'HOME-004', category: 3, price: 24.99, cost: 11.00, qty: 35 },
      // Sports & Outdoors
      { name: 'Yoga Mat', sku: 'SPRT-001', category: 4, price: 29.99, cost: 14.00, qty: 50 },
      { name: 'Water Bottle', sku: 'SPRT-002', category: 4, price: 19.99, cost: 8.00, qty: 80 },
      { name: 'Jump Rope', sku: 'SPRT-003', category: 4, price: 12.99, cost: 5.00, qty: 70 },
      { name: 'Resistance Bands', sku: 'SPRT-004', category: 4, price: 24.99, cost: 10.00, qty: 60 },
    ];

    const products: Product[] = [];
    for (const prod of productsData) {
      const product = productRepo.create({
        name: prod.name,
        sku: prod.sku,
        description: `High quality ${prod.name.toLowerCase()}`,
        sellingPrice: prod.price,
        purchasePrice: prod.cost,
        quantity: prod.qty,
        categoryId: categories[prod.category].id,
        businessId: business.id,
        images: [],
        enabled: true,
      });
      await productRepo.save(product);
      products.push(product);
      console.log(`  Created: ${product.name} ($${product.sellingPrice})`);
    }

    // Update category counts
    for (let i = 0; i < categories.length; i++) {
      await categoryRepo.update(categories[i].id, { count: 4 });
    }
    console.log('');

    // ============ CREATE CUSTOMERS ============
    console.log('Creating customers...');
    const customersData = [
      { name: 'John Smith', email: 'john.smith@email.com', phone: '+1-555-0101' },
      { name: 'Emily Johnson', email: 'emily.j@email.com', phone: '+1-555-0102' },
      { name: 'Michael Brown', email: 'mbrown@email.com', phone: '+1-555-0103' },
      { name: 'Sarah Davis', email: 'sarah.d@email.com', phone: '+1-555-0104' },
      { name: 'Robert Wilson', email: 'rwilson@email.com', phone: '+1-555-0105' },
      { name: 'Jennifer Taylor', email: 'jtaylor@email.com', phone: '+1-555-0106' },
      { name: 'David Martinez', email: 'dmartinez@email.com', phone: '+1-555-0107' },
      { name: 'Lisa Anderson', email: 'landerson@email.com', phone: '+1-555-0108' },
      { name: 'Chris Thomas', email: 'cthomas@email.com', phone: '+1-555-0109' },
      { name: 'Amanda White', email: 'awhite@email.com', phone: '+1-555-0110' },
      { name: 'James Harris', email: 'jharris@email.com', phone: '+1-555-0111' },
      { name: 'Michelle Clark', email: 'mclark@email.com', phone: '+1-555-0112' },
      { name: 'Daniel Lewis', email: 'dlewis@email.com', phone: '+1-555-0113' },
      { name: 'Jessica Walker', email: 'jwalker@email.com', phone: '+1-555-0114' },
      { name: 'Kevin Hall', email: 'khall@email.com', phone: '+1-555-0115' },
    ];

    const customers: Customer[] = [];
    for (const cust of customersData) {
      const customer = customerRepo.create({
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        address: '',
        businessId: business.id,
        enabled: true,
      });
      await customerRepo.save(customer);
      customers.push(customer);
      console.log(`  Created: ${customer.name}`);
    }
    console.log('');

    // ============ CREATE COUPONS ============
    console.log('Creating coupons...');
    const couponsData = [
      { code: 'SAVE10', name: '10% Off', type: CouponType.PERCENTAGE, amount: 10 },
      { code: 'SAVE20', name: '20% Off', type: CouponType.PERCENTAGE, amount: 20 },
      { code: 'FLAT5', name: '$5 Off', type: CouponType.FIXED, amount: 5 },
      { code: 'SUMMER15', name: 'Summer Sale 15%', type: CouponType.PERCENTAGE, amount: 15 },
      { code: 'NEWCUST', name: 'New Customer $10 Off', type: CouponType.FIXED, amount: 10 },
    ];

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);

    const coupons: Coupon[] = [];
    for (const coup of couponsData) {
      const coupon = couponRepo.create({
        code: coup.code,
        name: coup.name,
        type: coup.type,
        amount: coup.amount,
        expiredAt: expiryDate,
        businessId: business.id,
        enabled: true,
      });
      await couponRepo.save(coupon);
      coupons.push(coupon);
      console.log(`  Created: ${coupon.code} - ${coupon.name}`);
    }
    console.log('');

    // ============ CREATE ORDERS (90 days of history) ============
    console.log('Creating orders with 90 days of history...');

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const TAX_RATE = 0.085; // 8.5%

    // Payment method distribution
    const paymentMethods = [
      PaymentMethod.CASH,
      PaymentMethod.CASH,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.MOBILE_PAYMENT,
    ];

    let orderNumber = 1000;
    const orders: Order[] = [];
    let totalOrdersCreated = 0;

    // Create ~80-100 orders distributed across 90 days
    // More orders on weekends, fewer on weekdays
    for (let dayOffset = 0; dayOffset <= 90; dayOffset++) {
      const orderDate = new Date(ninetyDaysAgo.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const dayOfWeek = orderDate.getDay();

      // Determine number of orders for this day (more on weekends)
      let ordersForDay: number;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend: 2-4 orders
        ordersForDay = randomInt(2, 4);
      } else {
        // Weekday: 0-2 orders
        ordersForDay = randomInt(0, 2);
      }

      // Create orders for this day
      for (let i = 0; i < ordersForDay; i++) {
        orderNumber++;
        const orderTime = new Date(orderDate);
        // Set random time between 9am and 8pm
        orderTime.setHours(randomInt(9, 20), randomInt(0, 59), randomInt(0, 59));

        // Determine if order has customer (70% chance)
        const hasCustomer = Math.random() < 0.7;
        const customer = hasCustomer ? randomItem(customers) : null;

        // Random number of items (1-5)
        const itemCount = randomInt(1, 5);
        const selectedProducts: Product[] = [];
        for (let j = 0; j < itemCount; j++) {
          const product = randomItem(products);
          if (!selectedProducts.includes(product)) {
            selectedProducts.push(product);
          }
        }

        // Calculate order totals
        let subTotal = 0;
        const orderItems: Partial<OrderItem>[] = [];

        for (const product of selectedProducts) {
          const qty = randomInt(1, 3);
          const lineTotal = round2(product.sellingPrice * qty);
          subTotal += lineTotal;

          orderItems.push({
            productId: product.id,
            quantity: qty,
            unitPrice: product.sellingPrice,
            lineTotal,
          });
        }

        // Apply discount occasionally (20% chance)
        let discount = 0;
        let couponId: string | null = null;
        if (Math.random() < 0.2 && coupons.length > 0) {
          const coupon = randomItem(coupons);
          couponId = coupon.id;
          if (coupon.type === CouponType.PERCENTAGE) {
            discount = round2(subTotal * (coupon.amount / 100));
          } else {
            discount = Math.min(coupon.amount, subTotal);
          }
        }

        const taxableAmount = subTotal - discount;
        const taxAmount = round2(taxableAmount * TAX_RATE);
        const total = round2(taxableAmount + taxAmount);

        // Create the order
        const order = orderRepo.create({
          number: orderNumber,
          status: OrderStatus.COMPLETED,
          customerId: customer?.id || null,
          guestName: !customer ? 'Guest' : null,
          couponId,
          subTotal,
          discount,
          taxType: TaxType.EXCLUSIVE,
          taxRate: TAX_RATE,
          taxAmount,
          total,
          amountPaid: total,
          amountDue: 0,
          changeDue: 0,
          tipAmount: 0,
          businessId: business.id,
          createdById: randomItem(users).id,
          createdAt: orderTime,
          updatedAt: orderTime,
          completedAt: orderTime,
        });

        await orderRepo.save(order);
        orders.push(order);

        // Create order items
        for (const itemData of orderItems) {
          const item = orderItemRepo.create({
            orderId: order.id,
            productId: itemData.productId,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            lineTotal: itemData.lineTotal,
          });
          await orderItemRepo.save(item);
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
          tipAmount: 0,
          orderId: order.id,
          businessId: business.id,
          processedById: order.createdById,
          cardLastFour: paymentMethod === PaymentMethod.CREDIT_CARD || paymentMethod === PaymentMethod.DEBIT_CARD
            ? String(randomInt(1000, 9999))
            : null,
          cardBrand: paymentMethod === PaymentMethod.CREDIT_CARD
            ? randomItem(['Visa', 'Mastercard', 'Amex'])
            : null,
          transactionId: paymentMethod !== PaymentMethod.CASH
            ? `TXN-${uuidv4().substring(0, 12).toUpperCase()}`
            : null,
          createdAt: orderTime,
          updatedAt: orderTime,
        });

        await paymentRepo.save(payment);
        totalOrdersCreated++;
      }
    }

    console.log(`  Created ${totalOrdersCreated} orders spanning 90 days`);
    console.log('');

    // ============ SUMMARY ============
    console.log('========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');
    console.log('Demo Data Created:');
    console.log(`  - 1 Business: ${business.name}`);
    console.log(`  - ${users.length} Users (manager, admin, 2 staff)`);
    console.log(`  - ${categories.length} Categories`);
    console.log(`  - ${products.length} Products`);
    console.log(`  - ${customers.length} Customers`);
    console.log(`  - ${coupons.length} Coupons`);
    console.log(`  - ${totalOrdersCreated} Orders (90 days history)`);
    console.log(`  - ${totalOrdersCreated} Payments`);
    console.log('\nDemo Login Credentials:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo123456');
    console.log('\n  Other users use same password:');
    console.log('  - admin@example.com (Admin)');
    console.log('  - sarah@example.com (Staff)');
    console.log('  - mike@example.com (Staff)\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
