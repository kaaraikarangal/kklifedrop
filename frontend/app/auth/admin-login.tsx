import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import {
  api,
  setSession,
  clearSession,
} from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { safeBack } from "@/src/navigation";
import { BrandLogo } from "@/src/components/BrandLogo";

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function login() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return toast("error", "Credentials Required", "Enter registered admin email and password");
    }

    setLoading(true);
    try {
      await clearSession();
      const r: any = await api("/auth/admin/login", { body: { email: cleanEmail, password: cleanPassword } });
      await setSession(r.token, "admin");
      toast("success", "Access Granted", `Authenticated as ${r.is_super_admin ? "Super Admin" : "Administrator"}`);
      router.replace("/admin");
    } catch (e: any) {
      toast("error", "Access Denied", e.message || "Invalid administrator credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Actions Row */}
        <View style={styles.topBarRow}>
          <Pressable
            onPress={() => safeBack("/")}
            style={styles.backBtn}
            testID="back-btn"
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>
        </View>

        <View style={styles.contentWrap}>
          {/* Brand Header */}
          <View style={styles.logoWrap}>
            <BrandLogo size="lg" variant="stacked" showSubtext />
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <LinearGradient
              colors={["#0F172A", "#1E293B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeader}
            >
              <View style={styles.badgeShield}>
                <Ionicons name="shield-checkmark" size={24} color="#38BDF8" />
              </View>
              <Text style={styles.cardTitle}>Admin Portal</Text>
              <Text style={styles.cardSub}>
                Kaarai Karangal Blood Donation Coordination System
              </Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <Input
                testID="admin-email-input"
                label="Admin Email Address"
                placeholder="Enter registered admin email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.passwordFieldWrap}>
                <Text style={styles.passwordFieldLabel}>Security Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    testID="admin-password-input"
                    style={styles.passwordTextInput}
                    placeholder="Enter admin password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.passwordEyeBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              <Button
                testID="admin-login-btn"
                label="Authenticate & Enter Portal"
                onPress={login}
                loading={loading}
              />

              <View style={styles.restrictedBanner}>
                <Ionicons name="shield-checkmark" size={15} color="#0284C7" />
                <Text style={styles.restrictedBannerText}>
                  Restricted Access • Registered administrators only. All login events are audited.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  topBarRow: {
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
  },
  logoWrap: {
    marginBottom: spacing.lg,
    alignItems: "center",
  },

  loginCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  badgeShield: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  cardSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  cardBody: {
    padding: spacing.xl,
    gap: 4,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  securityText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  passwordFieldWrap: {
    marginBottom: spacing.md,
  },
  passwordFieldLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  passwordTextInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.onSurface,
  },
  passwordEyeBtn: {
    padding: 6,
  },
  restrictedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  restrictedBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 15,
    fontWeight: "600",
  },

});
