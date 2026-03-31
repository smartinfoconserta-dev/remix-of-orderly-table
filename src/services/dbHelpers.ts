import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";
import { toast } from "sonner";
import { enqueue, isNetworkError } from "@/lib/offlineQueue";
import type {
  ItemCarrinho, PedidoRealizado, EventoOperacional,
  MovimentacaoCaixa, FechamentoConta, Mesa,
} from "@/types/restaurant";

// ── Mutable counters ──

let _contadorComanda = 0;
export const proximoNumeroComanda = () => { _contadorComanda += 1; return _contadorComanda; };
export const setContadorComanda = (n: number) => { _contadorComanda = n; };

export let _nextPedidoNumber = 1;
export const setNextPedidoNumber = (n: number) => { _nextPedidoNumber = n; };
export const proximoNumeroPedido = () => { const n = _nextPedidoNumber; _nextPedidoNumber += 1; return n; };

// ── Pure helpers ──

export function derivarStatus(m: Pick<Mesa, "carrinho" | "pedidos">): Mesa["status"] {
  if (m.pedidos.length > 0) return "consumo";
  if (m.carrinho.length > 0) return "pendente";
  return "livre";
}

export const formatMesaNumero = (numero: number) => `Mesa ${String(numero).padStart(2, "0")}`;
export const formatClock = (date = new Date()) => date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const formatDateTime = (date = new Date()) => date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const buildEvent = (input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">): EventoOperacional => {
  const now = new Date();
  return { id: `evento-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(), ...input };
};

export const appendEvent = (eventos: EventoOperacional[], input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">) =>
  [buildEvent(input), ...eventos].slice(0, 300);

export const calcularTotalItens = (itens: ItemCarrinho[]) => itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);

export const criarMesasIniciais = (total = 20): Mesa[] =>
  Array.from({ length: total }, (_, i) => ({
    id: `mesa-${i + 1}`, numero: i + 1, status: "livre" as const, total: 0, carrinho: [], pedidos: [], chamarGarcom: false, chamadoEm: null,
  }));

export const cloneItem = (item: ItemCarrinho): ItemCarrinho => ({ ...item, removidos: [...item.removidos], adicionais: item.adicionais.map((a) => ({ ...a })) });

export const normalizeItem = (item: Partial<ItemCarrinho>, index = 0): ItemCarrinho => ({
  uid: String(item.uid ?? `item-${Date.now()}-${index}`), produtoId: String(item.produtoId ?? ""),
  nome: String(item.nome ?? "Item"), precoBase: Number(item.precoBase ?? item.precoUnitario ?? 0),
  quantidade: Number(item.quantidade ?? 1), removidos: Array.isArray(item.removidos) ? item.removidos.map(String) : [],
  adicionais: Array.isArray(item.adicionais) ? item.adicionais.map((a) => ({ nome: String(a.nome ?? "Adicional"), preco: Number(a.preco ?? 0) })) : [],
  bebida: item.bebida ?? null, tipo: item.tipo ?? null, embalagem: item.embalagem ?? null,
  observacoes: item.observacoes ?? "", precoUnitario: Number(item.precoUnitario ?? item.precoBase ?? 0),
  imagemUrl: item.imagemUrl ?? undefined, gruposEscolhidos: Array.isArray(item.gruposEscolhidos) ? item.gruposEscolhidos : undefined,
  setor: item.setor ?? undefined,
});

export const resetMesa = (mesa: Mesa): Mesa => ({
  ...mesa, carrinho: [], pedidos: [], total: 0, chamarGarcom: false, chamadoEm: null, status: "livre" as const,
});

// ── DB row converters ──

export const pedidoToRow = (p: PedidoRealizado, storeId: string) => ({
  id: p.id, store_id: storeId, numero_pedido: p.numeroPedido,
  itens: JSON.parse(JSON.stringify(p.itens)), total: p.total,
  criado_em: p.criadoEm, criado_em_iso: p.criadoEmIso, origem: p.origem,
  mesa_id: p.mesaId || null, garcom_id: p.garcomId || null, garcom_nome: p.garcomNome || null,
  caixa_id: p.caixaId || null, caixa_nome: p.caixaNome || null,
  pronto: p.pronto ?? false, para_viagem: p.paraViagem ?? false,
  cliente_nome: p.clienteNome || null, cliente_telefone: p.clienteTelefone || null,
  endereco_completo: p.enderecoCompleto || null, bairro: p.bairro || null,
  referencia: p.referencia || null, forma_pagamento_delivery: p.formaPagamentoDelivery || null,
  troco_para_quanto: p.trocoParaQuanto ?? null, observacao_geral: p.observacaoGeral || null,
  status_balcao: p.statusBalcao ?? "aberto", motoboy_nome: p.motoboyNome || null,
  cancelado: p.cancelado ?? false, cancelado_em: p.canceladoEm || null,
  cancelado_motivo: p.canceladoMotivo || null, cancelado_por: p.canceladoPor || null,
});

export const rowToPedido = (row: any): PedidoRealizado => ({
  id: row.id, numeroPedido: row.numero_pedido,
  itens: (Array.isArray(row.itens) ? row.itens : []).map((it: any, i: number) => normalizeItem(it, i)),
  total: Number(row.total ?? 0), criadoEm: row.criado_em, criadoEmIso: row.criado_em_iso,
  origem: row.origem, mesaId: row.mesa_id ?? "",
  garcomId: row.garcom_id ?? undefined, garcomNome: row.garcom_nome ?? undefined,
  caixaId: row.caixa_id ?? undefined, caixaNome: row.caixa_nome ?? undefined,
  pronto: row.pronto ?? false, paraViagem: row.para_viagem ?? false,
  clienteNome: row.cliente_nome ?? undefined, clienteTelefone: row.cliente_telefone ?? undefined,
  enderecoCompleto: row.endereco_completo ?? undefined, bairro: row.bairro ?? undefined,
  referencia: row.referencia ?? undefined, formaPagamentoDelivery: row.forma_pagamento_delivery ?? undefined,
  trocoParaQuanto: row.troco_para_quanto ?? undefined, observacaoGeral: row.observacao_geral ?? undefined,
  statusBalcao: row.status_balcao ?? "aberto", motoboyNome: row.motoboy_nome ?? undefined,
  cancelado: row.cancelado ?? false, canceladoEm: row.cancelado_em ?? undefined,
  canceladoMotivo: row.cancelado_motivo ?? undefined, canceladoPor: row.cancelado_por ?? undefined,
});

export const fechamentoToRow = (f: FechamentoConta, storeId: string) => ({
  id: f.id, store_id: storeId, mesa_id: f.mesaId || null, mesa_numero: f.mesaNumero ?? 0,
  origem: f.origem ?? "mesa", total: f.total, subtotal: f.subtotal ?? f.total,
  desconto: f.desconto ?? 0, couvert: f.couvert ?? 0, numero_pessoas: f.numeroPessoas ?? 0,
  forma_pagamento: f.formaPagamento, pagamentos: JSON.parse(JSON.stringify(f.pagamentos)),
  itens: JSON.parse(JSON.stringify(f.itens ?? [])), caixa_id: f.caixaId || null,
  caixa_nome: f.caixaNome || null, troco: f.troco ?? 0, numero_comanda: f.numeroComanda ?? null,
  cancelado: f.cancelado ?? false, cancelado_em: f.canceladoEm || null,
  cancelado_motivo: f.canceladoMotivo || null, cancelado_por: f.canceladoPor || null,
  criado_em: f.criadoEm || null, criado_em_iso: f.criadoEmIso,
  cpf_nota: f.cpfNota || null,
});

export const rowToFechamento = (row: any): FechamentoConta => ({
  id: row.id, numeroComanda: row.numero_comanda ?? undefined,
  mesaId: row.mesa_id ?? "", mesaNumero: row.mesa_numero ?? 0,
  total: Number(row.total ?? 0), formaPagamento: row.forma_pagamento ?? "dinheiro",
  pagamentos: Array.isArray(row.pagamentos) ? row.pagamentos : [],
  itens: Array.isArray(row.itens) ? row.itens : [],
  criadoEm: row.criado_em ?? "", criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  caixaId: row.caixa_id ?? "", caixaNome: row.caixa_nome ?? "",
  troco: Number(row.troco ?? 0), subtotal: Number(row.subtotal ?? 0),
  desconto: Number(row.desconto ?? 0), couvert: Number(row.couvert ?? 0),
  numeroPessoas: row.numero_pessoas ?? 0, cancelado: row.cancelado ?? false,
  canceladoEm: row.cancelado_em ?? undefined, canceladoMotivo: row.cancelado_motivo ?? undefined,
  canceladoPor: row.cancelado_por ?? undefined, origem: row.origem ?? "mesa",
  cpfNota: row.cpf_nota ?? undefined,
});

export const eventoToRow = (e: EventoOperacional, storeId: string) => ({
  id: e.id, store_id: storeId, tipo: e.tipo, descricao: e.descricao || null,
  mesa_id: e.mesaId || null, usuario_id: e.usuarioId || null, usuario_nome: e.usuarioNome || null,
  acao: e.acao || null, valor: e.valor ?? null, item_nome: e.itemNome || null,
  motivo: e.motivo || null, pedido_numero: e.pedidoNumero ?? null,
  criado_em: e.criadoEm || null, criado_em_iso: e.criadoEmIso,
});

export const rowToEvento = (row: any): EventoOperacional => ({
  id: row.id, tipo: row.tipo, descricao: row.descricao ?? "",
  criadoEm: row.criado_em ?? "", criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  mesaId: row.mesa_id ?? undefined, usuarioId: row.usuario_id ?? undefined,
  usuarioNome: row.usuario_nome ?? undefined, acao: row.acao ?? undefined,
  valor: row.valor != null ? Number(row.valor) : undefined, itemNome: row.item_nome ?? undefined,
  motivo: row.motivo ?? undefined, pedidoNumero: row.pedido_numero ?? undefined,
});

export const movToRow = (m: MovimentacaoCaixa, storeId: string) => ({
  id: m.id, store_id: storeId, tipo: m.tipo, descricao: m.descricao || null,
  valor: m.valor, usuario_id: m.usuarioId || null, usuario_nome: m.usuarioNome || null,
  criado_em: m.criadoEm || null, criado_em_iso: m.criadoEmIso,
});

export const rowToMovimentacao = (row: any): MovimentacaoCaixa => ({
  id: row.id, tipo: row.tipo, descricao: row.descricao ?? "",
  valor: Number(row.valor ?? 0), criadoEm: row.criado_em ?? "",
  criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  usuarioId: row.usuario_id ?? "", usuarioNome: row.usuario_nome ?? "",
});

// ── DB persistence functions ──

export const decrementStock = async (itens: any[], storeId: string) => {
  try {
    const prodIds = [...new Set(itens.map((item: any) => item.produtoId || item.id).filter(Boolean))];
    if (prodIds.length === 0) return;
    const { data: prods } = await supabase
      .from("produtos")
      .select("id, controle_estoque, quantidade_estoque")
      .eq("store_id", storeId)
      .in("id", prodIds)
      .eq("controle_estoque", true);
    if (!prods || prods.length === 0) return;
    const prodMap = new Map(prods.map(p => [p.id, p]));
    const qtdMap = new Map<string, number>();
    for (const item of itens) {
      const pid = item.produtoId || item.id;
      if (pid && prodMap.has(pid)) {
        qtdMap.set(pid, (qtdMap.get(pid) || 0) + (Number(item.quantidade) || Number(item.qtd) || 1));
      }
    }
    for (const [pid, qtd] of qtdMap) {
      const prod = prodMap.get(pid)!;
      const newQtd = Math.max(0, (prod.quantidade_estoque ?? 0) - qtd);
      supabase.from("produtos").update({ quantidade_estoque: newQtd } as any).eq("id", pid).then(({ error }) => {
        if (error) console.error("Erro ao decrementar estoque:", error);
      });
    }
  } catch (err) {
    console.error("decrementStock error:", err);
  }
};

export const dbInsertPedido = async (p: PedidoRealizado) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbInsertPedido: storeId is null, skipping"); return; }
  try {
    if (p.numeroPedido >= _nextPedidoNumber) _nextPedidoNumber = p.numeroPedido + 1;
    const row = pedidoToRow(p, sid);
    const { error } = await supabase.rpc("rpc_insert_pedido" as any, { _data: row });
    if (error) {
      if (isNetworkError(error)) {
        enqueue("rpc_insert_pedido", { _data: row }, `Pedido #${p.numeroPedido}`);
      } else {
        console.error("DB insert pedido", error);
        toast.error("Erro ao salvar pedido no banco");
      }
    } else {
      decrementStock(p.itens, sid);
    }
  } catch (err) {
    if (isNetworkError(err)) {
      const row = pedidoToRow(p, sid);
      enqueue("rpc_insert_pedido", { _data: row }, `Pedido #${p.numeroPedido}`);
    } else {
      console.error("dbInsertPedido unexpected error", err);
      toast.error("Erro ao salvar pedido");
    }
  }
};

export const dbUpdatePedido = (pedidoId: string, updates: Record<string, any>) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbUpdatePedido: storeId is null"); return; }
  const params = { _id: pedidoId, _store_id: sid, _updates: updates };
  Promise.resolve(supabase.rpc("rpc_update_pedido" as any, params)).then(({ error }: any) => {
    if (error) {
      if (isNetworkError(error)) {
        enqueue("rpc_update_pedido", params, `Atualizar pedido`);
      } else {
        console.error("DB update pedido", error);
        toast.error("Erro ao atualizar pedido");
      }
    }
  }).catch((err: any) => {
    if (isNetworkError(err)) {
      enqueue("rpc_update_pedido", params, `Atualizar pedido`);
    }
  });
};

export const dbInsertFechamento = (f: FechamentoConta) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbInsertFechamento: storeId is null, skipping"); return; }
  const row = fechamentoToRow(f, sid);
  supabase.rpc("rpc_insert_fechamento" as any, { _data: row }).then(({ error }: any) => {
    if (error) {
      if (isNetworkError(error)) {
        enqueue("rpc_insert_fechamento", { _data: row }, `Fechamento mesa ${f.mesaNumero}`);
      } else {
        console.error("DB insert fechamento", error);
        toast.error("Erro ao salvar fechamento no banco");
      }
    }
  }).catch((err: any) => {
    if (isNetworkError(err)) {
      enqueue("rpc_insert_fechamento", { _data: row }, `Fechamento mesa ${f.mesaNumero}`);
    }
  });
};

export const dbUpdateFechamento = (id: string, updates: Record<string, any>) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbUpdateFechamento: storeId is null"); return; }
  supabase.rpc("rpc_update_fechamento" as any, { _id: id, _store_id: sid, _updates: updates }).then(({ error }: any) => {
    if (error) { console.error("DB update fechamento", error); toast.error("Erro ao atualizar fechamento"); }
  });
};

export const dbInsertEvento = (e: EventoOperacional) => {
  const sid = getActiveStoreId();
  if (!sid) return;
  supabase.rpc("rpc_insert_evento" as any, { _data: eventoToRow(e, sid) }).then(({ error }: any) => {
    if (error) { console.error("DB insert evento", error); toast.error("Erro ao registrar evento"); }
  });
};

export const dbInsertMovimentacao = (m: MovimentacaoCaixa) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbInsertMovimentacao: storeId is null"); return; }
  supabase.rpc("rpc_insert_movimentacao" as any, { _data: movToRow(m, sid) }).then(({ error }: any) => {
    if (error) { console.error("DB insert mov", error); toast.error("Erro ao salvar movimentação"); }
  });
};

export const dbUpsertEstadoCaixa = (aberto: boolean, fundoTroco: number, nome: string, extras?: { diferenca_dinheiro?: number; diferenca_motivo?: string; fundo_proximo?: number }) => {
  const sid = getActiveStoreId();
  if (!sid) return;
  const data: Record<string, any> = { aberto, fundo_troco: fundoTroco };
  if (aberto) { data.aberto_por = nome; data.aberto_em = new Date().toISOString(); }
  else { data.fechado_por = nome; data.fechado_em = new Date().toISOString(); }
  if (extras?.diferenca_dinheiro !== undefined) data.diferenca_dinheiro = extras.diferenca_dinheiro;
  if (extras?.diferenca_motivo !== undefined) data.diferenca_motivo = extras.diferenca_motivo;
  if (extras?.fundo_proximo !== undefined) data.fundo_proximo = extras.fundo_proximo;
  supabase.rpc("rpc_upsert_estado_caixa" as any, { _store_id: sid, _data: data }).then(({ error }: any) => {
    if (error) { console.error("DB upsert caixa", error); toast.error("Erro ao atualizar caixa"); }
  });
};

export const dbSyncEstadoMesa = (mesa: Mesa) => {
  const sid = getActiveStoreId();
  if (!sid) return;
  const row = {
    id: mesa.id, mesa_id: mesa.id, numero: mesa.numero, status: mesa.status,
    total: mesa.total, carrinho: JSON.parse(JSON.stringify(mesa.carrinho)),
    pedidos: JSON.parse(JSON.stringify(mesa.pedidos)),
    chamar_garcom: mesa.chamarGarcom, chamado_em: mesa.chamadoEm,
    store_id: sid,
  };
  supabase.rpc("rpc_upsert_estado_mesa" as any, { _data: row }).then(({ error }: any) => {
    if (error) { console.error("DB sync mesa via RPC", error); toast.error("Erro ao sincronizar mesa"); }
  });
};
