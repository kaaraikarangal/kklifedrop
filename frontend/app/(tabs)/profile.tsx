import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform, Linking } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, clearSession } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { toast } from "@/src/Toast";
import { sendTestLocalNotification } from "@/src/notifications";

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

  async function performDeletion() {
    try {
      await api("/donors/me", { auth: true, method: "DELETE" });
      await clearSession();
      toast("info", "Account Deleted", "Your donor profile and data have been removed.");
      router.replace("/");
    } catch (e: any) {
      toast("error", "Deletion Failed", e.message);
    }
  }

  function confirmDeleteAccount() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Are you sure you want to permanently delete your donor registration and data? This action cannot be undone.")) {
        performDeletion();
      }
      return;
    }
    Alert.alert(
      "Delete Account & Data",
      "Are you sure you want to permanently delete your donor registration and personal data? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Permanently", style: "destructive", onPress: performDeletion },
      ]
    );
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

      {Platform.OS !== "web" ? (
        <Pressable
          testID="test-push-btn"
          style={styles.testPushRow}
          onPress={async () => {
            const ok = await sendTestLocalNotification();
            if (ok) {
              toast("success", "Push Alert Sent", "High-priority sound and banner triggered on your phone.");
            } else {
              toast("info", "Push Diagnostics", "Please ensure notifications are enabled in device settings.");
            }
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="notifications-circle-outline" size={20} color={colors.brandPrimary} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.brandPrimary }}>Test Notification on This Phone</Text>
          </View>
          <Ionicons name="volume-high-outline" size={16} color={colors.brandPrimary} />
        </Pressable>
      ) : null}

      <Text style={styles.section}>Legal & Policies</Text>
      <Pressable
        testID="terms-row"
        style={styles.navRow}
        onPress={() => router.push("/terms")}
      >
        <View style={styles.navRowLeft}>
          <Ionicons name="document-text-outline" size={18} color={colors.onSurface} />
          <Text style={styles.navRowTitle}>Terms & Conditions</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Pressable
        testID="privacy-row"
        style={styles.navRow}
        onPress={() => router.push("/privacy")}
      >
        <View style={styles.navRowLeft}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.onSurface} />
          <Text style={styles.navRowTitle}>Privacy Policy</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Pressable
        testID="developer-row"
        style={styles.navRow}
        onPress={() => router.push("/developer")}
      >
        <View style={styles.navRowLeft}>
          <Ionicons name="code-slash-outline" size={18} color={colors.onSurface} />
          <Text style={styles.navRowTitle}>Developer Information</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Text style={styles.section}>Official Contact & Helpline</Text>
      <View style={styles.orgContactCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Ionicons name="business" size={18} color={colors.brandPrimary} />
          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.onSurface }}>Kaarai Karangal</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 10, lineHeight: 18 }}>
          K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602, India.
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={styles.contactActionBtn}
            onPress={() => Linking.openURL("tel:+919750807463")}
          >
            <Ionicons name="call" size={13} color="#FFFFFF" />
            <Text style={styles.contactActionBtnText}>+91 9750807463</Text>
          </Pressable>
          <Pressable
            style={[styles.contactActionBtn, { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" }]}
            onPress={() => Linking.openURL("mailto:kaaraikarangal@gmail.com")}
          >
            <Ionicons name="mail" size={13} color="#0F172A" />
            <Text style={[styles.contactActionBtnText, { color: "#0F172A" }]}>Email</Text>
          </Pressable>
        </View>
      </View>

      <Pressable testID="logout-btn" onPress={logout} style={styles.logout}>
        <Ionicons name="log-out-outline" size={18} color={colors.onSurface} />
        <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Logout</Text>
      </Pressable>

      <Pressable testID="delete-account-btn" onPress={confirmDeleteAccount} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color={colors.error} />
        <Text style={{ color: colors.error, fontWeight: "700", fontSize: 13 }}>Delete My Account & Personal Data</Text>
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
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: 10 },
  navRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginRight: 8 },
  navRowTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  orgContactCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  contactActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.brandPrimary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill },
  contactActionBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  logout: { marginTop: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md },
  deleteBtn: { marginTop: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderWidth: 1, borderColor: "#FCA5A5", borderRadius: radius.md, backgroundColor: "#FEF2F2" },
  testPushRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: radius.md, padding: 12, marginBottom: 10 },
});
