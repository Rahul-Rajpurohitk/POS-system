/**
 * Test Utilities
 * Helper functions for rendering components in tests
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Mock store state
interface MockStoreState {
  auth?: {
    user: { id: string; name: string; email: string } | null;
    token: string | null;
    isAuthenticated: boolean;
  };
  settings?: {
    currency: string;
    language: string;
    isDarkMode: boolean;
  };
  sync?: {
    isOnline: boolean;
    pendingCount: number;
  };
}

const defaultMockState: MockStoreState = {
  auth: {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'mock-token',
    isAuthenticated: true,
  },
  settings: {
    currency: 'USD',
    language: 'en',
    isDarkMode: false,
  },
  sync: {
    isOnline: true,
    pendingCount: 0,
  },
};

// Mock stores
jest.mock('@/store', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = {
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      token: 'mock-token',
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
  useSettingsStore: jest.fn((selector) => {
    const state = {
      currency: 'USD',
      language: 'en',
      isDarkMode: false,
      updateSettings: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
  useSyncStore: jest.fn((selector) => {
    const state = {
      isOnline: true,
      pendingCount: 0,
      addToQueue: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// All providers wrapper
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  mockState?: MockStoreState;
}

const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  queryClient,
}) => {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <NavigationContainer>{children}</NavigationContainer>
    </QueryClientProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  mockState?: MockStoreState;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
): ReturnType<typeof render> => {
  const { queryClient, mockState, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} mockState={mockState}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render, createTestQueryClient };

// Helper to wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper to create mock API response
export const createMockApiResponse = <T,>(data: T, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
});

// Helper to create paginated response
export const createPaginatedResponse = <T,>(
  data: T[],
  page = 1,
  limit = 10,
  total?: number
) => ({
  success: true,
  data: {
    data,
    pagination: {
      page,
      limit,
      total: total || data.length,
      totalPages: Math.ceil((total || data.length) / limit),
    },
  },
});

// Helper for testing form validation
export const fillFormField = async (
  getByTestId: (id: string) => any,
  fireEvent: any,
  fieldId: string,
  value: string
) => {
  const input = getByTestId(fieldId);
  fireEvent.changeText(input, value);
  return input;
};

// Helper for testing button clicks
export const clickButton = async (
  getByTestId: (id: string) => any,
  fireEvent: any,
  buttonId: string
) => {
  const button = getByTestId(buttonId);
  fireEvent.press(button);
  return button;
};

// Helper for assertions
export const expectToBeDisabled = (element: any) => {
  expect(element.props.disabled || element.props.accessibilityState?.disabled).toBe(true);
};

export const expectToBeEnabled = (element: any) => {
  expect(element.props.disabled || element.props.accessibilityState?.disabled).toBeFalsy();
};

// Mock API handlers
export const mockApiSuccess = <T,>(data: T) =>
  jest.fn().mockResolvedValue(createMockApiResponse(data));

export const mockApiError = (message: string) =>
  jest.fn().mockRejectedValue(new Error(message));

export const mockApiLoading = () =>
  jest.fn().mockImplementation(() => new Promise(() => {}));
