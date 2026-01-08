# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-08

### 🔒 Security Improvements

#### Added
- **Winston Logger**: Professional logging system with file rotation and structured logging
  - Separate log files for errors, combined logs, exceptions, and rejections
  - Console logging in development, file logging in production
  - Automatic log rotation (5MB max per file, 5 files retained)
  - HTTP request logging integrated with Morgan

- **Input Validation Middleware**: Comprehensive request validation using express-validator
  - Reusable validation chains for common patterns (email, password, pagination, etc.)
  - Automatic XSS protection via input sanitization
  - Standardized error response format
  - Custom validators for MongoDB ObjectIds, UUIDs, phone numbers, etc.

- **Rate Limiting**: Multi-tier rate limiting for different endpoint types
  - General limiter: 100 requests per 15 minutes
  - Auth limiter: 5 attempts per 15 minutes (skips successful attempts)
  - Password reset limiter: 3 attempts per hour
  - Create limiter: 20 requests per 15 minutes
  - Read limiter: 200 requests per 15 minutes
  - Upload limiter: 10 uploads per hour

- **Enhanced Error Handling**: Production-ready error handling system
  - Custom error classes (BadRequestError, UnauthorizedError, NotFoundError, etc.)
  - Different error responses for development vs production
  - Automatic logging of all errors with context
  - TypeORM and MongoDB error handling
  - JWT error handling
  - Multer (file upload) error handling
  - `catchAsync` wrapper for async route handlers

- **Environment Variable Validation**: Startup validation of required environment variables
  - Application fails fast if critical variables are missing
  - Prevents runtime errors due to misconfiguration

- **Database Connection Pooling**: Production-optimized connection settings
  - Configurable pool sizes for PostgreSQL and MongoDB
  - Timeout and retry configurations
  - Proper connection cleanup on shutdown

#### Changed
- **Removed All Hardcoded Secrets**: Eliminated security vulnerabilities
  - Removed hardcoded JWT secret (`'94rEvCERhR'`)
  - Removed hardcoded database credentials (`pos_user:pos_password`)
  - Removed hardcoded social password (`'w6ohXfbg85'`)
  - Removed hardcoded Firebase bucket
  - Updated Docker Compose to use environment variables

- **Updated Docker Compose Configuration**: Now uses .env file
  - No more hardcoded credentials
  - Configurable via environment variables
  - Support for different configurations per environment

- **Enhanced CORS Configuration**: More flexible and secure
  - Support for multiple allowed origins (comma-separated)
  - Configurable credentials support
  - Environment-specific settings

- **Improved app.ts**: Integrated all new middleware
  - Trust proxy configuration for rate limiting behind reverse proxy
  - Winston logging integration
  - Rate limiting applied globally
  - Configurable request size limits

- **Updated .gitignore**: Ensures .env.example is tracked
  - Excludes all .env files except .env.example
  - Proper handling of environment files

#### Fixed
- Console.log statements replaced with Winston logger in:
  - `src/config/database.ts`
  - `src/app.ts`
- Potential race conditions in database initialization
- Missing error handling in database connections

### 📝 Documentation

#### Added
- **SECURITY_IMPROVEMENTS.md**: Comprehensive security documentation
  - Detailed explanation of all security features
  - Usage examples for all middleware
  - Deployment checklist
  - Testing guide

- **SETUP_GUIDE.md**: Quick start guide
  - Step-by-step setup instructions
  - Common issues and solutions
  - Development workflow
  - Production deployment checklist
  - PM2 configuration

- **Enhanced .env.example**: Production-ready environment template
  - All configuration options documented
  - Security warnings and best practices
  - Production deployment checklist
  - Default values for all settings

- **CHANGELOG.md**: This file
  - Semantic versioning
  - Keep a Changelog format

### 🛠️ Dependencies

#### Added
- `winston@^3.11.0` - Professional logging library
- `express-rate-limit@^7.1.5` - Rate limiting middleware

### ⚙️ Configuration

#### Added
New environment variables:
- `DB_POOL_MAX` - PostgreSQL connection pool max size
- `DB_POOL_MIN` - PostgreSQL connection pool min size
- `DB_IDLE_TIMEOUT` - PostgreSQL idle connection timeout
- `MONGO_POOL_SIZE` - MongoDB connection pool size
- `MONGO_POOL_MIN` - MongoDB minimum pool size
- `MONGO_SOCKET_TIMEOUT` - MongoDB socket timeout
- `RATE_LIMIT_MAX` - Maximum requests per window
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in minutes
- `CORS_ORIGIN` - Comma-separated allowed origins
- `CORS_CREDENTIALS` - Enable credentials in CORS
- `LOG_LEVEL` - Winston log level
- `LOG_FILE_ERROR` - Error log file path
- `LOG_FILE_COMBINED` - Combined log file path
- `MAX_FILE_SIZE` - Maximum upload size
- `ALLOWED_FILE_TYPES` - Allowed MIME types for uploads
- `DEFAULT_CURRENCY` - Default currency code
- `DEFAULT_LANGUAGE` - Default language
- `DEFAULT_TAX_RATE` - Default tax rate
- `COOKIE_SECURE` - HTTPS-only cookies
- `COOKIE_SAME_SITE` - Cookie SameSite attribute
- `PGADMIN_EMAIL` - PGAdmin email (development)
- `PGADMIN_PASSWORD` - PGAdmin password (development)

#### Changed
- `JWT_SECRET` - Now required (no default fallback)
- `DEFAULT_SOCIAL_PASSWORD` - Now required (no default fallback)
- `DATABASE_URL` - Now validated at startup
- `MONGODB_URL` - Now validated at startup

### 🔄 Migration Guide

If upgrading from v1.x:

1. **Update .env file**:
   ```bash
   cp .env.example .env
   # Add your existing values
   ```

2. **Generate new secrets**:
   ```bash
   openssl rand -base64 64  # For JWT_SECRET
   openssl rand -base64 32  # For DEFAULT_SOCIAL_PASSWORD
   ```

3. **Update environment variables**:
   - Set `JWT_SECRET` (required)
   - Set `DEFAULT_SOCIAL_PASSWORD` (required)
   - Update `DATABASE_URL` format if needed
   - Update `MONGODB_URL` if using authentication

4. **Install new dependencies**:
   ```bash
   npm install
   ```

5. **Test the application**:
   ```bash
   npm run dev
   ```

6. **Review logs**:
   ```bash
   tail -f logs/combined.log
   ```

### ⚠️ Breaking Changes

- **JWT_SECRET**: No longer has a default value. Application will not start if not set.
- **DEFAULT_SOCIAL_PASSWORD**: No longer has a default value. Required for OAuth users.
- **DATABASE_URL**: Application validates this at startup and fails if missing.
- **MONGODB_URL**: Application validates this at startup and fails if missing.
- **Error Response Format**: Error responses now follow a standardized format.

### 📊 Statistics

- **Files Changed**: 15
- **New Files**: 7
- **Lines Added**: ~2,500
- **Security Issues Fixed**: 6 critical
- **New Middleware**: 4
- **Dependencies Added**: 2

### 🎯 Next Steps

For the next release (v2.1.0), we plan to add:
- [ ] Comprehensive test suite (unit, integration, e2e)
- [ ] Convert remaining JavaScript files to TypeScript
- [ ] OpenAPI/Swagger documentation
- [ ] Database migration system
- [ ] CI/CD pipeline configuration
- [ ] Docker production configuration
- [ ] Performance monitoring integration
- [ ] Additional authentication providers (Google, Facebook, etc.)

---

## [1.0.0] - Previous Version

### Initial Release
- React Native POS application
- Node.js/Express server
- TypeORM with PostgreSQL
- MongoDB for logs
- Redis caching
- BullMQ job queue
- JWT authentication
- Role-based access control
- Product, order, customer management
- Real-time sync
- Offline support

---

**For more details, see:**
- [Security Improvements](docs/SECURITY_IMPROVEMENTS.md)
- [Setup Guide](SETUP_GUIDE.md)
- [Documentation](docs/DOCUMENTATION_v2.md)
