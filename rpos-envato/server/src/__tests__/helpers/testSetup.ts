/**
 * Test Setup Helpers
 * Provides authentication and utility functions for tests
 */

import request from 'supertest';

// Test configuration
export const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  testUser: {
    email: 'admin@example.com',
    password: 'demo123456',
  },
  managerUser: {
    email: 'demo@example.com',
    password: 'demo123456',
  },
};

// Store auth token
let authToken: string | null = null;

/**
 * Login and get authentication token
 */
export async function getAuthToken(app: any): Promise<string> {
  if (authToken) return authToken;

  const response = await request(app)
    .post('/auth/login')
    .send({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password,
    });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.message}`);
  }

  authToken = response.body.data.token;
  return authToken!;
}

/**
 * Clear cached token (for testing different users)
 */
export function clearAuthToken(): void {
  authToken = null;
}

/**
 * Create authenticated request helper
 */
export function authRequest(app: any, token: string) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    productName: `Test Product ${timestamp}`,
    categoryName: `Test Category ${timestamp}`,
    customerName: `Test Customer ${timestamp}`,
    email: `test${timestamp}@example.com`,
    sku: `TEST-${timestamp}`,
  };
}
