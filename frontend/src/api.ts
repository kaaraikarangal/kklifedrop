import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const TOKEN_KEY = "k2_token";
export const ROLE_KEY = "k2_role";
export const DONOR_KEY = "k2_donor";
export const MOBILE_KEY = "k2_mobile";
export const BACKEND_URL_KEY = "k2_backend_url";

export const DEFAULT_LAN_BACKEND_URL = "http://10.110.3.119:8000";
export const DEFAULT_LOCAL_BACKEND_URL = "http://localhost:8000";

let _cachedBaseUrl: string | null = null;

function sanitizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = `http://${u}`;
  }
  return u.replace(/\/+$/, "");
}

export function resolveFallbackBaseUrl(): string {
  // 1. Environment variable bundled at build time or loaded from .env
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return sanitizeUrl(envUrl);
  }

  // 2. Extra config from app.json (persisted in EAS / standalone builds)
  const extraUrl = (Constants.expoConfig?.extra?.backendUrl || (Constants as any).manifest?.extra?.backendUrl)?.trim();
  if (extraUrl && extraUrl.length > 0) {
    return sanitizeUrl(extraUrl);
  }

  // 3. Web runtime detection
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes(":8081")) {
      return sanitizeUrl(window.location.origin);
    }
    return DEFAULT_LOCAL_BACKEND_URL;
  }

  // 4. Native mobile (Android APK / iOS)
  return DEFAULT_LAN_BACKEND_URL;
}

export async function getBaseUrl(): Promise<string> {
  if (_cachedBaseUrl) return _cachedBaseUrl;
  try {
    const saved = await AsyncStorage.getItem(BACKEND_URL_KEY);
    if (saved && saved.trim().length > 0) {
      _cachedBaseUrl = sanitizeUrl(saved);
      return _cachedBaseUrl;
    }
  } catch {}

  _cachedBaseUrl = resolveFallbackBaseUrl();
  return _cachedBaseUrl;
}

export async function setCustomBackendUrl(url: string): Promise<string> {
  const sanitized = sanitizeUrl(url);
  await AsyncStorage.setItem(BACKEND_URL_KEY, sanitized);
  _cachedBaseUrl = sanitized;
  return sanitized;
}

export async function resetBackendUrl(): Promise<string> {
  await AsyncStorage.removeItem(BACKEND_URL_KEY);
  _cachedBaseUrl = resolveFallbackBaseUrl();
  return _cachedBaseUrl;
}

export async function testBackendConnection(targetUrl?: string): Promise<{ ok: boolean; message: string }> {
  const urlToTest = targetUrl ? sanitizeUrl(targetUrl) : await getBaseUrl();
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${urlToTest}/api/meta`, { signal: ctrl.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true, message: `Connected to ${urlToTest}` };
    }
    return { ok: false, message: `Server replied with HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: `Cannot reach ${urlToTest} (${err?.message || "Unreachable"})` };
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

type Opts = { auth?: boolean; method?: string; body?: any };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const base = await getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${base}/api${cleanPath}`;

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("Network request failed") || err?.name === "TypeError") {
      throw new Error(
        `Cannot reach backend server at ${base}. Please ensure the server is online and accessible on this network.`
      );
    }
    throw err;
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const detail = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}
