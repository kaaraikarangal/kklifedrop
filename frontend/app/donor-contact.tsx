import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";
import { safeBack } from "@/src/navigation";

export default function DonorContact() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState<any>({ patient_name: "", hospital_name: "", hospital_city: "", requester_name: "", requester_mobile: "", urgency: "Normal", additional_message: "" });

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
    api(`/donors/${id}`).then((r: any) => setDonor(r.donor)).catch(() => {});
  }, [id]);

  async function submit() {
    const newErrors: Record<string, string> = {};

    if (!f.patient_name?.trim()) {
      newErrors.patient_name = "Patient name is required";
    }
    if (!f.hospital_name?.trim()) {
      newErrors.hospital_name = "Hospital name is required";
    }
    if (!f.hospital_city?.trim()) {
      newErrors.hospital_city = "Hospital city / town is required";
    }
    if (!f.requester_name?.trim()) {
      newErrors.requester_name = "Your name is required";
    }
    const cleanMobile = (f.requester_mobile || "").replace(/\D/g, "");
    if (!cleanMobile) {
      newErrors.requester_mobile = "Mobile number is required";
    } else if (cleanMobile.length !== 10) {
      newErrors.requester_mobile = "Enter a valid 10-digit mobile number";
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
      const r: any = await api("/blood-requests/contact-donor", { body: { donor_id: id, blood_group: donor.blood_group, ...f, requester_mobile: cleanMobile } });
      const reqId = r?.request_id || r?.request_number || r?.request?.request_number || r?.id || "Submitted";
      setDone(reqId);
    } catch (e: any) { toast("error", "Failed", e.message); }
    finally { setLoading(false); }
  }

  if (!donor) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
        <View style={styles.doneIcon}><Ionicons name="shield-checkmark" size={44} color="#FFFFFF" /></View>
        <Text style={styles.doneTitle}>Request Submitted</Text>
        <Text style={styles.doneSub}>Your request has been submitted. KK Life Drop admin will contact you shortly.</Text>
        <View style={styles.pill}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>{done}</Text></View>
        <Button
          testID="back-home-btn"
          label="Done"
          onPress={() => safeBack("/(tabs)/home")}
          style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => safeBack("/(tabs)/donors")}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={styles.donorCard}>
          <BloodGroupBadge group={donor.blood_group} size="lg" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name}>{donor.full_name}</Text>
            <Text style={styles.meta}><Ionicons name="location-outline" size={12} /> {donor.area}, {donor.district}</Text>
            {donor.last_donation_date ? <Text style={styles.lastDonation}>Last donation: {donor.last_donation_date}</Text> : null}
          </View>
        </View>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark" size={16} color={colors.brandPrimary} />
          <Text style={styles.noticeText}>
            For privacy, donor contact details are never shared directly. KK Life Drop admin coordinates all communication safely.
          </Text>
        </View>

        {Object.keys(errors).length > 0 && (
          <View style={styles.errorSummaryBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorSummaryTitle}>Please complete required fields</Text>
              <Text style={styles.errorSummaryText}>
                Highlighted fields in red must be filled before sending contact request.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.section}>Your Details</Text>
        <Input
          testID="dc-patient"
          label="Patient Name *"
          value={f.patient_name}
          onChangeText={(v) => set("patient_name", v)}
          placeholder="e.g. John Doe"
          error={errors.patient_name}
        />
        <Input
          testID="dc-hospital"
          label="Hospital Name *"
          value={f.hospital_name}
          onChangeText={(v) => set("hospital_name", v)}
          placeholder="e.g. General Hospital, Karaikal"
          error={errors.hospital_name}
        />
        <Input
          testID="dc-city"
          label="Hospital City *"
          value={f.hospital_city}
          onChangeText={(v) => set("hospital_city", v)}
          placeholder="e.g. Karaikal"
          error={errors.hospital_city}
        />
        <Input
          testID="dc-name"
          label="Your Name *"
          value={f.requester_name}
          onChangeText={(v) => set("requester_name", v)}
          placeholder="e.g. Ramesh"
          error={errors.requester_name}
        />
        <Input
          testID="dc-mobile"
          label="Your Mobile Number *"
          value={f.requester_mobile}
          onChangeText={(v) => set("requester_mobile", v.replace(/\D/g, "").slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="10-digit mobile number"
          error={errors.requester_mobile}
        />
        <Input testID="dc-msg" label="Message (optional)" value={f.additional_message} onChangeText={(v) => set("additional_message", v)} multiline />
        <Button testID="dc-submit" label="Request Contact via Admin" onPress={submit} loading={loading} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.md },
  donorCard: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md },
  name: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  meta: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 4 },
  lastDonation: { fontSize: 11, color: colors.muted, marginTop: 2, fontStyle: "italic" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.brandTertiary, padding: 12, borderRadius: radius.md, marginBottom: spacing.lg },
  noticeText: { flex: 1, color: colors.brandPrimary, fontSize: 12, lineHeight: 16 },
  section: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: spacing.md },
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
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  doneTitle: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  doneSub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  pill: { marginTop: spacing.lg, backgroundColor: colors.brandTertiary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
});
