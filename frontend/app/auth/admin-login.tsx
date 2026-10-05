import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import {
  api,
  setSession,
  getBaseUrl,
  setCustomBackendUrl,
  resetBackendUrl,
  testBackendConnection,
} from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BrandLogo } from "@/src/components/BrandLogo";

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("admin@k2lifedrop.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);

  // Server URL Configuration
  const [showConfig, setShowConfig] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getBaseUrl();
      setCurrentUrl(u);
      setInputUrl(u);
    })();
  }, []);

  async function handleTestPing() {
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await testBackendConnection(inputUrl);
      setPingResult(res);
      if (res.ok) {
        toast("success", "Connection OK", res.message);
      } else {
        toast("error", "Connection Failed", res.message);
      }
    } finally {
      setPingLoading(false);
    }
  }

  async function handleSaveUrl() {
    try {
      const saved = await setCustomBackendUrl(inputUrl);
      setCurrentUrl(saved);
      toast("success", "Server Updated", `Now connecting to: ${saved}`);
      setShowConfig(false);
    } catch (e: any) {
      toast("error", "Invalid URL", e.message);
    }
  }

  async function handleResetUrl() {
    const def = await resetBackendUrl();
    setCurrentUrl(def);
    setInputUrl(def);
    setPingResult(null);
    toast("info", "Reset", `Restored default: ${def}`);
  }

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
        {/* Top Actions Row */}
        <View style={styles.topBarRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>

          <Pressable
            onPress={() => setShowConfig(!showConfig)}
            style={styles.serverBtn}
            testID="server-config-btn"
          >
            <Ionicons name="server-outline" size={16} color="#475569" />
            <Text style={styles.serverBtnText}>Server Config</Text>
          </Pressable>
        </View>

        <View style={styles.contentWrap}>
          {/* Brand Header */}
          <View style={styles.logoWrap}>
            <BrandLogo size="lg" variant="stacked" showSubtext />
          </View>

          {/* Expandable Server Configuration Card */}
          {showConfig ? (
            <View style={styles.configCard}>
              <View style={styles.configHead}>
                <Ionicons name="hardware-chip-outline" size={20} color="#0284C7" />
                <Text style={styles.configTitle}>Backend Server Configuration</Text>
              </View>
              <Text style={styles.configDesc}>
                Set the API server address that this build connects to. Works across local WiFi, emulators, and cloud servers.
              </Text>

              <Input
                label="API Server Base URL"
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://10.110.3.119:8000"
                autoCapitalize="none"
              />

              {pingResult ? (
                <View
                  style={[
                    styles.pingBox,
                    { backgroundColor: pingResult.ok ? "#F0FDF4" : "#FEF2F2", borderColor: pingResult.ok ? "#86EFAC" : "#FECACA" },
                  ]}
                >
                  <Ionicons
                    name={pingResult.ok ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={pingResult.ok ? "#16A34A" : "#DC2626"}
                  />
                  <Text
                    style={[
                      styles.pingText,
                      { color: pingResult.ok ? "#15803D" : "#B91C1C" },
                    ]}
                  >
                    {pingResult.message}
                  </Text>
                </View>
              ) : null}

              <View style={styles.configActionRow}>
                <Pressable
                  style={[styles.smallBtn, styles.testBtn]}
                  onPress={handleTestPing}
                  disabled={pingLoading}
                >
                  {pingLoading ? (
                    <ActivityIndicator size="small" color="#0284C7" />
                  ) : (
                    <>
                      <Ionicons name="pulse" size={14} color="#0284C7" />
                      <Text style={styles.testBtnText}>Test Ping</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.smallBtn, styles.saveBtn]}
                  onPress={handleSaveUrl}
                >
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>

                <Pressable
                  style={[styles.smallBtn, styles.resetBtn]}
                  onPress={handleResetUrl}
                >
                  <Text style={styles.resetBtnText}>Reset</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

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

              {/* Sub-label showing active server host */}
              <View style={styles.activeServerRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.activeServerText} numberOfLines={1}>
                  Server: {currentUrl || "Resolving..."}
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
  serverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  serverBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
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
  configCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  configHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0369A1",
  },
  configDesc: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  pingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  pingText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  configActionRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  testBtn: {
    backgroundColor: "#E0F2FE",
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  saveBtn: {
    backgroundColor: "#0284C7",
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resetBtn: {
    backgroundColor: "#F1F5F9",
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
  activeServerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  activeServerText: {
    fontSize: 10,
    color: "#94A3B8",
    maxWidth: 260,
  },
});
