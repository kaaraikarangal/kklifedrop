import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "https://uurkvfeguglvcjqgcway.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "sb_publishable_N9vaiLh_RNCgb9xN6Ec1gw_XHoQ9TEG";

export const FAST2SMS_API_KEY =
  process.env.EXPO_PUBLIC_FAST2SMS_API_KEY?.trim() ||
  "rO09Unsxw1b7cXI4fZE3YvQWSACLFNoMtB26hezkymDPdgjlJimuenxOJjTL3Mhq2atf5IlyB8wG6r4D";

export const FAST2SMS_MESSAGE_ID =
  process.env.EXPO_PUBLIC_FAST2SMS_MESSAGE_ID?.trim() || "35846";

export const FAST2SMS_PHONE_NUMBER_ID =
  process.env.EXPO_PUBLIC_FAST2SMS_PHONE_NUMBER_ID?.trim() || "1281701878369604";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
