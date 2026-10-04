import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, clearSession } from "@/src/api";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { BrandLogo } from "@/src/components/BrandLogo";

type ViewTab = "dashboard" | "donors" | "requests" | "notifications" | "audit";

const GROUPS = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUSES = ["All", "Pending", "Admin Reviewing", "Donors Notified", "Donor Found", "Fulfilled", "Cancelled"];

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 680;
  const [view, setView] = useState<ViewTab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [donorSearch, setDonorSearch] = useState("");
  const [selectedBg, setSelectedBg] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("All");
  const [donorRestFilter, setDonorRestFilter] = useState<"All" | "Eligible" | "Resting">("All");

  const [requestSearch, setRequestSearch] = useState("");
  const [selectedReqStatus, setSelectedReqStatus] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");

  // Modals
  const [aadhaarModal, setAadhaarModal] = useState<{
    open: boolean;
    donorId?: string;
    name?: string;
    value?: string;
    masked?: string;
    decrypted?: boolean;
    error?: string;
  }>({
    open: false,
  });
  const [rekeyInput, setRekeyInput] = useState("");
  const [rekeying, setRekeying] = useState(false);
  const [isEditingAadhaar, setIsEditingAadhaar] = useState(false);
  const [matchModal, setMatchModal] = useState<any>({ open: false });

  // 3-Month Donation Cooldown Modal
  const [donationModal, setDonationModal] = useState<{
    open: boolean;
    donor?: any;
    dateInput: string;
    submitting?: boolean;
  }>({
    open: false,
    dateInput: "",
  });

  // Fulfill Request & Link Donor Modal
  const [fulfillModal, setFulfillModal] = useState<{
    open: boolean;
    request?: any;
    donorId?: string;
    donationDate: string;
    submitting?: boolean;
  }>({
    open: false,
    donationDate: new Date().toISOString().slice(0, 10),
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [s, d, r, n, a] = await Promise.all([
        api("/admin/stats", { auth: true }),
        api("/admin/donors", { auth: true }),
        api("/blood-requests", { auth: true }),
        api("/admin/notifications", { auth: true }),
        api("/admin/audit-logs", { auth: true }).catch(() => ({ logs: [] })),
      ]);
      setStats(s);
      setDonors((d as any).donors || []);
      setRequests((r as any).requests || []);
      setNotifs((n as any).groups || []);
      setAuditLogs((a as any).logs || []);
    } catch (e: any) {
      if (
        e.message?.includes("auth") ||
        e.message?.includes("Admin") ||
        e.message?.includes("401") ||
        e.message?.includes("403")
      ) {
        toast("error", "Session expired", "Please sign in again");
        await clearSession();
        router.replace("/auth/admin-login");
      } else {
        toast("error", "Failed to load admin data", e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  async function revealAadhaar(d: any) {
    try {
      const r: any = await api(`/admin/donors/${d.id}/aadhaar`, { auth: true });
      setAadhaarModal({
        open: true,
        donorId: d.id,
        name: d.full_name,
        value: r.aadhaar,
        masked: r.masked || d.masked_aadhaar,
        decrypted: !!r.decrypted && !!r.aadhaar,
        error: r.error,
      });
      setRekeyInput("");
      setIsEditingAadhaar(false);
      api("/admin/audit-logs", { auth: true })
        .then((a: any) => setAuditLogs(a.logs || []))
        .catch(() => {});
    } catch (e: any) {
      toast("error", "Failed to retrieve Aadhaar", e.message);
    }
  }

  async function saveRekeyedAadhaar() {
    if (!aadhaarModal.donorId) return;
    const clean = rekeyInput.replace(/\D/g, "");
    if (clean.length !== 12) {
      toast("error", "Invalid Aadhaar", "Please enter exactly 12 digits");
      return;
    }
    setRekeying(true);
    try {
      await api(`/admin/donors/${aadhaarModal.donorId}`, {
        auth: true,
        method: "PATCH",
        body: { aadhaar: clean },
      });
      toast("success", "Aadhaar Re-encrypted & Saved", "Stored securely with active 256-bit key");
      const formatted = `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
      setAadhaarModal((prev) => ({
        ...prev,
        value: formatted,
        decrypted: true,
        masked: `XXXX XXXX ${clean.slice(8, 12)}`,
        error: undefined,
      }));
      setRekeyInput("");
      setIsEditingAadhaar(false);
      loadAll();
    } catch (e: any) {
      toast("error", "Failed to update Aadhaar", e.message);
    } finally {
      setRekeying(false);
    }
  }

  async function toggleDonorAvailability(d: any) {
    const nextVal = d.availability === "Available" ? "Not Available" : "Available";
    try {
      await api(`/admin/donors/${d.id}`, {
        auth: true,
        method: "PATCH",
        body: { availability: nextVal },
      });
      toast("success", "Updated", `${d.full_name} is now ${nextVal}`);
      loadAll();
    } catch (e: any) {
      toast("error", "Update failed", e.message);
    }
  }

  async function toggleDonorStatus(d: any) {
    const nextStatus = d.status === "active" ? "suspended" : "active";
    try {
      await api(`/admin/donors/${d.id}`, {
        auth: true,
        method: "PATCH",
        body: { status: nextStatus },
      });
      toast("success", "Status Updated", `${d.full_name} set to ${nextStatus}`);
      loadAll();
    } catch (e: any) {
      toast("error", "Update failed", e.message);
    }
  }

  async function openMatching(req: any) {
    try {
      const r: any = await api(`/blood-requests/${req.id}/matching-donors`, { auth: true });
      setMatchModal({ open: true, data: r, request: req, selected: new Set<string>() });
    } catch (e: any) {
      toast("error", "Failed", e.message);
    }
  }

  async function notify(scope: "same_area" | "same_district" | "all" | "selected") {
    const { request, selected } = matchModal;
    const body: any = scope === "selected" ? { donor_ids: Array.from(selected) } : { scope };
    try {
      const r: any = await api(`/blood-requests/${request.id}/notify`, { auth: true, body });
      toast("success", "Notifications Broadcasted", `${r.notified} verified donors alerted`);
      setMatchModal({ open: false });
      loadAll();
    } catch (e: any) {
      toast("error", "Broadcast failed", e.message);
    }
  }

  async function updateStatus(req: any, status: string) {
    try {
      await api(`/admin/blood-requests/${req.id}/status`, { auth: true, method: "PATCH", body: { status } });
      toast("success", "Status Updated", `${req.request_number} marked as ${status}`);
      loadAll();
    } catch (e: any) {
      toast("error", "Failed", e.message);
    }
  }

  function openDonationModal(d: any) {
    setDonationModal({
      open: true,
      donor: d,
      dateInput: d.last_donation_date ? String(d.last_donation_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      submitting: false,
    });
  }

  async function saveDonationDate(dateVal: string | null) {
    if (!donationModal.donor) return;
    setDonationModal((prev) => ({ ...prev, submitting: true }));
    try {
      await api(`/admin/donors/${donationModal.donor.id}`, {
        auth: true,
        method: "PATCH",
        body: { last_donation_date: dateVal },
      });
      if (dateVal) {
        toast(
          "success",
          "Donation Recorded",
          `${donationModal.donor.full_name} is now protected under 3-month rest cooldown (cannot be notified for 90 days).`
        );
      } else {
        toast("info", "Donation Cleared", `${donationModal.donor.full_name}'s cooldown has been cleared.`);
      }
      setDonationModal({ open: false, dateInput: "" });
      loadAll();
    } catch (e: any) {
      toast("error", "Failed to update donation date", e.message);
      setDonationModal((prev) => ({ ...prev, submitting: false }));
    }
  }

  function openFulfillModal(req: any) {
    setFulfillModal({
      open: true,
      request: req,
      donorId: undefined,
      donationDate: new Date().toISOString().slice(0, 10),
      submitting: false,
    });
  }

  async function submitFulfill() {
    if (!fulfillModal.request) return;
    setFulfillModal((prev) => ({ ...prev, submitting: true }));
    try {
      await api(`/admin/blood-requests/${fulfillModal.request.id}/status`, {
        auth: true,
        method: "PATCH",
        body: {
          status: "Fulfilled",
          fulfilled_by_donor_id: fulfillModal.donorId || undefined,
          donation_date: fulfillModal.donorId ? fulfillModal.donationDate : undefined,
        },
      });
      toast(
        "success",
        "Request Fulfilled",
        fulfillModal.donorId
          ? "Blood request fulfilled and fulfilling donor is entered into 3-month rest cooldown."
          : "Request marked as fulfilled."
      );
      setFulfillModal({ open: false, donationDate: new Date().toISOString().slice(0, 10) });
      loadAll();
    } catch (e: any) {
      toast("error", "Failed to fulfill request", e.message);
      setFulfillModal((prev) => ({ ...prev, submitting: false }));
    }
  }

  // Filtered Donors
  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      const matchSearch =
        !donorSearch.trim() ||
        d.full_name?.toLowerCase().includes(donorSearch.toLowerCase()) ||
        d.mobile?.includes(donorSearch) ||
        d.area?.toLowerCase().includes(donorSearch.toLowerCase()) ||
        d.district?.toLowerCase().includes(donorSearch.toLowerCase());

      const matchBg = selectedBg === "All" || d.blood_group === selectedBg;
      const matchAvail =
        selectedAvailability === "All" || d.availability === selectedAvailability;

      const matchRest =
        donorRestFilter === "All" ||
        (donorRestFilter === "Resting" && d.in_cooldown) ||
        (donorRestFilter === "Eligible" && !d.in_cooldown);

      return matchSearch && matchBg && matchAvail && matchRest;
    });
  }, [donors, donorSearch, selectedBg, selectedAvailability, donorRestFilter]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !requestSearch.trim() ||
        r.patient_name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.request_number?.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.hospital_name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.requester_name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.requester_mobile?.includes(requestSearch);

      const matchStatus = selectedReqStatus === "All" || r.status === selectedReqStatus;
      const matchUrgency = selectedUrgency === "All" || r.urgency === selectedUrgency;

      return matchSearch && matchStatus && matchUrgency;
    });
  }, [requests, requestSearch, selectedReqStatus, selectedUrgency]);

  // Emergency Pending Requests
  const emergencyRequests = useMemo(() => {
    return requests.filter((r) => r.urgency === "Emergency" && !["Fulfilled", "Cancelled"].includes(r.status));
  }, [requests]);

  return (
    <View style={styles.root}>
      {/* ========================================================================= */}
      {/* ADMIN TOP APP BAR */}
      {/* ========================================================================= */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10), paddingHorizontal: isMobile ? 12 : spacing.lg }]}>
        <View style={styles.headerLeft}>
          <BrandLogo variant={isMobile ? "emblem" : "horizontal"} size="sm" />
          {isMobile ? (
            <View style={{ marginLeft: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.headerMobileTitle}>KK Life Drop</Text>
                <View style={styles.adminBadgeSmall}>
                  <Text style={styles.adminBadgeSmallText}>ADMIN</Text>
                </View>
              </View>
              <Text style={styles.headerMobileSub}>Kaarai Karangal</Text>
            </View>
          ) : (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
              <Text style={styles.adminBadgeText}>ADMIN CONTROL</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.refreshBtn} onPress={loadAll} disabled={loading} hitSlop={8}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.brandBlue} />
            ) : (
              <Ionicons name="refresh" size={18} color="#0F172A" />
            )}
          </Pressable>

          <Pressable testID="admin-logout" onPress={logout} style={[styles.logoutBtn, isMobile && { paddingHorizontal: 10, paddingVertical: 6 }]} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            {!isMobile && <Text style={styles.logoutText}>Sign Out</Text>}
          </Pressable>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS */}
      {/* ========================================================================= */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            { id: "dashboard", label: "Overview", icon: "grid-outline" },
            { id: "donors", label: `Donors (${donors.length})`, icon: "people-outline" },
            { id: "requests", label: `Requests (${requests.length})`, icon: "water-outline", badge: emergencyRequests.length },
            { id: "notifications", label: "Broadcasts", icon: "megaphone-outline" },
            { id: "audit", label: "Audit Logs", icon: "shield-outline" },
          ].map((tab) => {
            const active = view === tab.id;
            return (
              <Pressable
                key={tab.id}
                testID={`admin-tab-${tab.id}`}
                onPress={() => setView(tab.id as ViewTab)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Ionicons name={tab.icon as any} size={15} color={active ? "#FFFFFF" : "#64748B"} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                {tab.badge ? (
                  <View style={styles.tabUrgentBadge}>
                    <Text style={styles.tabUrgentText}>{tab.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE DASHBOARD */}
      {/* ========================================================================= */}
      {view === "dashboard" && stats && (
        <ScrollView contentContainerStyle={[styles.contentWrap, { paddingHorizontal: isMobile ? 12 : spacing.lg, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* System Status Ribbon */}
          <View style={[styles.systemRibbon, isMobile && { flexDirection: "column", alignItems: "flex-start", gap: 4, paddingVertical: 8, paddingHorizontal: 10 }]}>
            <View style={styles.systemIndicator}>
              <View style={styles.onlineDot} />
              <Text style={[styles.systemStatusText, isMobile && { fontSize: 11 }]}>Database: Supabase Postgres Live</Text>
            </View>
            <Text style={[styles.systemMetaText, isMobile && { fontSize: 10 }]}>Kaarai Karangal Blood Network</Text>
          </View>

          {/* Active Emergency Alert Banner if any */}
          {emergencyRequests.length > 0 ? (
            <View style={styles.activeEmergencyBanner}>
              <View style={styles.emergencyFlashBadge}>
                <Ionicons name="flash" size={16} color="#FFFFFF" />
                <Text style={styles.emergencyFlashText}>
                  {emergencyRequests.length} EMERGENCY REQUEST{emergencyRequests.length > 1 ? "S" : ""} ACTIVE
                </Text>
              </View>
              <Text style={styles.activeEmergencyDesc}>
                Immediate donor coordination required for patient(s):{" "}
                {emergencyRequests.map((r) => `${r.patient_name} (${r.blood_group})`).join(", ")}
              </Text>
              <Pressable
                style={styles.emergencyActionBtn}
                onPress={() => {
                  setSelectedReqStatus("All");
                  setSelectedUrgency("Emergency");
                  setView("requests");
                }}
              >
                <Text style={styles.emergencyActionText}>Review & Notify Donors</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          {/* KPI Stat Cards Grid */}
          <View style={styles.kpiGrid}>
            <StatCard
              testID="stat-donors"
              label="Total Donors"
              value={stats.total_donors}
              sub={`${stats.available_donors || 0} active`}
              icon="people"
              color={colors.brandBlue}
              bg="#EFF6FF"
              isMobile={isMobile}
            />
            <StatCard
              testID="stat-available"
              label="Available"
              value={stats.available_donors}
              sub="Ready for donation"
              icon="checkmark-circle"
              color={colors.brandGreen}
              bg="#ECFDF5"
              isMobile={isMobile}
            />
            <StatCard
              testID="stat-requests"
              label="Requests"
              value={stats.total_requests}
              sub="Submitted in portal"
              icon="water"
              color="#0284C7"
              bg="#F0F9FF"
              isMobile={isMobile}
            />
            <StatCard
              testID="stat-pending"
              label="Pending"
              value={stats.pending_requests}
              sub="Awaiting admin"
              icon="hourglass"
              color="#EA580C"
              bg="#FFF7ED"
              isMobile={isMobile}
            />
            <StatCard
              testID="stat-emergency"
              label="Emergency"
              value={stats.emergency_requests}
              sub="Critical patient urgency"
              icon="warning"
              color={colors.brandPrimary}
              bg="#FFF1F2"
              isMobile={isMobile}
            />
            <StatCard
              testID="stat-fulfilled"
              label="Lives Saved"
              value={stats.fulfilled_requests}
              sub="Donations completed"
              icon="trophy"
              color="#059669"
              bg="#F0FDF4"
              isMobile={isMobile}
            />
          </View>

          {/* Blood Group Inventory Distribution */}
          <View style={styles.cardBox}>
            <View style={styles.cardBoxHead}>
              <View>
                <Text style={styles.cardBoxTitle}>Donor Registry by Blood Group</Text>
                <Text style={styles.cardBoxSub}>Available network across all types</Text>
              </View>
              <View style={styles.badgeCountPill}>
                <Text style={styles.badgeCountText}>{donors.length} Donors</Text>
              </View>
            </View>

            <View style={styles.bgList}>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => {
                const count = stats.donors_by_blood_group?.[g] || 0;
                const pct = stats.total_donors ? Math.round((count / stats.total_donors) * 100) : 0;
                return (
                  <View key={g} style={styles.bgRow}>
                    <BloodGroupBadge group={g} size="sm" />
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={styles.bgRowLabel}>Group {g}</Text>
                        <Text style={styles.bgRowCount}>{count} donors ({pct}%)</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* District Breakdown & Broadcast Response */}
          <View style={[styles.twoColRow, isMobile && { flexDirection: "column" }]}>
            <View style={[styles.cardBox, isMobile ? { width: "100%", marginBottom: 12 } : { flex: 1 }]}>
              <Text style={styles.cardBoxTitle}>Top Donor Districts</Text>
              <Text style={styles.cardBoxSub}>Regional volunteer coverage</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {(stats.donors_by_district || []).slice(0, 5).map((dist: any, idx: number) => (
                  <View key={idx} style={styles.distRow}>
                    <Ionicons name="location-outline" size={14} color={colors.brandBlue} />
                    <Text style={styles.distName}>{dist.district}</Text>
                    <Text style={styles.distCount}>{dist.count}</Text>
                  </View>
                ))}
                {(!stats.donors_by_district || stats.donors_by_district.length === 0) ? (
                  <Text style={styles.emptyText}>No district records yet</Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.cardBox, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.cardBoxTitle}>Broadcast Response Rate</Text>
              <Text style={styles.cardBoxSub}>Donor responsiveness to alerts</Text>
              <View style={styles.rateBox}>
                <Text style={styles.rateNumber}>{stats.response_rate_pct}%</Text>
                <Text style={styles.rateSub}>
                  {stats.notifications_responded || 0} responded out of {stats.notifications_sent || 0} alerts sent
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DONORS DIRECTORY */}
      {/* ========================================================================= */}
      {view === "donors" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.filterSection, { paddingHorizontal: isMobile ? 12 : spacing.lg }]}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by donor name, mobile, district, area..."
                value={donorSearch}
                onChangeText={setDonorSearch}
                placeholderTextColor="#94A3B8"
              />
              {donorSearch ? (
                <Pressable onPress={() => setDonorSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
              {GROUPS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.filterChip, selectedBg === g && styles.filterChipActive]}
                  onPress={() => setSelectedBg(g)}
                >
                  <Text style={[styles.filterChipText, selectedBg === g && styles.filterChipTextActive]}>
                    {g === "All" ? "All Groups" : g}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.subFilterRow}>
              {["All", "Available", "Not Available"].map((av) => (
                <Pressable
                  key={av}
                  style={[styles.availChip, selectedAvailability === av && styles.availChipActive]}
                  onPress={() => setSelectedAvailability(av)}
                >
                  <Text style={[styles.availChipText, selectedAvailability === av && styles.availChipTextActive]}>
                    {av}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.resultCountText}>{filteredDonors.length} donors found</Text>
            </View>

            <View style={[styles.subFilterRow, { marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
              {(["All", "Eligible", "Resting"] as const).map((rst) => (
                <Pressable
                  key={rst}
                  style={[
                    styles.availChip,
                    donorRestFilter === rst && styles.availChipActive,
                    rst === "Resting" && donorRestFilter === "Resting" && { backgroundColor: "#D97706" },
                  ]}
                  onPress={() => setDonorRestFilter(rst)}
                >
                  <Text style={[styles.availChipText, donorRestFilter === rst && styles.availChipTextActive]}>
                    {rst === "All" ? "All Rest Status" : rst === "Resting" ? "🕒 Resting (3 Mo)" : "✓ Eligible"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <FlatList
            data={filteredDonors}
            keyExtractor={(d) => d.id}
            contentContainerStyle={[styles.contentWrap, { paddingHorizontal: isMobile ? 12 : spacing.lg, paddingBottom: insets.bottom + 32 }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No matching donors</Text>
                <Text style={styles.emptyDesc}>Try clearing your search or filter options</Text>
              </View>
            }
            renderItem={({ item: d }) => (
              <View style={styles.donorCard} testID={`admin-donor-${d.id}`}>
                <View style={styles.donorCardTop}>
                  <BloodGroupBadge group={d.blood_group} size="md" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={styles.donorNameRow}>
                      <Text style={styles.donorName}>{d.full_name}</Text>
                      <View style={[styles.statusTag, { backgroundColor: d.status === "active" ? "#ECFDF5" : "#FEF2F2" }]}>
                        <Text style={[styles.statusTagText, { color: d.status === "active" ? colors.brandGreen : colors.brandRed }]}>
                          {d.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.donorMetaLocation}>
                      <Ionicons name="location" size={13} color={colors.brandBlue} /> {d.area}, {d.place}, {d.district} — {d.pincode}
                    </Text>
                  </View>
                </View>

                {/* 3-Month Donation Rest Period Card */}
                <View style={[styles.restStatusBanner, d.in_cooldown ? styles.restStatusBannerResting : styles.restStatusBannerEligible]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <View style={[styles.restStatusIconWrap, { backgroundColor: d.in_cooldown ? "#FEF3C7" : "#ECFDF5" }]}>
                      <Ionicons
                        name={d.in_cooldown ? "shield-checkmark" : "checkmark-circle"}
                        size={16}
                        color={d.in_cooldown ? "#D97706" : colors.brandGreen}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.restBannerTitle, { color: d.in_cooldown ? "#92400E" : "#065F46" }]}>
                        {d.in_cooldown
                          ? `Resting: ${d.cooldown_days_left}d Left (Protected - Non-Notifiable)`
                          : "Eligible to Donate (Notifiable)"}
                      </Text>
                      <Text style={[styles.restBannerSub, { color: d.in_cooldown ? "#B45309" : "#047857" }]}>
                        {d.last_donation_date
                          ? `Donated: ${d.last_donation_date} • Next Eligible: ${d.cooldown_end_date || "Now"}`
                          : "No recent donation recorded"}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    testID={`record-donation-${d.id}`}
                    style={[styles.recordDonationBtn, d.in_cooldown && styles.recordDonationBtnActive]}
                    onPress={() => openDonationModal(d)}
                  >
                    <Ionicons name="calendar" size={12} color={d.in_cooldown ? "#92400E" : colors.brandPrimary} />
                    <Text style={[styles.recordDonationBtnText, { color: d.in_cooldown ? "#92400E" : colors.brandPrimary }]}>
                      {d.in_cooldown ? "Edit Rest" : "Mark Donated"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.donorDetailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Mobile</Text>
                    <Pressable onPress={() => Linking.openURL(`tel:+91${d.mobile}`)} style={styles.clickableContact}>
                      <Ionicons name="call" size={12} color={colors.brandBlue} />
                      <Text style={styles.detailValuePrimary}>+91 {d.mobile}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{d.email || "Not provided"}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Gender / Age</Text>
                    <Text style={styles.detailValue}>{d.gender || "—"}, DOB: {d.date_of_birth || "—"}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Aadhaar</Text>
                    <Text style={styles.detailValue}>{d.masked_aadhaar}</Text>
                  </View>
                </View>

                <View style={styles.donorActionsRow}>
                  <Pressable testID={`reveal-aadhaar-${d.id}`} style={styles.actionBtnOutline} onPress={() => revealAadhaar(d)}>
                    <Ionicons name="eye-outline" size={14} color={colors.brandBlue} />
                    <Text style={styles.actionBtnOutlineText}>Reveal Aadhaar</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtnAvailability, { backgroundColor: d.availability === "Available" ? "#ECFDF5" : "#F1F5F9" }]}
                    onPress={() => toggleDonorAvailability(d)}
                  >
                    <View style={[styles.dot, { backgroundColor: d.availability === "Available" ? colors.brandGreen : colors.muted }]} />
                    <Text style={[styles.availBtnText, { color: d.availability === "Available" ? colors.brandGreen : colors.muted }]}>
                      {d.availability} (Toggle)
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtnStatus, { backgroundColor: d.status === "active" ? "#FEF2F2" : "#EFF6FF" }]}
                    onPress={() => toggleDonorStatus(d)}
                  >
                    <Ionicons
                      name={d.status === "active" ? "pause-circle-outline" : "play-circle-outline"}
                      size={14}
                      color={d.status === "active" ? "#DC2626" : colors.brandBlue}
                    />
                    <Text style={[styles.statusBtnText, { color: d.status === "active" ? "#DC2626" : colors.brandBlue }]}>
                      {d.status === "active" ? "Suspend" : "Activate"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BLOOD REQUESTS MANAGER */}
      {/* ========================================================================= */}
      {view === "requests" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.filterSection, { paddingHorizontal: isMobile ? 12 : spacing.lg }]}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patient, request number, hospital, mobile..."
                value={requestSearch}
                onChangeText={setRequestSearch}
                placeholderTextColor="#94A3B8"
              />
              {requestSearch ? (
                <Pressable onPress={() => setRequestSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
              {STATUSES.map((st) => (
                <Pressable
                  key={st}
                  style={[styles.filterChip, selectedReqStatus === st && styles.filterChipActive]}
                  onPress={() => setSelectedReqStatus(st)}
                >
                  <Text style={[styles.filterChipText, selectedReqStatus === st && styles.filterChipTextActive]}>
                    {st}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.subFilterRow}>
              {["All", "Emergency", "Urgent", "Normal"].map((urg) => (
                <Pressable
                  key={urg}
                  style={[
                    styles.availChip,
                    selectedUrgency === urg && styles.availChipActive,
                    urg === "Emergency" && selectedUrgency === "Emergency" && { backgroundColor: "#DC2626" },
                  ]}
                  onPress={() => setSelectedUrgency(urg)}
                >
                  <Text style={[styles.availChipText, selectedUrgency === urg && styles.availChipTextActive]}>
                    {urg}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.resultCountText}>{filteredRequests.length} requests</Text>
            </View>
          </View>

          <FlatList
            data={filteredRequests}
            keyExtractor={(r) => r.id}
            contentContainerStyle={[styles.contentWrap, { paddingHorizontal: isMobile ? 12 : spacing.lg, paddingBottom: insets.bottom + 32 }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="water-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No matching requests</Text>
                <Text style={styles.emptyDesc}>Try adjusting status or urgency filters</Text>
              </View>
            }
            renderItem={({ item: r }) => (
              <View style={[styles.requestCard, r.urgency === "Emergency" && styles.requestCardEmergency]}>
                <View style={styles.reqCardHeader}>
                  <View style={styles.reqCardHeaderLeft}>
                    <BloodGroupBadge group={r.blood_group} size="md" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.reqPatientName}>{r.patient_name}</Text>
                      <Text style={styles.reqNumberText}>{r.request_number}</Text>
                    </View>
                  </View>

                  <View style={styles.reqBadgesCol}>
                    {r.urgency === "Emergency" ? (
                      <View style={styles.emergencyTag}>
                        <Ionicons name="flash" size={10} color="#FFFFFF" />
                        <Text style={styles.emergencyTagText}>EMERGENCY</Text>
                      </View>
                    ) : (
                      <View style={styles.urgencyTag}>
                        <Text style={styles.urgencyTagText}>{r.urgency.toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{r.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.reqDetailsGrid}>
                  <View style={styles.reqDetailRow}>
                    <Ionicons name="business" size={14} color="#64748B" />
                    <Text style={styles.reqDetailText}>
                      <Text style={{ fontWeight: "700" }}>{r.hospital_name}</Text> ({r.hospital_city || r.hospital_area}) • {r.units_required} Unit(s)
                    </Text>
                  </View>

                  <View style={styles.reqDetailRow}>
                    <Ionicons name="person" size={14} color="#64748B" />
                    <Text style={styles.reqDetailText}>
                      Requester: <Text style={{ fontWeight: "700" }}>{r.requester_name}</Text> ({r.relationship || "Relative"})
                    </Text>
                  </View>

                  <View style={styles.reqDetailRow}>
                    <Ionicons name="call" size={14} color={colors.brandBlue} />
                    <Pressable onPress={() => Linking.openURL(`tel:+91${r.requester_mobile}`)}>
                      <Text style={[styles.reqDetailText, { color: colors.brandBlue, fontWeight: "700" }]}>
                        +91 {r.requester_mobile} (Tap to Call)
                      </Text>
                    </Pressable>
                  </View>

                  {r.additional_message ? (
                    <View style={styles.reqMessageRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color="#64748B" />
                      <Text style={styles.reqMessageText}>"{r.additional_message}"</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.reqActionsBar}>
                  <Pressable testID={`notify-${r.id}`} style={styles.btnMatchNotify} onPress={() => openMatching(r)}>
                    <Ionicons name="megaphone" size={14} color="#FFFFFF" />
                    <Text style={styles.btnMatchNotifyText}>Match & Notify Donors</Text>
                  </Pressable>

                  <Pressable testID={`fulfill-${r.id}`} style={styles.btnFulfill} onPress={() => openFulfillModal(r)}>
                    <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
                    <Text style={styles.btnFulfillText}>Fulfill</Text>
                  </Pressable>

                  <Pressable style={styles.btnReviewing} onPress={() => updateStatus(r, "Admin Reviewing")}>
                    <Text style={styles.btnReviewingText}>Review</Text>
                  </Pressable>

                  <Pressable testID={`cancel-${r.id}`} style={styles.btnCancel} onPress={() => updateStatus(r, "Cancelled")}>
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BROADCAST / NOTIFICATION HISTORY */}
      {/* ========================================================================= */}
      {view === "notifications" && (
        <FlatList
          data={notifs}
          keyExtractor={(n) => n.request_id || n.id}
          contentContainerStyle={[styles.contentWrap, { paddingHorizontal: isMobile ? 12 : spacing.lg, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={
            <View style={styles.historyHead}>
              <Text style={styles.historyHeadTitle}>Broadcast Alerts History</Text>
              <Text style={styles.historyHeadSub}>Aggregated notifications dispatched to verified donors</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No broadcasts dispatched yet</Text>
              <Text style={styles.emptyDesc}>When you notify matching donors from a blood request, summary logs appear here.</Text>
            </View>
          }
          renderItem={({ item: g }) => (
            <View style={styles.broadcastCard}>
              <View style={styles.broadcastCardTop}>
                <BloodGroupBadge group={g.blood_group} size="md" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.broadcastTitle}>{g.request_number}</Text>
                  <Text style={styles.broadcastMeta}>
                    Urgency: <Text style={{ fontWeight: "700", color: g.urgency === "Emergency" ? colors.brandRed : "#0F172A" }}>{g.urgency}</Text> • Status: {g.status}
                  </Text>
                </View>
              </View>

              <View style={styles.broadcastStatsRow}>
                <View style={styles.bStatCol}>
                  <Text style={styles.bStatNum}>{g.notified}</Text>
                  <Text style={styles.bStatLabel}>Notified</Text>
                </View>
                <View style={styles.bStatDivider} />
                <View style={styles.bStatCol}>
                  <Text style={styles.bStatNum}>{g.responded}</Text>
                  <Text style={styles.bStatLabel}>Responded</Text>
                </View>
                <View style={styles.bStatDivider} />
                <View style={styles.bStatCol}>
                  <Text style={[styles.bStatNum, { color: colors.brandGreen }]}>{g.can_donate}</Text>
                  <Text style={styles.bStatLabel}>Can Donate</Text>
                </View>
              </View>

              <View style={styles.broadcastFooter}>
                <Ionicons name="time-outline" size={12} color="#64748B" />
                <Text style={styles.broadcastFooterText}>
                  Last Alert Sent: {g.last_sent ? new Date(g.last_sent).toLocaleString() : "—"}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDIT LOGS & SECURITY */}
      {/* ========================================================================= */}
      {view === "audit" && (
        <FlatList
          data={auditLogs}
          keyExtractor={(a) => a.id}
          contentContainerStyle={[styles.contentWrap, { paddingHorizontal: isMobile ? 12 : spacing.lg, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={
            <View style={styles.historyHead}>
              <Text style={styles.historyHeadTitle}>Security & Access Audit Trail</Text>
              <Text style={styles.historyHeadSub}>
                Immutable record of privileged operations (e.g. Aadhaar reveals, donor notifications)
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Audit log is clean</Text>
              <Text style={styles.emptyDesc}>Sensitive actions like Aadhaar access are recorded automatically.</Text>
            </View>
          }
          renderItem={({ item: a }) => (
            <View style={styles.auditRowCard}>
              <View style={styles.auditIconWrap}>
                <Ionicons
                  name={a.action === "reveal_aadhaar" ? "eye" : "notifications"}
                  size={16}
                  color={colors.brandBlue}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={styles.auditActionText}>{a.action?.toUpperCase?.()}</Text>
                  <Text style={styles.auditTimeText}>
                    {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "—"}
                  </Text>
                </View>
                <Text style={styles.auditDetailText}>
                  Admin: {a.admin_id} • Target: {a.target_type} ({a.target_id?.slice?.(0, 8)}...)
                </Text>
                {a.metadata ? (
                  <Text style={styles.auditMetaText}>Meta: {JSON.stringify(a.metadata)}</Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: AADHAAR DECRYPT REVEAL */}
      {/* ========================================================================= */}
      <Modal visible={aadhaarModal.open} transparent animationType="fade" onRequestClose={() => setAadhaarModal({ open: false })}>
        <View style={styles.modalBg}>
          <View style={styles.modal} testID="aadhaar-modal">
            <View style={styles.modalShieldIcon}>
              <Ionicons name="shield-checkmark" size={32} color={colors.brandBlue} />
            </View>

            <Text style={styles.modalTitle}>{aadhaarModal.name}</Text>
            <Text style={styles.modalSubtitle}>Government Aadhaar Identity (256-bit AES)</Text>

            {aadhaarModal.decrypted && !isEditingAadhaar ? (
              <>
                <View style={styles.aadhaarDisplayBox}>
                  <Text style={styles.aadhaarText}>{aadhaarModal.value}</Text>
                  <View style={styles.decryptedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.decryptedBadgeText}>Decrypted with Active Key</Text>
                  </View>
                </View>

                <Pressable
                  style={styles.rekeyToggleBtn}
                  onPress={() => {
                    setIsEditingAadhaar(true);
                    setRekeyInput("");
                  }}
                >
                  <Ionicons name="pencil-outline" size={13} color={colors.brandBlue} />
                  <Text style={styles.rekeyToggleText}>Update / Re-enter Aadhaar</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.rekeyContainer}>
                {!aadhaarModal.decrypted ? (
                  <View style={styles.keyMismatchNotice}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons name="alert-circle" size={16} color="#D97706" />
                      <Text style={styles.keyMismatchTitle}>Session Key Mismatch</Text>
                    </View>
                    <Text style={styles.keyMismatchDesc}>
                      This record was encrypted under a previous session key. Masked on file:{" "}
                      <Text style={{ fontWeight: "800", color: "#0F172A" }}>{aadhaarModal.masked}</Text>.
                    </Text>
                    <Text style={styles.keyMismatchSub}>
                      As an authorized Administrator, enter the verified 12-digit Aadhaar to re-encrypt with the active system key.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.rekeyInputWrap}>
                  <Text style={styles.rekeyInputLabel}>Enter 12-digit Government Aadhaar:</Text>
                  <TextInput
                    style={styles.rekeyTextInput}
                    placeholder="e.g. 1234 5678 9012"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={14}
                    value={rekeyInput}
                    onChangeText={(val) => {
                      const digits = val.replace(/\D/g, "").slice(0, 12);
                      setRekeyInput(digits);
                    }}
                  />
                  <Text style={styles.rekeyDigitsCount}>{rekeyInput.length}/12 Digits</Text>
                </View>

                <View style={styles.rekeyActionsRow}>
                  {isEditingAadhaar && aadhaarModal.decrypted ? (
                    <Pressable
                      style={styles.rekeyCancelBtn}
                      onPress={() => setIsEditingAadhaar(false)}
                      disabled={rekeying}
                    >
                      <Text style={styles.rekeyCancelText}>Cancel</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={[styles.rekeySubmitBtn, rekeyInput.length !== 12 && styles.btnNotifyDisabled]}
                    onPress={saveRekeyedAadhaar}
                    disabled={rekeyInput.length !== 12 || rekeying}
                  >
                    {rekeying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                        <Text style={styles.rekeySubmitText}>Re-encrypt & Save</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.auditNoticeBox}>
              <Ionicons name="information-circle" size={16} color="#DC2626" />
              <Text style={styles.auditNoticeText}>
                Notice: All Aadhaar view and re-key events are logged into the immutable security audit trail.
              </Text>
            </View>

            <Pressable style={styles.modalCloseBtn} onPress={() => setAadhaarModal({ open: false })}>
              <Text style={styles.modalCloseText}>Done / Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SMART MATCH & NOTIFY */}
      {/* ========================================================================= */}
      <Modal visible={matchModal.open} transparent animationType="slide" onRequestClose={() => setMatchModal({ open: false })}>
        <View style={styles.modalBg}>
          <View style={styles.matchModalContainer} testID="match-modal">
            <View style={styles.matchModalHead}>
              <View>
                <Text style={styles.matchModalTitle}>Smart Donor Matching</Text>
                <Text style={styles.matchModalSub}>
                  For {matchModal.request?.patient_name} ({matchModal.request?.blood_group}) • {matchModal.request?.hospital_name}
                </Text>
              </View>
              <Pressable onPress={() => setMatchModal({ open: false })} hitSlop={8}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            {matchModal.data ? (
              <>
                <View style={styles.matchStatsRow}>
                  <View style={styles.matchStatBox}>
                    <Text style={styles.matchStatVal}>{matchModal.data.counts?.total || 0}</Text>
                    <Text style={styles.matchStatLbl}>Eligible</Text>
                  </View>
                  <View style={[styles.matchStatBox, { backgroundColor: "#EFF6FF" }]}>
                    <Text style={[styles.matchStatVal, { color: colors.brandBlue }]}>
                      {matchModal.data.counts?.same_area || 0}
                    </Text>
                    <Text style={styles.matchStatLbl}>Same Area</Text>
                  </View>
                  <View style={[styles.matchStatBox, { backgroundColor: "#ECFDF5" }]}>
                    <Text style={[styles.matchStatVal, { color: colors.brandGreen }]}>
                      {matchModal.data.counts?.same_district || 0}
                    </Text>
                    <Text style={styles.matchStatLbl}>Same District</Text>
                  </View>
                  <View style={[styles.matchStatBox, { backgroundColor: "#FFFBEB" }]}>
                    <Text style={[styles.matchStatVal, { color: "#D97706" }]}>
                      {matchModal.data.counts?.in_rest_period || 0}
                    </Text>
                    <Text style={[styles.matchStatLbl, { color: "#B45309" }]}>Resting (3 Mo)</Text>
                  </View>
                </View>

                <Text style={styles.matchListSectionLabel}>SELECT ELIGIBLE DONORS TO NOTIFY</Text>
                <ScrollView style={styles.matchDonorsList}>
                  {[
                    ...(matchModal.data.same_area || []).map((x: any) => ({ ...x, bucket: "Same Area" })),
                    ...(matchModal.data.same_district || []).map((x: any) => ({ ...x, bucket: "Same District" })),
                    ...(matchModal.data.other || []).map((x: any) => ({ ...x, bucket: "Other Region" })),
                  ].map((d: any) => {
                    const isSelected = matchModal.selected?.has(d.id);
                    return (
                      <Pressable
                        key={d.id}
                        onPress={() => {
                          const s = new Set<string>(matchModal.selected);
                          if (s.has(d.id)) s.delete(d.id);
                          else s.add(d.id);
                          setMatchModal({ ...matchModal, selected: s });
                        }}
                        style={[styles.matchRow, isSelected && styles.matchRowSelected]}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                        </View>
                        <BloodGroupBadge group={d.blood_group} size="sm" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={styles.matchDonorName}>{d.full_name}</Text>
                            <View style={styles.bucketTag}>
                              <Text style={styles.bucketTagText}>{d.bucket}</Text>
                            </View>
                          </View>
                          <Text style={styles.matchDonorMeta}>
                            {d.area}, {d.district} • Last Donated: {d.last_donation_date || "First-time / Eligible"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}

                  {(!matchModal.data.same_area?.length &&
                    !matchModal.data.same_district?.length &&
                    !matchModal.data.other?.length) ? (
                    <Text style={styles.noMatchText}>
                      No currently eligible donors found matching group {matchModal.request?.blood_group}.
                    </Text>
                  ) : null}

                  {/* 3-Month Medical Rest Section (Non-Notifiable Donors) */}
                  {matchModal.data.resting_donors?.length ? (
                    <>
                      <View style={styles.matchRestSectionHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="shield-checkmark" size={14} color="#D97706" />
                          <Text style={styles.matchRestSectionTitle}>
                            3-MONTH MEDICAL REST PERIOD ({matchModal.data.resting_donors.length})
                          </Text>
                        </View>
                        <View style={styles.restBadgeTag}>
                          <Ionicons name="lock-closed" size={10} color="#92400E" />
                          <Text style={styles.restBadgeTagText}>PROTECTED</Text>
                        </View>
                      </View>

                      <Text style={styles.matchRestSectionDesc}>
                        These donors donated blood recently and are legally protected under the mandatory 90-day rest rule. Notifications are disabled to safeguard donor health.
                      </Text>

                      {matchModal.data.resting_donors.map((d: any) => (
                        <View key={d.id} style={styles.matchRowResting}>
                          <View style={styles.checkboxDisabled}>
                            <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                          </View>
                          <BloodGroupBadge group={d.blood_group} size="sm" />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Text style={styles.matchDonorNameMuted}>{d.full_name}</Text>
                              <View style={styles.restingDaysTag}>
                                <Text style={styles.restingDaysTagText}>{d.cooldown_days_left}d rest remaining</Text>
                              </View>
                            </View>
                            <Text style={styles.matchDonorMetaMuted}>
                              {d.area}, {d.district} • Donated: {d.last_donation_date} • Next eligible: {d.cooldown_end_date}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : null}
                </ScrollView>

                <View style={styles.matchActionsContainer}>
                  <View style={styles.matchButtonsRow}>
                    <Pressable
                      testID="notify-same-area"
                      style={[styles.btnNotifyScope, { backgroundColor: colors.brandBlue }]}
                      onPress={() => notify("same_area")}
                    >
                      <Ionicons name="navigate" size={14} color="#FFFFFF" />
                      <Text style={styles.btnNotifyScopeText}>Same Area ({matchModal.data.counts?.same_area || 0})</Text>
                    </Pressable>

                    <Pressable
                      testID="notify-all"
                      style={[styles.btnNotifyScope, { backgroundColor: colors.brandPrimary }]}
                      onPress={() => notify("all")}
                    >
                      <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                      <Text style={styles.btnNotifyScopeText}>Notify All ({matchModal.data.counts?.total || 0})</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    testID="notify-selected"
                    style={[styles.btnNotifySelected, !matchModal.selected?.size && styles.btnNotifyDisabled]}
                    onPress={() => notify("selected")}
                    disabled={!matchModal.selected?.size}
                  >
                    <Text style={styles.btnNotifySelectedText}>
                      Broadcast to Selected ({matchModal.selected?.size || 0})
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: RECORD / UPDATE DONATION DATE (3-MONTH REST COOLDOWN) */}
      {/* ========================================================================= */}
      <Modal visible={donationModal.open} transparent animationType="fade" onRequestClose={() => setDonationModal({ open: false, dateInput: "" })}>
        <View style={styles.modalBg}>
          <View style={styles.modal} testID="donation-modal">
            <View style={[styles.modalShieldIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="heart" size={32} color="#D97706" />
            </View>

            <Text style={styles.modalTitle}>Record Blood Donation</Text>
            <Text style={styles.modalSubtitle}>{donationModal.donor?.full_name} ({donationModal.donor?.blood_group})</Text>

            <View style={styles.donationRuleNotice}>
              <Ionicons name="information-circle" size={16} color="#B45309" />
              <Text style={styles.donationRuleText}>
                Medical Rule: After blood donation, a donor enters a mandatory 3-month (90 days) rest period and will NOT receive any donation notifications.
              </Text>
            </View>

            <View style={styles.quickPresetRow}>
              <Pressable
                style={styles.quickPresetBtn}
                onPress={() => setDonationModal((prev) => ({ ...prev, dateInput: new Date().toISOString().slice(0, 10) }))}
              >
                <Ionicons name="today-outline" size={13} color={colors.brandPrimary} />
                <Text style={styles.quickPresetBtnText}>Donated Today</Text>
              </Pressable>

              <Pressable
                style={styles.quickPresetBtn}
                onPress={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setDonationModal((prev) => ({ ...prev, dateInput: d.toISOString().slice(0, 10) }));
                }}
              >
                <Ionicons name="calendar-outline" size={13} color="#475569" />
                <Text style={styles.quickPresetBtnText}>1 Mo Ago</Text>
              </Pressable>

              <Pressable
                style={styles.quickPresetBtn}
                onPress={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 2);
                  setDonationModal((prev) => ({ ...prev, dateInput: d.toISOString().slice(0, 10) }));
                }}
              >
                <Ionicons name="calendar-outline" size={13} color="#475569" />
                <Text style={styles.quickPresetBtnText}>2 Mo Ago</Text>
              </Pressable>
            </View>

            <View style={styles.rekeyInputWrap}>
              <Text style={styles.rekeyInputLabel}>Donation Date (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.rekeyTextInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                value={donationModal.dateInput}
                onChangeText={(val) => setDonationModal((prev) => ({ ...prev, dateInput: val }))}
              />
            </View>

            <View style={styles.donationModalActions}>
              {donationModal.donor?.last_donation_date ? (
                <Pressable
                  style={styles.donationClearBtn}
                  onPress={() => saveDonationDate(null)}
                  disabled={donationModal.submitting}
                >
                  <Text style={styles.donationClearBtnText}>Clear Record</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={[styles.rekeySubmitBtn, (!donationModal.dateInput || donationModal.submitting) && styles.btnNotifyDisabled]}
                onPress={() => saveDonationDate(donationModal.dateInput)}
                disabled={!donationModal.dateInput || donationModal.submitting}
              >
                {donationModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                    <Text style={styles.rekeySubmitText}>Save & Apply 3-Mo Rest</Text>
                  </>
                )}
              </Pressable>
            </View>

            <Pressable style={styles.modalCloseBtn} onPress={() => setDonationModal({ open: false, dateInput: "" })}>
              <Text style={styles.modalCloseText}>Cancel / Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: FULFILL BLOOD REQUEST (LINK DONOR & COOLDOWN) */}
      {/* ========================================================================= */}
      <Modal visible={fulfillModal.open} transparent animationType="fade" onRequestClose={() => setFulfillModal({ open: false, donationDate: new Date().toISOString().slice(0, 10) })}>
        <View style={styles.modalBg}>
          <View style={styles.modal} testID="fulfill-modal">
            <View style={[styles.modalShieldIcon, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="checkmark-done-circle" size={32} color={colors.brandGreen} />
            </View>

            <Text style={styles.modalTitle}>Fulfill Blood Request</Text>
            <Text style={styles.modalSubtitle}>
              {fulfillModal.request?.patient_name} • {fulfillModal.request?.blood_group} ({fulfillModal.request?.units_required} Unit)
            </Text>

            <Text style={styles.fulfillSelectLabel}>Select Donor Who Fulfilled (Optional):</Text>
            <ScrollView style={{ maxHeight: 180, width: "100%", marginVertical: 8 }}>
              <Pressable
                style={[styles.fulfillDonorRow, !fulfillModal.donorId && styles.fulfillDonorRowSelected]}
                onPress={() => setFulfillModal((prev) => ({ ...prev, donorId: undefined }))}
              >
                <View style={[styles.radioCircle, !fulfillModal.donorId && styles.radioCircleActive]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.fulfillDonorName}>External / Walk-in / Unlisted Donor</Text>
                  <Text style={styles.fulfillDonorSub}>Does not affect registered donor rest period</Text>
                </View>
              </Pressable>

              {donors
                .filter((d) => d.blood_group === fulfillModal.request?.blood_group)
                .map((d) => {
                  const isSelected = fulfillModal.donorId === d.id;
                  return (
                    <Pressable
                      key={d.id}
                      style={[styles.fulfillDonorRow, isSelected && styles.fulfillDonorRowSelected]}
                      onPress={() => setFulfillModal((prev) => ({ ...prev, donorId: d.id }))}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]} />
                      <BloodGroupBadge group={d.blood_group} size="sm" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.fulfillDonorName}>{d.full_name}</Text>
                        <Text style={styles.fulfillDonorSub}>
                          {d.area}, {d.district} • Mobile: +91 {d.mobile}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </ScrollView>

            {fulfillModal.donorId ? (
              <View style={styles.fulfillCooldownNotice}>
                <Ionicons name="shield-checkmark" size={15} color="#D97706" />
                <Text style={styles.fulfillCooldownText}>
                  Selected donor will automatically enter a 3-month medical rest cooldown starting today. They will not be notified for 90 days.
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.rekeySubmitBtn, { backgroundColor: colors.brandGreen, marginTop: 12 }]}
              onPress={submitFulfill}
              disabled={fulfillModal.submitting}
            >
              {fulfillModal.submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                  <Text style={styles.rekeySubmitText}>Confirm & Complete Fulfillment</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setFulfillModal({ open: false, donationDate: new Date().toISOString().slice(0, 10) })}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, sub, icon, color = colors.brandPrimary, bg, testID, isMobile }: any) {
  return (
    <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile]} testID={testID}>
      <View style={[styles.kpiIconWrap, { backgroundColor: bg || "#F1F5F9" }]}>
        <Ionicons name={icon} size={isMobile ? 18 : 22} color={color} />
      </View>
      <Text style={[styles.kpiValue, isMobile && { fontSize: 20 }]}>{value?.toLocaleString?.() ?? value ?? 0}</Text>
      <Text style={[styles.kpiLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[styles.kpiSub, isMobile && { fontSize: 9 }]} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },

  /* Top Bar */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    width: "100%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerMobileTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  adminBadgeSmall: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminBadgeSmallText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
  headerMobileSub: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  adminBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },

  /* Tabs Bar */
  tabsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabUrgentBadge: {
    backgroundColor: "#DC2626",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabUrgentText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  /* Content Wrapper */
  contentWrap: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },

  /* System Ribbon */
  systemRibbon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  systemIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  systemStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  systemMetaText: {
    fontSize: 11,
    color: "#64748B",
  },

  /* Active Emergency Banner */
  activeEmergencyBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  emergencyFlashBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  emergencyFlashText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  activeEmergencyDesc: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "600",
    marginBottom: 10,
    lineHeight: 18,
  },
  emergencyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  emergencyActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* KPI Grid */
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: "31.8%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 10,
  },
  kpiCardMobile: {
    width: "48.5%",
    padding: 10,
    marginBottom: 8,
  },
  kpiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  /* Card Boxes */
  cardBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardBoxHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  cardBoxTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  cardBoxSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  badgeCountPill: {
    backgroundColor: colors.brandPrimaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeCountText: {
    color: colors.brandPrimary,
    fontSize: 11,
    fontWeight: "800",
  },
  bgList: {
    gap: 10,
  },
  bgRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: radius.md,
  },
  bgRowLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  bgRowCount: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.brandPrimary,
    borderRadius: 3,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  distName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  distCount: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.brandBlue,
  },
  rateBox: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
  },
  rateNumber: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.brandBlue,
  },
  rateSub: {
    fontSize: 12,
    color: "#1E40AF",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginVertical: 10,
  },

  /* Filter Section */
  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },
  filterChipRow: {
    gap: 6,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  subFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  availChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "#F1F5F9",
  },
  availChipActive: {
    backgroundColor: "#0F172A",
  },
  availChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  availChipTextActive: {
    color: "#FFFFFF",
  },
  resultCountText: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },

  /* Donor Card */
  donorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  donorCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  donorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  donorName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  donorMetaLocation: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  donorDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  detailItem: {
    width: "48%",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 1,
  },
  detailValuePrimary: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandBlue,
  },
  clickableContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  donorActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandBlue,
  },
  actionBtnAvailability: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Request Card */
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  requestCardEmergency: {
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  reqCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reqCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  reqPatientName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  reqNumberText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  reqBadgesCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  emergencyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emergencyTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  urgencyTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  urgencyTagText: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "800",
  },
  statusPill: {
    backgroundColor: colors.brandPrimaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  reqDetailsGrid: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: 10,
    marginVertical: 10,
    gap: 6,
  },
  reqDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reqDetailText: {
    fontSize: 12,
    color: "#334155",
  },
  reqMessageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  reqMessageText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    flex: 1,
  },
  reqActionsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnMatchNotify: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  btnMatchNotifyText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  btnFulfill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  btnFulfillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  btnReviewing: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btnReviewingText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  btnCancel: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  btnCancelText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "700",
  },

  /* Broadcast Card */
  broadcastCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  broadcastCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  broadcastTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  broadcastMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  broadcastStatsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: 12,
    marginVertical: 12,
    justifyContent: "space-around",
    alignItems: "center",
  },
  bStatCol: {
    alignItems: "center",
  },
  bStatNum: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  bStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
    textTransform: "uppercase",
  },
  bStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
  },
  broadcastFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  broadcastFooterText: {
    fontSize: 11,
    color: "#64748B",
  },

  /* Audit Trail */
  auditRowCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  auditIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  auditActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brandBlue,
  },
  auditTimeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  auditDetailText: {
    fontSize: 11,
    color: "#334155",
    marginTop: 2,
  },
  auditMetaText: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "monospace",
    marginTop: 2,
  },
  historyHead: {
    marginBottom: spacing.md,
  },
  historyHeadTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  historyHeadSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 320,
  },

  /* Modals */
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalShieldIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  aadhaarDisplayBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: spacing.md,
    width: "100%",
    alignItems: "center",
  },
  aadhaarText: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.brandPrimary,
    letterSpacing: 3,
  },
  decryptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  decryptedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  rekeyToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  rekeyToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandBlue,
  },
  rekeyContainer: {
    width: "100%",
    marginVertical: spacing.md,
  },
  keyMismatchNotice: {
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 12,
  },
  keyMismatchTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  keyMismatchDesc: {
    fontSize: 11,
    color: "#78350F",
    lineHeight: 16,
    marginBottom: 4,
  },
  keyMismatchSub: {
    fontSize: 10,
    color: "#92400E",
    lineHeight: 14,
  },
  rekeyInputWrap: {
    marginBottom: 10,
  },
  rekeyInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  rekeyTextInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 2,
    textAlign: "center",
  },
  rekeyDigitsCount: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "right",
    marginTop: 3,
  },
  rekeyActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  rekeyCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  rekeyCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  rekeySubmitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  rekeySubmitText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  auditNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: spacing.lg,
  },
  auditNoticeText: {
    fontSize: 11,
    color: "#991B1B",
    flex: 1,
    lineHeight: 16,
  },
  modalCloseBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: radius.pill,
    width: "100%",
    alignItems: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Smart Match Modal */
  matchModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 600,
    maxHeight: "88%",
  },
  matchModalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  matchModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  matchModalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  matchStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  matchStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  matchStatVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  matchStatLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  matchListSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#64748B",
    marginBottom: 6,
  },
  matchDonorsList: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  matchRowSelected: {
    backgroundColor: "#EFF6FF",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  matchDonorName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  matchDonorMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  bucketTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bucketTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  noMatchText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    padding: 24,
  },
  matchActionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  matchButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnNotifyScope: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  btnNotifyScopeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  btnNotifySelected: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  btnNotifyDisabled: {
    backgroundColor: "#CBD5E1",
  },
  btnNotifySelectedText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* 3-Month Donation Rest Styles */
  restStatusBanner: {
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  restStatusBannerResting: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  restStatusBannerEligible: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  restStatusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  restBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  restBannerSub: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: "500",
  },
  recordDonationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  recordDonationBtnActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  recordDonationBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Matching Modal Resting Section */
  matchRestSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  matchRestSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#92400E",
    letterSpacing: 0.5,
  },
  restBadgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  restBadgeTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#92400E",
  },
  matchRestSectionDesc: {
    fontSize: 11,
    color: "#78350F",
    marginBottom: 10,
    lineHeight: 15,
  },
  matchRowResting: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    opacity: 0.85,
  },
  checkboxDisabled: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  restingDaysTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  restingDaysTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  matchDonorNameMuted: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  matchDonorMetaMuted: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },

  /* Donation Modal */
  donationRuleNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    width: "100%",
  },
  donationRuleText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
    fontWeight: "500",
  },
  quickPresetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    width: "100%",
  },
  quickPresetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickPresetBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  donationModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginTop: 8,
  },
  donationClearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  donationClearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* Fulfill Modal */
  fulfillSelectLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  fulfillDonorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  fulfillDonorRowSelected: {
    borderColor: colors.brandGreen,
    backgroundColor: "#F0FDF4",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: colors.brandGreen,
    borderWidth: 5,
  },
  fulfillDonorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  fulfillDonorSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  fulfillCooldownNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    width: "100%",
    marginTop: 4,
  },
  fulfillCooldownText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
});
