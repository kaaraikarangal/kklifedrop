import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";

// Local image assets generated from reference guidelines
const IMAGES = {
  hero: require("@/assets/images/first_donor_hero.jpg"),
  before: require("@/assets/images/before_donation_guide.jpg"),
  after: require("@/assets/images/after_donation_care.jpg"),
};

type TabKey = "community" | "before" | "after";

export function FirstTimeDonorHub() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("community");
  const [previewImage, setPreviewImage] = useState<any | null>(null);

  return (
    <View style={styles.container}>
      {/* Outer Card with Gradient Header */}
      <View style={styles.card}>
        {/* Toggle Header Bar */}
        <Pressable
          style={styles.toggleHeader}
          onPress={() => setIsOpen((prev) => !prev)}
          testID="toggle-first-time-hub"
          accessibilityRole="button"
          accessibilityLabel="Toggle first time blood donor guide"
        >
          <LinearGradient
            colors={["#DC2626", "#991B1B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerLeft}>
              <View style={styles.pillBadge}>
                <Ionicons name="sparkles" size={12} color="#FEF08A" />
                <Text style={styles.pillBadgeText}>NEW DONOR GUIDE</Text>
              </View>
              <Text style={styles.headerTitle}>
                Why Donate? First-Time Lifesaver Hub
              </Text>
              <Text style={styles.headerSub}>
                Start with us! 1 unit saves up to 3 lives • Preparation & Safety
              </Text>
            </View>

            <View style={styles.toggleIconBtn}>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={22}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Expandable Content Body */}
        {isOpen ? (
          <View style={styles.contentBody}>
            {/* Interactive 3-Tab Pill Switcher */}
            <View style={styles.tabBar}>
              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "community" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("community")}
                testID="tab-donor-community"
              >
                <Ionicons
                  name="people"
                  size={14}
                  color={activeTab === "community" ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === "community" && styles.tabItemTextActive,
                  ]}
                >
                  Community First
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "before" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("before")}
                testID="tab-donor-before"
              >
                <Ionicons
                  name="nutrition"
                  size={14}
                  color={activeTab === "before" ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === "before" && styles.tabItemTextActive,
                  ]}
                >
                  Before Donating
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "after" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("after")}
                testID="tab-donor-after"
              >
                <Ionicons
                  name="medkit"
                  size={14}
                  color={activeTab === "after" ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === "after" && styles.tabItemTextActive,
                  ]}
                >
                  Aftercare & Safety
                </Text>
              </Pressable>
            </View>

            {/* TAB 1: COMMUNITY RESPONSIBILITY (Ref Poster 1) */}
            {activeTab === "community" && (
              <View style={styles.tabContent}>
                {/* Visual Hero Image Banner with Tap-to-Zoom */}
                <Pressable
                  style={styles.imageWrap}
                  onPress={() => setPreviewImage(IMAGES.hero)}
                  testID="preview-hero-image"
                >
                  <Image
                    source={IMAGES.hero}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlayTag}>
                    <Ionicons name="expand" size={13} color="#FFFFFF" />
                    <Text style={styles.imageOverlayText}>Tap to Enlarge</Text>
                  </View>
                </Pressable>

                {/* Catchy Slogan Box */}
                <View style={styles.quoteBox}>
                  <Ionicons name="heart" size={20} color="#DC2626" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.quoteTitle}>
                      "Emergency Blood Need? Let Change Begin with Us First!"
                    </Text>
                    <Text style={styles.quoteSub}>
                      Your compassion & blood can give someone another tomorrow.
                    </Text>
                  </View>
                </View>

                {/* Core Responsibilities Grid */}
                <View style={styles.pointsList}>
                  <View style={styles.pointRow}>
                    <View style={[styles.pointIconWrap, { backgroundColor: "#FEE2E2" }]}>
                      <Ionicons name="people-circle" size={18} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>
                        Reach Out to Immediate Circles First
                      </Text>
                      <Text style={styles.pointDesc}>
                        When a patient needs blood, check family, relatives, friends, and co-workers first. That is our primary collective human duty.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointIconWrap, { backgroundColor: "#E0F2FE" }]}>
                      <Ionicons name="business" size={18} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>
                        Hospitals Never Refuse Emergency Care
                      </Text>
                      <Text style={styles.pointDesc}>
                        For critical treatments, hospitals administer emergency blood units immediately and only request replacement units to keep reserves safe.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointIconWrap, { backgroundColor: "#FEF3C7" }]}>
                      <Ionicons name="shield-checkmark" size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>
                        Volunteers Stand Ready 24/7
                      </Text>
                      <Text style={styles.pointDesc}>
                        When blood banks or family cannot provide a rare match, verified voluntary donors across KK Life Drop are always on standby.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointIconWrap, { backgroundColor: "#DCFCE7" }]}>
                      <Ionicons name="water" size={18} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>
                        One Donation Rescues Up to 3 Lives
                      </Text>
                      <Text style={styles.pointDesc}>
                        Your 350ml donation separates into Red Blood Cells, Platelets, and Plasma—aiding trauma patients, surgeries, and cancer treatments.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: BEFORE YOU DONATE (Ref Poster 2) */}
            {activeTab === "before" && (
              <View style={styles.tabContent}>
                {/* Infographic Image Banner */}
                <Pressable
                  style={styles.imageWrap}
                  onPress={() => setPreviewImage(IMAGES.before)}
                  testID="preview-before-image"
                >
                  <Image
                    source={IMAGES.before}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlayTag}>
                    <Ionicons name="expand" size={13} color="#FFFFFF" />
                    <Text style={styles.imageOverlayText}>Tap to Enlarge</Text>
                  </View>
                </Pressable>

                <View style={[styles.quoteBox, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#16A34A" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.quoteTitle, { color: "#166534" }]}>
                      Pre-Donation Preparation Checklist
                    </Text>
                    <Text style={[styles.quoteSub, { color: "#15803D" }]}>
                      Follow these 5 simple medical guidelines to ensure a smooth, comfortable donation.
                    </Text>
                  </View>
                </View>

                {/* Steps List */}
                <View style={styles.pointsList}>
                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#0284C7" }]}>
                      <Text style={styles.pointStepBadgeText}>1</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Hydrate Adequately</Text>
                      <Text style={styles.pointDesc}>
                        Drink plenty of water or fresh juice (at least 500ml) 30-60 minutes before donating to maintain blood volume.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#16A34A" }]}>
                      <Text style={styles.pointStepBadgeText}>2</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Eat a Healthy Meal</Text>
                      <Text style={styles.pointDesc}>
                        Never donate on an empty stomach. Enjoy a nutritious, iron-rich meal (fruits, cereals, vegetables) 2-3 hours beforehand.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#7C3AED" }]}>
                      <Text style={styles.pointStepBadgeText}>3</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Get 6 to 8 Hours of Good Sleep</Text>
                      <Text style={styles.pointDesc}>
                        Arrive well-rested. Adequate sleep prevents dizziness and keeps your vitals (pulse, BP) in the optimal range.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#DC2626" }]}>
                      <Text style={styles.pointStepBadgeText}>4</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Avoid Alcohol for 24-48 Hours</Text>
                      <Text style={styles.pointDesc}>
                        Alcohol causes dehydration and impacts platelet quality. Refrain from alcohol before your appointment.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#EA580C" }]}>
                      <Text style={styles.pointStepBadgeText}>5</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Wear Comfortable Clothes</Text>
                      <Text style={styles.pointDesc}>
                        Wear loose-fitting clothing with sleeves that roll up easily past the elbow for effortless needle access.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#0D9488" }]}>
                      <Text style={styles.pointStepBadgeText}>6</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Disclose Any Health Conditions</Text>
                      <Text style={styles.pointDesc}>
                        Inform the medical officer about any medications, mild fever, cold, or recent dental work during pre-screening.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 3: AFTER DONATING (Ref Poster 3) */}
            {activeTab === "after" && (
              <View style={styles.tabContent}>
                {/* Infographic Image Banner */}
                <Pressable
                  style={styles.imageWrap}
                  onPress={() => setPreviewImage(IMAGES.after)}
                  testID="preview-after-image"
                >
                  <Image
                    source={IMAGES.after}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlayTag}>
                    <Ionicons name="expand" size={13} color="#FFFFFF" />
                    <Text style={styles.imageOverlayText}>Tap to Enlarge</Text>
                  </View>
                </Pressable>

                <View style={[styles.quoteBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.quoteTitle, { color: "#1E40AF" }]}>
                      Post-Donation Recovery & Care
                    </Text>
                    <Text style={[styles.quoteSub, { color: "#1D4ED8" }]}>
                      You just saved lives! Follow these vital tips to bounce back quickly and stay energized.
                    </Text>
                  </View>
                </View>

                {/* Steps List */}
                <View style={styles.pointsList}>
                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#16A34A" }]}>
                      <Text style={styles.pointStepBadgeText}>1</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Rest for at Least 15 Minutes</Text>
                      <Text style={styles.pointDesc}>
                        Sit comfortably in the clinic's refreshment lounge. Do not rush to stand up immediately after donating.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#0284C7" }]}>
                      <Text style={styles.pointStepBadgeText}>2</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Rehydrate & Enjoy Snacks</Text>
                      <Text style={styles.pointDesc}>
                        Drink the juice and light snack provided at the center to replenish glucose and body fluids quickly.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#EA580C" }]}>
                      <Text style={styles.pointStepBadgeText}>3</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Keep Bandage on for 4 to 6 Hours</Text>
                      <Text style={styles.pointDesc}>
                        Keep the puncture site dry and clean. Remove the bandage gently after 6 hours to allow natural skin healing.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#DC2626" }]}>
                      <Text style={styles.pointStepBadgeText}>4</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Avoid Heavy Lifting & Gym Workouts</Text>
                      <Text style={styles.pointDesc}>
                        Refrain from heavy exercise, weights, or strenuous physical work for the remainder of the day.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.pointStepBadge, { backgroundColor: "#475569" }]}>
                      <Text style={styles.pointStepBadgeText}>5</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointTitle}>Helpline & Support Contact</Text>
                      <Text style={styles.pointDesc}>
                        If you experience any unusual dizziness or bruising, sit down with your head between your knees and contact the blood bank immediately.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* CALL TO ACTION BAR TO REGISTRATION PAGE */}
            <View style={styles.ctaWrap}>
              <Pressable
                style={styles.registerCtaBtn}
                onPress={() => router.push("/auth/mobile")}
                testID="hub-to-register-cta-btn"
              >
                <LinearGradient
                  colors={["#E11D48", "#BE123C"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="heart" size={18} color="#FFFFFF" />
                <Text style={styles.registerCtaBtnText}>
                  Ready to Save Lives? Register as a Donor
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>

              {/* Auxiliary Criteria Button */}
              <Pressable
                style={styles.auxCriteriaBtn}
                onPress={() => router.push("/donor-criteria-chat")}
                testID="hub-to-criteria-btn"
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.brandPrimary} />
                <Text style={styles.auxCriteriaBtnText}>
                  Not sure if eligible? Check Criteria AI
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* FULL-IMAGE PREVIEW MODAL */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewModalBg}>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                <Text style={styles.previewTitle}>Educational Guide</Text>
              </View>
              <Pressable
                onPress={() => setPreviewImage(null)}
                style={styles.previewCloseBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ alignItems: "center", padding: 12 }}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              {previewImage ? (
                <Image
                  source={previewImage}
                  style={styles.previewFullImage}
                  resizeMode="contain"
                />
              ) : null}
            </ScrollView>

            <View style={styles.previewFooter}>
              <Pressable
                style={styles.previewFooterCta}
                onPress={() => {
                  setPreviewImage(null);
                  router.push("/auth/mobile");
                }}
              >
                <Text style={styles.previewFooterCtaText}>
                  Go to Donor Registration →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FECACA",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  toggleHeader: {
    width: "100%",
  },
  headerGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  pillBadgeText: {
    color: "#FEF08A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    color: "#FEE2E2",
    marginTop: 2,
    lineHeight: 16,
  },
  toggleIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  contentBody: {
    padding: spacing.md,
    backgroundColor: "#FFFFFF",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  tabItemActive: {
    backgroundColor: colors.brandPrimary,
  },
  tabItemText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  tabItemTextActive: {
    color: "#FFFFFF",
  },
  tabContent: {
    marginTop: 2,
  },
  imageWrap: {
    width: "100%",
    height: 190,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: spacing.md,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlayTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  imageOverlayText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  quoteTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
    lineHeight: 18,
  },
  quoteSub: {
    fontSize: 11.5,
    color: "#7F1D1D",
    marginTop: 2,
    lineHeight: 16,
  },
  pointsList: {
    gap: 12,
    marginBottom: spacing.md,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pointIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pointStepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pointStepBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  pointTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
  pointDesc: {
    fontSize: 11.5,
    color: colors.onSurfaceSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  ctaWrap: {
    marginTop: spacing.sm,
    gap: 8,
  },
  registerCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#BE123C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  registerCtaBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  auxCriteriaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  auxCriteriaBtnText: {
    fontSize: 12,
    color: colors.brandPrimary,
    fontWeight: "700",
  },

  // Full-image preview modal
  previewModalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  previewContainer: {
    width: "100%",
    maxWidth: 520,
    height: "85%",
    backgroundColor: "#0F172A",
    borderRadius: radius.xl,
    overflow: "hidden",
    flexDirection: "column",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  previewCloseBtn: {
    padding: 4,
  },
  previewFullImage: {
    width: "100%",
    height: 400,
    borderRadius: radius.md,
  },
  previewFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  previewFooterCta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFooterCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
