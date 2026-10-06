import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { safeBack } from "@/src/navigation";
import { Button } from "@/src/Button";
import { Input } from "@/src/Input";
import { toast } from "@/src/Toast";
import { BloodGroupBadge } from "@/src/components/BloodGroupBadge";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [f, setF] = useState<any>({
    full_name: "",
    gender: "Male",
    date_of_birth: "",
    blood_group: "B+",
    email: "",
    mobile: "",
    area: "",
    place: "",
    district: "",
    state: "Puducherry",
    pincode: "",
    masked_aadhaar: "",
    new_aadhaar: "",
    last_donation_date: "",
    availability: "Available",
    donation_opt_in: true,
  });

  const setField = (key: string, val: any) =>
    setF((prev: any) => ({ ...prev, [key]: val }));

  useEffect(() => {
    async function loadCurrentProfile() {
      try {
        setFetching(true);
        const res: any = await api("/donors/me", { auth: true });
        if (res?.donor) {
          const d = res.donor;
          setF({
            full_name: d.full_name || "",
            gender: d.gender || "Male",
            date_of_birth: d.date_of_birth || "",
            blood_group: d.blood_group || "B+",
            email: d.email || "",
            mobile: d.mobile || "",
            area: d.area || "",
            place: d.place || "",
            district: d.district || "",
            state: d.state || "Puducherry",
            pincode: d.pincode || "",
            masked_aadhaar: d.masked_aadhaar || "XXXX XXXX ****",
            new_aadhaar: "",
            last_donation_date: d.last_donation_date || "",
            availability: d.availability || "Available",
            donation_opt_in: d.donation_opt_in ?? true,
          });
        }
      } catch (err: any) {
        toast("error", "Failed to Load Profile", err.message || "Could not retrieve donor details.");
      } finally {
        setFetching(false);
      }
    }
    loadCurrentProfile();
  }, []);

  async function handleSave() {
    // 1. Validations
    if (!f.full_name?.trim()) {
      return toast("error", "Name Required", "Please enter your full name.");
    }
    if (!f.area?.trim()) {
      return toast("error", "Area Required", "Please enter your residential area.");
    }
    if (!f.place?.trim()) {
      return toast("error", "Place Required", "Please enter your city/place.");
    }
    if (!f.district?.trim()) {
      return toast("error", "District Required", "Please enter your district.");
    }
    if (!f.pincode?.trim() || f.pincode.replace(/\D/g, "").length !== 6) {
      return toast("error", "Invalid Pincode", "Please enter a valid 6-digit postal code.");
    }
    if (f.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.email.trim())) {
        return toast("error", "Invalid Email", "Please enter a valid email address.");
      }
    }
    if (f.new_aadhaar?.trim()) {
      const cleanAadhaar = f.new_aadhaar.replace(/\D/g, "");
      if (cleanAadhaar.length !== 12) {
        return toast("error", "Invalid Aadhaar", "Aadhaar must be exactly 12 digits.");
      }
    }
    if (f.date_of_birth?.trim()) {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(f.date_of_birth.trim())) {
        return toast("error", "Invalid Date of Birth", "Please format as YYYY-MM-DD.");
      }
    }
    if (f.last_donation_date?.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(f.last_donation_date.trim())) {
        return toast("error", "Invalid Donation Date", "Please format as YYYY-MM-DD.");
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        full_name: f.full_name.trim(),
        gender: f.gender,
        date_of_birth: f.date_of_birth?.trim() || null,
        blood_group: f.blood_group,
        email: f.email?.trim() || null,
        area: f.area.trim(),
        place: f.place.trim(),
        district: f.district.trim(),
        state: f.state?.trim() || "Puducherry",
        pincode: f.pincode.replace(/\D/g, ""),
        availability: f.availability,
        donation_opt_in: f.donation_opt_in,
        last_donation_date: f.last_donation_date?.trim() || null,
      };

      if (f.new_aadhaar?.trim()) {
        payload.aadhaar = f.new_aadhaar.replace(/\D/g, "");
      }

      await api("/donors/me", {
        auth: true,
        method: "PATCH",
        body: payload,
      });

      toast("success", "Profile Updated", "Your changes have been saved successfully.");
      safeBack("/(tabs)/profile");
    } catch (err: any) {
      toast("error", "Update Failed", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (fetching) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={styles.loadingText}>Loading profile details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => safeBack("/(tabs)/profile")}
          style={styles.backBtn}
          testID="edit-profile-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={styles.headerSaveBtn}
          testID="edit-profile-save-header-btn"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <Text style={styles.headerSaveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Status Banner */}
        <View style={styles.verifiedBanner}>
          <View style={styles.verifiedIconWrap}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifiedTitle}>Verified Mobile Session</Text>
            <Text style={styles.verifiedSubtitle}>
              +91 {f.mobile ? f.mobile : "Verified Mobile Number"}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>Active</Text>
          </View>
        </View>

        {/* SECTION 1: Personal Details */}
        <Text style={styles.sectionHeader}>Personal Information</Text>
        <View style={styles.card}>
          <Input
            testID="edit-fullname-input"
            label="Full Name *"
            value={f.full_name}
            onChangeText={(v) => setField("full_name", v)}
            placeholder="e.g. Barathraj S"
          />

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <Pressable
                key={g}
                testID={`edit-gender-${g}`}
                onPress={() => setField("gender", g)}
                style={[
                  styles.genderChip,
                  f.gender === g && styles.genderChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.genderChipText,
                    f.gender === g && styles.genderChipTextActive,
                  ]}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            testID="edit-dob-input"
            label="Date of Birth (YYYY-MM-DD)"
            value={f.date_of_birth}
            onChangeText={(v) => setField("date_of_birth", v)}
            placeholder="e.g. 1996-05-18"
          />

          <Text style={styles.fieldLabel}>Blood Group *</Text>
          <Text style={styles.fieldSubLabel}>
            Select your confirmed biological blood group:
          </Text>
          <View style={styles.bgGrid}>
            {BLOOD_GROUPS.map((bg) => (
              <Pressable
                key={bg}
                testID={`edit-bg-${bg}`}
                onPress={() => setField("blood_group", bg)}
                style={[
                  styles.bgCell,
                  f.blood_group === bg && styles.bgCellActive,
                ]}
              >
                <BloodGroupBadge group={bg} size="sm" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* SECTION 2: Contact Details */}
        <Text style={styles.sectionHeader}>Contact Information</Text>
        <View style={styles.card}>
          <Input
            testID="edit-email-input"
            label="Email Address"
            value={f.email}
            onChangeText={(v) => setField("email", v)}
            placeholder="e.g. donor@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* SECTION 3: Location Details */}
        <Text style={styles.sectionHeader}>Location & Residential Area</Text>
        <View style={styles.card}>
          <Input
            testID="edit-area-input"
            label="Area / Locality *"
            value={f.area}
            onChangeText={(v) => setField("area", v)}
            placeholder="e.g. Kennadiyar Street / Nehru Nagar"
          />
          <Input
            testID="edit-place-input"
            label="Place / City *"
            value={f.place}
            onChangeText={(v) => setField("place", v)}
            placeholder="e.g. Karaikal"
          />
          <Input
            testID="edit-district-input"
            label="District *"
            value={f.district}
            onChangeText={(v) => setField("district", v)}
            placeholder="e.g. Karaikal / Nagapattinam"
          />
          <Input
            testID="edit-state-input"
            label="State / Union Territory"
            value={f.state}
            onChangeText={(v) => setField("state", v)}
            placeholder="e.g. Puducherry"
          />
          <Input
            testID="edit-pincode-input"
            label="Pincode (6 digits) *"
            value={f.pincode}
            onChangeText={(v) => setField("pincode", v.replace(/\D/g, "").slice(0, 6))}
            placeholder="609602"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {/* SECTION 4: Identity & Aadhaar */}
        <Text style={styles.sectionHeader}>Identification</Text>
        <View style={styles.card}>
          <View style={styles.aadhaarStatusRow}>
            <Ionicons name="card-outline" size={20} color="#0284C7" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.aadhaarStatusTitle}>Registered Aadhaar Number</Text>
              <Text style={styles.aadhaarStatusValue}>{f.masked_aadhaar}</Text>
            </View>
          </View>

          <Input
            testID="edit-aadhaar-input"
            label="Update Aadhaar (Optional - Enter 12 digits to re-encrypt)"
            value={f.new_aadhaar}
            onChangeText={(v) => setField("new_aadhaar", v.replace(/\D/g, "").slice(0, 12))}
            placeholder="Enter 12 digits only if updating"
            keyboardType="number-pad"
            maxLength={12}
            secureTextEntry
          />
          <Text style={styles.hintText}>
            🔒 Aadhaar numbers are protected with 256-bit encryption. Leave blank to keep current number.
          </Text>
        </View>

        {/* SECTION 5: Medical & History */}
        <Text style={styles.sectionHeader}>Donation History</Text>
        <View style={styles.card}>
          <Input
            testID="edit-last-donation-input"
            label="Last Blood Donation Date (YYYY-MM-DD)"
            value={f.last_donation_date}
            onChangeText={(v) => setField("last_donation_date", v)}
            placeholder="e.g. 2026-06-15"
          />
          {f.last_donation_date ? (
            <Pressable
              onPress={() => setField("last_donation_date", "")}
              style={styles.clearDateBtn}
            >
              <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
              <Text style={styles.clearDateText}>Clear Last Donation Date</Text>
            </Pressable>
          ) : null}
          <Text style={styles.hintText}>
            ℹ️ KK Life Drop enforces a mandatory 90-day rest cooldown between donations to safeguard donor health.
          </Text>
        </View>

        {/* SECTION 6: Availability & Preferences */}
        <Text style={styles.sectionHeader}>Preferences & Availability</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.toggleTitle}>Available for Blood Donation</Text>
              <Text style={styles.toggleDesc}>
                {f.availability === "Available"
                  ? "🟢 Visible to emergency coordinators & hospitals"
                  : "🔴 Hidden from donor searches"}
              </Text>
            </View>
            <Switch
              testID="edit-availability-switch"
              value={f.availability === "Available"}
              onValueChange={(val) =>
                setField("availability", val ? "Available" : "Not Available")
              }
              trackColor={{ true: colors.brandPrimary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.toggleTitle}>Receive Emergency Blood Alerts</Text>
              <Text style={styles.toggleDesc}>
                Receive lock-screen push notifications when matching emergency requests arise.
              </Text>
            </View>
            <Switch
              testID="edit-optin-switch"
              value={!!f.donation_opt_in}
              onValueChange={(val) => setField("donation_opt_in", val)}
              trackColor={{ true: colors.brandPrimary }}
            />
          </View>
        </View>

        {/* Save Changes Button */}
        <View style={{ marginTop: spacing.xl }}>
          <Button
            testID="edit-profile-submit-btn"
            label="Save Profile Changes"
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "600",
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: "#FEE2E2",
  },
  headerSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
    gap: 10,
  },
  verifiedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
  },
  verifiedSubtitle: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "500",
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brandPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  fieldSubLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.sm,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  genderChipTextActive: {
    color: "#1D4ED8",
    fontWeight: "800",
  },
  bgGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  bgCell: {
    width: "22%",
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  bgCellActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
    borderWidth: 2,
  },
  aadhaarStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
  },
  aadhaarStatusTitle: {
    fontSize: 11,
    color: "#0369A1",
    fontWeight: "600",
  },
  aadhaarStatusValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0C4A6E",
    letterSpacing: 1,
    marginTop: 1,
  },
  hintText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 16,
  },
  clearDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 6,
  },
  clearDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
});
