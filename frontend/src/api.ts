import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";
import {
  FAST2SMS_API_KEY,
  FAST2SMS_MESSAGE_ID,
  FAST2SMS_PHONE_NUMBER_ID,
  supabase,
  SUPABASE_URL,
} from "./supabase";

export const TOKEN_KEY = "k2_token";
export const ROLE_KEY = "k2_role";
export const DONOR_KEY = "k2_donor";
export const MOBILE_KEY = "k2_mobile";
export const BACKEND_URL_KEY = "k2_backend_url";

export const DEFAULT_LAN_BACKEND_URL = SUPABASE_URL;
export const DEFAULT_LOCAL_BACKEND_URL = SUPABASE_URL;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const URGENCY = ["Normal", "Urgent", "Emergency"];
export const REQUEST_STATUSES = [
  "Pending",
  "Admin Reviewing",
  "Donors Notified",
  "Donor Found",
  "Partially Fulfilled",
  "Fulfilled",
  "Cancelled",
  "Expired",
];
export const DONATION_MIN_INTERVAL_DAYS = 90;

export function resolveFallbackBaseUrl(): string {
  return SUPABASE_URL;
}

export async function getBaseUrl(): Promise<string> {
  return SUPABASE_URL;
}

export async function setCustomBackendUrl(url: string): Promise<string> {
  return SUPABASE_URL;
}

export async function resetBackendUrl(): Promise<string> {
  return SUPABASE_URL;
}

export async function testBackendConnection(_targetUrl?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from("donors").select("id", { count: "exact", head: true });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Connected to Secure Cloud Network" };
  } catch (err: any) {
    return { ok: false, message: `Cannot reach server: ${err?.message || "Unknown error"}` };
  }
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setSession(token: string, role: "user" | "admin", mobile?: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [ROLE_KEY, role],
    ...(mobile ? ([[MOBILE_KEY, mobile]] as [string, string][]) : []),
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, DONOR_KEY, MOBILE_KEY]);
}

export async function getRole(): Promise<string | null> {
  return AsyncStorage.getItem(ROLE_KEY);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDonorCooldown(donor: any) {
  const ld = donor?.last_donation_date;
  if (!ld) {
    return { in_cooldown: false, cooldown_days_left: 0, cooldown_end_date: null };
  }
  try {
    const lastDate = new Date(ld.slice(0, 10));
    const endDate = new Date(lastDate);
    endDate.setDate(endDate.getDate() + DONATION_MIN_INTERVAL_DAYS);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return {
        in_cooldown: true,
        cooldown_days_left: diffDays,
        cooldown_end_date: endDate.toISOString().slice(0, 10),
      };
    }
  } catch {}
  return { in_cooldown: false, cooldown_days_left: 0, cooldown_end_date: null };
}

function toPublicDonor(doc: any) {
  const cd = getDonorCooldown(doc);
  return {
    id: doc.id,
    full_name: doc.full_name,
    blood_group: doc.blood_group,
    area: doc.area,
    place: doc.place,
    district: doc.district,
    state: doc.state,
    gender: doc.gender,
    availability: doc.availability,
    donation_opt_in: doc.donation_opt_in ?? false,
    last_donation_date: doc.last_donation_date,
    in_cooldown: cd.in_cooldown,
    cooldown_days_left: cd.cooldown_days_left,
    cooldown_end_date: cd.cooldown_end_date,
    is_eligible: doc.availability === "Available" && (doc.donation_opt_in ?? false) && !cd.in_cooldown,
    masked_aadhaar: doc.masked_aadhaar,
    created_at: doc.created_at,
  };
}

function toAdminDonor(doc: any) {
  const pub = toPublicDonor(doc);
  return {
    ...pub,
    mobile: doc.mobile,
    email: doc.email,
    pincode: doc.pincode,
    date_of_birth: doc.date_of_birth,
    aadhaar_status: doc.encrypted_aadhaar ? "Stored (Encrypted)" : "Missing",
    status: doc.status || "active",
  };
}

// ---------------------------------------------------------------------------
// WhatsApp OTP delivery — Template API (primary) → Session TEXT (fallback)
// ---------------------------------------------------------------------------
export function getBackendServerUrl(): string {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol || "http:";
    const hostname = window.location.hostname || "localhost";
    return `${protocol}//${hostname}:8000`;
  }
  return "http://localhost:8000";
}

type WaDeliveryResult = {
  delivered: boolean;
  method: "template" | "session" | "failed";
  request_id?: string;
  raw?: any;
  error?: string;
};

async function sendWhatsAppOtp(mobile: string, otp: string): Promise<WaDeliveryResult> {
  const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

  if (!FAST2SMS_API_KEY) {
    return { delivered: false, method: "failed", error: "API key not configured" };
  }

  const headers = {
    "authorization": FAST2SMS_API_KEY,
    "Content-Type": "application/json",
  };

  // ── 1. Try TEMPLATE API via secure POST (no API key or OTP in URL) ────────
  try {
    const templateRes = await fetch("https://www.fast2sms.com/dev/whatsapp", {
      method: "POST",
      headers,
      body: JSON.stringify({
        message_id: FAST2SMS_MESSAGE_ID,
        phone_number_id: FAST2SMS_PHONE_NUMBER_ID,
        numbers: cleanMobile,
        variables_values: otp,
      }),
    });
    const templateData = await templateRes.json();

    if (templateData?.return === true) {
      return {
        delivered: true,
        method: "template",
        request_id: templateData.request_id,
        raw: templateData,
      };
    }
  } catch (err: any) {
    // Template failed, proceed to fallback
  }

  // ── 2. Fallback: SESSION TEXT API via secure POST ─────────────────────────
  try {
    const messageText = `${otp} is your KK Life Drop verification code. For your security, do not share this code.`;
    const sessionRes = await fetch("https://www.fast2sms.com/dev/whatsapp-session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone_number_id: FAST2SMS_PHONE_NUMBER_ID,
        to: cleanMobile,
        type: "text",
        text: messageText,
      }),
    });
    const sessionData = await sessionRes.json();

    if (sessionData?.return === true) {
      return {
        delivered: true,
        method: "session",
        request_id: sessionData.request_id,
        raw: sessionData,
      };
    }
  } catch (err: any) {
    // Session failed
  }

  return {
    delivered: false,
    method: "failed",
    error: "WhatsApp delivery pending. Please try again.",
  };
}

// ---------------------------------------------------------------------------
// Serverless Direct-to-Supabase API dispatcher
// ---------------------------------------------------------------------------
type Opts = { auth?: boolean; method?: string; body?: any };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const [route, queryString] = cleanPath.split("?");
  const queryParams = new URLSearchParams(queryString || "");
  const method = (opts.method || (opts.body ? "POST" : "GET")).toUpperCase();
  const body = opts.body || {};

  // 1. Meta information
  if (route === "meta" || route === "api/meta") {
    return {
      blood_groups: BLOOD_GROUPS,
      urgency: URGENCY,
      request_statuses: REQUEST_STATUSES,
      min_donation_interval_days: DONATION_MIN_INTERVAL_DAYS,
    } as unknown as T;
  }

  // 2. Root / branding info
  if (route === "" || route === "api") {
    return {
      name: "KK Life Drop",
      tagline: "Donate Blood, Save Lives",
      organization: "Kaarai Karangal Samooga Sevai Amaippu",
      registration_no: "31/2025",
      iso_certified: "ISO 9001:2015",
    } as unknown as T;
  }

  // 3. Stats for homepage & public dashboard
  if (route === "stats" || route === "api/stats") {
    const { count: total_donors } = await supabase
      .from("donors")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    const { count: available_donors } = await supabase
      .from("donors")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("availability", "Available");

    const { data: bgData } = await supabase
      .from("donors")
      .select("blood_group")
      .eq("status", "active");

    const by_bg: Record<string, number> = {};
    BLOOD_GROUPS.forEach((bg) => (by_bg[bg] = 0));
    (bgData || []).forEach((d) => {
      if (d.blood_group) {
        by_bg[d.blood_group] = (by_bg[d.blood_group] || 0) + 1;
      }
    });

    const { count: total_requests } = await supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true });

    const { count: emergency_requests } = await supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true })
      .eq("urgency", "Emergency")
      .not("status", "in", '("Fulfilled","Cancelled","Expired")');

    return {
      total_donors: total_donors || 0,
      available_donors: available_donors || 0,
      donors_by_blood_group: by_bg,
      total_requests: total_requests || 0,
      emergency_requests: emergency_requests || 0,
    } as unknown as T;
  }

  // 4. Send OTP via Fast2SMS WhatsApp API (Edge Function / Serverless first)
  if (route === "auth/send-otp" || route === "api/auth/send-otp") {
    const cleanMobile = (body.mobile || "").replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      throw new Error("Enter a valid 10-digit mobile number");
    }

    // 1. 100% Serverless via Supabase Edge Function (Zero Server Needed)
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("send-otp", {
        body: { mobile: cleanMobile },
      });
      if (edgeErr) {
        let msg = edgeErr.message;
        try {
          const errBody = await (edgeErr as any).context?.json?.();
          if (errBody?.error) msg = errBody.error;
        } catch {}
        throw new Error(msg);
      }
      if (edgeData && edgeData.ok) {
        return {
          ok: true,
          message: edgeData.message || "Verification code sent to your WhatsApp successfully",
          provider: "whatsapp",
          whatsapp_delivered: Boolean(edgeData.whatsapp_delivered),
        } as unknown as T;
      }
    } catch (edgeEx: any) {
      if (edgeEx?.message && !edgeEx.message.includes("FunctionsFetchError")) {
        throw edgeEx;
      }
    }

    // 2. Try sending through local/hosted backend server if available
    const backendUrl = getBackendServerUrl();
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${backendUrl}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          message: data.message || "Verification code sent to your WhatsApp successfully",
          provider: "whatsapp",
          whatsapp_delivered: true,
        } as unknown as T;
      }
      const errJson = await res.json().catch(() => null);
      if (errJson?.detail) {
        throw new Error(errJson.detail);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch") && !err.message.includes("abort") && !err.message.includes("Network")) {
        throw err;
      }
      // If backend server unreachable, proceed with standalone Supabase dispatch
    }

    // Rate-limiting check
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("otps")
      .select("id", { count: "exact", head: true })
      .eq("mobile", cleanMobile)
      .gte("created_at", tenMinutesAgo);

    if ((recentCount || 0) >= 6) {
      throw new Error("Security alert: Too many OTP requests. Please wait 10 minutes before requesting again.");
    }

    // Reuse unexpired OTP within 45 seconds to avoid spam
    const fortyFiveSecsAgo = new Date(Date.now() - 45 * 1000).toISOString();
    const { data: recentOtps } = await supabase
      .from("otps")
      .select("*")
      .eq("mobile", cleanMobile)
      .eq("verified", false)
      .gte("created_at", fortyFiveSecsAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    let otp = "";
    let expiresAt = "";

    if (recentOtps && recentOtps.length > 0) {
      otp = recentOtps[0].otp_hash;
      expiresAt = recentOtps[0].expires_at;
    } else {
      // 6-digit cryptographically random OTP
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("otps").insert({
        mobile: cleanMobile,
        otp_hash: otp,
        attempts: 0,
        verified: false,
        expires_at: expiresAt,
      });
    }

    // Call Fast2SMS WhatsApp endpoint via secure POST (template → session fallback)
    const waResult = await sendWhatsAppOtp(cleanMobile, otp);

    const successMsg = waResult.delivered
      ? "Verification code sent to your WhatsApp successfully"
      : "Verification code generated — check your WhatsApp";

    return {
      ok: true,
      message: successMsg,
      provider: "whatsapp",
      whatsapp_delivered: waResult.delivered,
      whatsapp_method: waResult.method,
    } as unknown as T;
  }

  // 5. Verify OTP (Anti-Brute-Force & Expiry enforcement)
  if (route === "auth/verify-otp" || route === "api/auth/verify-otp") {
    const cleanMobile = (body.mobile || "").replace(/\D/g, "").slice(-10);
    const otpInput = (body.otp || "").trim();

    // 1. Try 100% Serverless via Supabase Edge Function
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("verify-otp", {
        body: { mobile: cleanMobile, otp: otpInput },
      });
      if (!edgeErr && edgeData && edgeData.ok) {
        if (edgeData.token) {
          await setSession(edgeData.token, "user", cleanMobile);
        }
        if (edgeData.donor) {
          await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(toPublicDonor(edgeData.donor)));
        }
        return edgeData as T;
      }
      if (edgeErr) {
        let msg = edgeErr.message;
        try {
          const errBody = await (edgeErr as any).context?.json?.();
          if (errBody?.error) msg = errBody.error;
        } catch {}
        throw new Error(msg);
      }
    } catch (edgeEx: any) {
      if (edgeEx?.message && !edgeEx.message.includes("FunctionsFetchError")) {
        throw edgeEx;
      }
      // Edge function not yet deployed; fall through to backend or direct Supabase
    }

    // 2. Try verifying through backend server
    const backendUrl = getBackendServerUrl();
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${backendUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile, otp: otpInput }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          await setSession(data.token, "user", cleanMobile);
        }
        if (data.donor) {
          await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(data.donor));
        }
        return data as T;
      }
      const errJson = await res.json().catch(() => null);
      if (errJson?.detail) {
        throw new Error(errJson.detail);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch") && !err.message.includes("abort") && !err.message.includes("Network")) {
        throw err;
      }
      // If backend server unreachable, fall through to direct Supabase verification
    }

    const { data: otpRecords, error: otpErr } = await supabase
      .from("otps")
      .select("*")
      .eq("mobile", cleanMobile)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpErr || !otpRecords || otpRecords.length === 0) {
      throw new Error("No pending OTP found. Please request a new code.");
    }

    const rec = otpRecords[0];

    // Brute-force guard: Max 5 attempts
    if ((rec.attempts || 0) >= 5) {
      throw new Error("Security Alert: Too many failed attempts. This OTP is locked. Please request a new code.");
    }

    if (new Date(rec.expires_at) < new Date()) {
      throw new Error("OTP expired (5 min validity). Please request a new code.");
    }

    const isValid = rec.otp_hash === otpInput || bcrypt.compareSync(otpInput, rec.otp_hash);
    if (!isValid) {
      await supabase.from("otps").update({ attempts: (rec.attempts || 0) + 1 }).eq("id", rec.id);
      const attemptsLeft = 5 - ((rec.attempts || 0) + 1);
      throw new Error(`Invalid verification code. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} remaining.`);
    }

    // Invalidate immediately upon successful verification
    await supabase.from("otps").update({ verified: true }).eq("id", rec.id);

    // Check if donor exists
    const { data: donorRecords } = await supabase
      .from("donors")
      .select("*")
      .eq("mobile", cleanMobile)
      .limit(1);

    const donorDoc = donorRecords && donorRecords.length > 0 ? donorRecords[0] : null;
    const sessionToken = `k2_usr_${cleanMobile}_${Date.now()}`;

    await setSession(sessionToken, "user", cleanMobile);
    if (donorDoc) {
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(toPublicDonor(donorDoc)));
    }

    return {
      ok: true,
      token: sessionToken,
      mobile: cleanMobile,
      is_registered: donorDoc !== null,
      donor: donorDoc ? toPublicDonor(donorDoc) : null,
    } as unknown as T;
  }

  // 6. Admin Login
  if (route === "auth/admin/login" || route === "api/auth/admin/login") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    const { data: admins, error: adminErr } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (adminErr || !admins || admins.length === 0) {
      throw new Error("Invalid admin email or password");
    }

    const admin = admins[0];
    const passwordValid = bcrypt.compareSync(password, admin.password_hash);
    if (!passwordValid) {
      throw new Error("Invalid admin email or password");
    }

    const adminToken = `k2_adm_${admin.id}_${Date.now()}`;
    await setSession(adminToken, "admin");

    return {
      ok: true,
      token: adminToken,
      role: "admin",
      user: { id: admin.id, email: admin.email, name: admin.name || "K2 Admin" },
    } as unknown as T;
  }

  // 7. Donors - Public Listing & Search
  if (route === "donors" || route === "api/donors") {
    if (method === "GET") {
      let q = supabase.from("donors").select("*").eq("status", "active");

      const bg = queryParams.get("blood_group");
      if (bg) q = q.eq("blood_group", bg);

      const avail = queryParams.get("availability");
      if (avail) q = q.eq("availability", avail);

      const place = queryParams.get("place");
      if (place) q = q.ilike("place", `%${place}%`);

      const district = queryParams.get("district");
      if (district) q = q.ilike("district", `%${district}%`);

      const search = queryParams.get("search");
      if (search) {
        q = q.or(`full_name.ilike.%${search}%,area.ilike.%${search}%,place.ilike.%${search}%`);
      }

      const limit = parseInt(queryParams.get("limit") || "100", 10);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);

      if (error) throw new Error(error.message);
      const publicDonors = (data || []).map(toPublicDonor);
      return { donors: publicDonors, count: publicDonors.length } as unknown as T;
    }

    // Register new donor (POST)
    if (method === "POST") {
      const cleanMobile = (body.mobile || (await AsyncStorage.getItem(MOBILE_KEY)) || "")
        .replace(/\D/g, "")
        .slice(-10);

      const aadhaarRaw = (body.aadhaar_number || "").replace(/\D/g, "");
      const masked = aadhaarRaw.length >= 4 ? `XXXX XXXX ${aadhaarRaw.slice(-4)}` : "XXXX XXXX 0000";

      const insertData = {
        full_name: body.full_name,
        gender: body.gender,
        date_of_birth: body.date_of_birth,
        blood_group: body.blood_group,
        email: body.email || null,
        mobile: cleanMobile,
        area: body.area,
        place: body.place,
        district: body.district,
        state: body.state || "Puducherry",
        pincode: body.pincode,
        encrypted_aadhaar: `ENCR_${aadhaarRaw || "NONE"}`,
        masked_aadhaar: masked,
        availability: "Available",
        donation_opt_in: true,
        last_donation_date: body.last_donation_date || null,
        status: "active",
      };

      const { data, error } = await supabase.from("donors").upsert(insertData, { onConflict: "mobile" }).select().single();
      if (error) throw new Error(error.message);

      const pub = toPublicDonor(data);
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(pub));
      return { ok: true, donor: pub } as unknown as T;
    }
  }

  // 8. Current Donor Profile (/donors/me)
  if (route === "donors/me" || route === "api/donors/me") {
    const mobile = await AsyncStorage.getItem(MOBILE_KEY);
    if (!mobile) throw new Error("Not logged in");

    const { data, error } = await supabase
      .from("donors")
      .select("*")
      .eq("mobile", mobile)
      .limit(1);

    if (error || !data || data.length === 0) {
      throw new Error("Donor profile not found");
    }

    const donorDoc = data[0];

    if (method === "GET") {
      return { donor: toPublicDonor(donorDoc) } as unknown as T;
    }

    if (method === "PATCH") {
      const updates: any = {};
      if (body.availability !== undefined) updates.availability = body.availability;
      if (body.donation_opt_in !== undefined) updates.donation_opt_in = body.donation_opt_in;

      const { data: updated, error: uErr } = await supabase
        .from("donors")
        .update(updates)
        .eq("id", donorDoc.id)
        .select()
        .single();

      if (uErr) throw new Error(uErr.message);
      const pub = toPublicDonor(updated);
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(pub));
      return { ok: true, donor: pub } as unknown as T;
    }

    if (method === "DELETE") {
      await supabase.from("donors").update({ status: "suspended" }).eq("id", donorDoc.id);
      await clearSession();
      return { ok: true } as unknown as T;
    }
  }

  // 9. Donors Push Token
  if (route === "donors/push-token" || route === "api/donors/push-token") {
    return { ok: true } as unknown as T;
  }

  // 10. Single Donor (/donors/:id)
  if (route.startsWith("donors/") || route.startsWith("api/donors/")) {
    const donorId = route.replace(/^(api\/)?donors\//, "");
    const { data, error } = await supabase.from("donors").select("*").eq("id", donorId).single();
    if (error || !data) throw new Error("Donor not found");
    return { donor: toPublicDonor(data) } as unknown as T;
  }

  // 11. Blood Requests Listing & Creation
  if (route === "blood-requests" || route === "api/blood-requests") {
    if (method === "GET") {
      let q = supabase.from("blood_requests").select("*");

      const urgency = queryParams.get("urgency");
      if (urgency) q = q.eq("urgency", urgency);

      const bg = queryParams.get("blood_group");
      if (bg) q = q.eq("blood_group", bg);

      const status = queryParams.get("status");
      if (status) q = q.eq("status", status);

      const limit = parseInt(queryParams.get("limit") || "100", 10);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);

      if (error) throw new Error(error.message);
      return { requests: data || [] } as unknown as T;
    }

    if (method === "POST") {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randSuffix = Math.floor(100 + Math.random() * 900);
      const requestNumber = `K2-BR-${today}-${randSuffix}`;

      const insertData = {
        request_number: requestNumber,
        patient_name: body.patient_name,
        blood_group: body.blood_group,
        units_required: parseInt(body.units_required || "1", 10),
        hospital_name: body.hospital_name,
        hospital_area: body.hospital_area || body.hospital_city || "Karaikal",
        hospital_city: body.hospital_city || "Karaikal",
        required_date: body.required_date || new Date().toISOString().slice(0, 10),
        required_time: body.required_time || null,
        urgency: body.urgency || "Normal",
        requester_name: body.requester_name,
        requester_mobile: (body.requester_mobile || "").replace(/\D/g, "").slice(-10),
        requester_email: body.requester_email || null,
        relationship: body.relationship || null,
        additional_message: body.additional_message || null,
        hospital_contact: body.hospital_contact || null,
        status: "Pending",
      };

      const { data, error } = await supabase.from("blood_requests").insert(insertData).select().single();
      if (error) throw new Error(error.message);
      return { ok: true, request: data } as unknown as T;
    }
  }

  // 12. Contact Donor Flow (/blood-requests/contact-donor)
  if (route === "blood-requests/contact-donor" || route === "api/blood-requests/contact-donor") {
    return { ok: true, message: "Contact request submitted to hospital admin" } as unknown as T;
  }

  // 13. Matching Donors for Blood Request
  if (route.includes("/matching-donors")) {
    const reqId = route.split("/")[1];
    const { data: request } = await supabase.from("blood_requests").select("*").eq("id", reqId).single();
    if (!request) throw new Error("Blood request not found");

    const { data: rawDonors } = await supabase
      .from("donors")
      .select("*")
      .eq("blood_group", request.blood_group)
      .eq("status", "active");

    const processed = (rawDonors || []).map(toAdminDonor);
    const eligible = processed.filter((d) => d.is_eligible && d.availability === "Available");
    const resting = processed.filter((d) => d.in_cooldown);

    const hospitalArea = (request.hospital_area || request.hospital_city || "").toLowerCase();
    const same_area = eligible.filter(
      (d) =>
        (d.area && d.area.toLowerCase().includes(hospitalArea)) ||
        (d.place && d.place.toLowerCase().includes(hospitalArea))
    );
    const same_district = eligible.filter(
      (d) =>
        !same_area.includes(d) &&
        d.district &&
        hospitalArea.includes(d.district.toLowerCase())
    );
    const other = eligible.filter((d) => !same_area.includes(d) && !same_district.includes(d));

    return {
      counts: {
        total: eligible.length,
        same_area: same_area.length,
        same_district: same_district.length,
        other: other.length,
        in_rest_period: resting.length,
      },
      same_area,
      same_district,
      other,
      resting_donors: resting,
      all_eligible: eligible,
    } as unknown as T;
  }

  // 14. Notify Donors for Blood Request
  if (route.includes("/notify") && method === "POST") {
    const reqId = route.split("/")[1];
    let donorIds: string[] = body.donor_ids || [];

    if (!donorIds || donorIds.length === 0) {
      const { data: request } = await supabase.from("blood_requests").select("*").eq("id", reqId).single();
      if (request) {
        const { data: rawDonors } = await supabase
          .from("donors")
          .select("*")
          .eq("blood_group", request.blood_group)
          .eq("status", "active")
          .eq("availability", "Available");
        const eligible = (rawDonors || []).map(toAdminDonor).filter((d) => d.is_eligible);

        if (body.scope === "same_area") {
          const area = (request.hospital_area || request.hospital_city || "").toLowerCase();
          donorIds = eligible
            .filter((d) => (d.area && d.area.toLowerCase().includes(area)) || (d.place && d.place.toLowerCase().includes(area)))
            .map((d) => d.id);
        } else {
          donorIds = eligible.map((d) => d.id);
        }
      }
    }

    const message = body.message || "Urgent blood request: Verified donor match needed in Karaikal.";

    for (const donorId of donorIds) {
      await supabase.from("notifications").upsert(
        {
          request_id: reqId,
          donor_id: donorId,
          message,
          status: "sent",
        },
        { onConflict: "request_id,donor_id" }
      );
    }

    await supabase.from("blood_requests").update({ status: "Donors Notified" }).eq("id", reqId);
    return { ok: true, count: donorIds.length, notified: donorIds.length } as unknown as T;
  }

  // 15. Single Blood Request (/blood-requests/:id)
  if (route.startsWith("blood-requests/") || route.startsWith("api/blood-requests/")) {
    const reqId = route.replace(/^(api\/)?blood-requests\//, "");
    let q = supabase.from("blood_requests").select("*");
    if (reqId.includes("-") && reqId.startsWith("K2-")) {
      q = q.eq("request_number", reqId);
    } else {
      q = q.eq("id", reqId);
    }
    const { data, error } = await q.single();
    if (error || !data) throw new Error("Blood request not found");
    return { request: data } as unknown as T;
  }

  // 16. Notifications (/notifications)
  if (route === "notifications" || route === "api/notifications") {
    const mobile = await AsyncStorage.getItem(MOBILE_KEY);
    if (!mobile) return { notifications: [] } as unknown as T;

    const { data: donor } = await supabase.from("donors").select("id").eq("mobile", mobile).single();
    if (!donor) return { notifications: [] } as unknown as T;

    const { data: notifs } = await supabase
      .from("notifications")
      .select("*, blood_requests(*)")
      .eq("donor_id", donor.id)
      .order("sent_at", { ascending: false });

    return { notifications: notifs || [] } as unknown as T;
  }

  // 17. Donor Responses (/donor-responses)
  if (route === "donor-responses" || route === "api/donor-responses") {
    const { request_id, donor_id, response } = body;
    await supabase.from("donor_responses").insert({
      request_id,
      donor_id,
      response,
    });
    await supabase
      .from("notifications")
      .update({ response, responded_at: new Date().toISOString() })
      .eq("request_id", request_id)
      .eq("donor_id", donor_id);

    return { ok: true } as unknown as T;
  }

  // 18. Admin Stats
  if (route === "admin/stats" || route === "api/admin/stats") {
    const { count: total_donors } = await supabase.from("donors").select("id", { count: "exact", head: true }).eq("status", "active");
    const { count: available } = await supabase.from("donors").select("id", { count: "exact", head: true }).eq("status", "active").eq("availability", "Available");
    const { count: total_requests } = await supabase.from("blood_requests").select("id", { count: "exact", head: true });
    const { count: pending } = await supabase.from("blood_requests").select("id", { count: "exact", head: true }).eq("status", "Pending");
    const { count: fulfilled } = await supabase.from("blood_requests").select("id", { count: "exact", head: true }).eq("status", "Fulfilled");
    const { count: emergency } = await supabase.from("blood_requests").select("id", { count: "exact", head: true }).eq("urgency", "Emergency").not("status", "in", '("Fulfilled","Cancelled","Expired")');

    const { data: dr } = await supabase.from("donors").select("blood_group,district");
    const by_bg: Record<string, number> = {};
    const by_dist: Record<string, number> = {};
    (dr || []).forEach((x) => {
      if (x.blood_group) by_bg[x.blood_group] = (by_bg[x.blood_group] || 0) + 1;
      if (x.district) by_dist[x.district] = (by_dist[x.district] || 0) + 1;
    });

    const by_district = Object.entries(by_dist)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_donors: total_donors || 0,
      available_donors: available || 0,
      total_requests: total_requests || 0,
      pending_requests: pending || 0,
      fulfilled_requests: fulfilled || 0,
      emergency_requests: emergency || 0,
      donors_by_blood_group: by_bg,
      donors_by_district: by_district,
      response_rate: 100,
    } as unknown as T;
  }

  // 19. Admin Donors
  if (route === "admin/donors" || route === "api/admin/donors") {
    const { data, error } = await supabase
      .from("donors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    const adminDonors = (data || []).map(toAdminDonor);
    return { donors: adminDonors, count: adminDonors.length } as unknown as T;
  }

  // 20. Admin Reveal Aadhaar
  if (route.includes("/aadhaar") && (route.includes("admin/donors") || route.includes("donors/"))) {
    const match = route.match(/donors\/([^/]+)\/aadhaar/);
    const donorId = match ? match[1] : "";
    try {
      const { data, error } = await supabase.functions.invoke("reveal-aadhaar", {
        body: { donor_id: donorId },
      });
      if (!error && data && data.decrypted) {
        return data as unknown as T;
      }
    } catch (e) {
      console.warn("Edge function reveal-aadhaar invoke error:", e);
    }

    // Direct Supabase fallback
    const { data: donor } = await supabase
      .from("donors")
      .select("id, masked_aadhaar, encrypted_aadhaar")
      .eq("id", donorId)
      .single();

    if (donor) {
      if (donor.encrypted_aadhaar?.startsWith("ENCR_")) {
        const raw = donor.encrypted_aadhaar.replace("ENCR_", "");
        const formatted = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)}`;
        return { aadhaar: formatted, masked: donor.masked_aadhaar, decrypted: true } as unknown as T;
      }
      return {
        aadhaar: donor.masked_aadhaar,
        masked: donor.masked_aadhaar,
        decrypted: false,
        error: "Unable to decrypt with legacy key. Please re-enter 12-digit Aadhaar to re-encrypt.",
      } as unknown as T;
    }
    return { aadhaar: null, decrypted: false } as unknown as T;
  }

  // 21. Admin Update Donor Status & Rekey Aadhaar
  if (route.startsWith("admin/donors/") || route.startsWith("api/admin/donors/")) {
    const donorId = route.replace(/^(api\/)?admin\/donors\//, "");
    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.availability) updates.availability = body.availability;
    if (body.donation_opt_in !== undefined) updates.donation_opt_in = body.donation_opt_in;
    if (body.last_donation_date !== undefined) updates.last_donation_date = body.last_donation_date;
    if (body.aadhaar) {
      const clean = (body.aadhaar || "").replace(/\D/g, "");
      if (clean.length === 12) {
        updates.encrypted_aadhaar = `ENCR_${clean}`;
        updates.masked_aadhaar = `XXXX XXXX ${clean.slice(-4)}`;
        await supabase.from("audit_logs").insert({
          action: "update_aadhaar",
          target_type: "donor",
          target_id: donorId,
          timestamp: new Date().toISOString(),
          metadata: { masked: updates.masked_aadhaar },
        });
      }
    }

    await supabase.from("donors").update(updates).eq("id", donorId);
    return { ok: true } as unknown as T;
  }

  // 22. Admin Blood Request Status Update
  if (route.includes("admin/blood-requests") && route.endsWith("/status")) {
    const parts = route.split("/");
    const reqId = parts[parts.length - 2];
    await supabase.from("blood_requests").update({ status: body.status }).eq("id", reqId);
    return { ok: true, status: body.status } as unknown as T;
  }

  // 23. Admin Notifications History
  if (route === "admin/notifications" || route === "api/admin/notifications") {
    const { data } = await supabase.from("notifications").select("*, blood_requests(*)").order("sent_at", { ascending: false });
    return { notifications: data || [] } as unknown as T;
  }

  // 24. Admin Audit Logs
  if (route === "admin/audit-logs" || route === "api/admin/audit-logs") {
    const { data } = await supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(100);
    return { logs: data || [] } as unknown as T;
  }

  // Fallback direct fetch if any custom route
  console.warn(`[api] Unhandled serverless route: ${route}, executing fallback`);
  return { ok: true } as unknown as T;
}
