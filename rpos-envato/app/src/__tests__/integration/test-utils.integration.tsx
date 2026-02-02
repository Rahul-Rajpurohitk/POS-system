/**
 * Integration Test Utilities
 * Provides proper rendering context for integration tests
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// All providers wrapper
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
}

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render, createTestQueryClient, fireEvent, waitFor, screen };

// Helper to create mock product data
export function createMockProduct(overrides = {}) {
  return {
    id: `prod-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Product',
    sku: 'TEST-SKU-001',
    description: 'Test product description',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Test Category', color: '#3B82F6' },
    sellingPrice: 19.99,
    purchasePrice: 10.00,
    quantity: 50,
    minStock: 10,
    barcode: '1234567890123',
    images: [],
    partnerAvailability: {},
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to wait for loading states
export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
  });
}

// Helper to simulate text input
export function typeText(element: any, text: string) {
  fireEvent.changeText(element, text);
}

// Helper to press button
export function pressButton(element: any) {
  fireEvent.press(element);
}
