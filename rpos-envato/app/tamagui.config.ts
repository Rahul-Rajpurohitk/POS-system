import { createTamagui, createTokens } from '@tamagui/core';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens as defaultTokens } from '@tamagui/themes';
import { createAnimations } from '@tamagui/animations-react-native';

const animations = createAnimations({
  bouncy: {
    type: 'spring',
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  lazy: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: 'spring',
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    type: 'spring',
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
  slow: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
});

const headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
  },
});

const bodyFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 15,
    4: 16,
    5: 18,
    6: 20,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
  },
});

// Custom tokens matching current POS app colors
const tokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    // Brand colors
    primary: '#33b9f7',
    primaryLight: '#5ec8f9',
    primaryDark: '#2a9cd4',
    accent: '#ff5066',
    accentLight: '#ff7a8a',
    accentDark: '#e6455a',

    // Status colors
    success: '#4CAF50',
    successLight: '#81C784',
    warning: '#FF9800',
    warningLight: '#FFB74D',
    error: '#F44336',
    errorLight: '#E57373',
    info: '#2196F3',

    // Light theme colors
    backgroundLight: '#f7f7f7',
    containerBgLight: '#FFFFFF',
    textPrimaryLight: '#1B1A1A',
    textSecondaryLight: '#666666',
    borderLight: '#D8D8D8',
    selectBgLight: '#FFFFFF',
    placeholderLight: '#AEABAB',

    // Dark theme colors
    backgroundDark: '#000000',
    containerBgDark: '#27282A',
    textPrimaryDark: '#FFFFFF',
    textSecondaryDark: '#B0B0B0',
    borderDark: '#414141',
    selectBgDark: '#414141',
    placeholderDark: '#B1AEAE',
  },
  space: {
    ...defaultTokens.space,
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
  },
  size: {
    ...defaultTokens.size,
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
  },
  radius: {
    ...defaultTokens.radius,
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    full: 9999,
  },
});

const config = createTamagui({
  defaultFont: 'body',
  animations,
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    light: {
      background: tokens.color.backgroundLight,
      backgroundHover: tokens.color.containerBgLight,
      backgroundPress: tokens.color.selectBgLight,
      backgroundFocus: tokens.color.containerBgLight,
      backgroundStrong: tokens.color.containerBgLight,
      backgroundTransparent: 'transparent',

      color: tokens.color.textPrimaryLight,
      colorHover: tokens.color.textPrimaryLight,
      colorPress: tokens.color.textPrimaryLight,
      colorFocus: tokens.color.textPrimaryLight,
      colorTransparent: 'transparent',

      borderColor: tokens.color.borderLight,
      borderColorHover: tokens.color.primary,
      borderColorFocus: tokens.color.primary,
      borderColorPress: tokens.color.primary,

      shadowColor: 'rgba(0,0,0,0.1)',
      shadowColorHover: 'rgba(0,0,0,0.15)',
      shadowColorPress: 'rgba(0,0,0,0.2)',
      shadowColorFocus: 'rgba(0,0,0,0.15)',

      // Custom semantic colors
      primary: tokens.color.primary,
      primaryHover: tokens.color.primaryLight,
      accent: tokens.color.accent,
      accentHover: tokens.color.accentLight,
      success: tokens.color.success,
      warning: tokens.color.warning,
      error: tokens.color.error,
      info: tokens.color.info,

      placeholderColor: tokens.color.placeholderLight,
      colorSecondary: tokens.color.textSecondaryLight,
      cardBackground: tokens.color.containerBgLight,
    },
    dark: {
      background: tokens.color.backgroundDark,
      backgroundHover: tokens.color.containerBgDark,
      backgroundPress: tokens.color.selectBgDark,
      backgroundFocus: tokens.color.containerBgDark,
      backgroundStrong: tokens.color.containerBgDark,
      backgroundTransparent: 'transparent',

      color: tokens.color.textPrimaryDark,
      colorHover: tokens.color.textPrimaryDark,
      colorPress: tokens.color.textPrimaryDark,
      colorFocus: tokens.color.textPrimaryDark,
      colorTransparent: 'transparent',

      borderColor: tokens.color.borderDark,
      borderColorHover: tokens.color.primary,
      borderColorFocus: tokens.color.primary,
      borderColorPress: tokens.color.primary,

      shadowColor: 'rgba(0,0,0,0.3)',
      shadowColorHover: 'rgba(0,0,0,0.4)',
      shadowColorPress: 'rgba(0,0,0,0.5)',
      shadowColorFocus: 'rgba(0,0,0,0.4)',

      // Custom semantic colors
      primary: tokens.color.primary,
      primaryHover: tokens.color.primaryDark,
      accent: tokens.color.accent,
      accentHover: tokens.color.accentDark,
      success: tokens.color.success,
      warning: tokens.color.warning,
      error: tokens.color.error,
      info: tokens.color.info,

      placeholderColor: tokens.color.placeholderDark,
      colorSecondary: tokens.color.textSecondaryDark,
      cardBackground: tokens.color.containerBgDark,
    },
  },
  tokens,
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
});

export default config;

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
