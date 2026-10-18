import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { BrandLogo } from "@/src/components/BrandLogo";
import { KaaraiKarangalDonationModal } from "@/src/components/KaaraiKarangalDonationModal";

export default function DonateScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(true);
  const [amount, setAmount] = useState(500);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <BrandLogo variant="horizontal" size="sm" />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Card */}
        <LinearGradient
          colors={["#0F172A", "#1E1B4B", "#311018"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.badgeRow}>
            <View style={styles.orgBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
              <Text style={styles.orgBadgeText}>OFFICIAL NON-PROFIT • REG: 31/2025</Text>
            </View>
            <View style={styles.rzpBadge}>
              <Ionicons name="flash" size={12} color="#38BDF8" />
              <Text style={styles.rzpBadgeText}>Razorpay & UPI: kaaraikarangal@dbs</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Support Kaarai Karangal</Text>
          <Text style={styles.heroSubtitle}>
            Your voluntary financial contributions power 24x7 emergency blood logistics, cold-chain transport boxes, volunteer transit fuel, and hospital patient assistance across Karaikal & Tamil Nadu.
          </Text>

          <View style={styles.quickChipContainer}>
            <Text style={styles.quickChipTitle}>SELECT CONTRIBUTION:</Text>
            <View style={styles.chipRow}>
              {[100, 250, 500, 1000, 2500].map((amt) => (
                <Pressable
                  key={amt}
                  style={[styles.chip, amount === amt && styles.chipActive]}
                  onPress={() => {
                    setAmount(amt);
                    setModalVisible(true);
                  }}
                >
                  <Text style={[styles.chipText, amount === amt && styles.chipTextActive]}>
                    ₹{amt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.donateBtn} onPress={() => setModalVisible(true)}>
            <LinearGradient
              colors={["#DC2626", "#B91C1C"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Ionicons name="heart" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.donateBtnText}>Donate via Razorpay or UPI (kaaraikarangal@dbs)</Text>
          </Pressable>
        </LinearGradient>

        {/* Transparency Section */}
        <View style={styles.transparencyCard}>
          <Text style={styles.sectionHeader}>100% NON-PROFIT TRANSPARENCY</Text>
          <View style={styles.pointRow}>
            <View style={styles.pointDot} />
            <Text style={styles.pointText}>
              <Text style={styles.pointBold}>Zero Platform Fees: </Text>
              100% of your donation is directed to humanitarian operations.
            </Text>
          </View>
          <View style={styles.pointRow}>
            <View style={styles.pointDot} />
            <Text style={styles.pointText}>
              <Text style={styles.pointBold}>80G Tax Exemption: </Text>
              Digital tax receipt generated instantly upon successful transaction.
            </Text>
          </View>
          <View style={styles.pointRow}>
            <View style={styles.pointDot} />
            <Text style={styles.pointText}>
              <Text style={styles.pointBold}>Emergency Response: </Text>
              Funds sterile cold-chain vaccine/blood transit boxes for immediate delivery.
            </Text>
          </View>
        </View>

        {/* Org contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Kaarai Karangal Samooga Sevai Amaippu</Text>
          <Text style={styles.contactSub}>
            K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602, India.
          </Text>
          <Text style={styles.contactSub}>Helpline: +91 9750807463 · Email: kaaraikarangal@gmail.com</Text>
        </View>
      </ScrollView>

      <KaaraiKarangalDonationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialAmount={amount}
      />
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  orgBadgeText: {
    color: "#34D399",
    fontSize: 9.5,
    fontWeight: "800",
  },
  rzpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rzpBadgeText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  quickChipContainer: {
    marginTop: 18,
    marginBottom: 16,
  },
  quickChipTitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  chipActive: {
    backgroundColor: "#DC2626",
    borderColor: "#EF4444",
  },
  chipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  donateBtn: {
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  donateBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  transparencyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  pointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
    marginTop: 6,
  },
  pointText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    flex: 1,
  },
  pointBold: {
    fontWeight: "800",
    color: "#0F172A",
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  contactSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 15,
  },
});
