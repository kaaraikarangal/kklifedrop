import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/src/theme";

const BLOOD_CREATIVE_IMG = require("@/assets/images/blood_donation_creative.png");
const USE_NATIVE_DRIVER = Platform.OS !== "web";

interface BloodInspirationCardProps {
  variant?: "compact" | "full";
  onActionPress?: () => void;
  actionText?: string;
}

export function BloodInspirationCard({
  variant = "full",
  onActionPress,
  actionText = "Become a Donor",
}: BloodInspirationCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle floating & pulsing effect
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, []);

  const handleAction = () => {
    if (onActionPress) {
      onActionPress();
    } else {
      router.push("/auth/mobile");
    }
  };

  const acrosticData = [
    { letter: "B", word: "Beautiful", desc: "A noble act of compassion" },
    { letter: "L", word: "Life", desc: "Given to someone in critical need" },
    { letter: "O", word: "Only", desc: "Possible through selfless giving" },
    { letter: "O", word: "On", desc: "Continuous community support" },
    { letter: "D", word: "Donating.", desc: "Every drop makes a difference" },
  ];

  return (
    <View style={styles.outerContainer} testID="blood-inspiration-card">
      <View style={styles.cardContainer}>
        {/* Subtle Background Layer */}
        <LinearGradient
          colors={["#FFFFFF", "#FFF7F7", "#FEE2E2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Top Glow */}
        <View style={styles.ambientGlow} />

        {/* Header Tag */}
        <View style={styles.headerRow}>
          <View style={styles.pillBadge}>
            <Ionicons name="heart" size={13} color="#D31027" />
            <Text style={styles.pillText}>THE POWER OF GIVING</Text>
          </View>
        </View>

        {/* Main Content Split: Blood Bag Visual + Acrostic Typography */}
        <View style={styles.bodySplit}>
          {/* Left Column: Stylized Artwork Image */}
          <View style={styles.imageColumn}>
            <Animated.View
              style={[
                styles.imageShadowWrap,
                {
                  transform: [
                    { scale: pulseAnim },
                    { translateY: floatAnim },
                  ],
                },
              ]}
            >
              <Image
                source={BLOOD_CREATIVE_IMG}
                style={styles.bloodBagImg}
                resizeMode="cover"
                accessibilityLabel="Clean medical blood donation artwork"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.2)"]}
                style={styles.imageFadeOverlay}
              />
            </Animated.View>
            <View style={styles.captionBadge}>
              <Ionicons name="water" size={11} color="#D31027" />
              <Text style={styles.captionText}>1 Donation = 3 Lives</Text>
            </View>
          </View>

          {/* Right Column: Acrostic Letters and Meaning */}
          <View style={styles.acrosticColumn}>
            {acrosticData.map((item, idx) => (
              <View key={idx} style={styles.acrosticRow}>
                {/* Big Vibrant Red Letter Badge */}
                <View style={styles.letterBadge}>
                  <Text style={styles.letterChar}>{item.letter}</Text>
                </View>
                <Text style={styles.dashChar}>-</Text>
                {/* Full Word */}
                <View style={styles.wordBlock}>
                  <Text
                    style={[
                      styles.wordText,
                      item.letter === "D" && styles.wordTextHighlight,
                    ]}
                  >
                    {item.word}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Card Footer with Call to Action & Quote */}
        <View style={styles.cardFooter}>
          <View style={styles.quoteRow}>
            <Ionicons name="sparkles" size={14} color="#D31027" />
            <Text style={styles.quoteText}>
              "Your 15 minutes can gift someone a lifetime."
            </Text>
          </View>

          <Pressable
            testID="blood-card-action-btn"
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleAction}
          >
            <LinearGradient
              colors={["#D31027", "#990012"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="heart-circle" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{actionText}</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </Pressable>

          <Pressable
            testID="blood-card-criteria-btn"
            style={styles.eligibilityBtn}
            onPress={() => router.push("/donor-criteria-chat")}
          >
            <Ionicons name="chatbubbles" size={15} color="#0052D4" />
            <Text style={styles.eligibilityBtnText}>Have Doubts? Ask Donor Criteria AI</Text>
            <Ionicons name="chevron-forward" size={14} color="#0052D4" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  cardContainer: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "#FECDD3",
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#D31027",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0px 10px 25px rgba(211, 16, 39, 0.1)",
      },
    }),
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(254, 205, 211, 0.5)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  pillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D31027",
    letterSpacing: 0.8,
  },
  bodySplit: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  imageColumn: {
    alignItems: "center",
    width: "42%",
  },
  imageShadowWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    backgroundColor: "#F8FAFC",
  },
  bloodBagImg: {
    width: "100%",
    height: "100%",
  },
  imageFadeOverlay: {
    ...StyleSheet.absoluteFill,
  },
  captionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  captionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#991B1B",
  },
  acrosticColumn: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 4,
    gap: 6,
  },
  acrosticRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#D31027",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D31027",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  letterChar: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 20,
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
  },
  dashChar: {
    fontSize: 14,
    fontWeight: "800",
    color: "#94A3B8",
    marginHorizontal: 6,
  },
  wordBlock: {
    flex: 1,
  },
  wordText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  wordTextHighlight: {
    fontSize: 17,
    fontWeight: "900",
    color: "#D31027",
    letterSpacing: -0.3,
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(254, 205, 211, 0.4)",
    gap: 10,
  },
  quoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quoteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#D31027",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  eligibilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  eligibilityBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0052D4",
  },
});
