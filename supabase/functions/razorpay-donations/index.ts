import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://uurkvfeguglvcjqgcway.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

// Helper: HMAC SHA-256 for Razorpay Signature Verification
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const data = encoder.encode(`${orderId}|${paymentId}`);
    const hashBuffer = await crypto.subtle.sign("HMAC", key, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const generatedHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return generatedHex === signature;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const action = body.action || "create_order";

    // -------------------------------------------------------------------------
    // 1. CREATE ORIGINAL RAZORPAY ORDER DIRECTLY WITH RAZORPAY API
    // -------------------------------------------------------------------------
    if (action === "create_order") {
      const amount = Number(body.amount || 0);
      if (amount < 1) {
        return new Response(
          JSON.stringify({ error: "Donation amount must be at least ₹1" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return new Response(
          JSON.stringify({
            error: "Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
            needs_keys: true,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const amountPaise = Math.round(amount * 100);
      const receiptTag = `kk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Direct call to official Razorpay Orders API
      const authStr = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authStr}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: receiptTag,
          notes: {
            organization: "Kaarai Karangal Samooga Sevai Amaippu",
            registration_no: "Reg. No. 31/2025",
            purpose: body.purpose || "Emergency Blood Logistics & Patient Care",
            donor_name: body.donor_name || "Anonymous Lifesaver",
            donor_mobile: body.donor_mobile || "",
          },
        }),
      });

      const rzpData = await rzpRes.json();

      if (!rzpRes.ok) {
        console.error("Razorpay API Order Error:", rzpData);
        return new Response(
          JSON.stringify({
            error: rzpData.error?.description || "Failed to create Razorpay order",
            details: rzpData.error,
          }),
          { status: rzpRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          order_id: rzpData.id,
          amount,
          amount_paise: amountPaise,
          currency: rzpData.currency || "INR",
          key_id: RAZORPAY_KEY_ID,
          organization: "Kaarai Karangal Samooga Sevai Amaippu",
          registration_no: "Reg. No. 31/2025",
          purpose: body.purpose || "Emergency Blood Logistics",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 2. VERIFY PAYMENT SIGNATURE & ISSUE OFFICIAL 80G RECEIPT
    // -------------------------------------------------------------------------
    if (action === "verify_payment") {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        amount,
        donor_name,
        donor_mobile,
        donor_email,
        donor_pan,
        purpose,
        is_anonymous,
      } = body;

      if (!razorpay_payment_id || !razorpay_order_id) {
        return new Response(
          JSON.stringify({ error: "Missing razorpay_payment_id or razorpay_order_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify HMAC SHA-256 signature
      if (RAZORPAY_KEY_SECRET && razorpay_signature) {
        const isValid = await verifyRazorpaySignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          RAZORPAY_KEY_SECRET
        );
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid Razorpay payment signature. Tampering detected." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const receiptNo = `KK-DON-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const donationRecord = {
        receipt_number: receiptNo,
        donor_name: donor_name || "Anonymous Lifesaver",
        donor_mobile: donor_mobile || null,
        donor_email: donor_email || null,
        donor_pan: donor_pan ? donor_pan.toUpperCase() : null,
        amount: Number(amount || 0),
        currency: "INR",
        purpose: purpose || "Emergency Blood Logistics & Patient Care",
        is_anonymous: Boolean(is_anonymous),
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        status: "completed",
        created_at: new Date().toISOString(),
      };

      // Insert directly into Supabase public.donations
      const { data: inserted, error: insertErr } = await supabase
        .from("donations")
        .insert(donationRecord)
        .select()
        .single();

      if (insertErr) {
        console.error("Supabase donations insert error:", insertErr);
      }

      // Record in audit_logs
      await supabase.from("audit_logs").insert({
        action: "voluntary_donation_received",
        target_type: "donation",
        target_id: receiptNo,
        timestamp: new Date().toISOString(),
        metadata: {
          amount: donationRecord.amount,
          donor_name: donationRecord.donor_name,
          purpose: donationRecord.purpose,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_order_id: razorpay_order_id,
        },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          receipt_number: receiptNo,
          amount: donationRecord.amount,
          currency: "INR",
          donor_name: donationRecord.donor_name,
          purpose: donationRecord.purpose,
          payment_id: razorpay_payment_id,
          created_at: donationRecord.created_at,
          organization: "Kaarai Karangal Samooga Sevai Amaippu",
          registration_no: "Reg. No. 31/2025",
          message: "Thank you for supporting Kaarai Karangal! Your voluntary donation powers emergency blood delivery.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 3. DONATION STATS
    // -------------------------------------------------------------------------
    if (action === "get_stats") {
      const { data, error } = await supabase
        .from("donations")
        .select("receipt_number,donor_name,amount,purpose,is_anonymous,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      let total = 0;
      const recent = (data || []).map((d: any) => {
        total += Number(d.amount || 0);
        return {
          name: d.is_anonymous ? "Anonymous" : d.donor_name,
          amount: Number(d.amount || 0),
          purpose: d.purpose,
          date: d.created_at,
        };
      });

      return new Response(
        JSON.stringify({
          total_amount: Math.round(total * 100) / 100,
          donor_count: (data || []).length,
          recent_donors: recent,
          organization: "Kaarai Karangal Samooga Sevai Amaippu",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action "${action}"` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Razorpay donations edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
