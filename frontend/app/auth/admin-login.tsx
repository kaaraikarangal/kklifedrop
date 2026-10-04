import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, setSession } from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BrandLogo } from "@/src/components/BrandLogo";

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("admin@k2lifedrop.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) return toast("error", "Missing", "Enter email and password");
    setLoading(true);
    try {
      const r: any = await api("/auth/admin/login", { body: { email, password } });
      await setSession(r.token, "admin");
      toast("success", "Welcome", "Admin signed in successfully");
      router.replace("/admin");
    } catch (e: any) {
      toast("error", "Login failed", e.message);
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
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>

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
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                testID="admin-password-input"
                label="Security Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Button
                testID="admin-login-btn"
                label="Authenticate & Enter"
                onPress={login}
                loading={loading}
              />

              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={14} color="#64748B" />
                <Text style={styles.securityText}>
                  Audit-logged session with 256-bit encryption
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
  backBtn: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
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
    marginBottom: spacing.xl,
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
});
