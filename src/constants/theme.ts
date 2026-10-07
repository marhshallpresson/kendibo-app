/**
 * KENDIBO Design System & Theme Tokens
 * Brand: Primary #0463ee, Secondary #002a63, White.
 * Display face Borscha is licensed (no web file) → Nunito ExtraBold/Black
 * stands in for display type. Body: Nunito.
 */

export interface ColorTokens {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;

  // Semantic
  success: string;
  error: string;
  warning: string;
  info: string;

  // Surfaces & Backgrounds
  background: string;
  surface: string;
  surfaceCard: string;
  surfaceHover: string;
  inputFill: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderSubtle: string;

  // Status-specific badges
  badgeGreenBg: string;
  badgeGreenText: string;
  badgeBlueBg: string;
  badgeBlueText: string;
  badgeOrangeBg: string;
  badgeOrangeText: string;
  badgeRedBg: string;
  badgeRedText: string;
}

export const lightColors: ColorTokens = {
  primary: '#0463ee',
  primaryLight: '#E7EFFF',
  primaryDark: '#003FA8',
  secondary: '#002a63',
  accent: '#0463ee',

  success: '#07BD74',
  error: '#F75555',
  warning: '#FFB800',
  info: '#0463ee',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceCard: '#F5F7FA',
  surfaceHover: '#EBEFF5',
  inputFill: '#F4F6FB',

  textPrimary: '#0F1E38',
  textSecondary: '#5B6B8C',
  textMuted: '#8FA0BF',
  textInverse: '#FFFFFF',

  border: '#E2E8F5',
  borderSubtle: '#EFF2F8',

  badgeGreenBg: '#E8F8F2',
  badgeGreenText: '#07BD74',
  badgeBlueBg: '#E7EFFF',
  badgeBlueText: '#0463ee',
  badgeOrangeBg: '#E7EAF6',
  badgeOrangeText: '#002a63',
  badgeRedBg: '#FEECEC',
  badgeRedText: '#F75555',
};

export const darkColors: ColorTokens = {
  primary: '#4D8DFF',
  primaryLight: '#16305E',
  primaryDark: '#003FA8',
  secondary: '#9DBFFF',
  accent: '#4D8DFF',

  success: '#07BD74',
  error: '#F75555',
  warning: '#FFB800',
  info: '#4D8DFF',

  background: '#0A1730',
  surface: '#10203F',
  surfaceCard: '#10203F',
  surfaceHover: '#18294D',
  inputFill: '#16263F',

  textPrimary: '#FFFFFF',
  textSecondary: '#9DB4D8',
  textMuted: '#5F7095',
  textInverse: '#0A1730',

  border: '#22345A',
  borderSubtle: '#18294D',

  badgeGreenBg: '#0A3323',
  badgeGreenText: '#07BD74',
  badgeBlueBg: '#11295E',
  badgeBlueText: '#8FB4FF',
  badgeOrangeBg: '#232E52',
  badgeOrangeText: '#9DBFFF',
  badgeRedBg: '#3B1717',
  badgeRedText: '#F75555',
};

// Service-tile tint variety (mockup language) — soft pastel chips behind
// category icons. Primary actions stay Kendibo blue.
export const tileTints = [
  '#EFE7FF', // violet
  '#E7EFFF', // brand blue
  '#FFF3DC', // amber
  '#FFEECB', // yellow
  '#FFE7E7', // red
  '#E3F5EC', // green
  '#DFF3F3', // teal
  '#E9E4FB', // purple-grey (More)
];

export const tileTintIcons = [
  '#6D3DF5',
  '#0463ee',
  '#E8930C',
  '#D9A400',
  '#E5484D',
  '#12A56B',
  '#0E9BA8',
  '#7A5AF8',
];

// Font families (loaded in src/app/_layout.tsx via expo-font).
// Borscha (display) is a licensed face with no app file — Nunito ExtraBold
// and Nunito Black stand in for display type.
export const fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  semiBold: 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
  display: 'Nunito_800ExtraBold', // Borscha stand-in
};

export const typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  subtitle1: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  subtitle2: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  body1: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  body2: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  micro: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400' as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  modalSheet: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    boxShadow: '0px 8px 16px rgba(0,0,0,0.12)',
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    boxShadow: '0px -4px 12px rgba(0,0,0,0.15)',
  },
};

export const theme = {
  light: {
    colors: lightColors,
    typography,
    spacing,
    radii,
    shadows,
  },
  dark: {
    colors: darkColors,
    typography,
    spacing,
    radii,
    shadows,
  },
};

export type Theme = typeof theme.light;
