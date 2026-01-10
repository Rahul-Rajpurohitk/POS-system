# POS Universal - Screen Documentation

## Screen Inventory (27 Screens)

### Authentication Screens

#### 1. LoginScreen
**Path:** `src/screens/auth/LoginScreen.tsx`
**Route:** `/(auth)/login`

Features:
- Email/password authentication
- Form validation with Zod
- "Remember me" option
- Links to Register and Forgot Password
- Loading state during authentication

#### 2. RegisterScreen
**Path:** `src/screens/auth/RegisterScreen.tsx`
**Route:** `/(auth)/register`

Features:
- Full registration form (name, email, password, confirm password)
- Password strength indication
- Terms acceptance checkbox
- Form validation

#### 3. ForgotPasswordScreen
**Path:** `src/screens/auth/ForgotPasswordScreen.tsx`
**Route:** `/(auth)/forgot-password`

Features:
- Email input for password reset
- Success message display
- Link back to login

---

### Main Screens

#### 4. DashboardScreen
**Path:** `src/screens/main/DashboardScreen.tsx`
**Route:** `/(main)/`

Features:
- Sales statistics cards (Today's Sales, Orders, Average Order, Customers)
- Recent orders list with quick actions
- Quick action buttons (New Sale, Products, Reports)
- Pull-to-refresh

#### 5. POSScreen
**Path:** `src/screens/main/POSScreen.tsx`
**Route:** `/(main)/pos`

Features:
- Product grid with category filtering
- Search products by name/barcode
- Cart sidebar with quantity controls
- Customer selection modal
- Coupon application
- Order totals (subtotal, discount, tax, total)
- Checkout with payment method selection
- Receipt printing

---

### Product Screens

#### 6. ProductListScreen
**Path:** `src/screens/products/ProductListScreen.tsx`
**Route:** `/(main)/products/`

Features:
- Product list with images and prices
- Search and filter by category
- Pull-to-refresh and infinite scroll
- Quick stock indicator
- Navigate to detail/edit

#### 7. AddProductScreen
**Path:** `src/screens/products/AddProductScreen.tsx`
**Route:** `/(main)/products/add`

Features:
- Form fields: name, SKU, description, prices, stock, category
- Image picker
- Barcode scanner integration
- Form validation

#### 8. ProductDetailScreen
**Path:** `src/screens/products/ProductDetailScreen.tsx`
**Route:** `/(main)/products/[id]/`

Features:
- Full product information display
- Stock level indicator
- Edit and delete actions
- Sales statistics for product

#### 9. EditProductScreen
**Path:** `src/screens/products/EditProductScreen.tsx`
**Route:** `/(main)/products/[id]/edit`

Features:
- Pre-populated form with existing data
- Image update capability
- Delete confirmation
- Form validation

---

### Category Screens

#### 10. CategoriesScreen
**Path:** `src/screens/categories/CategoriesScreen.tsx`
**Route:** `/(main)/categories/`

Features:
- Category list with product counts
- Search categories
- Add new category button
- Edit category on tap

#### 11. AddCategoryScreen
**Path:** `src/screens/categories/AddCategoryScreen.tsx`
**Route:** `/(main)/categories/add`

Features:
- Name and description fields
- Image picker
- Form validation

#### 12. EditCategoryScreen
**Path:** `src/screens/categories/EditCategoryScreen.tsx`
**Route:** `/(main)/categories/[id]/edit`

Features:
- Pre-populated form
- Delete with confirmation
- Form validation

---

### Order Screens

#### 13. OrderListScreen
**Path:** `src/screens/orders/OrderListScreen.tsx`
**Route:** `/(main)/orders/`

Features:
- Order list with status badges
- Filter by status and date range
- Search by order number
- Quick view order total
- Infinite scroll pagination

#### 14. OrderDetailScreen
**Path:** `src/screens/orders/OrderDetailScreen.tsx`
**Route:** `/(main)/orders/[id]/`

Features:
- Complete order information
- Item list with quantities and prices
- Customer information (if attached)
- Order totals breakdown
- Reprint receipt action
- Void/refund actions (if applicable)

---

### Customer Screens

#### 15. CustomersScreen
**Path:** `src/screens/customers/CustomersScreen.tsx`
**Route:** `/(main)/customers/`

Features:
- Customer list with contact info
- Search by name/email/phone
- Add new customer button
- View customer details on tap

#### 16. AddCustomerScreen
**Path:** `src/screens/customers/AddCustomerScreen.tsx`
**Route:** `/(main)/customers/add`

Features:
- Form fields: name, email, phone, address
- Form validation with Zod

#### 17. CustomerDetailScreen
**Path:** `src/screens/customers/CustomerDetailScreen.tsx`
**Route:** `/(main)/customers/[id]/`

Features:
- Full customer information
- Purchase history
- Total spent statistics
- Edit and delete actions

#### 18. EditCustomerScreen
**Path:** `src/screens/customers/EditCustomerScreen.tsx`
**Route:** `/(main)/customers/[id]/edit`

Features:
- Pre-populated form
- Form validation

---

### Coupon Screens

#### 19. CouponsScreen
**Path:** `src/screens/coupons/CouponsScreen.tsx`
**Route:** `/(main)/coupons/`

Features:
- Coupon list with codes and discounts
- Expired coupon indication
- Search coupons
- Add new coupon button

#### 20. AddCouponScreen
**Path:** `src/screens/coupons/AddCouponScreen.tsx`
**Route:** `/(main)/coupons/add`

Features:
- Coupon code input
- Discount type toggle (percentage/fixed)
- Amount input
- Expiry date picker
- Form validation

#### 21. EditCouponScreen
**Path:** `src/screens/coupons/EditCouponScreen.tsx`
**Route:** `/(main)/coupons/[id]/edit`

Features:
- Pre-populated form
- Delete with confirmation
- Form validation

---

### Reports Screen

#### 22. ReportsScreen
**Path:** `src/screens/reports/ReportsScreen.tsx`
**Route:** `/(main)/reports`

Features:
- Period selector (Today, Week, Month)
- Statistics cards (Total Sales, Orders, Avg Order, Customers)
- Top products list
- Recent orders summary
- Exportable data (future)

---

### Settings Screens

#### 23. SettingsScreen
**Path:** `src/screens/settings/SettingsScreen.tsx`
**Route:** `/(main)/settings/`

Features:
- Dark mode toggle
- Language selector
- Currency selector
- Tax rate configuration
- Printer settings link
- Staff management link

#### 24. StaffScreen
**Path:** `src/screens/settings/StaffScreen.tsx`
**Route:** `/(main)/settings/staff`

Features:
- Staff member list with roles
- Active/inactive status
- Search staff
- Add new staff button

#### 25. AddStaffScreen
**Path:** `src/screens/settings/AddStaffScreen.tsx`
**Route:** `/(main)/settings/staff/add`

Features:
- Form fields: name, email, password
- Role selector (Admin, Manager, Cashier)
- Form validation

#### 26. EditStaffScreen
**Path:** `src/screens/settings/EditStaffScreen.tsx`
**Route:** `/(main)/settings/staff/[id]/edit`

Features:
- Pre-populated form
- Role change capability
- Active status toggle
- Reset password action
- Delete with confirmation

#### 27. PrintersScreen
**Path:** `src/screens/settings/PrintersScreen.tsx`
**Route:** `/(main)/settings/printers`

Features:
- Connected printer display
- Available printers list (Bluetooth scan)
- Connect/disconnect actions
- Test print functionality
- Web fallback (browser print dialog)

---

### Profile Screens

#### 28. ProfileScreen
**Path:** `src/screens/profile/ProfileScreen.tsx`
**Route:** `/(main)/profile`

Features:
- User avatar and info display
- Account details (email, phone, address)
- Member since date
- Edit profile link
- Change password link
- Logout action

#### 29. EditProfileScreen
**Path:** `src/screens/profile/EditProfileScreen.tsx`
**Route:** `/(main)/profile/edit`

Features:
- Avatar change capability
- Form fields: name, email, phone, address
- Form validation

#### 30. ChangePasswordScreen
**Path:** `src/screens/profile/ChangePasswordScreen.tsx`
**Route:** `/(main)/profile/change-password`

Features:
- Current password verification
- New password with confirmation
- Password visibility toggles
- Password requirements hint
- Form validation

---

### More Menu Screen

#### 31. MoreMenuScreen
**Path:** `src/screens/more/MoreMenuScreen.tsx`
**Route:** `/(main)/more`

Features:
- User profile card with quick access
- Menu items with icons:
  - Coupons
  - Customers
  - Reports
  - Settings
  - Help & Support
- Logout action
- App version display

---

## Screen Flow Diagrams

### Authentication Flow
```
App Launch
    │
    ├─[Not Authenticated]─► LoginScreen
    │                           │
    │                           ├─► RegisterScreen
    │                           │
    │                           └─► ForgotPasswordScreen
    │
    └─[Authenticated]─────────► MainNavigator
```

### POS Flow
```
POSScreen
    │
    ├─► Select Products (tap grid items)
    │       │
    │       └─► Cart updates automatically
    │
    ├─► Select Customer (optional)
    │       │
    │       └─► Customer Modal ─► Select/Add Customer
    │
    ├─► Apply Coupon (optional)
    │       │
    │       └─► Coupon Modal ─► Enter/Select Coupon
    │
    └─► Checkout
            │
            ├─► Select Payment Method
            │
            ├─► Confirm Order
            │
            └─► Print Receipt (optional)
```

### Product Management Flow
```
ProductListScreen
    │
    ├─► Add Button ─────────► AddProductScreen
    │                               │
    │                               └─► Save ─► Back to List
    │
    └─► Tap Product ────────► ProductDetailScreen
                                    │
                                    ├─► Edit ─► EditProductScreen
                                    │               │
                                    │               └─► Save ─► Back to Detail
                                    │
                                    └─► Delete ─► Confirm ─► Back to List
```
