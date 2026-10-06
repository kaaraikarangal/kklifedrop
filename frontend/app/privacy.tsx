import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { getActiveSession } from "@/src/api";

export default function PrivacyPolicy() {
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
          testID="privacy-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
          <Text style={styles.lastUpdated}>Last Updated: October 2026</Text>
          <Text style={styles.intro}>
            <Text style={{ fontWeight: "700", color: colors.brandPrimary }}>Kaarai Karangal Social Service Organization</Text> ("we", "our", or "us") operates the <Text style={{ fontWeight: "700" }}>KK Life Drop</Text> mobile application. This Privacy Policy informs you of our policies regarding the collection, use, protection, and disclosure of personal data when you use our service, in full compliance with the Digital Personal Data Protection Act (DPDPA), Google Play Developer Policies, and Apple App Store Review Guidelines.
          </Text>

          <SectionTitle number="1" title="Data We Collect" />
          <Text style={styles.p}>
            We only collect personal information that is necessary to facilitate voluntary blood donation matches:
          </Text>
          <Bullet title="Donor Profile" text="Full name, gender, date of birth, blood group, email, residential area, place, district, state, and pincode." />
          <Bullet title="Phone Number" text="Collected for secure One-Time Password (OTP) verification and critical emergency blood coordination." />
          <Bullet title="Identity Verification (Aadhaar)" text="Collected strictly for identity integrity. In compliance with UIDAI standards, numbers are encrypted at rest with AES-256 keys and masked in the public directory (XXXX-XXXX-****)." />
          <Bullet title="Device Push Token" text="Optional push notification token to alert you of urgent nearby blood emergencies even when the app is closed." />
          <Bullet title="Donation History" text="Date of last donation to enforce the mandatory 90-day medical rest interval." />

          <SectionTitle number="2" title="How We Use Your Data" />
          <Text style={styles.p}>
            Your data is used strictly for non-commercial public health facilitation:
          </Text>
          <Bullet title="Emergency Matching" text="Connecting patients needing life-saving blood transfusions with nearby eligible voluntary donors." />
          <Bullet title="Medical Rest Protection" text="Preventing over-donation by automatically cooling down donors for 90 days after each donation." />
          <Bullet title="Emergency Push Notifications" text="Dispatching targeted notifications for urgent blood shortages matching your blood group and region." />
          <Text style={styles.p}>
            <Text style={styles.bold}>We NEVER sell, rent, or trade your personal information with third-party advertisers or commercial brokers.</Text>
          </Text>

          <SectionTitle number="3" title="Security & 256-Bit Encryption" />
          <Text style={styles.p}>
            We adopt strict security safeguards:
          </Text>
          <Bullet title="Encryption in Transit" text="All communication with our servers is secured via HTTPS/TLS 1.3." />
          <Bullet title="Encryption at Rest" text="Sensitive government identification (Aadhaar) is encrypted with 256-bit Fernet keys before database insertion." />
          <Bullet title="Access Controls" text="Only authenticated, authorized Kaarai Karangal coordinators have role-based access for emergency verification." />

          <SectionTitle number="4" title="Device Permissions" />
          <Text style={styles.p}>The app may request the following permissions:</Text>
          <Bullet title="Notifications" text="To alert you of urgent blood requests. You can disable this in device settings anytime." />
          <Bullet title="Internet Access" text="Required to communicate with secure servers and load real-time blood requests." />

          <SectionTitle number="5" title="User Rights & Account Deletion" />
          <Text style={styles.p}>
            You have full control over your personal data:
          </Text>
          <Bullet title="Visibility Control" text="Toggle your availability switch off in your profile anytime to hide your contact from search results." />
          <Bullet title="Notification Opt-Out" text="Disable request notification alerts without losing your account." />
          <Bullet title="Complete Account Deletion" text="You can permanently delete your donor registration and purge your personal information directly within the app (Profile -> Delete Account)." />

          <SectionTitle number="6" title="Children's Privacy" />
          <Text style={styles.p}>
            Our services are not intended for individuals under 18 years of age, as 18 is the minimum legal age for blood donation in India. We do not knowingly collect personal data from minors.
          </Text>

          <SectionTitle number="7" title="Data Protection Officer & Organization Contact" />
          <Text style={styles.p}>
            If you have questions or grievances regarding this Privacy Policy or your data rights, contact our Data Protection Coordinator:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Kaarai Karangal Grievance Cell</Text>
            <Text style={styles.contactText}>Organization: Kaarai Karangal Social Service Organization</Text>
            <Text style={styles.contactText}>Address: K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602, India</Text>
            <Text style={styles.contactText}>Email: kaaraikarangal@gmail.com</Text>
            <Text style={styles.contactText}>Phone / Helpline: +91 9750807463</Text>
          </View>

          <SectionTitle number="8" title="Developer Information" />
          <Text style={styles.p}>
            For technical inquiries or developer support:
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

function Bullet({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="shield-checkmark" size={16} color="#0F766E" style={{ marginTop: 2 }} />
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
    backgroundColor: "#0F766E",
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
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F766E",
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
});
