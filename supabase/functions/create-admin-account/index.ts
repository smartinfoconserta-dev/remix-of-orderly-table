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
    // Verify caller is master
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

    // Verify the caller is a master user
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

    // Check master role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: masterRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "master")
      .maybeSingle();

    if (!masterRole) {
      return new Response(JSON.stringify({ error: "Apenas Master pode criar contas Admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, storeName, storeSlug } = await req.json();

    if (!email || !password || !storeName || !storeSlug) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, storeName, storeSlug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Falha ao criar usuário" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // 2. Add admin role
    await adminClient.from("user_roles").insert({ user_id: userId, role: "admin" });

    // 3. Create store
    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .insert({ name: storeName, slug: storeSlug, owner_id: userId })
      .select("id")
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: storeError?.message ?? "Falha ao criar loja" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Add store membership
    await adminClient.from("store_members").insert({
      user_id: userId,
      store_id: store.id,
      role_in_store: "owner",
    });

    // 5. Create default restaurant_config for the store
    await adminClient.from("restaurant_config").insert({
      store_id: store.id,
      nome_restaurante: storeName,
    });

    // 6. Create default restaurant_license for the store
    await adminClient.from("restaurant_license").insert({
      store_id: store.id,
      nome_cliente: storeName,
    });

    return new Response(
      JSON.stringify({ ok: true, userId, storeId: store.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
