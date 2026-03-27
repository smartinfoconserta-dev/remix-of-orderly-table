import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin/master/owner of the store
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, name, role, storeId, pin } = await req.json();

    if (!email || !password || !name || !role || !storeId) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, name, role, storeId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has access to this store (master or store member)
    const { data: masterRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "master")
      .maybeSingle();

    if (!masterRole) {
      const { data: membership } = await adminClient
        .from("store_members")
        .select("id, role_in_store")
        .eq("user_id", caller.id)
        .eq("store_id", storeId)
        .maybeSingle();

      if (!membership || !["owner", "admin", "gerente"].includes(membership.role_in_store)) {
        return new Response(JSON.stringify({ error: "Sem permissão para gerenciar equipe desta loja" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 1. Create auth user (or reuse existing)
    let userId: string;
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (createError) {
      // If user already exists, find and reuse
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existing = users?.find((u: any) => u.email === email);
        if (!existing) {
          return new Response(JSON.stringify({ error: "Usuário existe mas não foi encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;
        // Update password and metadata
        await adminClient.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { name, role },
        });
      } else {
        return new Response(JSON.stringify({ error: createError.message ?? "Falha ao criar usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = newUser.user!.id;
    }

    // 2. Add store membership (upsert to handle re-adding)
    const { error: memberError } = await adminClient.from("store_members").upsert({
      user_id: userId,
      store_id: storeId,
      role_in_store: role,
    }, { onConflict: "user_id,store_id" }).select().single();

    if (memberError) {
      // Cleanup: delete the auth user if membership fails
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. If PIN provided, also create module_pin for quick auth
    if (pin && /^\d{4,6}$/.test(pin)) {
      await adminClient.rpc("create_module_pin", {
        _store_id: storeId,
        _module: role,
        _pin: pin,
        _label: name,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
