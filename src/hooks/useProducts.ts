import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Produto, Categoria, GrupoPersonalizacao, Adicional, ProductStep } from "@/data/menuData";
import { categorias as defaultCategorias } from "@/data/menuData";

// ─── In-memory cache ───
let _produtosCache: Produto[] = [];
let _categoriasCache: Categoria[] = [];
let _loaded = false;
let _loadPromise: Promise<void> | null = null;
let _loadedStoreId: string | null = null;

// ─── DB row → Produto ───
function rowToProduto(row: any): Produto {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    preco: Number(row.preco ?? 0),
    categoria: row.categoria_id,
    imagem: row.imagem_base64 || row.imagem || "",
    ingredientesRemoviveis: Array.isArray(row.ingredientes_removiveis) ? row.ingredientes_removiveis : [],
    adicionais: Array.isArray(row.adicionais) ? row.adicionais : [],
    grupos: Array.isArray(row.grupos) ? row.grupos : [],
    etapasFluxo: Array.isArray(row.etapas_fluxo) ? row.etapas_fluxo : ["quantidade"],
    bebidaOptions: Array.isArray(row.bebida_options) ? row.bebida_options : [],
    tipoOptions: Array.isArray(row.tipo_options) ? row.tipo_options : [],
    embalagemOptions: Array.isArray(row.embalagem_options) ? row.embalagem_options : [],
    permiteLevar: row.permite_levar ?? false,
    setor: row.setor ?? "cozinha",
  };
}

function rowToCategoria(row: any): Categoria {
  return {
    id: row.id,
    nome: row.nome,
    icone: row.icone ?? "🍽️",
  };
}

// ─── Produto → DB row ───
export function produtoToRow(p: Produto & { ativo?: boolean; removido?: boolean; disponivelDelivery?: boolean; imagemBase64?: string }, storeId: string) {
  return {
    id: p.id,
    store_id: storeId,
    nome: p.nome,
    descricao: p.descricao ?? "",
    preco: p.preco,
    categoria_id: p.categoria,
    imagem: p.imagem ?? "",
    imagem_base64: (p as any).imagemBase64 ?? null,
    ingredientes_removiveis: p.ingredientesRemoviveis ?? [],
    adicionais: p.adicionais ?? [],
    grupos: p.grupos ?? [],
    etapas_fluxo: p.etapasFluxo ?? ["quantidade"],
    bebida_options: p.bebidaOptions ?? [],
    tipo_options: p.tipoOptions ?? [],
    embalagem_options: p.embalagemOptions ?? [],
    permite_levar: p.permiteLevar ?? false,
    setor: p.setor ?? "cozinha",
    ativo: (p as any).ativo ?? true,
    removido: (p as any).removido ?? false,
    disponivel_delivery: (p as any).disponivelDelivery ?? true,
  };
}

// ─── Fetch from Supabase ───
async function loadFromDb(storeId?: string | null): Promise<void> {
  try {
    // Fetch categories
    let catQuery = supabase.from("restaurant_categories").select("*").order("ordem", { ascending: true });
    if (storeId) catQuery = catQuery.eq("store_id", storeId);
    const { data: catData } = await catQuery;

    if (catData && catData.length > 0) {
      _categoriasCache = catData.map(rowToCategoria);
    } else {
      _categoriasCache = [...defaultCategorias];
    }

    // Fetch products
    let prodQuery = supabase
      .from("produtos")
      .select("*")
      .eq("ativo", true)
      .eq("removido", false)
      .order("ordem", { ascending: true });
    if (storeId) prodQuery = prodQuery.eq("store_id", storeId);
    const { data: prodData } = await prodQuery;

    if (prodData && prodData.length > 0) {
      _produtosCache = prodData.map(rowToProduto);
    } else {
      _produtosCache = [];
    }
  } catch (err) {
    console.error("useProducts: erro ao carregar do banco", err);
  }
  _loaded = true;
}

/** Get storeId from session storage */
function getStoreId(): string | null {
  try {
    const raw = sessionStorage.getItem("obsidian-op-session-v2");
    if (raw) { const s = JSON.parse(raw); if (s.storeId) return s.storeId; }
  } catch {}
  try {
    const saved = sessionStorage.getItem("orderly-active-store");
    if (saved) return saved;
  } catch {}
  return null;
}

/** Preload products into memory cache. Call early in app lifecycle. */
export async function preloadProducts(storeId?: string | null): Promise<void> {
  const sid = storeId ?? getStoreId();
  if (_loadPromise) return _loadPromise;
  _loadPromise = loadFromDb(sid);
  await _loadPromise;
  _loadPromise = null;
}

/** Sync access to cached products */
export function getCachedProdutos(): Produto[] {
  return _produtosCache;
}

/** Sync access to cached categories */
export function getCachedCategorias(): Categoria[] {
  return _categoriasCache;
}

/** Get delivery-available products */
export function getCachedProdutosDelivery(): Produto[] {
  // We need full data including disponivelDelivery, so we query all products
  // For now, the delivery filter is done separately
  return _produtosCache;
}

export function isProductsLoaded(): boolean {
  return _loaded;
}

/** Force reload from DB */
export async function reloadProducts(storeId?: string | null): Promise<void> {
  _loaded = false;
  _loadPromise = null;
  await preloadProducts(storeId);
}

// ─── Admin CRUD ───

export async function fetchAllProducts(storeId: string): Promise<(Produto & { ativo: boolean; removido: boolean; disponivelDelivery: boolean; imagemBase64?: string })[]> {
  const { data } = await supabase
    .from("produtos")
    .select("*")
    .eq("store_id", storeId)
    .eq("removido", false)
    .order("ordem", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    ...rowToProduto(row),
    ativo: row.ativo ?? true,
    removido: row.removido ?? false,
    disponivelDelivery: row.disponivel_delivery ?? true,
    imagemBase64: row.imagem_base64 ?? undefined,
  }));
}

export async function upsertProduct(
  product: Produto & { ativo?: boolean; removido?: boolean; disponivelDelivery?: boolean; imagemBase64?: string },
  storeId: string,
): Promise<void> {
  const row = produtoToRow(product, storeId);
  const { error } = await supabase.from("produtos").upsert(row as any);
  if (error) {
    console.error("upsertProduct error:", error);
    throw error;
  }
}

export async function softDeleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from("produtos")
    .update({ removido: true })
    .eq("id", productId);
  if (error) throw error;
}

export async function toggleProductActive(productId: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", productId);
  if (error) throw error;
}

export async function toggleProductDelivery(productId: string, disponivel: boolean): Promise<void> {
  const { error } = await supabase
    .from("produtos")
    .update({ disponivel_delivery: disponivel })
    .eq("id", productId);
  if (error) throw error;
}

// ─── React hook ───
export function useProducts(storeId?: string | null) {
  const [produtos, setProdutos] = useState<Produto[]>(_produtosCache);
  const [categorias, setCategorias] = useState<Categoria[]>(_categoriasCache);
  const [loading, setLoading] = useState(!_loaded);

  const refresh = useCallback(async () => {
    setLoading(true);
    await reloadProducts(storeId);
    setProdutos([..._produtosCache]);
    setCategorias([..._categoriasCache]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (_loaded) {
      setProdutos([..._produtosCache]);
      setCategorias([..._categoriasCache]);
      setLoading(false);
      return;
    }
    preloadProducts(storeId).then(() => {
      setProdutos([..._produtosCache]);
      setCategorias([..._categoriasCache]);
      setLoading(false);
    });
  }, [storeId]);

  return { produtos, categorias, loading, refresh };
}
