import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { safeBack } from "@/src/navigation";
import {
  askDonorAssistant,
  queryDonorCriteria,
  QUICK_PROMPTS,
  CriteriaAnswer,
} from "@/src/data/donorCriteriaEngine";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text?: string;
  answer?: CriteriaAnswer;
  timestamp: string;
}

export default function DonorCriteriaChat() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Hello! I am your KK Life Drop Eligibility Assistant, updated with the official National Blood Transfusion Council (NBTC) February 2025 Guidelines.\n\nAsk me any doubt regarding blood donation criteria, deferral periods, medications, surgeries, vaccines, or medical conditions!",
      timestamp: "Just now",
    },
  ]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setIsTyping(true);

    // Smart AI processing
    setTimeout(() => {
      const match = askDonorAssistant(query);
      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        answer: match,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 380);
  };

  const getVerdictBadge = (verdict: CriteriaAnswer["verdict"]) => {
    switch (verdict) {
      case "Eligible":
        return { bg: "#DCFCE7", text: "#15803D", icon: "checkmark-circle", label: "ELIGIBLE TO DONATE" };
      case "Temporarily Deferred":
        return { bg: "#FEF3C7", text: "#B45309", icon: "time", label: "TEMPORARY DEFERRAL" };
      case "Permanently Deferred":
        return { bg: "#FEE2E2", text: "#B91C1C", icon: "close-circle", label: "PERMANENTLY DEFERRED" };
      case "Conditional":
        return { bg: "#E0F2FE", text: "#0369A1", icon: "alert-circle", label: "CONDITIONAL ELIGIBILITY" };
      case "Official Protocol":
        return { bg: "#EDE9FE", text: "#6D28D9", icon: "ribbon", label: "OFFICIAL NBTC PROTOCOL" };
      case "General Guidance":
        return { bg: "#FEF9C3", text: "#854D0E", icon: "bulb", label: "DONATION GUIDANCE" };
      case "AI Assistant":
        return { bg: "#EEF2FF", text: "#4338CA", icon: "sparkles", label: "SMART ASSISTANT" };
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => safeBack("/(tabs)/home")}
          hitSlop={10}
          testID="donor-chat-back-btn"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Donor Criteria Assistant</Text>
            <View style={styles.officialPill}>
              <Text style={styles.officialPillText}>Feb 2025 NBTC</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Govt of India Blood Donor Selection Guidelines</Text>
        </View>

        <Pressable
          style={styles.infoBtn}
          onPress={() =>
            alert(
              "Based on the National Blood Transfusion Council (NBTC) Guidelines for Blood Donor Selection & Referral 2025 (Directorate General of Health Services, Ministry of Health & Family Welfare, Govt of India)."
            )
          }
        >
          <Ionicons name="information-circle-outline" size={24} color="#0052D4" />
        </Pressable>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.messagesList, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Notice Banner */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
            <Text style={styles.disclaimerText}>
              Official criteria compiled directly from the February 2025 Revised National Blood Transfusion Council (NBTC) manual.
            </Text>
          </View>

          {/* Quick Prompts Carousel */}
          <View style={styles.quickPromptsWrap}>
            <Text style={styles.quickPromptsTitle}>Frequently Asked Questions:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsScroll}
            >
              {QUICK_PROMPTS.map((prompt, idx) => (
                <Pressable
                  key={idx}
                  style={styles.promptChip}
                  onPress={() => handleSend(prompt)}
                  testID={`prompt-chip-${idx}`}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color="#D31027" />
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Messages */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === "user" ? styles.messageRowUser : styles.messageRowBot,
              ]}
            >
              {msg.sender === "bot" && (
                <View style={styles.botAvatar}>
                  <Ionicons name="medical" size={16} color="#FFFFFF" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  msg.sender === "user" ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                {/* Standard Text Message */}
                {msg.text && (
                  <Text
                    style={[
                      styles.msgText,
                      msg.sender === "user" ? styles.msgTextUser : styles.msgTextBot,
                    ]}
                  >
                    {msg.text}
                  </Text>
                )}

                {/* Structured Criteria Card Response */}
                {msg.answer && (
                  <View style={styles.criteriaCard}>
                    {/* Verdict Pill */}
                    {(() => {
                      const badge = getVerdictBadge(msg.answer.verdict);
                      return (
                        <View style={[styles.verdictBadge, { backgroundColor: badge.bg }]}>
                          <Ionicons name={badge.icon as any} size={14} color={badge.text} />
                          <Text style={[styles.verdictBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* Headline */}
                    <Text style={styles.answerHeadline}>{msg.answer.headline}</Text>

                    {/* Deferral Period Tag if applicable */}
                    {msg.answer.deferralTime && (
                      <View style={styles.deferralRow}>
                        <Ionicons name="hourglass-outline" size={14} color="#D31027" />
                        <Text style={styles.deferralLabel}>Deferral Period:</Text>
                        <Text style={styles.deferralVal}>{msg.answer.deferralTime}</Text>
                      </View>
                    )}

                    {/* Summary */}
                    <Text style={styles.answerSummary}>{msg.answer.summary}</Text>

                    {/* Key Rules List */}
                    <View style={styles.keyPointsBox}>
                      <Text style={styles.keyPointsTitle}>Official Rules & Requirements:</Text>
                      {msg.answer.keyPoints.map((point, pIdx) => (
                        <View key={pIdx} style={styles.pointItem}>
                          <Ionicons name="checkmark" size={14} color="#15803D" style={{ marginTop: 2 }} />
                          <Text style={styles.pointText}>{point}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Official Citation Footer */}
                    <View style={styles.citationFooter}>
                      <Ionicons name="book-outline" size={12} color="#64748B" />
                      <Text style={styles.citationText}>{msg.answer.citation}</Text>
                    </View>
                  </View>
                )}

                <Text
                  style={[
                    styles.timeText,
                    msg.sender === "user" ? styles.timeTextUser : styles.timeTextBot,
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={styles.botAvatar}>
                <Ionicons name="medical" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: 12 }]}>
                <Text style={styles.typingText}>Consulting NBTC Guidelines...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about tattoo, BP, medication, fever..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            testID="donor-chat-input"
          />
          <Pressable
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            testID="donor-chat-send-btn"
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  officialPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  officialPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  infoBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    padding: spacing.md,
  },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 16,
    fontWeight: "500",
  },
  quickPromptsWrap: {
    marginBottom: 16,
  },
  quickPromptsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    marginLeft: 4,
  },
  quickPromptsScroll: {
    gap: 8,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowBot: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D31027",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: "#D31027",
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextUser: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  msgTextBot: {
    color: "#1E293B",
  },
  criteriaCard: {
    gap: 8,
  },
  verdictBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  answerHeadline: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
    lineHeight: 21,
  },
  deferralRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 2,
  },
  deferralLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  deferralVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D31027",
  },
  answerSummary: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  keyPointsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  keyPointsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  pointText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
  },
  citationFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  citationText: {
    fontSize: 10,
    color: "#64748B",
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 10,
    marginTop: 6,
  },
  timeTextUser: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
  },
  timeTextBot: {
    color: "#94A3B8",
    textAlign: "right",
  },
  typingText: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#0F172A",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D31027",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
});
