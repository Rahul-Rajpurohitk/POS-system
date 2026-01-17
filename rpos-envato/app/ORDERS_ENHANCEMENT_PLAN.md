# Phase 11: Orders Management Enhancement Plan

## Executive Summary

This comprehensive plan transforms the Orders page from a basic list view into an enterprise-grade order management system with best-in-class UI/UX. The enhancement focuses on operational efficiency, real-time updates, and a delightful user experience.

---

## Current State Analysis

### Existing Features
- Basic order list with pagination
- Simple search by order number/customer
- Stats cards (Today, Revenue, Completed, Pending)
- View order details
- Basic status display

### Pain Points Identified
1. Limited filtering capabilities
2. No advanced search
3. Basic order detail view
4. No order editing after creation
5. Print functionality is a stub
6. No real-time updates
7. Limited status management
8. No bulk operations
9. Basic mobile experience

---

## UI/UX Vision: World-Class Order Management

### Design Philosophy
- **Clarity First**: Information hierarchy that highlights what matters
- **Speed Optimized**: Quick actions, keyboard shortcuts, minimal clicks
- **Real-Time**: Live updates without manual refresh
- **Responsive Excellence**: Desktop power meets mobile convenience
- **Delight in Details**: Micro-interactions, smooth animations, haptic feedback

---

## Part 1: UI Component Overhaul

### 1.1 Enhanced Header Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    Orders Management                    🔔 3   👤   ⚙️  ...    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 📊 Today │ │ 💰 Revenue│ │ ✅ Done  │ │ ⏳ Pending│ │ 🔄 Active│      │
│  │   47     │ │  $4,892  │ │   38     │ │    6     │ │    3     │      │
│  │ +12% ↑   │ │ +8% ↑    │ │ 95%      │ │ avg 4min │ │ now      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Stats Cards Features:**
- Animated counters on value change
- Trend indicators (up/down arrows with percentage)
- Click to filter by that stat
- Color-coded backgrounds matching status
- Pulsing indicator for real-time active orders
- Comparison with previous period (yesterday, last week)

### 1.2 Advanced Search & Filter Bar

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔍 Search orders, customers, items...           [⌘K]                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Status: [All ▼]  Date: [Today ▼]  Payment: [All ▼]  Amount: [Any ▼]   │
│                                                                          │
│  Active Filters: ┌────────┐ ┌──────────────┐ ┌─────────┐               │
│                  │Pending ×│ │Today (Jan 16)×│ │Cash ×   │  Clear All   │
│                  └────────┘ └──────────────┘ └─────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Search Features:**
- **Omni-search**: Order #, customer name, phone, item names
- **Spotlight-style popup** (⌘K / Ctrl+K) for power users
- **Recent searches** dropdown
- **Saved filters** as presets
- **Voice search** support (mobile)

**Filter Options:**
| Filter | Options |
|--------|---------|
| Status | All, Pending, Processing, Completed, Cancelled, Refunded, On Hold |
| Date | Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Custom Range |
| Payment | All, Cash, Card, Digital Wallet, Split Payment |
| Amount | Any, Under $25, $25-$50, $50-$100, Over $100, Custom Range |
| Customer | All, Registered, Guest, Specific Customer |
| Source | All, POS, Online, Phone, Walk-in |

### 1.3 Order List - Card View (Mobile)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  #1024                                              ⏰ 3 min ago        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  👤 John Smith                    ┌──────────┐                   │   │
│  │  📱 (555) 123-4567               │ PENDING  │                   │   │
│  │  ────────────────────────────────└──────────┘                   │   │
│  │  🛒 3 items                                                      │   │
│  │     • Cappuccino (x2)                                           │   │
│  │     • Croissant (x1)                                            │   │
│  │  ────────────────────────────────────────────────────────────   │   │
│  │  💳 Card Payment                              Total: $18.50      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ 📄 View  │  │ ✏️ Edit  │  │ 🖨️ Print │  │ ••• More │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Card Features:**
- **Swipe Actions**: Left for quick actions, Right for status change
- **Long Press**: Context menu with all actions
- **Status Pill**: Color-coded with subtle animation
- **Time Display**: Relative time (3 min ago) with tooltip for exact time
- **Item Preview**: First 2-3 items visible, "+X more" indicator
- **Visual Payment Method**: Icon + text

### 1.4 Order List - Table View (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ □ │ Order #    │ Customer        │ Items      │ Total    │ Payment │ Status    │ Time     │ Actions │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ □ │ #1024      │ 👤 John Smith   │ 🛒 3 items │ $18.50   │ 💳 Card │ ● Pending │ 3:42 PM  │ ••• │
│   │            │    (555)123-4567│ Cappuccino │          │         │           │          │     │
├───┼────────────┼─────────────────┼────────────┼──────────┼─────────┼───────────┼──────────┼─────┤
│ □ │ #1023      │ 👤 Guest        │ 🛒 5 items │ $45.00   │ 💵 Cash │ ✓ Done    │ 3:38 PM  │ ••• │
│   │            │                 │ Coffee,... │          │         │           │          │     │
├───┼────────────┼─────────────────┼────────────┼──────────┼─────────┼───────────┼──────────┼─────┤
│ ☑ │ #1022      │ 👤 Sarah Lee    │ 🛒 2 items │ $12.75   │ 📱 Apple│ ✓ Done    │ 3:35 PM  │ ••• │
│   │            │    Loyalty: Gold│ Latte (x2) │          │   Pay   │           │          │     │
└───────────────────────────────────────────────────────────────────────────────────────┘
│ ☑ 1 selected                               [Mark Complete] [Print] [Export] [Delete]   │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Table Features:**
- **Bulk Selection**: Checkbox column with "Select All"
- **Sortable Columns**: Click header to sort, visual indicator
- **Resizable Columns**: Drag border to resize
- **Column Visibility**: Toggle columns on/off
- **Row Hover**: Highlight + quick action icons
- **Inline Editing**: Double-click to edit (where applicable)
- **Expandable Rows**: Click to expand item details
- **Sticky Header**: Fixed when scrolling
- **Bulk Actions Bar**: Appears when items selected

### 1.5 Order Detail Drawer/Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Order #1024                                              [×] Close     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STATUS TIMELINE                                                 │   │
│  │  ○────────●────────○────────○                                   │   │
│  │  Created  Pending  Process  Complete                             │   │
│  │  3:40 PM  3:42 PM                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────┐               │
│  │ 👤 CUSTOMER            │  │ 💳 PAYMENT             │               │
│  │ ───────────────────    │  │ ───────────────────    │               │
│  │ John Smith             │  │ Card (Visa •••• 4242)  │               │
│  │ john@email.com         │  │ Transaction: txn_xxx   │               │
│  │ (555) 123-4567         │  │ Status: Authorized     │               │
│  │ 🏆 Gold Member (450 pts)│  │ [Capture] [Refund]     │               │
│  │ [View Profile]         │  │                        │               │
│  └────────────────────────┘  └────────────────────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🛒 ORDER ITEMS                                              [+]  │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │  ┌────┐                                                         │   │
│  │  │ ☕ │  Cappuccino               x2        $4.50    $9.00      │   │
│  │  └────┘  Size: Large, Extra Shot                     [Edit][×]  │   │
│  │  ┌────┐                                                         │   │
│  │  │ 🥐 │  Butter Croissant        x1        $3.50    $3.50      │   │
│  │  └────┘  Warm                                        [Edit][×]  │   │
│  │                                                                  │   │
│  │  [+ Add Item]                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 💰 PAYMENT SUMMARY                                              │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │    Subtotal                                          $12.50     │   │
│  │    Discount (SAVE10)                                 -$1.25     │   │
│  │    Tax (8%)                                           $0.90     │   │
│  │    ─────────────────────────────────────────────────────────    │   │
│  │    TOTAL                                             $12.15     │   │
│  │                                                                  │   │
│  │    Amount Paid                                       $20.00     │   │
│  │    Change Due                                         $7.85     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📋 ORDER NOTES                                                   │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │  "Customer requested extra napkins"                              │   │
│  │  Added by: Alex (Cashier) at 3:42 PM                            │   │
│  │                                                                  │   │
│  │  [+ Add Note]                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📜 ACTIVITY LOG                                          [More]  │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │  3:42 PM  Status changed to Pending           Alex (Cashier)    │   │
│  │  3:40 PM  Order created                       Alex (Cashier)    │   │
│  │  3:40 PM  Payment authorized (Card)           System            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [🖨️ Print Receipt]  [📧 Email]  [📱 SMS]           [Complete Order]   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.6 Quick Actions Floating Button (Mobile)

```
        ┌─────────┐
        │ + New   │ ← New Order
        └─────────┘
    ┌─────────┐
    │ 🔍 Find │ ← Quick Search
    └─────────┘
┌─────────┐
│ 📊 Stats│ ← Quick Stats
└─────────┘
    ┌───┐
    │ + │ ← FAB (Floating Action Button)
    └───┘
```

---

## Part 2: Feature Specifications

### 2.1 Order Status Workflow

```
                    ┌─────────────┐
                    │   DRAFT     │ (In Cart)
                    └──────┬──────┘
                           │ Submit
                           ▼
                    ┌─────────────┐
          ┌────────│   PENDING   │────────┐
          │        └──────┬──────┘        │
          │ Cancel        │ Process       │ On Hold
          ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  CANCELLED  │ │ PROCESSING  │ │  ON HOLD    │
    └─────────────┘ └──────┬──────┘ └──────┬──────┘
                           │               │
                           │ Complete      │ Resume
                           ▼               │
                    ┌─────────────┐        │
                    │  COMPLETED  │◀───────┘
                    └──────┬──────┘
                           │ Refund (Full/Partial)
                           ▼
                    ┌─────────────┐
                    │  REFUNDED   │
                    └─────────────┘
```

**Status Definitions:**
| Status | Description | Actions Available |
|--------|-------------|-------------------|
| Draft | Items in cart, not submitted | Submit, Abandon |
| Pending | Order placed, awaiting action | Process, Cancel, Hold |
| Processing | Being prepared | Complete, Cancel |
| Completed | Fulfilled | Refund |
| Cancelled | Cancelled before completion | - |
| On Hold | Temporarily paused | Resume, Cancel |
| Refunded | Full or partial refund issued | - |

### 2.2 Order Editing Capabilities

**Editable Fields (by Status):**

| Field | Draft | Pending | Processing | Completed |
|-------|-------|---------|------------|-----------|
| Add Items | ✅ | ✅ | ✅* | ❌ |
| Remove Items | ✅ | ✅ | ✅* | ❌ |
| Change Qty | ✅ | ✅ | ✅* | ❌ |
| Apply Coupon | ✅ | ✅ | ❌ | ❌ |
| Change Customer | ✅ | ✅ | ❌ | ❌ |
| Add Notes | ✅ | ✅ | ✅ | ✅ |
| Change Payment | ✅ | ⚠️** | ❌ | ❌ |

*Requires manager approval
**Only if payment not captured

### 2.3 Payment Management

**Payment Methods Supported:**
- 💵 Cash (with change calculation)
- 💳 Credit/Debit Card
- 📱 Apple Pay / Google Pay
- 🔗 Payment Link
- 💸 Gift Card
- 🏆 Loyalty Points
- 🔀 Split Payment (multiple methods)

**Split Payment UI:**
```
┌─────────────────────────────────────────────────────────┐
│  SPLIT PAYMENT                               Total: $50  │
├─────────────────────────────────────────────────────────┤
│  Payment 1: 💳 Card                          $30.00     │
│  Payment 2: 💵 Cash                          $20.00     │
│                                              ─────────   │
│  Total Covered:                              $50.00 ✓   │
│                                                          │
│  [+ Add Payment Method]                                  │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Refund Processing

**Refund Types:**
1. **Full Refund**: Entire order amount
2. **Partial Refund**: Specific items or custom amount
3. **Store Credit**: Refund to customer balance

**Refund UI:**
```
┌─────────────────────────────────────────────────────────┐
│  PROCESS REFUND                          Order #1024    │
├─────────────────────────────────────────────────────────┤
│  Refund Type: ○ Full  ● Partial  ○ Store Credit        │
│                                                          │
│  Select items to refund:                                │
│  ☑ Cappuccino (x2)                 $9.00               │
│  ☐ Butter Croissant (x1)           $3.50               │
│                                                          │
│  Refund Amount:                    $9.00                │
│  Refund To: Original Payment (Card)                     │
│                                                          │
│  Reason: [Customer Request ▼]                           │
│  Notes: [________________________________]              │
│                                                          │
│  [Cancel]                           [Process Refund]    │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Printing System

**Print Options:**
1. **Receipt**: Customer-facing receipt
2. **Kitchen Ticket**: For kitchen/prep area
3. **Order Summary**: Internal record
4. **Invoice**: Formal invoice with tax details
5. **Packing Slip**: For delivery orders

**Print Configuration:**
- Printer selection (multiple printer support)
- Auto-print rules (e.g., auto-print kitchen ticket)
- Template customization
- Logo and footer settings
- Receipt width (58mm / 80mm)

### 2.6 Real-Time Updates

**WebSocket Events:**
```typescript
// Events to subscribe to
'order:created'     // New order notification
'order:updated'     // Order modified
'order:status'      // Status change
'order:payment'     // Payment update
'order:refund'      // Refund processed
'stats:updated'     // Stats refresh
```

**UI Indicators:**
- 🔴 Live pulse on new orders
- 🔔 Sound notification (configurable)
- 📳 Vibration (mobile)
- Toast notification with quick actions
- Badge count on tab/icon

### 2.7 Bulk Operations

**Available Bulk Actions:**
| Action | Description | Permission Required |
|--------|-------------|---------------------|
| Mark Complete | Complete multiple orders | Cashier |
| Print | Batch print receipts | Cashier |
| Export | Export to CSV/PDF | Manager |
| Cancel | Cancel multiple orders | Manager |
| Assign | Assign to staff member | Manager |
| Delete | Delete orders | Admin |

### 2.8 Export & Reporting

**Export Formats:**
- CSV (spreadsheet compatible)
- PDF (formatted report)
- Excel (XLSX with formatting)
- JSON (API/integration use)

**Report Templates:**
1. **Daily Sales Report**: Today's orders summary
2. **Payment Reconciliation**: By payment method
3. **Staff Performance**: Orders by employee
4. **Customer Orders**: Individual customer history
5. **Tax Report**: Tax collected breakdown
6. **Refund Report**: All refunds with reasons

---

## Part 3: Technical Architecture

### 3.1 Frontend Files to Create/Modify

**New Components:**
```
app/src/components/order/
├── OrderListCard.tsx           # Mobile card view
├── OrderListTable.tsx          # Desktop table view
├── OrderDetailDrawer.tsx       # Slide-out detail view
├── OrderStatusTimeline.tsx     # Visual status progress
├── OrderItemEditor.tsx         # Edit items in order
├── OrderPaymentSection.tsx     # Payment details & actions
├── OrderNotesSection.tsx       # Notes with activity log
├── OrderActionsBar.tsx         # Action buttons
├── OrderSearchBar.tsx          # Enhanced search
├── OrderFilterPanel.tsx        # Advanced filters
├── OrderBulkActions.tsx        # Bulk selection actions
├── OrderPrintPreview.tsx       # Print preview modal
├── RefundModal.tsx             # Refund processing
├── SplitPaymentModal.tsx       # Split payment UI
├── OrderStatsCards.tsx         # Enhanced stats display
├── OrderQuickView.tsx          # Hover preview popup
├── OrderStatusBadge.tsx        # Status indicator
├── OrderTimeDisplay.tsx        # Relative time with tooltip
└── index.ts                    # Exports
```

**New Screens:**
```
app/src/screens/orders/
├── OrderListScreen.tsx         # Enhanced list (MODIFY)
├── OrderDetailScreen.tsx       # Enhanced detail (MODIFY)
├── OrderEditScreen.tsx         # NEW: Edit order
├── OrderReportsScreen.tsx      # NEW: Reports dashboard
└── index.ts
```

**New Hooks:**
```
app/src/features/orders/
├── hooks/
│   ├── useOrderFilters.ts      # Filter state management
│   ├── useOrderSearch.ts       # Search with debounce
│   ├── useOrderRealtime.ts     # WebSocket subscription
│   ├── useOrderPrint.ts        # Print functionality
│   ├── useOrderExport.ts       # Export functionality
│   ├── useOrderBulk.ts         # Bulk operations
│   └── index.ts
├── api.ts                      # MODIFY: Add new endpoints
├── types.ts                    # MODIFY: Add new types
└── hooks.ts                    # MODIFY: Enhance existing
```

### 3.2 Backend Files to Create/Modify

**New/Modified Files:**
```
server/src/
├── services/
│   ├── order.service.ts            # MODIFY: Add features
│   ├── order-export.service.ts     # NEW: Export logic
│   ├── order-print.service.ts      # NEW: Print formatting
│   └── order-realtime.service.ts   # NEW: WebSocket events
├── controllers/
│   └── orders.controller.ts        # MODIFY: New endpoints
├── routes/
│   └── orders.routes.ts            # MODIFY: New routes
└── types/
    └── order.types.ts              # NEW: Enhanced types
```

**New API Endpoints:**
```
GET    /orders/export             # Export orders (CSV/PDF/Excel)
GET    /orders/:id/print/:type    # Get print-formatted data
POST   /orders/:id/notes          # Add order note
GET    /orders/:id/timeline       # Get order activity timeline
PUT    /orders/:id/items          # Update order items
POST   /orders/:id/split-payment  # Process split payment
PUT    /orders/bulk/status        # Bulk status update
DELETE /orders/bulk               # Bulk delete
GET    /orders/reports/:type      # Get report data
```

### 3.3 State Management

**Order List State:**
```typescript
interface OrderListState {
  // View preferences
  viewMode: 'card' | 'table';
  visibleColumns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Filters
  filters: {
    status: OrderStatus[];
    dateRange: { start: Date; end: Date };
    paymentMethod: PaymentMethod[];
    amountRange: { min: number; max: number };
    customerId: string | null;
    source: OrderSource[];
  };

  // Search
  searchQuery: string;
  savedFilters: SavedFilter[];

  // Selection
  selectedOrders: string[];

  // Real-time
  isConnected: boolean;
  pendingUpdates: OrderUpdate[];
}
```

### 3.4 Performance Optimizations

1. **Virtualized List**: Use `@shopify/flash-list` for large lists
2. **Pagination**: Server-side with cursor-based pagination
3. **Caching**: React Query with smart invalidation
4. **Memoization**: Heavy components with `React.memo`
5. **Lazy Loading**: Code split order detail components
6. **Image Optimization**: Product thumbnails with lazy load
7. **Debounced Search**: 300ms debounce on search input
8. **Optimistic Updates**: Instant UI feedback

---

## Part 4: Detailed Component Specifications

### 4.1 OrderStatsCards Component

```typescript
interface OrderStatsCardsProps {
  onStatClick: (statType: StatType) => void;
  period: 'today' | 'week' | 'month';
  onPeriodChange: (period: string) => void;
}

interface StatCard {
  id: StatType;
  icon: IconName;
  label: string;
  value: number | string;
  trend: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  color: string;
  subtext?: string;
}

const STAT_CARDS: StatCard[] = [
  {
    id: 'today',
    icon: 'Calendar',
    label: "Today's Orders",
    color: '#3B82F6', // blue
  },
  {
    id: 'revenue',
    icon: 'DollarSign',
    label: 'Revenue',
    color: '#10B981', // green
  },
  {
    id: 'completed',
    icon: 'CheckCircle',
    label: 'Completed',
    color: '#059669', // emerald
  },
  {
    id: 'pending',
    icon: 'Clock',
    label: 'Pending',
    color: '#F59E0B', // amber
  },
  {
    id: 'active',
    icon: 'Zap',
    label: 'Active Now',
    color: '#8B5CF6', // purple
  },
];
```

**Features:**
- Animated number counters (count up animation)
- Trend arrows with color coding
- Click to filter list by stat
- Period selector (Today/Week/Month)
- Real-time updates with pulse animation
- Responsive grid layout

### 4.2 OrderSearchBar Component

```typescript
interface OrderSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  recentSearches: string[];
  onClearRecent: () => void;
  placeholder?: string;
}

// Features:
// - Spotlight-style popup on focus (desktop)
// - Voice search button (mobile)
// - Recent searches dropdown
// - Keyboard shortcut hint (⌘K)
// - Clear button
// - Loading indicator during search
// - Auto-complete suggestions
```

### 4.3 OrderFilterPanel Component

```typescript
interface OrderFilterPanelProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  savedFilters: SavedFilter[];
  onSaveFilter: (name: string) => void;
  onLoadFilter: (filter: SavedFilter) => void;
  onClearAll: () => void;
}

interface OrderFilters {
  status: OrderStatus[];
  dateRange: DateRange;
  paymentMethod: PaymentMethod[];
  amountRange: AmountRange;
  customerId: string | null;
  source: OrderSource[];
  hasNotes: boolean | null;
  hasRefund: boolean | null;
}

// Collapsible filter sections
// Multi-select chips for enum values
// Date picker for date range
// Slider for amount range
// Customer autocomplete
// Save/load filter presets
// Active filter chips with remove
// "Clear All" button
```

### 4.4 OrderDetailDrawer Component

```typescript
interface OrderDetailDrawerProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (status: OrderStatus) => void;
  onEdit: () => void;
  onPrint: (type: PrintType) => void;
  onRefund: () => void;
}

// Sections:
// 1. Header with order # and status
// 2. Status timeline (visual progress)
// 3. Customer info card
// 4. Payment info card
// 5. Items list (collapsible)
// 6. Payment summary
// 7. Notes section
// 8. Activity log (collapsible)
// 9. Action buttons footer
```

### 4.5 OrderStatusTimeline Component

```typescript
interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  history: StatusHistoryEntry[];
  compact?: boolean;
}

interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  user: string;
  note?: string;
}

// Visual progress indicator
// Completed steps filled
// Current step highlighted
// Future steps grayed
// Timestamps below each step
// Click to expand full history
```

### 4.6 RefundModal Component

```typescript
interface RefundModalProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onRefund: (refundData: RefundRequest) => Promise<void>;
}

interface RefundRequest {
  type: 'full' | 'partial' | 'store_credit';
  items?: { itemId: string; quantity: number }[];
  customAmount?: number;
  reason: RefundReason;
  notes?: string;
  refundTo: 'original' | 'store_credit' | 'cash';
}

// Refund type selection
// Item selection for partial refund
// Amount display
// Reason dropdown (required)
// Notes field
// Refund destination selection
// Confirmation with summary
```

---

## Part 5: UI/UX Polish Details

### 5.1 Animations & Micro-interactions

| Element | Animation | Duration |
|---------|-----------|----------|
| Stats counter | Count up | 800ms ease-out |
| Card appear | Fade + slide up | 200ms |
| Status change | Pulse + color transition | 400ms |
| Filter chip | Scale on add/remove | 150ms |
| Drawer | Slide from right | 300ms spring |
| Button press | Scale down 0.95 | 100ms |
| Row hover | Background fade | 150ms |
| Toast | Slide down + fade | 200ms |
| Bulk action bar | Slide up | 250ms |
| Loading skeleton | Shimmer | infinite |

### 5.2 Color Palette

```css
/* Status Colors */
--status-pending: #F59E0B;      /* Amber */
--status-processing: #3B82F6;   /* Blue */
--status-completed: #10B981;    /* Emerald */
--status-cancelled: #EF4444;    /* Red */
--status-refunded: #8B5CF6;     /* Purple */
--status-on-hold: #6B7280;      /* Gray */

/* Payment Method Colors */
--payment-cash: #22C55E;        /* Green */
--payment-card: #3B82F6;        /* Blue */
--payment-digital: #8B5CF6;     /* Purple */

/* Accent Colors */
--accent-primary: #8B5CF6;      /* Purple - brand */
--accent-success: #10B981;      /* Green */
--accent-warning: #F59E0B;      /* Amber */
--accent-error: #EF4444;        /* Red */
--accent-info: #3B82F6;         /* Blue */
```

### 5.3 Typography Hierarchy

| Element | Font Size | Weight | Line Height |
|---------|-----------|--------|-------------|
| Page Title | 28px | Bold | 1.2 |
| Section Title | 18px | SemiBold | 1.3 |
| Card Title | 16px | SemiBold | 1.4 |
| Body Text | 14px | Regular | 1.5 |
| Small Text | 12px | Regular | 1.4 |
| Table Header | 12px | SemiBold | 1.3 |
| Badge Text | 11px | Medium | 1.2 |

### 5.4 Spacing System

```
Base unit: 4px

xs: 4px   (0.25rem)
sm: 8px   (0.5rem)
md: 16px  (1rem)
lg: 24px  (1.5rem)
xl: 32px  (2rem)
2xl: 48px (3rem)
```

### 5.5 Shadows & Elevation

```css
/* Elevation levels */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);

/* Usage */
Card: shadow-md
Dropdown: shadow-lg
Modal: shadow-xl
Floating button: shadow-lg
```

### 5.6 Responsive Breakpoints

```typescript
const breakpoints = {
  sm: 640,   // Mobile landscape
  md: 768,   // Tablet portrait
  lg: 1024,  // Tablet landscape / small desktop
  xl: 1280,  // Desktop
  '2xl': 1536, // Large desktop
};

// View mode by breakpoint
// < md: Card view only
// >= md: Card or Table (user choice)
// >= lg: Table default
```

---

## Part 6: Implementation Phases

### Phase 11.1: Foundation (Week 1)
- [ ] Create enhanced OrderStatsCards component
- [ ] Create OrderStatusBadge with animations
- [ ] Create OrderSearchBar with debounce
- [ ] Create OrderFilterPanel with all filters
- [ ] Implement filter state management
- [ ] Add WebSocket subscription for real-time

### Phase 11.2: List Views (Week 2)
- [ ] Create OrderListCard for mobile
- [ ] Create OrderListTable for desktop
- [ ] Implement view mode toggle
- [ ] Add bulk selection functionality
- [ ] Create OrderBulkActions component
- [ ] Implement sorting and column management

### Phase 11.3: Order Detail (Week 3)
- [ ] Create OrderDetailDrawer
- [ ] Create OrderStatusTimeline
- [ ] Create OrderItemEditor
- [ ] Create OrderPaymentSection
- [ ] Create OrderNotesSection
- [ ] Implement order editing API

### Phase 11.4: Advanced Features (Week 4)
- [ ] Create RefundModal with partial refund
- [ ] Create SplitPaymentModal
- [ ] Implement print functionality
- [ ] Create OrderPrintPreview
- [ ] Implement export functionality
- [ ] Create OrderReportsScreen

### Phase 11.5: Polish & Testing (Week 5)
- [ ] Add all animations and transitions
- [ ] Implement accessibility features
- [ ] Write unit tests for all components
- [ ] Write integration tests
- [ ] Performance optimization
- [ ] Documentation

---

## Part 7: Testing Strategy

### Unit Tests (Target: 100+ tests)

**Components to Test:**
| Component | Test Count | Focus Areas |
|-----------|------------|-------------|
| OrderStatsCards | 12 | Rendering, clicks, animations |
| OrderSearchBar | 10 | Input, debounce, shortcuts |
| OrderFilterPanel | 15 | Filter changes, presets, clear |
| OrderListCard | 10 | Rendering, actions, swipe |
| OrderListTable | 15 | Columns, sorting, selection |
| OrderDetailDrawer | 18 | Sections, editing, actions |
| OrderStatusTimeline | 8 | Status display, history |
| RefundModal | 12 | Types, validation, submission |
| OrderBulkActions | 10 | Selection, actions, permissions |

### Integration Tests (Target: 50+ tests)

**Flows to Test:**
1. Search and filter orders
2. View order details
3. Edit order items
4. Change order status
5. Process refund (full/partial)
6. Print receipt
7. Export orders
8. Bulk operations
9. Real-time updates
10. Error handling

---

## Part 8: Accessibility Requirements

### WCAG 2.1 AA Compliance

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Color contrast ratio 4.5:1 minimum
- [ ] Screen reader announcements for status changes
- [ ] ARIA labels on all icons
- [ ] Skip navigation links
- [ ] Reduced motion mode support
- [ ] Text resize support up to 200%
- [ ] Touch targets 44x44px minimum

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘K / Ctrl+K | Open search |
| ⌘F / Ctrl+F | Focus filter |
| Esc | Close modal/drawer |
| ↑/↓ | Navigate list |
| Enter | Select/Open |
| Space | Toggle checkbox |
| ⌘P / Ctrl+P | Print |
| ⌘E / Ctrl+E | Export |

---

## Part 9: Metrics & Success Criteria

### Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 1.5s |
| Search response | < 300ms |
| Filter apply | < 200ms |
| Order detail open | < 400ms |
| List scroll | 60 FPS |
| Real-time update | < 100ms |

### User Experience Goals

| Goal | Measurement |
|------|-------------|
| Reduce clicks to complete order | 30% fewer clicks |
| Search time to find order | < 5 seconds |
| Refund processing time | < 30 seconds |
| Mobile task completion | < 15 seconds |

---

## Part 10: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket disconnection | High | Fallback polling, reconnect logic |
| Large order list performance | Medium | Virtual scrolling, pagination |
| Print compatibility | Medium | Multiple format support, preview |
| Browser compatibility | Low | Testing matrix, polyfills |
| Mobile performance | Medium | Lazy loading, optimized renders |

---

## Summary

This enhancement plan transforms the Orders page into a world-class order management system with:

- **5 new screen/modal components**
- **18+ new reusable components**
- **6 new API endpoints**
- **Real-time WebSocket integration**
- **Comprehensive print and export**
- **Full refund management**
- **100+ unit tests, 50+ integration tests**

The result is a feature-rich, performant, and delightful order management experience that rivals enterprise POS systems.

---

*Plan Created: 2026-01-16*
*Phase: 11 - Orders Management Enhancement*
*Estimated Effort: 5 weeks*
