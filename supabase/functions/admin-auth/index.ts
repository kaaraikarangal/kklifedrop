import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://uurkvfeguglvcjqgcway.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPER_ADMIN_EMAIL = "kaaraikarangal@gmail.com";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { action } = body;


    // ── 1. ADMIN LOGIN ──────────────────────────────────────────────────────────
    if (action === "login") {
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: admins, error: adminErr } = await supabase
        .from("admin_users")
        .select("id, email, password_hash, name, status")
        .eq("email", email)
        .limit(1);

      if (adminErr || !admins || admins.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid administrator credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const admin = admins[0];
      if (admin.status === "suspended") {
        return new Response(
          JSON.stringify({ error: "This administrator account has been suspended by the Super Admin." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const passwordValid = bcrypt.compareSync(password, admin.password_hash);
      if (!passwordValid) {
        return new Response(
          JSON.stringify({ error: "Invalid administrator credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isSuperAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase();
      const adminRole = isSuperAdmin ? "super_admin" : "sub_admin";
      const adminToken = `kk_adm_${admin.id}_${Date.now()}`;

      // Record audit log securely
      await supabase.from("audit_logs").insert({
        admin_id: admin.email,
        action: "admin_login",
        target_type: "admin",
        target_id: admin.email,
        timestamp: new Date().toISOString(),
        metadata: { role: adminRole, client: "edge_function_secure" },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          token: adminToken,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name || (isSuperAdmin ? "Kaarai Karangal Super Admin" : "KK Sub-Admin"),
            role: adminRole,
            is_super_admin: isSuperAdmin,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. LIST SUB-ADMINS (Safe fields only, NO password hashes) ────────────────
    if (action === "list_sub_admins") {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, email, name, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true, sub_admins: data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. CREATE SUB-ADMIN ─────────────────────────────────────────────────────
    if (action === "create_sub_admin") {
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();
      const name = (body.name || "").trim();
      const creatorEmail = (body.admin_email || SUPER_ADMIN_EMAIL).trim();

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "Name, email, and password are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "An administrator with this email already exists." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const { data: newAdmin, error: insErr } = await supabase
        .from("admin_users")
        .insert({
          email,
          name,
          password_hash: passwordHash,
          status: "active",
        })
        .select("id, email, name, status, created_at")
        .single();

      if (insErr) throw insErr;

      await supabase.from("audit_logs").insert({
        admin_id: creatorEmail,
        action: "create_sub_admin",
        target_type: "sub_admin",
        target_id: newAdmin.id,
        timestamp: new Date().toISOString(),
        metadata: { created_email: email, created_name: name },
      });

      return new Response(
        JSON.stringify({ ok: true, admin: newAdmin }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. UPDATE SUB-ADMIN STATUS ──────────────────────────────────────────────
    if (action === "update_status") {
      const { target_id, status: newStatus, admin_email } = body;
      const { data: target } = await supabase
        .from("admin_users")
        .select("id, email")
        .eq("id", target_id)
        .single();

      if (!target) throw new Error("Admin not found");
      if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Action Forbidden: Cannot modify Super Admin status." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("admin_users").update({ status: newStatus }).eq("id", target_id);
      await supabase.from("audit_logs").insert({
        admin_id: admin_email || SUPER_ADMIN_EMAIL,
        action: "update_sub_admin_status",
        target_type: "sub_admin",
        target_id,
        timestamp: new Date().toISOString(),
        metadata: { new_status: newStatus, target_email: target.email },
      });

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. DELETE SUB-ADMIN ─────────────────────────────────────────────────────
    if (action === "delete_sub_admin") {
      const { target_id, admin_email } = body;
      const { data: target } = await supabase
        .from("admin_users")
        .select("id, email, name")
        .eq("id", target_id)
        .single();

      if (!target) throw new Error("Admin not found");
      if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Action Forbidden: Super Admin account cannot be deleted." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("admin_users").delete().eq("id", target_id);
      await supabase.from("audit_logs").insert({
        admin_id: admin_email || SUPER_ADMIN_EMAIL,
        action: "delete_sub_admin",
        target_type: "sub_admin",
        target_id,
        timestamp: new Date().toISOString(),
        metadata: { deleted_email: target.email, deleted_name: target.name },
      });

      return new Response(
        JSON.stringify({ ok: true, message: "Sub-Admin deleted successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
