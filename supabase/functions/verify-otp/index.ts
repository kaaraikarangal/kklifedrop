import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://uurkvfeguglvcjqgcway.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mobile, otp } = await req.json();
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
    const otpInput = (otp || "").trim();

    if (cleanMobile.length !== 10 || !otpInput) {
      return new Response(
        JSON.stringify({ error: "Mobile number and verification code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: otpRecords, error: otpErr } = await supabase
      .from("otps")
      .select("*")
      .eq("mobile", cleanMobile)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpErr || !otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: "No pending verification code found. Request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rec = otpRecords[0];

    // Brute-force guard: Max 5 attempts
    if ((rec.attempts || 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. This code is locked. Request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(rec.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Verification code expired (5 min validity). Request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rec.otp_hash !== otpInput) {
      const attempts = (rec.attempts || 0) + 1;
      await supabase.from("otps").update({ attempts }).eq("id", rec.id);
      const remaining = Math.max(0, 5 - attempts);
      return new Response(
        JSON.stringify({ error: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    await supabase.from("otps").update({ verified: true }).eq("id", rec.id);

    // Check if donor is registered
    const { data: donorRecords } = await supabase
      .from("donors")
      .select("*")
      .eq("mobile", cleanMobile)
      .limit(1);

    const donor = donorRecords && donorRecords.length > 0 ? donorRecords[0] : null;
    const token = `k2_usr_${cleanMobile}_${Date.now()}`;

    return new Response(
      JSON.stringify({
        ok: true,
        token,
        mobile: cleanMobile,
        is_registered: donor !== null,
        donor,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to verify code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
