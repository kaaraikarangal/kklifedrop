import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://uurkvfeguglvcjqgcway.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const AADHAAR_FERNET_KEY = Deno.env.get("AADHAAR_FERNET_KEY") || "bzfIVNHK2oUbDk0mD4DVnbTLN9BZ94har2SH4S9n5zc=";

async function decryptFernet(tokenB64: string, keyB64: string): Promise<string> {
  const binaryKey = atob(keyB64);
  const keyBytes = new Uint8Array(binaryKey.length);
  for (let i = 0; i < binaryKey.length; i++) {
    keyBytes[i] = binaryKey.charCodeAt(i);
  }
  const encKeyRaw = keyBytes.slice(16, 32);

  // Normalize base64url to base64
  let normalized = tokenB64.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) normalized += "=";
  const binaryToken = atob(normalized);
  const tokenBytes = new Uint8Array(binaryToken.length);
  for (let i = 0; i < binaryToken.length; i++) {
    tokenBytes[i] = binaryToken.charCodeAt(i);
  }

  // Fernet structure: 1 byte version (0x80), 8 bytes timestamp, 16 bytes IV, ciphertext, 32 bytes HMAC
  const iv = tokenBytes.slice(9, 25);
  const ciphertext = tokenBytes.slice(25, tokenBytes.length - 32);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encKeyRaw,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let donorId = "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      donorId = body.donor_id || body.donorId || "";
    } else {
      const url = new URL(req.url);
      donorId = url.searchParams.get("donor_id") || url.searchParams.get("id") || "";
    }

    if (!donorId) {
      return new Response(
        JSON.stringify({ error: "Missing donor_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: donor, error: fetchErr } = await supabase
      .from("donors")
      .select("id, full_name, masked_aadhaar, encrypted_aadhaar")
      .eq("id", donorId)
      .single();

    if (fetchErr || !donor) {
      return new Response(
        JSON.stringify({ error: "Donor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawNumber = "";
    let decrypted = false;

    if (donor.encrypted_aadhaar) {
      if (donor.encrypted_aadhaar.startsWith("gAAAAA")) {
        try {
          rawNumber = await decryptFernet(donor.encrypted_aadhaar, AADHAAR_FERNET_KEY);
          decrypted = true;
        } catch (decErr) {
          console.error("Fernet decrypt error:", decErr);
        }
      } else if (donor.encrypted_aadhaar.startsWith("ENCR_")) {
        rawNumber = donor.encrypted_aadhaar.replace("ENCR_", "");
        decrypted = true;
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      id: crypto.randomUUID(),
      action: "reveal_aadhaar",
      target_type: "donor",
      target_id: donorId,
      timestamp: new Date().toISOString(),
      metadata: {
        donor_name: donor.full_name,
        masked: donor.masked_aadhaar,
        decrypted,
      },
    });

    if (decrypted && rawNumber && rawNumber.length >= 12) {
      const clean = rawNumber.replace(/\D/g, "");
      const formatted = `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
      return new Response(
        JSON.stringify({
          aadhaar: formatted,
          masked: donor.masked_aadhaar,
          decrypted: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        aadhaar: null,
        masked: donor.masked_aadhaar,
        decrypted: false,
        error: "Unable to decrypt Aadhaar token. Please re-enter 12-digit Aadhaar to re-encrypt.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
