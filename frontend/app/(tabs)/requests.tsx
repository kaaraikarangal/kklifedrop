import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacing } from "@/src/theme";
import { api, MOBILE_KEY } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

const STATUS_COLOR: Record<string, string> = {
  "Pending": "#F57C00",
  "Admin Reviewing": "#1976D2",
  "Donors Notified": "#1976D2",
  "Donor Found": "#2E7D32",
  "Fulfilled": "#2E7D32",
  "Cancelled": "#8E8E93",
  "Expired": "#8E8E93",
  "Partially Fulfilled": "#F57C00",
};

export default function Requests() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<"mine" | "all">("mine");

  async function load() {
    const mobile = await AsyncStorage.getItem(MOBILE_KEY);
    const q = tab === "mine" && mobile ? `?mobile=${mobile}` : "";
    const r: any = await api(`/blood-requests${q}`);
    setRequests(r.requests || []);
  }
  useEffect(() => { load(); }, [tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Blood Requests</Text>
          <Pressable testID="new-request-btn" style={styles.newBtn} onPress={() => router.push("/request-blood")}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.segment}>
          <Pressable testID="tab-mine" onPress={() => setTab("mine")} style={[styles.segBtn, tab === "mine" && styles.segActive]}>
            <Text style={[styles.segText, tab === "mine" && styles.segTextActive]}>My Requests</Text>
          </Pressable>
          <Pressable testID="tab-all" onPress={() => setTab("all")} style={[styles.segBtn, tab === "all" && styles.segActive]}>
            <Text style={[styles.segText, tab === "all" && styles.segTextActive]}>All Requests</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No requests yet.</Text>}
        renderItem={({ item: r }) => (
          <Pressable
            testID={`request-card-${r.id}`}
            style={[styles.card, r.urgency === "Emergency" && styles.cardEmergency]}
            onPress={() => router.push({ pathname: "/request-details", params: { id: r.request_number } })}
          >
            <View style={styles.cardRow}>
              <BloodGroupBadge group={r.blood_group} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name}>{r.patient_name}</Text>
                  {r.urgency === "Emergency" ? <View style={styles.emergBadge}><Text style={styles.emergText}>EMERGENCY</Text></View> : null}
                </View>
                <Text style={styles.meta}>{r.hospital_name} • {r.hospital_city}</Text>
                <Text style={styles.sub}>Req ID: {r.request_number} • {r.units_required} units</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[r.status] || colors.muted) + "22" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] || colors.muted }]}>{r.status}</Text>
              </View>
              <Text style={styles.date}>{new Date(r.created_at).toLocaleDateString()}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: radius.sm },
  segActive: { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segText: { color: colors.onSurfaceSecondary, fontWeight: "600", fontSize: 13 },
  segTextActive: { color: colors.onSurface },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginTop: 10 },
  cardEmergency: { borderWidth: 1.5, borderColor: colors.brandPrimary },
  cardRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  sub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  emergBadge: { backgroundColor: colors.brandPrimary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emergText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: "700" },
  date: { fontSize: 11, color: colors.muted },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
