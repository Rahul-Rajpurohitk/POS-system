# RPOS - React Native Point of Sale System

A modern, full-featured Point of Sale (POS) system built with React Native (Expo) for the mobile/tablet app and Node.js/Express for the backend API. Designed for retail businesses with support for multi-location operations, offline mode, real-time sync, and comprehensive reporting.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Deployment](#deployment)

---

## Features

### Core POS Features
- **Product Management** - Categories, variants, SKUs, barcodes, images
- **Order Processing** - Cart management, discounts, coupons, split payments
- **Customer Management** - Customer profiles, purchase history, loyalty points
- **Payment Processing** - Cash, card, mobile payments, split payments
- **Receipt Generation** - Thermal printing, email receipts, PDF generation

### Advanced Features
- **Multi-Location Support** - Manage multiple store locations
- **Inventory Management** - Stock tracking, low stock alerts, supplier management
- **Loyalty Program** - Points-based rewards, tier system, redemption
- **Gift Cards** - Issue, redeem, and track gift card balances
- **Shift Management** - Clock in/out, cash drawer management, EOD reports
- **Barcode Scanning** - Built-in scanner, barcode generation (EAN-13, UPC, QR)

### Technical Features
- **Offline Mode** - Full offline functionality with automatic sync
- **Real-time Updates** - WebSocket-based live updates across devices
- **Analytics Dashboard** - Sales trends, top products, revenue metrics
- **Comprehensive Reports** - Sales, inventory, shift, tax reports
- **Email Notifications** - Order receipts, low stock alerts, daily reports

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  React Native (Expo 52)  │  Tamagui UI  │  Zustand  │  React Query│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│     Express.js  │  WebSocket (Socket.io)  │  JWT Auth            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  26 Business Services: Auth, Orders, Payments, Inventory, etc.  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
├───────────────────┬─────────────────────┬───────────────────────┤
│   PostgreSQL      │      MongoDB        │        Redis          │
│   (Main DB)       │   (Logs/Events)     │   (Cache/Sessions)    │
│   TypeORM         │    Mongoose         │   BullMQ Queues       │
└───────────────────┴─────────────────────┴───────────────────────┘
```

---

## Tech Stack

### Frontend (Mobile App)
| Technology | Purpose |
|------------|---------|
| React Native | Cross-platform mobile framework |
| Expo SDK 52 | Development toolchain |
| Tamagui | UI component library |
| Zustand | State management |
| React Query | Server state & caching |
| React Hook Form + Zod | Form handling & validation |
| React Navigation | Navigation |
| NetInfo | Network connectivity detection |

### Backend (API Server)
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| TypeORM | PostgreSQL ORM |
| Mongoose | MongoDB ODM |
| Socket.io | Real-time communication |
| BullMQ | Job queue processing |
| Nodemailer | Email service |
| JWT | Authentication |

### Databases
| Database | Purpose |
|----------|---------|
| PostgreSQL | Primary transactional data (orders, products, customers) |
| MongoDB | Event logs, audit trails, analytics data |
| Redis | Session cache, real-time pub/sub, job queues |

---

## Project Structure

```
rpos-envato/
├── app/                          # React Native mobile app
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── ui/               # Base components (Button, Card, Modal)
│   │   │   ├── product/          # Product-related components
│   │   │   └── order/            # Order/cart components
│   │   ├── features/             # Feature modules with hooks
│   │   │   ├── products/hooks.ts
│   │   │   ├── customers/hooks.ts
│   │   │   ├── orders/hooks.ts
│   │   │   └── coupons/hooks.ts
│   │   ├── screens/              # Screen components
│   │   │   ├── auth/             # Login, Register, ForgotPassword
│   │   │   └── main/             # POS, Dashboard, Settings
│   │   ├── services/             # API client, sync service
│   │   ├── store/                # Zustand stores
│   │   ├── navigation/           # React Navigation setup
│   │   ├── hooks/                # Custom hooks
│   │   ├── utils/                # Helper functions
│   │   └── types/                # TypeScript types
│   ├── App.tsx                   # App entry point
│   └── package.json
│
├── server/                       # Node.js backend
│   ├── src/
│   │   ├── config/               # Configuration files
│   │   │   ├── database.ts       # PostgreSQL & MongoDB setup
│   │   │   ├── redis.ts          # Redis configuration
│   │   │   └── logger.ts         # Winston logger
│   │   ├── entities/             # TypeORM entities (21 entities)
│   │   ├── services/             # Business logic (26 services)
│   │   │   ├── auth.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── loyalty.service.ts
│   │   │   └── ...
│   │   ├── routes/               # API route handlers
│   │   ├── middlewares/          # Express middlewares
│   │   ├── queues/               # BullMQ job processors
│   │   └── utils/                # Utilities
│   ├── server.ts                 # Server entry point
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+
- Expo CLI (`npm install -g expo-cli`)

### Quick Start

#### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd rpos-envato

# Install server dependencies
cd server
npm install

# Install app dependencies
cd ../app
npm install
```

#### 2. Start Infrastructure (Docker)

```bash
# From project root
docker-compose -f docker-compose.dev.yml up -d postgres mongodb redis
```

Or install databases locally:
- PostgreSQL: Create database `pos_db`
- MongoDB: Create database `pos_logs`
- Redis: Default configuration

#### 3. Configure Environment

```bash
# Server configuration
cd server
cp .env.example .env
# Edit .env with your settings
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://pos_user:pos_password@localhost:5432/pos_db
MONGODB_URL=mongodb://localhost:27017/pos_logs

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secure-secret-key
JWT_EXPIRES_IN=7d

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
SMTP_FROM=noreply@yourpos.com
```

#### 4. Start the Server

```bash
cd server
npm run dev
```

Server will start at `http://localhost:3000`

#### 5. Start the Mobile App

```bash
cd app
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan QR for physical device.

---

## Configuration

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `MONGODB_URL` | MongoDB connection string | Required |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `SMTP_*` | Email configuration | Optional |

### App Configuration

Edit `app/src/services/api/client.ts` to set your API base URL:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';
```

---

## API Endpoints

### Health Check
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health status |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe (checks all dependencies) |
| `/health/detailed` | GET | Detailed system status |

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/logout` | POST | User logout |

### Products
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products |
| `/api/products/:id` | GET | Get product |
| `/api/products` | POST | Create product |
| `/api/products/:id` | PUT | Update product |
| `/api/products/:id` | DELETE | Delete product |

### Orders
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | GET | List orders |
| `/api/orders/:id` | GET | Get order |
| `/api/orders` | POST | Create order |
| `/api/orders/:id/refund` | POST | Refund order |

### Additional Endpoints
- `/api/categories` - Category management
- `/api/customers` - Customer management
- `/api/coupons` - Coupon management
- `/api/payments` - Payment processing
- `/api/reports` - Report generation
- `/api/analytics` - Analytics data
- `/api/inventory` - Inventory management
- `/api/locations` - Multi-location management
- `/api/shifts` - Shift management
- `/api/eod` - End of day reports
- `/api/loyalty` - Loyalty program
- `/api/giftcards` - Gift card management
- `/api/sync` - Offline sync

---

## Database Schema

### PostgreSQL Entities (21 tables)

**Core Entities:**
- `User` - System users with roles
- `Business` - Business/store information
- `Location` - Store locations

**Product Management:**
- `Product` - Products with variants
- `Category` - Product categories
- `Supplier` - Supplier information

**Sales:**
- `Order` - Sales orders
- `OrderItem` - Order line items
- `Payment` - Payment records
- `Coupon` - Discount coupons

**Customer Management:**
- `Customer` - Customer profiles
- `LoyaltyTransaction` - Loyalty points history
- `GiftCard` - Gift card records

**Operations:**
- `Shift` - Employee shifts
- `EODReport` - End of day reports
- `InventoryMovement` - Stock movements

### MongoDB Collections

- `audit_logs` - Audit trail
- `event_logs` - System events
- `analytics_events` - Analytics data

---

## Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Cloud Deployment Checklist

- [ ] Set secure `JWT_SECRET`
- [ ] Configure production database URLs
- [ ] Set up SSL/TLS certificates
- [ ] Configure email service (SMTP)
- [ ] Set up monitoring (health endpoints available)
- [ ] Configure backup strategy
- [ ] Set appropriate connection pool sizes

### Health Monitoring

The server provides Kubernetes-compatible health endpoints:

```bash
# Liveness probe
curl http://localhost:3000/health/live

# Readiness probe
curl http://localhost:3000/health/ready

# Detailed status
curl http://localhost:3000/health/detailed
```

---

## Implementation Notes

### Offline Mode

The app supports full offline operation:
1. Orders are queued locally when offline
2. NetInfo monitors connectivity status
3. Automatic sync when connection restored
4. Conflict resolution for concurrent updates

### Real-time Updates

WebSocket connections provide:
- Order status updates
- Inventory changes
- Multi-device synchronization
- Live dashboard metrics

### Security

- JWT-based authentication
- Role-based access control (Admin, Manager, Cashier)
- Password hashing with bcrypt
- Input validation with Zod
- SQL injection prevention via TypeORM
- XSS protection headers

---

## License

This is a commercial product. See LICENSE file for terms.

---

## Support

For support and feature requests, please contact the development team.
