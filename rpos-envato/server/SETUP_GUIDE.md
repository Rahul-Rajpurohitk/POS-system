# POS System - Setup Guide

Quick setup guide for the RPOS (React Native Point of Sale) server application.

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 15+
- MongoDB 6+
- Redis 7+
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate social password secret
openssl rand -base64 32
```

### 4. Update .env File

Open `.env` and update the following critical values:

```bash
# CRITICAL: Update these values!
JWT_SECRET=<paste_generated_secret_here>
DEFAULT_SOCIAL_PASSWORD=<paste_second_generated_secret_here>

# Update database credentials
DATABASE_URL=postgresql://pos_user:YOUR_STRONG_PASSWORD@localhost:5432/pos_db
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD

# Update MongoDB if using authentication
MONGODB_URL=mongodb://localhost:27017/pos_logs
```

### 5. Start Database Services

#### Option A: Using Docker Compose (Recommended)

```bash
npm run docker:dev
```

This will start:
- PostgreSQL on port 5432
- MongoDB on port 27017
- Redis on port 6379
- PGAdmin on port 5050 (http://localhost:5050)
- Redis Commander on port 8081 (http://localhost:8081)

#### Option B: Manual Setup

If you have databases running locally, ensure they're started and accessible.

### 6. Verify Database Connection

```bash
# The application will validate database connections at startup
npm run dev
```

You should see:
```
PostgreSQL connected successfully
MongoDB connected successfully (for logs)
Express application initialized
Server listening on port 3000
```

### 7. Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
{
  "success": true,
  "message": "Server is running"
}
```

## Project Structure

```
server/
├── src/
│   ├── config/           # Configuration files
│   │   ├── constants.ts  # Application constants
│   │   ├── database.ts   # Database configuration
│   │   ├── logger.ts     # Winston logger configuration
│   │   └── index.ts
│   ├── controllers/      # Request handlers
│   ├── entities/         # TypeORM entities
│   ├── middlewares/      # Express middlewares
│   │   ├── auth.middleware.ts           # JWT authentication
│   │   ├── errorHandler.middleware.ts   # Error handling
│   │   ├── rateLimit.middleware.ts      # Rate limiting
│   │   └── validation.middleware.ts     # Input validation
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server entry point
├── logs/                # Application logs (auto-created)
├── docs/                # Documentation
├── .env.example         # Environment template
├── docker-compose.dev.yml
└── package.json
```

## Available Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run docker:dev       # Start all services with Docker
npm run docker:down      # Stop Docker services
npm run docker:logs      # View application logs

# Production
npm run build            # Compile TypeScript
npm start                # Start compiled application

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues

# Testing
npm test                 # Run tests (when implemented)
```

## Security Configuration

### Rate Limiting

Configure in `.env`:

```bash
RATE_LIMIT_MAX=100      # Requests per window
RATE_LIMIT_WINDOW_MS=15 # Window in minutes
```

### CORS Configuration

```bash
# Development
CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# Production
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true
```

### File Upload Limits

```bash
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf
```

## Logging

Logs are automatically written to:

- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

View logs in real-time:

```bash
# Error logs
tail -f logs/error.log

# All logs
tail -f logs/combined.log
```

## Common Issues

### Issue: "DATABASE_URL environment variable is required"

**Solution:** Ensure `.env` file exists and `DATABASE_URL` is set.

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL
```

### Issue: "PostgreSQL connection error"

**Solution:** Verify PostgreSQL is running and credentials are correct.

```bash
# Test PostgreSQL connection
psql -U pos_user -d pos_db -h localhost

# Or using Docker
docker ps | grep postgres
```

### Issue: "EADDRINUSE: address already in use :::3000"

**Solution:** Port 3000 is already in use. Change port in `.env`:

```bash
PORT=3001
```

### Issue: Rate limit errors during development

**Solution:** Temporarily increase limits in `.env`:

```bash
RATE_LIMIT_MAX=1000
```

## Development Workflow

### 1. Create New Feature

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# Test locally
npm run dev

# Lint code
npm run lint:fix
```

### 2. Add Input Validation

```typescript
import { validate, commonValidations } from '../middlewares/validation.middleware';
import { body } from 'express-validator';

router.post('/endpoint',
  validate([
    ...commonValidations.string('name', { min: 3, max: 100 }),
    body('customField').isEmail(),
  ]),
  handler
);
```

### 3. Add Rate Limiting

```typescript
import { createLimiter } from '../middlewares/rateLimit.middleware';

router.post('/create-resource', createLimiter, handler);
```

### 4. Add Error Handling

```typescript
import { catchAsync, NotFoundError } from '../middlewares/errorHandler.middleware';

router.get('/resource/:id', catchAsync(async (req, res) => {
  const resource = await findResource(req.params.id);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }
  res.json({ success: true, data: resource });
}));
```

### 5. Add Logging

```typescript
import logger, { logInfo, logError } from '../config/logger';

// Info logging
logInfo('Resource created', { resourceId: resource.id, userId: req.user.id });

// Error logging
logError(error, { context: 'Resource creation', userId: req.user.id });
```

## Production Deployment

### Pre-Deployment Checklist

1. ✅ All environment variables set
2. ✅ JWT_SECRET is strong and unique
3. ✅ Database passwords changed from defaults
4. ✅ NODE_ENV=production
5. ✅ CORS_ORIGIN set to actual domain
6. ✅ COOKIE_SECURE=true
7. ✅ Database backups configured
8. ✅ SSL/TLS certificates installed
9. ✅ Monitoring and alerting set up
10. ✅ Log rotation configured

### Build for Production

```bash
# Install production dependencies only
npm ci --production

# Build TypeScript
npm run build

# Start production server
npm start
```

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name pos-server

# Configure auto-restart
pm2 startup
pm2 save

# View logs
pm2 logs pos-server

# Monitor
pm2 monit
```

## Next Steps

1. Review [SECURITY_IMPROVEMENTS.md](docs/SECURITY_IMPROVEMENTS.md) for security features
2. Review [DOCUMENTATION_v2.md](docs/DOCUMENTATION_v2.md) for API documentation
3. Configure monitoring and alerting
4. Set up automated backups
5. Configure SSL/TLS
6. Set up CI/CD pipeline

## Support

- Documentation: `/docs` directory
- Issues: GitHub repository
- Security: See `SECURITY_IMPROVEMENTS.md`

---

**Version:** 2.0.0
**Last Updated:** 2026-01-08
