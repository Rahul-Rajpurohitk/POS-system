/**
 * Middleware Regression Tests
 *
 * Tests for authentication and authorization middleware.
 * Critical for DEV-72 (ADMIN role fix).
 */

import request from 'supertest';
import app from '../../app';
import { TEST_CONFIG } from '../helpers/testSetup';

describe('Middleware Regression Tests', () => {
  // ============================================
  // Role-Based Access Control
  // ============================================
  describe('Role-Based Access Control', () => {
    let adminToken: string;
    let managerToken: string;
    let staffToken: string;

    beforeAll(async () => {
      // Login as admin
      const adminResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'demo123456',
        });
      adminToken = adminResponse.body.data?.token;

      // Login as manager
      const managerResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'demo@example.com',
          password: 'demo123456',
        });
      managerToken = managerResponse.body.data?.token;

      // Login as staff (if exists)
      const staffResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'demo123456',
        });
      staffToken = staffResponse.body.data?.token;
    });

    // ============================================
    // Staff Middleware (allows ADMIN, MANAGER, STAFF)
    // ============================================
    describe('Staff Middleware', () => {
      const staffEndpoints = [
        { method: 'GET', path: '/categories' },
        { method: 'GET', path: '/products' },
        { method: 'GET', path: '/orders' },
        { method: 'GET', path: '/customers' },
      ];

      describe('ADMIN role access', () => {
        staffEndpoints.forEach(({ method, path }) => {
          it(`ADMIN can ${method} ${path}`, async () => {
            const response = await request(app)
              .get(path)
              .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).not.toBe(403);
            expect(response.body.message).not.toBe('Staff access required');
          });
        });
      });

      describe('MANAGER role access', () => {
        staffEndpoints.forEach(({ method, path }) => {
          it(`MANAGER can ${method} ${path}`, async () => {
            if (!managerToken) {
              console.log('Skipping: Manager token not available');
              return;
            }

            const response = await request(app)
              .get(path)
              .set('Authorization', `Bearer ${managerToken}`);

            expect(response.status).not.toBe(403);
            expect(response.body.message).not.toBe('Staff access required');
          });
        });
      });

      describe('STAFF role access', () => {
        staffEndpoints.forEach(({ method, path }) => {
          it(`STAFF can ${method} ${path}`, async () => {
            if (!staffToken) {
              console.log('Skipping: Staff token not available');
              return;
            }

            const response = await request(app)
              .get(path)
              .set('Authorization', `Bearer ${staffToken}`);

            expect(response.status).not.toBe(403);
            expect(response.body.message).not.toBe('Staff access required');
          });
        });
      });
    });

    // ============================================
    // Manager Middleware (allows ADMIN, MANAGER)
    // ============================================
    describe('Manager Middleware', () => {
      describe('ADMIN role access to manager endpoints', () => {
        it('ADMIN can create categories', async () => {
          const response = await request(app)
            .post('/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: `Test Admin Category ${Date.now()}` });

          expect(response.status).not.toBe(403);
          expect(response.body.message).not.toBe('Manager access required');
        });
      });

      describe('MANAGER role access to manager endpoints', () => {
        it('MANAGER can create categories', async () => {
          if (!managerToken) {
            console.log('Skipping: Manager token not available');
            return;
          }

          const response = await request(app)
            .post('/categories')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ name: `Test Manager Category ${Date.now()}` });

          expect(response.status).not.toBe(403);
          expect(response.body.message).not.toBe('Manager access required');
        });
      });
    });

    // ============================================
    // Unauthenticated Access
    // ============================================
    describe('Unauthenticated Access', () => {
      const protectedEndpoints = [
        '/categories',
        '/products',
        '/orders',
        '/customers',
        '/analytics/dashboard',
      ];

      protectedEndpoints.forEach(path => {
        it(`${path} requires authentication`, async () => {
          const response = await request(app).get(path);

          expect(response.status).toBe(401);
        });
      });
    });

    // ============================================
    // Invalid Token
    // ============================================
    describe('Invalid Token Handling', () => {
      it('rejects invalid JWT token', async () => {
        const response = await request(app)
          .get('/categories')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('rejects expired token format', async () => {
        const response = await request(app)
          .get('/categories')
          .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJleHAiOjB9.invalid');

        expect(response.status).toBe(401);
      });
    });
  });
});
