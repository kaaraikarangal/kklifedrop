import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

const BG_COLOR: Record<string, string> = {
  "A+": "#D32F2F", "A-": "#B71C1C",
  "B+": "#C62828", "B-": "#8E0000",
  "AB+": "#AD1457", "AB-": "#880E4F",
  "O+": "#E53935", "O-": "#B71C1C",
};

export function BloodGroupBadge({ group, size = "md" }: { group: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? 32 : size === "lg" ? 64 : 44;
  const fs = size === "sm" ? 11 : size === "lg" ? 20 : 15;
  const bg = BG_COLOR[group] || colors.brandPrimary;
  return (
    <View style={[styles.badge, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg }]}
      testID={`blood-group-badge-${group}`}
    >
      <Text style={[styles.text, { fontSize: fs }]}>{group}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center" },
  text: { color: "#FFFFFF", fontWeight: "800", letterSpacing: -0.3 },
});
