import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NfceItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

interface NfceRequest {
  store_id: string;
  fechamento_id: string;
  items: NfceItem[];
  payment_method: "dinheiro" | "credito" | "debito" | "pix";
  total: number;
  cpf?: string;
}

const PAYMENT_MAP: Record<string, string> = {
  dinheiro: "01",
  credito: "03",
  debito: "04",
  pix: "17",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: NfceRequest = await req.json();

    if (!body.store_id || !body.fechamento_id || !body.items?.length || !body.total) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: store_id, fechamento_id, items, total" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch NFC-e config from restaurant_config
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: config, error: cfgError } = await supabase
      .from("restaurant_config")
      .select("nfce_config, nome_restaurante")
      .eq("store_id", body.store_id)
      .single();

    if (cfgError || !config) {
      return new Response(
        JSON.stringify({ error: "Configuração do restaurante não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nfce = config.nfce_config as any;
    if (!nfce?.token || !nfce?.ambiente) {
      return new Response(
        JSON.stringify({ error: "Configuração fiscal (NFC-e) não está completa. Configure na aba Fiscal do Admin." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = nfce.ambiente === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

    const ref = `nfce-${body.fechamento_id}`;

    // Build NFC-e payload
    const itensNfce = body.items.map((item, i) => ({
      numero_item: String(i + 1),
      codigo_produto: String(i + 1).padStart(4, "0"),
      descricao: item.descricao.slice(0, 120),
      quantidade: item.quantidade,
      unidade_comercial: "UN",
      valor_unitario_comercial: item.valor_unitario,
      valor_unitario_tributario: item.valor_unitario,
      unidade_tributavel: "UN",
      codigo_ncm: "21069090",
      cfop: "5102",
      icms_situacao_tributaria: "102",
      icms_origem: "0",
      pis_situacao_tributaria: "49",
      cofins_situacao_tributaria: "49",
    }));

    const payload = {
      natureza_operacao: "VENDA AO CONSUMIDOR",
      tipo_documento: "1",
      finalidade_emissao: "1",
      presenca_comprador: "1",
      consumidor_final: "1",
      cnpj_emitente: nfce.inscricaoEstadual || undefined,
      inscricao_estadual: nfce.inscricaoEstadual || undefined,
      serie: nfce.serieNfce || "1",
      items: itensNfce,
      formas_pagamento: [
        {
          forma_pagamento: PAYMENT_MAP[body.payment_method] || "99",
          valor_pagamento: body.total,
        },
      ],
      ...(body.cpf ? { cpf_consumidor: body.cpf.replace(/\D/g, "") } : {}),
      valor_produtos: body.total,
      valor_total: body.total,
      informacoes_adicionais_contribuinte: `Pedido ${body.fechamento_id}`,
    };

    // Call Focus NFe API
    const authToken = btoa(`${nfce.token}:`);

    const response = await fetch(`${baseUrl}/v2/nfce?ref=${ref}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok || response.status === 202) {
      return new Response(
        JSON.stringify({
          success: true,
          ref,
          status: result.status,
          numero: result.numero,
          danfe_url: result.caminho_danfe || result.url_danfe || null,
          message: result.mensagem_sefaz || "NFC-e enviada com sucesso",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: result.mensagem || result.erros?.[0]?.mensagem || "Erro ao emitir NFC-e",
        details: result,
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
