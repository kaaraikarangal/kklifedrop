import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { getActiveSession } from "@/src/api";

export default function TermsAndConditions() {
  const insets = useSafeAreaInsets();

  const handleBack = async () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const session = await getActiveSession();
    if (session.isLoggedIn) {
      router.replace("/(tabs)/home");
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
          testID="terms-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Effective Date: October 2026</Text>
          <Text style={styles.intro}>
            Welcome to <Text style={{ fontWeight: "700", color: colors.brandPrimary }}>KK Life Drop</Text>, a non-profit volunteer platform initiative organized by <Text style={{ fontWeight: "700" }}>Kaarai Karangal Social Service Organization</Text>. By installing, registering, or using this application, you agree to comply with and be bound by the following Terms and Conditions.
          </Text>

          <SectionTitle number="1" title="Purpose & Voluntary Nature" />
          <Text style={styles.p}>
            KK Life Drop is a voluntary, non-commercial digital directory and emergency coordination bridge connecting patients/hospitals with voluntary blood donors in Karaikal, Puducherry, and Tamil Nadu.
          </Text>
          <Text style={styles.p}>
            All blood donations facilitated through this platform are strictly voluntary and altruistic. <Text style={styles.bold}>No monetary compensation, gift, commercial transaction, or exchange of goods is ever permitted or requested</Text> under Section 19 of the National Blood Transfusion Council (NBTC) guidelines and the Drugs and Cosmetics Act.
          </Text>

          <SectionTitle number="2" title="Donor Eligibility & Medical Prerequisite" />
          <Text style={styles.p}>
            To register as a blood donor on KK Life Drop, you represent and warrant that:
          </Text>
          <Bullet text="You are between 18 and 65 years of age." />
          <Bullet text="You weigh at least 45–50 kg and are in sound physical health." />
          <Bullet text="You have completed a mandatory minimum 90-day cooldown period (3 months) since your last whole blood donation." />
          <Bullet text="You do not have active transmissible infections (HIV, Hepatitis B/C, Syphilis, Malaria) or contraindicating medical conditions." />
          <Text style={styles.p}>
            Final donor eligibility, blood grouping, cross-matching, and screening are always strictly performed and certified by licensed medical officers at the authorized hospital or blood bank prior to transfusion.
          </Text>

          <SectionTitle number="3" title="Emergency Blood Requests" />
          <Text style={styles.p}>
            Requesters must provide genuine patient and hospital details. Submitting false, fraudulent, or commercial blood requests is strictly prohibited and subject to immediate account termination and legal action under Indian law.
          </Text>
          <Text style={styles.p}>
            While KK Life Drop notifies volunteer donors promptly, <Text style={styles.bold}>we cannot guarantee donor arrival or blood unit availability</Text> for every individual emergency request.
          </Text>

          <SectionTitle number="4" title="Identity & Aadhaar Verification" />
          <Text style={styles.p}>
            To prevent fraud and maintain community trust, donor identification (such as Aadhaar) is collected with informed consent. In compliance with the Information Technology Act and UIDAI guidelines, all identification numbers are encrypted at rest using military-grade 256-bit encryption and are masked within the public directory.
          </Text>

          <SectionTitle number="5" title="Medical Disclaimer & Limitation of Liability" />
          <Text style={styles.p}>
            KK Life Drop is an emergency communication network, NOT a hospital, blood bank, or healthcare provider. We do not collect, process, test, or store physical blood.
          </Text>
          <Text style={styles.p}>
            To the maximum extent permitted by law, Kaarai Karangal Social Service Organization, its trustees, volunteers, and developers disclaim all liability for any medical complications, delays, adverse transfusion events, or actions taken between users and medical facilities.
          </Text>

          <SectionTitle number="6" title="Account Deletion & Opt-Out" />
          <Text style={styles.p}>
            Donors retain complete autonomy over their data. You can toggle your donation availability off at any time, opt out of push notifications, or request permanent account deletion via the Profile section of the app.
          </Text>

          <SectionTitle number="7" title="Grievance & Organization Contact" />
          <Text style={styles.p}>
            For questions, grievances, or legal inquiries regarding these Terms:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Kaarai Karangal Social Service Organization</Text>
            <Text style={styles.contactText}>Address: K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602, India</Text>
            <Text style={styles.contactText}>Email: kaaraikarangal@gmail.com</Text>
            <Text style={styles.contactText}>Helpline: +91 9750807463</Text>
          </View>

          <SectionTitle number="8" title="Developer Information" />
          <Text style={styles.p}>
            Application engineered and maintained by:
          </Text>
          <View style={[styles.contactBox, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
            <Text style={[styles.contactTitle, { color: "#0284C7" }]}>Barathraj S</Text>
            <Text style={styles.contactText}>Role: Software Engineer</Text>
            <Text style={styles.contactText}>Email: jcibarathraj@gmail.com</Text>
            <Text style={styles.contactText}>Phone: +91 7867009044</Text>
            <Text style={styles.contactText}>Portfolio: https://barathraj.web.app/</Text>
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

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} style={{ marginTop: 2 }} />
      <Text style={styles.bulletText}>{text}</Text>
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 8,
  },
  intro: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: spacing.lg,
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
    backgroundColor: colors.brandPrimary,
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
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brandPrimary,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
});
