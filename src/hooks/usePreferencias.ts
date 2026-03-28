import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to manage operational preferences stored in Supabase
 * with localStorage as a temporary cache.
 */
export function usePreferencia(storeId: string | null, modulo: string, chave: string, defaultValue: string = "") {
  const cacheKey = `pref-${modulo}-${chave}`;

  const [valor, setValor] = useState<string>(() => {
    try { return localStorage.getItem(cacheKey) ?? defaultValue; } catch { return defaultValue; }
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Load from DB on mount
  useEffect(() => {
    mountedRef.current = true;
    if (!storeId) { setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase.rpc("rpc_get_preferencias" as any, {
          _store_id: storeId,
          _modulo: modulo,
        });
        if (!mountedRef.current) return;
        const rows = Array.isArray(data) ? data : [];
        const row = rows.find((r: any) => r.chave === chave);
        if (row) {
          const v = (row as any).valor ?? defaultValue;
          setValor(v);
          try { localStorage.setItem(cacheKey, v); } catch {}
        }
      } catch (err) {
        console.error("[usePreferencia] load error:", err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => { mountedRef.current = false; };
  }, [storeId, modulo, chave]);

  const salvar = useCallback(async (novoValor: string) => {
    setValor(novoValor);
    try { localStorage.setItem(cacheKey, novoValor); } catch {}
    if (!storeId) return;
    try {
      await supabase.rpc("rpc_upsert_preferencia" as any, {
        _store_id: storeId,
        _modulo: modulo,
        _chave: chave,
        _valor: novoValor,
      });
    } catch (err) {
      console.error("[usePreferencia] save error:", err);
    }
  }, [storeId, modulo, chave, cacheKey]);

  return { valor, salvar, loading };
}

/** Load all preferences for a module at once */
export async function loadPreferencias(storeId: string, modulo: string): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.rpc("rpc_get_preferencias" as any, {
      _store_id: storeId,
      _modulo: modulo,
    });
    const rows = Array.isArray(data) ? data : [];
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[(r as any).chave] = (r as any).valor ?? "";
    }
    return result;
  } catch {
    return {};
  }
}

export async function savePreferencia(storeId: string, modulo: string, chave: string, valor: string): Promise<void> {
  try {
    await supabase.rpc("rpc_upsert_preferencia" as any, {
      _store_id: storeId,
      _modulo: modulo,
      _chave: chave,
      _valor: valor,
    });
  } catch (err) {
    console.error("[savePreferencia] error:", err);
  }
}
