import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
} from "react-native";
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
import { safeBack } from "@/src/navigation";

const OTP_LENGTH = 6;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Individual OTP digit box ────────────────────────────────────────────────
interface OtpInputProps {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

function OtpInput({ length, value, onChange, disabled }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  // expose shake via ref (parent can't call it directly but we can watch for error signal)
  const digits = value.split("").concat(Array(length - value.length).fill(""));

  return (
    <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
      {/* Hidden real input that captures keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.otpHiddenInput}
        caretHidden
        editable={!disabled}
        testID="otp-input"
        autoFocus={false}
        secureTextEntry={false}
        importantForAutofill="yes"
        autoComplete="one-time-code"
      />
      {/* Visual digit boxes */}
      {digits.map((digit, i) => {
        const isFocused = i === value.length && !disabled;
        const isFilled = i < value.length;
        return (
          <Pressable
            key={i}
            onPress={() => inputRef.current?.focus()}
            style={[
              styles.otpBox,
              isFilled && styles.otpBoxFilled,
              isFocused && styles.otpBoxFocused,
            ]}
          >
            {isFilled ? (
              <Text style={styles.otpDigit}>{digit}</Text>
            ) : isFocused ? (
              <OtpCursor />
            ) : null}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

function OtpCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View style={[styles.cursor, { opacity }]} />
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function MobileAuth() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Slide animation between steps
  const slideAnim = useRef(new Animated.Value(0)).current;

  function animateToOtp() {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }

  function animateToMobile() {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [cooldown]);

  async function sendOtp() {
    const clean = mobile.replace(/\D/g, "");
    if (clean.length < 10) {
      return toast("error", "Invalid Number", "Enter a valid 10-digit mobile number.");
    }
    setLoading(true);
    try {
      await api("/auth/send-otp", { body: { mobile: clean } });
      setCooldown(45);
      setOtp("");
      setAttemptsLeft(null);
      setStep("otp");
      animateToOtp();
      toast("success", "Code Sent", `A 6-digit code was dispatched to WhatsApp (+91 ${clean}).`);
    } catch (e: any) {
      toast("error", "Failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (otp.trim().length !== OTP_LENGTH) {
      return toast("error", "Incomplete", `Enter all ${OTP_LENGTH} digits of your verification code.`);
    }
    setLoading(true);
    try {
      const r: any = await api("/auth/verify-otp", { body: { mobile: mobile.replace(/\D/g, ""), otp: otp.trim() } });
      await setSession(r.token, "user", r.mobile);
      syncPushTokenWithBackend().catch(() => {});
      toast("success", "Verified ✓", "Mobile number verified successfully.");
      if (r.is_registered) {
        router.replace("/(tabs)/home");
      } else {
        router.replace({ pathname: "/auth/register", params: { mobile: r.mobile } });
      }
    } catch (e: any) {
      setOtp("");
      // Extract attempts remaining if present
      const match = e.message?.match(/(\d+) attempt/);
      if (match) setAttemptsLeft(parseInt(match[1], 10));
      toast("error", "Verification Failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step === "otp") {
      setStep("mobile");
      setOtp("");
      setAttemptsLeft(null);
      animateToMobile();
    } else {
      safeBack("/");
    }
  }

  const slideX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBack} style={styles.backBtn} testID="back-btn">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {step === "otp" && (
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 2 of 2</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <BrandLogo size="lg" variant="stacked" showSubtext />
        </View>

        {/* ── STEP 1: Mobile Number ── */}
        {step === "mobile" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={26} color={colors.brandPrimary} />
              </View>
              <Text style={styles.cardTitle}>Enter Mobile Number</Text>
              <Text style={styles.cardSub}>
                We'll send a secure 6-digit verification code to your WhatsApp.
              </Text>
            </View>

            <Input
              testID="mobile-input"
              label="Mobile Number"
              placeholder="10-digit number"
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
            />

            {/* WhatsApp badge */}
            <View style={styles.waBadge}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.waBadgeTitle}>Sent via WhatsApp</Text>
                <Text style={styles.waBadgeSub}>
                  End-to-end encrypted · 5-minute expiry · Single use
                </Text>
              </View>
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={14} color={colors.brandSecondary} />
              </View>
            </View>

            <Button
              testID="send-otp-btn"
              label="Send Verification Code"
              onPress={sendOtp}
              loading={loading}
            />
          </View>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === "otp" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="shield-checkmark-outline" size={26} color="#2E7D32" />
              </View>
              <Text style={styles.cardTitle}>Verify Your Number</Text>
              <Text style={styles.cardSub}>
                Enter the 6-digit code sent to WhatsApp{"\n"}
                <Text style={styles.mobileHighlight}>+91 {mobile}</Text>
              </Text>
            </View>

            {/* OTP Boxes */}
            <View style={styles.otpSection}>
              <OtpInput
                length={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                disabled={loading}
              />
              <Text style={styles.otpHint}>
                <Ionicons name="shield-checkmark" size={11} color="#16A34A" /> Enter the 6-digit code received on WhatsApp
              </Text>
            </View>

            {/* Attempts warning */}
            {attemptsLeft !== null && attemptsLeft <= 3 && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={15} color="#B45309" />
                <Text style={styles.warningText}>
                  {attemptsLeft === 0
                    ? "OTP locked. Request a new code."
                    : `${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} remaining before lockout`}
                </Text>
              </View>
            )}

            <Button
              testID="verify-otp-btn"
              label="Verify & Continue"
              onPress={verify}
              loading={loading}
            />

            {/* Footer actions */}
            <View style={styles.footerRow}>
              <Pressable
                disabled={cooldown > 0 || loading}
                onPress={sendOtp}
                style={[styles.resendBtn, (cooldown > 0 || loading) && { opacity: 0.45 }]}
              >
                <Ionicons name="refresh-outline" size={15} color={colors.brandPrimary} />
                <Text style={styles.resendText}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                </Text>
              </Pressable>

              <Pressable
                onPress={goBack}
                style={styles.changeBtn}
              >
                <Ionicons name="pencil-outline" size={13} color={colors.muted} />
                <Text style={styles.changeText}>Change number</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Security footer note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-outline" size={13} color={colors.muted} />
          <Text style={styles.securityNoteText}>
            Kaarai Karangal Samooga Sevai Amaippu · ISO 9001:2015 · Reg. No. 31/2025
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
    backgroundColor: "#F0F4F8",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIndicator: {
    backgroundColor: colors.brandPrimaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  brand: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brandPrimaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  cardSub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  mobileHighlight: {
    fontWeight: "700",
    color: colors.onSurface,
  },

  // WhatsApp badge
  waBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  waBadgeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  waBadgeSub: {
    fontSize: 11,
    color: "#16A34A",
  },
  lockIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandSecondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // OTP
  otpSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  otpHiddenInput: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    height: "100%",
    zIndex: 10,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandPrimaryLight,
  },
  otpBoxFocused: {
    borderColor: colors.brandSecondary,
    borderWidth: 2,
    backgroundColor: colors.brandSecondaryLight,
    shadowColor: colors.brandSecondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.brandPrimary,
    textAlign: "center",
  },
  cursor: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: colors.brandSecondary,
  },
  otpHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 14,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
  },

  // Footer row
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  resendText: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  changeText: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 13,
  },

  // Security note
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  securityNoteText: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});
