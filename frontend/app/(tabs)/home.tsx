import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, BackHandler, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { BrandLogo } from "@/src/components/BrandLogo";
import {
  subscribePendingCount,
  refreshPendingNotifications,
} from "@/src/pending-notifications";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface UserStats {
  total_donors: number;
  available_donors: number;
  donors_by_blood_group: Record<string, number>;
  total_requests: number;
  emergency_requests: number;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats>({
    total_donors: 0,
    available_donors: 0,
    donors_by_blood_group: {
      "A+": 0, "A-": 0, "B+": 0, "B-": 0,
      "AB+": 0, "AB-": 0, "O+": 0, "O-": 0,
    },
    total_requests: 0,
    emergency_requests: 0,
  });
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Prevent hardware back press from navigating back to the guest Landing page
  useFocusEffect(
    useCallback(() => {
      refreshPendingNotifications();
      if (Platform.OS === "android") {
        const onBackPress = () => {
          BackHandler.exitApp();
          return true;
        };
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
      }
    }, [])
  );

  const load = async () => {
    try {
      const [sRes, rRes] = await Promise.allSettled([
        api("/stats") as Promise<any>,
        api("/blood-requests?limit=4") as Promise<any>,
      ]);

      if (sRes.status === "fulfilled" && sRes.value) {
        setStats({
          total_donors: sRes.value.total_donors ?? 0,
          available_donors: sRes.value.available_donors ?? 0,
          donors_by_blood_group: sRes.value.donors_by_blood_group || {},
          total_requests: sRes.value.total_requests ?? 0,
          emergency_requests: sRes.value.emergency_requests ?? 0,
        });
      } else {
        // Fallback: calculate from /donors if /stats is unreachable
        const fallbackDonors: any = await api("/donors");
        const list = fallbackDonors.donors || [];
        const byBg: Record<string, number> = {};
        BLOOD_GROUPS.forEach((g) => (byBg[g] = 0));
        let avail = 0;
        list.forEach((d: any) => {
          if (d.availability === "Available") avail++;
          if (d.blood_group) byBg[d.blood_group] = (byBg[d.blood_group] || 0) + 1;
        });
        setStats((prev) => ({
          ...prev,
          total_donors: list.length,
          available_donors: avail,
          donors_by_blood_group: byBg,
        }));
      }

      if (rRes.status === "fulfilled" && rRes.value?.requests) {
        setRequests(rRes.value.requests);
      }
    } catch (e) {
      console.error("Home stats load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = subscribePendingCount((cnt) => setPendingCount(cnt));
    load();
    return () => unsub();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([load(), refreshPendingNotifications()]);
    setRefreshing(false);
  };

  const emergency = requests.find((r) => r.urgency === "Emergency");

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Sticky Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BrandLogo variant="horizontal" size="sm" />
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push("/(tabs)/notifications")}
          testID="header-notifications"
          accessibilityLabel={`Notifications, ${pendingCount} pending`}
        >
          <Ionicons name="notifications" size={20} color={colors.onSurface} />
          {pendingCount > 0 ? (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {pendingCount > 9 ? "9+" : pendingCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* PENDING NOTIFICATION ACTION BANNER (When user missed or closed push notification) */}
        {pendingCount > 0 ? (
          <Pressable
            style={styles.pendingAlertCard}
            onPress={() => router.push("/(tabs)/notifications")}
            testID="pending-notifications-banner"
          >
            <LinearGradient
              colors={["#FFF1F2", "#FFE4E6"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.pendingLeftIcon}>
              <Ionicons name="notifications" size={22} color="#E11D48" />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <View style={styles.pendingBadgeRow}>
                <View style={styles.pendingBeacon}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingBadgeText}>ACTION REQUIRED</Text>
                </View>
                <Text style={styles.pendingCountPill}>{pendingCount} PENDING</Text>
              </View>
              <Text style={styles.pendingTitle}>
                {pendingCount === 1
                  ? "1 Blood Request Needs Your Response"
                  : `${pendingCount} Blood Requests Need Your Response`}
              </Text>
              <Text style={styles.pendingDesc}>
                Karaikal hospitals alerted you. Even if you closed the notification, tap to respond now.
              </Text>
            </View>
            <View style={styles.pendingArrowBtn}>
              <Ionicons name="arrow-forward-circle" size={26} color="#E11D48" />
            </View>
          </Pressable>
        ) : null}

        {/* Emergency Alert (if active) */}
        {emergency ? (
          <Pressable
            style={styles.alert}
            onPress={() => router.push({ pathname: "/request-details", params: { id: emergency.request_number } })}
            testID="emergency-banner"
          >
            <View style={styles.alertDot}><Ionicons name="warning" size={20} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>EMERGENCY: {emergency.blood_group} needed</Text>
              <Text style={styles.alertDesc}>{emergency.hospital_name} • {emergency.hospital_city}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}


        {/* ========================================================================= */}
        {/* USER COUNT HERO DASHBOARD */}
        {/* ========================================================================= */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["#0F172A", "#1E293B", "#0F172A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Subtle Top Badge */}
            <View style={styles.heroPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.heroPillText}>LIVE DONOR COMMUNITY</Text>
            </View>

            {/* Big Primary User Count */}
            <View style={styles.counterRow}>
              <View style={styles.counterLeft}>
                <Text style={styles.counterBig} testID="total-donors-count">
                  {stats.total_donors}
                </Text>
                <Text style={styles.counterLabel}>Registered Blood Donors</Text>
                <Text style={styles.counterSub}>Verified Lifesavers across TN & Puducherry</Text>
              </View>

              <View style={styles.counterIconCircle}>
                <Ionicons name="people" size={32} color="#38BDF8" />
              </View>
            </View>

            {/* Split Metrics Sub-bar */}
            <View style={styles.heroMetricsGrid}>
              <View style={styles.metricItem}>
                <View style={styles.metricHead}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.metricNum}>{stats.available_donors}</Text>
                </View>
                <Text style={styles.metricText}>Available to Donate Now</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <View style={styles.metricHead}>
                  <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
                  <Text style={[styles.metricNum, { color: "#38BDF8" }]}>100%</Text>
                </View>
                <Text style={styles.metricText}>Confidential Registry</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <View style={styles.quick}>
          <Pressable testID="home-donate-cta" style={[styles.quickCard, { backgroundColor: colors.brandPrimary }]} onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="water" size={26} color="#FFFFFF" />
            <Text style={styles.quickTitle}>Donate Blood</Text>
            <Text style={styles.quickSub}>Manage availability</Text>
          </Pressable>
          <Pressable testID="home-request-cta" style={[styles.quickCard, { backgroundColor: colors.surfaceInverse }]} onPress={() => router.push("/request-blood")}>
            <Ionicons name="alert-circle" size={26} color="#FFFFFF" />
            <Text style={styles.quickTitle}>Request Blood</Text>
            <Text style={styles.quickSub}>Submit urgent request</Text>
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* USER COUNT BY BLOOD GROUP BREAKDOWN */}
        {/* ========================================================================= */}
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.sectionTitle}>User Count by Blood Group</Text>
            <Text style={styles.sectionSub}>Registered donors available in each group</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/donors")}>
            <Text style={styles.link}>Find Donors</Text>
          </Pressable>
        </View>

        <View style={styles.bgGrid}>
          {BLOOD_GROUPS.map((group) => {
            const count = stats.donors_by_blood_group[group] || 0;
            return (
              <Pressable
                key={group}
                style={styles.bgCard}
                onPress={() => router.push({ pathname: "/(tabs)/donors" })}
                testID={`bg-count-${group}`}
              >
                <View style={styles.bgCardTop}>
                  <BloodGroupBadge group={group} size="sm" />
                  {count > 0 ? (
                    <View style={styles.activePill}>
                      <View style={styles.dotGreen} />
                    </View>
                  ) : null}
                </View>

                <View style={styles.bgCountWrap}>
                  <Text style={styles.bgCountNumber}>{count}</Text>
                  <Text style={styles.bgCountLabel}>{count === 1 ? "Donor" : "Donors"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Organization Info Banner */}
        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#0284C7" />
          <Text style={styles.trustBannerText}>
            Kaarai Karangal Social Service Organization acts as a verified, confidential bridge connecting patients with volunteer donors.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  headerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  pendingAlertCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: "#FFF1F2",
    borderWidth: 1.5,
    borderColor: "#FDA4AF",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  pendingLeftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pendingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  pendingBeacon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E11D48",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 5,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  pendingBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  pendingCountPill: {
    color: "#BE123C",
    fontSize: 10,
    fontWeight: "800",
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#881337",
    marginBottom: 2,
  },
  pendingDesc: {
    fontSize: 11,
    color: "#9F1239",
    lineHeight: 15,
  },
  pendingArrowBtn: {
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    gap: 10,
    marginBottom: spacing.md,
  },
  alertDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  alertDesc: {
    color: "#FFFFFFCC",
    fontSize: 12,
    marginTop: 2,
  },

  /* Hero Dashboard Card */
  heroWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heroCard: {
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
  },
  heroPillText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  counterLeft: {
    flex: 1,
  },
  counterBig: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 52,
    letterSpacing: -1,
  },
  counterLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F1F5F9",
    marginTop: 2,
  },
  counterSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  counterIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  heroMetricsGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: radius.md,
    padding: 12,
    alignItems: "center",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4ADE80",
  },
  metricText: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
    fontWeight: "500",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  dotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },

  /* Quick Actions */
  quick: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 4,
  },
  quickTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  quickSub: {
    color: "#FFFFFFCC",
    fontSize: 11,
  },

  /* Blood Group Breakdown Section */
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  link: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  bgGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: 10,
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  bgCard: {
    width: "22.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bgCardTop: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    position: "absolute",
    top: -4,
    right: -10,
  },
  bgCountWrap: {
    alignItems: "center",
    marginTop: 6,
  },
  bgCountNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  bgCountLabel: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 1,
  },

  /* Trust Banner */
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trustBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 16,
    fontWeight: "500",
  },
});
