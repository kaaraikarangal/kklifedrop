import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

export default function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [r, setR] = useState<any>(null);

  useEffect(() => {
    api(`/blood-requests/${id}`).then((x: any) => setR(x.request)).catch(() => {});
  }, [id]);

  if (!r) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable>
      <View style={styles.header}>
        <BloodGroupBadge group={r.blood_group} size="lg" />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.rid}>{r.request_number}</Text>
          <Text style={styles.name}>{r.patient_name}</Text>
          {r.urgency === "Emergency" ? (
            <View style={styles.emergBadge}><Text style={styles.emergText}>🔴 EMERGENCY</Text></View>
          ) : <Text style={{ color: colors.muted, fontSize: 12 }}>{r.urgency}</Text>}
        </View>
      </View>
      <Row label="Hospital" value={r.hospital_name} />
      <Row label="Hospital Area" value={r.hospital_area} />
      <Row label="City" value={r.hospital_city} />
      <Row label="Units Required" value={String(r.units_required)} />
      <Row label="Required Date" value={r.required_date} />
      <Row label="Required Time" value={r.required_time || "—"} />
      <Row label="Requester" value={`${r.requester_name} (${r.relationship})`} />
      <Row label="Status" value={r.status} highlight />
      {r.additional_message ? <Row label="Message" value={r.additional_message} /> : null}
    </ScrollView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.brandPrimary, fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md },
  rid: { fontSize: 12, color: colors.brandPrimary, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  emergBadge: { backgroundColor: colors.brandPrimary, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
  emergText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  rowValue: { color: colors.onSurface, fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 10 },
});
