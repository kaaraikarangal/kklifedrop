import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { getActiveSession } from "@/src/api";

export default function DeveloperInformation() {
  const insets = useSafeAreaInsets();

  const handleBack = async () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const session = await getActiveSession();
    if (session.isLoggedIn) {
      router.replace("/(tabs)/profile");
    } else {
      router.replace("/");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={styles.backBtn}
          testID="dev-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Developer Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 36,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Developer Header Hero Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Ionicons name="code-slash" size={32} color="#0284C7" />
          </View>
          <Text style={styles.devName}>Barathraj S</Text>
          <View style={styles.badgeRole}>
            <Text style={styles.badgeRoleText}>Software Engineer</Text>
          </View>

          <Text style={styles.devTagline}>
            Lead Software Engineer & System Architect for KK Life Drop Blood Donation Platform.
          </Text>

          {/* Quick Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => Linking.openURL("https://barathraj.web.app/")}
            >
              <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Portfolio Website</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => Linking.openURL("tel:7867009044")}
            >
              <Ionicons name="call-outline" size={16} color="#0284C7" />
              <Text style={styles.secondaryActionBtnText}>Call</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => Linking.openURL("mailto:jcibarathraj@gmail.com")}
            >
              <Ionicons name="mail-outline" size={16} color="#0284C7" />
              <Text style={styles.secondaryActionBtnText}>Email</Text>
            </Pressable>
          </View>
        </View>

        {/* Detailed Information Sections (Like Privacy Policy) */}
        <View style={styles.card}>
          <SectionTitle number="1" title="Lead Software Engineer" />
          <Text style={styles.p}>
            <Text style={styles.bold}>Barathraj S</Text> is the principal software engineer responsible for the end-to-end design, development, and system infrastructure of the <Text style={styles.bold}>KK Life Drop</Text> mobile application and emergency blood donor coordination network.
          </Text>
          <Text style={styles.p}>
            With a strong focus on high-performance mobile engineering, cloud databases, and humanitarian technology, this platform was built to ensure zero-latency emergency blood matching for the people of Karaikal, Puducherry, and Tamil Nadu.
          </Text>

          <SectionTitle number="2" title="Contact & Professional Details" />
          <Bullet title="Full Name" text="Barathraj S" icon="person-outline" />
          <Bullet title="Designation" text="Software Engineer" icon="briefcase-outline" />
          <Bullet title="Official Email" text="jcibarathraj@gmail.com" icon="mail-outline" />
          <Bullet title="Direct Phone" text="+91 7867009044 (7867009044)" icon="call-outline" />
          <Bullet title="Portfolio Website" text="https://barathraj.web.app/" icon="globe-outline" />

          <SectionTitle number="3" title="Developer Contact & Support" />
          <Text style={styles.p}>
            For direct inquiries, collaboration, or support regarding KK Life Drop:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Barathraj S • Software Engineer</Text>
            <Pressable onPress={() => Linking.openURL("mailto:jcibarathraj@gmail.com")}>
              <Text style={styles.contactLink}>Email: jcibarathraj@gmail.com</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL("tel:7867009044")}>
              <Text style={styles.contactLink}>Phone: +91 7867009044</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL("https://barathraj.web.app/")}>
              <Text style={styles.contactLink}>Portfolio: https://barathraj.web.app/</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.secHeader}>
      <View style={styles.secBadge}><Text style={styles.secBadgeText}>{number}</Text></View>
      <Text style={styles.secTitle}>{title}</Text>
    </View>
  );
}

function Bullet({ title, text, icon }: { title: string; text: string; icon: any }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={16} color="#0284C7" style={{ marginTop: 2 }} />
      <Text style={styles.bulletText}>
        <Text style={styles.bold}>{title}: </Text>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
    elevation: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: spacing.lg,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: "#BAE6FD",
  },
  devName: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.onSurface,
  },
  badgeRole: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  badgeRoleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  devTagline: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  primaryActionBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284C7",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  secondaryActionBtnText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  secBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  secBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  secTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
  },
  p: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 10,
  },
  bold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  contactBox: {
    marginTop: spacing.md,
    backgroundColor: "#F0F9FF",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
    marginBottom: 6,
  },
  contactLink: {
    fontSize: 12,
    color: "#0369A1",
    lineHeight: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
