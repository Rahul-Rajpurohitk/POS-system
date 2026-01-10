# RPOS Development Guide

This document covers the technical implementation details, development workflow, and architecture decisions for the RPOS system.

## Table of Contents

- [Development Setup](#development-setup)
- [Architecture Details](#architecture-details)
- [Frontend Implementation](#frontend-implementation)
- [Backend Implementation](#backend-implementation)
- [Database Design](#database-design)
- [API Integration](#api-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Development Setup

### Local Development Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Server (with hot reload)
cd server && npm run dev

# App (Expo)
cd app && npx expo start
```

### Environment Files

**Server (.env):**
```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://pos_user:pos_password@localhost:5432/pos_db
DB_POOL_MAX=10
DB_POOL_MIN=2

# MongoDB
MONGODB_URL=mongodb://localhost:27017/pos_logs
MONGO_POOL_SIZE=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=7d

# Email (optional in dev)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@pos.local
```

---

## Architecture Details

### Data Flow

```
User Action (App)
       │
       ▼
┌──────────────┐
│  Zustand     │ ◄─── Local state management
│  Store       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ React Query  │ ◄─── Server state, caching, retry
│  Hooks       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  API Client  │ ◄─── Axios with interceptors
│  (Axios)     │
└──────┬───────┘
       │
       ▼ HTTP/WebSocket
┌──────────────┐
│  Express     │
│  Server      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Business    │ ◄─── 26 service classes
│  Services    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  TypeORM/    │
│  Mongoose    │
└──────────────┘
```

### Service Layer Pattern

Each service follows this pattern:

```typescript
// services/example.service.ts
class ExampleService {
  // CRUD operations
  async create(data: CreateDTO): Promise<Entity> { }
  async findAll(filters: FilterDTO): Promise<Entity[]> { }
  async findById(id: string): Promise<Entity | null> { }
  async update(id: string, data: UpdateDTO): Promise<Entity> { }
  async delete(id: string): Promise<void> { }

  // Business logic
  async processSpecificAction(): Promise<Result> { }
}

export const exampleService = new ExampleService();
```

---

## Frontend Implementation

### State Management (Zustand)

**Store Structure:**

```typescript
// store/cartStore.ts
interface CartStore {
  items: CartItem[];
  customer: Customer | null;
  coupon: Coupon | null;

  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setCoupon: (coupon: Coupon | null) => void;
  clear: () => void;

  // Computed
  getSubTotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}
```

**Persistence:**

```typescript
// Stores persist to AsyncStorage
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### React Query Hooks

**Feature-based Hook Organization:**

```typescript
// features/products/hooks.ts
export function useProducts(params?: ProductFilters) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => get('/products', { params }),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => get(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductDTO) => post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### Network Connectivity (NetInfo)

**Implementation in App.tsx:**

```typescript
import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  if (Platform.OS === 'web') {
    // Web: use browser events
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
  } else {
    // Native: use NetInfo
    const unsubscribe = NetInfo.addEventListener(state => {
      setOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }
}, []);
```

### Offline Queue

**Sync Service:**

```typescript
// services/sync.ts
export function startSyncListener() {
  const { syncQueue, isOnline } = useSyncStore.getState();

  // Watch for connectivity changes
  const unsubscribe = useSyncStore.subscribe(
    (state) => state.isOnline,
    async (online) => {
      if (online && syncQueue.length > 0) {
        await processOfflineQueue();
      }
    }
  );

  return unsubscribe;
}

async function processOfflineQueue() {
  const { syncQueue, removeFromQueue } = useSyncStore.getState();

  for (const item of syncQueue) {
    try {
      await post(item.endpoint, item.data);
      removeFromQueue(item.id);
    } catch (error) {
      // Keep in queue for retry
      console.error('Sync failed:', error);
    }
  }
}
```

---

## Backend Implementation

### Service Examples

**Order Processing:**

```typescript
// services/order-processing.service.ts
class OrderProcessingService {
  async createOrder(data: CreateOrderDTO, userId: string): Promise<Order> {
    return AppDataSource.transaction(async (manager) => {
      // 1. Validate products and stock
      await this.validateProducts(data.items, manager);

      // 2. Calculate totals
      const totals = await this.calculateTotals(data, manager);

      // 3. Create order
      const order = manager.create(Order, {
        ...data,
        ...totals,
        createdBy: userId,
        status: 'pending',
      });
      await manager.save(order);

      // 4. Create order items
      for (const item of data.items) {
        const orderItem = manager.create(OrderItem, {
          order,
          product: { id: item.productId },
          quantity: item.quantity,
          price: item.price,
        });
        await manager.save(orderItem);

        // 5. Update inventory
        await this.updateInventory(item, manager);
      }

      // 6. Process payment
      if (data.payment) {
        await paymentService.processPayment(order.id, data.payment);
      }

      // 7. Update customer loyalty
      if (data.customerId) {
        await loyaltyService.addPoints(data.customerId, totals.total);
      }

      return order;
    });
  }
}
```

**Email Service:**

```typescript
// services/email.service.ts
class EmailService {
  private transporter: Transporter | null = null;

  async initialize(): Promise<void> {
    if (!config.smtpHost) return;

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    await this.transporter.verify();
  }

  async sendOrderReceipt(email: string, order: OrderEmailData): Promise<boolean> {
    const template = this.generateReceiptTemplate(order);
    return this.send({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }

  // Templates for: receipts, password reset, welcome, alerts, reports
}
```

### Health Check Endpoints

```typescript
// routes/index.ts

// Basic health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe (checks dependencies)
router.get('/health/ready', async (req, res) => {
  const checks = {};

  // PostgreSQL
  checks.postgresql = await checkPostgres();

  // MongoDB
  checks.mongodb = await checkMongo();

  // Redis
  checks.redis = await checkRedis();

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
  });
});

// Detailed status
router.get('/health/detailed', async (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      postgresql: await checkPostgres(),
      mongodb: await checkMongo(),
      redis: await checkRedis(),
      email: { available: emailService.isAvailable() },
    },
  });
});
```

---

## Database Design

### PostgreSQL Schema

**Core Relationships:**

```
Business (1) ──────< Location (N)
    │
    └──< User (N)

Location (1) ──────< Product (N)
    │
    └──< Order (N)

Product (N) >──────< Category (N)  [Many-to-Many]

Customer (1) ──────< Order (N)
    │
    └──< LoyaltyTransaction (N)

Order (1) ──────< OrderItem (N) >────── Product (N)
    │
    └──< Payment (N)
```

**Key Entities:**

```typescript
// entities/order.entity.ts
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  number: string;

  @ManyToOne(() => Customer, { nullable: true })
  customer: Customer;

  @ManyToOne(() => Location)
  location: Location;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Payment, payment => payment.order)
  payments: Payment[];

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;
}
```

### MongoDB Schemas

```typescript
// models/audit-log.model.ts
const AuditLogSchema = new Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  userId: { type: String, required: true },
  changes: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});

// Indexes for efficient querying
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ timestamp: -1 });
```

---

## API Integration

### API Client Setup

```typescript
// services/api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
      await handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export const get = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<T, T>(url, config);

export const post = <T>(url: string, data?: unknown) =>
  api.post<T, T>(url, data);
```

---

## Testing

### Backend Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

### Frontend Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
psql $DATABASE_URL -c "SELECT 1"
```

**2. Redis Connection Issues**
```bash
# Check Redis
redis-cli ping

# Check from container
docker exec -it redis redis-cli ping
```

**3. MongoDB Connection Issues**
```bash
# Check MongoDB
mongosh $MONGODB_URL --eval "db.runCommand({ ping: 1 })"
```

**4. App Not Connecting to Server**
- Ensure server is running on correct port
- Check API_BASE_URL in app config
- For physical device, use your machine's IP (not localhost)

**5. Offline Sync Not Working**
- Check NetInfo is properly configured
- Verify sync store is persisted
- Check network permissions on device

### Debug Mode

**Server:**
```bash
# Enable debug logging
DEBUG=* npm run dev
```

**App:**
```bash
# Enable React Query devtools
// In App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
```

---

## Contributing

1. Create feature branch from `main`
2. Follow existing code patterns
3. Write tests for new features
4. Update documentation
5. Submit PR for review

---

## Version History

- **1.0.0** - Initial release with core POS features
- **1.1.0** - Added offline mode, loyalty program
- **1.2.0** - Multi-location support, gift cards
- **1.3.0** - Email notifications, health checks
