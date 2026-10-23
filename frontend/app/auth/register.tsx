import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView, Switch } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { syncPushTokenWithBackend } from "@/src/notifications";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { LocationSelector } from "@/src/components/LocationSelector";
import { DatePickerField } from "@/src/components/DatePickerField";
import { formatDateToYYYYMMDD, isValidDDMMYYYY } from "@/src/utils/dateUtils";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

export default function Register() {
  const { mobile = "" } = useLocalSearchParams<{ mobile?: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState<any>({
    full_name: "", gender: "Male", date_of_birth: "01-01-1995", blood_group: "B+",
    email: "", mobile, area: "", place: "", district: "Karaikal", state: "Puducherry", pincode: "",
    aadhaar: "", availability: "Available", donation_opt_in: true,
    last_donation_date: "", consent: false,
  });

  const set = (k: string, v: any) => {
    setF((p: any) => ({ ...p, [k]: v }));
    if (errors[k] || (errors.place && (k === "place" || k === "area")) || (errors.area && (k === "place" || k === "area"))) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        if (k === "place" || k === "area") {
          delete next.place;
          delete next.area;
        }
        return next;
      });
    }
  };

  async function submit() {
    const newErrors: Record<string, string> = {};

    if (!f.full_name?.trim()) {
      newErrors.full_name = "Please enter your full name";
    }

    if (!f.email?.trim()) {
      newErrors.email = "Please enter your email address";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (!f.date_of_birth?.trim() || !isValidDDMMYYYY(f.date_of_birth)) {
      newErrors.date_of_birth = "Valid date of birth is required (DD-MM-YYYY)";
    }

    const cleanPin = (f.pincode || "").replace(/\D/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      newErrors.pincode = "Please enter a valid 6-digit Pincode";
    }

    if (!f.state?.trim()) {
      newErrors.state = "Please select your State";
    }

    if (!f.district?.trim()) {
      newErrors.district = "Please select your District";
    }

    if (!f.place?.trim() && !f.area?.trim()) {
      newErrors.place = "Please select your Voter / Assembly Constituency";
      newErrors.area = "Please select your Voter / Assembly Constituency";
    }

    if (!f.consent) {
      newErrors.consent = "You must agree to the Terms & Conditions and Privacy Policy";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return toast(
        "error",
        "Required Fields Missing",
        "Please fill in all highlighted fields to complete your registration."
      );
    }

    f.area = (f.area || f.place || "").trim();
    f.place = (f.place || f.area || "").trim();

    setLoading(true);
    try {
      const payload = {
        ...f,
        date_of_birth: formatDateToYYYYMMDD(f.date_of_birth),
        last_donation_date: f.last_donation_date ? formatDateToYYYYMMDD(f.last_donation_date) : null,
      };
      await api("/donors", { auth: true, body: payload });
      syncPushTokenWithBackend().catch(() => {});
      toast("success", "Registered", "Welcome to KK Life Drop!");
      router.replace("/(tabs)/home");
    } catch (e: any) {
      toast("error", "Failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Donor Registration</Text>
        <Text style={styles.sub}>Mobile verified: +91 {mobile}</Text>

        {Object.keys(errors).length > 0 ? (
          <View style={styles.errorSummaryBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorSummaryText}>
              Please complete all highlighted fields below to continue.
            </Text>
          </View>
        ) : null}

        <Section title="Personal Information" />
        <Input
          testID="full-name-input"
          label="Full Name *"
          value={f.full_name}
          onChangeText={(v) => set("full_name", v)}
          placeholder="Enter your legal name"
          error={errors.full_name}
        />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => (
            <Pressable key={g} testID={`gender-${g}`} onPress={() => set("gender", g)} style={[styles.chip, f.gender === g && styles.chipActive]}>
              <Text style={[styles.chipText, f.gender === g && styles.chipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <DatePickerField
          testID="dob-input"
          label="Date of Birth (DD-MM-YYYY) *"
          value={f.date_of_birth}
          onChange={(ddmmyyyy) => set("date_of_birth", ddmmyyyy)}
          placeholder="DD-MM-YYYY"
          maxDate={new Date()}
          error={errors.date_of_birth}
        />

        <Text style={styles.label}>Blood Group</Text>
        <View style={styles.bgGrid}>
          {GROUPS.map((g) => (
            <Pressable key={g} testID={`bg-${g}`} onPress={() => set("blood_group", g)} style={[styles.bgCell, f.blood_group === g && styles.bgCellActive]}>
              <BloodGroupBadge group={g} size="sm" />
            </Pressable>
          ))}
        </View>

        <Input
          testID="email-input"
          label="Email Address *"
          value={f.email}
          onChangeText={(v) => set("email", v)}
          placeholder="e.g. yourname@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />

        <Section title="Location" />
        <LocationSelector
          pincode={f.pincode}
          state={f.state}
          district={f.district}
          place={f.place}
          area={f.area}
          onChange={(k, v) => set(k, v)}
          errors={{
            pincode: errors.pincode,
            state: errors.state,
            district: errors.district,
            place: errors.place,
            area: errors.area,
          }}
        />

        {/*
        // =========================================================================
        // [AADHAAR_FEATURE] Identification & Aadhaar Section
        // Uncomment below block to re-enable Aadhaar collection upon release
        // =========================================================================
        <Section title="Identification" />
        <Input
          testID="aadhaar-input"
          label="Aadhaar Number (Optional — 12 digits, encrypted at rest)"
          value={f.aadhaar}
          onChangeText={(v) => set("aadhaar", v.replace(/\D/g, "").slice(0, 12))}
          keyboardType="number-pad"
          maxLength={12}
          secureTextEntry
        />
        <View style={styles.notice}>
          <Ionicons name="lock-closed" size={14} color={colors.brandPrimary} />
          <Text style={styles.noticeText}>Only authorised admins can view the full number. In the app it will appear as XXXX XXXX ****.</Text>
        </View>
        */}

        <Section title="Donor Availability" />
        <View style={styles.chipRow}>
          {["Available", "Not Available"].map((g) => (
            <Pressable key={g} testID={`avail-${g}`} onPress={() => set("availability", g)} style={[styles.chip, f.availability === g && styles.chipActive]}>
              <Text style={[styles.chipText, f.availability === g && styles.chipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>
        <DatePickerField
          testID="last-donation-input"
          label="Last Blood Donation Date (DD-MM-YYYY) (optional)"
          value={f.last_donation_date}
          onChange={(ddmmyyyy) => set("last_donation_date", ddmmyyyy)}
          placeholder="DD-MM-YYYY"
          allowClear
          onClear={() => set("last_donation_date", "")}
          maxDate={new Date()}
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Allow KK Life Drop to contact me for blood requests</Text>
            <Text style={styles.toggleSub}>Only opted-in donors receive notifications.</Text>
          </View>
          <Switch testID="opt-in-switch" value={f.donation_opt_in} onValueChange={(v) => set("donation_opt_in", v)} trackColor={{ true: colors.brandPrimary }} />
        </View>

        <View style={[styles.consentBox, !!errors.consent && styles.consentBoxError]}>
          <View style={styles.consentRow}>
            <Pressable onPress={() => set("consent", !f.consent)} testID="consent-checkbox">
              <View style={[styles.checkbox, f.consent && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }, !!errors.consent && !f.consent && styles.checkboxError]}>
                {f.consent ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
            <Text style={styles.consentText}>
              I agree to the{" "}
              <Text
                style={styles.legalLink}
                onPress={() => router.push("/terms")}
                testID="terms-link"
              >
                Terms & Conditions
              </Text>
              {" "}and{" "}
              <Text
                style={styles.legalLink}
                onPress={() => router.push("/privacy")}
                testID="privacy-link"
              >
                Privacy Policy
              </Text>
              {" "}and consent to voluntary blood donation coordination. *
            </Text>
          </View>
          {errors.consent ? (
            <Text style={styles.consentErrorText}>{errors.consent}</Text>
          ) : null}
        </View>

        <Button testID="register-submit-btn" label="Complete Registration" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.success, fontWeight: "600", marginTop: 4, marginBottom: spacing.lg },
  errorSummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorSummaryText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "700",
  },
  section: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.5, textTransform: "uppercase", marginTop: spacing.lg, marginBottom: spacing.md },
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, borderWidth: 1, borderColor: "transparent" },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.brandPrimary },
  bgGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.md },
  bgCell: { padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: "transparent" },
  bgCellActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.brandTertiary, padding: 12, borderRadius: radius.md, marginBottom: spacing.md },
  noticeText: { flex: 1, color: colors.brandPrimary, fontSize: 12, lineHeight: 16 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  toggleTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  toggleSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  consentBox: { marginTop: spacing.md, padding: 8, borderRadius: radius.md, borderWidth: 1, borderColor: "transparent" },
  consentBoxError: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkboxError: { borderColor: "#DC2626", borderWidth: 2 },
  consentText: { flex: 1, fontSize: 13, color: colors.onSurfaceSecondary, lineHeight: 18 },
  consentErrorText: { color: "#DC2626", fontSize: 12, fontWeight: "600", marginTop: 6, marginLeft: 32 },
  legalLink: { color: colors.brandPrimary, fontWeight: "700", textDecorationLine: "underline" },
});
