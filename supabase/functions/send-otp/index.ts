import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const FAST2SMS_API_KEY = Deno.env.get("FAST2SMS_API_KEY") || "rO09Unsxw1b7cXI4fZE3YvQWSACLFNoMtB26hezkymDPdgjlJimuenxOJjTL3Mhq2atf5IlyB8wG6r4D";
const FAST2SMS_OTP_ID = Deno.env.get("FAST2SMS_OTP_ID") || "0eaf711751";
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
    const { mobile, channel } = await req.json();
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

    if (recentOtps && recentOtps.length > 0 && /^\d{6}$/.test(recentOtps[0].otp_hash)) {
      otp = recentOtps[0].otp_hash;
      expiresAt = recentOtps[0].expires_at;
    } else {
      // 6-digit cryptographically random OTP
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      otp = (100000 + (array[0] % 900000)).toString();
      // 10 minutes validity matching the DLT template
      expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("otps").insert({
        mobile: cleanMobile,
        otp_hash: otp,
        attempts: 0,
        verified: false,
        expires_at: expiresAt,
      });
    }

    // 3. Dispatch OTP via Fast2SMS
    // Primary: SMS OTP API (https://www.fast2sms.com/dev/otp/send)
    // Fallback: WhatsApp API (template / session) if SMS fails or whatsapp requested
    const fast2smsHeaders = {
      "authorization": FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    };

    let delivered = false;
    let deliveryChannel = "sms";
    let deliveryMessage = "Verification code sent via SMS successfully";
    let fallbackUsed = false;
    let requestId = "";

    // If channel is not explicitly requested as WhatsApp, try SMS first
    if (channel !== "whatsapp") {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/otp/send", {
          method: "POST",
          headers: fast2smsHeaders,
          body: JSON.stringify({
            mobile: cleanMobile,
            otp_id: FAST2SMS_OTP_ID,
            otp_expiry: 10,
            otp_length: 6,
            otp: otp,
            variables_values: `${otp}|10`,
          }),
        });
        const smsData = await smsRes.json();
        if (smsData?.return === true || smsData?.status_code === 200) {
          delivered = true;
          deliveryChannel = "sms";
          requestId = smsData.request_id || "";
          deliveryMessage = "Verification code sent via SMS successfully";
        }
      } catch (smsErr) {
        console.error("Fast2SMS SMS Error:", smsErr);
      }
    }

    // Fallback to WhatsApp if SMS failed or channel === "whatsapp"
    if (!delivered) {
      if (channel !== "whatsapp") {
        fallbackUsed = true;
      }
      deliveryChannel = "whatsapp";

      // A. WhatsApp Template API
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
          requestId = templateData.request_id || "";
          deliveryMessage = fallbackUsed
            ? "SMS delivery unavailable. Verification code sent to WhatsApp successfully"
            : "Verification code sent to your WhatsApp successfully";
        }
      } catch (templateErr) {
        console.error("Fast2SMS WhatsApp Template Error:", templateErr);
      }

      // B. WhatsApp Session API Fallback
      if (!delivered) {
        try {
          const sessionRes = await fetch("https://www.fast2sms.com/dev/whatsapp-session", {
            method: "POST",
            headers: fast2smsHeaders,
            body: JSON.stringify({
              phone_number_id: FAST2SMS_PHONE_NUMBER_ID,
              to: cleanMobile,
              type: "text",
              text: `Your OTP for verification on KK Life Drop is ${otp}. Valid for 10 minutes. Please do not share this OTP with anyone. - Kaarai Karangal Samooga Sevai Amaippu`,
            }),
          });
          const sessionData = await sessionRes.json();
          if (sessionData?.return === true) {
            delivered = true;
            requestId = sessionData.request_id || "";
            deliveryMessage = fallbackUsed
              ? "SMS delivery unavailable. Verification code sent to WhatsApp successfully"
              : "Verification code sent to your WhatsApp successfully";
          }
        } catch (sessionErr) {
          console.error("Fast2SMS WhatsApp Session Error:", sessionErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        channel: deliveryChannel,
        message: deliveryMessage,
        delivered: delivered,
        sms_delivered: deliveryChannel === "sms" && delivered,
        whatsapp_delivered: deliveryChannel === "whatsapp" && delivered,
        fallback_used: fallbackUsed,
        request_id: requestId,
        expires_in_minutes: 10,
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
