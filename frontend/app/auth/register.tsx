import React, { useState } from "react";
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

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

export default function Register() {
  const { mobile = "" } = useLocalSearchParams<{ mobile?: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<any>({
    full_name: "", gender: "Male", date_of_birth: "1995-01-01", blood_group: "B+",
    email: "", mobile, area: "", place: "", district: "", state: "", pincode: "",
    aadhaar: "", availability: "Available", donation_opt_in: true,
    last_donation_date: "", consent: false,
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  async function submit() {
    const required = ["full_name", "email", "area", "place", "district", "state", "pincode"];
    for (const k of required) if (!f[k]?.trim()) return toast("error", "Missing", `Please fill ${k.replace(/_/g, " ")}`);
    if (!f.consent) return toast("error", "Consent required", "Please accept the privacy policy");
    if (f.aadhaar?.trim() && f.aadhaar.replace(/\D/g, "").length !== 12) {
      return toast("error", "Invalid Aadhaar", "If provided, Aadhaar must be 12 digits");
    }

    setLoading(true);
    try {
      const payload = { ...f, last_donation_date: f.last_donation_date || null };
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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Donor Registration</Text>
        <Text style={styles.sub}>Mobile verified: +91 {mobile}</Text>

        <Section title="Personal Information" />
        <Input testID="full-name-input" label="Full Name" value={f.full_name} onChangeText={(v) => set("full_name", v)} />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => (
            <Pressable key={g} testID={`gender-${g}`} onPress={() => set("gender", g)} style={[styles.chip, f.gender === g && styles.chipActive]}>
              <Text style={[styles.chipText, f.gender === g && styles.chipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <Input testID="dob-input" label="Date of Birth (YYYY-MM-DD)" value={f.date_of_birth} onChangeText={(v) => set("date_of_birth", v)} placeholder="1995-01-15" />

        <Text style={styles.label}>Blood Group</Text>
        <View style={styles.bgGrid}>
          {GROUPS.map((g) => (
            <Pressable key={g} testID={`bg-${g}`} onPress={() => set("blood_group", g)} style={[styles.bgCell, f.blood_group === g && styles.bgCellActive]}>
              <BloodGroupBadge group={g} size="sm" />
            </Pressable>
          ))}
        </View>

        <Input testID="email-input" label="Email" value={f.email} onChangeText={(v) => set("email", v)} keyboardType="email-address" autoCapitalize="none" />

        <Section title="Location" />
        <Input testID="area-input" label="Area" value={f.area} onChangeText={(v) => set("area", v)} />
        <Input testID="place-input" label="Place / City" value={f.place} onChangeText={(v) => set("place", v)} />
        <Input testID="district-input" label="District" value={f.district} onChangeText={(v) => set("district", v)} />
        <Input testID="state-input" label="State" value={f.state} onChangeText={(v) => set("state", v)} />
        <Input testID="pincode-input" label="Pincode" value={f.pincode} onChangeText={(v) => set("pincode", v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />

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

        <Section title="Donor Availability" />
        <View style={styles.chipRow}>
          {["Available", "Not Available"].map((g) => (
            <Pressable key={g} testID={`avail-${g}`} onPress={() => set("availability", g)} style={[styles.chip, f.availability === g && styles.chipActive]}>
              <Text style={[styles.chipText, f.availability === g && styles.chipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>
        <Input testID="last-donation-input" label="Last Blood Donation Date (optional)" value={f.last_donation_date} onChangeText={(v) => set("last_donation_date", v)} placeholder="YYYY-MM-DD" />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Allow KK Life Drop to contact me for blood requests</Text>
            <Text style={styles.toggleSub}>Only opted-in donors receive notifications.</Text>
          </View>
          <Switch testID="opt-in-switch" value={f.donation_opt_in} onValueChange={(v) => set("donation_opt_in", v)} trackColor={{ true: colors.brandPrimary }} />
        </View>

        <View style={styles.consentRow}>
          <Pressable onPress={() => set("consent", !f.consent)} testID="consent-checkbox">
            <View style={[styles.checkbox, f.consent && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
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
            {" "}and consent to voluntary blood donation coordination.
          </Text>
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
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 2 },
  consentText: { flex: 1, fontSize: 13, color: colors.onSurfaceSecondary, lineHeight: 18 },
  legalLink: { color: colors.brandPrimary, fontWeight: "700", textDecorationLine: "underline" },
});
