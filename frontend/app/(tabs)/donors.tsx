import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

const GROUPS = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Donors() {
  const insets = useSafeAreaInsets();
  const [bg, setBg] = useState("All");
  const [search, setSearch] = useState("");
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (bg !== "All") q.append("blood_group", bg);
      if (search) q.append("search", search);
      const r: any = await api(`/donors?${q}`);
      setDonors(r.donors || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [bg]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Find Donors</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            testID="donor-search"
            placeholder="Name, area or place"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
          />
          {search ? (
            <Pressable onPress={() => { setSearch(""); setTimeout(load, 50); }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {GROUPS.map((g) => (
            <Pressable key={g} testID={`chip-${g}`} onPress={() => setBg(g)} style={[styles.chip, bg === g && styles.chipActive]}>
              <Text style={[styles.chipText, bg === g && styles.chipTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={donors}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "Loading…" : "No donors found."}</Text>}
        renderItem={({ item: d }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: "/donor-contact", params: { id: d.id } })} testID={`donor-card-${d.id}`}>
            <BloodGroupBadge group={d.blood_group} size="lg" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.name}>{d.full_name}</Text>
              <Text style={styles.meta}>
                <Ionicons name="location-outline" size={12} color={colors.muted} /> {d.area}, {d.place}
              </Text>
              <Text style={styles.meta}>District: {d.district}</Text>
              {d.last_donation_date ? <Text style={styles.lastDonation}>Last donation: {d.last_donation_date}</Text> : null}
              <View style={styles.cardFooter}>
                <View style={[styles.pill, { backgroundColor: d.availability === "Available" ? "#E6F4EA" : colors.surfaceTertiary }]}>
                  <View style={[styles.dot, { backgroundColor: d.availability === "Available" ? colors.success : colors.muted }]} />
                  <Text style={[styles.pillText, { color: d.availability === "Available" ? colors.success : colors.muted }]}>{d.availability}</Text>
                </View>
                <View style={styles.contactBtn}><Text style={styles.contactText}>Contact</Text></View>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5, marginBottom: spacing.md },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceTertiary, paddingHorizontal: 12, borderRadius: radius.md, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.onSurface, fontSize: 14 },
  chipsRow: { gap: 8, paddingVertical: spacing.md },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  card: { flexDirection: "row", padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginTop: 10 },
  name: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  lastDonation: { fontSize: 11, color: colors.muted, marginTop: 2, fontStyle: "italic" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "700" },
  contactBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  contactText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
