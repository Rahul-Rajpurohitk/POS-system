# RPOS Server Documentation - Version 1.0

## Original System Overview

This document describes the original RPOS (Retail Point of Sale) system before the TypeScript migration and enterprise feature additions.

### Original Stack
- **Runtime**: Node.js with JavaScript (ES6)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based
- **API**: RESTful Express.js

### Original Entities
1. **Business** - Multi-tenant business accounts
2. **User** - Staff and admin users
3. **Product** - Inventory items
4. **Category** - Product categorization
5. **Customer** - Customer records
6. **Order** - Sales transactions
7. **Coupon** - Discount codes
8. **File** - Media storage

### Original Features
- Basic POS operations
- Product management
- Customer management
- Order processing
- Simple reporting
- User authentication

---

*For the comprehensive updated system documentation, see [DOCUMENTATION_v2.md](./DOCUMENTATION_v2.md)*
