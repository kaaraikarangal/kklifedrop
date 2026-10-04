import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Modal } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, clearSession } from "@/src/api";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

type View = "dashboard" | "donors" | "requests" | "notifications";

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [aadhaarModal, setAadhaarModal] = useState<{ open: boolean; name?: string; value?: string }>({ open: false });
  const [matchModal, setMatchModal] = useState<any>({ open: false });

  async function loadAll() {
    try {
      const [s, d, r, n] = await Promise.all([
        api("/admin/stats", { auth: true }), api("/admin/donors", { auth: true }),
        api("/blood-requests", { auth: true }), api("/admin/notifications", { auth: true }),
      ]);
      setStats(s); setDonors((d as any).donors); setRequests((r as any).requests); setNotifs((n as any).groups);
    } catch (e: any) {
      if (e.message?.includes("auth") || e.message?.includes("Admin")) {
        toast("error", "Session expired", "Please sign in again");
        await clearSession(); router.replace("/auth/admin-login");
      }
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function logout() { await clearSession(); router.replace("/"); }

  async function revealAadhaar(d: any) {
    try {
      const r: any = await api(`/admin/donors/${d.id}/aadhaar`, { auth: true });
      setAadhaarModal({ open: true, name: d.full_name, value: r.aadhaar });
    } catch (e: any) { toast("error", "Failed", e.message); }
  }

  async function openMatching(req: any) {
    try {
      const r: any = await api(`/blood-requests/${req.id}/matching-donors`, { auth: true });
      setMatchModal({ open: true, data: r, request: req, selected: new Set<string>() });
    } catch (e: any) { toast("error", "Failed", e.message); }
  }

  async function notify(scope: "same_area" | "same_district" | "all" | "selected") {
    const { request, selected } = matchModal;
    const body: any = scope === "selected" ? { donor_ids: Array.from(selected) } : { scope };
    try {
      const r: any = await api(`/blood-requests/${request.id}/notify`, { auth: true, body });
      toast("success", "Notifications sent", `${r.notified} donors notified`);
      setMatchModal({ open: false });
      loadAll();
    } catch (e: any) { toast("error", "Failed", e.message); }
  }

  async function updateStatus(req: any, status: string) {
    try {
      await api(`/admin/blood-requests/${req.id}/status`, { auth: true, method: "PATCH", body: { status } });
      toast("success", "Updated", status);
      loadAll();
    } catch (e: any) { toast("error", "Failed", e.message); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Admin Console</Text>
          <Text style={styles.title}>K2 Life Drop</Text>
        </View>
        <Pressable testID="admin-logout" onPress={logout} style={styles.logoutIcon}><Ionicons name="log-out-outline" size={20} color={colors.error} /></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {(["dashboard", "donors", "requests", "notifications"] as View[]).map((v) => (
          <Pressable key={v} testID={`admin-tab-${v}`} onPress={() => setView(v)} style={[styles.tab, view === v && styles.tabActive]}>
            <Text style={[styles.tabText, view === v && styles.tabTextActive]}>{v.toUpperCase()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {view === "dashboard" && stats && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}>
          <View style={styles.grid}>
            <StatCard testID="stat-donors" label="Total Donors" value={stats.total_donors} icon="people" />
            <StatCard testID="stat-available" label="Available" value={stats.available_donors} icon="checkmark-circle" color={colors.success} />
            <StatCard testID="stat-requests" label="Blood Requests" value={stats.total_requests} icon="water" />
            <StatCard testID="stat-pending" label="Pending" value={stats.pending_requests} icon="hourglass" color={colors.warning} />
            <StatCard testID="stat-emergency" label="Emergency" value={stats.emergency_requests} icon="warning" color={colors.brandPrimary} />
            <StatCard testID="stat-fulfilled" label="Fulfilled" value={stats.fulfilled_requests} icon="trophy" color={colors.success} />
          </View>

          <Text style={styles.section}>By Blood Group</Text>
          <View style={styles.bgList}>
            {Object.entries(stats.donors_by_blood_group || {}).map(([g, c]: any) => (
              <View key={g} style={styles.bgRow}>
                <BloodGroupBadge group={g} size="sm" />
                <Text style={styles.bgCount}>{c}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Notification Response</Text>
          <View style={styles.cardFlat}>
            <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: "700" }}>{stats.response_rate_pct}%</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{stats.notifications_responded} responded of {stats.notifications_sent} sent</Text>
          </View>
        </ScrollView>
      )}

      {view === "donors" && (
        <FlatList
          data={donors}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={<Text style={styles.listHead}>{donors.length} donors</Text>}
          renderItem={({ item: d }) => (
            <View style={styles.rowCard} testID={`admin-donor-${d.id}`}>
              <BloodGroupBadge group={d.blood_group} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowName}>{d.full_name}</Text>
                <Text style={styles.rowMeta}>+91 {d.mobile} • {d.email}</Text>
                <Text style={styles.rowMeta}>{d.area}, {d.district} • {d.gender}, {d.date_of_birth}</Text>
                <Text style={styles.rowMeta}>Aadhaar: {d.masked_aadhaar}</Text>
                <View style={styles.rowActions}>
                  <Pressable testID={`reveal-aadhaar-${d.id}`} style={styles.rowBtn} onPress={() => revealAadhaar(d)}>
                    <Ionicons name="eye" size={12} color="#FFFFFF" />
                    <Text style={styles.rowBtnText}>Reveal Aadhaar</Text>
                  </Pressable>
                  <View style={[styles.pill, { backgroundColor: d.availability === "Available" ? "#E6F4EA" : colors.surfaceTertiary }]}>
                    <Text style={{ color: d.availability === "Available" ? colors.success : colors.muted, fontSize: 11, fontWeight: "700" }}>{d.availability}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {view === "requests" && (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={<Text style={styles.listHead}>{requests.length} requests</Text>}
          renderItem={({ item: r }) => (
            <View style={[styles.rowCard, r.urgency === "Emergency" && { borderWidth: 1.5, borderColor: colors.brandPrimary }]}>
              <BloodGroupBadge group={r.blood_group} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.rowName}>{r.patient_name}</Text>
                  {r.urgency === "Emergency" ? <View style={styles.emergBadge}><Text style={styles.emergText}>EMERGENCY</Text></View> : null}
                </View>
                <Text style={styles.rowMeta}>{r.request_number} • {r.hospital_name}, {r.hospital_city}</Text>
                <Text style={styles.rowMeta}>Requester: {r.requester_name} • +91 {r.requester_mobile}</Text>
                <Text style={styles.rowMeta}>Status: <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>{r.status}</Text></Text>
                <View style={styles.rowActions}>
                  <Pressable testID={`notify-${r.id}`} style={styles.rowBtn} onPress={() => openMatching(r)}>
                    <Ionicons name="notifications" size={12} color="#FFFFFF" />
                    <Text style={styles.rowBtnText}>Match & Notify</Text>
                  </Pressable>
                  <Pressable testID={`fulfill-${r.id}`} style={[styles.rowBtn, { backgroundColor: colors.success }]} onPress={() => updateStatus(r, "Fulfilled")}>
                    <Text style={styles.rowBtnText}>Fulfilled</Text>
                  </Pressable>
                  <Pressable testID={`cancel-${r.id}`} style={[styles.rowBtn, { backgroundColor: colors.muted }]} onPress={() => updateStatus(r, "Cancelled")}>
                    <Text style={styles.rowBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {view === "notifications" && (
        <FlatList
          data={notifs}
          keyExtractor={(n) => n.request_id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={<Text style={styles.listHead}>Notification History</Text>}
          ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: "center", marginTop: 40 }}>No notifications sent yet.</Text>}
          renderItem={({ item: g }) => (
            <View style={styles.rowCard}>
              <BloodGroupBadge group={g.blood_group} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowName}>{g.request_number}</Text>
                <Text style={styles.rowMeta}>{g.urgency} • Status: {g.status}</Text>
                <Text style={styles.rowMeta}>Notified: {g.notified} • Responded: {g.responded} • Can Donate: {g.can_donate}</Text>
                <Text style={styles.rowMeta}>Last sent: {g.last_sent ? new Date(g.last_sent).toLocaleString() : "—"}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Aadhaar reveal modal */}
      <Modal visible={aadhaarModal.open} transparent animationType="fade" onRequestClose={() => setAadhaarModal({ open: false })}>
        <View style={styles.modalBg}>
          <View style={styles.modal} testID="aadhaar-modal">
            <Ionicons name="shield-checkmark" size={30} color={colors.brandPrimary} />
            <Text style={styles.modalTitle}>{aadhaarModal.name}</Text>
            <Text style={styles.modalLabel}>Aadhaar Number</Text>
            <Text style={styles.aadhaar}>{aadhaarModal.value}</Text>
            <Text style={styles.modalSub}>This action is logged for audit.</Text>
            <Pressable style={styles.modalBtn} onPress={() => setAadhaarModal({ open: false })}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Match modal */}
      <Modal visible={matchModal.open} transparent animationType="slide" onRequestClose={() => setMatchModal({ open: false })}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { maxHeight: "85%", width: "92%" }]} testID="match-modal">
            <Text style={styles.modalTitle}>Matching Donors</Text>
            {matchModal.data ? (
              <>
                <Text style={styles.modalSub}>
                  Total: {matchModal.data.counts.total} • Same area: {matchModal.data.counts.same_area} • Same district: {matchModal.data.counts.same_district} • Other: {matchModal.data.counts.other}
                </Text>
                <ScrollView style={{ maxHeight: 320, marginTop: 12, alignSelf: "stretch" }}>
                  {[...(matchModal.data.same_area || []), ...(matchModal.data.same_district || []), ...(matchModal.data.other || [])].map((d: any) => (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        const s = new Set<string>(matchModal.selected);
                        if (s.has(d.id)) s.delete(d.id); else s.add(d.id);
                        setMatchModal({ ...matchModal, selected: s });
                      }}
                      style={styles.matchRow}
                    >
                      <View style={[styles.cb, matchModal.selected?.has(d.id) && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                        {matchModal.selected?.has(d.id) ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", color: colors.onSurface }}>{d.full_name} ({d.blood_group})</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>{d.area}, {d.district} • {d.availability}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Pressable testID="notify-same-area" style={[styles.rowBtn, { flex: 1 }]} onPress={() => notify("same_area")}>
                    <Text style={styles.rowBtnText}>Notify Same Area</Text>
                  </Pressable>
                  <Pressable testID="notify-all" style={[styles.rowBtn, { flex: 1, backgroundColor: colors.brandPrimary }]} onPress={() => notify("all")}>
                    <Text style={styles.rowBtnText}>Notify All Eligible</Text>
                  </Pressable>
                </View>
                <Pressable testID="notify-selected" style={[styles.rowBtn, { marginTop: 8, backgroundColor: colors.surfaceInverse }]} onPress={() => notify("selected")} disabled={!matchModal.selected?.size}>
                  <Text style={styles.rowBtnText}>Notify Selected ({matchModal.selected?.size || 0})</Text>
                </Pressable>
                <Pressable onPress={() => setMatchModal({ open: false })} style={{ padding: 10, marginTop: 4 }}>
                  <Text style={{ color: colors.muted, textAlign: "center" }}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, icon, color = colors.brandPrimary, testID }: any) {
  return (
    <View style={styles.statCard} testID={testID}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value?.toLocaleString?.() ?? value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  hello: { color: colors.muted, fontSize: 12 },
  title: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  logoutIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  tabsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.md },
  tab: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, flexShrink: 0 },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.onSurfaceSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
  tabTextActive: { color: "#FFFFFF" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  statValue: { fontSize: 24, fontWeight: "800", color: colors.onSurface, marginTop: 6 },
  statLabel: { fontSize: 12, color: colors.muted },
  section: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.5, textTransform: "uppercase", marginTop: spacing.xl, marginBottom: spacing.md },
  bgList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bgRow: { width: "48%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, padding: 12, borderRadius: radius.md },
  bgCount: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  cardFlat: { backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md },
  rowCard: { flexDirection: "row", padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginBottom: 10 },
  rowName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  rowMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" },
  rowBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  rowBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  emergBadge: { backgroundColor: colors.brandPrimary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emergText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  listHead: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 10 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginTop: 10 },
  modalLabel: { fontSize: 12, color: colors.muted, marginTop: 12 },
  aadhaar: { fontSize: 20, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 2, marginTop: 4 },
  modalSub: { fontSize: 11, color: colors.muted, marginTop: 8, textAlign: "center" },
  modalBtn: { marginTop: spacing.lg, backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  cb: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
});
