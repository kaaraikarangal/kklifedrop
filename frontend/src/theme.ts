// Design tokens for K2 Life Drop - Blood donation platform
// Blood-red primary with clean white surface, iOS-native clean personality.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FFFFFF",
  onSurface: "#1C1C1E",
  surfaceSecondary: "#F5F5F5",
  onSurfaceSecondary: "#3A3A3C",
  surfaceTertiary: "#EEEEEE",
  onSurfaceTertiary: "#48484A",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#FFFFFF",
  muted: "#8E8E93",

  // Brand (Blood Red)
  brand: "#D32F2F",
  onBrand: "#FFFFFF",
  brandPrimary: "#D32F2F",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E53935",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FFEBEE",
  onBrandTertiary: "#D32F2F",

  // Status
  success: "#2E7D32",
  onSuccess: "#FFFFFF",
  warning: "#F57C00",
  onWarning: "#FFFFFF",
  error: "#D32F2F",
  onError: "#FFFFFF",
  info: "#616161",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#E5E5EA",
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
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
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
