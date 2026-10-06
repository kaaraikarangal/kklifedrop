import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { toast } from "@/src/Toast";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    try {
      const r: any = await api("/notifications", { auth: true });
      setItems(r.notifications || []);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function respond(n: any, response: "I Can Donate" | "Not Available") {
    try {
      // Find donor id via "me"
      const me: any = await api("/donors/me", { auth: true });
      await api("/donor-responses", { body: { request_id: n.request_id, donor_id: me.donor.id, response } });
      toast("success", "Response recorded", response);
      load();
    } catch (e: any) {
      toast("error", "Failed", e.message);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.sub}>Please ensure you are medically eligible before responding.</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
            <Text style={styles.empty}>No notifications yet.</Text>
            <Text style={styles.emptySub}>You will be alerted here when a patient in Karaikal needs your blood type.</Text>
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

          return (
            <View style={[styles.card, isEmergency && styles.cardEmergency]} testID={`notif-${n.id}`}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={[styles.iconBox, isEmergency && { backgroundColor: "#DC2626" }]}>
                  <Ionicons name="water" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.cardTitle}>
                      {isEmergency ? "🚨 EMERGENCY: " : "🩸 Blood Needed: "}{bg}
                    </Text>
                    {isEmergency ? (
                      <View style={styles.emergencyPill}>
                        <Text style={styles.emergencyPillText}>CRITICAL</Text>
                      </View>
                    ) : null}
                  </View>

                  {patient ? (
                    <Text style={styles.patientText}>
                      Patient: <Text style={{ fontWeight: "800", color: "#0F172A" }}>{patient}</Text>
                    </Text>
                  ) : null}

                  <Text style={styles.cardMeta}>
                    🏥 {hospital} • {city}
                  </Text>
                  <Text style={styles.cardMetaSub}>
                    Required: <Text style={{ fontWeight: "800", color: colors.brandPrimary }}>{units} Unit{units > 1 ? "s" : ""}</Text> • Sent: {n.sent_at ? new Date(n.sent_at).toLocaleString() : "Recently"}
                  </Text>

                  {n.message ? (
                    <View style={styles.messageBox}>
                      <Text style={styles.messageText}>{n.message}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {n.response ? (
                <View style={[styles.respBadge, { backgroundColor: n.response === "I Can Donate" ? "#DCFCE7" : "#F1F5F9" }]}>
                  <Ionicons
                    name={n.response === "I Can Donate" ? "checkmark-circle" : "close-circle"}
                    size={15}
                    color={n.response === "I Can Donate" ? "#15803D" : "#64748B"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: n.response === "I Can Donate" ? "#15803D" : "#475569",
                    }}
                  >
                    You responded: {n.response}
                  </Text>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <Pressable
                    testID={`notif-donate-${n.id}`}
                    style={[styles.actionBtn, { backgroundColor: colors.brandPrimary }]}
                    onPress={() => respond(n, "I Can Donate")}
                  >
                    <Ionicons name="hand-right" size={14} color="#FFFFFF" />
                    <Text style={styles.actionText}>I Can Donate</Text>
                  </Pressable>
                  <Pressable
                    testID={`notif-decline-${n.id}`}
                    style={[styles.actionBtn, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1" }]}
                    onPress={() => respond(n, "Not Available")}
                  >
                    <Text style={[styles.actionText, { color: "#475569" }]}>Not Available</Text>
                  </Pressable>
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
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 4 },
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
  cardEmergency: {
    borderColor: "#FECACA",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  emergencyPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emergencyPillText: {
    color: "#DC2626",
    fontSize: 9,
    fontWeight: "900",
  },
  patientText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 3,
  },
  cardMeta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  cardMetaSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  messageBox: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandBlue,
  },
  messageText: {
    fontSize: 11,
    color: "#475569",
    fontStyle: "italic",
  },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  actionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  respBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  empty: { fontSize: 16, fontWeight: "800", color: "#64748B", marginTop: 12 },
  emptySub: { fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 4, paddingHorizontal: 30 },
});
