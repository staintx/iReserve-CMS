/**
 * Caezelle's Food, Catering & Services — Mobile Design System Tokens
 * Source of truth: frontend/src/styles/globals.css & customer.css
 */
import { Platform } from "react-native";

export const colors = {
  // Brand Palette
  primary: "#2C4B8A",
  primaryHover: "#1E3563",
  primaryLight: "#EEF3FB",
  powder: "#F1F5F9",
  powderBlue: "#D6E4F7",
  
  secondary: "#7B583C",
  secondaryLight: "#F7F4EE",
  
  accent: "#D2B67C",
  accentLight: "#E8D4A8",
  accentDark: "#B8994E",
  
  brownDark: "#5C402B",
  brownMedium: "#7B583C",
  
  cream: "#E0CFAD",
  creamLight: "#F7F4EE",

  // Functional / Customer Portal Neutrals
  background: "#F8FAFC",
  backgroundWhite: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  
  foreground: "#0F172A",
  foregroundMuted: "#64748B",
  foregroundBrown: "#5C402B",
  textSubtle: "#94A3B8",
  textDisabled: "#CBD5E1",

  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  borderBrand: "rgba(92, 64, 43, 0.12)",
  borderFocus: "#2C4B8A",

  inputBackground: "#F8FAFC",
  inputBorder: "#E2E8F0",

  // Status: Emerald / Confirmed / Paid
  success: "#05603A",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#065F46",

  // Status: Amber / In Review / Payment Alert
  warning: "#D97706",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
  warningText: "#92400E",
  warningDark: "#B45309",

  // Status: Error / Rejected / Cancelled
  error: "#C0392B",
  errorLight: "#FDEDEC",
  errorBorder: "#F5B7B1",

  // Status: Info / Quotation Ready
  info: "#2C4B8A",
  infoLight: "#EEF3FB",
  infoBorder: "#BFDBFE",

  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(15, 23, 42, 0.45)",
};

export const typography = {
  fontFamilies: {
    regular: Platform.select({ ios: "WorkSans_400Regular", android: "WorkSans_400Regular", default: "System" }),
    medium: Platform.select({ ios: "WorkSans_500Medium", android: "WorkSans_500Medium", default: "System" }),
    semiBold: Platform.select({ ios: "WorkSans_600SemiBold", android: "WorkSans_600SemiBold", default: "System" }),
    bold: Platform.select({ ios: "WorkSans_700Bold", android: "WorkSans_700Bold", default: "System" }),
    serif: Platform.select({ ios: "PlayfairDisplay_600SemiBold", android: "PlayfairDisplay_600SemiBold", default: "Georgia" }),
    serifBold: Platform.select({ ios: "PlayfairDisplay_700Bold", android: "PlayfairDisplay_700Bold", default: "Georgia" }),
  },
  sizes: {
    xxs: 10,
    xs: 11,
    sm: 13,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 28,
    display: 32,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 40,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  none: {},
  sm: Platform.select({
    web: { boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
  }),
  md: Platform.select({
    web: { boxShadow: "0 4px 12px rgba(15, 23, 42, 0.07)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
      elevation: 6,
    },
  }),
};

export default {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};
