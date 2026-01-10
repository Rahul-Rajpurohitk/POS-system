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
 */
export function useProductGridColumns(): number {
  const { width } = useWindowDimensions();

  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 480) return 3;
  return 2;
}

export default usePlatform;
