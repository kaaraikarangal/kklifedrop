import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacing } from "@/src/theme";
import { api, getActiveSession, MOBILE_KEY, DONOR_KEY, LEGACY_DONOR_KEY } from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { safeBack } from "@/src/navigation";
import { DatePickerField } from "@/src/components/DatePickerField";
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD } from "@/src/utils/dateUtils";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY = ["Normal", "Urgent", "Emergency"];
const RELATIONSHIPS = ["Father", "Mother", "Husband", "Wife", "Brother", "Sister", "Friend", "Relative", "Other"];

export default function RequestBlood() {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState<any>({
    patient_name: "", blood_group: "B+", units_required: "1",
    hospital_name: "", hospital_area: "", hospital_city: "",
    required_date: formatDateToDDMMYYYY(new Date()), required_time: "", urgency: "Normal",
    requester_name: "", requester_mobile: "", requester_email: "", relationship: "Father",
    additional_message: "", hospital_contact: "",
  });

  const set = (k: string, v: any) => {
    setF((p: any) => ({ ...p, [k]: v }));
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const session = await getActiveSession();
        const donorStr = (await AsyncStorage.getItem(DONOR_KEY)) || (await AsyncStorage.getItem(LEGACY_DONOR_KEY));
        let donor: any = null;
        if (donorStr) {
          try { donor = JSON.parse(donorStr); } catch {}
        }
        setF((prev: any) => ({
          ...prev,
          requester_mobile: prev.requester_mobile || session?.mobile || donor?.mobile || "",
          requester_name: prev.requester_name || donor?.name || "",
          requester_email: prev.requester_email || donor?.email || "",
        }));
      } catch {}
    })();
  }, []);

  async function submit() {
    const newErrors: Record<string, string> = {};

    if (!f.patient_name?.trim()) {
      newErrors.patient_name = "Patient name is required";
    }
    const units = parseInt(f.units_required, 10);
    if (!f.units_required?.toString().trim() || isNaN(units) || units < 1) {
      newErrors.units_required = "Please enter valid units (minimum 1)";
    }
    if (!f.hospital_name?.trim()) {
      newErrors.hospital_name = "Hospital name is required";
    }
    if (!f.hospital_area?.trim()) {
      newErrors.hospital_area = "Hospital area is required";
    }
    if (!f.hospital_city?.trim()) {
      newErrors.hospital_city = "Hospital city / town is required";
    }
    if (!f.required_date?.trim()) {
      newErrors.required_date = "Required date is required";
    }
    if (!f.requester_name?.trim()) {
      newErrors.requester_name = "Requester name is required";
    }
    const cleanMobile = (f.requester_mobile || "").replace(/\D/g, "");
    if (!cleanMobile) {
      newErrors.requester_mobile = "Mobile number is required";
    } else if (cleanMobile.length !== 10) {
      newErrors.requester_mobile = "Enter a valid 10-digit mobile number";
    }
    if (f.requester_email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.requester_email.trim())) {
        newErrors.requester_email = "Enter a valid email address";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      toast("error", "Incomplete Form", "Please fill in all highlighted required fields.");
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const formattedMobile = cleanMobile.slice(-10);
      const isoRequiredDate = formatDateToYYYYMMDD(f.required_date) || f.required_date;
      const payload = { ...f, required_date: isoRequiredDate, requester_mobile: formattedMobile, units_required: parseInt(f.units_required, 10) || 1, requester_email: f.requester_email || null };
      const r: any = await api("/blood-requests", { body: payload });
      const reqId = r?.request_id || r?.request_number || r?.request?.request_number || r?.id || "Submitted";

      if (formattedMobile) {
        await AsyncStorage.setItem(MOBILE_KEY, formattedMobile);
      }
      try {
        const stored = await AsyncStorage.getItem("kk_my_request_numbers");
        const list = stored ? JSON.parse(stored) : [];
        if (reqId && reqId !== "Submitted" && !list.includes(reqId)) {
          list.push(reqId);
          await AsyncStorage.setItem("kk_my_request_numbers", JSON.stringify(list));
        }
      } catch {}

      setDone(reqId);
      toast("success", "Submitted", `Request ID: ${reqId}`);
    } catch (e: any) {
      toast("error", "Failed", e.message);
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
        <View style={styles.doneIcon}><Ionicons name="checkmark" size={44} color="#FFFFFF" /></View>
        <Text style={styles.doneTitle}>Request Submitted</Text>
        <Text style={styles.doneSub}>Blood request submitted successfully. Our team will contact you shortly.</Text>
        <View style={styles.reqIdPill}>
          <Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>{done}</Text>
        </View>
        <Button testID="done-home-btn" label="Back to Home" onPress={() => router.replace("/(tabs)/home")} style={{ marginTop: spacing.lg, alignSelf: "stretch" }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => safeBack("/(tabs)/requests")}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Request Blood</Text>
        <Text style={styles.sub}>We'll notify eligible donors and coordinate via our admin team.</Text>

        {Object.keys(errors).length > 0 && (
          <View style={styles.errorSummaryBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorSummaryTitle}>Please complete required fields</Text>
              <Text style={styles.errorSummaryText}>
                Highlighted fields in red must be completed before submitting your blood request.
              </Text>
            </View>
          </View>
        )}

        <Section title="Patient Information" />
        <Input
          testID="patient-name-input"
          label="Patient Name *"
          value={f.patient_name}
          onChangeText={(v) => set("patient_name", v)}
          placeholder="e.g. John Doe"
          error={errors.patient_name}
        />
        <Text style={styles.label}>Blood Group Required</Text>
        <View style={styles.bgGrid}>
          {GROUPS.map((g) => (
            <Pressable key={g} testID={`req-bg-${g}`} onPress={() => set("blood_group", g)} style={[styles.bgCell, f.blood_group === g && styles.bgCellActive]}>
              <BloodGroupBadge group={g} size="sm" />
            </Pressable>
          ))}
        </View>
        <Input
          testID="units-input"
          label="Units Required *"
          value={f.units_required}
          onChangeText={(v) => set("units_required", v.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="e.g. 1"
          error={errors.units_required}
        />
        <Input
          testID="hospital-input"
          label="Hospital Name *"
          value={f.hospital_name}
          onChangeText={(v) => set("hospital_name", v)}
          placeholder="e.g. General Hospital, Karaikal"
          error={errors.hospital_name}
        />
        <Input
          testID="hospital-area-input"
          label="Hospital Area *"
          value={f.hospital_area}
          onChangeText={(v) => set("hospital_area", v)}
          placeholder="e.g. Church Street"
          error={errors.hospital_area}
        />
        <Input
          testID="hospital-city-input"
          label="Hospital City *"
          value={f.hospital_city}
          onChangeText={(v) => set("hospital_city", v)}
          placeholder="e.g. Karaikal"
          error={errors.hospital_city}
        />
        <DatePickerField
          testID="req-date-input"
          label="Required Date (DD-MM-YYYY) *"
          value={f.required_date}
          onChange={(ddmmyyyy) => set("required_date", ddmmyyyy)}
          placeholder="DD-MM-YYYY"
          minDate={new Date()}
          error={errors.required_date}
        />
        <Input testID="req-time-input" label="Required Time (optional)" value={f.required_time} onChangeText={(v) => set("required_time", v)} placeholder="e.g. 10:30 AM" />

        <Text style={styles.label}>Urgency</Text>
        <View style={styles.chipRow}>
          {URGENCY.map((u) => (
            <Pressable key={u} testID={`urg-${u}`} onPress={() => set("urgency", u)} style={[
              styles.chip, f.urgency === u && (u === "Emergency" ? styles.chipEmerg : styles.chipActive),
            ]}>
              <Text style={[styles.chipText, f.urgency === u && { color: "#FFFFFF" }]}>{u}</Text>
            </Pressable>
          ))}
        </View>

        <Section title="Requester Information" />
        <Input
          testID="req-name-input"
          label="Requester Name *"
          value={f.requester_name}
          onChangeText={(v) => set("requester_name", v)}
          placeholder="e.g. Ramesh"
          error={errors.requester_name}
        />
        <Input
          testID="req-mobile-input"
          label="Mobile Number *"
          value={f.requester_mobile}
          onChangeText={(v) => set("requester_mobile", v.replace(/\D/g, "").slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="10-digit mobile number"
          error={errors.requester_mobile}
        />
        <Input
          testID="req-email-input"
          label="Email (optional)"
          value={f.requester_email}
          onChangeText={(v) => set("requester_email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="e.g. requester@example.com"
          error={errors.requester_email}
        />
        <Text style={styles.label}>Relationship to Patient</Text>
        <View style={styles.chipRow}>
          {RELATIONSHIPS.map((r) => (
            <Pressable key={r} testID={`rel-${r}`} onPress={() => set("relationship", r)} style={[styles.chip, f.relationship === r && styles.chipActive]}>
              <Text style={[styles.chipText, f.relationship === r && styles.chipTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <Section title="Additional Information" />
        <Input testID="additional-msg-input" label="Additional message (optional)" value={f.additional_message} onChangeText={(v) => set("additional_message", v)} multiline />
        <Input testID="hospital-contact-input" label="Hospital contact number (optional)" value={f.hospital_contact} onChangeText={(v) => set("hospital_contact", v)} keyboardType="phone-pad" />

        <Button testID="submit-request-btn" label="Submit Blood Request" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

const styles = StyleSheet.create({
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  errorSummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
  },
  errorSummaryText: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  section: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.5, textTransform: "uppercase", marginTop: spacing.lg, marginBottom: spacing.md },
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  bgGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.md },
  bgCell: { padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: "transparent" },
  bgCellActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipEmerg: { backgroundColor: "#B71C1C" },
  chipText: { color: colors.onSurfaceSecondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  doneTitle: { fontSize: 24, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  doneSub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  reqIdPill: { marginTop: spacing.lg, backgroundColor: colors.brandTertiary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
});
