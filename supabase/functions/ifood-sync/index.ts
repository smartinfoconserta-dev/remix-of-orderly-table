import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";
const IFOOD_AUTH = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token";

// ── Auth: get iFood access token ──
async function getIfoodToken(): Promise<string> {
  const clientId = Deno.env.get("IFOOD_CLIENT_ID");
  const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("iFood credentials not configured");

  const res = await fetch(IFOOD_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grantType: "client_credentials",
      clientId,
      clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`iFood auth failed [${res.status}]: ${body}`);
  }

  const data = await res.json();
  return data.accessToken;
}

// ── Poll events ──
async function pollEvents(token: string, merchantId: string): Promise<any[]> {
  const url = `${IFOOD_API}/events/v1.0/events:polling`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-polling-merchants": merchantId,
    },
  });

  if (res.status === 204) return []; // no events
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`iFood polling failed [${res.status}]: ${body}`);
  }

  return await res.json();
}

// ── Acknowledge events ──
async function ackEvents(token: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const url = `${IFOOD_API}/events/v1.0/events/acknowledgment`;
  const body = eventIds.map((id) => ({ id }));
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`ACK failed [${res.status}]: ${text}`);
  }
}

// ── Get order details ──
async function getOrderDetails(token: string, orderId: string): Promise<any> {
  const url = `${IFOOD_API}/order/v1.0/orders/${orderId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Order details failed [${res.status}]: ${body}`);
    return null;
  }

  return await res.json();
}

// ── Map iFood order → our pedidos schema ──
function mapIfoodOrder(order: any, storeId: string, nextNumber: number) {
  const itens = (order.items || []).map((item: any) => ({
    id: item.id || crypto.randomUUID(),
    nome: item.name || "Item iFood",
    preco: (item.totalPrice ?? item.unitPrice ?? 0) / 100, // iFood uses cents
    quantidade: item.quantity || 1,
    observacao: item.observations || "",
    origem: "ifood",
    subItems: (item.subItems || []).map((sub: any) => ({
      nome: sub.name,
      preco: (sub.totalPrice ?? 0) / 100,
      quantidade: sub.quantity || 1,
    })),
  }));

  const total = (order.total?.orderAmount ?? order.totalPrice ?? 0) / 100;

  const customer = order.customer || {};
  const delivery = order.delivery || {};
  const address = delivery.deliveryAddress || {};

  const endereco = [
    address.streetName,
    address.streetNumber ? `nº ${address.streetNumber}` : "",
    address.complement,
    address.neighborhood,
  ]
    .filter(Boolean)
    .join(", ");

  const now = new Date();

  return {
    id: order.id || crypto.randomUUID(),
    store_id: storeId,
    numero_pedido: nextNumber,
    itens: JSON.stringify(itens),
    total,
    criado_em: now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    criado_em_iso: now.toISOString(),
    origem: "ifood",
    status_balcao: "pendente_ifood",
    pronto: false,
    para_viagem: true,
    cliente_nome: customer.name || "Cliente iFood",
    cliente_telefone: customer.phone?.number || "",
    endereco_completo: endereco || null,
    bairro: address.neighborhood || null,
    referencia: address.reference || null,
    forma_pagamento_delivery: mapPayment(order.payments),
    observacao_geral: order.extraInfo || null,
    cancelado: false,
  };
}

function mapPayment(payments: any): string {
  if (!payments || !payments.methods || payments.methods.length === 0) return "ifood_online";
  const method = payments.methods[0];
  if (method.wallet) return "ifood_online";
  if (method.method === "CASH") return "dinheiro";
  if (method.method === "CREDIT") return "credito";
  if (method.method === "DEBIT") return "debito";
  return "ifood_online";
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const merchantId = Deno.env.get("IFOOD_MERCHANT_ID");
    if (!merchantId) throw new Error("IFOOD_MERCHANT_ID not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get iFood token
    const token = await getIfoodToken();
    console.log("[ifood-sync] Authenticated with iFood");

    // 2. Poll events
    const events = await pollEvents(token, merchantId);
    console.log(`[ifood-sync] Received ${events.length} events`);

    if (events.length === 0) {
      return new Response(JSON.stringify({ message: "No new events", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Find store_id linked to this merchant
    // For now, we look for the first store that has ifood configured
    // Later this can be mapped via a config table
    let storeId: string | null = null;

    // Try to get from request body (manual trigger from admin)
    try {
      const body = await req.json();
      storeId = body.store_id || null;
    } catch { /* no body */ }

    // Fallback: get first store
    if (!storeId) {
      const { data: stores } = await supabase.from("stores").select("id").limit(1).single();
      storeId = stores?.id || null;
    }

    if (!storeId) throw new Error("No store found to link iFood orders");

    // 4. Process PLC (placed) events — new orders
    const placedEvents = events.filter(
      (e: any) => e.code === "PLC" || e.fullCode === "PLACED"
    );
    const allEventIds = events.map((e: any) => e.id);

    let inserted = 0;

    for (const event of placedEvents) {
      const orderId = event.orderId;
      if (!orderId) continue;

      // Check if already exists
      const { data: existing } = await supabase
        .from("pedidos")
        .select("id")
        .eq("id", orderId)
        .maybeSingle();

      if (existing) {
        console.log(`[ifood-sync] Order ${orderId} already exists, skipping`);
        continue;
      }

      // Get full order details
      const orderDetails = await getOrderDetails(token, orderId);
      if (!orderDetails) continue;

      // Get next order number
      const { data: nextNum } = await supabase.rpc("next_order_number", {
        _store_id: storeId,
      });

      const pedido = mapIfoodOrder(orderDetails, storeId, nextNum || 1);

      // Insert via RPC
      const { error } = await supabase.rpc("rpc_insert_pedido", {
        _data: pedido,
      });

      if (error) {
        console.error(`[ifood-sync] Insert error for ${orderId}:`, error);
      } else {
        inserted++;
        console.log(`[ifood-sync] Inserted order ${orderId} as #${pedido.numero_pedido}`);
      }
    }

    // 5. ACK all events
    await ackEvents(token, allEventIds);
    console.log(`[ifood-sync] ACKed ${allEventIds.length} events`);

    return new Response(
      JSON.stringify({
        message: "Sync complete",
        events_received: events.length,
        orders_inserted: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ifood-sync] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
