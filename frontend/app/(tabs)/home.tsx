import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

export default function Home() {
  const insets = useSafeAreaInsets();
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [d, r] = await Promise.all([
        api("/donors?limit=6&availability=Available") as Promise<any>,
        api("/blood-requests?limit=4") as Promise<any>,
      ]);
      setDonors(d.donors || []);
      setRequests(r.requests || []);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const emergency = requests.find((r) => r.urgency === "Emergency");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>Welcome back 👋</Text>
            <Text style={styles.brand}>K2 Life Drop</Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/notifications")} testID="header-notifications">
            <Ionicons name="notifications" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={styles.quick}>
          <Pressable testID="home-donate-cta" style={[styles.quickCard, { backgroundColor: colors.brandPrimary }]} onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="water" size={28} color="#FFFFFF" />
            <Text style={styles.quickTitle}>Donate Blood</Text>
            <Text style={styles.quickSub}>Update your availability</Text>
          </Pressable>
          <Pressable testID="home-request-cta" style={[styles.quickCard, { backgroundColor: colors.surfaceInverse }]} onPress={() => router.push("/request-blood")}>
            <Ionicons name="alert-circle" size={28} color="#FFFFFF" />
            <Text style={styles.quickTitle}>Request Blood</Text>
            <Text style={styles.quickSub}>Submit a new request</Text>
          </Pressable>
        </View>

        {/* Emergency alert */}
        {emergency ? (
          <Pressable style={styles.alert} onPress={() => router.push({ pathname: "/request-details", params: { id: emergency.request_number } })} testID="emergency-banner">
            <View style={styles.alertDot}><Ionicons name="warning" size={20} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>EMERGENCY: {emergency.blood_group} needed</Text>
              <Text style={styles.alertDesc}>{emergency.hospital_name} • {emergency.hospital_city}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {/* Available donors */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Available Donors</Text>
          <Pressable onPress={() => router.push("/(tabs)/donors")}><Text style={styles.link}>See all</Text></Pressable>
        </View>
        {donors.map((d) => (
          <Pressable key={d.id} style={styles.donorCard} onPress={() => router.push({ pathname: "/donor-contact", params: { id: d.id } })} testID={`home-donor-${d.id}`}>
            <BloodGroupBadge group={d.blood_group} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{d.full_name}</Text>
              <Text style={styles.meta}>
                <Ionicons name="location-outline" size={11} color={colors.muted} /> {d.area}, {d.district}
              </Text>
              {d.last_donation_date ? <Text style={styles.lastDonation}>Last: {d.last_donation_date}</Text> : null}
            </View>
            <View style={styles.statusPill}>
              <View style={styles.dotGreen} />
              <Text style={styles.statusText}>Available</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  hi: { color: colors.muted, fontSize: 13 },
  brand: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  quick: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickCard: { flex: 1, padding: spacing.lg, borderRadius: radius.lg, gap: 6 },
  quickTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginTop: 8 },
  quickSub: { color: "#FFFFFFCC", fontSize: 12 },
  alert: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brandPrimary, padding: spacing.md, marginHorizontal: spacing.lg, borderRadius: radius.lg, gap: 10, marginBottom: spacing.lg },
  alertDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  alertTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  alertDesc: { color: "#FFFFFFCC", fontSize: 12, marginTop: 2 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  link: { color: colors.brandPrimary, fontWeight: "600", fontSize: 13 },
  donorCard: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.lg, marginBottom: 10, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  lastDonation: { fontSize: 11, color: colors.muted, marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "#E6F4EA" },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.success },
});
