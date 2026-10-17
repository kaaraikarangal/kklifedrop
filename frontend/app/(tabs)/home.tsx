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
import { BloodInspirationCard } from "@/src/components/BloodInspirationCard";
import {
  subscribePendingCount,
  refreshPendingNotifications,
} from "@/src/pending-notifications";
import { syncPushTokenWithBackend } from "@/src/notifications";

import {
  BLOOD_FREQUENCY_DATA,
  DID_YOU_KNOW_HIGHLIGHTS,
  BLOOD_FACT_CATEGORIES,
} from "@/src/data/bloodFactsData";

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
  const [factIdx, setFactIdx] = useState(0);
  const currentFact = DID_YOU_KNOW_HIGHLIGHTS[factIdx] || DID_YOU_KNOW_HIGHLIGHTS[0];

  const nextFact = () => {
    setFactIdx((prev) => (prev + 1) % DID_YOU_KNOW_HIGHLIGHTS.length);
  };

  // Prevent hardware back press from navigating back to the guest Landing page
  useFocusEffect(
    useCallback(() => {
      refreshPendingNotifications();
      syncPushTokenWithBackend().catch(() => {});
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
        api("/blood-requests?limit=10&exclude_closed=true") as Promise<any>,
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

  const CLOSED_STATUSES = ["Fulfilled", "Cancelled", "Expired"];
  const emergency = requests.find(
    (r) => r.urgency === "Emergency" && !CLOSED_STATUSES.includes(r.status)
  );

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
          <Pressable
            testID="home-donate-cta"
            style={[styles.quickCard, { backgroundColor: colors.brandPrimary, overflow: "hidden" }]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <LinearGradient
              colors={["#E11D48", "#BE123C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Ionicons name="water" size={26} color="#FFFFFF" />
              <View style={[styles.quickBadge, { backgroundColor: "rgba(255, 255, 255, 0.2)" }]}>
                <Text style={styles.quickBadgeText}>LIFESAVER</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Donate Blood</Text>
            <Text style={styles.quickSub}>Manage availability</Text>
          </Pressable>

          <Pressable
            testID="home-request-cta"
            style={[styles.quickCard, { backgroundColor: "#DC2626", overflow: "hidden" }]}
            onPress={() => router.push("/request-blood")}
          >
            <LinearGradient
              colors={["#DC2626", "#B91C1C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Ionicons name="alert-circle" size={26} color="#FFFFFF" />
              <View style={[styles.quickBadge, { backgroundColor: "rgba(255, 255, 255, 0.25)" }]}>
                <Text style={styles.quickBadgeText}>EMERGENCY</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Request Blood</Text>
            <Text style={styles.quickSub}>Submit urgent request</Text>
          </Pressable>
        </View>

        {/* Donor Eligibility AI Assistant Banner */}
        <Pressable
          style={styles.aiEligibilityBanner}
          onPress={() => router.push("/donor-criteria-chat")}
          testID="home-ai-eligibility-btn"
        >
          <LinearGradient
            colors={["#0052D4", "#0A2540"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.aiIconBadge}>
            <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
            <View style={styles.aiPillRow}>
              <Text style={styles.aiPillText} numberOfLines={1}>NBTC GUIDELINES FEB 2025</Text>
            </View>
            <Text style={styles.aiBannerTitle} numberOfLines={1} ellipsizeMode="tail">
              Can I Donate Blood? Ask Criteria AI
            </Text>
            <Text style={styles.aiBannerSub} numberOfLines={1} ellipsizeMode="tail">
              Instant answers on tattoos, medications & rules
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

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

        {/* ========================================================================= */}
        {/* BLOOD DONATION FACTS & FREQUENCY SECTION */}
        {/* ========================================================================= */}
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.sectionTitle}>Blood Donation Facts</Text>
            <Text style={styles.sectionSub}>Clinical science, donor impact & demographic frequency</Text>
          </View>
          <Pressable onPress={() => router.push("/blood-facts")} testID="home-view-all-facts-btn">
            <Text style={styles.link}>View All (9) ›</Text>
          </Pressable>
        </View>

        {/* DID YOU KNOW? INTERACTIVE FACT CARD */}
        <View style={styles.factCardWrap}>
          <LinearGradient
            colors={["#FFFFFF", "#F8FAFC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.factCard}
          >
            <View style={styles.factCardTop}>
              <View style={[styles.factTagBadge, { backgroundColor: currentFact.accent + "18" }]}>
                <Ionicons name={currentFact.icon as any} size={14} color={currentFact.accent} />
                <Text style={[styles.factTagText, { color: currentFact.accent }]}>
                  DID YOU KNOW? • {currentFact.tag.toUpperCase()}
                </Text>
              </View>

              <Pressable
                style={styles.nextFactBtn}
                onPress={nextFact}
                testID="home-next-fact-btn"
                accessibilityLabel="Next blood donation fact"
              >
                <Text style={styles.nextFactBtnText}>Next Fact</Text>
                <Ionicons name="refresh" size={13} color={colors.brandPrimary} />
              </Pressable>
            </View>

            <Text style={styles.factHeadline}>{currentFact.headline}</Text>
            <Text style={styles.factBody}>{currentFact.body}</Text>

            <View style={styles.factCardFooter}>
              <View style={styles.factIndicatorRow}>
                {DID_YOU_KNOW_HIGHLIGHTS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.factDot,
                      i === factIdx && styles.factDotActive,
                    ]}
                  />
                ))}
              </View>

              <Pressable
                style={styles.exploreFactsLink}
                onPress={() => router.push("/blood-facts")}
                testID="home-read-more-facts"
              >
                <Text style={styles.exploreFactsLinkText}>Explore 50+ Facts</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.brandPrimary} />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* FREQUENCY OF BLOOD TYPES TABLE CARD (Matching user's Friends2Support reference) */}
        <View style={styles.frequencyCardWrap}>
          <View style={styles.frequencyHeader}>
            <View style={styles.freqIconCircle}>
              <Ionicons name="stats-chart" size={16} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.frequencyTitle}>Frequency of Blood Types</Text>
              <Text style={styles.frequencySubtitle}>Population ratio of ABO and Rh groups</Text>
            </View>
            <Pressable
              style={styles.matrixBtn}
              onPress={() => router.push("/blood-facts")}
            >
              <Text style={styles.matrixBtnText}>Full Guide</Text>
            </Pressable>
          </View>

          {/* 2-Column Comparison Table matching Friends2Support */}
          <View style={styles.frequencyTable}>
            {/* Header */}
            <View style={styles.freqTableRowHead}>
              <Text style={[styles.freqTableHeadCell, { flex: 1 }]}>Rh-POSITIVE</Text>
              <View style={styles.freqTableVDivider} />
              <Text style={[styles.freqTableHeadCell, { flex: 1 }]}>Rh-NEGATIVE</Text>
            </View>

            {/* Row 1: O+ vs O- */}
            <View style={styles.freqTableRow}>
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#DC2626" }]}>
                  <Text style={styles.miniBloodBadgeText}>O+</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 3</Text>
              </Pressable>
              <View style={styles.freqTableVDivider} />
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#D97706" }]}>
                  <Text style={styles.miniBloodBadgeText}>O-</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 15</Text>
              </Pressable>
            </View>

            {/* Row 2: A+ vs A- */}
            <View style={[styles.freqTableRow, styles.freqTableRowAlt]}>
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#E11D48" }]}>
                  <Text style={styles.miniBloodBadgeText}>A+</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 3</Text>
              </Pressable>
              <View style={styles.freqTableVDivider} />
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#EA580C" }]}>
                  <Text style={styles.miniBloodBadgeText}>A-</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 16</Text>
              </Pressable>
            </View>

            {/* Row 3: B+ vs B- */}
            <View style={styles.freqTableRow}>
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#9333EA" }]}>
                  <Text style={styles.miniBloodBadgeText}>B+</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 12</Text>
              </Pressable>
              <View style={styles.freqTableVDivider} />
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#0891B2" }]}>
                  <Text style={styles.miniBloodBadgeText}>B-</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 67</Text>
              </Pressable>
            </View>

            {/* Row 4: AB+ vs AB- */}
            <View style={[styles.freqTableRow, styles.freqTableRowAlt, { borderBottomWidth: 0 }]}>
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#2563EB" }]}>
                  <Text style={styles.miniBloodBadgeText}>AB+</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 29</Text>
              </Pressable>
              <View style={styles.freqTableVDivider} />
              <Pressable
                style={styles.freqTableCell}
                onPress={() => router.push("/blood-facts")}
              >
                <View style={[styles.miniBloodBadge, { backgroundColor: "#4F46E5" }]}>
                  <Text style={styles.miniBloodBadgeText}>AB-</Text>
                </View>
                <Text style={styles.freqRatioText}>1 person in 167</Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Category Chips Strip */}
          <View style={styles.categoriesQuickStrip}>
            <Text style={styles.categoriesQuickLabel}>ALL 9 FACT CATEGORIES:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsScroll}>
              {BLOOD_FACT_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={styles.quickCatChip}
                  onPress={() => router.push("/blood-facts")}
                >
                  <Ionicons name={cat.icon as any} size={11} color={cat.color} />
                  <Text style={styles.quickCatChipText}>{cat.shortTitle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* BLOOD Acrostic Inspiration Banner */}
        <BloodInspirationCard
          onActionPress={() => router.push("/(tabs)/profile")}
          actionText="My Donor Status"
        />

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
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  quickBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
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

  /* AI Eligibility Banner */
  aiEligibilityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#0052D4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  aiIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiPillRow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  aiPillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  aiBannerSub: {
    fontSize: 10.5,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 1,
  },

  /* Blood Facts & Frequency Styles */
  factCardWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  factCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.lg,
  },
  factCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  factTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  factTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  nextFactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  nextFactBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  factHeadline: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  factBody: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  factCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  factIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  factDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  factDotActive: {
    width: 14,
    backgroundColor: colors.brandPrimary,
  },
  exploreFactsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  exploreFactsLinkText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },

  /* Frequency of Blood Types Table */
  frequencyCardWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  frequencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  freqIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  frequencyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  frequencySubtitle: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  matrixBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matrixBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  frequencyTable: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  freqTableRowHead: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  freqTableHeadCell: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  freqTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  freqTableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  freqTableCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  freqTableVDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  miniBloodBadge: {
    width: 26,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  miniBloodBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  freqRatioText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  categoriesQuickStrip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
  },
  categoriesQuickLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickChipsScroll: {
    gap: 6,
  },
  quickCatChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  quickCatChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#334155",
  },
});

