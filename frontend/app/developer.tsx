import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { getActiveSession } from "@/src/api";
import { safeBack } from "@/src/navigation";

const PYROW_LOGO = require("@/assets/images/pyrow_logo.jpg");
const PYROW_BANNER = require("@/assets/images/pyrow_banner.png");

export default function DeveloperInformation() {
  const insets = useSafeAreaInsets();

  const handleBack = async () => {
    const session = await getActiveSession();
    const fallback = session.isLoggedIn ? "/(tabs)/profile" : "/";
    safeBack(fallback);
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
        {/* Company & Developer Header Hero Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={PYROW_LOGO}
              style={styles.pyrowLogoImg}
              resizeMode="cover"
            />
          </View>
          <Image
            source={PYROW_BANNER}
            style={styles.pyrowBannerImg}
            resizeMode="contain"
          />
          <Text style={styles.companyName}>Pyrow Softwares</Text>
          <View style={styles.badgeRole}>
            <Text style={styles.badgeRoleText}>Technology & Software Development Partner</Text>
          </View>

          <Text style={styles.companyTagline}>
            Official Software Development & Engineering Partner powering the KK Life Drop emergency blood donation platform.
          </Text>

          {/* Quick Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => Linking.openURL("https://pyrow.in")}
            >
              <Ionicons name="globe-outline" size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Pyrow Website</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => Linking.openURL("https://barathraj.web.app/")}
            >
              <Ionicons name="person-outline" size={14} color="#0284C7" />
              <Text style={styles.secondaryActionBtnText}>Portfolio</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => Linking.openURL("tel:7867009044")}
            >
              <Ionicons name="call-outline" size={14} color="#0284C7" />
              <Text style={styles.secondaryActionBtnText}>Call</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => Linking.openURL("mailto:jcibarathraj@gmail.com")}
            >
              <Ionicons name="mail-outline" size={14} color="#0284C7" />
              <Text style={styles.secondaryActionBtnText}>Email</Text>
            </Pressable>
          </View>
        </View>

        {/* Detailed Information Sections */}
        <View style={styles.card}>
          {/* Section 1: Leadership & Co-Founders */}
          <SectionTitle number="1" title="Leadership & Co-Founders" />
          <Text style={styles.p}>
            <Text style={styles.bold}>Pyrow Softwares</Text> (<Pressable onPress={() => Linking.openURL("https://pyrow.in")}><Text style={styles.inlineLink}>https://pyrow.in</Text></Pressable>) is led by its founding team, driving software development, system architecture, and community outreach for KK Life Drop:
          </Text>

          {/* Founder 1: Barathraj S */}
          <View style={styles.founderCard}>
            <View style={styles.founderAvatar}>
              <Ionicons name="code-working" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.founderName}>Barathraj S</Text>
              <Text style={styles.founderRole}>Co Founder, Head Of Product</Text>
              <Text style={styles.founderDesc}>
                Principal software engineer & system architect responsible for the end-to-end design, database infrastructure, and zero-latency emergency blood matching network.
              </Text>
              <View style={styles.founderQuickLinks}>
                <Pressable onPress={() => Linking.openURL("https://barathraj.web.app/")}>
                  <Text style={styles.founderLink}>🌐 barathraj.web.app</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL("tel:7867009044")}>
                  <Text style={styles.founderLink}>📞 +91 7867009044</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Founder 2: Vigneshwaran */}
          <View style={styles.founderCard}>
            <View style={[styles.founderAvatar, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
              <Ionicons name="megaphone" size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.founderName}>Vigneshwaran</Text>
              <Text style={[styles.founderRole, { color: "#15803D" }]}>Co Founder, Head Of Marketing</Text>
              <Text style={styles.founderDesc}>
                Heading marketing strategy, brand partnerships, hospital coordination, community outreach, and donor engagement campaigns.
              </Text>
            </View>
          </View>

          {/* Section 2: Contact & Professional Details */}
          <SectionTitle number="2" title="Contact & Professional Details" />
          <Bullet title="Company" text="Pyrow Softwares (https://pyrow.in)" icon="business-outline" />
          <Bullet title="Head of Product" text="Barathraj S (Co Founder)" icon="person-outline" />
          <Bullet title="Head of Marketing" text="Vigneshwaran (Co Founder)" icon="people-outline" />
          <Bullet title="Official Email" text="jcibarathraj@gmail.com" icon="mail-outline" />
          <Bullet title="Direct Phone" text="+91 7867009044 (7867009044)" icon="call-outline" />
          <Bullet title="Barathraj Portfolio" text="https://barathraj.web.app/" icon="globe-outline" />
          <Bullet title="Location" text="Karaikal, Puducherry, India" icon="location-outline" />

          {/* Section 3: Developer Contact & Support */}
          <SectionTitle number="3" title="Developer Contact & Support" />
          <Text style={styles.p}>
            For direct inquiries, technical collaboration, or mobile application engineering:
          </Text>

          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Pyrow Softwares • Barathraj S</Text>
            <Pressable onPress={() => Linking.openURL("https://pyrow.in")}>
              <Text style={styles.contactLink}>Company: https://pyrow.in</Text>
            </Pressable>
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
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#D8B4FE",
    shadowColor: "#9333EA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pyrowLogoImg: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  pyrowBannerImg: {
    width: 170,
    height: 42,
    marginTop: 6,
    marginBottom: 2,
  },
  companyName: {
    fontSize: 22,
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
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
    textAlign: "center",
  },
  companyTagline: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
  },
  primaryActionBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#0284C7",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  secondaryActionBtnText: {
    color: "#0284C7",
    fontSize: 11,
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
    marginBottom: 10,
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
    marginBottom: 12,
  },
  bold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  founderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  founderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  founderName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  founderRole: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
    marginBottom: 3,
  },
  founderDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  founderQuickLinks: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap",
  },
  founderLink: {
    fontSize: 11,
    color: "#0284C7",
    fontWeight: "600",
  },
  inlineLink: {
    color: "#0284C7",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
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
