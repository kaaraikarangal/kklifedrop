import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, setSession } from "@/src/api";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("admin@k2lifedrop.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) return toast("error", "Missing", "Enter email and password");
    setLoading(true);
    try {
      const r: any = await api("/auth/admin/login", { body: { email, password } });
      await setSession(r.token, "admin");
      toast("success", "Welcome", "Admin signed in");
      router.replace("/admin");
    } catch (e: any) {
      toast("error", "Login failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.c, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={styles.logo}><Ionicons name="shield-checkmark" size={30} color="#FFFFFF" /></View>
        <Text style={styles.title}>Admin Access</Text>
        <Text style={styles.sub}>Authorised personnel only.</Text>

        <Input testID="admin-email-input" label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input testID="admin-password-input" label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button testID="admin-login-btn" label="Sign in" onPress={login} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { paddingHorizontal: spacing.lg },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.lg },
  logo: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceInverse, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.8 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: spacing.xl, marginTop: 4 },
});
