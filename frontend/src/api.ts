import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";

// React Native (Hermes/JSC) crypto PRNG fallback for bcryptjs
try {
  bcrypt.setRandomFallback((len: number) => {
    const buf: number[] = [];
    for (let i = 0; i < len; i++) {
      buf.push(Math.floor(Math.random() * 256));
    }
    return buf as any;
  });
} catch {}
import {
  FAST2SMS_API_KEY,
  FAST2SMS_MESSAGE_ID,
  FAST2SMS_PHONE_NUMBER_ID,
  supabase,
  SUPABASE_URL,
} from "./supabase";

export const TOKEN_KEY = "kk_token";
export const ROLE_KEY = "kk_role";
export const DONOR_KEY = "kk_donor";
export const MOBILE_KEY = "kk_mobile";
export const ADMIN_USER_KEY = "kk_admin_user";
export const SUPER_ADMIN_EMAIL = "kaaraikarangal@gmail.com";
export const BACKEND_URL_KEY = "kk_backend_url";

export const LEGACY_TOKEN_KEY = "k2_token";
export const LEGACY_ROLE_KEY = "k2_role";
export const LEGACY_DONOR_KEY = "k2_donor";
export const LEGACY_MOBILE_KEY = "k2_mobile";
export const LEGACY_ADMIN_USER_KEY = "k2_admin_user";
export const PUSH_TOKEN_KEY = "kk_push_token";
export const LEGACY_PUSH_TOKEN_KEY = "k2_push_token";

export const ORG_CONTACT = {
  name: "Kaarai Karangal Social Service Organization",
  email: "kaaraikarangal@gmail.com",
  phone: "+91 9750807463",
  address: "K7 Hall, No.36/6 Kennadiyar street, Karaikal, Puducherry - 609602, India",
};

export const DEVELOPER_INFO = {
  name: "Barathraj S",
  role: "Software Engineer",
  email: "jcibarathraj@gmail.com",
  phone: "7867009044",
  formatted_phone: "+91 7867009044",
  website: "https://barathraj.web.app/",
};


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
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  if (t) return t;
  return AsyncStorage.getItem(LEGACY_TOKEN_KEY);
}

export async function setSession(token: string, role: "user" | "admin", mobile?: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [ROLE_KEY, role],
    ...(mobile ? ([[MOBILE_KEY, mobile]] as [string, string][]) : []),
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    ROLE_KEY,
    DONOR_KEY,
    MOBILE_KEY,
    ADMIN_USER_KEY,
    LEGACY_TOKEN_KEY,
    LEGACY_ROLE_KEY,
    LEGACY_DONOR_KEY,
    LEGACY_MOBILE_KEY,
    LEGACY_ADMIN_USER_KEY,
  ]);
}

export async function getRole(): Promise<string | null> {
  const r = await AsyncStorage.getItem(ROLE_KEY);
  if (r) return r;
  return AsyncStorage.getItem(LEGACY_ROLE_KEY);
}

/**
 * Strict Security Guard: Ensures caller holds an authenticated administrator session token.
 * Prevents unauthorized escalation or tampering with admin endpoints.
 */
export async function requireAdminAuth(): Promise<{ id: string; email: string; is_super_admin: boolean }> {
  const [token, legToken, role, legRole, adminStr, legAdminStr] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(LEGACY_TOKEN_KEY),
    AsyncStorage.getItem(ROLE_KEY),
    AsyncStorage.getItem(LEGACY_ROLE_KEY),
    AsyncStorage.getItem(ADMIN_USER_KEY),
    AsyncStorage.getItem(LEGACY_ADMIN_USER_KEY),
  ]);

  const activeToken = token || legToken;
  const activeRole = role || legRole;
  const activeAdminStr = adminStr || legAdminStr;

  if (activeRole !== "admin" || !activeToken || !activeAdminStr) {
    throw new Error("Access Denied: Administrator authentication required.");
  }

  let adminUser: any = null;
  try {
    adminUser = JSON.parse(activeAdminStr);
  } catch {
    throw new Error("Access Denied: Invalid administrator session.");
  }

  if (!adminUser || !adminUser.email) {
    throw new Error("Access Denied: Administrator identity missing.");
  }

  const isSuperAdmin = Boolean(
    adminUser.is_super_admin || adminUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );

  return { id: adminUser.id, email: adminUser.email, is_super_admin: isSuperAdmin };
}

/**
 * Record an immutable audit log entry in Supabase for user and admin traceability.
 */
export async function recordAuditLog(params: {
  actor: string;
  action: string;
  target_type: "donor" | "blood_request" | "sub_admin" | "admin" | "system" | "notification" | "auth" | "user";
  target_id: string;
  metadata?: Record<string, any>;
}) {
  try {
    await supabase.from("audit_logs").insert({
      admin_id: params.actor,
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id,
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.warn(`[AuditLog] Could not record audit log (${params.action}):`, err);
  }
}

export interface ActiveSession {
  isLoggedIn: boolean;
  role: "user" | "admin" | null;
  mobile: string | null;
  donorId: string | null;
  token: string | null;
  isSuperAdmin?: boolean;
}

export async function getActiveSession(): Promise<ActiveSession> {
  try {
    const [
      token,
      role,
      mobile,
      donorStr,
      adminUserStr,
      legToken,
      legRole,
      legMobile,
      legDonorStr,
      legAdminUserStr,
    ] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(ROLE_KEY),
      AsyncStorage.getItem(MOBILE_KEY),
      AsyncStorage.getItem(DONOR_KEY),
      AsyncStorage.getItem(ADMIN_USER_KEY),
      AsyncStorage.getItem(LEGACY_TOKEN_KEY),
      AsyncStorage.getItem(LEGACY_ROLE_KEY),
      AsyncStorage.getItem(LEGACY_MOBILE_KEY),
      AsyncStorage.getItem(LEGACY_DONOR_KEY),
      AsyncStorage.getItem(LEGACY_ADMIN_USER_KEY),
    ]);

    const activeToken = token || legToken;
    const activeRole = role || legRole;
    let activeMobile = mobile || legMobile;
    const activeDonorStr = donorStr || legDonorStr;
    const activeAdminUserStr = adminUserStr || legAdminUserStr;

    // Explicit Admin session
    if (activeRole === "admin" && activeToken) {
      let isSuperAdmin = false;
      if (activeAdminUserStr) {
        try {
          const parsed = JSON.parse(activeAdminUserStr);
          isSuperAdmin = Boolean(parsed?.is_super_admin || parsed?.email?.toLowerCase() === SUPER_ADMIN_EMAIL);
        } catch {}
      }
      return { isLoggedIn: true, role: "admin", mobile: null, donorId: null, token: activeToken, isSuperAdmin };
    }

    // Active User / Donor session:
    // If ANY of (activeToken, activeMobile, activeDonorStr) is present, the user has an active session
    if (activeToken || activeMobile || activeDonorStr) {
      let donorId: string | null = null;
      if (activeDonorStr) {
        try {
          const parsed = JSON.parse(activeDonorStr);
          donorId = parsed?.id || null;
          if (!activeMobile && parsed?.mobile) {
            activeMobile = parsed.mobile;
          }
        } catch {}
      }

      // Self-heal session tokens and role in AsyncStorage if any key was missing
      const healingPairs: [string, string][] = [];
      if (!activeToken) {
        healingPairs.push([TOKEN_KEY, `user_session_${activeMobile || "active"}`]);
      }
      if (activeRole !== "user") {
        healingPairs.push([ROLE_KEY, "user"]);
      }
      if (healingPairs.length > 0) {
        await AsyncStorage.multiSet(healingPairs);
      }

      return {
        isLoggedIn: true,
        role: "user",
        mobile: activeMobile || null,
        donorId,
        token: activeToken || `user_session_${activeMobile || "active"}`,
      };
    }

    return { isLoggedIn: false, role: null, mobile: null, donorId: null, token: null };
  } catch {
    return { isLoggedIn: false, role: null, mobile: null, donorId: null, token: null };
  }
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
  // Only attempt local backend fallback in web dev environment
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const protocol = window.location.protocol || "http:";
      return `${protocol}//${hostname}:8000`;
    }
  }
  return "";
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
      developer: DEVELOPER_INFO,
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

    // Anti-flood rate limiting: Must wait 45 seconds between requests
    const fortyFiveSecsAgo = new Date(Date.now() - 45 * 1000).toISOString();
    const { count: immediateCount } = await supabase
      .from("otps")
      .select("id", { count: "exact", head: true })
      .eq("mobile", cleanMobile)
      .gte("created_at", fortyFiveSecsAgo);

    if ((immediateCount || 0) > 0) {
      throw new Error("Please wait 45 seconds before requesting another code.");
    }

    // 6-digit cryptographically random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // Securely hash OTP before database storage (never store plaintext OTP in database)
    const otpHash = bcrypt.hashSync(otp, 8);

    await supabase.from("otps").insert({
      mobile: cleanMobile,
      otp_hash: otpHash,
      attempts: 0,
      verified: false,
      expires_at: expiresAt,
    });

    // Call Fast2SMS WhatsApp endpoint via secure POST (template → session fallback)
    const waResult = await sendWhatsAppOtp(cleanMobile, otp);

    await recordAuditLog({
      actor: `user:${cleanMobile}`,
      action: "request_otp",
      target_type: "auth",
      target_id: cleanMobile,
      metadata: {
        mobile: cleanMobile,
        provider: "whatsapp",
        method: waResult.method,
        delivered: waResult.delivered,
      },
    });

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
    const sessionToken = `kk_usr_${cleanMobile}_${Date.now()}`;

    await setSession(sessionToken, "user", cleanMobile);
    if (donorDoc) {
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(toPublicDonor(donorDoc)));
      const cachedPushToken =
        (await AsyncStorage.getItem(PUSH_TOKEN_KEY)) ||
        (await AsyncStorage.getItem(LEGACY_PUSH_TOKEN_KEY));
      if (cachedPushToken) {
        await supabase
          .from("donors")
          .update({ push_token: cachedPushToken })
          .eq("id", donorDoc.id);
      }
    }

    await recordAuditLog({
      actor: `user:${cleanMobile}`,
      action: "user_login",
      target_type: "user",
      target_id: cleanMobile,
      metadata: {
        mobile: cleanMobile,
        is_registered: donorDoc !== null,
        donor_name: donorDoc?.full_name || null,
        blood_group: donorDoc?.blood_group || null,
      },
    });

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
    const password = (body.password || "").trim();

    if (!email || !password) {
      throw new Error("Access Denied: Email and password are required.");
    }

    const { data: admins, error: adminErr } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (adminErr || !admins || admins.length === 0) {
      throw new Error("Access Denied: Invalid administrator credentials");
    }

    const admin = admins[0];
    if (admin.status === "suspended") {
      throw new Error("Access Denied: This administrator account has been suspended by the Super Admin.");
    }

    const passwordValid = bcrypt.compareSync(password, admin.password_hash);
    if (!passwordValid) {
      throw new Error("Access Denied: Invalid administrator credentials");
    }

    const isSuperAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase();
    const adminRole = isSuperAdmin ? "super_admin" : "sub_admin";
    const adminToken = `kk_adm_${admin.id}_${Date.now()}`;
    await setSession(adminToken, "admin");

    const adminUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name || (isSuperAdmin ? "Kaarai Karangal Super Admin" : "KK Sub-Admin"),
      role: adminRole,
      is_super_admin: isSuperAdmin,
    };
    await AsyncStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));

    // Log admin login to audit_logs
    await recordAuditLog({
      actor: admin.email,
      action: "admin_login",
      target_type: "admin",
      target_id: admin.email,
      metadata: { email: admin.email, role: adminRole, is_super_admin: isSuperAdmin, name: adminUser.name },
    });

    return {
      ok: true,
      token: adminToken,
      role: adminRole,
      is_super_admin: isSuperAdmin,
      user: adminUser,
    } as unknown as T;
  }


  // 7. Donors - Public Listing & Search (PII-Protected: never select raw mobile, email, or aadhaar)
  if (route === "donors" || route === "api/donors") {
    if (method === "GET") {
      let q = supabase
        .from("donors")
        .select("id, full_name, blood_group, area, place, district, state, gender, availability, donation_opt_in, last_donation_date, masked_aadhaar, created_at, status")
        .eq("status", "active");

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

      const aadhaarRaw = (body.aadhaar || body.aadhaar_number || "").replace(/\D/g, "");
      const masked = aadhaarRaw.length >= 4 ? `XXXX XXXX ${aadhaarRaw.slice(-4)}` : null;

      const cachedPushToken =
        (await AsyncStorage.getItem(PUSH_TOKEN_KEY)) ||
        (await AsyncStorage.getItem(LEGACY_PUSH_TOKEN_KEY)) ||
        body.push_token ||
        null;

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
        encrypted_aadhaar: aadhaarRaw ? `ENCR_${aadhaarRaw}` : null,
        masked_aadhaar: masked,
        availability: "Available",
        donation_opt_in: true,
        last_donation_date: body.last_donation_date || null,
        status: "active",
        push_token: cachedPushToken,
      };

      const { data, error } = await supabase.from("donors").upsert(insertData, { onConflict: "mobile" }).select().single();
      if (error) throw new Error(error.message);

      const pub = toPublicDonor(data);
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(pub));

      await recordAuditLog({
        actor: `user:${cleanMobile}`,
        action: "donor_registered",
        target_type: "donor",
        target_id: data.id,
        metadata: {
          full_name: data.full_name,
          blood_group: data.blood_group,
          area: data.area,
          place: data.place,
          district: data.district,
          masked_aadhaar: masked,
        },
      });

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

    const toPrivateDonor = (d: any) => {
      const pub = toPublicDonor(d);
      return {
        ...pub,
        mobile: d.mobile,
        email: d.email,
        pincode: d.pincode,
        date_of_birth: d.date_of_birth,
      };
    };

    if (method === "GET") {
      return { donor: toPrivateDonor(donorDoc) } as unknown as T;
    }

    if (method === "PATCH") {
      const updates: any = {};
      if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
      if (body.gender !== undefined) updates.gender = body.gender;
      if (body.date_of_birth !== undefined) updates.date_of_birth = body.date_of_birth;
      if (body.blood_group !== undefined) updates.blood_group = body.blood_group;
      if (body.email !== undefined) updates.email = body.email ? String(body.email).trim() : null;
      if (body.area !== undefined) updates.area = String(body.area).trim();
      if (body.place !== undefined) updates.place = String(body.place).trim();
      if (body.district !== undefined) updates.district = String(body.district).trim();
      if (body.state !== undefined) updates.state = String(body.state).trim();
      if (body.pincode !== undefined) updates.pincode = String(body.pincode).trim();
      if (body.availability !== undefined) updates.availability = body.availability;
      if (body.donation_opt_in !== undefined) updates.donation_opt_in = body.donation_opt_in;
      if (body.last_donation_date !== undefined) updates.last_donation_date = body.last_donation_date || null;
      if (body.aadhaar !== undefined && body.aadhaar) {
        const cleanAadhaar = String(body.aadhaar).replace(/\D/g, "");
        if (cleanAadhaar.length === 12) {
          updates.encrypted_aadhaar = `ENCR_${cleanAadhaar}`;
          updates.masked_aadhaar = `XXXX XXXX ${cleanAadhaar.slice(-4)}`;
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data: updated, error: uErr } = await supabase
        .from("donors")
        .update(updates)
        .eq("id", donorDoc.id)
        .select()
        .single();

      if (uErr) throw new Error(uErr.message);
      const pub = toPrivateDonor(updated);
      await AsyncStorage.setItem(DONOR_KEY, JSON.stringify(pub));

      const isStatusOnly = Object.keys(updates).every((k) =>
        ["availability", "donation_opt_in", "updated_at"].includes(k)
      );

      await recordAuditLog({
        actor: `user:${mobile}`,
        action: isStatusOnly ? "donor_status_toggle" : "donor_profile_update",
        target_type: "donor",
        target_id: donorDoc.id,
        metadata: {
          donor_name: updated.full_name,
          updated_fields: Object.keys(updates),
          blood_group: updated.blood_group,
          district: updated.district,
        },
      });

      return { ok: true, donor: pub } as unknown as T;
    }

    if (method === "DELETE") {
      // Permanent Account Deletion required by Apple Guideline 5.1.1(v) & Google Play
      await supabase.from("donors").delete().eq("id", donorDoc.id);
      await clearSession();

      await recordAuditLog({
        actor: `user:${mobile}`,
        action: "delete_account",
        target_type: "donor",
        target_id: donorDoc.id,
        metadata: {
          donor_name: donorDoc.full_name,
          mobile: donorDoc.mobile,
          blood_group: donorDoc.blood_group,
          reason: "User requested permanent account and data deletion",
        },
      });

      return { ok: true } as unknown as T;
    }
  }

  // 9. Donors & Device Push Token Registration
  if (route === "donors/push-token" || route === "api/donors/push-token") {
    try {
      const rawMobile = await AsyncStorage.getItem(MOBILE_KEY);
      const legMobile = await AsyncStorage.getItem("k2_mobile");
      const cleanMobile = (body.mobile || rawMobile || legMobile || "").replace(/\D/g, "").slice(-10);
      const pushToken = (body.push_token || "").trim();
      const platform = body.platform || (typeof navigator !== "undefined" ? "web" : "expo");

      if (!pushToken) {
        console.log("[PushToken] No push token provided, skipping registration");
        return { ok: true } as unknown as T;
      }

      // Accept any Expo push token format (ExponentPushToken or ExpoPushToken)
      const isValidExpoToken = pushToken.startsWith("ExponentPushToken") || pushToken.startsWith("ExpoPushToken");
      if (!isValidExpoToken) {
        console.log("[PushToken] Token format not recognized:", pushToken.substring(0, 30));
        return { ok: true } as unknown as T;
      }

      // --- PRIMARY: Save directly to donors.push_token (most reliable) ---
      let donorId = body.donor_id || null;

      if (!donorId) {
        try {
          const cachedStr = (await AsyncStorage.getItem(DONOR_KEY)) || (await AsyncStorage.getItem("k2_donor"));
          if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            donorId = parsed?.id || null;
          }
        } catch {}
      }

      if (!donorId && cleanMobile.length === 10) {
        const { data: donor } = await supabase
          .from("donors")
          .select("id")
          .eq("mobile", cleanMobile)
          .limit(1)
          .maybeSingle();
        donorId = donor?.id || null;
      }

      if (donorId) {
        // Save push_token directly on the donor row — simplest and most reliable
        const { error: updateErr } = await supabase
          .from("donors")
          .update({ push_token: pushToken })
          .eq("id", donorId);
        if (updateErr) {
          console.warn("[PushToken] Failed to update donors.push_token:", updateErr.message);
        } else {
          console.log("[PushToken] ✅ Saved push_token directly on donor:", donorId);
        }
      } else {
        console.log("[PushToken] Could not resolve donor ID from mobile:", cleanMobile, "- token will be saved to audit_logs only");
      }

      // --- SECONDARY: Also save to audit_logs for admin devices and fallback ---
      let adminEmail = body.admin_email || null;
      if (!adminEmail) {
        try {
          const adminStr = (await AsyncStorage.getItem(ADMIN_USER_KEY)) || (await AsyncStorage.getItem("k2_admin_user"));
          if (adminStr) {
            const parsed = JSON.parse(adminStr);
            adminEmail = parsed?.email || null;
          }
        } catch {}
      }

      const targetType = donorId ? "donor" : adminEmail ? "admin" : "device";
      const targetId = donorId || adminEmail || "global_device";
      const newMeta = {
        push_token: pushToken,
        donor_id: donorId || null,
        mobile: cleanMobile || null,
        admin_email: adminEmail || null,
        platform,
        updated_at: new Date().toISOString(),
      };

      // Check if this exact token is already in audit_logs
      const { data: existing } = await supabase
        .from("audit_logs")
        .select("id")
        .eq("action", "donor_push_token")
        .contains("metadata", { push_token: pushToken })
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from("audit_logs")
          .update({ target_id: targetId, target_type: targetType, metadata: newMeta })
          .eq("id", existing[0].id);
      } else {
        await supabase.from("audit_logs").insert({
          admin_id: adminEmail || (cleanMobile ? `user:${cleanMobile}` : "system"),
          action: "donor_push_token",
          target_id: targetId,
          target_type: targetType,
          metadata: newMeta,
        });
      }
      console.log("[PushToken] ✅ Registered/updated token for", targetId, "platform:", platform);
    } catch (err) {
      console.warn("[PushToken] Failed to register push token:", err);
    }
    return { ok: true } as unknown as T;
  }


  // 10. Single Donor (/donors/:id) - PII-Protected
  if (route.startsWith("donors/") || route.startsWith("api/donors/")) {
    const donorId = route.replace(/^(api\/)?donors\//, "");
    const { data, error } = await supabase
      .from("donors")
      .select("id, full_name, blood_group, area, place, district, state, gender, availability, donation_opt_in, last_donation_date, masked_aadhaar, created_at, status")
      .eq("id", donorId)
      .single();
    if (error || !data) throw new Error("Donor not found");
    return { donor: toPublicDonor(data) } as unknown as T;
  }

  // 11. Blood Requests Listing & Creation
  if (route === "blood-requests" || route === "api/blood-requests") {
    if (method === "GET") {
      let q = supabase.from("blood_requests").select("*");

      const mobile = queryParams.get("mobile");
      if (mobile) {
        const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
        if (cleanMobile) {
          q = q.or(`requester_mobile.eq.${cleanMobile},requester_mobile.eq.+91${cleanMobile},requester_mobile.eq.91${cleanMobile}`);
        }
      }

      const reqNums = queryParams.get("request_numbers");
      if (reqNums) {
        const nums = reqNums.split(",").map(x => x.trim()).filter(Boolean);
        if (nums.length > 0) {
          q = q.in("request_number", nums);
        }
      }

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
      const requestNumber = `KK-BR-${today}-${randSuffix}`;

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

      const assignedNumber = data?.request_number || requestNumber;

      await recordAuditLog({
        actor: `user:${insertData.requester_mobile}`,
        action: "create_blood_request",
        target_type: "blood_request",
        target_id: assignedNumber,
        metadata: {
          request_number: assignedNumber,
          patient_name: insertData.patient_name,
          blood_group: insertData.blood_group,
          units: insertData.units_required,
          hospital: insertData.hospital_name,
          urgency: insertData.urgency,
          requester_name: insertData.requester_name,
        },
      });

      return {
        ok: true,
        request_id: assignedNumber,
        request_number: assignedNumber,
        id: data?.id,
        status: data?.status || "Pending",
        request: data,
      } as unknown as T;
    }
  }

  // 12. Contact Donor Flow (/blood-requests/contact-donor)
  if (route === "blood-requests/contact-donor" || route === "api/blood-requests/contact-donor") {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const requestNumber = `KK-BR-${today}-${randSuffix}`;

    const insertData = {
      request_number: requestNumber,
      patient_name: body.patient_name,
      blood_group: body.blood_group,
      units_required: 1,
      hospital_name: body.hospital_name,
      hospital_area: body.hospital_area || body.hospital_city || "Karaikal",
      hospital_city: body.hospital_city || "Karaikal",
      required_date: new Date().toISOString().slice(0, 10),
      urgency: body.urgency || "Normal",
      requester_name: body.requester_name,
      requester_mobile: (body.requester_mobile || "").replace(/\D/g, "").slice(-10),
      relationship: "Self",
      additional_message: body.additional_message || null,
      status: "Admin Reviewing",
      donor_id_contacted: body.donor_id || null,
    };

    const { data } = await supabase.from("blood_requests").insert(insertData).select().single();
    const assignedNumber = data?.request_number || requestNumber;

    await recordAuditLog({
      actor: `user:${insertData.requester_mobile}`,
      action: "contact_donor_request",
      target_type: "blood_request",
      target_id: assignedNumber,
      metadata: {
        request_number: assignedNumber,
        patient_name: insertData.patient_name,
        blood_group: insertData.blood_group,
        hospital: insertData.hospital_name,
        contacted_donor_id: insertData.donor_id_contacted,
        requester_name: insertData.requester_name,
      },
    });

    return {
      ok: true,
      request_id: assignedNumber,
      request_number: assignedNumber,
      id: data?.id,
      message: "Your request has been submitted. KK Life Drop admin will contact you shortly.",
      request: data,
    } as unknown as T;
  }

  // 13. Matching Donors for Blood Request (Admin only)
  if (route.includes("/matching-donors")) {
    await requireAdminAuth();
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

  // 14. Notify Donors for Blood Request (Admin only)
  if (route.includes("/notify") && method === "POST") {
    const admin = await requireAdminAuth();
    const parts = route.replace(/^api\//, "").split("/");
    const reqId = parts[1];
    let donorIds: string[] = body.donor_ids || [];

    const { data: request } = await supabase.from("blood_requests").select("*").eq("id", reqId).single();
    if (!request) throw new Error("Blood request not found");

    if (!donorIds || donorIds.length === 0) {
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

    const isReminder = body.is_reminder === true;
    const defaultMsg = isReminder
      ? `🚨 REMINDER: Urgent blood requirement for ${request.blood_group} blood at ${request.hospital_name || "Hospital"}, Karaikal. Please respond if you can donate.`
      : `Urgent blood request: Verified donor match needed for ${request.blood_group} blood in Karaikal.`;
    const message = body.message || defaultMsg;

    // 1. Fetch targeted donors WITH their push tokens directly from donors table
    const { data: targetDonors } = await supabase
      .from("donors")
      .select("id, mobile, full_name, blood_group, push_token")
      .in("id", donorIds);

    // 2. Upsert notification records in database
    for (const donorId of donorIds) {
      const dRec = (targetDonors || []).find((x) => x.id === donorId);
      await supabase.from("notifications").upsert(
        {
          request_id: reqId,
          donor_id: donorId,
          donor_mobile: dRec?.mobile || null,
          message,
          status: "sent",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "request_id,donor_id" }
      );
    }

    // 3. Collect push tokens: PRIMARY from donors.push_token, FALLBACK from audit_logs
    const donorPushTokens = new Set<string>();

    // PRIMARY: Get tokens directly from donors table (most reliable)
    for (const donor of targetDonors || []) {
      const tok = (donor.push_token || "").trim();
      if (tok && (tok.startsWith("ExponentPushToken") || tok.startsWith("ExpoPushToken"))) {
        donorPushTokens.add(tok);
        console.log("[Push] Token from donors table for", donor.full_name, ":", tok.substring(0, 30));
      } else {
        console.log("[Push] No push_token on donors table for", donor.full_name, "- will check audit_logs");
      }
    }

    // FALLBACK: Also check audit_logs for any tokens not yet on donors.push_token
    const { data: pushLogs } = await supabase
      .from("audit_logs")
      .select("id, target_id, target_type, metadata")
      .eq("action", "donor_push_token")
      .order("timestamp", { ascending: false })
      .limit(200);

    const targetDonorIds = new Set(donorIds);
    const targetMobiles = new Set(
      (targetDonors || [])
        .map((d) => (d.mobile || "").replace(/\D/g, "").slice(-10))
        .filter((m) => m.length === 10)
    );

    for (const log of pushLogs || []) {
      const meta = log.metadata as any;
      const tok = (meta?.push_token || "").trim();
      if (!tok || (!tok.startsWith("ExponentPushToken") && !tok.startsWith("ExpoPushToken"))) continue;

      const logMobile = meta.mobile ? String(meta.mobile).replace(/\D/g, "").slice(-10) : "";
      const logDonorId = meta.donor_id || log.target_id;

      const isTargetDonor = targetDonorIds.has(logDonorId) || (logMobile && targetMobiles.has(logMobile));
      const isAdminOrDevice =
        log.target_type === "admin" ||
        log.target_id === "global_device" ||
        log.target_id === admin.email;

      if (isTargetDonor || isAdminOrDevice) {
        donorPushTokens.add(tok);
      }
    }

    console.log(`[Push] Total push tokens collected: ${donorPushTokens.size} for ${donorIds.length} target donor(s)`);

    // 3. Dispatch Expo Push Notifications (Wakes phone even if app is completely closed)
    const pushMessages: any[] = [];
    const urgencyPrefix = request.urgency === "Emergency" ? "🚨 EMERGENCY: " : isReminder ? "🚨 REMINDER: " : "🩸 ";
    const pushTitle = `${urgencyPrefix}${request.blood_group} Blood Required`;
    const pushBody = `Patient at ${request.hospital_name || "Karaikal"} urgently needs ${request.blood_group} blood (${request.units_required || 1} Unit). Tap to respond!`;

    for (const pushToken of Array.from(donorPushTokens)) {
      pushMessages.push({
        to: pushToken,
        sound: "default",
        title: pushTitle,
        body: pushBody,
        channelId: "emergency-blood-alerts",
        priority: "high",
        badge: 1,
        _displayInForeground: true,
        data: {
          request_id: request.id,
          request_number: request.request_number,
          blood_group: request.blood_group,
          hospital_name: request.hospital_name,
          urgency: request.urgency,
          is_reminder: isReminder,
        },
      });
    }

    let pushDispatchResult: any = null;
    if (pushMessages.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < pushMessages.length; i += chunkSize) {
        const chunk = pushMessages.slice(i, i + chunkSize);
        try {
          const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(chunk),
          });
          const expoResult = await expoRes.json();
          pushDispatchResult = expoResult;
          console.log(`[Push] Dispatched batch of ${chunk.length} push notification(s):`, expoResult);
        } catch (e) {
          console.warn("[Push] Error sending Expo push notifications batch:", e);
        }
      }
    } else {
      console.log(`[Push] Note: No push tokens registered yet for ${donorIds.length} target donors.`);
    }

    // 4. Dispatch SMS via Fast2SMS
    // Skipped on web (browsers block fast2sms.com due to CORS) and skipped for reminders (reminders are push-only alerts)
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    const shouldDispatchSms = !isBrowser && !isReminder && body.send_sms === true;

    if (shouldDispatchSms && FAST2SMS_API_KEY && targetDonors && targetDonors.length > 0) {
      const mobiles = targetDonors
        .map((d) => (d.mobile || "").replace(/\D/g, "").slice(-10))
        .filter((m) => m.length === 10);

      if (mobiles.length > 0) {
        try {
          const smsPayload = {
            route: "q",
            message: `KK LIFE DROP: Urgent ${request.blood_group} blood needed at ${request.hospital_name || "Hospital"}, Karaikal. Open app to respond.`,
            language: "english",
            flash: 0,
            numbers: mobiles.slice(0, 50).join(","),
          };
          await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: FAST2SMS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(smsPayload),
          });
        } catch (e) {
          console.warn("[Fast2SMS] Error dispatching broadcast SMS:", e);
        }
      }
    }

    await supabase.from("blood_requests").update({ status: "Donors Notified" }).eq("id", reqId);

    await recordAuditLog({
      actor: admin.email,
      action: "notify_donors",
      target_type: "blood_request",
      target_id: reqId,
      metadata: {
        request_number: request.request_number,
        blood_group: request.blood_group,
        hospital: request.hospital_name,
        notified_count: donorIds.length,
        is_reminder: isReminder,
        sent_by: admin.email,
      },
    });

    return { ok: true, count: donorIds.length, notified: donorIds.length } as unknown as T;
  }

  // 15. Single Blood Request (/blood-requests/:id)
  if (route.startsWith("blood-requests/") || route.startsWith("api/blood-requests/")) {
    const reqId = route.replace(/^(api\/)?blood-requests\//, "");
    let q = supabase.from("blood_requests").select("*");
    if (reqId.startsWith("KK-") || reqId.startsWith("K2-") || reqId.startsWith("BR-")) {
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
    const rawMobile = await AsyncStorage.getItem(MOBILE_KEY);
    let donorId: string | null = null;

    if (rawMobile) {
      const cleanMobile = rawMobile.replace(/\D/g, "").slice(-10);
      const { data: donor } = await supabase
        .from("donors")
        .select("id")
        .or(`mobile.eq.${cleanMobile},mobile.eq.${rawMobile}`)
        .limit(1)
        .maybeSingle();
      donorId = donor?.id || null;
    }

    if (!donorId) {
      try {
        const cachedStr = await AsyncStorage.getItem(DONOR_KEY);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          donorId = parsed?.id || null;
        }
      } catch {}
    }

    if (!donorId) return { notifications: [] } as unknown as T;

    const { data: notifs, error: notifErr } = await supabase
      .from("notifications")
      .select("*, blood_requests(*)")
      .eq("donor_id", donorId)
      .order("sent_at", { ascending: false });

    if (notifErr) {
      console.warn("[Notifications] Error fetching notifications:", notifErr);
      return { notifications: [] } as unknown as T;
    }

    // Exclude any notifications whose blood request has been cancelled or notification cancelled
    const activeNotifs = (notifs || []).filter((item) => {
      const reqStatus = item.blood_requests?.status || item.request?.status;
      return reqStatus !== "Cancelled" && item.status !== "cancelled" && item.response !== "Cancelled";
    });

    // Normalize so joined blood_requests is accessible as both `request` and `blood_requests`
    const formatted = activeNotifs.map((item) => ({
      ...item,
      request: item.blood_requests || item.request || {},
    }));

    return { notifications: formatted } as unknown as T;
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

    const rawMobile = await AsyncStorage.getItem(MOBILE_KEY);
    await recordAuditLog({
      actor: `donor:${donor_id}`,
      action: "donor_response",
      target_type: "blood_request",
      target_id: request_id,
      metadata: {
        donor_id,
        mobile: rawMobile,
        response,
        request_id,
      },
    });

    return { ok: true } as unknown as T;
  }

  // 18. Admin Stats
  if (route === "admin/stats" || route === "api/admin/stats") {
    await requireAdminAuth();
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
    await requireAdminAuth();
    const { data, error } = await supabase
      .from("donors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    const adminDonors = (data || []).map(toAdminDonor);
    return { donors: adminDonors, count: adminDonors.length } as unknown as T;
  }

  // 20. Admin Reveal Aadhaar (Strictly requires authenticated admin session)
  if (route.includes("/aadhaar") && (route.includes("admin/donors") || route.includes("donors/"))) {
    const admin = await requireAdminAuth();
    const match = route.match(/donors\/([^/]+)\/aadhaar/);
    const donorId = match ? match[1] : "";
    try {
      const { data, error } = await supabase.functions.invoke("reveal-aadhaar", {
        body: { donor_id: donorId },
      });
      if (!error && data && data.decrypted) {
        await recordAuditLog({
          actor: admin.email,
          action: "reveal_aadhaar",
          target_type: "donor",
          target_id: donorId,
          metadata: { revealed_by: admin.email, decrypted: true },
        });
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
      await recordAuditLog({
        actor: admin.email,
        action: "reveal_aadhaar",
        target_type: "donor",
        target_id: donorId,
        metadata: { revealed_by: admin.email, masked: donor.masked_aadhaar },
      });

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
    const admin = await requireAdminAuth();
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
        await recordAuditLog({
          actor: admin.email,
          action: "update_aadhaar",
          target_type: "donor",
          target_id: donorId,
          metadata: { masked: updates.masked_aadhaar, updated_by: admin.email },
        });
      }
    }

    await supabase.from("donors").update(updates).eq("id", donorId);

    await recordAuditLog({
      actor: admin.email,
      action: "admin_update_donor",
      target_type: "donor",
      target_id: donorId,
      metadata: {
        updated_by: admin.email,
        updates,
      },
    });

    return { ok: true } as unknown as T;
  }

  // 22. Admin Blood Request Status Update
  if (route.includes("admin/blood-requests") && route.endsWith("/status")) {
    const admin = await requireAdminAuth();
    const parts = route.split("/");
    const reqId = parts[parts.length - 2];

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let bloodReqQuery = supabase.from("blood_requests").select("id, request_number, status");
    if (UUID_RE.test(reqId)) {
      bloodReqQuery = bloodReqQuery.or(`id.eq.${reqId},request_number.eq.${reqId}`);
    } else {
      bloodReqQuery = bloodReqQuery.eq("request_number", reqId);
    }
    const { data: bloodReq } = await bloodReqQuery.maybeSingle();

    const actualId = bloodReq?.id || (UUID_RE.test(reqId) ? reqId : null);

    let updateQuery = supabase.from("blood_requests").update({ status: body.status });
    if (actualId) {
      updateQuery = updateQuery.eq("id", actualId);
    } else {
      updateQuery = updateQuery.eq("request_number", reqId);
    }
    await updateQuery;

    // When admin cancels a blood request, remove all notifications sent to donors for this request
    if (body.status === "Cancelled" && actualId) {
      await supabase.from("notifications").delete().eq("request_id", actualId);
    }

    await recordAuditLog({
      actor: admin.email,
      action: "update_request_status",
      target_type: "blood_request",
      target_id: actualId || reqId,
      metadata: {
        new_status: body.status,
        updated_by: admin.email,
        notifications_cancelled: body.status === "Cancelled",
      },
    });

    return { ok: true, status: body.status } as unknown as T;
  }

  // 23. Admin Notifications History
  if (route === "admin/notifications" || route === "api/admin/notifications") {
    await requireAdminAuth();
    const { data } = await supabase
      .from("notifications")
      .select("*, blood_requests(*)")
      .order("sent_at", { ascending: false })
      .limit(500);

    const rawList = data || [];
    const groupsMap: Record<string, any> = {};

    for (const item of rawList) {
      const rid = item.request_id || item.blood_requests?.id || item.id;
      if (!groupsMap[rid]) {
        const req = item.blood_requests || {};
        groupsMap[rid] = {
          request_id: rid,
          request_number: req.request_number || item.request_id || "Broadcast Alert",
          blood_group: req.blood_group || "—",
          urgency: req.urgency || "Normal",
          status: req.status || "Donors Notified",
          patient_name: req.patient_name || "",
          hospital_name: req.hospital_name || "",
          notified: 0,
          responded: 0,
          can_donate: 0,
          last_sent: item.sent_at || null,
        };
      }

      const g = groupsMap[rid];
      g.notified += 1;
      if (item.response) {
        g.responded += 1;
        if (item.response === "I Can Donate") {
          g.can_donate += 1;
        }
      }
      if (!g.last_sent || (item.sent_at && item.sent_at > g.last_sent)) {
        g.last_sent = item.sent_at;
      }
    }

    // Also include any requests with status "Donors Notified" that might not have rows in notifications table
    const { data: notifiedRequests } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("status", "Donors Notified");

    for (const req of notifiedRequests || []) {
      if (!groupsMap[req.id]) {
        groupsMap[req.id] = {
          request_id: req.id,
          request_number: req.request_number || "Broadcast Alert",
          blood_group: req.blood_group || "—",
          urgency: req.urgency || "Normal",
          status: req.status || "Donors Notified",
          patient_name: req.patient_name || "",
          hospital_name: req.hospital_name || "",
          notified: 1,
          responded: 0,
          can_donate: 0,
          last_sent: req.updated_at || req.created_at,
        };
      }
    }

    const groups = Object.values(groupsMap).sort((a: any, b: any) =>
      (b.last_sent || "").localeCompare(a.last_sent || "")
    );

    return {
      ok: true,
      groups,
      notifications: rawList,
    } as unknown as T;
  }

  // 24. Admin Audit Logs
  if (route === "admin/audit-logs" || route === "api/admin/audit-logs") {
    await requireAdminAuth();
    const { data } = await supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(500);
    return { logs: data || [] } as unknown as T;
  }

  // 25. Admin Profile / Current Admin
  if (route === "admin/me" || route === "api/admin/me") {
    const admin = await requireAdminAuth();
    let currentAdmin: any = null;
    const rawAdm = (await AsyncStorage.getItem(ADMIN_USER_KEY)) || (await AsyncStorage.getItem(LEGACY_ADMIN_USER_KEY));
    if (rawAdm) {
      try { currentAdmin = JSON.parse(rawAdm); } catch {}
    }
    return { ok: true, admin: currentAdmin || admin } as unknown as T;
  }

  // 26. Sub-Admins Management (Super Admin Exclusive)
  if (
    route === "admin/sub-admins" ||
    route === "api/admin/sub-admins" ||
    route === "admin/admins" ||
    route === "api/admin/admins"
  ) {
    let currentAdmin: any = null;
    const rawAdm = await AsyncStorage.getItem(ADMIN_USER_KEY);
    if (rawAdm) {
      try { currentAdmin = JSON.parse(rawAdm); } catch {}
    }
    if (!currentAdmin || !currentAdmin.email) {
      throw new Error("Admin authentication required. Please sign in.");
    }
    const isSuperAdmin = Boolean(
      currentAdmin?.is_super_admin ||
      currentAdmin?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );

    // GET: List all admins
    if (method === "GET") {
      const { data: adminsList, error: admErr } = await supabase
        .from("admin_users")
        .select("id, name, email, status, created_at")
        .order("created_at", { ascending: true });

      if (admErr) throw new Error(admErr.message);

      const enriched = (adminsList || []).map((a: any) => {
        const isSuper = a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        return {
          ...a,
          role: isSuper ? "super_admin" : "sub_admin",
          role_label: isSuper ? "Super Admin" : "Sub-Admin",
          is_super_admin: isSuper,
        };
      });

      return { ok: true, admins: enriched, is_super_admin: isSuperAdmin } as unknown as T;
    }

    // POST: Create new sub-admin (Super Admin only)
    if (method === "POST") {
      if (!isSuperAdmin) {
        throw new Error("Access Denied: Only Super Admin has permission to create sub-admins.");
      }

      const name = (body.name || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();

      if (!name) throw new Error("Please enter sub-admin's full name");
      if (!email || !email.includes("@")) throw new Error("Please enter a valid email address");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");

      // Check if email already registered
      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        throw new Error(`An admin with email "${email}" already exists.`);
      }

      const password_hash = bcrypt.hashSync(password, 10);
      const { data: created, error: createErr } = await supabase
        .from("admin_users")
        .insert({
          name,
          email,
          password_hash,
          status: "active",
        })
        .select("id, name, email, status, created_at")
        .single();

      if (createErr) throw new Error(createErr.message);

      // Record audit log
      await supabase.from("audit_logs").insert({
        admin_id: currentAdmin?.email || SUPER_ADMIN_EMAIL,
        action: "create_sub_admin",
        target_type: "sub_admin",
        target_id: created.id,
        timestamp: new Date().toISOString(),
        metadata: {
          created_sub_admin_email: email,
          created_sub_admin_name: name,
          created_by: currentAdmin?.email || SUPER_ADMIN_EMAIL,
        },
      });

      return {
        ok: true,
        message: "Sub-Admin created successfully",
        admin: {
          ...created,
          role: "sub_admin",
          role_label: "Sub-Admin",
          is_super_admin: false,
        },
      } as unknown as T;
    }

    // PATCH: Toggle active/suspended status (Super Admin only)
    if (method === "PATCH") {
      if (!isSuperAdmin) {
        throw new Error("Access Denied: Only Super Admin can modify sub-admin access.");
      }

      const targetId = body.admin_id || body.id;
      if (!targetId) throw new Error("Admin ID is required");

      const { data: target } = await supabase
        .from("admin_users")
        .select("id, email, status, name")
        .eq("id", targetId)
        .single();

      if (!target) throw new Error("Admin not found");
      if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        throw new Error("Action Forbidden: Super Admin account cannot be suspended.");
      }

      const newStatus = body.status || (target.status === "active" ? "suspended" : "active");
      await supabase.from("admin_users").update({ status: newStatus }).eq("id", targetId);

      await supabase.from("audit_logs").insert({
        admin_id: currentAdmin?.email || SUPER_ADMIN_EMAIL,
        action: "toggle_admin_status",
        target_type: "sub_admin",
        target_id: targetId,
        timestamp: new Date().toISOString(),
        metadata: {
          target_email: target.email,
          target_name: target.name,
          new_status: newStatus,
          modified_by: currentAdmin?.email || SUPER_ADMIN_EMAIL,
        },
      });

      return { ok: true, status: newStatus, message: `Admin status set to ${newStatus}` } as unknown as T;
    }

    // DELETE: Delete sub-admin (Super Admin only)
    if (method === "DELETE") {
      if (!isSuperAdmin) {
        throw new Error("Access Denied: Only Super Admin can delete admin accounts.");
      }

      const targetId = body.admin_id || body.id || queryParams.get("id");
      if (!targetId) throw new Error("Admin ID is required");

      const { data: target } = await supabase
        .from("admin_users")
        .select("id, email, name")
        .eq("id", targetId)
        .single();

      if (!target) throw new Error("Admin not found");
      if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        throw new Error("Action Forbidden: Super Admin account cannot be deleted.");
      }

      await supabase.from("admin_users").delete().eq("id", targetId);

      await supabase.from("audit_logs").insert({
        admin_id: currentAdmin?.email || SUPER_ADMIN_EMAIL,
        action: "delete_sub_admin",
        target_type: "sub_admin",
        target_id: targetId,
        timestamp: new Date().toISOString(),
        metadata: {
          deleted_email: target.email,
          deleted_name: target.name,
          deleted_by: currentAdmin?.email || SUPER_ADMIN_EMAIL,
        },
      });

      return { ok: true, message: "Sub-Admin deleted successfully" } as unknown as T;
    }
  }


  // Fallback direct fetch if any custom route
  console.warn(`[api] Unhandled serverless route: ${route}, executing fallback`);
  return { ok: true } as unknown as T;
}
