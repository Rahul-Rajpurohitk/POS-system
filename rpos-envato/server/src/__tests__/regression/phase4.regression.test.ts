/**
 * Regression Tests - Phase 4 UI Improvements
 *
 * Comprehensive tests for all Phase 4 features.
 * These tests ensure features work correctly after code changes.
 *
 * Jira Epic: DEV-64
 * Tickets: DEV-65 to DEV-74
 */

import request from 'supertest';
import app from '../../app';
import { getAuthToken, authRequest, clearAuthToken, TEST_CONFIG } from '../helpers/testSetup';

describe('Phase 4 Regression Tests', () => {
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    adminToken = await getAuthToken(app);

    // Get manager token for role testing
    const managerResponse = await request(app)
      .post('/auth/login')
      .send({
        email: TEST_CONFIG.managerUser.email,
        password: TEST_CONFIG.managerUser.password,
      });
    managerToken = managerResponse.body.data?.token;
  });

  afterAll(() => {
    clearAuthToken();
  });

  // ============================================
  // DEV-72: POS Screen Blank Issue (ADMIN Role Fix)
  // ============================================
  describe('DEV-72: ADMIN Role Middleware Fix', () => {
    describe('Staff middleware allows ADMIN role', () => {
      it('ADMIN user can access /categories', async () => {
        const auth = authRequest(app, adminToken);
        const response = await auth.get('/categories');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('ADMIN user can access /products', async () => {
        const auth = authRequest(app, adminToken);
        const response = await auth.get('/products');

        expect(response.status).toBe(200);
      });

      it('ADMIN user can access /customers', async () => {
        const auth = authRequest(app, adminToken);
        const response = await auth.get('/customers');

        expect(response.status).toBe(200);
      });

      it('ADMIN user can access /orders', async () => {
        const auth = authRequest(app, adminToken);
        const response = await auth.get('/orders');

        expect(response.status).toBe(200);
      });
    });

    describe('Manager middleware allows ADMIN role', () => {
      it('ADMIN user can create categories', async () => {
        const auth = authRequest(app, adminToken);
        const response = await auth.post('/categories').send({
          name: `Test Category ${Date.now()}`,
        });

        // Should be 201 or 200 (created)
        expect([200, 201]).toContain(response.status);
      });
    });

    describe('MANAGER role still works', () => {
      it('MANAGER user can access /categories', async () => {
        if (!managerToken) {
          console.log('Skipping: Manager token not available');
          return;
        }

        const auth = authRequest(app, managerToken);
        const response = await auth.get('/categories');

        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================
  // DEV-66: Dashboard Recent Orders
  // ============================================
  describe('DEV-66: Dashboard Recent Orders Data', () => {
    it('returns orderNumber field', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/analytics/recent-orders?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty('orderNumber');
        expect(typeof order.orderNumber).toBe('string');
      }
    });

    it('returns itemCount field', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/analytics/recent-orders?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty('itemCount');
        expect(typeof order.itemCount).toBe('number');
      }
    });

    it('returns total field', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/analytics/recent-orders?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty('total');
        expect(typeof order.total).toBe('number');
      }
    });

    it('returns createdAt for date display', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/analytics/recent-orders?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty('createdAt');
      }
    });
  });

  // ============================================
  // DEV-69: Dashboard Period Selector
  // ============================================
  describe('DEV-69: Dashboard Period Selector', () => {
    const periods = ['today', 'this_week', 'this_month', 'all_time'];

    periods.forEach(period => {
      it(`supports "${period}" period`, async () => {
        const auth = authRequest(app, adminToken);
        const response = await auth.get(`/analytics/dashboard?period=${period}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('sales');
      });
    });

    it('returns sales revenue for each period', async () => {
      const auth = authRequest(app, adminToken);

      for (const period of periods) {
        const response = await auth.get(`/analytics/dashboard?period=${period}`);

        expect(response.status).toBe(200);
        expect(response.body.data.sales).toHaveProperty('totalRevenue');
        expect(response.body.data.sales).toHaveProperty('totalOrders');
      }
    });

    it('returns comparison data for applicable periods', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/analytics/dashboard?period=this_week');

      expect(response.status).toBe(200);
      // Comparison data is optional but should be structured if present
      if (response.body.data.sales.comparisonPeriod) {
        expect(response.body.data.sales.comparisonPeriod).toHaveProperty('percentChange');
      }
    });
  });

  // ============================================
  // DEV-67: Orders Status Badges
  // ============================================
  describe('DEV-67: Orders List Status Badges', () => {
    it('orders have status field', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/orders?limit=10');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty('status');
      }
    });

    it('orders have customer info for display', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/orders?limit=10');

      expect(response.status).toBe(200);

      // Orders should include customer relation
      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        // Customer may be null for walk-in customers
        if (order.customer) {
          expect(order.customer).toHaveProperty('name');
        }
      }
    });

    it('orders have items for count display', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/orders?limit=10');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty('items');
        expect(Array.isArray(order.items)).toBe(true);
      }
    });
  });

  // ============================================
  // DEV-68: Products Stock Indicators
  // ============================================
  describe('DEV-68: Products Stock Indicators', () => {
    it('products have quantity/stock field', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/products?limit=10');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        // Should have quantity or stock field
        expect(
          product.hasOwnProperty('quantity') || product.hasOwnProperty('stock')
        ).toBe(true);
      }
    });

    it('products have category for filtering', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/products?limit=10');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        // Category may be null but should be in response
        expect(product).toHaveProperty('category');
        if (product.category) {
          expect(product.category).toHaveProperty('name');
        }
      }
    });

    it('products have pricing for profit calculation', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/products?limit=10');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        expect(product).toHaveProperty('sellingPrice');
        expect(product).toHaveProperty('purchasePrice');
      }
    });
  });

  // ============================================
  // DEV-70: POS Category Filters
  // ============================================
  describe('DEV-70: POS Category Filters', () => {
    it('categories endpoint returns all categories', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/categories');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('categories have id and name for filter tabs', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/categories');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const category = response.body.data[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
      }
    });

    it('products can be filtered by category', async () => {
      const auth = authRequest(app, adminToken);

      // First get a category
      const categoriesResponse = await auth.get('/categories');

      if (categoriesResponse.body.data.length > 0) {
        const categoryId = categoriesResponse.body.data[0].id;

        // Then filter products (if API supports it)
        const productsResponse = await auth.get(`/products?categoryId=${categoryId}`);

        expect(productsResponse.status).toBe(200);
      }
    });
  });

  // ============================================
  // DEV-73: Orders Tabular Format
  // ============================================
  describe('DEV-73: Orders Tabular Format Support', () => {
    it('orders endpoint returns list data', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/orders?limit=50');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('order has all fields needed for table columns', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/orders?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];

        // Table columns: Order #, Customer, Items, Total, Status, Date, Actions
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('createdAt');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('items');
        // Payment info for total
        expect(
          order.hasOwnProperty('payment') ||
          order.hasOwnProperty('total') ||
          order.hasOwnProperty('subTotal')
        ).toBe(true);
      }
    });
  });

  // ============================================
  // DEV-74: Products Tabular Format
  // ============================================
  describe('DEV-74: Products Tabular Format Support', () => {
    it('products endpoint returns list data', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/products?limit=50');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('product has all fields needed for table columns', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/products?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];

        // Table columns: Image, Product, SKU, Category, Stock, Cost, Price, Profit, Actions
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('sellingPrice');
        expect(product).toHaveProperty('purchasePrice');
        expect(
          product.hasOwnProperty('quantity') || product.hasOwnProperty('stock')
        ).toBe(true);
      }
    });

    it('products have images array', async () => {
      const auth = authRequest(app, adminToken);
      const response = await auth.get('/products?limit=5');

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        expect(product).toHaveProperty('images');
        expect(Array.isArray(product.images)).toBe(true);
      }
    });
  });
});

// ============================================
// Error Handling Regression
// ============================================
describe('Error Handling Regression', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const endpoints = ['/categories', '/products', '/orders', '/customers'];

    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint);
      expect(response.status).toBe(401);
    }
  });

  it('returns proper error format', async () => {
    const response = await request(app).get('/categories');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });
});
