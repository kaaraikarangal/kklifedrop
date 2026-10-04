import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { colors, radius, spacing } from "../theme";

const LOGO_FULL = require("@/assets/images/kk_life_drop_logo.png");
const LOGO_SYMBOL = require("@/assets/images/kk_life_drop_symbol.png");
const BANNER_IMG = require("@/assets/images/kaarai_karangal_banner.png");

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "hero";
  variant?: "horizontal" | "stacked" | "emblem" | "banner";
  showSubtext?: boolean;
  lightText?: boolean;
}

export function BrandLogo({
  size = "md",
  variant = "stacked",
  showSubtext = false,
  lightText = false,
}: BrandLogoProps) {
  if (variant === "banner") {
    return (
      <View style={styles.bannerContainer}>
        <Image
          source={BANNER_IMG}
          style={styles.bannerImage}
          resizeMode="contain"
          accessibilityLabel="Kaarai Karangal Samooga Sevai Amaippu"
        />
      </View>
    );
  }

  const logoDims = {
    sm: { width: 38, height: 38 },
    md: { width: 56, height: 56 },
    lg: { width: 88, height: 88 },
    hero: { width: 110, height: 110 },
  }[size];

  if (variant === "emblem") {
    return (
      <Image
        source={LOGO_SYMBOL}
        style={[logoDims, { borderRadius: radius.md }]}
        resizeMode="contain"
        accessibilityLabel="KK Life Drop Logo"
      />
    );
  }

  if (variant === "horizontal") {
    return (
      <View style={styles.horizontalRow}>
        <Image
          source={LOGO_SYMBOL}
          style={[logoDims, { borderRadius: radius.sm }]}
          resizeMode="contain"
        />
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={[styles.titleKK, lightText && styles.textLight]}>KK </Text>
            <Text style={[styles.titleLife, lightText && styles.textLight]}>Life </Text>
            <Text style={[styles.titleDrop, lightText && styles.textLight]}>Drop</Text>
          </View>
          <Text style={[styles.tagline, lightText && styles.subLight]}>
            DONATE BLOOD, SAVE LIVES
          </Text>
          {showSubtext ? (
            <Text style={[styles.subOrg, lightText && styles.subLight]}>
              Kaarai Karangal Samooga Sevai Amaippu
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // Stacked variant
  return (
    <View style={styles.stackedWrap}>
      <Image
        source={LOGO_SYMBOL}
        style={[logoDims, { borderRadius: radius.md }]}
        resizeMode="contain"
      />
      <View style={styles.titleRowStacked}>
        <Text style={[styles.titleKK, size === "hero" && styles.heroText, lightText && styles.textLight]}>
          KK{" "}
        </Text>
        <Text style={[styles.titleLife, size === "hero" && styles.heroText, lightText && styles.textLight]}>
          Life{" "}
        </Text>
        <Text style={[styles.titleDrop, size === "hero" && styles.heroText, lightText && styles.textLight]}>
          Drop
        </Text>
      </View>
      <Text style={[styles.tagline, size === "hero" && styles.heroTagline, lightText && styles.subLight]}>
        DONATE BLOOD, SAVE LIVES
      </Text>
      {showSubtext ? (
        <View style={styles.ngoBadge}>
          <Text style={styles.ngoBadgeText}>
            Kaarai Karangal Samooga Sevai Amaippu • Reg: 31/2025
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xs,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerImage: {
    width: "100%",
    height: 70,
  },
  horizontalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  textCol: {
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  titleRowStacked: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.xs,
  },
  stackedWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleKK: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.brandBlue,
    letterSpacing: -0.5,
  },
  titleLife: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.brandGreen,
    letterSpacing: -0.5,
  },
  titleDrop: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.brandRed,
    letterSpacing: -0.5,
  },
  heroText: {
    fontSize: 28,
  },
  tagline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.muted,
    marginTop: 2,
    textTransform: "uppercase",
  },
  heroTagline: {
    fontSize: 11,
    letterSpacing: 2,
  },
  subOrg: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  ngoBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ngoBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  textLight: {
    color: "#FFFFFF",
  },
  subLight: {
    color: "rgba(255, 255, 255, 0.85)",
  },
});
