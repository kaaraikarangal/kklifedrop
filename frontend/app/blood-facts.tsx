import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Share,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { toast } from "@/src/Toast";
import {
  BLOOD_FREQUENCY_DATA,
  BLOOD_FACT_CATEGORIES,
  DID_YOU_KNOW_HIGHLIGHTS,
  FactCategory,
} from "@/src/data/bloodFactsData";

export default function BloodFactsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFrequency, setExpandedFrequency] = useState<string | null>("O+");

  const filterCategories = useMemo(() => {
    return [{ id: "all", shortTitle: "All Facts", icon: "sparkles" }, ...BLOOD_FACT_CATEGORIES];
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BLOOD_FACT_CATEGORIES.filter((cat) => {
      if (selectedCategory !== "all" && cat.id !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const matchesTitle = cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
      const matchesFacts = cat.facts.some((f) => f.toLowerCase().includes(q));
      return matchesTitle || matchesFacts;
    }).map((cat) => {
      if (!q) return cat;
      const filteredFacts = cat.facts.filter((f) => f.toLowerCase().includes(q));
      return {
        ...cat,
        facts: filteredFacts.length > 0 ? filteredFacts : cat.facts,
      };
    });
  }, [selectedCategory, searchQuery]);

  const handleShare = async (title: string, content: string) => {
    try {
      const shareText = `🩸 ${title} - KK Life Drop Blood Facts:\n\n${content}\n\nJoin voluntary blood donors in Karaikal & Puducherry: KK Life Drop`;
      if (Platform.OS === "web") {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          toast("success", "Copied to Clipboard", "Fact copied! You can paste and share it anywhere.");
        } else {
          toast("info", "Blood Fact", content);
        }
      } else {
        await Share.share({ message: shareText });
      }
    } catch {
      toast("info", "Blood Fact", content);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          testID="blood-facts-back-btn"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Blood Donation Facts</Text>
          <Text style={styles.headerSub}>Essential Medical & Donor Knowledge Hub</Text>
        </View>
        <Pressable
          style={styles.aiHelpBtn}
          onPress={() => router.push("/donor-criteria-chat")}
          testID="blood-facts-criteria-chat-btn"
          accessibilityLabel="Ask Criteria AI"
        >
          <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["#0F172A", "#1E293B", "#0F172A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroBadge}>
              <Ionicons name="medical" size={13} color="#38BDF8" />
              <Text style={styles.heroBadgeText}>NBTC & WHO CLINICAL INSIGHTS</Text>
            </View>
            <Text style={styles.heroTitle}>Facts That Save Lives</Text>
            <Text style={styles.heroDesc}>
              Discover blood group frequencies, components, donor impact, and clinical uses to inspire voluntary donations across Karaikal & Puducherry.
            </Text>

            {/* Quick Stats Pill Row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>1 in 3</Text>
                <Text style={styles.heroStatLabel}>O+ & A+ Ratio</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>3 Lives</Text>
                <Text style={styles.heroStatLabel}>Per 1 Unit</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>5 Days</Text>
                <Text style={styles.heroStatLabel}>Platelet Shelf Life</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* SEARCH BOX */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search facts (e.g. rare, platelets, needle, frequency)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="blood-facts-search-input"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* CATEGORY CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {filterCategories.map((c) => {
            const active = selectedCategory === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCategory(c.id)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                testID={`category-filter-${c.id}`}
              >
                <Ionicons
                  name={c.icon as any}
                  size={14}
                  color={active ? "#FFFFFF" : "#475569"}
                />
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {c.shortTitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* SECTION: FREQUENCY OF BLOOD TYPES TABLE */}
        {(selectedCategory === "all" || selectedCategory === "frequency") && !searchQuery ? (
          <View style={styles.frequencySection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="stats-chart" size={16} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeaderTitle}>Frequency of Blood Types</Text>
                <Text style={styles.sectionHeaderSub}>Demographic prevalence & compatibility matrix</Text>
              </View>
              <View style={styles.frequencyBadge}>
                <Text style={styles.frequencyBadgeText}>8 GROUPS</Text>
              </View>
            </View>

            {/* Matrix Table matching Friends2Support */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeadRow}>
                <Text style={[styles.tableHeadCol, { flex: 1.1 }]}>BLOOD TYPE</Text>
                <Text style={[styles.tableHeadCol, { flex: 1.4 }]}>FREQUENCY RATIO</Text>
                <Text style={[styles.tableHeadCol, { flex: 0.9, textAlign: "right" }]}>SHARE</Text>
              </View>

              {BLOOD_FREQUENCY_DATA.map((item, idx) => {
                const isSelected = expandedFrequency === item.type;
                const isLast = idx === BLOOD_FREQUENCY_DATA.length - 1;
                return (
                  <View key={item.type}>
                    <Pressable
                      style={[
                        styles.tableRow,
                        idx % 2 === 1 && styles.tableRowAlt,
                        isSelected && styles.tableRowSelected,
                        !isLast && styles.tableRowBorder,
                      ]}
                      onPress={() => setExpandedFrequency(isSelected ? null : item.type)}
                      testID={`freq-row-${item.type}`}
                    >
                      <View style={[styles.tableCol, { flex: 1.1, flexDirection: "row", alignItems: "center" }]}>
                        <View style={[styles.bloodPill, { backgroundColor: item.color }]}>
                          <Text style={styles.bloodPillText}>{item.type}</Text>
                        </View>
                        <Text style={styles.bloodTypeText}>{item.type}</Text>
                      </View>

                      <View style={[styles.tableCol, { flex: 1.4 }]}>
                        <Text style={styles.ratioText}>{item.ratio}</Text>
                      </View>

                      <View style={[styles.tableCol, { flex: 0.9, alignItems: "flex-end" }]}>
                        <View style={styles.rarityWrap}>
                          <Text style={styles.percentageText}>{item.percentage}</Text>
                          <Ionicons
                            name={isSelected ? "chevron-up" : "chevron-down"}
                            size={14}
                            color="#94A3B8"
                            style={{ marginLeft: 4 }}
                          />
                        </View>
                      </View>
                    </Pressable>

                    {/* EXPANDABLE COMPATIBILITY DETAILS */}
                    {isSelected ? (
                      <View style={styles.compatibilityDrawer}>
                        <View style={styles.drawerRow}>
                          <Text style={styles.drawerLabel}>Rarity Level:</Text>
                          <View style={[styles.rarityPill, { backgroundColor: item.color + "1A" }]}>
                            <Text style={[styles.rarityPillText, { color: item.color }]}>
                              {item.rarity}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.drawerRow}>
                          <Text style={styles.drawerLabel}>Can Transfuse To (Red Cells):</Text>
                          <Text style={styles.drawerValue}>{item.canGiveTo}</Text>
                        </View>
                        <View style={styles.drawerRow}>
                          <Text style={styles.drawerLabel}>Can Receive Red Cells From:</Text>
                          <Text style={styles.drawerValue}>{item.canReceiveFrom}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.tableNoteCard}>
              <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
              <Text style={styles.tableNoteText}>
                Tap any row above to inspect red cell transfusion compatibility and recipient matches.
              </Text>
            </View>
          </View>
        ) : null}

        {/* FACT CATEGORIES */}
        <View style={styles.categoriesList}>
          {filteredCategories.map((category) => {
            return (
              <View key={category.id} style={styles.categoryCard} testID={`fact-category-${category.id}`}>
                {/* Category Header */}
                <View style={styles.catCardHeader}>
                  <View style={[styles.catIconWrap, { backgroundColor: category.color + "18" }]}>
                    <Ionicons name={category.icon as any} size={18} color={category.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.catTitleRow}>
                      <Text style={styles.catTitle}>{category.title}</Text>
                      {category.badge ? (
                        <View style={[styles.catBadge, { backgroundColor: category.color + "15" }]}>
                          <Text style={[styles.catBadgeText, { color: category.color }]}>
                            {category.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.catDesc}>{category.description}</Text>
                  </View>
                </View>

                {/* Bullets List */}
                <View style={styles.bulletList}>
                  {category.facts.map((fact, fIdx) => (
                    <View key={fIdx} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: category.color }]} />
                      <Text style={styles.bulletText}>{fact}</Text>
                    </View>
                  ))}
                </View>

                {/* Card Action Footer */}
                <View style={styles.catCardFooter}>
                  <Pressable
                    style={styles.shareFactBtn}
                    onPress={() => handleShare(category.title, category.facts.join("\n\n• "))}
                    testID={`share-fact-${category.id}`}
                  >
                    <Ionicons name="share-social-outline" size={14} color="#0284C7" />
                    <Text style={styles.shareFactText}>Share Facts</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {filteredCategories.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Facts Found</Text>
              <Text style={styles.emptySub}>Try searching for other terms like 'platelets', 'rarity', or 'needs'</Text>
              <Pressable style={styles.resetSearchBtn} onPress={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                <Text style={styles.resetSearchText}>Clear Search Filters</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* INSPIRATION PROMPT BANNER */}
        <View style={styles.bottomCtaCard}>
          <LinearGradient
            colors={["#DC2626", "#991B1B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bottomCtaGradient}
          >
            <View style={styles.bottomCtaIconWrap}>
              <Ionicons name="heart" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.bottomCtaTitle}>Ready to Make a Difference?</Text>
            <Text style={styles.bottomCtaDesc}>
              A single whole-blood donation takes only 10 minutes and saves up to three lives in Karaikal hospitals.
            </Text>
            <View style={styles.bottomCtaRow}>
              <Pressable
                style={styles.bottomCtaBtn}
                onPress={() => router.push("/(tabs)/profile")}
                testID="blood-facts-profile-cta"
              >
                <Ionicons name="water" size={16} color="#DC2626" />
                <Text style={styles.bottomCtaBtnText}>Check My Donor Status</Text>
              </Pressable>
              <Pressable
                style={styles.bottomCtaBtnOutline}
                onPress={() => router.push("/donor-criteria-chat")}
                testID="blood-facts-chat-cta"
              >
                <Ionicons name="help-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.bottomCtaBtnOutlineText}>Ask Criteria AI</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  aiHelpBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandPrimary,
    marginLeft: 6,
  },
  heroWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  heroGradient: {
    padding: spacing.lg,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 8,
    gap: 6,
  },
  heroBadgeText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 19,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  clearSearchBtn: {
    padding: 4,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  frequencySection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  frequencyBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  frequencyBadgeText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "800",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tableHeadRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableHeadCol: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  tableRowSelected: {
    backgroundColor: "#F8FAFC",
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableCol: {
    justifyContent: "center",
  },
  bloodPill: {
    width: 28,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  bloodPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  bloodTypeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratioText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  rarityWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  compatibilityDrawer: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 6,
  },
  drawerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
  },
  drawerValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    textAlign: "right",
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  tableNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 8,
    gap: 8,
  },
  tableNoteText: {
    fontSize: 11,
    color: "#0369A1",
    fontWeight: "500",
    flex: 1,
  },
  categoriesList: {
    marginHorizontal: spacing.md,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  catCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  catTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  catDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  bulletList: {
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  catCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  shareFactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "#F0F9FF",
  },
  shareFactText: {
    fontSize: 11,
    color: "#0284C7",
    fontWeight: "700",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  resetSearchBtn: {
    marginTop: 14,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  resetSearchText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomCtaCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  bottomCtaGradient: {
    padding: spacing.lg,
    alignItems: "center",
  },
  bottomCtaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  bottomCtaTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  bottomCtaDesc: {
    fontSize: 13,
    color: "#FEE2E2",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  bottomCtaRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  bottomCtaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  bottomCtaBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },
  bottomCtaBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  bottomCtaBtnOutlineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
