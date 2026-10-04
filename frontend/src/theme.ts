// Design tokens for K2 Life Drop - Blood donation platform
// Blood-red primary with clean white surface, iOS-native clean personality.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FFFFFF",
  onSurface: "#0F172A",
  surfaceSecondary: "#F8FAFC",
  onSurfaceSecondary: "#334155",
  surfaceTertiary: "#F1F5F9",
  onSurfaceTertiary: "#475569",
  surfaceInverse: "#0F172A",
  onSurfaceInverse: "#FFFFFF",
  muted: "#64748B",

  // Brand Palette (Derived from KK Life Drop & Kaarai Karangal Identity)
  brand: "#D31027", // Blood Ruby Red
  onBrand: "#FFFFFF",
  brandPrimary: "#D31027",
  onBrandPrimary: "#FFFFFF",
  brandPrimaryDark: "#B30A1D",
  brandPrimaryLight: "#FFF1F2",
  brandSecondary: "#0052D4", // Ocean Blue (Care Hand)
  onBrandSecondary: "#FFFFFF",
  brandSecondaryLight: "#EFF6FF",
  brandTertiary: "#00A859", // Emerald Green (Leaf of Hope)
  onBrandTertiary: "#FFFFFF",
  brandTertiaryLight: "#ECFDF5",

  // Explicit color aliases
  brandRed: "#D31027",
  brandBlue: "#0052D4",
  brandGreen: "#00A859",

  // Status
  success: "#00A859",
  onSuccess: "#FFFFFF",
  warning: "#EA580C",
  onWarning: "#FFFFFF",
  error: "#D31027",
  onError: "#FFFFFF",
  info: "#0052D4",
  onInfo: "#FFFFFF",

  // Lines & borders
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  divider: "#E2E8F0",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = themes.light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
