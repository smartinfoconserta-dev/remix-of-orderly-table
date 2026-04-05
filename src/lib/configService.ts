import { supabase } from "@/integrations/supabase/client";
import type { SistemaConfig, LicencaConfig, CategoriaCustom, HorariosSemana } from "./adminStorage";
import { setConfigCache, setLicencaCache } from "./adminStorage";
import { getActiveStoreId } from "./sessionManager";

// ── helpers: store-scoped cache keys ──

function cacheKey(base: string, storeId?: string | null): string {
  const sid = storeId || getActiveStoreId();
  return sid ? `${base}-${sid}` : base;
}

const CONFIG_BASE = "orderly-config-v1";
const LICENCA_BASE = "orderly-licenca-v1";
const CATEGORIAS_BASE = "orderly-categorias-v1";
const SYNC_PENDING_KEY = "orderly-sync-pending-v1";

function getLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("[configService] erro:", err);
    return null;
  }
}

function setLocalCache<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function markPendingSync(entity: string) {
  try {
    const pending = JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || "{}");
    pending[entity] = Date.now();
    localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(pending));
  } catch (err) { console.error("[configService] erro:", err); }
}

function clearPendingSync(entity: string) {
  try {
    const pending = JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || "{}");
    delete pending[entity];
    localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(pending));
  } catch (err) { console.error("[configService] erro:", err); }
}

// ── Map DB row → SistemaConfig ──

function dbRowToConfig(row: any): SistemaConfig {
  return {
    nomeRestaurante: row.nome_restaurante ?? "Obsidian",
    logoUrl: row.logo_url ?? "",
    logoBase64: row.logo_base64 ?? "",
    corPrimaria: row.cor_primaria ?? "",
    banners: row.banners ?? [],
    instagramUrl: row.instagram_url ?? "",
    senhaWifi: row.senha_wifi ?? "",
    instagramBg: row.instagram_bg ?? undefined,
    wifiBg: row.wifi_bg ?? undefined,
    taxaEntrega: Number(row.taxa_entrega ?? 0),
    telefoneRestaurante: row.telefone ?? "",
    tempoEntrega: row.tempo_entrega ?? "",
    mensagemBoasVindas: row.mensagem_boas_vindas ?? "",
    deliveryAtivo: row.delivery_ativo ?? true,
    modoIdentificacaoDelivery: row.modo_identificacao_delivery ?? "visitante",
    
    couvertAtivo: row.couvert_ativo ?? false,
    couvertValor: Number(row.couvert_valor ?? 0),
    couvertObrigatorio: row.couvert_obrigatorio ?? false,
    horarioFuncionamento: row.horario_funcionamento ?? undefined,
    mensagemFechado: row.mensagem_fechado ?? undefined,
    logoEstilo: row.logo_estilo ?? "quadrada",
    impressaoPorSetor: row.impressao_por_setor ?? false,
    nomeImpressoraCozinha: row.nome_impressora_cozinha ?? undefined,
    nomeImpressoraBar: row.nome_impressora_bar ?? undefined,
    modulos: (() => {
      const m = row.modulos ?? {};
      if (m.mesas === undefined && m.balcao === undefined) {
        if (row.modo_operacao === "fast_food") {
          m.mesas = false;
          m.balcao = true;
        } else {
          m.mesas = true;
          m.balcao = false;
        }
      }
      return m;
    })(),
    plano: row.plano ?? "basico",
    modoOperacao: row.modo_operacao ?? "restaurante",
    tipoRestaurante: row.modo_operacao === "fast_food" ? "fastfood" : (row.modo_operacao === "completo" ? "completo" : "restaurante"),
    identificacaoFastFood: row.identificacao_fast_food ?? "codigo",
    cpfNotaAtivo: row.cpf_nota_ativo ?? false,
    cardapioHeaderEstilo: row.cardapio_header_estilo ?? "padrao",
    cardapioBannerBase64: row.cardapio_banner_base64 ?? "",
    temaCardapio: row.tema_cardapio ?? undefined,
    temaPersonalizado: row.tema_personalizado ?? false,
    fundoTipo: row.fundo_tipo ?? "solido",
    fundoCor: row.fundo_cor ?? undefined,
    fundoGradiente: row.fundo_gradiente ?? undefined,
    letraTipo: row.letra_tipo ?? "solido",
    letraCor: row.letra_cor ?? undefined,
    letraGradiente: row.letra_gradiente ?? undefined,
    sidebarCor: row.sidebar_cor ?? undefined,
    cardsCor: row.cards_cor ?? undefined,
    sidebarEstilo: row.sidebar_estilo ?? "icone-texto",
    totemTema: row.totem_tema ?? undefined,
    totemCorPrimaria: row.totem_cor_primaria ?? undefined,
    totemTemaPersonalizado: row.totem_tema_personalizado ?? false,
    totemFundoTipo: row.totem_fundo_tipo ?? undefined,
    totemFundoCor: row.totem_fundo_cor ?? undefined,
    totemFundoGradiente: row.totem_fundo_gradiente ?? undefined,
    totemLetraCor: row.totem_letra_cor ?? undefined,
    totemSidebarCor: row.totem_sidebar_cor ?? undefined,
    totemCardsCor: row.totem_cards_cor ?? undefined,
  };
}

function configToDbRow(config: SistemaConfig) {
  return {
    nome_restaurante: config.nomeRestaurante,
    logo_url: config.logoUrl,
    logo_base64: config.logoBase64 ?? "",
    cor_primaria: config.corPrimaria,
    banners: (config.banners ?? []) as unknown as null,
    instagram_url: config.instagramUrl ?? "",
    senha_wifi: config.senhaWifi ?? "",
    instagram_bg: config.instagramBg ?? null,
    wifi_bg: config.wifiBg ?? null,
    taxa_entrega: config.taxaEntrega ?? 0,
    telefone: config.telefoneRestaurante ?? "",
    tempo_entrega: config.tempoEntrega ?? "",
    mensagem_boas_vindas: config.mensagemBoasVindas ?? "",
    delivery_ativo: config.deliveryAtivo ?? true,
    modo_identificacao_delivery: config.modoIdentificacaoDelivery ?? "visitante",
    
    couvert_ativo: config.couvertAtivo ?? false,
    couvert_valor: config.couvertValor ?? 0,
    couvert_obrigatorio: config.couvertObrigatorio ?? false,
    horario_funcionamento: (config.horarioFuncionamento ?? null) as unknown as null,
    mensagem_fechado: config.mensagemFechado ?? null,
    logo_estilo: config.logoEstilo ?? "quadrada",
    impressao_por_setor: config.impressaoPorSetor ?? false,
    nome_impressora_cozinha: config.nomeImpressoraCozinha ?? null,
    nome_impressora_bar: config.nomeImpressoraBar ?? null,
    modulos: (config.modulos ?? {}) as unknown as null,
    plano: config.plano ?? "basico",
    modo_operacao: config.modoOperacao ?? "restaurante",
    identificacao_fast_food: config.identificacaoFastFood ?? "codigo",
    cpf_nota_ativo: config.cpfNotaAtivo ?? false,
    cardapio_header_estilo: config.cardapioHeaderEstilo ?? "padrao",
    cardapio_banner_base64: config.cardapioBannerBase64 ?? "",
    tema_cardapio: config.temaCardapio ?? null,
    tema_personalizado: config.temaPersonalizado ?? false,
    fundo_tipo: config.fundoTipo ?? "solido",
    fundo_cor: config.fundoCor ?? null,
    fundo_gradiente: (config.fundoGradiente ?? null) as unknown as null,
    letra_tipo: config.letraTipo ?? "solido",
    letra_cor: config.letraCor ?? null,
    letra_gradiente: (config.letraGradiente ?? null) as unknown as null,
    sidebar_cor: config.sidebarCor ?? null,
    cards_cor: config.cardsCor ?? null,
    sidebar_estilo: config.sidebarEstilo ?? "icone-texto",
    totem_tema: config.totemTema ?? null,
    totem_cor_primaria: config.totemCorPrimaria ?? null,
    totem_tema_personalizado: config.totemTemaPersonalizado ?? false,
    totem_fundo_tipo: config.totemFundoTipo ?? null,
    totem_fundo_cor: config.totemFundoCor ?? null,
    totem_fundo_gradiente: (config.totemFundoGradiente ?? null) as unknown as null,
    totem_letra_cor: config.totemLetraCor ?? null,
    totem_sidebar_cor: config.totemSidebarCor ?? null,
    totem_cards_cor: config.totemCardsCor ?? null,
    total_mesas: 20,
    updated_at: new Date().toISOString(),
  };
}

// ── Map DB row → LicencaConfig ──

function dbRowToLicenca(row: any): LicencaConfig {
  return {
    nomeCliente: row.nome_cliente ?? "",
    dataVencimento: row.data_vencimento ?? "",
    ativo: row.ativo ?? true,
    plano: row.plano ?? "basico",
  };
}

function licencaToDbRow(lic: LicencaConfig) {
  return {
    nome_cliente: lic.nomeCliente,
    data_vencimento: lic.dataVencimento || null,
    ativo: lic.ativo,
    plano: lic.plano ?? "basico",
    updated_at: new Date().toISOString(),
  };
}

// ══════════════════════════════════════
// CONFIG
// ══════════════════════════════════════

export async function fetchConfig(storeId?: string | null): Promise<SistemaConfig> {
  const key = cacheKey(CONFIG_BASE, storeId);
  try {
    let query = supabase.from("restaurant_config").select("*");
    if (storeId) {
      query = query.eq("store_id", storeId);
    }
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    if (data) {
      const config = dbRowToConfig(data);
      setConfigCache(config);
      setLocalCache(key, config);
      clearPendingSync("config");
      return config;
    }

    const cached = getLocalCache<SistemaConfig>(key);
    return cached ?? { nomeRestaurante: "Obsidian", logoUrl: "", corPrimaria: "", modulos: { mesas: true } };
  } catch (err) {
    console.error("[configService] erro:", err);
    const cached = getLocalCache<SistemaConfig>(key);
    return cached ?? { nomeRestaurante: "Obsidian", logoUrl: "", corPrimaria: "", modulos: { mesas: true } };
  }
}

export async function saveConfig(config: SistemaConfig, storeId?: string | null): Promise<void> {
  const key = cacheKey(CONFIG_BASE, storeId);
  setLocalCache(key, config);

  try {
    const row: any = configToDbRow(config);
    if (storeId) row.store_id = storeId;

    let existingQuery = supabase.from("restaurant_config").select("id").limit(1);
    if (storeId) existingQuery = existingQuery.eq("store_id", storeId);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      await supabase.from("restaurant_config").update(row as any).eq("id", existing.id);
    } else {
      await supabase.from("restaurant_config").insert(row as any);
    }
    clearPendingSync("config");
  } catch (err) {
    console.error("[configService] erro:", err);
    markPendingSync("config");
  }
}

// ══════════════════════════════════════
// LICENÇA
// ══════════════════════════════════════

export async function fetchLicenca(storeId?: string | null): Promise<LicencaConfig> {
  const key = cacheKey(LICENCA_BASE, storeId);
  try {
    let query = supabase.from("restaurant_license").select("*");
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    if (data) {
      const lic = dbRowToLicenca(data);
      setLicencaCache(lic);
      setLocalCache(key, lic);
      clearPendingSync("licenca");
      return lic;
    }

    const cached = getLocalCache<LicencaConfig>(key);
    return cached ?? { nomeCliente: "", dataVencimento: "", ativo: true };
  } catch (err) {
    console.error("[configService] erro:", err);
    const cached = getLocalCache<LicencaConfig>(key);
    return cached ?? { nomeCliente: "", dataVencimento: "", ativo: true };
  }
}

export async function saveLicenca(lic: LicencaConfig, storeId?: string | null): Promise<void> {
  const key = cacheKey(LICENCA_BASE, storeId);
  setLocalCache(key, lic);

  try {
    const row: any = licencaToDbRow(lic);
    if (storeId) row.store_id = storeId;

    let existingQuery = supabase.from("restaurant_license").select("id").limit(1);
    if (storeId) existingQuery = existingQuery.eq("store_id", storeId);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      await supabase.from("restaurant_license").update(row).eq("id", existing.id);
    } else {
      await supabase.from("restaurant_license").insert(row);
    }
    clearPendingSync("licenca");
  } catch (err) {
    console.error("[configService] erro:", err);
    markPendingSync("licenca");
  }
}

// ══════════════════════════════════════
// CATEGORIAS
// ══════════════════════════════════════

export async function fetchCategorias(storeId?: string | null): Promise<CategoriaCustom[]> {
  const key = cacheKey(CATEGORIAS_BASE, storeId);
  try {
    let query = supabase.from("restaurant_categories").select("*");
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query.order("ordem", { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      const cats: CategoriaCustom[] = data.map((r) => ({
        id: r.id,
        nome: r.nome,
        icone: r.icone,
        ordem: r.ordem ?? 0,
        parentId: (r as any).parent_id ?? null,
      }));
      setLocalCache(key, cats);
      clearPendingSync("categorias");
      return cats;
    }

    const cached = getLocalCache<CategoriaCustom[]>(key);
    return cached ?? [];
  } catch (err) {
    console.error("[configService] erro:", err);
    const cached = getLocalCache<CategoriaCustom[]>(key);
    return cached ?? [];
  }
}

export async function saveCategorias(cats: CategoriaCustom[], storeId?: string | null): Promise<void> {
  const key = cacheKey(CATEGORIAS_BASE, storeId);
  setLocalCache(key, cats);

  try {
    // Upsert approach: insert or update each category, then delete removed ones
    const newIds = new Set(cats.map(c => c.id));

    // 1. Upsert all current categories
    if (cats.length > 0) {
      const rows = cats.map((c) => ({
        id: c.id,
        nome: c.nome,
        icone: c.icone,
        ordem: c.ordem,
        parent_id: c.parentId ?? null,
        ...(storeId ? { store_id: storeId } : {}),
      }));
      const { error: upsertErr } = await supabase.from("restaurant_categories").upsert(rows);
      if (upsertErr) throw upsertErr;
    }

    // 2. Delete categories that were removed by admin
    let existingQuery = supabase.from("restaurant_categories").select("id");
    if (storeId) existingQuery = existingQuery.eq("store_id", storeId);
    const { data: existingCats } = await existingQuery;
    if (existingCats) {
      const toDelete = existingCats.filter(e => !newIds.has(e.id)).map(e => e.id);
      if (toDelete.length > 0) {
        await supabase.from("restaurant_categories").delete().in("id", toDelete);
      }
    }

    clearPendingSync("categorias");
  } catch (err) {
    console.error("[configService] erro:", err);
    markPendingSync("categorias");
  }
}

// ══════════════════════════════════════
// SYNC PENDING (try to push offline changes)
// ══════════════════════════════════════

export async function syncPending(): Promise<void> {
  try {
    const pending = JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || "{}");
    if (pending.config) {
      const key = cacheKey(CONFIG_BASE);
      const config = getLocalCache<SistemaConfig>(key);
      if (config) await saveConfig(config);
    }
    if (pending.licenca) {
      const key = cacheKey(LICENCA_BASE);
      const lic = getLocalCache<LicencaConfig>(key);
      if (lic) await saveLicenca(lic);
    }
    if (pending.categorias) {
      const key = cacheKey(CATEGORIAS_BASE);
      const cats = getLocalCache<CategoriaCustom[]>(key);
      if (cats) await saveCategorias(cats);
    }
  } catch (err) { console.error("[configService] erro:", err); }
}
