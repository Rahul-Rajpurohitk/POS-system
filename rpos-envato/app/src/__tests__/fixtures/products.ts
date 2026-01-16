/**
 * Product Test Fixtures
 * Test data for product-related tests
 */

import type { Product, Category, PartnerAvailability } from '@/types';

// Categories for testing
export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Beverages',
    description: 'Drinks and beverages',
    color: '#3B82F6',
    productCount: 5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Snacks',
    description: 'Snack items',
    color: '#10B981',
    productCount: 8,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-3',
    name: 'Dairy',
    description: 'Dairy products',
    color: '#F59E0B',
    productCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-4',
    name: 'Frozen',
    description: 'Frozen items',
    color: '#8B5CF6',
    productCount: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-5',
    name: 'Produce',
    description: 'Fresh produce',
    color: '#EF4444',
    productCount: 6,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// Partner availability presets
export const noPartners: PartnerAvailability = {
  doordash: false,
  ubereats: false,
  grubhub: false,
  postmates: false,
  instacart: false,
};

export const allPartners: PartnerAvailability = {
  doordash: true,
  ubereats: true,
  grubhub: true,
  postmates: true,
  instacart: true,
};

export const somePartners: PartnerAvailability = {
  doordash: true,
  ubereats: true,
  grubhub: false,
  postmates: false,
  instacart: false,
};

// Base product for testing
export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: `prod-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Product',
  sku: 'TEST-001',
  description: 'A test product for testing',
  categoryId: 'cat-1',
  sellingPrice: 9.99,
  purchasePrice: 5.99,
  quantity: 50,
  minStock: 10,
  barcode: '1234567890123',
  unitOfMeasure: 'each',
  isActive: true,
  partnerAvailability: noPartners,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// Products with various stock levels
export const mockProducts: Product[] = [
  // In stock products
  createMockProduct({
    id: 'prod-1',
    name: 'Coca-Cola 12oz',
    sku: 'BEV-001',
    categoryId: 'cat-1',
    sellingPrice: 1.99,
    purchasePrice: 0.99,
    quantity: 100,
    minStock: 20,
    partnerAvailability: allPartners,
  }),
  createMockProduct({
    id: 'prod-2',
    name: 'Pepsi 12oz',
    sku: 'BEV-002',
    categoryId: 'cat-1',
    sellingPrice: 1.99,
    purchasePrice: 0.99,
    quantity: 75,
    minStock: 20,
    partnerAvailability: somePartners,
  }),
  createMockProduct({
    id: 'prod-3',
    name: 'Lays Classic Chips',
    sku: 'SNK-001',
    categoryId: 'cat-2',
    sellingPrice: 3.49,
    purchasePrice: 1.99,
    quantity: 45,
    minStock: 15,
    partnerAvailability: noPartners,
  }),
  // Low stock products
  createMockProduct({
    id: 'prod-4',
    name: 'Milk 1 Gallon',
    sku: 'DAI-001',
    categoryId: 'cat-3',
    sellingPrice: 4.99,
    purchasePrice: 3.49,
    quantity: 5, // Below minStock of 10
    minStock: 10,
    partnerAvailability: somePartners,
  }),
  createMockProduct({
    id: 'prod-5',
    name: 'Orange Juice',
    sku: 'BEV-003',
    categoryId: 'cat-1',
    sellingPrice: 5.99,
    purchasePrice: 3.99,
    quantity: 8, // Below minStock of 15
    minStock: 15,
    partnerAvailability: noPartners,
  }),
  // Out of stock products
  createMockProduct({
    id: 'prod-6',
    name: 'Ice Cream Vanilla',
    sku: 'FRZ-001',
    categoryId: 'cat-4',
    sellingPrice: 6.99,
    purchasePrice: 4.49,
    quantity: 0, // Out of stock
    minStock: 5,
    partnerAvailability: allPartners,
  }),
  createMockProduct({
    id: 'prod-7',
    name: 'Frozen Pizza',
    sku: 'FRZ-002',
    categoryId: 'cat-4',
    sellingPrice: 8.99,
    purchasePrice: 5.99,
    quantity: 0, // Out of stock
    minStock: 10,
    partnerAvailability: noPartners,
  }),
  // High margin product
  createMockProduct({
    id: 'prod-8',
    name: 'Premium Water',
    sku: 'BEV-004',
    categoryId: 'cat-1',
    sellingPrice: 4.99,
    purchasePrice: 0.50,
    quantity: 200,
    minStock: 50,
    partnerAvailability: allPartners,
  }),
  // Low margin product
  createMockProduct({
    id: 'prod-9',
    name: 'Bread Loaf',
    sku: 'BAK-001',
    categoryId: 'cat-5',
    sellingPrice: 2.99,
    purchasePrice: 2.50,
    quantity: 30,
    minStock: 10,
    partnerAvailability: somePartners,
  }),
  // Product with negative margin (purchasePrice > sellingPrice)
  createMockProduct({
    id: 'prod-10',
    name: 'Loss Leader Item',
    sku: 'PRO-001',
    categoryId: 'cat-5',
    sellingPrice: 0.99,
    purchasePrice: 1.50,
    quantity: 20,
    minStock: 5,
    partnerAvailability: noPartners,
  }),
];

// Stock adjustment reasons
export const stockAdjustmentReasons = [
  { value: 'purchase', label: 'Purchase Order Received' },
  { value: 'return', label: 'Customer Return' },
  { value: 'damage', label: 'Damaged/Expired' },
  { value: 'theft', label: 'Theft/Loss' },
  { value: 'count', label: 'Inventory Count Adjustment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

// Helper functions
export const getInStockProducts = () =>
  mockProducts.filter((p) => p.quantity > p.minStock);

export const getLowStockProducts = () =>
  mockProducts.filter((p) => p.quantity > 0 && p.quantity <= p.minStock);

export const getOutOfStockProducts = () =>
  mockProducts.filter((p) => p.quantity === 0);

export const getProductById = (id: string) =>
  mockProducts.find((p) => p.id === id);

export const getProductsByCategoryId = (categoryId: string) =>
  mockProducts.filter((p) => p.categoryId === categoryId);

export const searchProducts = (query: string) =>
  mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
  );

// Analytics calculations
export const calculateAnalytics = (products: Product[]) => {
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.quantity * p.purchasePrice,
    0
  );
  const lowStockCount = products.filter(
    (p) => p.quantity > 0 && p.quantity <= p.minStock
  ).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;

  const margins = products
    .filter((p) => p.sellingPrice > 0)
    .map((p) => ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100);
  const avgMargin =
    margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  return {
    totalProducts,
    totalInventoryValue,
    lowStockCount,
    outOfStockCount,
    avgMargin,
  };
};

// Form validation test cases
export const validProductFormData = {
  name: 'New Test Product',
  sku: 'NEW-001',
  description: 'A valid product description',
  categoryId: 'cat-1',
  sellingPrice: '19.99',
  purchasePrice: '9.99',
  quantity: '50',
  minStock: '10',
};

export const invalidProductFormCases = [
  {
    name: 'empty_name',
    data: { ...validProductFormData, name: '' },
    expectedError: 'Product name is required',
  },
  {
    name: 'single_char_name',
    data: { ...validProductFormData, name: 'A' },
    expectedError: 'Product name is required',
  },
  {
    name: 'negative_selling_price',
    data: { ...validProductFormData, sellingPrice: '-5' },
    expectedError: 'Invalid price',
  },
  {
    name: 'negative_purchase_price',
    data: { ...validProductFormData, purchasePrice: '-5' },
    expectedError: 'Invalid price',
  },
  {
    name: 'negative_quantity',
    data: { ...validProductFormData, quantity: '-10' },
    expectedError: 'Invalid quantity - must be a whole number',
  },
];

// XSS test cases
export const xssTestCases = [
  '<script>alert("xss")</script>',
  'javascript:alert("xss")',
  '<img src=x onerror=alert("xss")>',
  '"><script>alert("xss")</script>',
];

// SQL injection test cases
export const sqlInjectionTestCases = [
  "'; DROP TABLE products; --",
  "1' OR '1'='1",
  "1; DELETE FROM products WHERE 1=1; --",
  "' UNION SELECT * FROM users --",
];
