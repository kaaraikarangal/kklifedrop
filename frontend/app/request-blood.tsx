import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { safeBack } from "@/src/navigation";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY = ["Normal", "Urgent", "Emergency"];
const RELATIONSHIPS = ["Father", "Mother", "Brother", "Sister", "Friend", "Relative", "Other"];

export default function RequestBlood() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [f, setF] = useState<any>({
    patient_name: "", blood_group: "B+", units_required: "1",
    hospital_name: "", hospital_area: "", hospital_city: "",
    required_date: new Date().toISOString().slice(0, 10), required_time: "", urgency: "Normal",
    requester_name: "", requester_mobile: "", requester_email: "", relationship: "Father",
    additional_message: "", hospital_contact: "",
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  async function submit() {
    const required = ["patient_name", "hospital_name", "hospital_area", "hospital_city", "requester_name", "requester_mobile"];
    for (const k of required) if (!f[k]?.trim()) return toast("error", "Missing", `Please fill ${k.replace(/_/g, " ")}`);
    setLoading(true);
    try {
      const payload = { ...f, units_required: parseInt(f.units_required, 10) || 1, requester_email: f.requester_email || null };
      const r: any = await api("/blood-requests", { body: payload });
      const reqId = r?.request_id || r?.request_number || r?.request?.request_number || r?.id || "Submitted";
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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => safeBack("/(tabs)/requests")}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Request Blood</Text>
        <Text style={styles.sub}>We'll notify eligible donors and coordinate via our admin team.</Text>

        <Section title="Patient Information" />
        <Input testID="patient-name-input" label="Patient Name" value={f.patient_name} onChangeText={(v) => set("patient_name", v)} />
        <Text style={styles.label}>Blood Group Required</Text>
        <View style={styles.bgGrid}>
          {GROUPS.map((g) => (
            <Pressable key={g} testID={`req-bg-${g}`} onPress={() => set("blood_group", g)} style={[styles.bgCell, f.blood_group === g && styles.bgCellActive]}>
              <BloodGroupBadge group={g} size="sm" />
            </Pressable>
          ))}
        </View>
        <Input testID="units-input" label="Units Required" value={f.units_required} onChangeText={(v) => set("units_required", v.replace(/\D/g, ""))} keyboardType="number-pad" />
        <Input testID="hospital-input" label="Hospital Name" value={f.hospital_name} onChangeText={(v) => set("hospital_name", v)} />
        <Input testID="hospital-area-input" label="Hospital Area" value={f.hospital_area} onChangeText={(v) => set("hospital_area", v)} />
        <Input testID="hospital-city-input" label="Hospital City" value={f.hospital_city} onChangeText={(v) => set("hospital_city", v)} />
        <Input testID="req-date-input" label="Required Date (YYYY-MM-DD)" value={f.required_date} onChangeText={(v) => set("required_date", v)} />
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
        <Input testID="req-name-input" label="Requester Name" value={f.requester_name} onChangeText={(v) => set("requester_name", v)} />
        <Input testID="req-mobile-input" label="Mobile Number" value={f.requester_mobile} onChangeText={(v) => set("requester_mobile", v.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" maxLength={10} />
        <Input testID="req-email-input" label="Email (optional)" value={f.requester_email} onChangeText={(v) => set("requester_email", v)} keyboardType="email-address" autoCapitalize="none" />
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
