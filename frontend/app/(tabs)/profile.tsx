import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, clearSession } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { toast } from "@/src/Toast";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<any>(null);

  async function load() {
    try {
      const r: any = await api("/donors/me", { auth: true });
      setMe(r.donor);
    } catch { setMe(null); }
  }
  useEffect(() => { load(); }, []);

  async function toggleAvail() {
    const next = me.availability === "Available" ? "Not Available" : "Available";
    try {
      const r: any = await api("/donors/me", { auth: true, method: "PATCH", body: { availability: next } });
      setMe(r.donor);
      toast("success", "Updated", `You are now ${next}`);
    } catch (e: any) { toast("error", "Failed", e.message); }
  }

  async function toggleOptIn() {
    try {
      const r: any = await api("/donors/me", { auth: true, method: "PATCH", body: { donation_opt_in: !me.donation_opt_in } });
      setMe(r.donor);
    } catch (e: any) { toast("error", "Failed", e.message); }
  }

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>You are not registered as a donor yet.</Text>
        <Pressable onPress={() => router.push("/auth/mobile")} style={{ backgroundColor: colors.brandPrimary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Register now</Text>
        </Pressable>
        <Pressable onPress={logout} style={{ marginTop: 20 }}><Text style={{ color: colors.brandPrimary }}>Logout</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: spacing.lg }}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{me.full_name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{me.full_name}</Text>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BloodGroupBadge group={me.blood_group} size="md" />
          <View>
            <Text style={styles.meta}><Ionicons name="location-outline" size={12} /> {me.area}, {me.district}</Text>
            <Text style={styles.meta}>Aadhaar: {me.masked_aadhaar}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.section}>Donation Settings</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Donation Availability</Text>
          <Text style={styles.rowSub}>{me.availability === "Available" ? "🟢 You will be shown as available" : "🔴 You are hidden from search"}</Text>
        </View>
        <Switch testID="availability-switch" value={me.availability === "Available"} onValueChange={toggleAvail} trackColor={{ true: colors.brandPrimary }} />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Receive Blood Request Notifications</Text>
          <Text style={styles.rowSub}>Only opted-in donors receive urgent request alerts.</Text>
        </View>
        <Switch testID="optin-switch" value={!!me.donation_opt_in} onValueChange={toggleOptIn} trackColor={{ true: colors.brandPrimary }} />
      </View>

      <Text style={styles.section}>Account</Text>
      <View style={styles.row}>
        <Ionicons name="mail-outline" size={18} color={colors.onSurfaceSecondary} />
        <Text style={[styles.rowTitle, { marginLeft: 10 }]}>{me.email}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="call-outline" size={18} color={colors.onSurfaceSecondary} />
        <Text style={[styles.rowTitle, { marginLeft: 10 }]}>+91 {me.mobile}</Text>
      </View>

      <Pressable testID="logout-btn" onPress={logout} style={styles.logout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={{ color: colors.error, fontWeight: "700" }}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerCard: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 10 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  section: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.5, textTransform: "uppercase", marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: 10 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  logout: { marginTop: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderWidth: 1, borderColor: colors.error, borderRadius: radius.md },
});
