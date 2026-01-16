/**
 * Jest Test Setup
 * Configures test environment with mocks and utilities
 */

import '@testing-library/jest-native/extend-expect';

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-reanimated
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

// Mock Navigation
const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockedNavigate,
    goBack: mockedGoBack,
    setOptions: mockedSetOptions,
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock Tamagui
jest.mock('tamagui', () => ({
  YStack: 'YStack',
  XStack: 'XStack',
  Text: 'Text',
  Button: 'Button',
  Input: 'Input',
  TextArea: 'TextArea',
  ScrollView: 'ScrollView',
  Image: 'Image',
  Sheet: {
    Frame: 'SheetFrame',
    Overlay: 'SheetOverlay',
    Handle: 'SheetHandle',
  },
  styled: (component: any) => component,
  useTheme: () => ({
    background: { val: '#fff' },
    color: { val: '#000' },
  }),
}));

// Mock Lucide Icons
jest.mock('@tamagui/lucide-icons', () => ({
  Search: 'SearchIcon',
  Plus: 'PlusIcon',
  ArrowLeft: 'ArrowLeftIcon',
  Check: 'CheckIcon',
  X: 'XIcon',
  Edit: 'EditIcon',
  Trash: 'TrashIcon',
  Package: 'PackageIcon',
  DollarSign: 'DollarSignIcon',
  TrendingUp: 'TrendingUpIcon',
  AlertTriangle: 'AlertTriangleIcon',
  ChevronDown: 'ChevronDownIcon',
  ChevronUp: 'ChevronUpIcon',
  Eye: 'EyeIcon',
  Pencil: 'PencilIcon',
  Box: 'BoxIcon',
  Tag: 'TagIcon',
  Camera: 'CameraIcon',
  Barcode: 'BarcodeIcon',
  Truck: 'TruckIcon',
  Tags: 'TagsIcon',
  AlertCircle: 'AlertCircleIcon',
  Image: 'ImageIcon',
  Percent: 'PercentIcon',
  Hash: 'HashIcon',
  FileText: 'FileTextIcon',
  Layers: 'LayersIcon',
  Scale: 'ScaleIcon',
  Ruler: 'RulerIcon',
  Sparkles: 'SparklesIcon',
  RefreshCw: 'RefreshCwIcon',
  MoreHorizontal: 'MoreHorizontalIcon',
  ArrowUpDown: 'ArrowUpDownIcon',
  Minus: 'MinusIcon',
  RotateCcw: 'RotateCcwIcon',
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: (obj: any) => obj.web || obj.default,
}));

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  return RN;
});

// Global test utilities
global.mockedNavigate = mockedNavigate;
global.mockedGoBack = mockedGoBack;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockedNavigate.mockClear();
  mockedGoBack.mockClear();
});

// Suppress console warnings in tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
      args[0].includes('act(...)') ||
      args[0].includes('Not implemented'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

export { mockedNavigate, mockedGoBack };
