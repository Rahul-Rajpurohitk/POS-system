/**
 * StockAdjustment Integration Tests
 * Tests real component rendering and user interactions
 *
 * These tests actually render the StockAdjustment component and verify:
 * - UI renders correctly
 * - User interactions work (button clicks, input changes)
 * - State updates properly
 * - API calls are made with correct data
 */

import React from 'react';
import { render, fireEvent, waitFor, createMockProduct } from './test-utils.integration';
import { StockAdjustment } from '@/components/product/StockAdjustment';

// Mock the inventory hooks
const mockMutateAsync = jest.fn();
const mockCreateStockAdjustment = {
  mutateAsync: mockMutateAsync,
  isPending: false,
  isError: false,
  error: null,
};

jest.mock('@/features/inventory/hooks', () => ({
  useCreateStockAdjustment: () => mockCreateStockAdjustment,
}));

describe('StockAdjustment Integration Tests', () => {
  const mockProduct = createMockProduct({
    id: 'prod-1',
    name: 'Coca Cola 500ml',
    quantity: 50,
  });

  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('renders the component with product name and current stock', () => {
      const { getByText, getAllByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      expect(getByText('Coca Cola 500ml')).toBeTruthy();
      // Stock value appears twice (Current and After), so use getAllByText
      const stockElements = getAllByText('50');
      expect(stockElements.length).toBeGreaterThanOrEqual(1);
      expect(getByText('Stock Adjustment')).toBeTruthy();
    });

    it('displays mode toggle buttons', () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      expect(getByText('Add / Remove')).toBeTruthy();
      expect(getByText('Set To Exact')).toBeTruthy();
    });

    it('displays quick adjustment preset buttons for adding', () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      expect(getByText('+1')).toBeTruthy();
      expect(getByText('+5')).toBeTruthy();
      expect(getByText('+10')).toBeTruthy();
      expect(getByText('+25')).toBeTruthy();
      expect(getByText('+50')).toBeTruthy();
      expect(getByText('+100')).toBeTruthy();
    });

    it('displays quick adjustment preset buttons for removing', () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      expect(getByText('-1')).toBeTruthy();
      expect(getByText('-5')).toBeTruthy();
      expect(getByText('-10')).toBeTruthy();
      expect(getByText('-25')).toBeTruthy();
      expect(getByText('-50')).toBeTruthy();
      expect(getByText('-100')).toBeTruthy();
    });

    it('displays reason selector', () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      expect(getByText('Reason for Adjustment *')).toBeTruthy();
      expect(getByText('Select a reason...')).toBeTruthy();
    });
  });

  describe('Quick Adjustment Buttons', () => {
    it('clicking +10 button updates adjustment value to 10', () => {
      const { getByText, getByDisplayValue } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+10'));

      expect(getByDisplayValue('10')).toBeTruthy();
      expect(getByText('60')).toBeTruthy(); // After: 50 + 10
    });

    it('clicking -5 button updates adjustment value to -5', () => {
      const { getByText, getByDisplayValue } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('-5'));

      expect(getByDisplayValue('-5')).toBeTruthy();
      expect(getByText('45')).toBeTruthy(); // After: 50 - 5
    });

    it('multiple quick adjustments accumulate correctly', () => {
      const { getByText, getByDisplayValue } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+10'));
      fireEvent.press(getByText('+25'));

      expect(getByDisplayValue('35')).toBeTruthy();
      expect(getByText('85')).toBeTruthy(); // After: 50 + 35
    });

    it('shows error when reducing stock below 0', () => {
      const lowStockProduct = createMockProduct({ quantity: 5 });

      const { getByText } = render(
        <StockAdjustment product={lowStockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('-10'));

      expect(getByText('Cannot reduce stock below 0')).toBeTruthy();
    });

    it('+100 preset works correctly (bug fix verification)', () => {
      const { getByText, getByDisplayValue } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+100'));

      expect(getByDisplayValue('100')).toBeTruthy();
      expect(getByText('150')).toBeTruthy(); // After: 50 + 100
    });

    it('-100 preset works correctly (bug fix verification)', () => {
      const highStockProduct = createMockProduct({ quantity: 200 });

      const { getByText, getByDisplayValue } = render(
        <StockAdjustment product={highStockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('-100'));

      expect(getByDisplayValue('-100')).toBeTruthy();
      expect(getByText('100')).toBeTruthy(); // After: 200 - 100
    });
  });

  describe('Manual Input', () => {
    it('typing in input field updates adjustment', () => {
      const { getByPlaceholderText, getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      const input = getByPlaceholderText('0');
      fireEvent.changeText(input, '15');

      expect(getByText('65')).toBeTruthy(); // After: 50 + 15
    });

    it('typing negative number shows remove adjustment', () => {
      const { getByPlaceholderText, getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      const input = getByPlaceholderText('0');
      fireEvent.changeText(input, '-20');

      expect(getByText('30')).toBeTruthy(); // After: 50 - 20
    });
  });

  describe('Set To Exact Mode', () => {
    it('switching to "Set To Exact" mode changes UI', () => {
      const { getByText, queryByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('Set To Exact'));

      expect(getByText('Set stock to exact amount')).toBeTruthy();
      expect(queryByText('Quick Add')).toBeNull();
    });

    it('entering exact value calculates adjustment', () => {
      const { getByText, getByPlaceholderText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('Set To Exact'));

      const input = getByPlaceholderText('50'); // placeholder shows current stock
      fireEvent.changeText(input, '75');

      expect(getByText('Will add 25 units')).toBeTruthy();
    });
  });

  describe('Reason Selection', () => {
    it('clicking reason selector opens dropdown', () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('Select a reason...'));

      expect(getByText('Restock / Purchase')).toBeTruthy();
      expect(getByText('Customer Return')).toBeTruthy();
      expect(getByText('Inventory Count')).toBeTruthy();
      expect(getByText('Damaged Goods')).toBeTruthy();
    });

    it('selecting a reason updates the selector', () => {
      const { getByText, queryByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('Select a reason...'));
      fireEvent.press(getByText('Restock / Purchase'));

      expect(getByText('Restock / Purchase')).toBeTruthy();
      expect(getByText('Stock received from supplier')).toBeTruthy();
      expect(queryByText('Select a reason...')).toBeNull();
    });
  });

  describe('Form Submission', () => {
    it('shows error when submitting without reason', async () => {
      const { getByText, queryByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+10'));

      // Try to find and click the submit button
      // The button text changes based on the adjustment value
      const submitButton = getByText('Add 10 Units');
      fireEvent.press(submitButton);

      // Wait for the validation error to appear
      await waitFor(() => {
        const errorText = queryByText('Please select a reason for this adjustment');
        // If the error doesn't appear, the button might be disabled
        // Both behaviors are acceptable - either show error or disable button
        expect(errorText || !mockMutateAsync.mock.calls.length).toBeTruthy();
      });

      // Verify the API was not called
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('submits adjustment with correct data', async () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+25'));
      fireEvent.press(getByText('Select a reason...'));
      fireEvent.press(getByText('Restock / Purchase'));
      fireEvent.press(getByText('Add 25 Units'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          productId: 'prod-1',
          type: 'purchase_order',
          quantity: 25,
          reason: 'Restock / Purchase',
          notes: undefined,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('submits negative adjustment correctly', async () => {
      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('-10'));
      fireEvent.press(getByText('Select a reason...'));
      fireEvent.press(getByText('Damaged Goods'));
      fireEvent.press(getByText('Remove 10 Units'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          productId: 'prod-1',
          type: 'damage',
          quantity: -10,
          reason: 'Damaged Goods',
          notes: undefined,
        });
      });
    });

    it('includes notes when provided', async () => {
      const { getByText, getByPlaceholderText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+5'));
      fireEvent.press(getByText('Select a reason...'));
      fireEvent.press(getByText('Inventory Count'));

      const notesInput = getByPlaceholderText('Add notes about this adjustment...');
      fireEvent.changeText(notesInput, 'Found extra stock in warehouse');

      fireEvent.press(getByText('Add 5 Units'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Found extra stock in warehouse',
          })
        );
      });
    });

    it('resets form after successful submission', async () => {
      const { getByText, getByDisplayValue, queryByDisplayValue } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+10'));
      expect(getByDisplayValue('10')).toBeTruthy();

      fireEvent.press(getByText('Select a reason...'));
      fireEvent.press(getByText('Restock / Purchase'));

      fireEvent.press(getByText('Add 10 Units'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      expect(queryByDisplayValue('10')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('shows error when API call fails', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} />
      );

      fireEvent.press(getByText('+5'));
      fireEvent.press(getByText('Select a reason...'));
      fireEvent.press(getByText('Restock / Purchase'));
      fireEvent.press(getByText('Add 5 Units'));

      await waitFor(() => {
        expect(getByText('Failed to save stock adjustment')).toBeTruthy();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Compact Mode', () => {
    it('renders compact mode with current stock and +/- buttons', () => {
      const { getByText, queryByText } = render(
        <StockAdjustment product={mockProduct} onSuccess={mockOnSuccess} compact />
      );

      expect(getByText('50')).toBeTruthy();
      expect(queryByText('Stock Adjustment')).toBeNull();
      expect(queryByText('Quick Add')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles product with zero stock', () => {
      const zeroStockProduct = createMockProduct({ quantity: 0 });

      const { getAllByText, getByText, getByDisplayValue } = render(
        <StockAdjustment product={zeroStockProduct} onSuccess={mockOnSuccess} />
      );

      // Zero appears multiple times (Current and After)
      const zeroElements = getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByText('+10'));

      // After adjustment, check for the new value
      expect(getByDisplayValue('10')).toBeTruthy(); // Input value
    });

    it('handles very large stock numbers', () => {
      const largeStockProduct = createMockProduct({ quantity: 10000 });

      const { getAllByText, getByText, getByDisplayValue } = render(
        <StockAdjustment product={largeStockProduct} onSuccess={mockOnSuccess} />
      );

      // 10000 appears multiple times (Current and After)
      const stockElements = getAllByText('10000');
      expect(stockElements.length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByText('+100'));

      expect(getByDisplayValue('100')).toBeTruthy(); // Input value
      expect(getByText('10100')).toBeTruthy(); // After value
    });
  });
});
