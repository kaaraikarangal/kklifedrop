import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform, Linking, Modal, TextInput, ActivityIndicator, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, clearSession } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { toast } from "@/src/Toast";
import { sendTestLocalNotification, syncPushTokenWithBackend } from "@/src/notifications";
import { KaaraiKarangalDonationModal } from "@/src/components/KaaraiKarangalDonationModal";
import { formatDateToDDMMYYYY } from "@/src/utils/dateUtils";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<any>(null);
  const [bloodDonations, setBloodDonations] = useState<any[]>([]);
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [selectedDonationAmount, setSelectedDonationAmount] = useState(500);

  const openDonation = (amount: number = 500) => {
    setSelectedDonationAmount(amount);
    setDonationModalVisible(true);
  };

  async function load() {
    try {
      const r: any = await api("/donors/me", { auth: true });
      setMe(r.donor);

      const donRes: any = await api("/donors/me/donations", { auth: true }).catch(() => ({ donations: [] }));
      setBloodDonations(donRes.donations || []);
    } catch {
      setMe(null);
    }
  }

  useEffect(() => { load(); }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      syncPushTokenWithBackend().catch(() => {});
    }, [])
  );

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
          <Text style={styles.avatarText}>{me.full_name ? me.full_name.charAt(0) : "D"}</Text>
        </View>
        <Text style={styles.name}>{me.full_name}</Text>

        {/* Unique Donor ID Badge */}
        <View style={styles.donorIdBadgeWrap}>
          <View style={styles.donorIdBadge}>
            <Ionicons name="id-card" size={13} color="#2563EB" />
            <Text style={styles.donorIdBadgeText}>{me.donor_number || "KKLD0001"}</Text>
          </View>
          <View style={styles.verifiedDonorBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#10B981" />
            <Text style={styles.verifiedDonorText}>Verified Donor</Text>
          </View>
        </View>

        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BloodGroupBadge group={me.blood_group} size="md" />
          <View>
            <Text style={styles.meta}><Ionicons name="location-outline" size={12} /> {me.area}, {me.district}</Text>
            {/*
            // [AADHAAR_FEATURE] Uncomment to display Aadhaar on profile upon release:
            <Text style={styles.meta}>Aadhaar: {me.masked_aadhaar}</Text>
            */}
          </View>
        </View>

        <Pressable
          testID="profile-edit-header-btn"
          onPress={() => router.push("/edit-profile")}
          style={styles.editBtn}
        >
          <Ionicons name="create-outline" size={14} color="#FFFFFF" />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Account Management</Text>
      <Pressable
        testID="profile-edit-row"
        style={styles.navRow}
        onPress={() => router.push("/edit-profile")}
      >
        <View style={styles.navRowLeft}>
          <Ionicons name="person-circle-outline" size={20} color={colors.brandPrimary} />
          <View>
            <Text style={styles.navRowTitle}>Edit Profile Information</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>Name, Blood Group, Location, Contact</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Pressable
        testID="profile-donation-activity-row"
        style={[styles.navRow, { marginTop: 10 }]}
        onPress={() => router.push("/donation-activity")}
      >
        <View style={styles.navRowLeft}>
          <Ionicons name="water" size={20} color={colors.brandPrimary} />
          <View>
            <Text style={styles.navRowTitle}>Donation Activity</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {bloodDonations.length} recorded • {me.in_cooldown ? `${me.cooldown_days_left}d Rest active` : "Eligible to donate"}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {me.in_cooldown ? (
            <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#B45309" }}>{me.cooldown_days_left}d Rest</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#065F46" }}>Eligible</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>

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

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionNoMargin}>Support Kaarai Karangal</Text>
        <Pressable
          testID="profile-view-donate-page-btn"
          onPress={() => router.push("/donate")}
          hitSlop={8}
        >
          <Text style={styles.detailsLink}>View Details ›</Text>
        </Pressable>
      </View>

      <View style={styles.donationHeroWrap}>
        <LinearGradient
          colors={["#0F172A", "#1E1B4B", "#2D0A14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.donationHeroCard}
        >
          {/* Header: Icon + Title & Tagline + Badge */}
          <View style={styles.supportHeaderRow}>
            <View style={styles.supportHeaderLeft}>
              <View style={styles.supportHeartBadge}>
                <Ionicons name="heart" size={16} color="#EF4444" />
              </View>
              <View style={styles.supportHeaderTextWrap}>
                <View style={styles.supportTitleBadgeRow}>
                  <Text style={styles.supportTitle}>Support Kaarai Karangal</Text>
                  <View style={styles.supportOrgTag}>
                    <Text style={styles.supportOrgTagText}>REG: 31/2025</Text>
                  </View>
                </View>
                <Text style={styles.supportSub} numberOfLines={1} ellipsizeMode="tail">
                  Powering emergency blood courier & patient assistance in Karaikal
                </Text>
              </View>
            </View>
          </View>

          {/* Middle Row: Quick Chips + Primary CTA Button */}
          <View style={styles.supportActionRow}>
            <View style={styles.supportChipsGroup}>
              {[100, 250, 500, 1000].map((amt) => (
                <Pressable
                  key={amt}
                  style={styles.supportChip}
                  onPress={() => openDonation(amt)}
                  testID={`profile-donate-chip-${amt}`}
                >
                  <Text style={styles.supportChipText}>₹{amt}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.supportDonateBtn}
              onPress={() => openDonation(selectedDonationAmount)}
              testID="profile-donate-razorpay-cta"
            >
              <LinearGradient
                colors={["#DC2626", "#B91C1C"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.supportDonateBtnText}>Donate</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </Pressable>
          </View>

          {/* Micro Trust Strip */}
          <View style={styles.supportMicroTrust}>
            <View style={styles.supportTrustItem}>
              <Ionicons name="shield-checkmark" size={11} color="#FBBF24" />
              <Text style={styles.supportTrustText}>80G Tax Exemption</Text>
            </View>
            <View style={styles.supportTrustDot} />
            <View style={styles.supportTrustItem}>
              <Ionicons name="lock-closed" size={11} color="#38BDF8" />
              <Text style={styles.supportTrustText}>Instant Official Receipt</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

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

      {/* Kaarai Karangal Razorpay Donation Modal */}
      <KaaraiKarangalDonationModal
        visible={donationModalVisible}
        onClose={() => setDonationModalVisible(false)}
        initialAmount={selectedDonationAmount}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerCard: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 10 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    marginTop: 14,
    shadowColor: colors.brandPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  editBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionNoMargin: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.brandPrimary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailsLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  donationHeroWrap: {
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  donationHeroCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  supportHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  supportHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  supportHeartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  supportHeaderTextWrap: {
    flex: 1,
  },
  supportTitleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  supportOrgTag: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  supportOrgTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#34D399",
    letterSpacing: 0.5,
  },
  supportSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
    lineHeight: 14,
  },
  supportActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  supportChipsGroup: {
    flexDirection: "row",
    gap: 5,
    flex: 1,
  },
  supportChip: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  supportChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  supportDonateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  supportDonateBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  supportMicroTrust: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 2,
  },
  supportTrustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  supportTrustText: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  supportTrustDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "#475569",
  },
  // Donor ID Badge Styles
  donorIdBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  donorIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  donorIdBadgeText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  verifiedDonorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  verifiedDonorText: {
    color: "#065F46",
    fontSize: 11,
    fontWeight: "700",
  },

  // History Section Styles
  historySectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  historyBadgePill: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  historyBadgePillText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
  },
  btnAddHistoryRecord: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  btnAddHistoryRecordText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Cooldown Status Card
  cooldownCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: 12,
  },
  cooldownCardResting: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  cooldownCardEligible: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  cooldownIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cooldownCardTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  cooldownCardSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },

  // Timeline Styles
  donationTimelineBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  emptyDonationBox: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyDonationIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyDonationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 4,
  },
  emptyDonationSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  emptyLogBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  // Clean Activity Summary Card
  activitySummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  activityCardSub: {
    fontSize: 11.5,
    color: colors.muted,
  },
  cooldownMiniBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  cooldownMiniResting: {
    backgroundColor: "#FEF3C7",
  },
  cooldownMiniEligible: {
    backgroundColor: "#D1FAE5",
  },
  cooldownMiniText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  cooldownBannerText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
    flex: 1,
  },
  activityButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  historyToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  historyToggleBtnActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  historyToggleBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
  },
  historyToggleBtnTextActive: {
    color: colors.brandPrimary,
    fontWeight: "800",
  },
  btnRecordDonationPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  btnRecordDonationPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  // Collapsible Timeline
  collapsibleTimelineBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyDonationMiniBox: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  emptyDonationMiniText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 6,
  },
  emptyDonationMiniSub: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 16,
  },
  timelineCardModern: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineHeadModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timelineDotModern: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDateModern: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
  },
  timelineBodyModern: {
    marginTop: 2,
  },
  timelineHospitalModern: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurface,
  },
  timelineNotesModern: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 2,
  },
  timelineBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  timelineBadgeAdmin: {
    backgroundColor: "#EFF6FF",
  },
  timelineBadgeSelf: {
    backgroundColor: "#F1F5F9",
  },
  timelineBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.muted,
  },
  // Photo proof in timeline
  proofThumbRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    padding: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  proofThumbImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
  },
  proofThumbTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  proofThumbTapToView: {
    fontSize: 10,
    color: colors.brandPrimary,
    fontWeight: "600",
    marginTop: 1,
  },
  noProofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  noProofText: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.onSurface,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
  },
  unitChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurface,
  },
  unitChipTextActive: {
    color: "#FFFFFF",
  },
  proofUploadRow: {
    flexDirection: "row",
    gap: 10,
  },
  proofPickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  proofPickerBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  proofSelectedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.md,
    padding: 8,
  },
  proofPreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  proofSelectedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  proofSelectedSub: {
    fontSize: 10.5,
    color: "#15803D",
  },
  proofRemoveBtn: {
    padding: 8,
  },
  uploadStatusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.sm,
    padding: 8,
    marginBottom: 8,
  },
  uploadStatusStripText: {
    fontSize: 11.5,
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Image Preview Modal Styles
  imagePreviewModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  imagePreviewContainer: {
    width: "100%",
    maxWidth: 600,
    height: "80%",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "column",
  },
  imagePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
  },
  imagePreviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  imagePreviewCloseBtn: {
    padding: 4,
  },
  imagePreviewFull: {
    flex: 1,
    width: "100%",
    backgroundColor: "#020617",
  },
  imagePreviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1E293B",
  },
  imagePreviewFooterText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  imagePreviewOpenBrowserBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  imagePreviewOpenBrowserText: {
    fontSize: 11,
    color: "#38BDF8",
    fontWeight: "700",
  },
});
