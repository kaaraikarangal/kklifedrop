import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacing } from "@/src/theme";
import { api, MOBILE_KEY, LEGACY_MOBILE_KEY, DONOR_KEY, LEGACY_DONOR_KEY, getActiveSession } from "@/src/api";
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
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"mine" | "all">("mine");

  async function resolveUserMobile(): Promise<string | null> {
    try {
      const session = await getActiveSession();
      if (session?.mobile) return session.mobile.replace(/\D/g, "").slice(-10);

      const m = (await AsyncStorage.getItem(MOBILE_KEY)) || (await AsyncStorage.getItem(LEGACY_MOBILE_KEY));
      if (m) return m.replace(/\D/g, "").slice(-10);

      const donorStr = (await AsyncStorage.getItem(DONOR_KEY)) || (await AsyncStorage.getItem(LEGACY_DONOR_KEY));
      if (donorStr) {
        try {
          const parsed = JSON.parse(donorStr);
          if (parsed?.mobile) return parsed.mobile.replace(/\D/g, "").slice(-10);
        } catch {}
      }
    } catch {}
    return null;
  }

  async function load() {
    setLoading(true);
    try {
      const mobile = await resolveUserMobile();

      if (tab === "mine") {
        // Read any locally submitted request numbers from this device
        let localReqNumbers: string[] = [];
        try {
          const stored = await AsyncStorage.getItem("kk_my_request_numbers");
          if (stored) localReqNumbers = JSON.parse(stored);
        } catch {}

        // If user is not logged in / has no mobile and no local requests, My Requests is strictly empty
        if (!mobile && localReqNumbers.length === 0) {
          setRequests([]);
          setLoading(false);
          return;
        }

        let myRequests: any[] = [];
        if (mobile) {
          const r: any = await api(`/blood-requests?mobile=${mobile}`);
          myRequests = r?.requests || [];
        }

        // Merge any locally tracked request numbers not already returned
        if (localReqNumbers.length > 0) {
          const existingIds = new Set(myRequests.map((x: any) => x.request_number || x.id));
          const missing = localReqNumbers.filter((n) => !existingIds.has(n));
          if (missing.length > 0) {
            try {
              const rMissing: any = await api(`/blood-requests?request_numbers=${missing.join(",")}`);
              if (rMissing?.requests?.length) {
                myRequests = [...myRequests, ...rMissing.requests];
              }
            } catch {}
          }
        }

        // Deduplicate and sort by created_at descending
        const seen = new Set();
        const unique = myRequests.filter((item) => {
          const key = item.request_number || item.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRequests(unique);
      } else {
        // All Requests: fetch all public blood requests without user filter
        const r: any = await api("/blood-requests");
        setRequests(r?.requests || []);
      }
    } catch (e) {
      console.error("Failed to load blood requests:", e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [tab])
  );

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
        keyExtractor={(r) => r.id || r.request_number}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brandPrimary} colors={[colors.brandPrimary]} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            </View>
          ) : tab === "mine" ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="water-outline" size={36} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>No Personal Requests</Text>
              <Text style={styles.emptySub}>
                Requests you submit for blood will appear here so you can track matching donors and fulfillment in real time.
              </Text>
              <Pressable style={styles.emptyActionBtn} onPress={() => router.push("/request-blood")}>
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Request Blood Now</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="file-tray-outline" size={36} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>No Blood Requests</Text>
              <Text style={styles.emptySub}>There are currently no active public blood requests.</Text>
            </View>
          )
        }
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
                  {r.urgency === "Emergency" ? (
                    <View style={styles.emergBadge}>
                      <Text style={styles.emergText}>EMERGENCY</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  {r.hospital_name} • {r.hospital_city}
                </Text>
                <Text style={styles.sub}>
                  Req ID: {r.request_number} • {r.units_required} {r.units_required === 1 ? "unit" : "units"}
                </Text>
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
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 40, paddingHorizontal: spacing.xl },
  emptyIconBg: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurface, marginBottom: 6, textAlign: "center" },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 18, marginBottom: spacing.lg },
  emptyActionBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brandPrimary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.pill },
  emptyActionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
