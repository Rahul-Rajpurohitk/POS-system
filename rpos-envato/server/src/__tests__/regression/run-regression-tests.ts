#!/usr/bin/env npx ts-node
/**
 * Regression Tests Runner - Phase 4 Features
 *
 * Run against a live server:
 *   npx ts-node src/__tests__/regression/run-regression-tests.ts
 *
 * Make sure the server is running on localhost:3000 first!
 *
 * Jira Epic: DEV-64
 * Tickets: DEV-65 to DEV-74
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  ticket?: string;
}

const results: TestResult[] = [];
let currentTicket = '';

async function fetchJson(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return { status: response.status, data: await response.json() };
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start, ticket: currentTicket });
    console.log(`    ✓ ${name} (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, duration: Date.now() - start, ticket: currentTicket });
    console.log(`    ✗ ${name} - ${error.message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function describe(ticket: string, description: string): void {
  currentTicket = ticket;
  console.log(`\n  ${ticket}: ${description}`);
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         REGRESSION TESTS - Phase 4 UI Improvements          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server: ${BASE_URL.padEnd(51)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  let adminToken = '';
  let managerToken = '';
  let staffToken = '';

  // ============================================
  // Setup - Get auth tokens for different roles
  // ============================================
  console.log('\n━━━ Setup: Authentication ━━━');

  // Admin login
  const adminResponse = await fetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'demo123456' }),
  });
  if (adminResponse.status === 200) {
    adminToken = adminResponse.data.data.token;
    console.log('  ✓ Admin token acquired');
  } else {
    console.log('  ✗ Failed to get admin token');
    process.exit(1);
  }

  // Manager login
  const managerResponse = await fetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@example.com', password: 'demo123456' }),
  });
  if (managerResponse.status === 200) {
    managerToken = managerResponse.data.data.token;
    console.log('  ✓ Manager token acquired');
  }

  // Staff login
  const staffResponse = await fetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'sarah@example.com', password: 'demo123456' }),
  });
  if (staffResponse.status === 200) {
    staffToken = staffResponse.data.data.token;
    console.log('  ✓ Staff token acquired');
  }

  // Auth helpers
  const authFetch = (token: string) => (url: string, options: RequestInit = {}) =>
    fetchJson(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });

  const adminFetch = authFetch(adminToken);
  const managerFetch = authFetch(managerToken);
  const staffFetch = authFetch(staffToken);

  // ============================================
  // DEV-72: ADMIN Role Middleware Fix
  // ============================================
  console.log('\n━━━ DEV-72: ADMIN Role Middleware Fix ━━━');

  describe('DEV-72', 'Staff middleware allows ADMIN role');

  await test('ADMIN can access /categories', async () => {
    const { status, data } = await adminFetch(`${BASE_URL}/categories`);
    assert(status === 200, `Expected 200, got ${status}. Message: ${data.message}`);
  });

  await test('ADMIN can access /products', async () => {
    const { status } = await adminFetch(`${BASE_URL}/products`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('ADMIN can access /customers', async () => {
    const { status } = await adminFetch(`${BASE_URL}/customers`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('ADMIN can access /orders', async () => {
    const { status } = await adminFetch(`${BASE_URL}/orders`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  describe('DEV-72', 'Manager middleware allows ADMIN role');

  await test('ADMIN can create categories', async () => {
    const { status, data } = await adminFetch(`${BASE_URL}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: `Regression Test ${Date.now()}` }),
    });
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}. ${data.message}`);
  });

  describe('DEV-72', 'Other roles still work');

  if (managerToken) {
    await test('MANAGER can access /categories', async () => {
      const { status } = await managerFetch(`${BASE_URL}/categories`);
      assert(status === 200, `Expected 200, got ${status}`);
    });
  }

  if (staffToken) {
    await test('STAFF can access /categories', async () => {
      const { status } = await staffFetch(`${BASE_URL}/categories`);
      assert(status === 200, `Expected 200, got ${status}`);
    });
  }

  // ============================================
  // DEV-66: Dashboard Recent Orders Data
  // ============================================
  console.log('\n━━━ DEV-66: Dashboard Recent Orders Data ━━━');

  describe('DEV-66', 'Recent orders returns proper fields');

  await test('Returns orderNumber field', async () => {
    const { status, data } = await adminFetch(`${BASE_URL}/analytics/recent-orders?limit=5`);
    assert(status === 200, `Expected 200, got ${status}`);
    if (data.data.length > 0) {
      assert('orderNumber' in data.data[0], 'Missing orderNumber field');
      assert(typeof data.data[0].orderNumber === 'string', 'orderNumber should be string');
    }
  });

  await test('Returns itemCount field', async () => {
    const { data } = await adminFetch(`${BASE_URL}/analytics/recent-orders?limit=5`);
    if (data.data.length > 0) {
      assert('itemCount' in data.data[0], 'Missing itemCount field');
      assert(typeof data.data[0].itemCount === 'number', 'itemCount should be number');
    }
  });

  await test('Returns total field', async () => {
    const { data } = await adminFetch(`${BASE_URL}/analytics/recent-orders?limit=5`);
    if (data.data.length > 0) {
      assert('total' in data.data[0], 'Missing total field');
    }
  });

  await test('Returns createdAt for date display', async () => {
    const { data } = await adminFetch(`${BASE_URL}/analytics/recent-orders?limit=5`);
    if (data.data.length > 0) {
      assert('createdAt' in data.data[0], 'Missing createdAt field');
    }
  });

  // ============================================
  // DEV-69: Dashboard Period Selector
  // ============================================
  console.log('\n━━━ DEV-69: Dashboard Period Selector ━━━');

  describe('DEV-69', 'Dashboard supports all periods');

  const periods = ['today', 'this_week', 'this_month', 'all_time'];
  for (const period of periods) {
    await test(`Supports "${period}" period`, async () => {
      const { status, data } = await adminFetch(`${BASE_URL}/analytics/dashboard?period=${period}`);
      assert(status === 200, `Expected 200, got ${status}`);
      assert(data.success === true, 'Request should succeed');
      assert('sales' in data.data, 'Missing sales data');
    });
  }

  await test('Returns sales revenue data', async () => {
    const { data } = await adminFetch(`${BASE_URL}/analytics/dashboard?period=this_week`);
    assert('totalRevenue' in data.data.sales, 'Missing totalRevenue');
    assert('totalOrders' in data.data.sales, 'Missing totalOrders');
  });

  // ============================================
  // DEV-67: Orders Status Badges
  // ============================================
  console.log('\n━━━ DEV-67: Orders Status Badges ━━━');

  describe('DEV-67', 'Orders have required fields for status display');

  await test('Orders have status field', async () => {
    const { data } = await adminFetch(`${BASE_URL}/orders?limit=10`);
    if (data.data.length > 0) {
      assert('status' in data.data[0], 'Missing status field');
    }
  });

  await test('Orders have customer info', async () => {
    const { data } = await adminFetch(`${BASE_URL}/orders?limit=10`);
    if (data.data.length > 0) {
      assert('customer' in data.data[0], 'Missing customer field');
    }
  });

  await test('Orders have items for count', async () => {
    const { data } = await adminFetch(`${BASE_URL}/orders?limit=10`);
    if (data.data.length > 0) {
      assert('items' in data.data[0], 'Missing items field');
      assert(Array.isArray(data.data[0].items), 'Items should be array');
    }
  });

  // ============================================
  // DEV-68: Products Stock Indicators
  // ============================================
  console.log('\n━━━ DEV-68: Products Stock Indicators ━━━');

  describe('DEV-68', 'Products have required fields for stock display');

  await test('Products have quantity/stock field', async () => {
    const { data } = await adminFetch(`${BASE_URL}/products?limit=10`);
    if (data.data.length > 0) {
      const p = data.data[0];
      assert('quantity' in p || 'stock' in p, 'Missing quantity/stock field');
    }
  });

  await test('Products have category for filter', async () => {
    const { data } = await adminFetch(`${BASE_URL}/products?limit=10`);
    if (data.data.length > 0) {
      assert('category' in data.data[0], 'Missing category field');
    }
  });

  await test('Products have pricing for profit calc', async () => {
    const { data } = await adminFetch(`${BASE_URL}/products?limit=10`);
    if (data.data.length > 0) {
      assert('sellingPrice' in data.data[0], 'Missing sellingPrice');
      assert('purchasePrice' in data.data[0], 'Missing purchasePrice');
    }
  });

  // ============================================
  // DEV-70: POS Category Filters
  // ============================================
  console.log('\n━━━ DEV-70: POS Category Filters ━━━');

  describe('DEV-70', 'Categories available for POS filter tabs');

  await test('Categories endpoint returns data', async () => {
    const { status, data } = await adminFetch(`${BASE_URL}/categories`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.data), 'Should return array');
  });

  await test('Categories have id and name', async () => {
    const { data } = await adminFetch(`${BASE_URL}/categories`);
    if (data.data.length > 0) {
      assert('id' in data.data[0], 'Missing id');
      assert('name' in data.data[0], 'Missing name');
    }
  });

  // ============================================
  // DEV-73: Orders Tabular Format
  // ============================================
  console.log('\n━━━ DEV-73: Orders Tabular Format ━━━');

  describe('DEV-73', 'Orders API supports tabular display');

  await test('Orders endpoint returns list', async () => {
    const { status, data } = await adminFetch(`${BASE_URL}/orders?limit=50`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.success === true, 'Request should succeed');
  });

  await test('Orders have all table columns', async () => {
    const { data } = await adminFetch(`${BASE_URL}/orders?limit=5`);
    if (data.data.length > 0) {
      const o = data.data[0];
      assert('id' in o, 'Missing id');
      assert('createdAt' in o, 'Missing createdAt');
      assert('status' in o, 'Missing status');
      assert('items' in o, 'Missing items');
    }
  });

  // ============================================
  // DEV-74: Products Tabular Format
  // ============================================
  console.log('\n━━━ DEV-74: Products Tabular Format ━━━');

  describe('DEV-74', 'Products API supports tabular display');

  await test('Products endpoint returns list', async () => {
    const { status, data } = await adminFetch(`${BASE_URL}/products?limit=50`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.success === true, 'Request should succeed');
  });

  await test('Products have all table columns', async () => {
    const { data } = await adminFetch(`${BASE_URL}/products?limit=5`);
    if (data.data.length > 0) {
      const p = data.data[0];
      assert('id' in p, 'Missing id');
      assert('name' in p, 'Missing name');
      assert('sku' in p, 'Missing sku');
      assert('category' in p, 'Missing category');
      assert('sellingPrice' in p, 'Missing sellingPrice');
      assert('purchasePrice' in p, 'Missing purchasePrice');
    }
  });

  await test('Products have images array', async () => {
    const { data } = await adminFetch(`${BASE_URL}/products?limit=5`);
    if (data.data.length > 0) {
      assert('images' in data.data[0], 'Missing images');
      assert(Array.isArray(data.data[0].images), 'Images should be array');
    }
  });

  // ============================================
  // Error Handling
  // ============================================
  console.log('\n━━━ Error Handling ━━━');

  describe('AUTH', 'Unauthenticated access blocked');

  const protectedEndpoints = ['/categories', '/products', '/orders', '/customers'];
  for (const endpoint of protectedEndpoints) {
    await test(`${endpoint} requires authentication`, async () => {
      const { status } = await fetchJson(`${BASE_URL}${endpoint}`);
      assert(status === 401, `Expected 401, got ${status}`);
    });
  }

  // ============================================
  // Results Summary
  // ============================================
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  // Group by ticket
  const byTicket: { [key: string]: { passed: number; failed: number } } = {};
  results.forEach(r => {
    const t = r.ticket || 'OTHER';
    if (!byTicket[t]) byTicket[t] = { passed: 0, failed: 0 };
    if (r.passed) byTicket[t].passed++;
    else byTicket[t].failed++;
  });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    REGRESSION TEST RESULTS                   ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests: ${String(results.length).padEnd(47)}║`);
  console.log(`║  Passed: ${String(passed).padEnd(52)}║`);
  console.log(`║  Failed: ${String(failed).padEnd(52)}║`);
  console.log(`║  Duration: ${String(totalDuration + 'ms').padEnd(50)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Results by Ticket:                                          ║');
  Object.entries(byTicket).forEach(([ticket, counts]) => {
    const status = counts.failed === 0 ? '✓' : '✗';
    const line = `${status} ${ticket}: ${counts.passed} passed, ${counts.failed} failed`;
    console.log(`║    ${line.padEnd(57)}║`);
  });
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  [${r.ticket}] ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n✅ All regression tests passed! Phase 4 features validated.\n');
  process.exit(0);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
