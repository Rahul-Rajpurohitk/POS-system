# Phase 3: Testing, DevOps & Production Readiness

> **Status:** IN PROGRESS
> **Started:** 2026-01-14
> **Epic:** DEV-53
> **Target Completion:** TBD

---

## Objectives

Prepare the RPOS system for production deployment by implementing:
1. Continuous Integration pipeline
2. Unit and integration tests
3. Docker production configuration
4. API documentation

---

## Scope

### 1. CI/CD Pipeline (GitHub Actions)

**Goal:** Automated testing and validation on every push/PR

**Workflow Features:**
- TypeScript compilation check
- ESLint linting
- Unit test execution
- Build verification
- Node.js 18.x + 20.x matrix

**File:** `.github/workflows/ci.yml`

### 2. Unit Tests

**Priority Services to Test:**

| Service | Priority | Complexity |
|---------|----------|------------|
| Auth Service | High | Medium |
| Order Service | High | High |
| Product Service | Medium | Low |
| Analytics Service | Medium | High |
| Payment Service | High | Medium |

**Test Framework:** Jest + ts-jest

**Target Coverage:** 80% for critical paths

### 3. Docker Production Setup

**Components:**
- `Dockerfile` (optimized multi-stage build)
- `docker-compose.prod.yml`
- Environment configuration
- Health checks
- Volume mounts for data persistence

### 4. API Documentation

**Approach:** OpenAPI 3.0 specification

**Options:**
1. Manual OpenAPI YAML file
2. Auto-generate from Express routes (swagger-jsdoc)
3. Use tsoa for automatic spec generation

---

## Implementation Plan

### Task 1: GitHub Actions CI Pipeline

**Deliverables:**
- `.github/workflows/ci.yml`

**Jobs:**
```yaml
jobs:
  lint-server:
    - Checkout
    - Setup Node.js
    - Install dependencies
    - Run ESLint

  build-server:
    - Checkout
    - Setup Node.js
    - Install dependencies
    - TypeScript compile

  test-server:
    - Checkout
    - Setup Node.js
    - Install dependencies
    - Run Jest tests
```

### Task 2: Auth Service Tests

**Test Cases:**
- User registration validation
- Login with correct credentials
- Login with incorrect password
- JWT token generation
- Refresh token rotation
- Password hashing verification

**File:** `server/src/services/__tests__/auth.service.test.ts`

### Task 3: Order Service Tests

**Test Cases:**
- Create order with items
- Calculate order totals correctly
- Apply discounts/coupons
- Handle payment processing
- Order status transitions
- Inventory deduction

**File:** `server/src/services/__tests__/order.service.test.ts`

### Task 4: Docker Production Config

**Dockerfile Optimization:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Task 5: API Documentation

**Using swagger-jsdoc:**
- Add JSDoc comments to routes
- Generate OpenAPI spec
- Serve Swagger UI at `/api-docs`

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| jest | ^29.7.0 | Test runner (already installed) |
| ts-jest | ^29.1.1 | TypeScript support (already installed) |
| swagger-jsdoc | ^6.x | OpenAPI generation |
| swagger-ui-express | ^5.x | API docs UI |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low test coverage | Medium | Focus on critical paths first |
| CI pipeline slow | Low | Cache node_modules, parallel jobs |
| Docker image large | Low | Multi-stage build, alpine base |

---

## Success Criteria

- [ ] CI pipeline runs on every PR
- [ ] All tests pass (green build)
- [ ] Coverage > 80% for auth, orders
- [ ] Docker image < 500MB
- [ ] API docs accessible at `/api-docs`

---

## Jira Tickets

| Key | Summary | Status |
|-----|---------|--------|
| DEV-53 | Phase 3 Epic | In Progress |
| DEV-54 | Set up GitHub Actions CI pipeline | To Do |
| DEV-55 | Unit tests - Auth Service | To Do |
| DEV-56 | Unit tests - Order Service | To Do |
| DEV-57 | Docker production configuration | To Do |
| DEV-58 | API documentation with Swagger/OpenAPI | To Do |

**Jira Board:** https://personalprojectmanagement.atlassian.net/jira/software/projects/DEV/boards/1

---

## Notes

- Phase 2 must be complete before starting (DONE)
- Existing Jest configuration can be leveraged
- Consider adding pre-commit hooks for lint/test
