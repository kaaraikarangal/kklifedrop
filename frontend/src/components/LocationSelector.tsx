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
  getConstituencies,
  matchConstituencyFromPlaces,
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

  // Active constituency is stored across place & area for backward compatibility
  const selectedConstituency = place || area || "";

  // Combine official Voter Constituencies with any postal localities
  const availableConstituencies = React.useMemo(() => {
    const list: string[] = [];
    if (district) {
      const fromDist = getConstituencies(district, state);
      list.push(...fromDist);
    }
    if (postalInfo?.places?.length) {
      postalInfo.places.forEach((p) => {
        if (!list.includes(p)) list.push(p);
      });
    }
    return list;
  }, [district, state, postalInfo]);

  // Handle Pincode Lookup & Automatic population while typing
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

        // 1. Auto-fill State & District
        if (res.state) onChange("state", res.state);
        if (res.district) onChange("district", res.district);

        // 2. Auto-fill primary Constituency / Place
        const matched = matchConstituencyFromPlaces(
          res.places,
          res.district,
          res.state
        );
        const autoPlace = matched || (res.places.length > 0 ? res.places[0] : "");
        if (autoPlace) {
          onChange("place", autoPlace);
          onChange("area", autoPlace);
        }

        setPostalMessage(
          `✓ Auto-filled: ${res.district}, ${res.state}${autoPlace ? ` • ${autoPlace}` : ""}`
        );
      } else {
        setPostalInfo(null);
        setApiFailed(true);
        setPostalMessage("Pincode not found on India Post. Please enter details manually.");
      }
    } catch {
      setApiFailed(true);
      setPostalMessage("Pincode lookup offline. Please enter state & district manually.");
    } finally {
      setLookingUp(false);
    }
  }

  // Trigger lookup automatically while typing when pincode reaches 6 digits
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
    const newDistricts = getDistricts(selectedState);
    if (district && !newDistricts.includes(district)) {
      const nextDist = newDistricts[0] || "";
      onChange("district", nextDist);
      const consts = getConstituencies(nextDist, selectedState);
      if (consts.length > 0) {
        onChange("place", consts[0]);
        onChange("area", consts[0]);
      }
    }
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    onChange("district", selectedDistrict);
    const consts = getConstituencies(selectedDistrict, state);
    if (consts.length > 0 && !selectedConstituency) {
      onChange("place", consts[0]);
      onChange("area", consts[0]);
    }
  };

  const handleConstituencySelect = (selected: string) => {
    onChange("place", selected);
    onChange("area", selected);
  };

  return (
    <View style={styles.container}>
      {/* 1. PINCODE (Instant Free Postal API Integration with Auto-fill while typing) */}
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
            lookingUp
              ? styles.lookupBtnActive
              : pincode.length === 6 && !apiFailed
              ? styles.lookupBtnSuccess
              : styles.lookupBtnDisabled,
          ]}
          disabled={pincode.length !== 6 || lookingUp}
          onPress={() => triggerPincodeLookup(pincode)}
        >
          {lookingUp ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : pincode.length === 6 && !apiFailed ? (
            <>
              <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
              <Text style={styles.lookupBtnText}>Auto-filled</Text>
            </>
          ) : (
            <>
              <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
              <Text style={styles.lookupBtnText}>Auto-fill</Text>
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

      {/* 4. VOTER / ASSEMBLY CONSTITUENCY (Replaces separate Area & Place fields) */}
      <SearchableSelectModal
        testID={`${testIDPrefix}constituency-select`}
        label="Voter / Assembly Constituency *"
        value={selectedConstituency}
        options={availableConstituencies}
        placeholder={
          district ? "Select or enter Voter Constituency" : "Select District first"
        }
        allowCustom={true}
        onSelect={handleConstituencySelect}
        error={errors.place || errors.area}
        emptyNotice="Type custom constituency or area name below:"
      />

      {/* Quick constituency chips for 1-tap selection */}
      {availableConstituencies.length > 0 && !selectedConstituency ? (
        <View style={styles.quickChipsWrap}>
          <Text style={styles.quickChipsLabel}>
            Constituencies in {district || "area"}:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {availableConstituencies.slice(0, 8).map((c) => (
              <Pressable
                key={c}
                onPress={() => handleConstituencySelect(c)}
                style={styles.chip}
                testID={`${testIDPrefix}constituency-chip-${c.replace(/\s+/g, "-")}`}
              >
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
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
    paddingHorizontal: 12,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  lookupBtnActive: {
    backgroundColor: colors.brandPrimary,
  },
  lookupBtnSuccess: {
    backgroundColor: colors.success,
  },
  lookupBtnDisabled: {
    opacity: 0.45,
    backgroundColor: colors.muted,
  },
  lookupBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
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
