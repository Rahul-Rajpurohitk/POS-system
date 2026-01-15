import { Platform, useWindowDimensions } from 'react-native';

export interface PlatformInfo {
  isWeb: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isNative: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
}

/**
 * Hook to get platform and responsive information
 */
export function usePlatform(): PlatformInfo {
  const { width, height } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isNative = isIOS || isAndroid;

  // Responsive breakpoints (matching iPad baseline of 1024px)
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  const breakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';

  return {
    isWeb,
    isIOS,
    isAndroid,
    isNative,
    isTablet,
    isDesktop,
    isMobile,
    breakpoint,
    width,
    height,
  };
}

/**
 * Get number of columns for product grid based on screen width
 * Optimized for compact 'xs' size cards (100px width + 8px gap)
 */
export function useProductGridColumns(): number {
  const { width } = useWindowDimensions();

  // For POS screen, account for cart panel (~350px on desktop)
  const availableWidth = width >= 1024 ? width - 380 : width - 32;
  const cardWidth = 108; // 100px card + 8px gap

  const columns = Math.floor(availableWidth / cardWidth);

  // Ensure reasonable bounds
  if (columns >= 8) return 8;
  if (columns >= 6) return 6;
  if (columns >= 5) return 5;
  if (columns >= 4) return 4;
  if (columns >= 3) return 3;
  return 2;
}

export default usePlatform;
