import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { toast } from "@/src/Toast";
import {
  refreshPendingNotifications,
  markNotificationsAsRead,
} from "@/src/pending-notifications";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"pending" | "all">("pending");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r: any = await api("/notifications", { auth: true });
      const list = r?.notifications || [];
      setItems(list);

      // If there are notifications, mark them as seen
      if (list.length > 0) {
        await markNotificationsAsRead(list.map((n: any) => n.id));
      }

      await refreshPendingNotifications();

      // If no pending items, default filter to all
      const hasPending = list.some((n: any) => !n.response);
      if (!hasPending) {
        setActiveFilter("all");
      }
    } catch (e: any) {
      console.warn("Error loading notifications:", e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  async function respond(n: any, response: "I Can Donate" | "Not Available") {
    setRespondingId(n.id);
    try {
      let donorId = n.donor_id;
      if (!donorId) {
        const me: any = await api("/donors/me", { auth: true });
        donorId = me?.donor?.id;
      }
      if (!donorId) {
        throw new Error("Unable to identify donor profile. Please re-login.");
      }
      await api("/donor-responses", { body: { request_id: n.request_id, donor_id: donorId, response } });
      toast("success", "Response Recorded", response === "I Can Donate" ? "Thank you! The patient has been notified." : "Response recorded as unavailable.");

      // Optimistically update local item
      setItems((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, response, responded_at: new Date().toISOString() } : item))
      );

      await refreshPendingNotifications();
    } catch (e: any) {
      toast("error", "Failed", e.message || "Failed to record response");
    } finally {
      setRespondingId(null);
    }
  }

  const pendingItems = items.filter((n) => !n.response);
  const displayedItems = activeFilter === "pending" ? pendingItems : items;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.title}>Alerts & Notifications</Text>
          <Text style={styles.sub}>
            Emergency patient requests and donor calls in Karaikal
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterBtn, activeFilter === "pending" && styles.filterBtnActive]}
          onPress={() => setActiveFilter("pending")}
          testID="filter-pending-btn"
        >
          <View style={styles.filterBtnContent}>
            {pendingItems.length > 0 ? (
              <View style={styles.filterDotActive} />
            ) : null}
            <Text style={[styles.filterBtnText, activeFilter === "pending" && styles.filterBtnTextActive]}>
              Pending Action ({pendingItems.length})
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.filterBtn, activeFilter === "all" && styles.filterBtnActive]}
          onPress={() => setActiveFilter("all")}
          testID="filter-all-btn"
        >
          <Text style={[styles.filterBtnText, activeFilter === "all" && styles.filterBtnTextActive]}>
            All Alerts ({items.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={displayedItems}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />
        }
        ListHeaderComponent={
          pendingItems.length > 0 ? (
            <View style={styles.pendingCalloutCard}>
              <LinearGradient
                colors={["#FFF1F2", "#FFE4E6"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.pendingCalloutTop}>
                <View style={styles.pendingCalloutBadge}>
                  <View style={styles.beaconDot} />
                  <Text style={styles.pendingCalloutBadgeText}>PENDING ACTION</Text>
                </View>
                <Text style={styles.pendingCalloutCount}>
                  {pendingItems.length} Waiting for Decision
                </Text>
              </View>
              <Text style={styles.pendingCalloutTitle}>
                Missed or closed a notification?
              </Text>
              <Text style={styles.pendingCalloutDesc}>
                Karaikal hospitals requested your blood group. Even if you swiped away the system alert, please choose whether you can donate or are unavailable so doctors can plan immediately.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={activeFilter === "pending" ? "checkmark-done-circle" : "notifications-off-outline"}
                size={40}
                color={activeFilter === "pending" ? "#10B981" : "#94A3B8"}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === "pending"
                ? "No Pending Notifications! 🎉"
                : "No notifications yet"}
            </Text>
            <Text style={styles.emptySub}>
              {activeFilter === "pending"
                ? "You have answered all blood requests. Thank you for supporting patients in Karaikal!"
                : "When an emergency blood request matching your blood type is posted, you will receive an alert here."}
            </Text>
            {activeFilter === "pending" && items.length > 0 ? (
              <Pressable style={styles.viewAllBtn} onPress={() => setActiveFilter("all")}>
                <Text style={styles.viewAllBtnText}>View All Past Alerts ({items.length})</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item: n }) => {
          const req = n.request || n.blood_requests || {};
          const bg = req.blood_group || "Blood";
          const patient = req.patient_name || "";
          const hospital = req.hospital_name || "Hospital";
          const city = req.hospital_city || req.hospital_area || "Karaikal";
          const units = req.units_required || 1;
          const urgency = req.urgency || "Normal";
          const isEmergency = urgency === "Emergency";
          const isPending = !n.response;
          const isCurrentLoading = respondingId === n.id;

          return (
            <View
              style={[
                styles.card,
                isPending && styles.cardPending,
                isEmergency && styles.cardEmergency,
              ]}
              testID={`notif-${n.id}`}
            >
              {/* Card Header & Badge */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <View style={[styles.iconBox, isEmergency ? styles.iconEmergency : styles.iconNormal]}>
                    <Ionicons name="water" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {isEmergency ? "🚨 EMERGENCY: " : "🩸 Blood Needed: "}
                      <Text style={{ color: colors.brandPrimary }}>{bg}</Text>
                    </Text>
                    <Text style={styles.cardHospital}>
                      {hospital} • {city}
                    </Text>
                  </View>
                </View>

                {isPending ? (
                  <View style={styles.pendingItemBadge}>
                    <View style={styles.beaconDotSmall} />
                    <Text style={styles.pendingItemBadgeText}>ACTION REQUIRED</Text>
                  </View>
                ) : (
                  <View style={[styles.respondedBadge, { backgroundColor: n.response === "I Can Donate" ? "#DCFCE7" : "#F1F5F9" }]}>
                    <Ionicons
                      name={n.response === "I Can Donate" ? "checkmark-circle" : "close-circle"}
                      size={13}
                      color={n.response === "I Can Donate" ? "#15803D" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.respondedText,
                        { color: n.response === "I Can Donate" ? "#15803D" : "#475569" },
                      ]}
                    >
                      {n.response === "I Can Donate" ? "Will Donate" : "Unavailable"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Patient / Request Details */}
              <View style={styles.detailsBox}>
                {patient ? (
                  <Text style={styles.patientText}>
                    Patient: <Text style={{ fontWeight: "800", color: "#0F172A" }}>{patient}</Text>
                  </Text>
                ) : null}
                <Text style={styles.metaSub}>
                  Units Needed: <Text style={{ fontWeight: "800", color: colors.brandPrimary }}>{units} Unit{units > 1 ? "s" : ""}</Text>
                  {"  •  "}Sent: {n.sent_at ? new Date(n.sent_at).toLocaleDateString() : "Recently"}
                </Text>
              </View>

              {n.message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{n.message}</Text>
                </View>
              ) : null}

              {/* Action Buttons for Pending or View for Responded */}
              {isPending ? (
                <View style={styles.actionsContainer}>
                  <Text style={styles.decisionPromptText}>
                    Can you donate blood for this patient?
                  </Text>
                  <View style={styles.actionsRow}>
                    <Pressable
                      testID={`notif-donate-${n.id}`}
                      style={[styles.actionBtn, styles.donateBtn, isCurrentLoading && { opacity: 0.6 }]}
                      disabled={isCurrentLoading}
                      onPress={() => respond(n, "I Can Donate")}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.donateBtnText}>I Can Donate</Text>
                    </Pressable>

                    <Pressable
                      testID={`notif-decline-${n.id}`}
                      style={[styles.actionBtn, styles.declineBtn, isCurrentLoading && { opacity: 0.6 }]}
                      disabled={isCurrentLoading}
                      onPress={() => respond(n, "Not Available")}
                    >
                      <Ionicons name="close-circle" size={16} color="#64748B" />
                      <Text style={styles.declineBtnText}>Not Available</Text>
                    </Pressable>
                  </View>

                  {req.request_number ? (
                    <Pressable
                      style={styles.detailsLink}
                      onPress={() =>
                        router.push({
                          pathname: "/request-details",
                          params: { id: req.request_number },
                        })
                      }
                    >
                      <Text style={styles.detailsLinkText}>View Full Patient & Hospital Details →</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={styles.completedFooter}>
                  <Text style={styles.completedText}>
                    Your response was recorded on {n.responded_at ? new Date(n.responded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "file"}.
                  </Text>
                  {req.request_number ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/request-details",
                          params: { id: req.request_number },
                        })
                      }
                    >
                      <Text style={styles.viewDetailsText}>View Request</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },

  /* Filter Segment */
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  filterBtnActive: {
    backgroundColor: colors.brandPrimary,
  },
  filterBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterDotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#DC2626",
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterBtnTextActive: {
    color: "#FFFFFF",
  },

  /* Callout Card */
  pendingCalloutCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: "#FDA4AF",
    overflow: "hidden",
  },
  pendingCalloutTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pendingCalloutBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E11D48",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 5,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  beaconDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
  },
  pendingCalloutBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  pendingCalloutCount: {
    fontSize: 11,
    fontWeight: "800",
    color: "#BE123C",
  },
  pendingCalloutTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#881337",
    marginBottom: 4,
  },
  pendingCalloutDesc: {
    fontSize: 11,
    color: "#9F1239",
    lineHeight: 16,
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPending: {
    borderColor: "#FECDD3",
    borderLeftWidth: 4,
    borderLeftColor: "#E11D48",
  },
  cardEmergency: {
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmergency: {
    backgroundColor: "#DC2626",
  },
  iconNormal: {
    backgroundColor: colors.brandPrimary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  cardHospital: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  pendingItemBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E11D48",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  pendingItemBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  respondedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  respondedText: {
    fontSize: 10,
    fontWeight: "800",
  },

  /* Details Box */
  detailsBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  patientText: {
    fontSize: 13,
    color: "#334155",
  },
  metaSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  messageBox: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandBlue,
  },
  messageText: {
    fontSize: 11,
    color: "#475569",
    fontStyle: "italic",
  },

  /* Actions Container */
  actionsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  decisionPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  donateBtn: {
    backgroundColor: "#16A34A",
  },
  donateBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  declineBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  declineBtnText: {
    color: "#475569",
    fontWeight: "800",
    fontSize: 12,
  },
  detailsLink: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 4,
  },
  detailsLinkText: {
    fontSize: 11,
    color: colors.brandPrimary,
    fontWeight: "700",
  },

  completedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  completedText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    flex: 1,
  },
  viewDetailsText: {
    fontSize: 11,
    color: colors.brandPrimary,
    fontWeight: "800",
    marginLeft: 8,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#334155",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  viewAllBtn: {
    marginTop: 14,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  viewAllBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
});
