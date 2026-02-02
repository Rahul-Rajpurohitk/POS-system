/**
 * Integration Test Setup
 * Sets up environment for tests that actually render components
 */

import '@testing-library/jest-native/extend-expect';

// Mock React Native modules that don't work in Jest
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Comprehensive Tamagui mock with full component support
jest.mock('tamagui', () => {
  const mockReact = require('react');
  const { View, Text: RNText, TextInput, ScrollView: RNScrollView, Pressable } = require('react-native');

  // Helper to create mock components that handle various props
  const createMockComponent = (name: string, defaultElement: any = View) => {
    const Component = (props: any) => {
      const {
        children,
        onPress,
        onChangeText,
        value,
        placeholder,
        testID,
        disabled,
        opacity,
        cursor,
        ...restProps
      } = props;

      // If it has onChangeText, render as TextInput
      if (onChangeText !== undefined) {
        return mockReact.createElement(TextInput, {
          testID,
          value: value || '',
          placeholder,
          onChangeText,
          editable: !disabled,
          ...restProps,
        });
      }

      // If it has onPress, render as Pressable
      if (onPress !== undefined) {
        const isDisabled = disabled || cursor === 'not-allowed' || opacity === 0.5;
        return mockReact.createElement(
          Pressable,
          {
            testID,
            onPress: isDisabled ? undefined : onPress,
            disabled: isDisabled,
            accessibilityRole: 'button',
            ...restProps,
          },
          children
        );
      }

      // Default to View
      return mockReact.createElement(defaultElement, { testID, ...restProps }, children);
    };
    Component.displayName = name;
    return Component;
  };

  // Text component - always renders as RNText
  const MockText = (props: any) => {
    const { children, testID, ...restProps } = props;
    return mockReact.createElement(RNText, { testID, ...restProps }, children);
  };
  MockText.displayName = 'Text';

  // Input component with full TextInput behavior
  const MockInput = (props: any) => {
    const { value, onChangeText, placeholder, testID, disabled, ...restProps } = props;
    return mockReact.createElement(TextInput, {
      testID,
      value: value || '',
      placeholder,
      onChangeText,
      editable: !disabled,
      ...restProps,
    });
  };
  MockInput.displayName = 'Input';

  // TextArea component
  const MockTextArea = (props: any) => {
    const { value, onChangeText, placeholder, testID, disabled, ...restProps } = props;
    return mockReact.createElement(TextInput, {
      testID,
      value: value || '',
      placeholder,
      onChangeText,
      editable: !disabled,
      multiline: true,
      ...restProps,
    });
  };
  MockTextArea.displayName = 'TextArea';

  // ScrollView component
  const MockScrollView = (props: any) => {
    const { children, testID, ...restProps } = props;
    return mockReact.createElement(RNScrollView, { testID, ...restProps }, children);
  };
  MockScrollView.displayName = 'ScrollView';

  // Button component with press handling
  const MockButton = (props: any) => {
    const { children, onPress, testID, disabled, ...restProps } = props;
    return mockReact.createElement(
      Pressable,
      {
        testID,
        onPress: disabled ? undefined : onPress,
        disabled,
        accessibilityRole: 'button',
        ...restProps,
      },
      typeof children === 'string'
        ? mockReact.createElement(RNText, {}, children)
        : children
    );
  };
  MockButton.displayName = 'Button';

  // Switch component
  const MockSwitch = (props: any) => {
    const { checked, onCheckedChange, testID, disabled, ...restProps } = props;
    return mockReact.createElement(
      Pressable,
      {
        testID,
        onPress: disabled ? undefined : () => onCheckedChange?.(!checked),
        accessibilityRole: 'switch',
        accessibilityState: { checked },
        ...restProps,
      },
      mockReact.createElement(RNText, {}, checked ? '✓' : '○')
    );
  };
  MockSwitch.displayName = 'Switch';

  // Label component
  const MockLabel = (props: any) => {
    const { children, testID, ...restProps } = props;
    return mockReact.createElement(RNText, { testID, ...restProps }, children);
  };
  MockLabel.displayName = 'Label';

  // Checkbox component
  const MockCheckbox = (props: any) => {
    const { checked, onCheckedChange, testID, disabled, ...restProps } = props;
    return mockReact.createElement(
      Pressable,
      {
        testID,
        onPress: disabled ? undefined : () => onCheckedChange?.(!checked),
        accessibilityRole: 'checkbox',
        accessibilityState: { checked },
        ...restProps,
      },
      mockReact.createElement(RNText, {}, checked ? '☑' : '☐')
    );
  };
  MockCheckbox.displayName = 'Checkbox';

  // Select components
  const MockSelect = (props: any) => {
    const { children, value, onValueChange, testID, ...restProps } = props;
    return mockReact.createElement(View, { testID, ...restProps }, children);
  };
  MockSelect.displayName = 'Select';
  MockSelect.Trigger = createMockComponent('SelectTrigger');
  MockSelect.Value = MockText;
  MockSelect.Content = createMockComponent('SelectContent');
  MockSelect.Item = (props: any) => {
    const { children, value, onPress, testID, ...restProps } = props;
    return mockReact.createElement(
      Pressable,
      { testID, onPress, accessibilityRole: 'option', ...restProps },
      children
    );
  };
  MockSelect.ItemText = MockText;

  // Sheet components
  const MockSheet = createMockComponent('Sheet');
  MockSheet.Frame = createMockComponent('SheetFrame');
  MockSheet.Overlay = createMockComponent('SheetOverlay');
  MockSheet.Handle = createMockComponent('SheetHandle');
  MockSheet.ScrollView = MockScrollView;

  // Dialog components
  const MockDialog = createMockComponent('Dialog');
  MockDialog.Portal = createMockComponent('DialogPortal');
  MockDialog.Overlay = createMockComponent('DialogOverlay');
  MockDialog.Content = createMockComponent('DialogContent');
  MockDialog.Title = MockText;
  MockDialog.Description = MockText;
  MockDialog.Close = createMockComponent('DialogClose');

  // Popover components
  const MockPopover = createMockComponent('Popover');
  MockPopover.Trigger = createMockComponent('PopoverTrigger');
  MockPopover.Content = createMockComponent('PopoverContent');
  MockPopover.Arrow = createMockComponent('PopoverArrow');

  // Card component
  const MockCard = createMockComponent('Card');
  MockCard.Header = createMockComponent('CardHeader');
  MockCard.Footer = createMockComponent('CardFooter');

  // Tabs component
  const MockTabs = createMockComponent('Tabs');
  MockTabs.List = createMockComponent('TabsList');
  MockTabs.Tab = createMockComponent('TabsTab');
  MockTabs.Content = createMockComponent('TabsContent');

  // Separator component
  const MockSeparator = (props: any) => {
    return mockReact.createElement(View, {
      ...props,
      style: { height: 1, backgroundColor: '#E5E7EB' },
    });
  };
  MockSeparator.displayName = 'Separator';

  // Spinner component
  const MockSpinner = (props: any) => {
    return mockReact.createElement(RNText, { testID: props.testID }, 'Loading...');
  };
  MockSpinner.displayName = 'Spinner';

  // Image component
  const MockImage = (props: any) => {
    const { source, testID, ...restProps } = props;
    return mockReact.createElement(View, { testID, ...restProps });
  };
  MockImage.displayName = 'Image';

  // Avatar component
  const MockAvatar = createMockComponent('Avatar');
  MockAvatar.Image = MockImage;
  MockAvatar.Fallback = createMockComponent('AvatarFallback');

  // Form components
  const MockForm = createMockComponent('Form');
  MockForm.Trigger = createMockComponent('FormTrigger');

  // Styled helper - returns the component as-is
  const styled = (component: any, _config?: any) => {
    const StyledComponent = (props: any) => {
      return typeof component === 'function'
        ? mockReact.createElement(component, props)
        : mockReact.createElement(View, props);
    };
    return StyledComponent;
  };

  // withStaticProperties helper
  const withStaticProperties = (component: any, staticProps: any) => {
    return Object.assign(component, staticProps);
  };

  return {
    // Layout components
    YStack: createMockComponent('YStack'),
    XStack: createMockComponent('XStack'),
    ZStack: createMockComponent('ZStack'),
    Stack: createMockComponent('Stack'),
    View: createMockComponent('View'),

    // Text components
    Text: MockText,
    Paragraph: MockText,
    Heading: MockText,
    H1: MockText,
    H2: MockText,
    H3: MockText,
    H4: MockText,
    H5: MockText,
    H6: MockText,
    Label: MockLabel,
    SizableText: MockText,

    // Input components
    Input: MockInput,
    TextArea: MockTextArea,

    // Interactive components
    Button: MockButton,
    Pressable: createMockComponent('Pressable'),
    Switch: MockSwitch,
    Checkbox: MockCheckbox,
    RadioGroup: createMockComponent('RadioGroup'),

    // Container components
    ScrollView: MockScrollView,
    Card: MockCard,
    Sheet: MockSheet,
    Dialog: MockDialog,
    Popover: MockPopover,
    Tabs: MockTabs,

    // Form components
    Form: MockForm,
    Select: MockSelect,

    // Visual components
    Image: MockImage,
    Avatar: MockAvatar,
    Separator: MockSeparator,
    Spinner: MockSpinner,
    Circle: createMockComponent('Circle'),
    Square: createMockComponent('Square'),

    // Utility
    styled,
    withStaticProperties,
    useTheme: () => ({
      background: { val: '#fff' },
      backgroundHover: { val: '#f5f5f5' },
      backgroundPress: { val: '#e5e5e5' },
      backgroundFocus: { val: '#e0e0e0' },
      color: { val: '#000' },
      colorHover: { val: '#333' },
      borderColor: { val: '#E5E7EB' },
      borderColorHover: { val: '#D1D5DB' },
      borderColorFocus: { val: '#3B82F6' },
    }),
    useMedia: () => ({
      sm: false,
      md: true,
      lg: false,
      xl: false,
      xxl: false,
      short: false,
      tall: true,
      hoverNone: false,
      pointerCoarse: false,
    }),
    GetProps: {},
    TamaguiProvider: ({ children }: any) => children,
    Theme: ({ children }: any) => children,
    ThemeProvider: ({ children }: any) => children,
    createTamagui: () => ({}),
    getTokens: () => ({}),
    getToken: () => '',
    isWeb: false,
    isClient: true,
    useIsomorphicLayoutEffect: mockReact.useEffect,
  };
});

// Mock Lucide Icons - create pressable icons
jest.mock('@tamagui/lucide-icons', () => {
  const mockReact = require('react');
  const { Text, Pressable } = require('react-native');

  const createIcon = (name: string) => {
    const IconComponent = ({ size, color, onPress, testID, ...props }: any) => {
      const iconElement = mockReact.createElement(
        Text,
        { testID: testID || `icon-${name}`, style: { color } },
        name
      );

      if (onPress) {
        return mockReact.createElement(
          Pressable,
          { onPress, accessibilityRole: 'button' },
          iconElement
        );
      }

      return iconElement;
    };
    IconComponent.displayName = name;
    return IconComponent;
  };

  // Return a Proxy that creates icons on demand
  return new Proxy(
    {},
    {
      get: (_, prop) => {
        if (typeof prop === 'string') {
          return createIcon(prop);
        }
        return undefined;
      },
    }
  );
});

// Mock formatCurrency utility
jest.mock('@/utils', () => ({
  formatCurrency: (amount: number, currency: string = 'USD') => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${Number(amount).toFixed(2)}`;
  },
  formatNumber: (num: number) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  },
  formatDate: (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  },
  formatPercent: (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-reanimated with working implementation
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  State: {},
  Directions: {},
}));

// Mock Navigation with full implementation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: mockAddListener,
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: () => true,
  };
});

// Mock settings store
jest.mock('@/store', () => ({
  useSettingsStore: () => ({
    settings: {
      currency: 'USD',
      language: 'en',
      theme: 'light',
    },
    updateSettings: jest.fn(),
  }),
  useAuthStore: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isAuthenticated: true,
  }),
  useSyncStore: () => ({
    addToQueue: jest.fn(),
    isOnline: true,
    pendingActions: [],
    syncStatus: 'idle',
  }),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: (obj: Record<string, unknown>) => obj.ios || obj.default,
}));

// Export mocks for test assertions
export { mockNavigate, mockGoBack, mockSetOptions };

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Suppress specific console warnings
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning:') ||
      message.includes('act(...)') ||
      message.includes('Not implemented') ||
      message.includes('Tamagui') ||
      message.includes('Each child in a list'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Tamagui') || message.includes('config'))
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};
