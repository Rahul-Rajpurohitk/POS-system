# POS Universal - Getting Started Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on physical device (optional)

## Quick Start

### 1. Install Dependencies

```bash
cd app
npm install
```

### 2. Configure Environment

Create a `.env` file in the `app` directory:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_APP_NAME=POS Universal
EXPO_PUBLIC_APP_VERSION=2.0.0
```

### 3. Start Development Server

```bash
# Start Expo dev server
npx expo start

# Or with specific platform
npx expo start --ios      # iOS Simulator
npx expo start --android  # Android Emulator
npx expo start --web      # Web browser
```

### 4. Running on Device

**Using Expo Go:**
1. Install "Expo Go" from App Store / Play Store
2. Scan QR code from terminal
3. App loads on your device

**Development Build (recommended for full features):**
```bash
# Build for iOS
npx expo run:ios

# Build for Android
npx expo run:android
```

## Project Configuration

### TypeScript Path Aliases

The project uses path aliases for clean imports:

```typescript
// Instead of:
import { Button } from '../../../components/ui';

// Use:
import { Button } from '@/components/ui';
```

Aliases available:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@screens/*` → `src/screens/*`
- `@navigation/*` → `src/navigation/*`
- `@store/*` → `src/store/*`
- `@hooks/*` → `src/hooks/*`
- `@utils/*` → `src/utils/*`
- `@services/*` → `src/services/*`
- `@features/*` → `src/features/*`
- `@types/*` → `src/types/*`

### Theme Customization

Edit `tamagui.config.ts` to customize:

```typescript
// Colors
primary: '#33b9f7',    // Change brand color
accent: '#ff5066',     // Change accent color

// Typography
fonts: {
  body: createFont({...}),
  heading: createFont({...}),
}
```

## Development Workflow

### Adding a New Screen

1. Create screen file in appropriate folder:
```typescript
// src/screens/myfeature/MyScreen.tsx
import React from 'react';
import { YStack, Text } from 'tamagui';

export default function MyScreen() {
  return (
    <YStack flex={1}>
      <Text>My Screen</Text>
    </YStack>
  );
}
```

2. Export from index:
```typescript
// src/screens/myfeature/index.ts
export { default as MyScreen } from './MyScreen';
```

3. Add to navigation:
```typescript
// src/navigation/MainNavigator.tsx
<Stack.Screen name="MyScreen" component={MyScreen} />
```

4. Add types:
```typescript
// src/navigation/types.ts
type MyStackParamList = {
  MyScreen: undefined;
  // or with params:
  MyScreen: { id: string };
};
```

### Adding a New API Feature

1. Create API module:
```typescript
// src/features/myfeature/api.ts
import { apiClient } from '@/services/api/client';

export const myFeatureApi = {
  getAll: () => apiClient.get('/my-feature'),
  create: (data) => apiClient.post('/my-feature', data),
};
```

2. Create hooks:
```typescript
// src/features/myfeature/hooks.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { myFeatureApi } from './api';

export function useMyFeature() {
  return useQuery({
    queryKey: ['myFeature'],
    queryFn: myFeatureApi.getAll,
  });
}
```

3. Export from index:
```typescript
// src/features/myfeature/index.ts
export * from './api';
export * from './hooks';
```

### Adding a New Component

1. Create component:
```typescript
// src/components/ui/MyComponent.tsx
import { styled, YStack } from 'tamagui';

const StyledComponent = styled(YStack, {
  // styles
});

export function MyComponent({ children }) {
  return <StyledComponent>{children}</StyledComponent>;
}
```

2. Export from index:
```typescript
// src/components/ui/index.ts
export * from './MyComponent';
```

## Common Tasks

### Form with Validation

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button } from '@/components/ui';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

function MyForm() {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => console.log(data);

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Email"
            value={value}
            onChangeText={onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)}>
        <Text>Submit</Text>
      </Button>
    </>
  );
}
```

### API Call with Loading State

```typescript
import { useProducts, useCreateProduct } from '@/features/products';

function ProductsPage() {
  const { data: products, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();

  if (isLoading) return <Spinner />;
  if (error) return <Text>Error loading products</Text>;

  const handleCreate = () => {
    createProduct.mutate({ name: 'New Product', price: 10 });
  };

  return (
    <FlatList
      data={products}
      renderItem={({ item }) => <ProductItem product={item} />}
    />
  );
}
```

### Using Cart Store

```typescript
import { useCartStore } from '@/store';

function CartComponent() {
  const { items, addItem, removeItem, getTotal } = useCartStore();

  return (
    <YStack>
      {items.map(item => (
        <CartItem
          key={item.id}
          item={item}
          onRemove={() => removeItem(item.id)}
        />
      ))}
      <Text>Total: ${getTotal()}</Text>
    </YStack>
  );
}
```

## Building for Production

### iOS

```bash
# Build IPA
npx expo build:ios

# Or using EAS Build
eas build --platform ios
```

### Android

```bash
# Build APK
npx expo build:android -t apk

# Build AAB (for Play Store)
npx expo build:android -t app-bundle

# Or using EAS Build
eas build --platform android
```

### Web

```bash
# Export static web build
npx expo export:web

# Files output to web-build/
```

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear cache
npx expo start --clear

# Or
rm -rf node_modules/.cache
npm start -- --reset-cache
```

### TypeScript Errors

```bash
# Check types
npx tsc --noEmit
```

### Dependency Issues

```bash
# Clear and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

### iOS Build Issues

```bash
cd ios
pod install --repo-update
cd ..
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Tamagui Documentation](https://tamagui.dev/docs/intro/introduction)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
