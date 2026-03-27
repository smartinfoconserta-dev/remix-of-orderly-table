import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FechamentoConta, EventoOperacional, MovimentacaoCaixa } from "@/contexts/RestaurantContext";

// ── Fechamentos ──
const rowToFechamento = (row: any): FechamentoConta => ({
  id: row.id,
  numeroComanda: row.numero_comanda ?? undefined,
  mesaId: row.mesa_id ?? "",
  mesaNumero: row.mesa_numero ?? 0,
  total: Number(row.total ?? 0),
  formaPagamento: row.forma_pagamento ?? "dinheiro",
  pagamentos: Array.isArray(row.pagamentos) ? row.pagamentos : [],
  itens: Array.isArray(row.itens) ? row.itens : [],
  criadoEm: row.criado_em ?? "",
  criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  caixaId: row.caixa_id ?? "",
  caixaNome: row.caixa_nome ?? "",
  troco: Number(row.troco ?? 0),
  subtotal: Number(row.subtotal ?? 0),
  desconto: Number(row.desconto ?? 0),
  couvert: Number(row.couvert ?? 0),
  numeroPessoas: row.numero_pessoas ?? 0,
  cancelado: row.cancelado ?? false,
  canceladoEm: row.cancelado_em ?? undefined,
  canceladoMotivo: row.cancelado_motivo ?? undefined,
  canceladoPor: row.cancelado_por ?? undefined,
  origem: row.origem ?? "mesa",
});

const fechamentoToRow = (f: FechamentoConta, storeId: string) => ({
  id: f.id,
  store_id: storeId,
  mesa_id: f.mesaId || null,
  mesa_numero: f.mesaNumero ?? 0,
  origem: f.origem ?? "mesa",
  total: f.total,
  subtotal: f.subtotal ?? f.total,
  desconto: f.desconto ?? 0,
  couvert: f.couvert ?? 0,
  numero_pessoas: f.numeroPessoas ?? 0,
  forma_pagamento: f.formaPagamento,
  pagamentos: JSON.parse(JSON.stringify(f.pagamentos)),
  itens: JSON.parse(JSON.stringify(f.itens ?? [])),
  caixa_id: f.caixaId || null,
  caixa_nome: f.caixaNome || null,
  troco: f.troco ?? 0,
  numero_comanda: f.numeroComanda ?? null,
  cancelado: f.cancelado ?? false,
  cancelado_em: f.canceladoEm || null,
  cancelado_motivo: f.canceladoMotivo || null,
  cancelado_por: f.canceladoPor || null,
  criado_em: f.criadoEm || null,
  criado_em_iso: f.criadoEmIso,
});

// ── Eventos ──
const rowToEvento = (row: any): EventoOperacional => ({
  id: row.id,
  tipo: row.tipo,
  descricao: row.descricao ?? "",
  criadoEm: row.criado_em ?? "",
  criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  mesaId: row.mesa_id ?? undefined,
  usuarioId: row.usuario_id ?? undefined,
  usuarioNome: row.usuario_nome ?? undefined,
  acao: row.acao ?? undefined,
  valor: row.valor != null ? Number(row.valor) : undefined,
  itemNome: row.item_nome ?? undefined,
  motivo: row.motivo ?? undefined,
  pedidoNumero: row.pedido_numero ?? undefined,
});

const eventoToRow = (e: EventoOperacional, storeId: string) => ({
  id: e.id,
  store_id: storeId,
  tipo: e.tipo,
  descricao: e.descricao || null,
  mesa_id: e.mesaId || null,
  usuario_id: e.usuarioId || null,
  usuario_nome: e.usuarioNome || null,
  acao: e.acao || null,
  valor: e.valor ?? null,
  item_nome: e.itemNome || null,
  motivo: e.motivo || null,
  pedido_numero: e.pedidoNumero ?? null,
  criado_em: e.criadoEm || null,
  criado_em_iso: e.criadoEmIso,
});

// ── Movimentações ──
const rowToMovimentacao = (row: any): MovimentacaoCaixa => ({
  id: row.id,
  tipo: row.tipo,
  descricao: row.descricao ?? "",
  valor: Number(row.valor ?? 0),
  criadoEm: row.criado_em ?? "",
  criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  usuarioId: row.usuario_id ?? "",
  usuarioNome: row.usuario_nome ?? "",
});

const movimentacaoToRow = (m: MovimentacaoCaixa, storeId: string) => ({
  id: m.id,
  store_id: storeId,
  tipo: m.tipo,
  descricao: m.descricao || null,
  valor: m.valor,
  usuario_id: m.usuarioId || null,
  usuario_nome: m.usuarioNome || null,
  criado_em: m.criadoEm || null,
  criado_em_iso: m.criadoEmIso,
});

export function useSupabaseCaixa(storeId: string | null) {
  const [fechamentos, setFechamentos] = useState<FechamentoConta[]>([]);
  const [eventos, setEventos] = useState<EventoOperacional[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [fundoTroco, setFundoTroco] = useState(0);
  const storeIdRef = useRef(storeId);
  storeIdRef.current = storeId;

  // Load all data for today
  const loadAll = useCallback(async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();

    const [fechRes, evtRes, movRes, caixaRes] = await Promise.all([
      supabase.from("fechamentos").select("*").eq("store_id", storeId).gte("criado_em_iso", iso).order("criado_em_iso", { ascending: false }),
      supabase.from("eventos_operacionais").select("*").eq("store_id", storeId).gte("criado_em_iso", iso).order("criado_em_iso", { ascending: false }).limit(300),
      supabase.from("movimentacoes_caixa").select("*").eq("store_id", storeId).gte("criado_em_iso", iso).order("criado_em_iso", { ascending: false }),
      supabase.from("estado_caixa").select("*").eq("store_id", storeId).order("updated_at", { ascending: false }).limit(1),
    ]);

    setFechamentos((fechRes.data ?? []).map(rowToFechamento));
    setEventos((evtRes.data ?? []).map(rowToEvento));
    setMovimentacoes((movRes.data ?? []).map(rowToMovimentacao));

    const caixaRow = caixaRes.data?.[0];
    if (caixaRow) {
      setCaixaAberto(caixaRow.aberto ?? false);
      setFundoTroco(Number(caixaRow.fundo_troco ?? 0));
    }
  }, [storeId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime for fechamentos
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`caixa-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fechamentos", filter: `store_id=eq.${storeId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const f = rowToFechamento(payload.new);
          setFechamentos(prev => prev.find(x => x.id === f.id) ? prev : [f, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const f = rowToFechamento(payload.new);
          setFechamentos(prev => prev.map(x => x.id === f.id ? f : x));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "estado_caixa", filter: `store_id=eq.${storeId}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setCaixaAberto(payload.new.aberto ?? false);
          setFundoTroco(Number(payload.new.fundo_troco ?? 0));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  // Insert fechamento
  const insertFechamento = useCallback(async (f: FechamentoConta) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    const { error } = await supabase.from("fechamentos").insert(fechamentoToRow(f, sid) as any);
    if (error) console.error("insertFechamento error", error);
  }, []);

  // Update fechamento
  const updateFechamento = useCallback(async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("fechamentos").update(updates).eq("id", id);
    if (error) console.error("updateFechamento error", error);
  }, []);

  // Insert evento
  const insertEvento = useCallback(async (e: EventoOperacional) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    const { error } = await supabase.from("eventos_operacionais").insert(eventoToRow(e, sid) as any);
    if (error) console.error("insertEvento error", error);
  }, []);

  // Insert movimentação
  const insertMovimentacao = useCallback(async (m: MovimentacaoCaixa) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    const { error } = await supabase.from("movimentacoes_caixa").insert(movimentacaoToRow(m, sid) as any);
    if (error) console.error("insertMovimentacao error", error);
  }, []);

  // Abrir caixa
  const abrirCaixaDB = useCallback(async (fundo: number, apertoPor: string) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    // Upsert — check if row exists
    const { data: existing } = await supabase.from("estado_caixa").select("id").eq("store_id", sid).limit(1);
    if (existing && existing.length > 0) {
      await supabase.from("estado_caixa").update({
        aberto: true, fundo_troco: fundo, aberto_por: apertoPor, aberto_em: new Date().toISOString(),
        fechado_por: null, fechado_em: null, updated_at: new Date().toISOString(),
      }).eq("id", existing[0].id);
    } else {
      await supabase.from("estado_caixa").insert({
        store_id: sid, aberto: true, fundo_troco: fundo, aberto_por: apertoPor, aberto_em: new Date().toISOString(),
      } as any);
    }
    setCaixaAberto(true);
    setFundoTroco(fundo);
  }, []);

  // Fechar caixa
  const fecharCaixaDB = useCallback(async (fechadoPor: string) => {
    const sid = storeIdRef.current;
    if (!sid) return;
    const { data: existing } = await supabase.from("estado_caixa").select("id").eq("store_id", sid).limit(1);
    if (existing && existing.length > 0) {
      await supabase.from("estado_caixa").update({
        aberto: false, fechado_por: fechadoPor, fechado_em: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", existing[0].id);
    }
    setCaixaAberto(false);
    setFundoTroco(0);
  }, []);

  return {
    fechamentos,
    eventos,
    movimentacoes,
    caixaAberto,
    fundoTroco,
    insertFechamento,
    updateFechamento,
    insertEvento,
    insertMovimentacao,
    abrirCaixaDB,
    fecharCaixaDB,
    reload: loadAll,
  };
}
