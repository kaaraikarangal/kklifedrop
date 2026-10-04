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
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        renderItem={({ item: n }) => (
          <View style={styles.card} testID={`notif-${n.id}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.iconBox}><Ionicons name="water" size={18} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>🩸 {n.request?.urgency === "Emergency" ? "EMERGENCY" : "Blood Requirement"}: {n.request?.blood_group}</Text>
                <Text style={styles.cardMeta}>{n.request?.hospital_name} • {n.request?.hospital_city}</Text>
                <Text style={styles.cardMeta}>Units: {n.request?.units_required} • Sent {new Date(n.sent_at).toLocaleString()}</Text>
              </View>
            </View>
            {n.response ? (
              <View style={[styles.respBadge, { backgroundColor: n.response === "I Can Donate" ? "#E6F4EA" : colors.surfaceTertiary }]}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: n.response === "I Can Donate" ? colors.success : colors.muted }}>
                  You responded: {n.response}
                </Text>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <Pressable testID={`notif-donate-${n.id}`} style={[styles.actionBtn, { backgroundColor: colors.brandPrimary }]} onPress={() => respond(n, "I Can Donate")}>
                  <Text style={styles.actionText}>I Can Donate</Text>
                </Pressable>
                <Pressable testID={`notif-decline-${n.id}`} style={[styles.actionBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={() => respond(n, "Not Available")}>
                  <Text style={[styles.actionText, { color: colors.onSurfaceSecondary }]}>Not Available</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginTop: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: radius.md, alignItems: "center" },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  respBadge: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, alignSelf: "flex-start" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
