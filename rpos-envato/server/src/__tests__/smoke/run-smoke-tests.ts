#!/usr/bin/env npx ts-node
/**
 * Smoke Tests Runner - Quick API Validation
 *
 * Run this against a live server:
 *   npx ts-node src/__tests__/smoke/run-smoke-tests.ts
 *
 * Make sure the server is running on localhost:3000 first!
 *
 * Related Jira: DEV-64 (Phase 4 UI Improvements)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

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
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, duration: Date.now() - start });
    console.log(`  ✗ ${name} - ${error.message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('\n========================================');
  console.log('SMOKE TESTS - Phase 4 Features');
  console.log(`Server: ${BASE_URL}`);
  console.log('========================================\n');

  let authToken = '';

  // ============================================
  // Health Check
  // ============================================
  console.log('Health Check:');

  await test('Server is healthy', async () => {
    const { status, data } = await fetchJson(`${BASE_URL}/health`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'ok', 'Health status should be ok');
  });

  // ============================================
  // Authentication
  // ============================================
  console.log('\nAuthentication:');

  await test('Login with valid credentials', async () => {
    const { status, data } = await fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'demo123456',
      }),
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.success === true, 'Login should succeed');
    assert(data.data.token, 'Should return token');
    authToken = data.data.token;
  });

  await test('Reject invalid credentials', async () => {
    const { status } = await fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'wrongpassword',
      }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // Helper for authenticated requests
  const authFetch = (url: string, options: RequestInit = {}) =>
    fetchJson(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${authToken}`,
      },
    });

  // ============================================
  // DEV-72: Categories API (ADMIN Role Fix)
  // ============================================
  console.log('\nDEV-72: ADMIN Role Middleware Fix:');

  await test('ADMIN can access /categories', async () => {
    const { status, data } = await authFetch(`${BASE_URL}/categories`);
    assert(status === 200, `Expected 200, got ${status}. Message: ${data.message}`);
    assert(data.success === true, 'Request should succeed');
    assert(Array.isArray(data.data), 'Should return array');
  });

  await test('Unauthenticated request is rejected', async () => {
    const { status } = await fetchJson(`${BASE_URL}/categories`);
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ============================================
  // Products API (DEV-68, DEV-74)
  // ============================================
  console.log('\nDEV-68/74: Products API:');

  await test('Fetch products list', async () => {
    const { status, data } = await authFetch(`${BASE_URL}/products?limit=10`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.data), 'Should return array');
  });

  await test('Products have stock field', async () => {
    const { data } = await authFetch(`${BASE_URL}/products?limit=5`);
    if (data.data.length > 0) {
      const product = data.data[0];
      assert(
        'quantity' in product || 'stock' in product,
        'Product should have quantity or stock field'
      );
    }
  });

  await test('Products have category', async () => {
    const { data } = await authFetch(`${BASE_URL}/products?limit=5`);
    if (data.data.length > 0) {
      const product = data.data[0];
      assert('category' in product, 'Product should have category field');
    }
  });

  await test('Products have pricing for profit calc', async () => {
    const { data } = await authFetch(`${BASE_URL}/products?limit=5`);
    if (data.data.length > 0) {
      const product = data.data[0];
      assert('sellingPrice' in product, 'Product should have sellingPrice');
      assert('purchasePrice' in product, 'Product should have purchasePrice');
    }
  });

  // ============================================
  // Orders API (DEV-67, DEV-73)
  // ============================================
  console.log('\nDEV-67/73: Orders API:');

  await test('Fetch orders list', async () => {
    const { status, data } = await authFetch(`${BASE_URL}/orders?limit=10`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.data), 'Should return array');
  });

  await test('Orders have status field', async () => {
    const { data } = await authFetch(`${BASE_URL}/orders?limit=5`);
    if (data.data.length > 0) {
      const order = data.data[0];
      assert('status' in order, 'Order should have status field');
    }
  });

  await test('Orders have items array', async () => {
    const { data } = await authFetch(`${BASE_URL}/orders?limit=5`);
    if (data.data.length > 0) {
      const order = data.data[0];
      assert('items' in order, 'Order should have items field');
      assert(Array.isArray(order.items), 'Items should be array');
    }
  });

  // ============================================
  // Analytics API (DEV-66, DEV-69)
  // ============================================
  console.log('\nDEV-66/69: Analytics API:');

  await test('Dashboard endpoint works', async () => {
    const { status, data } = await authFetch(`${BASE_URL}/analytics/dashboard?period=this_week`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert('sales' in data.data, 'Should have sales data');
  });

  await test('Period selector: today', async () => {
    const { status } = await authFetch(`${BASE_URL}/analytics/dashboard?period=today`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('Period selector: this_month', async () => {
    const { status } = await authFetch(`${BASE_URL}/analytics/dashboard?period=this_month`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('Period selector: all_time', async () => {
    const { status } = await authFetch(`${BASE_URL}/analytics/dashboard?period=all_time`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('Recent orders have orderNumber', async () => {
    const { status, data } = await authFetch(`${BASE_URL}/analytics/recent-orders?limit=5`);
    assert(status === 200, `Expected 200, got ${status}`);
    if (data.data.length > 0) {
      const order = data.data[0];
      assert('orderNumber' in order, 'Should have orderNumber field');
    }
  });

  await test('Recent orders have itemCount', async () => {
    const { data } = await authFetch(`${BASE_URL}/analytics/recent-orders?limit=5`);
    if (data.data.length > 0) {
      const order = data.data[0];
      assert('itemCount' in order, 'Should have itemCount field');
    }
  });

  // ============================================
  // Customers API
  // ============================================
  console.log('\nCustomers API:');

  await test('Fetch customers list', async () => {
    const { status, data } = await authFetch(`${BASE_URL}/customers?limit=10`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.data), 'Should return array');
  });

  // ============================================
  // Summary
  // ============================================
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n========================================');
  console.log('SMOKE TEST RESULTS');
  console.log('========================================');
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('All smoke tests passed! Phase 4 features validated.');
  process.exit(0);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
