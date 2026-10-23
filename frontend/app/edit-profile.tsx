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
import { LocationSelector } from "@/src/components/LocationSelector";
import { DatePickerField } from "@/src/components/DatePickerField";
import {
  formatDateToDDMMYYYY,
  formatDateToYYYYMMDD,
  isValidDDMMYYYY,
} from "@/src/utils/dateUtils";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const setField = (key: string, val: any) => {
    setF((prev: any) => ({ ...prev, [key]: val }));
    if (errors[key] || (key === "area" && errors.place) || (key === "place" && errors.area)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        if (key === "area") delete next.place;
        if (key === "place") delete next.area;
        return next;
      });
    }
  };

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
            date_of_birth: formatDateToDDMMYYYY(d.date_of_birth),
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
            last_donation_date: formatDateToDDMMYYYY(d.last_donation_date),
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
    const newErrors: Record<string, string> = {};

    if (!f.full_name?.trim()) {
      newErrors.full_name = "Full name is required";
    }
    if (!f.area?.trim() && !f.place?.trim()) {
      newErrors.area = "Constituency is required";
      newErrors.place = "Constituency is required";
    }
    if (!f.district?.trim()) {
      newErrors.district = "District is required";
    }
    if (!f.state?.trim()) {
      newErrors.state = "State is required";
    }
    const cleanPincode = (f.pincode || "").replace(/\D/g, "");
    if (!cleanPincode) {
      newErrors.pincode = "Pincode is required";
    } else if (cleanPincode.length !== 6) {
      newErrors.pincode = "Enter a valid 6-digit postal code";
    }
    if (f.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.email.trim())) {
        newErrors.email = "Enter a valid email address";
      }
    }
    if (f.date_of_birth?.trim()) {
      if (!isValidDDMMYYYY(f.date_of_birth.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(f.date_of_birth.trim())) {
        newErrors.date_of_birth = "Please format as DD-MM-YYYY";
      }
    }
    if (f.last_donation_date?.trim()) {
      if (!isValidDDMMYYYY(f.last_donation_date.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(f.last_donation_date.trim())) {
        newErrors.last_donation_date = "Please format as DD-MM-YYYY";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      toast("error", "Incomplete Form", "Please fill in all highlighted required fields.");
      return;
    }

    f.area = (f.area || f.place || "").trim();
    f.place = (f.place || f.area || "").trim();
    setErrors({});
    setSaving(true);
    try {
      const payload: any = {
        full_name: f.full_name.trim(),
        gender: f.gender,
        date_of_birth: f.date_of_birth?.trim() ? formatDateToYYYYMMDD(f.date_of_birth.trim()) : null,
        blood_group: f.blood_group,
        email: f.email?.trim() || null,
        area: f.area.trim(),
        place: f.place.trim(),
        district: f.district.trim(),
        state: f.state?.trim() || "Puducherry",
        pincode: f.pincode.replace(/\D/g, ""),
        availability: f.availability,
        donation_opt_in: f.donation_opt_in,
        last_donation_date: f.last_donation_date?.trim() ? formatDateToYYYYMMDD(f.last_donation_date.trim()) : null,
      };

      /*
      // [AADHAAR_FEATURE] Uncomment to include updated Aadhaar in payload upon release:
      if (f.new_aadhaar?.trim()) {
        payload.aadhaar = f.new_aadhaar.replace(/\D/g, "");
      }
      */

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
        ref={scrollRef}
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

        {Object.keys(errors).length > 0 && (
          <View style={styles.errorSummaryBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorSummaryTitle}>Please complete required fields</Text>
              <Text style={styles.errorSummaryText}>
                Highlighted fields in red must be completed before saving your profile changes.
              </Text>
            </View>
          </View>
        )}

        {/* SECTION 1: Personal Details */}
        <Text style={styles.sectionHeader}>Personal Information</Text>
        <View style={styles.card}>
          <Input
            testID="edit-fullname-input"
            label="Full Name *"
            value={f.full_name}
            onChangeText={(v) => setField("full_name", v)}
            placeholder="e.g. Barathraj S"
            error={errors.full_name}
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

          <DatePickerField
            testID="edit-dob-input"
            label="Date of Birth (DD-MM-YYYY)"
            value={f.date_of_birth}
            onChange={(ddmmyyyy) => setField("date_of_birth", ddmmyyyy)}
            placeholder="DD-MM-YYYY"
            maxDate={new Date()}
            error={errors.date_of_birth}
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
            error={errors.email}
          />
        </View>

        {/* SECTION 3: Location Details */}
        <Text style={styles.sectionHeader}>Location & Residential Area</Text>
        <View style={styles.card}>
          <LocationSelector
            testIDPrefix="edit-"
            pincode={f.pincode}
            state={f.state}
            district={f.district}
            place={f.place}
            area={f.area}
            errors={{
              pincode: errors.pincode,
              state: errors.state,
              district: errors.district,
              place: errors.place,
              area: errors.area,
            }}
            onChange={(field, value) => setField(field, value)}
          />
        </View>

        {/*
        // =========================================================================
        // [AADHAAR_FEATURE] SECTION 4: Identity & Aadhaar
        // Uncomment below block to re-enable Aadhaar editing upon release
        // =========================================================================
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
        */}

        {/* SECTION 5: Medical & History */}
        <Text style={styles.sectionHeader}>Donation History</Text>
        <View style={styles.card}>
          <DatePickerField
            testID="edit-last-donation-input"
            label="Last Blood Donation Date (DD-MM-YYYY)"
            value={f.last_donation_date}
            onChange={(ddmmyyyy) => setField("last_donation_date", ddmmyyyy)}
            placeholder="DD-MM-YYYY"
            allowClear
            onClear={() => setField("last_donation_date", "")}
            maxDate={new Date()}
            error={errors.last_donation_date}
          />
          <Text style={styles.hintText}>
            ℹ️ KK Life Drop enforces a mandatory rest cooldown between donations (90 days for males / 120 days for females) to safeguard donor health.
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
  errorSummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
  },
  errorSummaryText: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
    lineHeight: 16,
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
