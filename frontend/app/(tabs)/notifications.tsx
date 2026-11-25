import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { DatePickerField } from "@/src/components/DatePickerField";
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD } from "@/src/utils/dateUtils";
import {
  pickDonationProofImage,
  takeDonationProofPhoto,
  uploadDonationProofToCloudinary,
} from "@/src/services/cloudinary";
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

  // Direct Fulfill Blood Request Modal State (From Alerts)
  const [fulfillModal, setFulfillModal] = useState<{
    open: boolean;
    notif: any | null;
    request: any | null;
    date: string;
    hospital: string;
    units: string;
    notes: string;
    proofImage: { uri: string; base64?: string } | null;
    errors: Record<string, string>;
    submitting: boolean;
    uploadStatus: string;
  }>({
    open: false,
    notif: null,
    request: null,
    date: formatDateToDDMMYYYY(new Date()),
    hospital: "",
    units: "1",
    notes: "",
    proofImage: null,
    errors: {},
    submitting: false,
    uploadStatus: "",
  });

  function openFulfillModal(n: any) {
    const req = n.request || n.blood_requests || {};
    setFulfillModal({
      open: true,
      notif: n,
      request: req,
      date: formatDateToDDMMYYYY(new Date()),
      hospital: req.hospital_name || "General Hospital, Karaikal",
      units: "1",
      notes: `Fulfilled request #${req.request_number || ""} for patient ${req.patient_name || "Patient"}`,
      proofImage: null,
      errors: {},
      submitting: false,
      uploadStatus: "",
    });
  }

  async function handlePickProof() {
    try {
      const res = await pickDonationProofImage();
      if (!res.cancelled && res.uri) {
        setFulfillModal((p) => ({
          ...p,
          proofImage: { uri: res.uri, base64: res.base64 },
          errors: { ...p.errors, proof: "" },
        }));
      }
    } catch (e: any) {
      toast("error", "Gallery Error", e.message || "Failed to pick image");
    }
  }

  async function handleTakeProofPhoto() {
    try {
      const res = await takeDonationProofPhoto();
      if (!res.cancelled && res.uri) {
        setFulfillModal((p) => ({
          ...p,
          proofImage: { uri: res.uri, base64: res.base64 },
          errors: { ...p.errors, proof: "" },
        }));
      }
    } catch (e: any) {
      toast("error", "Camera Error", e.message || "Failed to open camera");
    }
  }

  async function handleConfirmFulfill() {
    const { notif, request, date, hospital, units, notes, proofImage } = fulfillModal;
    const reqId = request?.id || notif?.request_id;
    if (!reqId) {
      toast("error", "Error", "Cannot find target blood request.");
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!date?.trim()) newErrors.date = "Donation date is required";
    if (!hospital?.trim()) newErrors.hospital = "Hospital or Blood bank name is required";
    if (!proofImage) newErrors.proof = "Donation proof photo / certificate is required";

    if (Object.keys(newErrors).length > 0) {
      setFulfillModal((p) => ({ ...p, errors: newErrors }));
      if (!proofImage) {
        toast("error", "Donation Proof Required", "Please attach a donation proof photo / certificate to fulfill this request.");
      } else {
        toast("error", "Incomplete Form", "Please fill in all required fields.");
      }
      return;
    }

    setFulfillModal((p) => ({
      ...p,
      submitting: true,
      uploadStatus: proofImage ? "Uploading donation certificate..." : "Fulfilling blood request...",
    }));

    try {
      let uploadedCertificateUrl: string | null = null;
      if (proofImage) {
        uploadedCertificateUrl = await uploadDonationProofToCloudinary(proofImage);
      }

      await api("/donors/me/donations", {
        auth: true,
        method: "POST",
        body: {
          donation_date: date,
          hospital_or_camp: hospital.trim(),
          units: parseInt(units, 10) || 1,
          notes: notes.trim() || undefined,
          certificate_image_url: uploadedCertificateUrl,
          blood_request_id: reqId,
        },
      });

      toast(
        "success",
        "Blood Request Fulfilled!",
        "Thank you for saving a life! Your donation certificate and timeline have been logged."
      );

      setFulfillModal({
        open: false,
        notif: null,
        request: null,
        date: formatDateToDDMMYYYY(new Date()),
        hospital: "",
        units: "1",
        notes: "",
        proofImage: null,
        errors: {},
        submitting: false,
        uploadStatus: "",
      });

      // Optimistically update local item so the UI reflects Donated & Fulfilled immediately
      setItems((prev) =>
        prev.map((item) =>
          item.id === notif?.id
            ? { ...item, response: "I Donated", responded_at: new Date().toISOString() }
            : item
        )
      );

      await load();
      await refreshPendingNotifications();
    } catch (e: any) {
      toast("error", "Fulfillment Failed", e.message || "Could not fulfill request.");
      setFulfillModal((p) => ({ ...p, submitting: false, uploadStatus: "" }));
    }
  }

  const load = useCallback(async () => {
    try {
      const r: any = await api("/notifications", { auth: true });
      const rawList = r?.notifications || [];
      // Remove any notification linked to a cancelled blood request
      const list = rawList.filter((n: any) => {
        const reqStatus = n.request?.status || n.blood_requests?.status;
        return reqStatus !== "Cancelled" && n.status !== "cancelled" && n.response !== "Cancelled";
      });
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
      toast(
        "success",
        "Response Recorded",
        response === "I Can Donate"
          ? "Thank you! Once you give blood at the hospital, tap 'Fulfill Blood Request' below to complete it."
          : "Response recorded as unavailable."
      );

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

  const pendingItems = items.filter((n) => {
    const req = n.request || n.blood_requests || {};
    const isClosed = req.status === "Fulfilled" || req.status === "Cancelled" || n.response === "Revoked - Request Fulfilled";
    return !n.response && !isClosed;
  });
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
          const isFulfilledOrRevoked = req.status === "Fulfilled" || n.response === "Revoked - Request Fulfilled";
          const isPending = !n.response && !isFulfilledOrRevoked;
          const isCurrentLoading = respondingId === n.id;

          return (
            <View
              style={[
                styles.card,
                isPending && styles.cardPending,
                isEmergency && !isFulfilledOrRevoked && styles.cardEmergency,
              ]}
              testID={`notif-${n.id}`}
            >
              {/* Card Header & Badge */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <View style={[styles.iconBox, isFulfilledOrRevoked ? { backgroundColor: "#16A34A" } : isEmergency ? styles.iconEmergency : styles.iconNormal]}>
                    <Ionicons name={isFulfilledOrRevoked ? "checkmark-done" : "water"} size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {isFulfilledOrRevoked ? "✅ FULFILLED: " : isEmergency ? "🚨 EMERGENCY: " : "🩸 Blood Needed: "}
                      <Text style={{ color: colors.brandPrimary }}>{bg}</Text>
                    </Text>
                    <Text style={styles.cardHospital}>
                      {hospital} • {city}
                    </Text>
                  </View>
                </View>

                {isFulfilledOrRevoked ? (
                  <View style={[styles.respondedBadge, { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC" }]}>
                    <Ionicons name="checkmark-done" size={13} color="#15803D" />
                    <Text style={[styles.respondedText, { color: "#15803D", fontWeight: "800" }]}>
                      Blood Arranged
                    </Text>
                  </View>
                ) : isPending ? (
                  <View style={styles.pendingItemBadge}>
                    <View style={styles.beaconDotSmall} />
                    <Text style={styles.pendingItemBadgeText}>ACTION REQUIRED</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.respondedBadge,
                      {
                        backgroundColor:
                          n.response === "I Donated" || n.response === "Donated"
                            ? "#D1FAE5"
                            : n.response === "I Can Donate"
                            ? "#DCFCE7"
                            : "#F1F5F9",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        n.response === "I Donated" || n.response === "Donated"
                          ? "shield-checkmark"
                          : n.response === "I Can Donate"
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={13}
                      color={
                        n.response === "I Donated" || n.response === "Donated"
                          ? "#059669"
                          : n.response === "I Can Donate"
                          ? "#15803D"
                          : "#64748B"
                      }
                    />
                    <Text
                      style={[
                        styles.respondedText,
                        {
                          color:
                            n.response === "I Donated" || n.response === "Donated"
                              ? "#059669"
                              : n.response === "I Can Donate"
                              ? "#15803D"
                              : "#475569",
                        },
                      ]}
                    >
                      {n.response === "I Donated" || n.response === "Donated"
                        ? "Donated & Fulfilled"
                        : n.response === "I Can Donate"
                        ? "Will Donate"
                        : "Unavailable"}
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

              {/* Action Buttons for Pending or Direct Fulfill Connection for Responded */}
              {isFulfilledOrRevoked ? (
                <View style={{ backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 8, padding: 10, marginTop: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                    <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#166534" }}>
                      Blood Arranged • Request Closed
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#15803D", marginTop: 2, lineHeight: 15 }}>
                    3 donors stepped forward and blood has been successfully arranged for this patient. The alert has been revoked. Thank you for your noble readiness!
                  </Text>
                  {req.request_number ? (
                    <Pressable
                      style={{ marginTop: 6 }}
                      onPress={() =>
                        router.push({
                          pathname: "/request-details",
                          params: { id: req.request_number },
                        })
                      }
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#166534", textDecorationLine: "underline" }}>
                        View Request Details →
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : isPending ? (
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
              ) : n.response === "I Can Donate" ? (
                /* ========================================================================= */
                /* DIRECT FULFILL CONNECT IN ALERTS (AFTER GIVING "I CAN DONATE") */
                /* ========================================================================= */
                <View style={styles.agreedToDonateBox}>
                  <View style={styles.agreedHeaderRow}>
                    <View style={styles.agreedIconWrap}>
                      <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agreedTitle}>You Agreed to Donate for This Patient</Text>
                      <Text style={styles.agreedSub}>
                        Once you give blood at {hospital}, fulfill this request to log your lifesaver points, certificate, and rest period.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.btnFulfillFromAlert}
                    onPress={() => openFulfillModal(n)}
                    testID={`fulfill-req-btn-${n.id}`}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.btnFulfillFromAlertText}>Fulfill Blood Request</Text>
                  </Pressable>

                  <View style={styles.agreedActionsRow}>
                    <Pressable
                      style={styles.timelineLink}
                      onPress={() => router.push("/donation-activity")}
                    >
                      <Ionicons name="time-outline" size={13} color="#2563EB" />
                      <Text style={styles.timelineLinkText}>Donation Activity</Text>
                    </Pressable>
                    {req.request_number ? (
                      <Pressable
                        style={styles.timelineLink}
                        onPress={() =>
                          router.push({
                            pathname: "/request-details",
                            params: { id: req.request_number },
                          })
                        }
                      >
                        <Text style={[styles.timelineLinkText, { color: "#475569" }]}>Patient & Hospital Info →</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : n.response === "I Donated" || n.response === "Donated" ? (
                /* ========================================================================= */
                /* PROUD DONATED & FULFILLED BADGE & TIMELINE SHORTCUT */
                /* ========================================================================= */
                <View style={styles.fulfilledCardBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={styles.trophyIconWrap}>
                      <Ionicons name="trophy" size={17} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fulfilledCardTitle}>Blood Donated & Request Fulfilled</Text>
                      <Text style={styles.fulfilledCardSub}>
                        Thank you for your noble deed! Your blood donation has been recorded, rest period applied, and certificate logged.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.fulfilledCardFooter}>
                    <Pressable
                      style={styles.viewTimelineBtn}
                      onPress={() => router.push("/donation-activity")}
                    >
                      <Ionicons name="ribbon-outline" size={14} color="#15803D" />
                      <Text style={styles.viewTimelineBtnText}>View in Donation Activity →</Text>
                    </Pressable>
                    {req.request_number ? (
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/request-details",
                            params: { id: req.request_number },
                          })
                        }
                      >
                        <Text style={styles.reqDetailsText}>Request Details</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.completedFooter}>
                  <Text style={styles.completedText}>
                    Your response was recorded as unavailable.
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

      {/* ========================================================================= */}
      {/* MODAL: FULFILL BLOOD REQUEST (DIRECTLY FROM ALERTS) */}
      {/* ========================================================================= */}
      <Modal
        visible={fulfillModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!fulfillModal.submitting) {
            setFulfillModal((p) => ({ ...p, open: false }));
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBg}
        >
          <View style={styles.fulfillModalCard}>
            {/* Header */}
            <View style={styles.fulfillModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={styles.fulfillHeaderIconWrap}>
                  <Ionicons name="checkmark-done-circle" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fulfillModalTitle}>Fulfill Blood Request</Text>
                  <Text style={styles.fulfillModalSubtitle} numberOfLines={1}>
                    Req #{fulfillModal.request?.request_number || "KKLD"} • {fulfillModal.request?.patient_name || "Patient"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.modalCloseCircleBtn}
                onPress={() => {
                  if (!fulfillModal.submitting) {
                    setFulfillModal((p) => ({ ...p, open: false }));
                  }
                }}
                hitSlop={8}
                testID="close-fulfill-modal"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 520 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Snapshot of the patient request */}
              {fulfillModal.request ? (
                <View style={styles.reqSnapshotCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <BloodGroupBadge group={fulfillModal.request.blood_group} size="sm" />
                      <Text style={styles.snapshotPatientName} numberOfLines={1}>{fulfillModal.request.patient_name}</Text>
                    </View>
                    <View style={styles.snapshotUrgencyBadge}>
                      <Text style={styles.snapshotUrgencyText}>{fulfillModal.request.urgency || "Normal"}</Text>
                    </View>
                  </View>
                  <Text style={styles.snapshotHospitalText} numberOfLines={1}>
                    📍 {fulfillModal.request.hospital_name} • {fulfillModal.request.hospital_city || fulfillModal.request.hospital_area || "Karaikal"}
                  </Text>
                </View>
              ) : null}

              {/* Donation Date */}
              <View style={{ marginVertical: 8 }}>
                <DatePickerField
                  testID="alert-fulfill-date"
                  label="Donation Date (DD-MM-YYYY) *"
                  value={fulfillModal.date}
                  onChange={(d) => {
                    setFulfillModal((p) => ({
                      ...p,
                      date: d,
                      errors: { ...p.errors, date: "" },
                    }));
                  }}
                  maxDate={new Date()}
                  error={fulfillModal.errors.date}
                />
              </View>

              {/* Hospital / Blood Bank Name */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Hospital or Blood Bank Name *</Text>
                <TextInput
                  testID="alert-fulfill-hospital"
                  style={[styles.modalInput, fulfillModal.errors.hospital ? styles.modalInputError : null]}
                  placeholder="e.g. General Hospital, Karaikal"
                  placeholderTextColor="#94A3B8"
                  value={fulfillModal.hospital}
                  onChangeText={(v) => {
                    setFulfillModal((p) => ({
                      ...p,
                      hospital: v,
                      errors: { ...p.errors, hospital: "" },
                    }));
                  }}
                />
                {fulfillModal.errors.hospital ? (
                  <Text style={styles.modalErrText}>{fulfillModal.errors.hospital}</Text>
                ) : null}
              </View>

              {/* Units Donated */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Units Donated</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  {["1", "2"].map((u) => (
                    <Pressable
                      key={u}
                      onPress={() => setFulfillModal((p) => ({ ...p, units: u }))}
                      style={[styles.unitChip, fulfillModal.units === u && styles.unitChipActive]}
                    >
                      <Text style={[styles.unitChipText, fulfillModal.units === u && styles.unitChipTextActive]}>
                        {u} Unit ({fulfillModal.request?.blood_group || "Blood"})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Certificate / Proof Photo */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={[styles.inputLabel, fulfillModal.errors.proof ? { color: "#EF4444" } : null]}>
                    Donation Proof / Certificate Photo *
                  </Text>
                  <View style={[styles.verifiedProofBadge, fulfillModal.errors.proof ? { backgroundColor: "#FEE2E2" } : null]}>
                    <Ionicons name="shield-checkmark" size={11} color={fulfillModal.errors.proof ? "#EF4444" : "#059669"} />
                    <Text style={[styles.verifiedProofBadgeText, fulfillModal.errors.proof ? { color: "#DC2626" } : null]}>
                      Verified Proof
                    </Text>
                  </View>
                </View>

                {fulfillModal.proofImage ? (
                  <View style={styles.proofSelectedBox}>
                    <Image source={{ uri: fulfillModal.proofImage.uri }} style={styles.proofPreviewThumb} resizeMode="cover" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.proofSelectedTitle} numberOfLines={1}>Certificate Photo Attached ✓</Text>
                      <Text style={styles.proofSelectedSub}>Will be saved to your verified timeline</Text>
                    </View>
                    <Pressable
                      style={styles.proofRemoveBtn}
                      onPress={() => setFulfillModal((p) => ({ ...p, proofImage: null }))}
                      disabled={fulfillModal.submitting}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View style={styles.proofUploadRow}>
                      <Pressable
                        style={[
                          styles.proofPickerBtn,
                          fulfillModal.errors.proof ? { borderColor: "#EF4444", backgroundColor: "#FEF2F2" } : null,
                        ]}
                        onPress={handleTakeProofPhoto}
                        disabled={fulfillModal.submitting}
                      >
                        <Ionicons name="camera-outline" size={17} color={fulfillModal.errors.proof ? "#EF4444" : colors.brandPrimary} />
                        <Text style={[styles.proofPickerBtnText, fulfillModal.errors.proof ? { color: "#EF4444" } : null]}>Take Photo</Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.proofPickerBtn,
                          fulfillModal.errors.proof ? { borderColor: "#EF4444", backgroundColor: "#FEF2F2" } : null,
                        ]}
                        onPress={handlePickProof}
                        disabled={fulfillModal.submitting}
                      >
                        <Ionicons name="images-outline" size={17} color={fulfillModal.errors.proof ? "#EF4444" : colors.brandPrimary} />
                        <Text style={[styles.proofPickerBtnText, fulfillModal.errors.proof ? { color: "#EF4444" } : null]}>Upload Certificate</Text>
                      </Pressable>
                    </View>
                    {fulfillModal.errors.proof ? (
                      <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                        {fulfillModal.errors.proof}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Notes */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Notes / Reference (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Fulfilled emergency request at blood bank"
                  placeholderTextColor="#94A3B8"
                  value={fulfillModal.notes}
                  onChangeText={(v) => setFulfillModal((p) => ({ ...p, notes: v }))}
                />
              </View>

              {fulfillModal.uploadStatus ? (
                <View style={styles.uploadStatusStrip}>
                  <ActivityIndicator size="small" color={colors.brandPrimary} />
                  <Text style={styles.uploadStatusStripText}>{fulfillModal.uploadStatus}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.fulfillModalFooter}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  if (!fulfillModal.submitting) {
                    setFulfillModal((p) => ({ ...p, open: false }));
                  }
                }}
                disabled={fulfillModal.submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSubmitBtn, fulfillModal.submitting && { opacity: 0.7 }]}
                onPress={handleConfirmFulfill}
                disabled={fulfillModal.submitting}
                testID="submit-fulfill-modal-btn"
              >
                {fulfillModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Confirm & Fulfill Request</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  /* Direct Fulfill Connect Styles (Alerts Tab) */
  agreedToDonateBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  agreedHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  agreedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  agreedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  agreedSub: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 15,
  },
  btnFulfillFromAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnFulfillFromAlertText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  agreedActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
  },
  timelineLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  timelineLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  fulfilledCardBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  trophyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  fulfilledCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },
  fulfilledCardSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
    lineHeight: 15,
  },
  fulfilledCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
  },
  viewTimelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewTimelineBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    textDecorationLine: "underline",
  },
  reqDetailsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },

  /* Fulfill Modal Styles */
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  fulfillModalCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  fulfillModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  fulfillHeaderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  fulfillModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  fulfillModalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  modalCloseCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  reqSnapshotCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  snapshotPatientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  snapshotUrgencyBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  snapshotUrgencyText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  snapshotHospitalText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  modalInputError: {
    borderColor: colors.error,
  },
  modalErrText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  unitChipActive: {
    borderColor: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  unitChipTextActive: {
    color: "#166534",
  },
  verifiedProofBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedProofBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  proofUploadRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  proofPickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
  },
  proofPickerBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  proofSelectedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.md,
    padding: 8,
    marginTop: 4,
  },
  proofPreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  proofSelectedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  proofSelectedSub: {
    fontSize: 10,
    color: "#15803D",
    marginTop: 1,
  },
  proofRemoveBtn: {
    padding: 6,
  },
  uploadStatusStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 8,
  },
  uploadStatusStripText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  fulfillModalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  modalSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: "#16A34A",
  },
  modalSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
