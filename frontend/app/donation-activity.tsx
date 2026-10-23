import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { toast } from "@/src/Toast";
import { DatePickerField } from "@/src/components/DatePickerField";
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD } from "@/src/utils/dateUtils";
import {
  pickDonationProofImage,
  takeDonationProofPhoto,
  uploadDonationProofToCloudinary,
} from "@/src/services/cloudinary";

export default function DonationActivityScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<any>(null);
  const [bloodDonations, setBloodDonations] = useState<any[]>([]);
  const [notifiedRequests, setNotifiedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Record Donation Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const pendingNotifiedRequests = notifiedRequests.filter((n: any) => {
    return n.response !== "I Donated" && n.response !== "Donated";
  });
  const fulfilledNotifiedRequests = notifiedRequests.filter((n: any) => {
    return n.response === "I Donated" || n.response === "Donated";
  });
  const [donationDate, setDonationDate] = useState(formatDateToDDMMYYYY(new Date()));
  const [donationHospital, setDonationHospital] = useState("");
  const [donationUnits, setDonationUnits] = useState("1");
  const [donationNotes, setDonationNotes] = useState("");
  const [proofImage, setProofImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  // Full Image Preview Modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [meRes, donRes, notifRes]: any = await Promise.all([
        api("/donors/me", { auth: true }).catch(() => ({ donor: null })),
        api("/donors/me/donations", { auth: true }).catch(() => ({ donations: [] })),
        api("/notifications", { auth: true }).catch(() => ({ notifications: [] })),
      ]);

      setMe(meRes?.donor || null);
      setBloodDonations(donRes?.donations || []);

      // Extract active notified requests
      const validNotifs = (notifRes?.notifications || []).filter((n: any) => {
        const req = n.request || n.blood_requests;
        return (
          req &&
          req.status !== "Cancelled" &&
          req.status !== "Fulfilled" &&
          n.status !== "cancelled" &&
          n.response !== "Cancelled" &&
          n.response !== "Revoked - Request Fulfilled"
        );
      });
      setNotifiedRequests(validNotifs);
    } catch (e: any) {
      console.warn("Error loading donation activity:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  function openRecordForRequest(req: any) {
    setSelectedRequest(req);
    setDonationHospital(req.hospital_name || "General Hospital, Karaikal");
    setDonationDate(formatDateToDDMMYYYY(new Date()));
    setDonationUnits("1");
    setDonationNotes(`Fulfilled request #${req.request_number} for patient ${req.patient_name || "Patient"}`);
    setProofImage(null);
    setModalErrors({});
    setRecordModalOpen(true);
  }

  function openRecordDirect() {
    setSelectedRequest(null);
    setDonationHospital("");
    setDonationDate(formatDateToDDMMYYYY(new Date()));
    setDonationUnits("1");
    setDonationNotes("");
    setProofImage(null);
    setModalErrors({});
    setRecordModalOpen(true);
  }

  async function handlePickProof() {
    try {
      const res = await pickDonationProofImage();
      if (!res.cancelled && res.uri) {
        setProofImage({ uri: res.uri, base64: res.base64 });
      }
    } catch (e: any) {
      toast("error", "Gallery Error", e.message || "Failed to pick image");
    }
  }

  async function handleTakeProofPhoto() {
    try {
      const res = await takeDonationProofPhoto();
      if (!res.cancelled && res.uri) {
        setProofImage({ uri: res.uri, base64: res.base64 });
      }
    } catch (e: any) {
      toast("error", "Camera Error", e.message || "Failed to open camera");
    }
  }

  async function handleSubmitDonation() {
    const newErrors: Record<string, string> = {};
    if (!donationDate?.trim()) {
      newErrors.date = "Donation date is required";
    }
    if (!donationHospital?.trim()) {
      newErrors.hospital = "Hospital or Blood bank name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setModalErrors(newErrors);
      toast("error", "Incomplete Form", "Please fill in all highlighted required fields.");
      return;
    }

    setModalErrors({});
    setSubmitting(true);
    setUploadStatus(proofImage ? "Uploading donation certificate..." : "Saving donation record...");

    try {
      let uploadedCertificateUrl: string | null = null;
      if (proofImage) {
        uploadedCertificateUrl = await uploadDonationProofToCloudinary(proofImage);
      }

      await api("/donors/me/donations", {
        auth: true,
        method: "POST",
        body: {
          donation_date: donationDate,
          hospital_or_camp: donationHospital.trim() || "General Hospital, Karaikal",
          units: parseInt(donationUnits, 10) || 1,
          notes: donationNotes.trim() || undefined,
          certificate_image_url: uploadedCertificateUrl,
          blood_request_id: selectedRequest?.id || undefined,
        },
      });

      toast("success", "Blood Donation Recorded", "Thank you for being a lifesaver! Your donation timeline has been verified and updated.");
      setRecordModalOpen(false);
      setSelectedRequest(null);
      setProofImage(null);
      await loadData();
    } catch (e: any) {
      toast("error", "Failed to save donation", e.message);
    } finally {
      setSubmitting(false);
      setUploadStatus("");
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HEADER BAR */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
          testID="btn-back-profile"
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Donation Activity</Text>
          <Text style={styles.headerSubtitle}>Verified Lifesaver Timeline & Certificates</Text>
        </View>
        {me?.donor_number ? (
          <View style={styles.donorIdPill}>
            <Ionicons name="id-card" size={12} color="#2563EB" />
            <Text style={styles.donorIdPillText}>{me.donor_number}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP LIFESAVER KPI STRIP */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrap}>
              <Ionicons name="water" size={18} color={colors.brandPrimary} />
            </View>
            <Text style={styles.kpiNumber}>{bloodDonations.length}</Text>
            <Text style={styles.kpiLabel}>Total Donations</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="calendar" size={18} color="#2563EB" />
            </View>
            <Text style={styles.kpiNumberSmall}>
              {me?.last_donation_date ? formatDateToDDMMYYYY(me.last_donation_date) : "None yet"}
            </Text>
            <Text style={styles.kpiLabel}>Last Donated</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: me?.in_cooldown ? "#FEF3C7" : "#D1FAE5" }]}>
              <Ionicons
                name={me?.in_cooldown ? "hourglass-outline" : "checkmark-circle"}
                size={18}
                color={me?.in_cooldown ? "#D97706" : "#059669"}
              />
            </View>
            <Text style={[styles.kpiNumberSmall, { color: me?.in_cooldown ? "#B45309" : "#047857" }]}>
              {me?.in_cooldown ? `${me.cooldown_days_left}d Left` : "Ready"}
            </Text>
            <Text style={styles.kpiLabel}>Rest Cooldown</Text>
          </View>
        </View>

        {/* COOLDOWN RECOVERY BANNER IF ACTIVE */}
        {me?.in_cooldown ? (
          <View style={styles.cooldownAlertBox}>
            <Ionicons name="hourglass" size={18} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.cooldownAlertTitle}>
                Medical Recovery Cooldown Active ({me.cooldown_days_left} Days Remaining)
              </Text>
              <Text style={styles.cooldownAlertSub}>
                You donated on {formatDateToDDMMYYYY(me.last_donation_date)}. You will be eligible to donate again on {me.cooldown_end_date}.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ========================================================================= */}
        {/* SECTION 1: CHECK ASSIGNED & NOTIFIED REQUESTS FIRST */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeadRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="notifications" size={16} color={colors.brandPrimary} />
            <Text style={styles.sectionTitle}>Check Assigned / Notified Requests</Text>
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>
          First check if you were assigned or notified for an urgent blood request. If you donated for any of these patients, link your record directly!
        </Text>

        {pendingNotifiedRequests.length > 0 ? (
          <View style={{ marginBottom: 14 }}>
            {/* Warning banner */}
            <View style={styles.pendingAlertBox}>
              <Ionicons name="warning" size={18} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.pendingAlertTitle}>
                  {pendingNotifiedRequests.length} Active Blood Request Alert{pendingNotifiedRequests.length > 1 ? "s" : ""} Assigned to You
                </Text>
                <Text style={styles.pendingAlertSub}>
                  Please verify if your donation was for one of these patients before adding any other record.
                </Text>
              </View>
            </View>

            {/* List of pending requests */}
            <View style={styles.notifiedRequestsContainer}>
              {pendingNotifiedRequests.map((n: any, idx: number) => {
                const req = n.request || n.blood_requests;

                return (
                  <View key={n.id || idx} style={styles.notifiedReqCard}>
                    <View style={styles.notifiedReqTop}>
                      <BloodGroupBadge group={req.blood_group} size="sm" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={styles.notifiedReqPatient} numberOfLines={1}>
                            Patient: {req.patient_name || "Emergency Patient"}
                          </Text>
                          <View style={[styles.urgencyPill, req.urgency === "Emergency" && styles.urgencyPillEmergency]}>
                            <Text style={[styles.urgencyPillText, req.urgency === "Emergency" && styles.urgencyPillTextEmergency]}>
                              {req.urgency || "Normal"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.notifiedReqHospital}>
                          {req.hospital_name || "General Hospital, Karaikal"}
                        </Text>
                        <Text style={styles.notifiedReqRef}>
                          Req ID: #{req.request_number}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.notifiedReqActionRow}>
                      <Pressable
                        style={styles.btnFulfillReq}
                        onPress={() => openRecordForRequest(req)}
                      >
                        <Ionicons name="heart" size={14} color="#FFFFFF" />
                        <Text style={styles.btnFulfillReqText}>I Donated for this Patient ↗</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Other / Camp Donation Notice & Action */}
            <View style={styles.otherDonationNoticeBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.otherDonationNoticeTitle}>Donated elsewhere (Camp / Walk-in)?</Text>
                <Text style={styles.otherDonationNoticeSub}>
                  If your donation was NOT for any alerted patient above, you can record a separate voluntary donation.
                </Text>
              </View>
              <Pressable
                style={styles.btnDirectDonation}
                onPress={openRecordDirect}
                testID="btn-direct-donation-log"
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.btnDirectDonationText}>+ Log Camp / Other Donation</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: 14 }}>
            <View style={styles.verifiedClearBox}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.verifiedClearTitle}>
                  No Pending Assigned Requests
                </Text>
                <Text style={styles.verifiedClearSub}>
                  No blood request alerts are pending for your profile. You can freely log any voluntary camp or hospital donation below.
                </Text>
              </View>
            </View>

            <View style={styles.directDonationCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.directDonationTitle}>Donated at a Blood Bank or Camp?</Text>
                <Text style={styles.directDonationSub}>
                  Record your voluntary blood donation with your certificate photo to update your cooldown and lifesaver timeline.
                </Text>
              </View>
              <Pressable
                style={styles.btnDirectDonation}
                onPress={openRecordDirect}
                testID="btn-direct-donation-log"
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.btnDirectDonationText}>Log Blood Donation</Text>
              </Pressable>
            </View>
          </View>
        )}

        {fulfilledNotifiedRequests.length > 0 ? (
          <View style={styles.fulfilledListStrip}>
            <Ionicons name="checkmark-done-circle" size={14} color="#059669" />
            <Text style={styles.fulfilledListStripText}>
              You have previously fulfilled {fulfilledNotifiedRequests.length} emergency patient request{fulfilledNotifiedRequests.length > 1 ? "s" : ""}!
            </Text>
          </View>
        ) : null}

        {/* ========================================================================= */}
        {/* SECTION 3: VERIFIED DONATION TIMELINE */}
        {/* ========================================================================= */}
        <View style={[styles.sectionHeadRow, { marginTop: 24 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="time" size={16} color={colors.brandPrimary} />
            <Text style={styles.sectionTitle}>Verified Donation Timeline</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{bloodDonations.length} Verified</Text>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 30, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.brandPrimary} />
            <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>Loading your donation history...</Text>
          </View>
        ) : bloodDonations.length === 0 ? (
          <View style={styles.emptyTimelineCard}>
            <Ionicons name="water-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTimelineTitle}>No blood donations logged yet</Text>
            <Text style={styles.emptyTimelineSub}>
              Every blood donation saves up to 3 precious lives in Karaikal. Log your blood donations with certificate photos above to build your lifesaver profile!
            </Text>
          </View>
        ) : (
          bloodDonations.map((item, idx) => (
            <View key={item.id || idx} style={styles.timelineCard}>
              <View style={styles.timelineHead}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.timelineDot}>
                    <Ionicons name="water" size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.timelineDate}>
                    {formatDateToDDMMYYYY(item.donation_date) || item.donation_date}
                  </Text>
                </View>

                <View style={[styles.verifiedPill, item.recorded_by === "admin" ? styles.verifiedPillAdmin : styles.verifiedPillDonor]}>
                  <Ionicons
                    name={item.recorded_by === "admin" ? "shield-checkmark" : "person"}
                    size={11}
                    color={item.recorded_by === "admin" ? "#2563EB" : "#64748B"}
                  />
                  <Text style={[styles.verifiedPillText, item.recorded_by === "admin" ? { color: "#1D4ED8" } : { color: "#475569" }]}>
                    {item.recorded_by === "admin" ? "Hospital Verified" : "Self-Logged"}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineBody}>
                <Text style={styles.timelineHospital}>
                  {item.hospital_or_camp || "General Hospital, Karaikal"} • {item.units || 1} Unit ({item.blood_group || me?.blood_group})
                </Text>

                {item.blood_request_id ? (
                  <View style={styles.requestLinkedBadge}>
                    <Ionicons name="link" size={11} color="#DC2626" />
                    <Text style={styles.requestLinkedBadgeText}>Linked to Alerted Emergency Request</Text>
                  </View>
                ) : null}

                {item.notes ? (
                  <Text style={styles.timelineNotes}>Note: {item.notes}</Text>
                ) : null}

                {/* Cloudinary Certificate Thumbnail if present */}
                {item.certificate_image_url ? (
                  <Pressable
                    style={styles.proofCardRow}
                    onPress={() => setPreviewImageUrl(item.certificate_image_url)}
                  >
                    <Image
                      source={{ uri: item.certificate_image_url }}
                      style={styles.proofCardThumb}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="ribbon" size={13} color="#059669" />
                        <Text style={styles.proofCardTitle}>Donation Proof / Certificate</Text>
                      </View>
                      <Text style={styles.proofCardSub}>Verified Certificate • Tap to view ↗</Text>
                    </View>
                    <Ionicons name="expand-outline" size={16} color={colors.brandPrimary} />
                  </Pressable>
                ) : (
                  <View style={styles.noProofRow}>
                    <Ionicons name="document-outline" size={12} color="#94A3B8" />
                    <Text style={styles.noProofText}>No certificate image attached</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL: RECORD BLOOD DONATION WITH CLOUDINARY PROOF */}
      {/* ========================================================================= */}
      <Modal
        visible={recordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRecordModalOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeadRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="water" size={18} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedRequest ? "Fulfill Blood Request" : "Log Blood Donation"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedRequest
                      ? `For ${selectedRequest.patient_name} (#${selectedRequest.request_number})`
                      : "Direct camp / hospital voluntary donation"}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setRecordModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Request Association Banner */}
            {selectedRequest ? (
              <View style={styles.modalReqBanner}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="link" size={14} color="#DC2626" />
                    <Text style={styles.modalReqBannerTitle}>
                      Linked to Request #{selectedRequest.request_number}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSelectedRequest(null);
                      setDonationHospital("");
                      setDonationNotes("");
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.modalReqBannerSwitch}>Change ↗</Text>
                  </Pressable>
                </View>
                <Text style={styles.modalReqBannerText}>
                  Patient: {selectedRequest.patient_name || "Emergency Patient"} • {selectedRequest.blood_group} • {selectedRequest.hospital_name}
                </Text>
              </View>
            ) : (
              <View style={styles.modalVoluntaryBanner}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="medkit-outline" size={14} color="#2563EB" />
                  <Text style={styles.modalVoluntaryBannerTitle}>
                    Voluntary Camp / Other Walk-in Donation
                  </Text>
                </View>
                <Text style={styles.modalVoluntaryBannerText}>
                  This record will be saved as an independent voluntary donation.
                </Text>
                {pendingNotifiedRequests.length > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", marginBottom: 4 }}>
                      Or switch to an alerted request:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {pendingNotifiedRequests.map((n: any, idx: number) => {
                        const req = n.request || n.blood_requests;
                        return (
                          <Pressable
                            key={n.id || idx}
                            style={styles.modalReqChip}
                            onPress={() => {
                              setSelectedRequest(req);
                              setDonationHospital(req.hospital_name || "General Hospital, Karaikal");
                              setDonationNotes(`Fulfilled request #${req.request_number} for patient ${req.patient_name || "Patient"}`);
                            }}
                          >
                            <Text style={styles.modalReqChipText}>#{req.request_number}: {req.patient_name}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}

            {/* Donation Date */}
            <View style={{ marginVertical: 8 }}>
              <DatePickerField
                testID="activity-donation-date"
                label="Donation Date (DD-MM-YYYY) *"
                value={donationDate}
                onChange={(d) => {
                  setDonationDate(d);
                  if (modalErrors.date) {
                    setModalErrors((prev) => {
                      const next = { ...prev };
                      delete next.date;
                      return next;
                    });
                  }
                }}
                maxDate={new Date()}
                error={modalErrors.date}
              />
            </View>

            {/* Hospital / Blood Bank Name */}
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.inputLabel}>Hospital or Blood Bank Name *</Text>
              <TextInput
                style={[styles.modalInput, modalErrors.hospital ? styles.modalInputError : null]}
                placeholder="e.g., General Hospital, Karaikal / Vinayaka Mission"
                placeholderTextColor="#94A3B8"
                value={donationHospital}
                onChangeText={(v) => {
                  setDonationHospital(v);
                  if (modalErrors.hospital) {
                    setModalErrors((prev) => {
                      const next = { ...prev };
                      delete next.hospital;
                      return next;
                    });
                  }
                }}
              />
              {modalErrors.hospital ? (
                <Text style={styles.modalErrText}>{modalErrors.hospital}</Text>
              ) : null}
            </View>

            {/* Units */}
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.inputLabel}>Units Donated</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                {["1", "2"].map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setDonationUnits(u)}
                    style={[styles.unitChip, donationUnits === u && styles.unitChipActive]}
                  >
                    <Text style={[styles.unitChipText, donationUnits === u && styles.unitChipTextActive]}>
                      {u} Unit ({me?.blood_group || "Blood"})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Notes / Certificate Ref (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Blood donation camp, Emergency support"
                placeholderTextColor="#94A3B8"
                value={donationNotes}
                onChangeText={setDonationNotes}
              />
            </View>

            {/* Donation Proof / Certificate Image Upload */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={styles.inputLabel}>Donation Proof / Certificate Photo *</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="cloud-done" size={11} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>Verified Proof</Text>
                </View>
              </View>

              {proofImage ? (
                <View style={styles.proofSelectedBox}>
                  <Image source={{ uri: proofImage.uri }} style={styles.proofPreviewThumb} resizeMode="cover" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.proofSelectedTitle} numberOfLines={1}>Certificate Photo Selected</Text>
                    <Text style={styles.proofSelectedSub}>Will be uploaded securely to cloud storage</Text>
                  </View>
                  <Pressable
                    style={styles.proofRemoveBtn}
                    onPress={() => setProofImage(null)}
                    disabled={submitting}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.proofUploadRow}>
                  <Pressable
                    style={styles.proofPickerBtn}
                    onPress={handleTakeProofPhoto}
                    disabled={submitting}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.brandPrimary} />
                    <Text style={styles.proofPickerBtnText}>Take Photo</Text>
                  </Pressable>

                  <Pressable
                    style={styles.proofPickerBtn}
                    onPress={handlePickProof}
                    disabled={submitting}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.brandPrimary} />
                    <Text style={styles.proofPickerBtnText}>Choose from Gallery</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {uploadStatus ? (
              <View style={styles.uploadStatusStrip}>
                <ActivityIndicator size="small" color={colors.brandPrimary} />
                <Text style={styles.uploadStatusStripText}>{uploadStatus}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActionRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  setProofImage(null);
                  setRecordModalOpen(false);
                }}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmitDonation}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Verify & Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* FULL IMAGE PREVIEW MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imagePreviewModalBg}>
          <View style={styles.imagePreviewContainer}>
            <View style={styles.imagePreviewHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="ribbon-outline" size={18} color="#FFFFFF" />
                <Text style={styles.imagePreviewTitle}>Donation Certificate / Proof</Text>
              </View>
              <Pressable
                style={styles.imagePreviewCloseBtn}
                onPress={() => setPreviewImageUrl(null)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.imagePreviewFull}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.imagePreviewFooter}>
              <Text style={styles.imagePreviewFooterText}>Verified Certificate Asset</Text>
              <Pressable
                style={styles.imagePreviewOpenBrowserBtn}
                onPress={() => {
                  if (previewImageUrl) Linking.openURL(previewImageUrl);
                }}
              >
                <Text style={styles.imagePreviewOpenBrowserText}>Open Full Resolution ↗</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  donorIdPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
  },
  donorIdPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.md,
  },
  // Top KPI
  kpiContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  kpiNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
  },
  kpiNumberSmall: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onSurface,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  cooldownAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 16,
  },
  cooldownAlertTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  cooldownAlertSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  // Section Head
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 16,
  },
  stepBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  countBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  // Notified Requests
  notifiedRequestsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  notifiedReqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  notifiedReqTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notifiedReqPatient: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
    flex: 1,
  },
  notifiedReqHospital: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  notifiedReqRef: {
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 1,
  },
  urgencyPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: "#F1F5F9",
  },
  urgencyPillEmergency: {
    backgroundColor: "#FEE2E2",
  },
  urgencyPillText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
  },
  urgencyPillTextEmergency: {
    color: "#DC2626",
  },
  notifiedReqActionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  btnFulfillReq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  btnFulfillReqText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  alreadyFulfillPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  alreadyFulfillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  pendingAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  pendingAlertTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#92400E",
  },
  pendingAlertSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  verifiedClearBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  verifiedClearTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#065F46",
  },
  verifiedClearSub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
    lineHeight: 15,
  },
  otherDonationNoticeBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 4,
  },
  otherDonationNoticeTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.onSurface,
  },
  otherDonationNoticeSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  fulfilledListStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  fulfilledListStripText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#15803D",
  },
  requestLinkedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
    marginBottom: 2,
  },
  requestLinkedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalReqBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  modalReqBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
  modalReqBannerSwitch: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
    textDecorationLine: "underline",
  },
  modalReqBannerText: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
  },
  modalVoluntaryBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  modalVoluntaryBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  modalVoluntaryBannerText: {
    fontSize: 11,
    color: "#1E40AF",
    marginTop: 1,
  },
  modalReqChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  modalReqChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  noRequestsNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  noRequestsNoticeText: {
    fontSize: 11.5,
    color: colors.muted,
    flex: 1,
  },
  // Direct Donation Card
  directDonationCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  directDonationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
  },
  directDonationSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  btnDirectDonation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0F172A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginTop: 10,
  },
  btnDirectDonationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  // Timeline
  emptyTimelineCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    padding: 24,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTimelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 8,
  },
  emptyTimelineSub: {
    fontSize: 11.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  timelineCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  verifiedPillAdmin: {
    backgroundColor: "#EFF6FF",
  },
  verifiedPillDonor: {
    backgroundColor: "#F1F5F9",
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  timelineBody: {
    marginTop: 4,
  },
  timelineHospital: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurface,
  },
  timelineNotes: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 2,
  },
  proofCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  proofCardThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
  },
  proofCardTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  proofCardSub: {
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
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  verifiedBadgeText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.onSurface,
  },
  modalInputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
  },
  modalErrText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 7,
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
    paddingVertical: 9,
  },
  proofPickerBtnText: {
    fontSize: 12,
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
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
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
    paddingVertical: 10,
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
