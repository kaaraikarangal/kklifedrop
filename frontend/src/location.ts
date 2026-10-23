import {
  ALL_STATES,
  DISTRICTS_BY_STATE,
  LOCAL_PLACES_BY_DISTRICT,
  normalizeDistrictName,
  normalizeStateName,
} from "./data/indiaLocations";

export interface PincodeLookupResult {
  pincode: string;
  state: string;
  district: string;
  places: string[];
  postOffices: Array<{
    name: string;
    branchType?: string;
    district: string;
    state: string;
  }>;
}

// In-memory cache for fast repeated lookups
const pincodeCache = new Map<string, PincodeLookupResult | null>();

/**
 * Free Postal Pincode API lookup (India Post data)
 * Uses official public API: https://api.postalpincode.in/pincode/{PINCODE}
 * Zero API keys required, free for public use.
 */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
  const cleanPin = pincode.replace(/\D/g, "").slice(0, 6);
  if (cleanPin.length !== 6) return null;

  if (pincodeCache.has(cleanPin)) {
    return pincodeCache.get(cleanPin) || null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      pincodeCache.set(cleanPin, null);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || data[0].Status !== "Success") {
      pincodeCache.set(cleanPin, null);
      return null;
    }

    const postOffices = data[0].PostOffice || [];
    if (postOffices.length === 0) {
      pincodeCache.set(cleanPin, null);
      return null;
    }

    const firstPO = postOffices[0];
    const rawState = firstPO.State || "";
    const rawDistrict = firstPO.District || "";

    const state = normalizeStateName(rawState);
    const district = normalizeDistrictName(state, rawDistrict);

    // Extract unique place/locality names
    const placeSet = new Set<string>();
    postOffices.forEach((po: any) => {
      if (po.Name) placeSet.add(po.Name.trim());
    });

    const result: PincodeLookupResult = {
      pincode: cleanPin,
      state,
      district,
      places: Array.from(placeSet),
      postOffices: postOffices.map((po: any) => ({
        name: po.Name,
        branchType: po.BranchType,
        district: po.District,
        state: po.State,
      })),
    };

    pincodeCache.set(cleanPin, result);
    return result;
  } catch (err) {
    // Return null silently on network error or timeout
    return null;
  }
}

/**
 * Searches places/post offices by name across India
 */
export async function searchPostOfficeByName(name: string): Promise<Array<{
  name: string;
  pincode: string;
  district: string;
  state: string;
}>> {
  const query = name.trim();
  if (query.length < 3) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || data[0].Status !== "Success") return [];

    const list = data[0].PostOffice || [];
    return list.map((po: any) => ({
      name: po.Name,
      pincode: po.Pincode,
      district: normalizeDistrictName(normalizeStateName(po.State), po.District),
      state: normalizeStateName(po.State),
    }));
  } catch {
    return [];
  }
}

/**
 * Get all 36 States & UTs (Puducherry & Tamil Nadu pinned at top)
 */
export function getStates(): string[] {
  return ALL_STATES;
}

/**
 * Get all official districts for a given state
 */
export function getDistricts(state: string): string[] {
  const normalized = normalizeStateName(state);
  return DISTRICTS_BY_STATE[normalized] || DISTRICTS_BY_STATE[state] || [];
}

/**
 * Get suggested places / taluks for a district
 */
export function getSuggestedPlaces(district: string, state?: string): string[] {
  if (LOCAL_PLACES_BY_DISTRICT[district]) {
    return LOCAL_PLACES_BY_DISTRICT[district];
  }
  return [];
}

export {
  getConstituencies,
  matchConstituencyFromPlaces,
  VOTER_CONSTITUENCIES_BY_DISTRICT,
} from "./data/indiaLocations";
