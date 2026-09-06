/**
 * iReserve — Catering Management System Design System Tokens
 * Style: Crisp White & Royal Blue with Pure Black Typography
 * Inspired by Glovo geometric aesthetics & Baemin navigation
 */
import { Platform } from "react-native";

export const colors = {
  // Brand Palette (White & Royal Blue)
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  primaryDark: "#1E40AF",
  primaryLight: "#EFF6FF",
  primaryBorder: "#BFDBFE",

  secondary: "#1E3A8A",
  secondaryLight: "#F0F7FF",

  accent: "#3B82F6",
  accentLight: "#DBEAFE",
  accentDark: "#1D4ED8",
  accentGold: "#D2B67C", // Brand logo gold accent

  powder: "#F1F5F9",
  powderBlue: "#DBEAFE",

  // Core Surfaces & Backgrounds
  background: "#F8FAFC",
  backgroundWhite: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",

  // Typography (Pure Black & Crisp Neutrals)
  foreground: "#000000",
  foregroundDark: "#0F172A",
  foregroundMuted: "#4B5563",
  foregroundBrown: "#000000",
  textSubtle: "#6B7280",
  textDisabled: "#9CA3AF",

  // Borders & Inputs
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  borderBrand: "rgba(37, 99, 235, 0.12)",
  borderFocus: "#2563EB",

  inputBackground: "#FFFFFF",
  inputBorder: "#E2E8F0",
  disabled: "#E2E8F0",
  disabledText: "#9CA3AF",

  // Status: Emerald / Confirmed / Paid
  success: "#059669",
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
  error: "#DC2626",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",

  // Status: Info / Quotation Ready
  info: "#2563EB",
  infoLight: "#EFF6FF",
  infoBorder: "#BFDBFE",

  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(15, 23, 42, 0.5)",
};

export const typography = {
  fontFamilies: {
    regular: Platform.select({
      ios: "PlusJakartaSans_400Regular",
      android: "PlusJakartaSans_400Regular",
      default: "PlusJakartaSans_400Regular, WorkSans_400Regular, system-ui, sans-serif",
    }),
    medium: Platform.select({
      ios: "PlusJakartaSans_500Medium",
      android: "PlusJakartaSans_500Medium",
      default: "PlusJakartaSans_500Medium, WorkSans_500Medium, system-ui, sans-serif",
    }),
    semiBold: Platform.select({
      ios: "PlusJakartaSans_600SemiBold",
      android: "PlusJakartaSans_600SemiBold",
      default: "PlusJakartaSans_600SemiBold, WorkSans_600SemiBold, system-ui, sans-serif",
    }),
    bold: Platform.select({
      ios: "PlusJakartaSans_700Bold",
      android: "PlusJakartaSans_700Bold",
      default: "PlusJakartaSans_700Bold, WorkSans_700Bold, system-ui, sans-serif",
    }),
    extraBold: Platform.select({
      ios: "PlusJakartaSans_800ExtraBold",
      android: "PlusJakartaSans_800ExtraBold",
      default: "PlusJakartaSans_800ExtraBold, WorkSans_700Bold, system-ui, sans-serif",
    }),
    serif: Platform.select({
      ios: "PlayfairDisplay_600SemiBold",
      android: "PlayfairDisplay_600SemiBold",
      default: "Georgia",
    }),
    serifBold: Platform.select({
      ios: "PlayfairDisplay_700Bold",
      android: "PlayfairDisplay_700Bold",
      default: "Georgia",
    }),
  },
  get fontFamily() {
    return this.fontFamilies;
  },
  sizes: {
    xxs: 10,
    xs: 12,
    sm: 13,
    base: 15,
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
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
  dock: 32,
  full: 9999,
};

export const shadows = {
  none: {},
  sm: Platform.select({
    web: { boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
  }),
  md: Platform.select({
    web: { boxShadow: "0 4px 16px rgba(37, 99, 235, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 4,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: "0 10px 28px rgba(15, 23, 42, 0.10)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
      elevation: 8,
    },
  }),
  dock: Platform.select({
    web: { boxShadow: "0 12px 36px rgba(15, 23, 42, 0.14)" },
    default: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 10,
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
