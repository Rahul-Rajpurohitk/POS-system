# Security Improvements & Best Practices

This document describes all security enhancements implemented in the POS system.

## Table of Contents
- [Security Fixes](#security-fixes)
- [New Middleware](#new-middleware)
- [Usage Examples](#usage-examples)
- [Deployment Checklist](#deployment-checklist)

---

## Security Fixes

### 1. Removed Hardcoded Secrets ✅

**Before:**
```typescript
// ❌ INSECURE - Hardcoded secrets
JWTSecret: process.env.JWT_SECRET || '94rEvCERhR',
DEFAULT_SOCIAL_PASSWORD: process.env.DEFAULT_SOCIAL_PASSWORD || 'w6ohXfbg85',
DATABASE_URL: 'postgresql://pos_user:pos_password@localhost:5432/pos_db'
```

**After:**
```typescript
// ✅ SECURE - No fallbacks, will fail if not set
JWTSecret: process.env.JWT_SECRET!,
DEFAULT_SOCIAL_PASSWORD: process.env.DEFAULT_SOCIAL_PASSWORD!,
DATABASE_URL: process.env.DATABASE_URL // Validated at startup
```

**Impact:** Prevents accidental deployment with default credentials.

---

### 2. Environment Variable Validation

**Location:** `src/config/database.ts`

```typescript
// Validates required environment variables at startup
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}
```

**Impact:** Application fails fast if misconfigured, preventing runtime errors.

---

### 3. Database Connection Pool Configuration

**New Settings:**
```typescript
extra: {
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
}
```

**Impact:** Better resource management and performance in production.

---

## New Middleware

### 1. Winston Logger (`src/config/logger.ts`)

**Features:**
- Structured logging with JSON format
- Separate log files for errors, combined logs, exceptions, and rejections
- Console logging in development, file logging in production
- Automatic log rotation (5MB max per file, 5 files retained)

**Usage:**
```typescript
import logger, { logInfo, logError, logWarn } from '../config/logger';

// Simple logging
logger.info('User logged in');
logger.error('Database connection failed');

// Logging with metadata
logInfo('Order created', { orderId: '12345', userId: 'user-1' });
logError(new Error('Payment failed'), { orderId: '12345' });
```

**Log Files:**
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

---

### 2. Input Validation Middleware (`src/middlewares/validation.middleware.ts`)

**Features:**
- Built on express-validator
- Reusable validation chains
- Automatic error response formatting
- XSS protection via input sanitization

**Usage:**
```typescript
import { validate, commonValidations } from '../middlewares/validation.middleware';
import { body } from 'express-validator';

// Example: Validate product creation
router.post('/products',
  validate([
    ...commonValidations.string('name', { min: 3, max: 100 }),
    ...commonValidations.number('price', { min: 0 }),
    body('description').optional().trim().escape(),
    body('categoryId').isUUID().withMessage('Invalid category ID'),
  ]),
  createProduct
);

// Example: Validate user registration
router.post('/register',
  validate([
    ...commonValidations.email('email'),
    ...commonValidations.password('password'),
    ...commonValidations.phone('phone'),
  ]),
  register
);

// Example: Validate pagination
router.get('/products',
  validate([
    ...commonValidations.pagination(),
    ...commonValidations.dateRange(),
  ]),
  getProducts
);
```

**Available Validators:**
- `commonValidations.pagination()` - Page and limit validation
- `commonValidations.dateRange()` - Start and end date validation
- `commonValidations.email(field)` - Email validation
- `commonValidations.password(field)` - Strong password validation
- `commonValidations.phone(field)` - Phone number validation
- `commonValidations.string(field, options)` - String with min/max
- `commonValidations.number(field, options)` - Number with min/max
- `commonValidations.uuid(field)` - UUID validation
- `commonValidations.objectId(field)` - MongoDB ObjectId validation

---

### 3. Rate Limiting Middleware (`src/middlewares/rateLimit.middleware.ts`)

**Available Limiters:**

#### General Limiter (All Routes)
- **Limit:** 100 requests per 15 minutes
- **Usage:** Applied globally in app.ts

#### Auth Limiter (Login, Register)
- **Limit:** 5 attempts per 15 minutes
- **Feature:** Skips successful requests
- **Usage:**
```typescript
import { authLimiter } from '../middlewares/rateLimit.middleware';

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
```

#### Password Reset Limiter
- **Limit:** 3 attempts per hour
- **Usage:**
```typescript
import { passwordResetLimiter } from '../middlewares/rateLimit.middleware';

router.post('/forgot-password', passwordResetLimiter, forgotPassword);
```

#### Create Limiter (Data Creation)
- **Limit:** 20 requests per 15 minutes
- **Usage:**
```typescript
import { createLimiter } from '../middlewares/rateLimit.middleware';

router.post('/products', createLimiter, createProduct);
router.post('/orders', createLimiter, createOrder);
```

#### Read Limiter (Read-Only Endpoints)
- **Limit:** 200 requests per 15 minutes
- **Usage:**
```typescript
import { readLimiter } from '../middlewares/rateLimit.middleware';

router.get('/products', readLimiter, getProducts);
```

#### Upload Limiter
- **Limit:** 10 uploads per hour
- **Usage:**
```typescript
import { uploadLimiter } from '../middlewares/rateLimit.middleware';

router.post('/upload', uploadLimiter, uploadFile);
```

---

### 4. Error Handling Middleware (`src/middlewares/errorHandler.middleware.ts`)

**Features:**
- Centralized error handling
- Custom error classes
- Automatic logging
- Different responses for development/production
- Database error handling (TypeORM, MongoDB)
- JWT error handling
- File upload error handling

**Error Classes:**
```typescript
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  catchAsync
} from '../middlewares/errorHandler.middleware';

// Throw specific errors
throw new NotFoundError('Product not found');
throw new UnauthorizedError('Invalid credentials');
throw new BadRequestError('Invalid input');
throw new ConflictError('Email already exists');

// Use catchAsync to handle async errors
router.get('/products/:id', catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  res.json({ success: true, data: product });
}));
```

**Error Response Format:**

Development:
```json
{
  "success": false,
  "message": "Product not found",
  "error": { /* full error object */ },
  "stack": "Error: Product not found\\n at ..."
}
```

Production:
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

## Usage Examples

### Complete Controller Example

```typescript
import { Request, Response } from 'express';
import { validate, commonValidations } from '../middlewares/validation.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync, NotFoundError, BadRequestError } from '../middlewares/errorHandler.middleware';
import logger, { logInfo, logError } from '../config/logger';
import { body } from 'express-validator';

// Create Product
router.post('/products',
  createLimiter, // Apply rate limiting
  validate([ // Validate input
    ...commonValidations.string('name', { min: 3, max: 100 }),
    ...commonValidations.number('price', { min: 0 }),
    body('categoryId').isUUID(),
  ]),
  catchAsync(async (req: Request, res: Response) => {
    const { name, price, categoryId } = req.body;

    // Check if category exists
    const category = await Category.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Create product
    const product = await Product.create({ name, price, category });

    // Log the action
    logInfo('Product created', {
      productId: product.id,
      userId: req.user?.id,
      name: product.name,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  })
);

// Get Product
router.get('/products/:id',
  readLimiter,
  catchAsync(async (req: Request, res: Response) => {
    const product = await Product.findOne({ where: { id: req.params.id } });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: product,
    });
  })
);
```

---

## Deployment Checklist

### Before Deploying to Production

#### 1. Environment Variables ✅
- [ ] Copy `.env.example` to `.env`
- [ ] Generate strong JWT secret: `openssl rand -base64 64`
- [ ] Set strong `DEFAULT_SOCIAL_PASSWORD`
- [ ] Update `DATABASE_URL` with production credentials
- [ ] Set `MONGODB_URL` with authentication enabled
- [ ] Configure `REDIS_PASSWORD` if applicable
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGIN` to actual frontend domain
- [ ] Set `COOKIE_SECURE=true`

#### 2. Security Headers ✅
- [ ] Helmet is enabled (already configured)
- [ ] CORS configured with specific origins
- [ ] Rate limiting enabled

#### 3. Database Security ✅
- [ ] PostgreSQL: Strong password set
- [ ] MongoDB: Authentication enabled
- [ ] Redis: Password protection enabled
- [ ] SSL/TLS connections configured
- [ ] Connection pooling optimized

#### 4. Logging & Monitoring ✅
- [ ] Winston logger configured
- [ ] Log rotation set up
- [ ] Error tracking service integrated (optional: Sentry)
- [ ] Application monitoring (optional: PM2, New Relic)

#### 5. API Security ✅
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Authentication middleware applied
- [ ] Authorization checks in place

#### 6. File Upload Security
- [ ] Maximum file size configured (`MAX_FILE_SIZE`)
- [ ] Allowed file types restricted
- [ ] Upload rate limiting applied
- [ ] File storage secured (permissions)

---

## Testing Security Improvements

### 1. Test Rate Limiting
```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl http://localhost:3000/api/products
done

# Expected: 429 Too Many Requests after limit exceeded
```

### 2. Test Input Validation
```bash
# Invalid email
curl -X POST http://localhost:3000/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"email": "invalid", "password": "Test123"}'

# Expected: 400 Bad Request with validation errors
```

### 3. Test Authentication Errors
```bash
# Invalid JWT token
curl -X GET http://localhost:3000/api/protected \\
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized
```

### 4. Test Error Logging
```bash
# Check log files
tail -f logs/error.log
tail -f logs/combined.log
```

---

## Environment Variables Reference

See `.env.example` for the complete list of configuration options.

**Critical Variables:**
- `JWT_SECRET` - Must be set (no default)
- `DEFAULT_SOCIAL_PASSWORD` - Must be set (no default)
- `DATABASE_URL` - Must be set (no default)
- `MONGODB_URL` - Must be set (no default)

**Security Variables:**
- `RATE_LIMIT_MAX` - Maximum requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Time window in minutes (default: 15)
- `CORS_ORIGIN` - Allowed origins (default: *)
- `COOKIE_SECURE` - HTTPS only cookies (default: false)
- `MAX_FILE_SIZE` - Maximum upload size (default: 10MB)

---

## Support

For questions or issues, please refer to:
- Main documentation: `DOCUMENTATION_v2.md`
- API documentation: `/docs` (when running server)
- GitHub repository issues

---

**Last Updated:** 2026-01-08
**Version:** 2.0.0
