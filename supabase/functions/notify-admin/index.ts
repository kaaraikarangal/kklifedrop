import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const FAST2SMS_API_KEY =
  Deno.env.get("FAST2SMS_API_KEY") ||
  "rO09Unsxw1b7cXI4fZE3YvQWSACLFNoMtB26hezkymDPdgjlJimuenxOJjTL3Mhq2atf5IlyB8wG6r4D";

const FAST2SMS_PHONE_NUMBER_ID =
  Deno.env.get("FAST2SMS_PHONE_NUMBER_ID") || "1281701878369604";

const FAST2SMS_ADMIN_ALERT_MESSAGE_ID =
  Deno.env.get("FAST2SMS_ADMIN_ALERT_MESSAGE_ID") || "45414";

const ADMIN_NOTIFY_MOBILES =
  Deno.env.get("ADMIN_NOTIFY_MOBILES") || "7867009044,9750807463";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://uurkvfeguglvcjqgcway.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const br = payload.request || payload;

    if (!br) {
      return new Response(
        JSON.stringify({ error: "Blood request data missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reqId = String(br.request_number || br.id || "KK-BR-ALERT").trim();
    const patientName = String(br.patient_name || "Patient").trim();
    const bloodGroup = String(br.blood_group || "Blood").trim();
    const units = `${br.units_required || 1} Unit(s)`;
    const hospital = `${br.hospital_name || "Hospital"}${
      br.hospital_area ? `, ${br.hospital_area}` : br.hospital_city ? `, ${br.hospital_city}` : ""
    }`.trim();
    const urgency = String(br.urgency || "Normal").trim();
    const requester = `${br.requester_name || "Requester"} (${
      (br.requester_mobile || "").replace(/\D/g, "").slice(-10) || "N/A"
    })`.trim();

    // 7 pipe-separated variables matching template admin_blood_request_alert (Message ID: 45387)
    // {{1}} Request ID | {{2}} Patient Name | {{3}} Blood Group | {{4}} Units | {{5}} Hospital | {{6}} Urgency | {{7}} Requester
    const variablesValues = `${reqId}|${patientName}|${bloodGroup}|${units}|${hospital}|${urgency}|${requester}`;

    // Dynamic recipient list from database: only active admins with receive_blood_alerts = true
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let recipientMobiles: string[] = [];

    try {
      // 1. Fetch admins opted-in for WhatsApp blood alerts
      const { data: dbAdmins } = await supabase
        .from("admin_users")
        .select("mobile, receive_blood_alerts, status")
        .eq("status", "active")
        .eq("receive_blood_alerts", true)
        .not("mobile", "is", null);

      if (dbAdmins && dbAdmins.length > 0) {
        recipientMobiles = dbAdmins
          .map((a: any) => (a.mobile || "").replace(/\D/g, "").slice(-10))
          .filter((m: string) => m.length === 10);
      }
    } catch (dbErr) {
      console.warn("[NotifyAdmin] Could not query admin_users, using env fallback:", dbErr);
    }

    // Fallback environment admin mobiles if no opted-in admins in DB
    const envAdmins = ADMIN_NOTIFY_MOBILES.split(",")
      .map((m: string) => m.replace(/\D/g, "").slice(-10))
      .filter((m: string) => m.length === 10);

    const adminMobiles = Array.from(
      new Set(recipientMobiles.length > 0 ? recipientMobiles : envAdmins)
    );

    const results: any[] = [];

    for (const mobile of adminMobiles) {
      let sent = false;
      let respData: any = null;

      // 1. Try WhatsApp Template API via official GET with URLSearchParams
      try {
        const queryParams = new URLSearchParams({
          authorization: FAST2SMS_API_KEY,
          message_id: FAST2SMS_ADMIN_ALERT_MESSAGE_ID,
          numbers: mobile,
          variables_values: variablesValues,
        });

        const res = await fetch(`https://www.fast2sms.com/dev/whatsapp?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            authorization: FAST2SMS_API_KEY,
          },
        });
        respData = await res.json();
        if (respData?.return === true) {
          sent = true;
          results.push({ mobile, channel: "whatsapp_template", success: true, data: respData });
        } else {
          console.warn(`[NotifyAdmin] Fast2SMS WhatsApp returned:`, respData);
        }
      } catch (err: any) {
        console.error(`[NotifyAdmin] Template failed for ${mobile}:`, err);
      }

      // 2. Fallback to WhatsApp Session API if template failed
      if (!sent) {
        try {
          const sessionText = `🚨 *New Blood Request Alert*\n\n• *Request ID:* ${reqId}\n• *Patient:* ${patientName}\n• *Blood Group:* ${bloodGroup}\n• *Units:* ${units}\n• *Hospital:* ${hospital}\n• *Urgency:* ${urgency}\n• *Requester:* ${requester}\n\nPlease open the Admin Dashboard to review and broadcast.`;

          const sessionRes = await fetch("https://www.fast2sms.com/dev/whatsapp-session", {
            method: "POST",
            headers: {
              "authorization": FAST2SMS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone_number_id: FAST2SMS_PHONE_NUMBER_ID,
              to: mobile,
              type: "text",
              text: sessionText,
            }),
          });
          const sessionData = await sessionRes.json();
          results.push({
            mobile,
            channel: "whatsapp_session",
            success: sessionData?.return === true,
            data: sessionData,
          });
        } catch (err: any) {
          console.error(`[NotifyAdmin] Session failed for ${mobile}:`, err);
          results.push({ mobile, channel: "whatsapp_session", success: false, error: err?.message });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Admin notification dispatched",
        recipients: adminMobiles,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
