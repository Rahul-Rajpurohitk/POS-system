# Enterprise Analytics Module

A comprehensive business intelligence module for the RPOS system providing real-time dashboards, predictive insights, and advanced analytics.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Frontend Screens](#frontend-screens)
- [Real-time Updates](#real-time-updates)
- [Caching Strategy](#caching-strategy)
- [Key Algorithms](#key-algorithms)
- [Usage Guide](#usage-guide)
- [File Structure](#file-structure)

---

## Overview

The Analytics Module provides enterprise-grade business intelligence capabilities:

- **Real-time Dashboard**: Live KPIs with WebSocket updates
- **Revenue Analytics**: Trends, forecasting, and growth analysis
- **Product Intelligence**: ABC classification (Pareto analysis)
- **Customer Segmentation**: RFM (Recency, Frequency, Monetary) analysis
- **Staff Performance**: Employee productivity metrics
- **Inventory Intelligence**: Reorder predictions and stockout alerts

---

## Features

### 1. Real-time Dashboard
- Live sales metrics updated via WebSocket
- Hourly breakdown charts
- Top products performance
- Payment method distribution
- AI-generated business insights

### 2. Revenue Analytics
- Daily/weekly/monthly trend visualization
- Sales forecasting (14-day prediction)
- Weekday performance analysis
- Month-end revenue projections
- Moving averages (7-day and 30-day)

### 3. Product ABC Classification
- Pareto analysis (80/20 rule)
- Products categorized as A, B, or C class
- Revenue contribution breakdown
- Inventory optimization recommendations

### 4. Customer RFM Segmentation
- **Recency**: Days since last purchase
- **Frequency**: Total order count
- **Monetary**: Lifetime spend value
- 11 customer segments (Champions, Loyal, At Risk, etc.)
- Targeted marketing insights

### 5. Staff Performance
- Sales rankings by employee
- Orders processed per staff
- Performance vs team average
- Top performer highlights

### 6. Inventory Intelligence
- Sales velocity classification (Fast/Normal/Slow/Dead)
- Reorder point calculations
- Days until stockout predictions
- Stock value analysis
- Automated reorder alerts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React Query Hooks → Chart Components → Analytics Screens       │
│         ↓                                                        │
│  useWebSocket → Real-time Updates → Live Dashboard              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                         BACKEND                                  │
│  Routes → Controller → AdvancedAnalyticsService → Cache         │
│                              ↓                                   │
│              RealtimeService → WebSocket Events                  │
│                              ↓                                   │
│                    BullMQ Jobs (scheduled aggregations)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  PostgreSQL (Order, Payment, Customer, Product entities)        │
│  Redis (Cache with TTL + Real-time pub/sub)                     │
│  EODReport (Pre-aggregated daily summaries)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

All endpoints are prefixed with `/api/analytics/v2`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard` | GET | Enhanced dashboard with real-time metrics |
| `/revenue/trends` | GET | Revenue trends with projections |
| `/revenue/forecast` | GET | 14-day sales forecast |
| `/products/abc` | GET | ABC classification analysis |
| `/products/performance` | GET | Product performance metrics |
| `/customers/rfm` | GET | RFM customer segmentation |
| `/customers/cohorts` | GET | Customer cohort analysis |
| `/staff/performance` | GET | Staff performance metrics |
| `/time/peak-hours` | GET | Peak hours analysis |
| `/inventory/intelligence` | GET | Inventory intelligence with reorder alerts |
| `/cache/status` | GET | Cache status information |
| `/cache/invalidate` | POST | Invalidate analytics cache |
| `/cache/warm` | POST | Pre-warm analytics cache |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `this_year` |
| `startDate` | string | Custom date range start (ISO format) |
| `endDate` | string | Custom date range end (ISO format) |
| `refresh` | boolean | Force cache refresh |
| `limit` | number | Limit results (for paginated endpoints) |

### Example Requests

```bash
# Get dashboard for today
curl "http://localhost:3000/api/analytics/v2/dashboard?period=today"

# Get ABC classification
curl "http://localhost:3000/api/analytics/v2/products/abc"

# Get RFM segmentation
curl "http://localhost:3000/api/analytics/v2/customers/rfm"

# Get 14-day forecast
curl "http://localhost:3000/api/analytics/v2/revenue/forecast?days=14"

# Get staff performance for this month
curl "http://localhost:3000/api/analytics/v2/staff/performance?period=this_month"
```

---

## Frontend Screens

### 1. Analytics Dashboard (`AnalyticsDashboardScreen`)
**Path**: More → Analytics

Main hub displaying:
- Real-time KPI cards (Revenue, Orders, Customers, Current Hour)
- Live connection status indicator
- Business insights
- Hourly sales chart
- Top products bar chart
- Payment methods pie chart
- Quick navigation to detailed screens

### 2. Revenue Analytics (`RevenueAnalyticsScreen`)
**Path**: More → Analytics → Revenue

Features:
- Period selector (This Week/Month/Last Month)
- Total revenue, orders, AOV metrics
- Month-end projections
- Daily revenue trend line chart
- Sales by day of week bar chart
- 14-day forecast with confidence bands
- Seasonal pattern identification

### 3. Product Analytics (`ProductAnalyticsScreen`)
**Path**: More → Analytics → Products

Features:
- ABC classification summary cards
- Revenue distribution pie chart
- Top 5 products horizontal bar chart
- Full product list with classification badges
- Classification guide

### 4. Customer Analytics (`CustomerAnalyticsScreen`)
**Path**: More → Analytics → Customers

Features:
- RFM overview statistics
- Retention rate and lifetime value
- Customer segments pie chart
- Revenue by segment bar chart
- Segment cards grouped by priority
- Customer list with RFM scores

### 5. Staff Analytics (`StaffAnalyticsScreen`)
**Path**: More → Analytics → Staff (via navigation)

Features:
- Period selector
- Summary metrics (Total Staff, Total Sales, Avg per Staff)
- Top performer highlight card
- Sales by staff bar chart
- Orders by staff horizontal bar
- Staff rankings list

### 6. Inventory Intelligence (`InventoryIntelligenceScreen`)
**Path**: More → Analytics → Inventory

Features:
- Overview statistics
- Alert cards (Out of Stock, Low Stock, Overstocked, Dead Stock)
- Reorder alerts list
- Sales velocity pie chart
- Stock value bar chart
- Product list with filters
- Velocity legend guide

---

## Real-time Updates

### WebSocket Events

The analytics module uses WebSocket for live updates:

```typescript
// Event types
enum RealtimeEvent {
  ANALYTICS_UPDATE = 'analytics:update',
  ANALYTICS_DASHBOARD_REFRESH = 'analytics:dashboard:refresh',
  ANALYTICS_METRICS_UPDATE = 'analytics:metrics:update',
}
```

### Frontend Hook Usage

```typescript
import { useAnalyticsRealtime } from '@/hooks';

function MyComponent() {
  const { isConnected } = useAnalyticsRealtime({
    onMetricsUpdate: (metrics) => {
      // Handle live metrics update
      console.log('New metrics:', metrics);
    },
    onAnalyticsUpdate: (payload) => {
      // Handle analytics refresh notification
      if (payload.refreshRequired) {
        refetch();
      }
    },
    enabled: true,
  });

  return (
    <View>
      <Text>{isConnected ? 'Live' : 'Offline'}</Text>
    </View>
  );
}
```

### Backend Emission

```typescript
// In order completion handler
realtimeService.emitAnalyticsUpdate(businessId, 'order', {
  todaySales: newTotal,
  todayOrders: newOrderCount,
  currentHourSales: hourSales,
});
```

---

## Caching Strategy

| Data Type | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| Dashboard (today) | 60s | Order completion |
| Dashboard (historical) | 1h | EOD job |
| ABC Classification | 24h | Daily job @ 3AM |
| RFM Segmentation | 24h | Daily job @ 3AM |
| Forecast | 1h | On demand |
| Inventory Intelligence | 30m | Stock update |
| Staff Performance | 5m | Order completion |
| Peak Hours | 24h | Daily job |

### Cache Keys

```
analytics:{businessId}:dashboard:{period}
analytics:{businessId}:abc:{startDate}:{endDate}
analytics:{businessId}:rfm
analytics:{businessId}:forecast:{days}
analytics:{businessId}:peak-hours
analytics:{businessId}:staff:{period}
analytics:{businessId}:inventory
```

---

## Key Algorithms

### ABC Classification (Pareto Analysis)

```
1. Get all products with revenue in period
2. Sort by revenue DESC
3. Calculate cumulative percentage
4. Classify:
   - A: 0-80% cumulative revenue (top ~20% products)
   - B: 80-95% cumulative revenue (next ~30% products)
   - C: 95-100% cumulative revenue (bottom ~50% products)
```

### RFM Segmentation

```
1. Calculate for each customer:
   - Recency: days since last purchase
   - Frequency: total order count
   - Monetary: lifetime spend

2. Score each metric 1-5 (quintiles)

3. Segment mapping:
   - Champions (R=5, F=5, M=5): Best customers
   - Loyal Customers (R=4-5, F=4-5): Consistent buyers
   - Potential Loyalists (R=4-5, F=2-3): Recent, moderate frequency
   - New Customers (R=5, F=1): Just acquired
   - At Risk (R=2, F=4-5): Were loyal, slipping away
   - Lost (R=1, F=1): Haven't purchased in long time
```

### Sales Forecasting

```
1. Get last 90 days of daily sales
2. Calculate 7-day moving average
3. Detect trend via linear regression
4. Project forward 14 days
5. Calculate confidence bands (±1 std dev)
6. Identify seasonal patterns (best/worst days)
```

### Inventory Intelligence

```
1. Calculate average daily sales (last 30 days)
2. Sales velocity = avgDailySales / stock level
   - Fast moving: velocity > 0.1
   - Normal: velocity 0.03-0.1
   - Slow moving: velocity 0.01-0.03
   - Dead stock: velocity < 0.01

3. Days until stockout = currentStock / avgDailySales
4. Reorder point = avgDailySales * leadTime + safetyStock
5. Suggested reorder qty = avgDailySales * reorderPeriod
```

---

## Usage Guide

### Starting the Module

1. **Backend**:
```bash
cd server
npm run dev
```

2. **Frontend**:
```bash
cd app
npx expo start
```

3. **Access Analytics**:
   - Open the app
   - Go to "More" tab
   - Tap "Analytics"

### Testing API Endpoints

```bash
# Ensure server is running on localhost:3000

# Test dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/v2/dashboard?period=today"

# Test ABC classification
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/v2/products/abc"
```

### Warming Cache

For better initial load performance, warm the cache after deployment:

```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/v2/cache/warm"
```

---

## File Structure

### Backend

```
server/src/
├── types/
│   └── analytics.types.ts          # Type definitions
├── services/
│   ├── analytics-advanced.service.ts   # Core calculations
│   └── analytics-cache.service.ts      # Caching layer
├── controllers/
│   └── analytics-advanced.controller.ts
├── routes/
│   └── analytics-advanced.routes.ts    # /api/analytics/v2/*
├── queues/
│   ├── jobs/AnalyticsJob.ts           # Job definitions
│   └── workers/AnalyticsWorker.ts     # Job processors
└── utils/
    └── analytics.utils.ts             # Statistical functions
```

### Frontend

```
app/src/
├── features/analytics/
│   ├── api.ts                     # API client
│   ├── hooks.ts                   # React Query hooks
│   ├── keys.ts                    # Query key factory
│   ├── types.ts                   # Frontend types
│   └── index.ts                   # Barrel export
├── components/charts/
│   ├── ChartWrapper.tsx           # Common wrapper
│   ├── LineChart.tsx              # Revenue trends
│   ├── BarChart.tsx               # Top products
│   ├── PieChart.tsx               # Category breakdown
│   └── index.ts
├── screens/analytics/
│   ├── AnalyticsDashboardScreen.tsx   # Main dashboard
│   ├── RevenueAnalyticsScreen.tsx     # Revenue deep-dive
│   ├── ProductAnalyticsScreen.tsx     # ABC + performance
│   ├── CustomerAnalyticsScreen.tsx    # RFM segments
│   ├── StaffAnalyticsScreen.tsx       # Staff metrics
│   ├── InventoryIntelligenceScreen.tsx # Reorder predictions
│   └── index.ts
└── hooks/
    └── useWebSocket.ts            # Real-time subscription
```

---

## Dependencies

### No New Dependencies Required

**Backend** (existing):
- TypeORM
- ioredis
- BullMQ
- Socket.io

**Frontend** (existing):
- react-native-chart-kit
- @tanstack/react-query
- socket.io-client

---

## Performance Considerations

1. **Caching**: All expensive calculations are cached in Redis
2. **Pagination**: Large datasets support limit/offset
3. **Debouncing**: Real-time updates debounced to prevent flooding
4. **Background Jobs**: Heavy aggregations run in BullMQ workers
5. **Selective Updates**: WebSocket sends only changed metrics

---

## Future Enhancements

- [ ] Export reports to PDF/Excel
- [ ] Custom date range picker
- [ ] Scheduled email reports
- [ ] Comparative analysis (store vs store)
- [ ] Goal tracking and alerts
- [ ] Machine learning predictions

---

## Support

For issues or questions, please open an issue on the GitHub repository.
