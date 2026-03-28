import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────
// BAIRROS
// ─────────────────────────────────

export interface Bairro {
  id: string;
  nome: string;
  taxa: number;
  ativo: boolean;
}

let _bairrosCache: Bairro[] = [];

/** Sync getter — returns cached bairros (call loadBairrosAsync first) */
export function getBairros(): Bairro[] {
  return _bairrosCache;
}

export const getBairrosAsync = async (storeId?: string | null): Promise<Bairro[]> => {
  try {
    let query = supabase.from("bairros_delivery" as any).select("*");
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query.order("nome");
    if (error) throw error;
    const mapped = (data ?? []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      taxa: Number(r.taxa ?? 0),
      ativo: r.ativo ?? true,
    }));
    _bairrosCache = mapped;
    return mapped;
  } catch (err) {
    console.error("[deliveryStorage] erro:", err);
    return _bairrosCache;
  }
};

export const saveBairros = async (bairros: Bairro[], storeId?: string | null): Promise<void> => {
  _bairrosCache = bairros;
  try {
    let del = (supabase.from as any)("bairros_delivery").delete();
    if (storeId) {
      del = del.eq("store_id", storeId);
    } else {
      del = del.neq("id", "____never____");
    }
    await del;

    if (bairros.length > 0) {
      const rows = bairros.map((b) => ({
        id: b.id,
        nome: b.nome,
        taxa: b.taxa,
        ativo: b.ativo,
        ...(storeId ? { store_id: storeId } : {}),
      }));
      await (supabase.from as any)("bairros_delivery").insert(rows);
    }
  } catch (err) {
    console.error("Erro ao salvar bairros:", err);
  }
};

// ─────────────────────────────────
// CLIENTES DELIVERY
// ─────────────────────────────────

export interface ClienteDelivery {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  endereco: string;
  numero: string;
  bairro: string;
  complemento: string;
  referencia: string;
  criadoEm: string;
  ultimoPedido: string;
  senhaHash?: string;
}

// Função mantida para não quebrar imports antigos
export function getClientesDelivery(): ClienteDelivery[] {
  return [];
}

export async function getClientesDeliveryAsync(storeId?: string | null): Promise<ClienteDelivery[]> {
  try {
    let query = (supabase.from as any)("clientes_delivery").select("*");
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query.order("ultimo_pedido", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      cpf: r.cpf ?? "",
      telefone: r.telefone ?? "",
      endereco: r.endereco ?? "",
      numero: r.numero ?? "",
      bairro: r.bairro ?? "",
      complemento: r.complemento ?? "",
      referencia: r.referencia ?? "",
      criadoEm: r.criado_em ?? new Date().toISOString(),
      ultimoPedido: r.ultimo_pedido ?? new Date().toISOString(),
      senhaHash: r.senha_hash ?? undefined,
    }));
  } catch (err) {
    console.error("[deliveryStorage] erro:", err);
    return [];
  }
}

export async function findClienteDelivery(busca: string, storeId?: string | null): Promise<ClienteDelivery[]> {
  if (!busca.trim()) return [];
  try {
    const todos = await getClientesDeliveryAsync(storeId);
    const term = busca.trim().toLowerCase();
    return todos.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        c.telefone.replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
        c.cpf.replace(/\D/g, "").includes(term.replace(/\D/g, ""))
    );
  } catch {
    return [];
  }
}

export async function upsertClienteDelivery(
  dados: Omit<ClienteDelivery, "id" | "criadoEm" | "ultimoPedido"> & {
    id?: string;
    criadoEm?: string;
  },
  storeId?: string | null
): Promise<ClienteDelivery> {
  const now = new Date().toISOString();
  const telNorm = dados.telefone.replace(/\D/g, "");
  const cpfNorm = dados.cpf.replace(/\D/g, "");

  try {
    const todos = await getClientesDeliveryAsync(storeId);
    const existing = todos.find(
      (c) =>
        (cpfNorm && c.cpf.replace(/\D/g, "") === cpfNorm) ||
        (telNorm && c.telefone.replace(/\D/g, "") === telNorm)
    );

    if (existing) {
      const updated = {
        nome: dados.nome || existing.nome,
        cpf: dados.cpf || existing.cpf,
        telefone: dados.telefone || existing.telefone,
        endereco: dados.endereco || existing.endereco,
        numero: dados.numero || existing.numero,
        bairro: dados.bairro || existing.bairro,
        complemento: dados.complemento || existing.complemento,
        referencia: dados.referencia || existing.referencia,
        ultimo_pedido: now,
      };
      await (supabase.from as any)("clientes_delivery").update(updated).eq("id", existing.id);
      return { ...existing, ...dados, ultimoPedido: now };
    }

    const novoId = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const novo = {
      id: novoId,
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone,
      endereco: dados.endereco,
      numero: dados.numero,
      bairro: dados.bairro,
      complemento: dados.complemento,
      referencia: dados.referencia,
      senha_hash: dados.senhaHash ?? null,
      criado_em: now,
      ultimo_pedido: now,
      ...(storeId ? { store_id: storeId } : {}),
    };
    await (supabase.from as any)("clientes_delivery").insert(novo);

    return {
      id: novoId,
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone,
      endereco: dados.endereco,
      numero: dados.numero,
      bairro: dados.bairro,
      complemento: dados.complemento,
      referencia: dados.referencia,
      criadoEm: now,
      ultimoPedido: now,
    };
  } catch (err) {
    console.error("Erro ao salvar cliente delivery:", err);
    throw err;
  }
}