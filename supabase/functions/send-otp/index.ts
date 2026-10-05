import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const FAST2SMS_API_KEY = Deno.env.get("FAST2SMS_API_KEY") || "";
const FAST2SMS_MESSAGE_ID = Deno.env.get("FAST2SMS_MESSAGE_ID") || "35846";
const FAST2SMS_PHONE_NUMBER_ID = Deno.env.get("FAST2SMS_PHONE_NUMBER_ID") || "1281701878369604";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://uurkvfeguglvcjqgcway.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mobile } = await req.json();
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);

    if (cleanMobile.length !== 10) {
      return new Response(
        JSON.stringify({ error: "Enter a valid 10-digit mobile number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Rate limiting check (max 6 requests in 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("otps")
      .select("id", { count: "exact", head: true })
      .eq("mobile", cleanMobile)
      .gte("created_at", tenMinutesAgo);

    if ((recentCount || 0) >= 6) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please wait 10 minutes before requesting again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Reuse unexpired OTP within 45 seconds to avoid spam
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
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      otp = (100000 + (array[0] % 900000)).toString();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("otps").insert({
        mobile: cleanMobile,
        otp_hash: otp,
        attempts: 0,
        verified: false,
        expires_at: expiresAt,
      });
    }

    // 3. Dispatch OTP via Fast2SMS WhatsApp API (server-side POST with headers)
    const fast2smsHeaders = {
      "authorization": FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    };

    let delivered = false;

    // A. Template API (AUTHENTICATION template 35846)
    try {
      const templateRes = await fetch("https://www.fast2sms.com/dev/whatsapp", {
        method: "POST",
        headers: fast2smsHeaders,
        body: JSON.stringify({
          message_id: FAST2SMS_MESSAGE_ID,
          phone_number_id: FAST2SMS_PHONE_NUMBER_ID,
          numbers: cleanMobile,
          variables_values: otp,
        }),
      });
      const templateData = await templateRes.json();
      if (templateData?.return === true) {
        delivered = true;
      }
    } catch {
      // Template failed, try session fallback
    }

    // B. Session API Fallback
    if (!delivered) {
      try {
        const sessionRes = await fetch("https://www.fast2sms.com/dev/whatsapp-session", {
          method: "POST",
          headers: fast2smsHeaders,
          body: JSON.stringify({
            phone_number_id: FAST2SMS_PHONE_NUMBER_ID,
            to: cleanMobile,
            type: "text",
            text: `${otp} is your KK Life Drop verification code. For your security, do not share this code.`,
          }),
        });
        const sessionData = await sessionRes.json();
        if (sessionData?.return === true) {
          delivered = true;
        }
      } catch {
        // Session fallback failed
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Verification code sent to your WhatsApp successfully",
        whatsapp_delivered: delivered,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to process OTP request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
