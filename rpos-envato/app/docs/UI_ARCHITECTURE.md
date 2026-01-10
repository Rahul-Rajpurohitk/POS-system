# POS Universal - UI Architecture Documentation

## Overview

POS Universal is a cross-platform Point of Sale application built with React Native and Expo, supporting iOS, Android, and Web from a single TypeScript codebase.

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| React Native | Cross-platform mobile framework | 0.73.6 |
| Expo | Development platform & tooling | ~52.0.0 |
| TypeScript | Type safety | ^5.3.0 |
| Tamagui | UI component library | ^1.115.0 |
| Zustand | Client state management | ^5.0.0 |
| React Query | Server state management | ^5.60.0 |
| React Navigation | Navigation | ^6.1.17 |
| React Hook Form | Form handling | ^7.53.2 |
| Zod | Schema validation | ^3.23.8 |

## Project Structure

```
app/
├── App.tsx                    # Main entry point with providers
├── index.js                   # Expo registration
├── app.json                   # Expo configuration
├── tamagui.config.ts          # Theme & design tokens
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies
│
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Core UI primitives
│   │   │   ├── Button.tsx     # Button with variants
│   │   │   ├── Input.tsx      # Text input with validation
│   │   │   ├── Card.tsx       # Card container
│   │   │   ├── Modal.tsx      # Modal dialogs
│   │   │   └── index.ts
│   │   ├── product/           # Product-specific components
│   │   │   └── ProductItem.tsx
│   │   ├── order/             # Order-specific components
│   │   │   └── CartItem.tsx
│   │   └── index.ts
│   │
│   ├── screens/               # Screen components (27 total)
│   │   ├── auth/              # Authentication screens
│   │   ├── main/              # Dashboard & POS
│   │   ├── products/          # Product management
│   │   ├── categories/        # Category management
│   │   ├── orders/            # Order management
│   │   ├── customers/         # Customer management
│   │   ├── coupons/           # Coupon management
│   │   ├── reports/           # Analytics & reports
│   │   ├── settings/          # App settings & staff
│   │   ├── profile/           # User profile
│   │   └── more/              # More menu
│   │
│   ├── navigation/            # Navigation configuration
│   │   ├── types.ts           # Navigation type definitions
│   │   ├── AuthNavigator.tsx  # Auth flow navigation
│   │   ├── MainNavigator.tsx  # Main app navigation
│   │   └── RootNavigator.tsx  # Root navigator with auth guard
│   │
│   ├── store/                 # Zustand state stores
│   │   ├── authStore.ts       # Authentication state
│   │   ├── settingsStore.ts   # App settings
│   │   ├── cartStore.ts       # POS cart state
│   │   └── syncStore.ts       # Offline sync queue
│   │
│   ├── features/              # Feature modules with API hooks
│   │   ├── auth/              # Auth API & hooks
│   │   ├── products/          # Products API & hooks
│   │   ├── orders/            # Orders API & hooks
│   │   ├── categories/        # Categories API & hooks
│   │   ├── customers/         # Customers API & hooks
│   │   ├── coupons/           # Coupons API & hooks
│   │   └── settings/          # Settings API & hooks
│   │
│   ├── services/              # External services
│   │   ├── api/               # HTTP client & React Query
│   │   ├── printer/           # Receipt printing
│   │   └── sync/              # Offline sync manager
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── usePlatform.ts     # Platform detection
│   │   └── index.ts
│   │
│   ├── utils/                 # Utility functions
│   │   ├── currency.ts        # Currency formatting
│   │   ├── id.ts              # ID generation
│   │   └── index.ts           # Date, validation utilities
│   │
│   └── types/                 # TypeScript type definitions
│       └── index.ts           # Domain types
│
└── assets/                    # Static assets
```

## Design System

### Color Palette

```typescript
// Light Theme
primary: '#33b9f7'      // Main brand color
accent: '#ff5066'       // Accent/highlight color
background: '#f5f5f5'   // Page background
cardBackground: '#ffffff'
success: '#4caf50'      // Success states
warning: '#ff9800'      // Warning states
error: '#f44336'        // Error states

// Dark Theme
primary: '#33b9f7'      // Consistent across themes
background: '#121212'
cardBackground: '#1e1e1e'
```

### Typography

Using system fonts with consistent sizing scale:
- `$1` - 11px (tiny)
- `$2` - 12px (small)
- `$3` - 13px (body small)
- `$4` - 14px (body)
- `$5` - 16px (subtitle)
- `$6` - 18px (title)
- `$7` - 20px (heading)
- `$8` - 24px (large heading)
- `$9` - 32px (display)

### Spacing Scale

```typescript
$1: 4px
$2: 8px
$3: 12px
$4: 16px
$5: 20px
$6: 24px
$7: 28px
$8: 32px
$9: 36px
$10: 40px
```

### Border Radius

```typescript
$1: 3px
$2: 6px
$3: 9px
$4: 12px
$5: 16px
$6: 20px
```

## Component API

### Button

```tsx
import { Button } from '@/components/ui';

<Button
  variant="primary" | "secondary" | "ghost" | "danger"
  size="sm" | "md" | "lg" | "icon"
  loading={boolean}
  disabled={boolean}
  onPress={() => void}
>
  <Text>Click me</Text>
</Button>
```

### Input

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  placeholder="Enter email"
  value={string}
  onChangeText={(text) => void}
  error="Error message"
  required={boolean}
  leftIcon={<Icon />}
  rightIcon={<Icon />}
  secureTextEntry={boolean}
  keyboardType="default" | "email-address" | "numeric" | "phone-pad"
  multiline={boolean}
/>
```

### Card

```tsx
import { Card } from '@/components/ui';

<Card
  pressable={boolean}
  onPress={() => void}
  padding="$3" | "$4" | custom
>
  {children}
</Card>
```

### Modal

```tsx
import { Modal, ConfirmModal } from '@/components/ui';

// Basic Modal
<Modal
  visible={boolean}
  onClose={() => void}
  title="Modal Title"
>
  {children}
</Modal>

// Confirm Dialog
<ConfirmModal
  visible={boolean}
  onClose={() => void}
  onConfirm={() => void}
  title="Confirm Action"
  message="Are you sure?"
  confirmText="Confirm"
  confirmVariant="primary" | "danger"
/>
```

## State Management

### Zustand Stores

#### Auth Store
```typescript
const { user, token, isAuthenticated, login, logout, setUser } = useAuthStore();
```

#### Settings Store
```typescript
const { settings, setDarkMode, setCurrency, setLanguage, setTax } = useSettingsStore();

// Settings shape:
interface Settings {
  language: string;
  currency: string;
  tax: number;
  darkMode: boolean;
  connectedPrinter: string | null;
}
```

#### Cart Store
```typescript
const {
  items,
  customer,
  coupon,
  addItem,
  removeItem,
  updateQuantity,
  setCustomer,
  setCoupon,
  clearCart,
  getSubTotal,
  getDiscount,
  getTax,
  getTotal,
} = useCartStore();
```

#### Sync Store
```typescript
const { queue, isOnline, isSyncing, addToQueue, removeFromQueue } = useSyncStore();
```

### React Query Hooks

All feature hooks follow consistent patterns:

```typescript
// List queries
const { data, isLoading, error } = useProducts(params);
const { data, fetchNextPage, hasNextPage } = useInfiniteProducts(params);

// Single item queries
const { data } = useProduct(id);

// Mutations
const { mutate, isPending } = useCreateProduct();
const { mutate } = useUpdateProduct();
const { mutate } = useDeleteProduct();
```

## Navigation Structure

```
RootNavigator
├── AuthNavigator (unauthenticated)
│   ├── Login
│   ├── Register
│   └── ForgotPassword
│
└── MainNavigator (authenticated)
    └── TabNavigator
        ├── Dashboard Tab
        │   └── DashboardScreen
        │
        ├── POS Tab
        │   └── POSScreen
        │
        ├── Products Tab
        │   └── ProductsStack
        │       ├── ProductList
        │       ├── AddProduct
        │       ├── ProductDetail
        │       └── EditProduct
        │
        ├── Orders Tab
        │   └── OrdersStack
        │       ├── OrderList
        │       └── OrderDetail
        │
        └── More Tab
            └── MoreStack
                ├── MoreMenu
                ├── Coupons → AddCoupon, EditCoupon
                ├── Customers → AddCustomer, CustomerDetail, EditCustomer
                ├── Categories → AddCategory, EditCategory
                ├── Reports
                ├── Settings → Staff, AddStaff, EditStaff, Printers
                └── Profile → EditProfile, ChangePassword
```

## Offline Support

### How It Works

1. **Network Detection**: App monitors online/offline status
2. **Local IDs**: Offline-created entities use `local-{uuid}` IDs
3. **Sync Queue**: Operations are queued when offline
4. **Auto-Sync**: Queue processes automatically when online
5. **ID Resolution**: Local IDs mapped to server IDs after sync

### Queue Structure

```typescript
interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'product' | 'order' | 'category' | 'customer' | 'coupon';
  data: any;
  localId?: string;
  timestamp: number;
}
```

## Platform-Specific Features

### Printing

| Platform | Implementation |
|----------|---------------|
| iOS/Android | Bluetooth ESC/POS printer |
| Web | Browser print dialog |

```typescript
import { printerService } from '@/services/printer';

// Scan for printers (mobile only)
const devices = await printerService.scan();

// Connect to printer
await printerService.connect(device);

// Print receipt
await printerService.printReceipt(receiptData);
```

### Responsive Layout

```typescript
import { usePlatform } from '@/hooks';

const { isWeb, isTablet, isMobile, screenWidth } = usePlatform();

// Use for conditional layouts
{isTablet ? <SidebarLayout /> : <TabLayout />}
```

## Critical Business Logic

### Order Calculation (Preserved from Original)

```typescript
// Subtotal with rounding
const subTotal = Math.round(
  items.reduce((sum, item) =>
    sum + item.product.sellingPrice * item.quantity, 0
  ) * 10
) / 10;

// Discount calculation
const discount = coupon
  ? coupon.type === 'percentage'
    ? Math.round((subTotal * coupon.amount) / 100)
    : coupon.amount
  : 0;

// Tax calculation
const tax = taxRate > 0
  ? Math.round(taxRate * subTotal) / 100
  : 0;

// Total with rounding
const total = Math.round((subTotal - discount + tax) * 10) / 10;
```

## Environment Variables

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_APP_NAME=POS Universal
EXPO_PUBLIC_APP_VERSION=2.0.0
```

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npx expo start --ios
npx expo start --android
npx expo start --web

# Build for production
npx expo build:ios
npx expo build:android
npx expo export:web
```

## Type Safety

All navigation is fully typed:

```typescript
// Navigation props are auto-completed
navigation.navigate('ProductDetail', { id: '123' }); // ✓
navigation.navigate('ProductDetail'); // ✗ Error: missing required param
```

Route parameters are type-safe:

```typescript
const { id } = route.params; // TypeScript knows `id` is string
```

## Form Validation

Using Zod schemas with React Hook Form:

```typescript
const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  price: z.string().refine(v => !isNaN(parseFloat(v)), 'Invalid price'),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Error Handling

- API errors are caught by Axios interceptors
- 401 errors trigger automatic logout
- Network errors queue operations for offline sync
- Form errors display inline with input fields

## Performance Optimizations

1. **React Query Caching**: Server data cached with configurable stale time
2. **Infinite Queries**: Paginated lists load incrementally
3. **Zustand Persistence**: State persisted to AsyncStorage
4. **Optimistic Updates**: UI updates before server confirmation
5. **Memoization**: Heavy computations in cart store are memoized
