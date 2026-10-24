import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { safeBack } from "@/src/navigation";

const IMAGES = {
  hero: require("@/assets/images/first_donor_hero.jpg"),
  before: require("@/assets/images/before_donation_guide.jpg"),
  after: require("@/assets/images/after_donation_care.jpg"),
};

export default function FirstTimeDonorPage() {
  const insets = useSafeAreaInsets();
  const [previewImage, setPreviewImage] = useState<any | null>(null);

  return (
    <View style={styles.root}>
      {/* Top Header Navigation */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => safeBack("/")}
          testID="btn-back-main"
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topBarTitle}>First-Time Donor Hub</Text>
          <Text style={styles.topBarSub}>Everything a new lifesaver needs to know</Text>
        </View>
        <Pressable
          style={styles.registerHeaderBtn}
          onPress={() => router.push("/auth/mobile")}
          testID="top-register-cta-btn"
        >
          <Text style={styles.registerHeaderBtnText}>Register Now</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER - ELEGANT CURVED CARD */}
        <View style={styles.heroCardWrap}>
          <LinearGradient
            colors={["#DC2626", "#B91C1C", "#991B1B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroPill}>
              <Ionicons name="sparkles" size={13} color="#FEF08A" />
              <Text style={styles.heroPillText}>FIRST-TIME HEROES</Text>
            </View>

            <Text style={styles.heroTitle}>
              Why You Should Donate Blood For The First Time
            </Text>

            <Text style={styles.heroDesc}>
              Blood cannot be manufactured in a factory. It only comes as a generous gift from one human being to another. Just 1 donation can save up to 3 precious lives!
            </Text>

            {/* Quick Metrics */}
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>1 Unit</Text>
                <Text style={styles.metricLbl}>Saves 3 Lives</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>350 ml</Text>
                <Text style={styles.metricLbl}>Regenerates in 48h</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>10 Mins</Text>
                <Text style={styles.metricLbl}>Actual Draw Time</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* 4-STEP FIRST-TIME DONOR JOURNEY */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionCategoryTag}>THE DONOR EXPERIENCE</Text>
          <Text style={styles.sectionMainTitle}>
            Your 4-Step Lifesaver Journey
          </Text>
          <Text style={styles.sectionMainSub}>
            Here is exactly what happens from the moment you step in:
          </Text>

          <View style={styles.journeyGrid}>
            <View style={styles.journeyItem}>
              <View style={[styles.journeyBadge, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="clipboard" size={18} color="#2563EB" />
              </View>
              <Text style={styles.journeyStepTitle}>1. Health Check</Text>
              <Text style={styles.journeyStepDesc}>
                5-minute confidential vitals & Hb check
              </Text>
            </View>

            <View style={styles.journeyItem}>
              <View style={[styles.journeyBadge, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="water" size={18} color="#DC2626" />
              </View>
              <Text style={styles.journeyStepTitle}>2. 10-Min Donation</Text>
              <Text style={styles.journeyStepDesc}>
                Relax in a cozy recliner with caring staff
              </Text>
            </View>

            <View style={styles.journeyItem}>
              <View style={[styles.journeyBadge, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="cafe" size={18} color="#16A34A" />
              </View>
              <Text style={styles.journeyStepTitle}>3. Refreshments</Text>
              <Text style={styles.journeyStepDesc}>
                Enjoy complimentary juice & cookies
              </Text>
            </View>

            <View style={styles.journeyItem}>
              <View style={[styles.journeyBadge, { backgroundColor: "#FAF5FF" }]}>
                <Ionicons name="ribbon" size={18} color="#9333EA" />
              </View>
              <Text style={styles.journeyStepTitle}>4. Life Saved!</Text>
              <Text style={styles.journeyStepDesc}>
                Receive digital certificate & donor status
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 1: COMMUNITY RESPONSIBILITY (Poster 1) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionNumBadge, { backgroundColor: "#DC2626" }]}>
              <Text style={styles.sectionNumBadgeText}>1</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.sectionCategoryTag}>COMMUNITY ETHICS</Text>
              <Text style={styles.sectionMainTitle}>
                Start With Us: Responsibility in Emergencies
              </Text>
              <Text style={styles.sectionMainSub}>
                Why family, friends & community must unite first
              </Text>
            </View>
          </View>

          {/* Hero Illustration */}
          <Pressable
            style={styles.imageCard}
            onPress={() => setPreviewImage(IMAGES.hero)}
            testID="enlarge-hero-img"
          >
            <Image
              source={IMAGES.hero}
              style={styles.guideImage}
              resizeMode="cover"
            />
            <View style={styles.imageZoomBadge}>
              <Ionicons name="expand" size={13} color="#FFFFFF" />
              <Text style={styles.imageZoomText}>Tap to Enlarge</Text>
            </View>
          </Pressable>

          {/* Slogan Banner */}
          <View style={styles.sloganBanner}>
            <Ionicons name="megaphone" size={22} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.sloganTitle}>
                "Emergency Blood Requirement? Let Change Begin with Us First!"
              </Text>
              <Text style={styles.sloganDesc}>
                Your kindness and healthy blood have the power to save an emergency patient.
              </Text>
            </View>
          </View>

          {/* Core Insights */}
          <View style={styles.cardDetails}>
            <View style={styles.insightItem}>
              <View style={[styles.insightIconWrap, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="people" size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>1. Reach Out to Your Inner Circle First</Text>
                <Text style={styles.insightText}>
                  When an urgent need arises, contacting immediate family members, relatives, friends, and workplace colleagues is the first human duty before searching outside.
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIconWrap, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="business" size={18} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>2. Hospitals Never Deny Emergency Treatment</Text>
                <Text style={styles.insightText}>
                  No hospital says "No blood for emergency procedures". Hospitals administer life-saving units immediately and only ask the family to arrange replacement donors to safeguard blood bank reserves.
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="shield-checkmark" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>3. Voluntary Donors Stand Ready 24/7</Text>
                <Text style={styles.insightText}>
                  Whenever blood banks run short or rare blood groups are needed, verified voluntary donors on KK Life Drop are always on standby to step forward and donate.
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIconWrap, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="heart" size={18} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>4. One Unit Rescues Up to 3 Lives</Text>
                <Text style={styles.insightText}>
                  Whole blood is separated into Red Blood Cells, Platelets, and Plasma, helping trauma victims, major surgeries, newborn infants, and cancer fighters simultaneously.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 2: PRE-DONATION GUIDELINES (Poster 2) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionNumBadge, { backgroundColor: "#0284C7" }]}>
              <Text style={styles.sectionNumBadgeText}>2</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.sectionCategoryTag}>PREPARATION PROTOCOL</Text>
              <Text style={styles.sectionMainTitle}>
                Before You Donate: Steps to Follow
              </Text>
              <Text style={styles.sectionMainSub}>
                Simple guidelines to prepare your body for a safe & comfortable donation
              </Text>
            </View>
          </View>

          {/* Infographic Image */}
          <Pressable
            style={styles.imageCard}
            onPress={() => setPreviewImage(IMAGES.before)}
            testID="enlarge-before-img"
          >
            <Image
              source={IMAGES.before}
              style={styles.guideImage}
              resizeMode="cover"
            />
            <View style={styles.imageZoomBadge}>
              <Ionicons name="expand" size={13} color="#FFFFFF" />
              <Text style={styles.imageZoomText}>Tap to Enlarge</Text>
            </View>
          </Pressable>

          <View style={[styles.sloganBanner, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Ionicons name="nutrition" size={22} color="#16A34A" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.sloganTitle, { color: "#166534" }]}>
                Pre-Donation Golden Rules
              </Text>
              <Text style={[styles.sloganDesc, { color: "#15803D" }]}>
                Hydration, healthy food, and restful sleep ensure a breezy experience without any dizziness.
              </Text>
            </View>
          </View>

          {/* Guidelines Checklist */}
          <View style={styles.cardDetails}>
            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#0284C7" }]}>
                <Text style={styles.stepNumPillText}>Step 1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Hydrate Adequately</Text>
                <Text style={styles.stepDesc}>
                  Drink plenty of water or fresh fruit juice (at least 500ml) 30 to 60 minutes before your donation. High hydration keeps your blood pressure steady.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#16A34A" }]}>
                <Text style={styles.stepNumPillText}>Step 2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Eat a Regular Healthy Meal</Text>
                <Text style={styles.stepDesc}>
                  Never donate on an empty stomach. Eat a nourishing meal with fruits, vegetables, and complex carbohydrates 2-3 hours before visiting the clinic.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.stepNumPillText}>Step 3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Get Good Sleep (6-8 Hours)</Text>
                <Text style={styles.stepDesc}>
                  Ensure at least 6-8 hours of sound, restful sleep the night before your donation. Being well-rested prevents lightheadedness.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#DC2626" }]}>
                <Text style={styles.stepNumPillText}>Step 4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Avoid Alcohol for 24-48 Hours</Text>
                <Text style={styles.stepDesc}>
                  Do not consume alcohol for at least 24 to 48 hours prior to donation. Alcohol dehydrates the circulatory system.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#EA580C" }]}>
                <Text style={styles.stepNumPillText}>Step 5</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Wear Loose, Comfortable Clothing</Text>
                <Text style={styles.stepDesc}>
                  Wear comfortable clothes with sleeves that roll up easily past the elbow for easy, painless needle placement.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#0D9488" }]}>
                <Text style={styles.stepNumPillText}>Step 6</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Disclose Any Health Information</Text>
                <Text style={styles.stepDesc}>
                  Inform the attending medical officer about any medications, mild cold, past surgeries, or ongoing health conditions during pre-screening.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 3: POST-DONATION CARE (Poster 3) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionNumBadge, { backgroundColor: "#16A34A" }]}>
              <Text style={styles.sectionNumBadgeText}>3</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.sectionCategoryTag}>AFTERCARE & SAFETY</Text>
              <Text style={styles.sectionMainTitle}>
                After Donating: Post-Donation Care Steps
              </Text>
              <Text style={styles.sectionMainSub}>
                How to recover smoothly and celebrate saving human lives
              </Text>
            </View>
          </View>

          {/* Infographic Image */}
          <Pressable
            style={styles.imageCard}
            onPress={() => setPreviewImage(IMAGES.after)}
            testID="enlarge-after-img"
          >
            <Image
              source={IMAGES.after}
              style={styles.guideImage}
              resizeMode="cover"
            />
            <View style={styles.imageZoomBadge}>
              <Ionicons name="expand" size={13} color="#FFFFFF" />
              <Text style={styles.imageZoomText}>Tap to Enlarge</Text>
            </View>
          </Pressable>

          <View style={[styles.sloganBanner, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Ionicons name="shield-checkmark" size={22} color="#2563EB" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.sloganTitle, { color: "#1E40AF" }]}>
                Post-Donation Safety Checklist
              </Text>
              <Text style={[styles.sloganDesc, { color: "#1D4ED8" }]}>
                Celebrate your heroic deed! Follow these steps to bounce back energized within hours.
              </Text>
            </View>
          </View>

          {/* Care Steps */}
          <View style={styles.cardDetails}>
            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#16A34A" }]}>
                <Text style={styles.stepNumPillText}>Step 1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Rest for at Least 15 Minutes</Text>
                <Text style={styles.stepDesc}>
                  Relax in the recovery chair or donor lounge for at least 15 minutes before standing up. Do not rush to leave immediately.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#0284C7" }]}>
                <Text style={styles.stepNumPillText}>Step 2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Rehydrate & Enjoy Snacks</Text>
                <Text style={styles.stepDesc}>
                  Drink the fresh juice and enjoy light biscuits/snacks provided by the clinic to replenish glucose and fluid levels quickly.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#EA580C" }]}>
                <Text style={styles.stepNumPillText}>Step 3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Keep Bandage On for 4-6 Hours</Text>
                <Text style={styles.stepDesc}>
                  Keep the protective bandage dry and clean. You may gently remove it after 4 to 6 hours once the puncture site has completely sealed.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#DC2626" }]}>
                <Text style={styles.stepNumPillText}>Step 4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Avoid Heavy Lifting & Gym Workouts</Text>
                <Text style={styles.stepDesc}>
                  Refrain from heavy lifting, strenuous gym exercises, or pushing with the donation arm for the rest of the day.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepNumPill, { backgroundColor: "#475569" }]}>
                <Text style={styles.stepNumPillText}>Step 5</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Doctor Helpline If Feeling Dizzy</Text>
                <Text style={styles.stepDesc}>
                  If you experience any lightheadedness, sit down immediately with your head between your knees or lie down with legs elevated, and call our support helpline.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 4: MYTH BUSTERS & COMMON QUESTIONS */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionCategoryTag}>PEACE OF MIND</Text>
          <Text style={styles.sectionMainTitle}>
            First-Timer Myth Busters & FAQs
          </Text>
          <Text style={styles.sectionMainSub}>
            Common questions answered by clinical transfusion experts:
          </Text>

          <View style={styles.cardDetails}>
            <View style={styles.faqCard}>
              <View style={styles.faqHeadRow}>
                <Ionicons name="help-circle" size={18} color="#DC2626" />
                <Text style={styles.faqQuestion}>Will it hurt or make me weak?</Text>
              </View>
              <Text style={styles.faqAnswer}>
                No! The needle insertion feels like a tiny 1-second ant pinch. The donation takes only 10 minutes, and healthy bodies produce fresh blood cells immediately. Most donors feel completely normal within an hour.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <View style={styles.faqHeadRow}>
                <Ionicons name="shield-checkmark" size={18} color="#059669" />
                <Text style={styles.faqQuestion}>Is blood donation 100% safe?</Text>
              </View>
              <Text style={styles.faqAnswer}>
                Absolutely. Every needle, tube, and blood bag is pre-sterilized, used only once for you, and incinerated immediately afterwards. There is zero risk of contracting any infection.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <View style={styles.faqHeadRow}>
                <Ionicons name="time" size={18} color="#0284C7" />
                <Text style={styles.faqQuestion}>How often can I donate?</Text>
              </View>
              <Text style={styles.faqAnswer}>
                Healthy adult males can safely donate whole blood every 90 days (3 months), while adult females can donate every 120 days (4 months) to ensure full iron recovery.
              </Text>
            </View>
          </View>
        </View>

        {/* BASIC ELIGIBILITY PILL CARD */}
        <View style={styles.eligibilityCard}>
          <View style={styles.eligibilityHeadRow}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.eligibilityTitle}>Basic Donor Eligibility Rules</Text>
          </View>

          <View style={styles.eligibilityGrid}>
            <View style={styles.eligibilityPill}>
              <Text style={styles.eligibilityPillHead}>AGE</Text>
              <Text style={styles.eligibilityPillVal}>18 – 65 Years</Text>
            </View>
            <View style={styles.eligibilityPill}>
              <Text style={styles.eligibilityPillHead}>WEIGHT</Text>
              <Text style={styles.eligibilityPillVal}>45 kg+</Text>
            </View>
            <View style={styles.eligibilityPill}>
              <Text style={styles.eligibilityPillHead}>HAEMOGLOBIN</Text>
              <Text style={styles.eligibilityPillVal}>12.5 g/dL+</Text>
            </View>
            <View style={styles.eligibilityPill}>
              <Text style={styles.eligibilityPillHead}>INTERVAL</Text>
              <Text style={styles.eligibilityPillVal}>90 / 120 Days</Text>
            </View>
          </View>
        </View>

        {/* BOTTOM REGISTRATION CALL-TO-ACTION */}
        <View style={styles.ctaBox}>
          <LinearGradient
            colors={["#0F172A", "#1E293B", "#0F172A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaCard}
          >
            <View style={styles.ctaIconBadge}>
              <Ionicons name="heart" size={24} color="#EF4444" />
            </View>

            <Text style={styles.ctaHeading}>Ready to Save a Life?</Text>
            <Text style={styles.ctaSubHeading}>
              Join hundreds of verified lifesavers on KK Life Drop. Your registration takes only 2 minutes!
            </Text>

            <Pressable
              style={styles.primaryRegisterBtn}
              onPress={() => router.push("/auth/mobile")}
              testID="btn-bottom-register"
            >
              <LinearGradient
                colors={["#E11D48", "#BE123C"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="water" size={18} color="#FFFFFF" />
              <Text style={styles.primaryRegisterBtnText}>
                Complete Donor Registration
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.criteriaBtn}
              onPress={() => router.push("/donor-criteria-chat")}
              testID="btn-criteria-ai"
            >
              <Ionicons name="chatbubbles-outline" size={16} color="#38BDF8" />
              <Text style={styles.criteriaBtnText}>
                Unsure about eligibility? Ask Criteria AI
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* FULL IMAGE PREVIEW MODAL */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Educational Guideline Poster</Text>
              <Pressable
                onPress={() => setPreviewImage(null)}
                style={styles.modalCloseBtn}
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
                  style={styles.modalFullImage}
                  resizeMode="contain"
                />
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalRegisterBtn}
                onPress={() => {
                  setPreviewImage(null);
                  router.push("/auth/mobile");
                }}
              >
                <Text style={styles.modalRegisterBtnText}>
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
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.onSurface,
  },
  topBarSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  registerHeaderBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    ...Platform.select({
      ios: {
        shadowColor: colors.brandPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: "0 2px 8px rgba(211, 16, 39, 0.25)",
      },
    }),
  },
  registerHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  heroCardWrap: {
    marginBottom: spacing.lg,
  },
  heroCard: {
    borderRadius: 26,
    padding: spacing.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: "0 8px 24px rgba(220, 38, 38, 0.16)",
      },
    }),
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  heroPillText: {
    color: "#FEF08A",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroDesc: {
    fontSize: 13,
    color: "#FEE2E2",
    marginTop: 8,
    lineHeight: 18.5,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  metricLbl: {
    fontSize: 10.5,
    color: "#FECACA",
    marginTop: 2,
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
      },
    }),
  },
  sectionCategoryTag: {
    fontSize: 10.5,
    fontWeight: "800",
    color: colors.brandPrimary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  sectionMainSub: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  journeyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  journeyItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  journeyBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  journeyStepTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.onSurface,
  },
  journeyStepDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  imageCard: {
    width: "100%",
    height: 205,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  guideImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  imageZoomBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  imageZoomText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sloganBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  sloganTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
    lineHeight: 18,
  },
  sloganDesc: {
    fontSize: 11.5,
    color: "#7F1D1D",
    marginTop: 2,
    lineHeight: 16,
  },
  cardDetails: {
    gap: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
  },
  insightText: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  stepNumPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  faqCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  faqHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
  },
  faqAnswer: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    lineHeight: 17,
    marginTop: 4,
  },
  eligibilityCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    borderRadius: 24,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
  },
  eligibilityHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  eligibilityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
  },
  eligibilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eligibilityPill: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  eligibilityPillHead: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  eligibilityPillVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#064E3B",
    marginTop: 2,
  },
  ctaBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  ctaCard: {
    borderRadius: 26,
    padding: spacing.lg,
    alignItems: "center",
    textAlign: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.18)",
      },
    }),
  },
  ctaIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  ctaHeading: {
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  ctaSubHeading: {
    fontSize: 12.5,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  primaryRegisterBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#BE123C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: "0 4px 14px rgba(190, 18, 60, 0.35)",
      },
    }),
  },
  primaryRegisterBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  criteriaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
  },
  criteriaBtnText: {
    color: "#38BDF8",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 540,
    height: "85%",
    backgroundColor: "#0F172A",
    borderRadius: 26,
    overflow: "hidden",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalFullImage: {
    width: "100%",
    height: 420,
    borderRadius: 18,
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  modalRegisterBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRegisterBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
