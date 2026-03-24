import { supabase } from "@/integrations/supabase/client";
import type { SistemaConfig, LicencaConfig, CategoriaCustom, HorariosSemana } from "./adminStorage";

const CONFIG_CACHE_KEY = "orderly-config-v1";
const LICENCA_CACHE_KEY = "orderly-licenca-v1";
const CATEGORIAS_CACHE_KEY = "orderly-categorias-v1";
const SYNC_PENDING_KEY = "orderly-sync-pending-v1";

// ── helpers ──

function getLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
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
  } catch { /* ignore */ }
}

function clearPendingSync(entity: string) {
  try {
    const pending = JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || "{}");
    delete pending[entity];
    localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(pending));
  } catch { /* ignore */ }
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
    cozinhaAtiva: row.cozinha_ativa ?? false,
    couvertAtivo: row.couvert_ativo ?? false,
    couvertValor: Number(row.couvert_valor ?? 0),
    couvertObrigatorio: row.couvert_obrigatorio ?? false,
    horarioFuncionamento: row.horario_funcionamento ?? undefined,
    mensagemFechado: row.mensagem_fechado ?? undefined,
    logoEstilo: row.logo_estilo ?? "quadrada",
    impressaoPorSetor: row.impressao_por_setor ?? false,
    nomeImpressoraCozinha: row.nome_impressora_cozinha ?? undefined,
    nomeImpressoraBar: row.nome_impressora_bar ?? undefined,
    modulos: row.modulos ?? {},
    plano: row.plano ?? "basico",
    modoTV: row.modo_tv ?? "padrao",
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
    cozinha_ativa: config.cozinhaAtiva ?? false,
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
    modo_tv: config.modoTV ?? "padrao",
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
  try {
    let query = supabase.from("restaurant_config").select("*");
    if (storeId) {
      query = query.eq("store_id", storeId);
    }
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    if (data) {
      const config = dbRowToConfig(data);
      setLocalCache(CONFIG_CACHE_KEY, config);
      clearPendingSync("config");
      return config;
    }

    // No row yet — return local cache or defaults
    const cached = getLocalCache<SistemaConfig>(CONFIG_CACHE_KEY);
    return cached ?? { nomeRestaurante: "Obsidian", logoUrl: "", corPrimaria: "" };
  } catch {
    // Offline fallback
    const cached = getLocalCache<SistemaConfig>(CONFIG_CACHE_KEY);
    return cached ?? { nomeRestaurante: "Obsidian", logoUrl: "", corPrimaria: "" };
  }
}

export async function saveConfig(config: SistemaConfig, storeId?: string | null): Promise<void> {
  // Always update local cache immediately
  setLocalCache(CONFIG_CACHE_KEY, config);

  try {
    const row: any = configToDbRow(config);
    if (storeId) row.store_id = storeId;

    // Check if a row exists for this store
    let existingQuery = supabase.from("restaurant_config").select("id").limit(1);
    if (storeId) existingQuery = existingQuery.eq("store_id", storeId);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      await supabase.from("restaurant_config").update(row as any).eq("id", existing.id);
    } else {
      await supabase.from("restaurant_config").insert(row as any);
    }
    clearPendingSync("config");
  } catch {
    markPendingSync("config");
  }
}

// ══════════════════════════════════════
// LICENÇA
// ══════════════════════════════════════

export async function fetchLicenca(storeId?: string | null): Promise<LicencaConfig> {
  try {
    let query = supabase.from("restaurant_license").select("*");
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    if (data) {
      const lic = dbRowToLicenca(data);
      setLocalCache(LICENCA_CACHE_KEY, lic);
      clearPendingSync("licenca");
      return lic;
    }

    const cached = getLocalCache<LicencaConfig>(LICENCA_CACHE_KEY);
    return cached ?? { nomeCliente: "", dataVencimento: "", ativo: true };
  } catch {
    const cached = getLocalCache<LicencaConfig>(LICENCA_CACHE_KEY);
    return cached ?? { nomeCliente: "", dataVencimento: "", ativo: true };
  }
}

export async function saveLicenca(lic: LicencaConfig, storeId?: string | null): Promise<void> {
  setLocalCache(LICENCA_CACHE_KEY, lic);

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
  } catch {
    markPendingSync("licenca");
  }
}

// ══════════════════════════════════════
// CATEGORIAS
// ══════════════════════════════════════

export async function fetchCategorias(): Promise<CategoriaCustom[]> {
  try {
    const { data, error } = await supabase
      .from("restaurant_categories")
      .select("*")
      .order("ordem", { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      const cats: CategoriaCustom[] = data.map((r) => ({
        id: r.id,
        nome: r.nome,
        icone: r.icone,
        ordem: r.ordem ?? 0,
      }));
      setLocalCache(CATEGORIAS_CACHE_KEY, cats);
      clearPendingSync("categorias");
      return cats;
    }

    const cached = getLocalCache<CategoriaCustom[]>(CATEGORIAS_CACHE_KEY);
    return cached ?? [];
  } catch {
    const cached = getLocalCache<CategoriaCustom[]>(CATEGORIAS_CACHE_KEY);
    return cached ?? [];
  }
}

export async function saveCategorias(cats: CategoriaCustom[]): Promise<void> {
  setLocalCache(CATEGORIAS_CACHE_KEY, cats);

  try {
    // Delete all then re-insert
    await supabase.from("restaurant_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (cats.length > 0) {
      const rows = cats.map((c) => ({
        id: c.id,
        nome: c.nome,
        icone: c.icone,
        ordem: c.ordem,
      }));
      await supabase.from("restaurant_categories").insert(rows);
    }
    clearPendingSync("categorias");
  } catch {
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
      const config = getLocalCache<SistemaConfig>(CONFIG_CACHE_KEY);
      if (config) await saveConfig(config);
    }
    if (pending.licenca) {
      const lic = getLocalCache<LicencaConfig>(LICENCA_CACHE_KEY);
      if (lic) await saveLicenca(lic);
    }
    if (pending.categorias) {
      const cats = getLocalCache<CategoriaCustom[]>(CATEGORIAS_CACHE_KEY);
      if (cats) await saveCategorias(cats);
    }
  } catch { /* silent */ }
}
