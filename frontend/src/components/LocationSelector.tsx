import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { Input } from "@/src/Input";
import { SearchableSelectModal } from "./SearchableSelectModal";
import {
  lookupPincode,
  getStates,
  getDistricts,
  getSuggestedPlaces,
  PincodeLookupResult,
} from "@/src/location";

interface LocationSelectorProps {
  pincode: string;
  state: string;
  district: string;
  place: string;
  area: string;
  onChange: (
    field: "pincode" | "state" | "district" | "place" | "area",
    value: string
  ) => void;
  errors?: Partial<Record<"pincode" | "state" | "district" | "place" | "area", string>>;
  testIDPrefix?: string;
}

export function LocationSelector({
  pincode,
  state,
  district,
  place,
  area,
  onChange,
  errors = {},
  testIDPrefix = "",
}: LocationSelectorProps) {
  const [lookingUp, setLookingUp] = useState(false);
  const [postalInfo, setPostalInfo] = useState<PincodeLookupResult | null>(null);
  const [postalMessage, setPostalMessage] = useState<string | null>(null);
  const [apiFailed, setApiFailed] = useState(false);
  const lastLookupPin = useRef<string>("");

  const allStates = getStates();
  const availableDistricts = state ? getDistricts(state) : [];

  // Combine places from postal API + local district data
  const combinedPlaces = React.useMemo(() => {
    const list: string[] = [];
    if (postalInfo?.places?.length) {
      list.push(...postalInfo.places);
    }
    if (district) {
      const local = getSuggestedPlaces(district, state);
      local.forEach((p) => {
        if (!list.includes(p)) list.push(p);
      });
    }
    return list;
  }, [postalInfo, district, state]);

  // Combine areas from postal API
  const combinedAreas = React.useMemo(() => {
    const list: string[] = [];
    if (postalInfo?.places?.length) {
      list.push(...postalInfo.places);
    }
    return list;
  }, [postalInfo]);

  // Handle Pincode Lookup
  async function triggerPincodeLookup(cleanPin: string) {
    if (cleanPin.length !== 6 || cleanPin === lastLookupPin.current) return;
    lastLookupPin.current = cleanPin;
    setLookingUp(true);
    setApiFailed(false);
    setPostalMessage(null);

    try {
      const res = await lookupPincode(cleanPin);
      if (res) {
        setPostalInfo(res);
        setPostalMessage(
          `✓ India Post: ${res.district}, ${res.state} (${res.places.length} localities)`
        );

        // Auto-fill State & District
        if (res.state) onChange("state", res.state);
        if (res.district) onChange("district", res.district);

        // If place is empty and postal API returned places, pre-fill the first one if only 1, or suggest
        if (!place && res.places.length === 1) {
          onChange("place", res.places[0]);
        }
      } else {
        setPostalInfo(null);
        setApiFailed(true);
        setPostalMessage("Pincode not found on India Post. Please verify or select manually.");
      }
    } catch {
      setApiFailed(true);
      setPostalMessage("Pincode lookup offline. Please enter state & district manually.");
    } finally {
      setLookingUp(false);
    }
  }

  // Trigger lookup automatically when pincode reaches 6 digits
  useEffect(() => {
    const clean = (pincode || "").replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6 && clean !== lastLookupPin.current) {
      triggerPincodeLookup(clean);
    } else if (clean.length < 6) {
      lastLookupPin.current = "";
      setPostalMessage(null);
    }
  }, [pincode]);

  const handleStateSelect = (selectedState: string) => {
    onChange("state", selectedState);
    // If current district is not in the new state, reset it
    const newDistricts = getDistricts(selectedState);
    if (district && !newDistricts.includes(district)) {
      onChange("district", newDistricts[0] || "");
    }
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    onChange("district", selectedDistrict);
  };

  return (
    <View style={styles.container}>
      {/* 1. PINCODE (Free Postal API Integration) */}
      <View style={styles.pincodeRow}>
        <View style={{ flex: 1 }}>
          <Input
            testID={`${testIDPrefix}pincode-input`}
            label="Pincode (6 Digits) *"
            value={pincode}
            onChangeText={(v) => {
              const cleaned = v.replace(/\D/g, "").slice(0, 6);
              onChange("pincode", cleaned);
            }}
            placeholder="e.g. 609602"
            keyboardType="number-pad"
            maxLength={6}
            error={errors.pincode}
          />
        </View>

        <Pressable
          style={[
            styles.lookupBtn,
            pincode.length !== 6 && styles.lookupBtnDisabled,
          ]}
          disabled={pincode.length !== 6 || lookingUp}
          onPress={() => triggerPincodeLookup(pincode)}
        >
          {lookingUp ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={14} color="#FFFFFF" />
              <Text style={styles.lookupBtnText}>Auto-Fill</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Postal API status indicator badge */}
      {postalMessage ? (
        <View
          style={[
            styles.statusBadge,
            apiFailed ? styles.statusBadgeError : styles.statusBadgeSuccess,
          ]}
        >
          <Ionicons
            name={apiFailed ? "information-circle" : "checkmark-circle"}
            size={16}
            color={apiFailed ? colors.warning : colors.success}
          />
          <Text
            style={[
              styles.statusText,
              apiFailed ? styles.statusTextError : styles.statusTextSuccess,
            ]}
          >
            {postalMessage}
          </Text>
        </View>
      ) : null}

      {/* 2. STATE DROPDOWN */}
      <SearchableSelectModal
        testID={`${testIDPrefix}state-select`}
        label="State / Union Territory *"
        value={state}
        options={allStates}
        placeholder="Select State / UT"
        onSelect={handleStateSelect}
        error={errors.state}
      />

      {/* 3. DISTRICT DROPDOWN */}
      <SearchableSelectModal
        testID={`${testIDPrefix}district-select`}
        label="District *"
        value={district}
        options={availableDistricts}
        placeholder={state ? "Select District" : "Select State first"}
        disabled={!state || availableDistricts.length === 0}
        onSelect={handleDistrictSelect}
        error={errors.district}
      />

      {/* 4. PLACE / CITY (Dropdown + Custom Entry) */}
      <SearchableSelectModal
        testID={`${testIDPrefix}place-select`}
        label="Place / City / Town *"
        value={place}
        options={combinedPlaces}
        placeholder="Select or enter Place / City"
        allowCustom={true}
        onSelect={(val) => onChange("place", val)}
        error={errors.place}
        emptyNotice="No saved places. Type custom city name below:"
      />

      {/* Quick locality chips for 1-tap selection if available */}
      {combinedPlaces.length > 0 && !place ? (
        <View style={styles.quickChipsWrap}>
          <Text style={styles.quickChipsLabel}>Suggested for {district || "area"}:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {combinedPlaces.slice(0, 8).map((p) => (
              <Pressable
                key={p}
                onPress={() => onChange("place", p)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 5. AREA / LOCALITY */}
      {combinedAreas.length > 0 ? (
        <SearchableSelectModal
          testID={`${testIDPrefix}area-select`}
          label="Area / Locality / Street *"
          value={area}
          options={combinedAreas}
          placeholder="Select or enter Area / Street"
          allowCustom={true}
          onSelect={(val) => onChange("area", val)}
          error={errors.area}
          emptyNotice="Type custom street or colony name below:"
        />
      ) : (
        <Input
          testID={`${testIDPrefix}area-input`}
          label="Area / Locality / Street *"
          value={area}
          onChangeText={(v) => onChange("area", v)}
          placeholder="e.g. Kennadiyar Street / Nehru Nagar"
          error={errors.area}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  pincodeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  lookupBtn: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  lookupBtnDisabled: {
    opacity: 0.45,
    backgroundColor: colors.muted,
  },
  lookupBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    marginTop: -4,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.brandTertiaryLight || "#ECFDF5",
  },
  statusBadgeError: {
    backgroundColor: "#FFFBEB",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextError: {
    color: colors.warning,
  },
  quickChipsWrap: {
    marginBottom: spacing.md,
    marginTop: -4,
  },
  quickChipsLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsScroll: {
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
    fontWeight: "600",
  },
});
