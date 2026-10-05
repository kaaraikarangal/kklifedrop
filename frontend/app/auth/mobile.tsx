import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, setSession } from "@/src/api";
import { syncPushTokenWithBackend } from "@/src/notifications";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BrandLogo } from "@/src/components/BrandLogo";

export default function MobileAuth() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (mobile.replace(/\D/g, "").length < 10) return toast("error", "Enter a valid 10-digit mobile");
    setLoading(true);
    try {
      const r: any = await api("/auth/send-otp", { body: { mobile } });
      setDevOtp(r.dev_otp || null);
      if (r.dev_otp) {
        toast("success", "OTP Generated", `Code: ${r.dev_otp}`);
      } else {
        toast("success", "OTP Sent", `Verification code sent to +91 ${mobile}`);
      }
      setStep("otp");
    } catch (e: any) {
      toast("error", "Failed to send OTP", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    try {
      const r: any = await api("/auth/verify-otp", { body: { mobile, otp } });
      await setSession(r.token, "user", r.mobile);
      syncPushTokenWithBackend().catch(() => {});
      toast("success", "Verified", "Mobile number verified successfully");
      if (r.is_registered) {
        router.replace("/(tabs)/home");
      } else {
        router.replace({ pathname: "/auth/register", params: { mobile: r.mobile } });
      }
    } catch (e: any) {
      toast("error", "Invalid OTP", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.c, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back} testID="back-btn">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ alignItems: "center", marginBottom: spacing.md }}>
          <BrandLogo size="lg" variant="stacked" showSubtext />
        </View>
        <Text style={styles.title}>Mobile Verification</Text>
        <Text style={styles.sub}>
          {step === "mobile" ? "We'll send a one-time password to your mobile." : `Enter the 6-digit code sent to +91 ${mobile}`}
        </Text>

        {step === "mobile" ? (
          <>
            <Input
              testID="mobile-input"
              label="Mobile Number"
              placeholder="10-digit mobile"
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Button testID="send-otp-btn" label="Send OTP" onPress={sendOtp} loading={loading} />
          </>
        ) : (
          <>
            <Input
              testID="otp-input"
              label="One-Time Password"
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            {devOtp ? (
              <Pressable onPress={() => setOtp(devOtp)} style={styles.devNote} testID="dev-otp-hint">
                <Text style={styles.devNoteText}>OTP Code: {devOtp} (Tap to autofill)</Text>
              </Pressable>
            ) : null}
            <Button testID="verify-otp-btn" label="Verify & Continue" onPress={verify} loading={loading} />
            <Pressable onPress={() => setStep("mobile")} style={{ alignItems: "center", padding: 12 }}>
              <Text style={{ color: colors.brandPrimary, fontWeight: "600" }}>Change number</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { paddingHorizontal: spacing.lg },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.lg },
  logoRound: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.8, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: spacing.xl, lineHeight: 20 },
  devNote: { backgroundColor: colors.brandTertiary, padding: 10, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  devNoteText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 12 },
});
