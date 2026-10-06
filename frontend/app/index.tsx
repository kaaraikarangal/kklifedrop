import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { getActiveSession } from "@/src/api";
import { BrandLogo } from "@/src/components/BrandLogo";

const LOGO_FULL = require("@/assets/images/kk_life_drop_logo.png");
const LOGO_SYMBOL = require("@/assets/images/kk_life_drop_symbol.png");
const BANNER_IMG = require("@/assets/images/kaarai_karangal_banner.png");

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export default function Landing() {
  const insets = useSafeAreaInsets();
  const [sessionChecking, setSessionChecking] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Splash Animation Values
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashLogoScale = useRef(new Animated.Value(0.7)).current;
  const splashLogoOpacity = useRef(new Animated.Value(0)).current;
  const splashTextOpacity = useRef(new Animated.Value(0)).current;
  const splashTextTranslate = useRef(new Animated.Value(20)).current;
  const splashRingScale = useRef(new Animated.Value(0.8)).current;

  // Main Page Micro-Animations
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(24)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const emergencyPulse = useRef(new Animated.Value(1)).current;

  // 1. Check existing session first - if logged in, navigate immediately without ever showing guest landing page
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const session = await getActiveSession();
        if (!isMounted) return;
        if (session.isLoggedIn) {
          if (session.role === "admin") {
            router.replace("/admin");
          } else {
            router.replace("/(tabs)/home");
          }
          return;
        }
      } catch {}

      if (!isMounted) return;
      setIsGuest(true);
      setSessionChecking(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Only run animations if the user is confirmed to be a guest
  useEffect(() => {
    if (!isGuest) return;

    // Opening App Logo Splash Animation Sequence
    Animated.sequence([
      // First: Logo scale & fade in
      Animated.parallel([
        Animated.timing(splashLogoOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(splashLogoScale, {
          toValue: 1.05,
          friction: 4,
          tension: 40,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(splashRingScale, {
          toValue: 1.3,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      // Heartbeat pulse on logo
      Animated.sequence([
        Animated.timing(splashLogoScale, {
          toValue: 1.12,
          duration: 160,
          easing: Easing.ease,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(splashLogoScale, {
          toValue: 1.0,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      // Text fade & slide up
      Animated.parallel([
        Animated.timing(splashTextOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(splashTextTranslate, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      // Pause to let the user admire the brand
      Animated.delay(450),
      // Fade out splash overlay gently
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setShowSplash(false);
    });

    // Main Page Entrance Animation
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 650,
        delay: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(heroTranslate, {
        toValue: 0,
        duration: 650,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    // Continuous gentle heartbeat on the emblem
    const heartBeatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.06,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseScale, {
          toValue: 1.0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    heartBeatLoop.start();

    // Emergency icon subtle pulse
    const emergencyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyPulse, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(emergencyPulse, {
          toValue: 1.0,
          duration: 700,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    emergencyLoop.start();

    return () => {
      heartBeatLoop.stop();
      emergencyLoop.stop();
    };
  }, [isGuest]);

  // If checking session or not verified as a guest, render only the branded splash screen
  if (sessionChecking || !isGuest) {
    return (
      <View style={styles.splashOverlay}>
        <LinearGradient
          colors={["#0B132B", "#1C2541", "#0B132B"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.splashContent}>
          <View style={styles.splashLogoContainer}>
            <Image
              source={LOGO_SYMBOL}
              style={styles.splashLogoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.splashTextWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.splashTitleKK}>KK </Text>
              <Text style={styles.splashTitleLife}>Life </Text>
              <Text style={styles.splashTitleDrop}>Drop</Text>
            </View>
            <Text style={styles.splashTagline}>DONATE BLOOD, SAVE LIVES</Text>
            <View style={styles.splashTamilBadge}>
              <Text style={styles.splashTamilText}>யாதும் ஊரே..! யாவரும் கேளிர்..!</Text>
            </View>
            <Text style={styles.splashOrgText}>
              Kaarai Karangal Samooga Sevai Amaippu
            </Text>
          </View>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.root}>
      {/* ========================================================================= */}
      {/* MAIN APP CONTENT */}
      {/* ========================================================================= */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar with Logo */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
          <BrandLogo variant="horizontal" size="sm" />
          <Pressable
            style={styles.signInHeaderBtn}
            onPress={() => router.push("/auth/mobile")}
          >
            <Ionicons name="person-circle-outline" size={18} color={colors.brandPrimary} />
            <Text style={styles.signInHeaderText}>Sign In</Text>
          </Pressable>
        </View>

        {/* Animated Hero Section */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: heroFade,
              transform: [{ translateY: heroTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={["#0B132B", "#1C2541", "#0B132B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Subtle Ambient Radial Glows */}
          <View style={styles.heroGlowRed} />
          <View style={styles.heroGlowBlue} />

          <View style={styles.heroContent}>
            {/* Center Animated Logo Showcase */}
            <Animated.View
              style={[
                styles.heroLogoWrap,
                { transform: [{ scale: pulseScale }] },
              ]}
            >
              <Image
                source={LOGO_SYMBOL}
                style={styles.heroLogoImg}
                resizeMode="contain"
                accessibilityLabel="KK Life Drop Official Emblem"
              />
            </Animated.View>

            {/* Tamil Motto Badge */}
            <View style={styles.tamilMottoPill}>
              <Text style={styles.tamilMotto}>யாதும் ஊரே..! யாவரும் கேளிர்..!</Text>
            </View>

            {/* Tricolor Headings */}
            <View style={styles.titleRow}>
              <Text style={styles.heroTitleKK}>KK </Text>
              <Text style={styles.heroTitleLife}>Life </Text>
              <Text style={styles.heroTitleDrop}>Drop</Text>
            </View>
            <Text style={styles.heroSubTag}>DONATE BLOOD, SAVE LIVES</Text>

            <Text style={styles.heroDescription}>
              A dedicated humanitarian blood donation platform connecting compassionate donors with patients in emergency need across Tamil Nadu & Puducherry.
            </Text>

            {/* Primary Action Buttons */}
            <View style={styles.ctaRow}>
              <Pressable
                testID="donate-blood-cta"
                style={[styles.cta, styles.ctaPrimary]}
                onPress={() => router.push("/auth/mobile")}
              >
                <Ionicons name="water" size={18} color="#FFFFFF" />
                <Text style={styles.ctaTextPrimary}>Donate Blood</Text>
              </Pressable>

              <Pressable
                testID="request-blood-cta"
                style={[styles.cta, styles.ctaEmergency]}
                onPress={() => router.push("/request-blood")}
              >
                <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
                <Text style={styles.ctaTextEmergency}>Request Blood</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Official Organization Trust Banner */}
        <View style={styles.orgSection}>
          <View style={styles.orgBannerCard}>
            <Image
              source={BANNER_IMG}
              style={styles.orgBannerImg}
              resizeMode="contain"
            />
            <View style={styles.orgDivider} />
            <View style={styles.orgBadgeRow}>
              <View style={styles.trustBadge}>
                <Ionicons name="shield-checkmark" size={14} color={colors.brandBlue} />
                <Text style={styles.trustBadgeText}>Reg: 31/2025 (Act XXI of 1860)</Text>
              </View>
              <View style={[styles.trustBadge, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="ribbon" size={14} color={colors.brandGreen} />
                <Text style={[styles.trustBadgeText, { color: colors.brandGreen }]}>
                  ISO 9001:2015 Certified
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Emergency Alert Banner with Pulsing Icon */}
        <View style={styles.sectionWrap}>
          <Pressable
            testID="emergency-request-btn"
            style={styles.emergencyCard}
            onPress={() => router.push("/request-blood")}
          >
            <LinearGradient
              colors={["#D31027", "#990012"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              style={[
                styles.emergencyIcon,
                { transform: [{ scale: emergencyPulse }] },
              ]}
            >
              <Ionicons name="flash" size={24} color="#FFFFFF" />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <View style={styles.emergencyPill}>
                <Text style={styles.emergencyPillText}>URGENT NEED</Text>
              </View>
              <Text style={styles.emergencyTitle}>Emergency Blood Requirement?</Text>
              <Text style={styles.emergencyDesc}>
                Submit an immediate request. Kaarai Karangal coordinators reach verified donors instantly.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Footer with Legal Links & Secret Admin Access */}
        <View style={styles.adminFooter}>
          <View style={styles.legalLinksRow}>
            <Pressable onPress={() => router.push("/terms")} testID="landing-terms-btn">
              <Text style={styles.legalLinkText}>Terms & Conditions</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable onPress={() => router.push("/privacy")} testID="landing-privacy-btn">
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </Pressable>
          </View>
          <Pressable
            testID="admin-login-dot"
            hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            onPress={() => router.push("/auth/admin-login")}
            style={styles.adminSecretBtn}
            accessibilityRole="none"
          >
            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} Kaarai Karangal Samooga Sevai Amaippu. All rights reserved.
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* OPENING APP LOGO ANIMATION SPLASH OVERLAY */}
      {/* ========================================================================= */}
      {showSplash ? (
        <Animated.View
          style={[styles.splashOverlay, { opacity: splashOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["#0B132B", "#1C2541", "#0B132B"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Animated Glow Rings */}
          <Animated.View
            style={[
              styles.splashGlowRing,
              { transform: [{ scale: splashRingScale }] },
            ]}
          />

          <View style={styles.splashContent}>
            {/* Center Animated Logo Emblem */}
            <Animated.View
              style={[
                styles.splashLogoContainer,
                {
                  opacity: splashLogoOpacity,
                  transform: [{ scale: splashLogoScale }],
                },
              ]}
            >
              <Image
                source={LOGO_SYMBOL}
                style={styles.splashLogoImg}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Animated Brand Typography */}
            <Animated.View
              style={[
                styles.splashTextWrap,
                {
                  opacity: splashTextOpacity,
                  transform: [{ translateY: splashTextTranslate }],
                },
              ]}
            >
              <View style={styles.titleRow}>
                <Text style={styles.splashTitleKK}>KK </Text>
                <Text style={styles.splashTitleLife}>Life </Text>
                <Text style={styles.splashTitleDrop}>Drop</Text>
              </View>
              <Text style={styles.splashTagline}>DONATE BLOOD, SAVE LIVES</Text>

              <View style={styles.splashTamilBadge}>
                <Text style={styles.splashTamilText}>யாதும் ஊரே..! யாவரும் கேளிர்..!</Text>
              </View>

              <Text style={styles.splashOrgText}>
                Kaarai Karangal Samooga Sevai Amaippu
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Section({
  title,
  children,
  rightAction,
}: {
  title: string;
  children: React.ReactNode;
  rightAction?: { label: string; onPress: () => void };
}) {
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
  root: { flex: 1, width: "100%", backgroundColor: "#F8FAFC" },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    width: "100%",
  },
  signInHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FFF1F2",
  },
  signInHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
  },

  /* Hero Section */
  heroCard: {
    width: "92%",
    maxWidth: 680,
    alignSelf: "center",
    marginVertical: spacing.lg,
    borderRadius: 24,
    overflow: "hidden",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  heroGlowRed: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(211, 16, 39, 0.25)",
  },
  heroGlowBlue: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0, 82, 212, 0.22)",
  },
  heroContent: {
    alignItems: "center",
  },
  heroLogoWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: spacing.md,
  },
  heroLogoImg: {
    width: 98,
    height: 98,
    borderRadius: 49,
  },
  tamilMottoPill: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  tamilMotto: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    flexWrap: "nowrap",
    marginTop: 2,
  },
  heroTitleKK: {
    fontSize: 34,
    fontWeight: "900",
    color: "#38BDF8",
    letterSpacing: -0.5,
  },
  heroTitleLife: {
    fontSize: 34,
    fontWeight: "900",
    color: "#4ADE80",
    letterSpacing: -0.5,
  },
  heroTitleDrop: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FF4D4D",
    letterSpacing: -0.5,
  },
  heroSubTag: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: "rgba(255, 255, 255, 0.82)",
    marginTop: 2,
    marginBottom: spacing.md,
  },
  heroDescription: {
    color: "#CBD5E1",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaPrimary: {
    backgroundColor: colors.brandPrimary,
  },
  ctaEmergency: {
    backgroundColor: "#DC2626",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ctaTextPrimary: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  ctaTextEmergency: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Organization Banner */
  orgSection: {
    width: "92%",
    maxWidth: 680,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  orgBannerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  orgBannerImg: {
    width: "100%",
    height: 75,
  },
  orgDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: spacing.sm,
  },
  orgBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brandSecondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandBlue,
  },

  /* Emergency Section */
  sectionWrap: {
    width: "92%",
    maxWidth: 680,
    alignSelf: "center",
    marginTop: spacing.lg,
  },
  emergencyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 14,
    overflow: "hidden",
    shadowColor: "#D31027",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  emergencyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyPill: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  emergencyPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  emergencyDesc: {
    fontSize: 12,
    color: "#FFFFFFEE",
    marginTop: 2,
    lineHeight: 16,
  },

  /* Sections */
  section: {
    width: "92%",
    maxWidth: 680,
    alignSelf: "center",
    marginTop: spacing.xl,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionAction: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  /* How it works */
  howCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  howIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  howTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  howDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 18,
  },

  /* Blood Groups */
  bgGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  bgCell: {
    width: "22%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bgLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 6,
  },
  bgCtaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: radius.md,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bgCtaText: {
    fontSize: 12,
    color: "#1E40AF",
    flex: 1,
    lineHeight: 16,
  },

  /* Privacy card */
  trustSectionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  trustIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  trustSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  trustSectionDesc: {
    fontSize: 13,
    color: "#1E40AF",
    marginTop: 4,
    lineHeight: 19,
  },

  /* Footer */
  adminFooter: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  legalLinkText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 12,
    color: "#CBD5E1",
  },
  adminSecretBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { cursor: "default" as any },
    }),
  },
  footerCopyright: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },

  /* ========================================================================= */
  /* SPLASH OVERLAY STYLES */
  /* ========================================================================= */
  splashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B132B",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  splashGlowRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(211, 16, 39, 0.22)",
  },
  splashContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  splashLogoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: spacing.lg,
  },
  splashLogoImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  splashTextWrap: {
    alignItems: "center",
  },
  splashTitleKK: {
    fontSize: 36,
    fontWeight: "900",
    color: "#38BDF8",
    letterSpacing: -0.5,
  },
  splashTitleLife: {
    fontSize: 36,
    fontWeight: "900",
    color: "#4ADE80",
    letterSpacing: -0.5,
  },
  splashTitleDrop: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FF4D4D",
    letterSpacing: -0.5,
  },
  splashTagline: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
  },
  splashTamilBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  splashTamilText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  splashOrgText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
});
