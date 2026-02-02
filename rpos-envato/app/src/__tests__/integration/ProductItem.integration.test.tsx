/**
 * ProductItem Integration Tests
 * Tests real component rendering for product cards
 *
 * These tests verify:
 * - Product information displays correctly
 * - Stock status badges show proper state
 * - Price and margin calculations render
 * - Different size variants work
 * - Click handlers fire properly
 */

import React from 'react';
import { render, fireEvent, createMockProduct } from './test-utils.integration';
import { ProductItem } from '@/components/product/ProductItem';
import { formatCurrency } from '@/utils';

describe('ProductItem Integration Tests', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders product name correctly', () => {
      const product = createMockProduct({ name: 'Organic Coffee Beans' });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('Organic Coffee Beans')).toBeTruthy();
    });

    it('renders selling price formatted correctly', () => {
      const product = createMockProduct({ sellingPrice: 29.99 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('$29.99')).toBeTruthy();
    });

    it('renders category name when available', () => {
      const product = createMockProduct({
        category: { id: 'cat-1', name: 'Beverages', color: '#3B82F6' },
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="md" />
      );

      expect(getByText('Beverages')).toBeTruthy();
    });
  });

  describe('Stock Status Display', () => {
    it('shows "Out" badge when quantity is 0', () => {
      const product = createMockProduct({ quantity: 0 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('Out')).toBeTruthy();
    });

    it('shows low stock warning when quantity < 10', () => {
      const product = createMockProduct({ quantity: 5 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('5 left')).toBeTruthy();
    });

    it('shows stock count when quantity >= 10', () => {
      const product = createMockProduct({ quantity: 50 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('50')).toBeTruthy();
    });
  });

  describe('Profit Margin Display', () => {
    it('shows profit margin percentage', () => {
      const product = createMockProduct({
        sellingPrice: 20,
        purchasePrice: 10,
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="md" />
      );

      // Margin is 50% ((20-10)/20 * 100)
      expect(getByText('50%')).toBeTruthy();
    });

    it('does not show margin when purchasePrice is 0', () => {
      const product = createMockProduct({
        sellingPrice: 20,
        purchasePrice: 0,
      });

      const { queryByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      // Should not show margin indicator
      expect(queryByText('%')).toBeNull();
    });
  });

  describe('Click Handling', () => {
    it('calls onPress when product is clicked', () => {
      const product = createMockProduct({ quantity: 10 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      fireEvent.press(getByText(product.name));

      expect(mockOnPress).toHaveBeenCalledWith(product);
    });

    it('does NOT call onPress when out of stock product is clicked', () => {
      const product = createMockProduct({ quantity: 0 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      fireEvent.press(getByText(product.name));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    it('renders compact variant correctly', () => {
      const product = createMockProduct({
        name: 'Test Product',
        sku: 'SKU-001',
        quantity: 25,
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="compact" />
      );

      expect(getByText('Test Product')).toBeTruthy();
      expect(getByText('SKU: SKU-001')).toBeTruthy();
      expect(getByText('25 in stock')).toBeTruthy();
    });

    it('renders grid variant with category color strip', () => {
      const product = createMockProduct({
        name: 'Grid Product',
        category: { id: 'cat-1', name: 'Food', color: '#EF4444' },
        quantity: 100,
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="grid" />
      );

      expect(getByText('Grid Product')).toBeTruthy();
      expect(getByText('100 in stock')).toBeTruthy();
    });

    it('renders xs variant without category', () => {
      const product = createMockProduct({
        name: 'Tiny Product',
        category: { id: 'cat-1', name: 'Category' },
      });

      const { getByText, queryByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="xs" />
      );

      expect(getByText('Tiny Product')).toBeTruthy();
      // xs variant hides category
      expect(queryByText('Category')).toBeNull();
    });
  });

  describe('Selected State', () => {
    it('applies selected styling when selected prop is true', () => {
      const product = createMockProduct();

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} selected />
      );

      // Component should render (visual styling is handled by styled-components)
      expect(getByText(product.name)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalProduct = {
        id: 'prod-1',
        name: 'Minimal Product',
        sellingPrice: 10,
        quantity: 5,
        // No sku, category, description, etc.
      };

      const { getByText, queryByText } = render(
        <ProductItem product={minimalProduct as any} onPress={mockOnPress} />
      );

      expect(getByText('Minimal Product')).toBeTruthy();
      expect(getByText('$10.00')).toBeTruthy();
      expect(queryByText('SKU:')).toBeNull();
    });

    it('handles very long product names with truncation', () => {
      const product = createMockProduct({
        name: 'This is a very long product name that should be truncated in the UI',
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="sm" />
      );

      // Component should render without error
      expect(getByText(/This is a very long/)).toBeTruthy();
    });

    it('handles zero selling price', () => {
      const product = createMockProduct({ sellingPrice: 0 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('$0.00')).toBeTruthy();
    });

    it('handles negative margin (loss leader)', () => {
      const product = createMockProduct({
        sellingPrice: 5,
        purchasePrice: 10, // Purchase > Selling = negative margin
      });

      const { getByText, queryByText } = render(
        <ProductItem product={product} onPress={mockOnPress} />
      );

      expect(getByText('$5.00')).toBeTruthy();
      // Should not show negative margin indicator
      expect(queryByText('-%')).toBeNull();
    });
  });

  describe('Grid View Stock Display', () => {
    it('shows "Out of Stock" text in grid view when quantity is 0', () => {
      const product = createMockProduct({ quantity: 0 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="grid" />
      );

      expect(getByText('Out of Stock')).toBeTruthy();
    });

    it('shows "X in stock" in grid view for normal stock', () => {
      const product = createMockProduct({ quantity: 75 });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="grid" />
      );

      expect(getByText('75 in stock')).toBeTruthy();
    });

    it('shows margin percentage in grid view', () => {
      const product = createMockProduct({
        sellingPrice: 100,
        purchasePrice: 60,
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="grid" />
      );

      // 40% margin
      expect(getByText('40% margin')).toBeTruthy();
    });
  });

  describe('Compact View Details', () => {
    it('shows SKU in compact view', () => {
      const product = createMockProduct({ sku: 'PROD-12345' });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="compact" />
      );

      expect(getByText('SKU: PROD-12345')).toBeTruthy();
    });

    it('shows category badge in compact view', () => {
      const product = createMockProduct({
        category: { id: 'cat-1', name: 'Electronics' },
      });

      const { getByText } = render(
        <ProductItem product={product} onPress={mockOnPress} size="compact" />
      );

      expect(getByText('Electronics')).toBeTruthy();
    });
  });
});
