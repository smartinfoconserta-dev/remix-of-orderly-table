import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PedidoRealizado, ItemCarrinho } from "@/contexts/RestaurantContext";

// Convert DB row to PedidoRealizado
const rowToPedido = (row: any): PedidoRealizado => ({
  id: row.id,
  numeroPedido: row.numero_pedido,
  itens: (Array.isArray(row.itens) ? row.itens : []).map((it: any, i: number) => ({
    uid: String(it.uid ?? `item-${i}`),
    produtoId: String(it.produtoId ?? ""),
    nome: String(it.nome ?? "Item"),
    precoBase: Number(it.precoBase ?? it.precoUnitario ?? 0),
    quantidade: Number(it.quantidade ?? 1),
    removidos: Array.isArray(it.removidos) ? it.removidos : [],
    adicionais: Array.isArray(it.adicionais) ? it.adicionais : [],
    bebida: it.bebida ?? null,
    tipo: it.tipo ?? null,
    embalagem: it.embalagem ?? null,
    observacoes: it.observacoes ?? "",
    precoUnitario: Number(it.precoUnitario ?? it.precoBase ?? 0),
    imagemUrl: it.imagemUrl,
    gruposEscolhidos: it.gruposEscolhidos,
    setor: it.setor,
  })),
  total: Number(row.total ?? 0),
  criadoEm: row.criado_em,
  criadoEmIso: row.criado_em_iso,
  origem: row.origem,
  mesaId: row.mesa_id ?? "",
  garcomId: row.garcom_id ?? undefined,
  garcomNome: row.garcom_nome ?? undefined,
  caixaId: row.caixa_id ?? undefined,
  caixaNome: row.caixa_nome ?? undefined,
  pronto: row.pronto ?? false,
  paraViagem: row.para_viagem ?? false,
  clienteNome: row.cliente_nome ?? undefined,
  clienteTelefone: row.cliente_telefone ?? undefined,
  enderecoCompleto: row.endereco_completo ?? undefined,
  bairro: row.bairro ?? undefined,
  referencia: row.referencia ?? undefined,
  formaPagamentoDelivery: row.forma_pagamento_delivery ?? undefined,
  trocoParaQuanto: row.troco_para_quanto ?? undefined,
  observacaoGeral: row.observacao_geral ?? undefined,
  statusBalcao: row.status_balcao ?? "aberto",
  motoboyNome: row.motoboy_nome ?? undefined,
  cancelado: row.cancelado ?? false,
  canceladoEm: row.cancelado_em ?? undefined,
  canceladoMotivo: row.cancelado_motivo ?? undefined,
  canceladoPor: row.cancelado_por ?? undefined,
});

// Convert PedidoRealizado to DB insert row
const pedidoToRow = (p: PedidoRealizado, storeId: string) => ({
  id: p.id,
  store_id: storeId,
  numero_pedido: p.numeroPedido,
  itens: JSON.parse(JSON.stringify(p.itens)),
  total: p.total,
  criado_em: p.criadoEm,
  criado_em_iso: p.criadoEmIso,
  origem: p.origem,
  mesa_id: p.mesaId || null,
  garcom_id: p.garcomId || null,
  garcom_nome: p.garcomNome || null,
  caixa_id: p.caixaId || null,
  caixa_nome: p.caixaNome || null,
  pronto: p.pronto ?? false,
  para_viagem: p.paraViagem ?? false,
  cliente_nome: p.clienteNome || null,
  cliente_telefone: p.clienteTelefone || null,
  endereco_completo: p.enderecoCompleto || null,
  bairro: p.bairro || null,
  referencia: p.referencia || null,
  forma_pagamento_delivery: p.formaPagamentoDelivery || null,
  troco_para_quanto: p.trocoParaQuanto ?? null,
  observacao_geral: p.observacaoGeral || null,
  status_balcao: p.statusBalcao ?? "aberto",
  motoboy_nome: p.motoboyNome || null,
  cancelado: p.cancelado ?? false,
  cancelado_em: p.canceladoEm || null,
  cancelado_motivo: p.canceladoMotivo || null,
  cancelado_por: p.canceladoPor || null,
});

export function useSupabaseOrders(storeId: string | null) {
  const [pedidosMesa, setPedidosMesa] = useState<PedidoRealizado[]>([]);
  const [pedidosBalcao, setPedidosBalcao] = useState<PedidoRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const storeIdRef = useRef(storeId);
  storeIdRef.current = storeId;

  // Load all pedidos for today from Supabase
  const loadPedidos = useCallback(async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("store_id", storeId)
      .gte("criado_em_iso", today.toISOString())
      .order("criado_em_iso", { ascending: true });

    if (error) {
      console.error("useSupabaseOrders: load error", error);
      return;
    }
    const all = (data ?? []).map(rowToPedido);
    const mesa = all.filter(p => p.origem === "mesa" || p.origem === "cliente" || p.origem === "garcom" || p.origem === "caixa");
    const balcao = all.filter(p => p.origem === "balcao" || p.origem === "delivery" || p.origem === "totem");
    setPedidosMesa(mesa);
    setPedidosBalcao(balcao);
    setLoading(false);
  }, [storeId]);

  // Initial load
  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`pedidos-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `store_id=eq.${storeId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const p = rowToPedido(payload.new);
            if (["balcao", "delivery", "totem"].includes(p.origem)) {
              setPedidosBalcao(prev => {
                if (prev.find(x => x.id === p.id)) return prev;
                return [...prev, p];
              });
            } else {
              setPedidosMesa(prev => {
                if (prev.find(x => x.id === p.id)) return prev;
                return [...prev, p];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const p = rowToPedido(payload.new);
            const updater = (prev: PedidoRealizado[]) =>
              prev.map(x => x.id === p.id ? p : x);
            setPedidosMesa(updater);
            setPedidosBalcao(updater);
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as any).id;
            setPedidosMesa(prev => prev.filter(x => x.id !== id));
            setPedidosBalcao(prev => prev.filter(x => x.id !== id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  // Insert pedido via SECURITY DEFINER RPC
  const insertPedido = useCallback(async (pedido: PedidoRealizado) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    const row = pedidoToRow(pedido, sid);
    const { error } = await supabase.rpc("rpc_insert_pedido" as any, { _data: row });
    if (error) console.error("insertPedido error", error);
  }, []);

  // Update pedido fields via SECURITY DEFINER RPC
  const updatePedido = useCallback(async (pedidoId: string, updates: Partial<Record<string, any>>) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    const { error } = await supabase.rpc("rpc_update_pedido" as any, { _id: pedidoId, _store_id: sid, _updates: updates });
    if (error) console.error("updatePedido error", error);
  }, []);

  // Get next pedido number atomically
  const getNextNumero = useCallback(async (): Promise<number> => {
    const sid = storeIdRef.current;
    if (!sid) return 1;
    const { data, error } = await supabase.rpc("next_order_number" as any, { _store_id: sid });
    if (error) { console.error("next_order_number error", error); return 1; }
    return typeof data === "number" ? data : 1;
  }, []);

  return {
    pedidosMesa,
    pedidosBalcao,
    loading,
    insertPedido,
    updatePedido,
    getNextNumero,
    reload: loadPedidos,
  };
}
