import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, getRole, getToken } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

const HERO_IMG = "https://images.unsplash.com/photo-1615461066159-fea0960485d5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxibG9vZCUyMGRvbmF0aW9uJTIwZHJpdmUlMjBoZXJvfGVufDB8fHx8MTc5MTA5MDk2Mnww&ixlib=rb-4.1.0&q=85";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const [donors, setDonors] = React.useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // auto-redirect if already signed in
      const t = await getToken();
      const role = await getRole();
      if (t && role === "admin") router.replace("/admin");
      else if (t && role === "user") router.replace("/(tabs)/home");
    })();
    api("/donors?limit=5").then((r: any) => setDonors(r.donors || [])).catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: HERO_IMG }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(28,28,30,0.1)", "rgba(28,28,30,0.95)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.heroInner, { paddingTop: insets.top + 24 }]}>
            <View style={styles.brandRow}>
              <View style={styles.logoDot}><Ionicons name="water" size={20} color="#FFFFFF" /></View>
              <Text style={styles.brand}>K2 Life Drop</Text>
            </View>
            <Text style={styles.heroTitle}>Every Drop{"\n"}Can Save a Life</Text>
            <Text style={styles.heroSub}>
              India's trusted blood donation network — connect donors and seekers in minutes.
            </Text>
            <View style={styles.ctaRow}>
              <Pressable
                testID="donate-blood-cta"
                style={[styles.cta, { backgroundColor: colors.brandPrimary }]}
                onPress={() => router.push("/auth/mobile")}
              >
                <Ionicons name="water" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>Donate Blood</Text>
              </Pressable>
              <Pressable
                testID="request-blood-cta"
                style={[styles.cta, { backgroundColor: "#FFFFFF" }]}
                onPress={() => router.push("/request-blood")}
              >
                <Ionicons name="alert-circle" size={18} color={colors.brandPrimary} />
                <Text style={[styles.ctaText, { color: colors.brandPrimary }]}>Request Blood</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* How it works */}
        <Section title="How K2 Life Drop Works">
          {[
            { icon: "person-add", t: "Register as Donor", d: "Verify mobile with OTP and complete your profile." },
            { icon: "search", t: "Find Donors", d: "Browse available donors by blood group and area." },
            { icon: "notifications", t: "Get Notified", d: "Receive urgent blood requests matching your group." },
            { icon: "heart", t: "Save Lives", d: "Admin coordinates safe donor–requester communication." },
          ].map((x, i) => (
            <View key={i} style={styles.howCard}>
              <View style={styles.howIcon}>
                <Ionicons name={x.icon as any} size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.howTitle}>{x.t}</Text>
                <Text style={styles.howDesc}>{x.d}</Text>
              </View>
            </View>
          ))}
        </Section>

        {/* Blood groups */}
        <Section title="Available Blood Groups">
          <View style={styles.bgGrid}>
            {GROUPS.map((g) => (
              <View key={g} style={styles.bgCell}>
                <BloodGroupBadge group={g} size="md" />
              </View>
            ))}
          </View>
        </Section>

        {/* Recent donors */}
        <Section title="Available Donors" rightAction={{ label: "See all", onPress: () => router.push("/auth/mobile") }}>
          {donors.length === 0 ? (
            <Text style={styles.muted}>Loading donors…</Text>
          ) : (
            donors.map((d) => (
              <View key={d.id} style={styles.donorRow} testID={`landing-donor-${d.id}`}>
                <BloodGroupBadge group={d.blood_group} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.donorName}>{d.full_name}</Text>
                  <Text style={styles.donorMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.muted} /> {d.area}, {d.district}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: d.availability === "Available" ? "#E6F4EA" : colors.surfaceTertiary }]}>
                  <View style={[styles.dot, { backgroundColor: d.availability === "Available" ? colors.success : colors.muted }]} />
                  <Text style={[styles.pillText, { color: d.availability === "Available" ? colors.success : colors.muted }]}>
                    {d.availability}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* Emergency */}
        <Section title="Emergency?">
          <Pressable testID="emergency-request-btn" style={styles.emergencyCard} onPress={() => router.push("/request-blood")}>
            <View style={styles.emergencyIcon}><Ionicons name="warning" size={24} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency Blood Request</Text>
              <Text style={styles.emergencyDesc}>Submit a request and our admin team coordinates donors immediately.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </Section>

        {/* Contact */}
        <Section title="Need Help?">
          <View style={styles.helpCard}>
            <Ionicons name="shield-checkmark" size={22} color={colors.brandPrimary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.helpTitle}>Admin-Assisted Communication</Text>
              <Text style={styles.helpDesc}>
                Donor contact details are never shared publicly. All communication is coordinated by K2 Life Drop admin for your safety.
              </Text>
            </View>
          </View>
        </Section>

        {/* Admin subtle access */}
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Pressable
            testID="admin-login-dot"
            hitSlop={16}
            onPress={() => router.push("/auth/admin-login")}
            style={{ padding: 12 }}
          >
            <Text style={{ color: colors.muted, fontSize: 20 }}>•</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, rightAction }: { title: string; children: React.ReactNode; rightAction?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {rightAction ? (
          <Pressable onPress={rightAction.onPress}>
            <Text style={styles.sectionAction}>{rightAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 460, overflow: "hidden" },
  heroInner: { flex: 1, padding: spacing.lg, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  brand: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 42, fontWeight: "800", letterSpacing: -1.5, marginTop: spacing.lg },
  heroSub: { color: "#FFFFFFCC", fontSize: 15, marginTop: 10, lineHeight: 22 },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: spacing.xl, marginBottom: 8 },
  cta: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: radius.md,
  },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  sectionAction: { color: colors.brandPrimary, fontWeight: "600", fontSize: 14 },
  howCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: 10, gap: 12,
  },
  howIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  howTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  howDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  bgGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  bgCell: {
    width: "22%", aspectRatio: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
  },
  donorRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: 10,
  },
  donorName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  donorMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "700" },
  emergencyCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg, padding: spacing.lg, gap: 12,
  },
  emergencyIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  emergencyTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  emergencyDesc: { fontSize: 12, color: "#FFFFFFCC", marginTop: 2 },
  helpCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: colors.brandTertiary, borderRadius: radius.lg, padding: spacing.lg,
  },
  helpTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  helpDesc: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 4, lineHeight: 18 },
  muted: { color: colors.muted, fontSize: 13 },
});
