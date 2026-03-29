import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CashMovementType, OperationalUser, PaymentMethod, SplitPayment } from "@/types/operations";
import { getSistemaConfig, getSistemaConfigAsync } from "@/lib/adminStorage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export interface ItemCarrinho {
  uid: string;
  produtoId: string;
  nome: string;
  precoBase: number;
  quantidade: number;
  removidos: string[];
  adicionais: { nome: string; preco: number }[];
  bebida?: string | null;
  tipo?: string | null;
  embalagem?: string | null;
  observacoes?: string;
  precoUnitario: number;
  imagemUrl?: string;
  gruposEscolhidos?: { grupoNome: string; tipo: "escolha" | "adicional" | "retirar"; opcoes: { nome: string; preco: number }[] }[];
  setor?: "cozinha" | "bar" | "ambos";
}

export interface PedidoRealizado {
  id: string;
  numeroPedido: number;
  itens: ItemCarrinho[];
  total: number;
  criadoEm: string;
  criadoEmIso: string;
  origem: "mesa" | "cliente" | "garcom" | "caixa" | "balcao" | "delivery" | "totem" | "ifood";
  mesaId: string;
  garcomId?: string;
  garcomNome?: string;
  caixaId?: string;
  caixaNome?: string;
  pronto?: boolean;
  paraViagem?: boolean;
  clienteNome?: string;
  clienteTelefone?: string;
  enderecoCompleto?: string;
  bairro?: string;
  referencia?: string;
  formaPagamentoDelivery?: string;
  trocoParaQuanto?: number;
  observacaoGeral?: string;
  statusBalcao?: "aberto" | "preparando" | "pronto" | "retirado" | "pago" | "saiu" | "entregue" | "aguardando_confirmacao" | "devolvido" | "cancelado" | "pendente_ifood";
  motoboyNome?: string;
  cancelado?: boolean;
  canceladoEm?: string;
  canceladoMotivo?: string;
  canceladoPor?: string;
}

export interface EventoOperacional {
  id: string;
  tipo: "pedido" | "chamado" | "caixa" | "movimentacao";
  descricao: string;
  criadoEm: string;
  criadoEmIso: string;
  mesaId?: string;
  usuarioId?: string;
  usuarioNome?: string;
  acao?: string;
  valor?: number;
  itemNome?: string;
  motivo?: string;
  pedidoNumero?: number;
}

export interface MovimentacaoCaixa {
  id: string;
  tipo: CashMovementType;
  descricao: string;
  valor: number;
  criadoEm: string;
  criadoEmIso: string;
  usuarioId: string;
  usuarioNome: string;
}

export interface FechamentoConta {
  id: string;
  numeroComanda?: number;
  mesaId: string;
  mesaNumero: number;
  total: number;
  formaPagamento: PaymentMethod;
  pagamentos: SplitPayment[];
  itens?: ItemCarrinho[];
  criadoEm: string;
  criadoEmIso: string;
  caixaId: string;
  caixaNome: string;
  troco?: number;
  subtotal?: number;
  desconto?: number;
  couvert?: number;
  numeroPessoas?: number;
  cancelado?: boolean;
  canceladoEm?: string;
  canceladoMotivo?: string;
  canceladoPor?: string;
  origem?: "mesa" | "balcao" | "delivery" | "totem" | "motoboy";
  cpfNota?: string;
}

export interface Mesa {
  id: string;
  numero: number;
  status: "livre" | "pendente" | "consumo";
  total: number;
  carrinho: ItemCarrinho[];
  pedidos: PedidoRealizado[];
  chamarGarcom: boolean;
  chamadoEm: number | null;
}

interface PedidoMeta {
  modo: "cliente" | "garcom" | "caixa" | "totem";
  operador?: OperationalUser | null;
  paraViagem?: boolean;
}

interface MovimentacaoInput {
  tipo: CashMovementType;
  descricao: string;
  valor: number;
  usuario: OperationalUser;
}

interface ActionAuditInput {
  usuario: OperationalUser;
  motivo?: string;
}

export interface FecharContaInput {
  usuario: OperationalUser;
  pagamentos: SplitPayment[];
  troco?: number;
  desconto?: number;
  couvert?: number;
  numeroPessoas?: number;
  cpfNota?: string;
}

interface RestaurantStore {
  mesas: Mesa[];
  eventos: EventoOperacional[];
  movimentacoesCaixa: MovimentacaoCaixa[];
  fechamentos: FechamentoConta[];
  caixaAberto: boolean;
  fundoTroco: number;
  pedidosBalcao: PedidoRealizado[];
}

interface CriarPedidoBalcaoInput {
  itens: ItemCarrinho[];
  origem: "balcao" | "delivery" | "totem";
  operador: OperationalUser;
  clienteNome?: string;
  clienteTelefone?: string;
  enderecoCompleto?: string;
  bairro?: string;
  referencia?: string;
  formaPagamentoDelivery?: string;
  trocoParaQuanto?: number;
  observacaoGeral?: string;
  taxaEntrega?: number;
  skipConfirmacao?: boolean;
  formaPagamentoTotem?: PaymentMethod;
}

interface RestaurantContextType {
  mesas: Mesa[];
  eventos: EventoOperacional[];
  movimentacoesCaixa: MovimentacaoCaixa[];
  fechamentos: FechamentoConta[];
  pedidosBalcao: PedidoRealizado[];
  caixaAberto: boolean;
  fundoTroco: number;
  allFechamentos: FechamentoConta[];
  allEventos: EventoOperacional[];
  allMovimentacoesCaixa: MovimentacaoCaixa[];
  getMesa: (id: string) => Mesa | undefined;
  updateMesa: (id: string, updates: Partial<Mesa>) => void;
  addToCart: (mesaId: string, item: ItemCarrinho) => void;
  updateCartItemQty: (mesaId: string, uid: string, delta: number, audit?: ActionAuditInput) => void;
  removeFromCart: (mesaId: string, uid: string, audit?: ActionAuditInput) => void;
  confirmarPedido: (mesaId: string, meta?: PedidoMeta) => Promise<void>;
  chamarGarcom: (mesaId: string) => void;
  dismissChamarGarcom: (mesaId: string) => void;
  fecharConta: (mesaId: string, input?: FecharContaInput) => void;
  estornarFechamento: (fechamentoId: string, motivo: string, operador: OperationalUser) => void;
  zerarMesa: (mesaId: string, audit?: ActionAuditInput) => void;
  ajustarItemPedido: (mesaId: string, pedidoId: string, itemUid: string, delta: number, audit: ActionAuditInput) => void;
  cancelarPedido: (mesaId: string, pedidoId: string, audit: ActionAuditInput) => void;
  marcarPedidoPronto: (mesaId: string, pedidoId: string) => void;
  registrarMovimentacaoCaixa: (input: MovimentacaoInput) => void;
  abrirCaixa: (fundoTroco: number, usuario: OperationalUser) => void;
  fecharCaixaDoDia: (usuario: OperationalUser, extras?: { diferenca_dinheiro?: number; diferenca_motivo?: string; fundo_proximo?: number }) => void;
  criarPedidoBalcao: (input: CriarPedidoBalcaoInput) => Promise<number>;
  marcarPedidoBalcaoPronto: (pedidoId: string) => void;
  marcarBalcaoSaiu: (pedidoId: string, motoboyNome: string) => void;
  marcarBalcaoEntregue: (pedidoId: string) => void;
  cancelarEntregaMotoboy: (pedidoId: string, motivo?: string) => void;
  marcarBalcaoPronto: (pedidoId: string) => void;
  fecharContaBalcao: (pedidoId: string, input: FecharContaInput) => void;
  confirmarPedidoBalcao: (pedidoId: string, taxaEntrega?: number) => void;
  rejeitarPedidoBalcao: (pedidoId: string, motivo: string) => void;
  cancelarPedidoBalcao: (pedidoId: string, motivo: string, operador: OperationalUser) => void;
  marcarBalcaoRetirado: (pedidoId: string) => void;
  marcarBalcaoPreparando: (pedidoId: string) => void;
  registrarFechamentoMotoboy: (input: {
    motoboyNome: string;
    motoboyId: string;
    dinheiro: number;
    troco: number;
    fundoTroco: number;
    pix: number;
    credito: number;
    debito: number;
    totalEntregas: number;
    pedidosIds: string[];
    conferidoPor: string;
  }) => void;
}

const _global = globalThis as unknown as { __restaurantCtx?: React.Context<RestaurantContextType | null> };
if (!_global.__restaurantCtx) _global.__restaurantCtx = createContext<RestaurantContextType | null>(null);
const RestaurantContext = _global.__restaurantCtx;

// ─── helpers ───
let _contadorComanda = 0;
const proximoNumeroComanda = () => { _contadorComanda += 1; return _contadorComanda; };

// Global pedido number counter — loaded from DB on init
let _nextPedidoNumber = 1;
const proximoNumeroPedido = () => { const n = _nextPedidoNumber; _nextPedidoNumber += 1; return n; };

function derivarStatus(m: Pick<Mesa, "carrinho" | "pedidos">): Mesa["status"] {
  if (m.pedidos.length > 0) return "consumo";
  if (m.carrinho.length > 0) return "pendente";
  return "livre";
}

const formatMesaNumero = (numero: number) => `Mesa ${String(numero).padStart(2, "0")}`;
const formatClock = (date = new Date()) => date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const formatDateTime = (date = new Date()) => date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const buildEvent = (input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">): EventoOperacional => {
  const now = new Date();
  return { id: `evento-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(), ...input };
};

const appendEvent = (eventos: EventoOperacional[], input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">) =>
  [buildEvent(input), ...eventos].slice(0, 300);

const calcularTotalItens = (itens: ItemCarrinho[]) => itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);

const criarMesasIniciais = (total = 20): Mesa[] =>
  Array.from({ length: total }, (_, i) => ({
    id: `mesa-${i + 1}`, numero: i + 1, status: "livre" as const, total: 0, carrinho: [], pedidos: [], chamarGarcom: false, chamadoEm: null,
  }));

const cloneItem = (item: ItemCarrinho): ItemCarrinho => ({ ...item, removidos: [...item.removidos], adicionais: item.adicionais.map((a) => ({ ...a })) });

const normalizeItem = (item: Partial<ItemCarrinho>, index = 0): ItemCarrinho => ({
  uid: String(item.uid ?? `item-${Date.now()}-${index}`), produtoId: String(item.produtoId ?? ""),
  nome: String(item.nome ?? "Item"), precoBase: Number(item.precoBase ?? item.precoUnitario ?? 0),
  quantidade: Number(item.quantidade ?? 1), removidos: Array.isArray(item.removidos) ? item.removidos.map(String) : [],
  adicionais: Array.isArray(item.adicionais) ? item.adicionais.map((a) => ({ nome: String(a.nome ?? "Adicional"), preco: Number(a.preco ?? 0) })) : [],
  bebida: item.bebida ?? null, tipo: item.tipo ?? null, embalagem: item.embalagem ?? null,
  observacoes: item.observacoes ?? "", precoUnitario: Number(item.precoUnitario ?? item.precoBase ?? 0),
  imagemUrl: item.imagemUrl ?? undefined, gruposEscolhidos: Array.isArray(item.gruposEscolhidos) ? item.gruposEscolhidos : undefined,
  setor: item.setor ?? undefined,
});

const estadoInicial = (): RestaurantStore => ({
  mesas: [], eventos: [], movimentacoesCaixa: [], fechamentos: [], caixaAberto: false, fundoTroco: 0, pedidosBalcao: [],
});

const resetMesa = (mesa: Mesa): Mesa => ({
  ...mesa, carrinho: [], pedidos: [], total: 0, chamarGarcom: false, chamadoEm: null, status: "livre" as const,
});

// ── Supabase persistence helpers ──
let _cachedStoreId: string | null = null;

const getActiveStoreId = (): string | null => {
  // Try operational session first
  try {
    const raw = sessionStorage.getItem("obsidian-op-session-v2");
    if (raw) { const s = JSON.parse(raw); if (s.storeId) { _cachedStoreId = s.storeId; return s.storeId; } }
  } catch {}
  try {
    const persistedRaw = localStorage.getItem("obsidian-op-session-v2-persisted");
    if (persistedRaw) {
      const s = JSON.parse(persistedRaw);
      if (s.storeId) {
        sessionStorage.setItem("obsidian-op-session-v2", persistedRaw);
        _cachedStoreId = s.storeId;
        return s.storeId;
      }
    }
  } catch {}
  // Try admin store
  try {
    const saved = sessionStorage.getItem("orderly-active-store");
    if (saved) { _cachedStoreId = saved; return saved; }
  } catch {}
  // Try device store (tablet/totem/tv activated via DeviceGate) — check both storages
  try {
    const deviceStore = sessionStorage.getItem("orderly-device-store-id") || localStorage.getItem("orderly-device-store-id");
    if (deviceStore) {
      // Ensure sessionStorage is synced for current tab
      sessionStorage.setItem("orderly-device-store-id", deviceStore);
      _cachedStoreId = deviceStore;
      return deviceStore;
    }
  } catch {}
  // Fallback to cached value (covers edge cases where session is briefly unavailable)
  return _cachedStoreId;
};

// DB row converters for pedidos
const pedidoToRow = (p: PedidoRealizado, storeId: string) => ({
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

const rowToPedido = (row: any): PedidoRealizado => ({
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

const fechamentoToRow = (f: FechamentoConta, storeId: string) => ({
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

const eventoToRow = (e: EventoOperacional, storeId: string) => ({
  id: e.id, store_id: storeId, tipo: e.tipo, descricao: e.descricao || null,
  mesa_id: e.mesaId || null, usuario_id: e.usuarioId || null, usuario_nome: e.usuarioNome || null,
  acao: e.acao || null, valor: e.valor ?? null, item_nome: e.itemNome || null,
  motivo: e.motivo || null, pedido_numero: e.pedidoNumero ?? null,
  criado_em: e.criadoEm || null, criado_em_iso: e.criadoEmIso,
});

const movToRow = (m: MovimentacaoCaixa, storeId: string) => ({
  id: m.id, store_id: storeId, tipo: m.tipo, descricao: m.descricao || null,
  valor: m.valor, usuario_id: m.usuarioId || null, usuario_nome: m.usuarioNome || null,
  criado_em: m.criadoEm || null, criado_em_iso: m.criadoEmIso,
});

const rowToFechamento = (row: any): FechamentoConta => ({
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

const rowToEvento = (row: any): EventoOperacional => ({
  id: row.id, tipo: row.tipo, descricao: row.descricao ?? "",
  criadoEm: row.criado_em ?? "", criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  mesaId: row.mesa_id ?? undefined, usuarioId: row.usuario_id ?? undefined,
  usuarioNome: row.usuario_nome ?? undefined, acao: row.acao ?? undefined,
  valor: row.valor != null ? Number(row.valor) : undefined, itemNome: row.item_nome ?? undefined,
  motivo: row.motivo ?? undefined, pedidoNumero: row.pedido_numero ?? undefined,
});

const rowToMovimentacao = (row: any): MovimentacaoCaixa => ({
  id: row.id, tipo: row.tipo, descricao: row.descricao ?? "",
  valor: Number(row.valor ?? 0), criadoEm: row.criado_em ?? "",
  criadoEmIso: row.criado_em_iso ?? new Date().toISOString(),
  usuarioId: row.usuario_id ?? "", usuarioNome: row.usuario_nome ?? "",
});

// DB insert — number is already resolved by the caller
const dbInsertPedido = async (p: PedidoRealizado) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbInsertPedido: storeId is null, skipping"); return; }
  try {
    if (p.numeroPedido >= _nextPedidoNumber) _nextPedidoNumber = p.numeroPedido + 1;
    const row = pedidoToRow(p, sid);
    const { error } = await supabase.rpc("rpc_insert_pedido" as any, { _data: row });
    if (error) { console.error("DB insert pedido", error); toast.error("Erro ao salvar pedido no banco"); }
    else {
      // Decrement stock for items with controle_estoque
      decrementStock(p.itens, sid);
    }
  } catch (err) {
    console.error("dbInsertPedido unexpected error", err);
    const fallbackRow = pedidoToRow(p, sid);
    supabase.rpc("rpc_insert_pedido" as any, { _data: fallbackRow }).then(({ error }: any) => {
      if (error) { console.error("DB insert pedido fallback", error); toast.error("Erro ao salvar pedido"); }
      else { decrementStock(p.itens, sid); }
    });
  }
};

const decrementStock = async (itens: any[], storeId: string) => {
  try {
    // Get product IDs from items
    const prodIds = [...new Set(itens.map((item: any) => item.produtoId || item.id).filter(Boolean))];
    if (prodIds.length === 0) return;
    // Fetch which products have stock control enabled
    const { data: prods } = await supabase
      .from("produtos")
      .select("id, controle_estoque, quantidade_estoque")
      .eq("store_id", storeId)
      .in("id", prodIds)
      .eq("controle_estoque", true);
    if (!prods || prods.length === 0) return;
    const prodMap = new Map(prods.map(p => [p.id, p]));
    // Count quantities per product in the order
    const qtdMap = new Map<string, number>();
    for (const item of itens) {
      const pid = item.produtoId || item.id;
      if (pid && prodMap.has(pid)) {
        qtdMap.set(pid, (qtdMap.get(pid) || 0) + (Number(item.quantidade) || Number(item.qtd) || 1));
      }
    }
    // Update each product
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

const dbUpdatePedido = (pedidoId: string, updates: Record<string, any>) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbUpdatePedido: storeId is null"); return; }
  supabase.rpc("rpc_update_pedido" as any, { _id: pedidoId, _store_id: sid, _updates: updates }).then(({ error }: any) => {
    if (error) { console.error("DB update pedido", error); toast.error("Erro ao atualizar pedido"); }
  });
};

const dbInsertFechamento = (f: FechamentoConta) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbInsertFechamento: storeId is null, skipping"); return; }
  supabase.rpc("rpc_insert_fechamento" as any, { _data: fechamentoToRow(f, sid) }).then(({ error }: any) => {
    if (error) { console.error("DB insert fechamento", error); toast.error("Erro ao salvar fechamento no banco"); }
  });
};

const dbUpdateFechamento = (id: string, updates: Record<string, any>) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbUpdateFechamento: storeId is null"); return; }
  supabase.rpc("rpc_update_fechamento" as any, { _id: id, _store_id: sid, _updates: updates }).then(({ error }: any) => {
    if (error) { console.error("DB update fechamento", error); toast.error("Erro ao atualizar fechamento"); }
  });
};

const dbInsertEvento = (e: EventoOperacional) => {
  const sid = getActiveStoreId();
  if (!sid) return;
  supabase.rpc("rpc_insert_evento" as any, { _data: eventoToRow(e, sid) }).then(({ error }: any) => {
    if (error) { console.error("DB insert evento", error); toast.error("Erro ao registrar evento"); }
  });
};

const dbInsertMovimentacao = (m: MovimentacaoCaixa) => {
  const sid = getActiveStoreId();
  if (!sid) { console.warn("dbInsertMovimentacao: storeId is null"); return; }
  supabase.rpc("rpc_insert_movimentacao" as any, { _data: movToRow(m, sid) }).then(({ error }: any) => {
    if (error) { console.error("DB insert mov", error); toast.error("Erro ao salvar movimentação"); }
  });
};

const dbUpsertEstadoCaixa = (aberto: boolean, fundoTroco: number, nome: string, extras?: { diferenca_dinheiro?: number; diferenca_motivo?: string; fundo_proximo?: number }) => {
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

const dbSyncEstadoMesa = (mesa: Mesa) => {
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

// ── Enhanced appendEvent that also persists ──
const appendEventAndPersist = (
  eventos: EventoOperacional[],
  input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">,
): EventoOperacional[] => {
  const evt = buildEvent(input);
  dbInsertEvento(evt);
  return [evt, ...eventos].slice(0, 300);
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<RestaurantStore>(estadoInicial);
  const [allFechamentos, setAllFechamentos] = useState<FechamentoConta[]>([]);
  const [allEventos, setAllEventos] = useState<EventoOperacional[]>([]);
  const [allMovimentacoesCaixa, setAllMovimentacoesCaixa] = useState<MovimentacaoCaixa[]>([]);
  const { operationalSession, authLevel } = useAuth();
  const { storeId: contextStoreId } = useStore();
  const loadedStoreRef = useRef<string | null>(null);
  const derivedStoreId = operationalSession?.storeId ?? contextStoreId ?? null;
  const [activeStoreId, setActiveStoreId] = useState<string | null>(() => derivedStoreId ?? getActiveStoreId());

  // Sync active store changes from auth/device sessions with a polling fallback
  useEffect(() => {
    const syncActiveStoreId = () => {
      const current = derivedStoreId ?? getActiveStoreId();

      if (current) {
        _cachedStoreId = current;
      }

      setActiveStoreId(prev => prev !== current ? current : prev);

      if (!current && authLevel === "unauthenticated") {
        _cachedStoreId = null;
        loadedStoreRef.current = null;
        setStore(estadoInicial());
      }
    };

    syncActiveStoreId();
    const handleCustomSync = () => syncActiveStoreId();
    window.addEventListener("storage", handleCustomSync);
    window.addEventListener("obsidian-store-context-changed", handleCustomSync);

    const interval = setInterval(syncActiveStoreId, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleCustomSync);
      window.removeEventListener("obsidian-store-context-changed", handleCustomSync);
    };
  }, [authLevel, derivedStoreId]);

  // Reset loadedStoreRef when activeStoreId changes to force reload
  useEffect(() => {
    if (activeStoreId && loadedStoreRef.current !== activeStoreId) {
      loadedStoreRef.current = null;
    }
  }, [activeStoreId]);

  // ── Load from Supabase — reactive to session changes ──
  useEffect(() => {
    const load = async () => {
      const sid = activeStoreId;
      if (!sid) return;
      // Already loaded for this store
      if (loadedStoreRef.current === sid) return;
      loadedStoreRef.current = sid;

      console.log("[RestaurantContext] Loading data for store:", sid);

      // Pre-load config into memory cache so getSistemaConfig() returns real data
      await getSistemaConfigAsync(sid);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = today.toISOString();

      // Historical data (last 30 days for allFechamentos)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      const isoHistory = thirtyDaysAgo.toISOString();

      const [pedidosRes, estadoMesasRes, fechRes, evtRes, movRes, caixaRes, mesasDbRes, allFechRes] = await Promise.all([
        supabase.rpc("rpc_get_operational_pedidos" as any, { _store_id: sid }),
        supabase.from("estado_mesas").select("*").eq("store_id", sid),
        supabase.from("fechamentos").select("*").eq("store_id", sid).gte("criado_em_iso", iso).order("criado_em_iso", { ascending: false }),
        supabase.from("eventos_operacionais").select("*").eq("store_id", sid).gte("criado_em_iso", iso).order("criado_em_iso", { ascending: false }).limit(300),
        supabase.from("movimentacoes_caixa").select("*").eq("store_id", sid).gte("criado_em_iso", iso).order("criado_em_iso", { ascending: false }),
        supabase.from("estado_caixa").select("*").eq("store_id", sid).order("updated_at", { ascending: false }).limit(1),
        supabase.from("mesas").select("id,numero,nome,status").eq("store_id", sid).order("numero", { ascending: true }),
        supabase.from("fechamentos").select("*").eq("store_id", sid).gte("criado_em_iso", isoHistory).order("criado_em_iso", { ascending: false }).limit(500),
      ]);

      // Get max numero_pedido for proper sequencing
      const { data: maxPedidoData } = await supabase
        .from("pedidos")
        .select("numero_pedido")
        .eq("store_id", sid)
        .order("numero_pedido", { ascending: false })
        .limit(1);
      _nextPedidoNumber = (maxPedidoData?.[0]?.numero_pedido ?? 0) + 1;

      const allPedidos = (pedidosRes.data ?? []).map(rowToPedido);
      const pedidosMesa = allPedidos.filter(p => !["balcao", "delivery", "totem", "ifood"].includes(p.origem));
      const pedidosBalcao = allPedidos.filter(p => ["balcao", "delivery", "totem", "ifood"].includes(p.origem));
      const fechamentos = (fechRes.data ?? []).map(rowToFechamento);
      const maxComanda = fechamentos.reduce((max, f) => Math.max(max, f.numeroComanda ?? 0), 0);
      _contadorComanda = maxComanda;
      const eventos = (evtRes.data ?? []).map(rowToEvento);
      const movimentacoes = (movRes.data ?? []).map(rowToMovimentacao);

      console.log(`[RestaurantContext] Loaded: ${allPedidos.length} pedidos, ${fechamentos.length} fechamentos, caixa: ${caixaRes.data?.[0]?.aberto ?? "N/A"}`);

      // Build mesa state from estado_mesas + pedidos
      const estadoMesasMap = new Map<string, any>();
      for (const row of (estadoMesasRes.data ?? [])) {
        estadoMesasMap.set(row.mesa_id ?? row.id, row);
      }

      // Group mesa pedidos by mesaId
      const pedidosPorMesa = new Map<string, PedidoRealizado[]>();
      for (const p of pedidosMesa) {
        if (!p.mesaId) continue;
        const arr = pedidosPorMesa.get(p.mesaId) ?? [];
        arr.push(p);
        pedidosPorMesa.set(p.mesaId, arr);
      }

      const mesasDb = mesasDbRes.data ?? [];
      const mesasList = mesasDb.length > 0
        ? mesasDb
        : criarMesasIniciais();

      const mesas: Mesa[] = mesasList.map((mesaRow) => {
        const mesaId = `mesa-${mesaRow.numero}`;
        const estado = estadoMesasMap.get(mesaId);
        const pedidos = pedidosPorMesa.get(mesaId) ?? [];
        const carrinho: ItemCarrinho[] = estado?.carrinho && Array.isArray(estado.carrinho) ? estado.carrinho.map((it: any, idx: number) => normalizeItem(it, idx)) : [];
        const total = pedidos.reduce((acc, p) => acc + p.total, 0);
        return {
          id: mesaId, numero: mesaRow.numero,
          status: derivarStatus({ carrinho, pedidos }),
          total, carrinho, pedidos,
          chamarGarcom: estado?.chamar_garcom ?? false,
          chamadoEm: estado?.chamado_em ?? null,
        };
      });

      const caixaRow = caixaRes.data?.[0];

      setStore({
        mesas,
        eventos,
        movimentacoesCaixa: movimentacoes,
        fechamentos,
        caixaAberto: caixaRow?.aberto ?? false,
        fundoTroco: Number(caixaRow?.fundo_troco ?? 0),
        pedidosBalcao,
      });
      const allFechs = (allFechRes.data ?? []).map(rowToFechamento);
      setAllFechamentos(allFechs);
      setAllEventos(eventos);
      setAllMovimentacoesCaixa(movimentacoes);
    };

    // Run immediately
    load();

    // Retry periodically if storeId wasn't available yet (session may set later)
    const retryInterval = setInterval(() => {
      const sid = getActiveStoreId();
      if (sid && loadedStoreRef.current !== sid) {
        load();
      }
    }, 1500);

    return () => clearInterval(retryInterval);
  }, [activeStoreId]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    const sid = activeStoreId;
    if (!sid) return;

    const channel = supabase
      .channel(`restaurant-${sid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos", filter: `store_id=eq.${sid}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const p = rowToPedido(payload.new);
          setStore(prev => {
            if (["balcao", "delivery", "totem", "ifood"].includes(p.origem)) {
              if (prev.pedidosBalcao.find(x => x.id === p.id)) return prev;
              return { ...prev, pedidosBalcao: [...prev.pedidosBalcao, p] };
            } else {
              // Add to mesa
              const mesas = prev.mesas.map(m => {
                if (m.id !== p.mesaId) return m;
                if (m.pedidos.find(x => x.id === p.id)) return m;
                const updated = { ...m, pedidos: [...m.pedidos, p], total: m.total + p.total };
                updated.status = derivarStatus(updated);
                return updated;
              });
              return { ...prev, mesas };
            }
          });
        } else if (payload.eventType === "UPDATE") {
          const p = rowToPedido(payload.new);
          setStore(prev => {
            const isBalcaoOrigin = ["balcao", "delivery", "totem", "ifood"].includes(p.origem);
            let pedidosBalcao = prev.pedidosBalcao;
            if (isBalcaoOrigin) {
              const exists = prev.pedidosBalcao.some(x => x.id === p.id);
              pedidosBalcao = exists
                ? prev.pedidosBalcao.map(x => x.id === p.id ? p : x)
                : [...prev.pedidosBalcao, p];
            } else {
              pedidosBalcao = prev.pedidosBalcao.map(x => x.id === p.id ? p : x);
            }
            const mesas = prev.mesas.map(m => ({
              ...m,
              pedidos: m.pedidos.map(x => x.id === p.id ? p : x),
            }));
            return { ...prev, pedidosBalcao, mesas };
          });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fechamentos", filter: `store_id=eq.${sid}` }, (payload) => {
        const f = rowToFechamento(payload.new);
        setStore(prev => {
          if (prev.fechamentos.find(x => x.id === f.id)) return prev;
          return { ...prev, fechamentos: [f, ...prev.fechamentos] };
        });
        setAllFechamentos(prev => prev.find(x => x.id === f.id) ? prev : [f, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fechamentos", filter: `store_id=eq.${sid}` }, (payload) => {
        const f = rowToFechamento(payload.new);
        setStore(prev => ({ ...prev, fechamentos: prev.fechamentos.map(x => x.id === f.id ? f : x) }));
        setAllFechamentos(prev => prev.map(x => x.id === f.id ? f : x));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "estado_caixa", filter: `store_id=eq.${sid}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setStore(prev => ({ ...prev, caixaAberto: payload.new.aberto ?? false, fundoTroco: Number(payload.new.fundo_troco ?? 0) }));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "estado_mesas", filter: `store_id=eq.${sid}` }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new;
          const mesaId = row.mesa_id ?? row.id;
          setStore(prev => ({
            ...prev,
            mesas: prev.mesas.map(m => {
              if (m.id !== mesaId) return m;
              const carrinho = Array.isArray(row.carrinho) ? row.carrinho.map((it: any, i: number) => normalizeItem(it, i)) : m.carrinho;
              const chamarGarcom = row.chamar_garcom ?? m.chamarGarcom;
              const chamadoEm = row.chamado_em ?? m.chamadoEm;
              const updated = { ...m, carrinho, chamarGarcom, chamadoEm };
              updated.status = derivarStatus(updated);
              return updated;
            }),
          }));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "eventos_operacionais", filter: `store_id=eq.${sid}` }, (payload) => {
        const e = rowToEvento(payload.new);
        setStore(prev => {
          if (prev.eventos.find(x => x.id === e.id)) return prev;
          return { ...prev, eventos: [e, ...prev.eventos].slice(0, 300) };
        });
        setAllEventos(prev => prev.find(x => x.id === e.id) ? prev : [e, ...prev]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "movimentacoes_caixa", filter: `store_id=eq.${sid}` }, (payload) => {
        const m = rowToMovimentacao(payload.new);
        setStore(prev => {
          if (prev.movimentacoesCaixa.find(x => x.id === m.id)) return prev;
          return { ...prev, movimentacoesCaixa: [m, ...prev.movimentacoesCaixa] };
        });
        setAllMovimentacoesCaixa(prev => prev.find(x => x.id === m.id) ? prev : [m, ...prev]);
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Canal conectado para store:', sid);
        }
        if (status === 'TIMED_OUT') {
          console.error('[Realtime] Timeout na conexão:', err);
          toast.error('Conexão com servidor perdida. Recarregando dados...');
          loadedStoreRef.current = null;
          setActiveStoreId(prev => prev);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Erro no canal:', err);
          toast.error('Erro de conexão. Tentando reconectar...');
          loadedStoreRef.current = null;
          setActiveStoreId(prev => prev);
        }
        if (status === 'CLOSED') {
          console.warn('[Realtime] Canal fechado');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [activeStoreId]);

  // ── Polling fallback — catches missed Realtime events ──
  useEffect(() => {
    const sid = activeStoreId;
    if (!sid) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const pollAll = async () => {
      // 1. Pedidos
      const { data: pedidosData, error: pedidosErr } = await supabase.rpc("rpc_get_operational_pedidos" as any, { _store_id: sid });
      if (!pedidosErr && pedidosData) {
        const freshPedidos = (pedidosData as any[]).map(rowToPedido);
        const freshBalcao = freshPedidos.filter(p => ["balcao", "delivery", "totem", "ifood"].includes(p.origem));

        setStore(prev => {
          const existingIds = new Set(prev.pedidosBalcao.map(p => p.id));
          const newOnes = freshBalcao.filter(p => !existingIds.has(p.id));
          const updatedBalcao = prev.pedidosBalcao.map(existing => {
            const fresh = freshBalcao.find(f => f.id === existing.id);
            return fresh ?? existing;
          });
          if (newOnes.length > 0) {
            return { ...prev, pedidosBalcao: [...updatedBalcao, ...newOnes] };
          }
          const changed = updatedBalcao.some((p, i) => p.statusBalcao !== prev.pedidosBalcao[i]?.statusBalcao);
          return changed ? { ...prev, pedidosBalcao: updatedBalcao } : prev;
        });

        // Sync mesa pedidos
        const freshMesa = freshPedidos.filter(p => !["balcao", "delivery", "totem", "ifood"].includes(p.origem));
        if (freshMesa.length > 0) {
          setStore(prev => {
            let changed = false;
            const mesas = prev.mesas.map(m => {
              const mesaPedidos = freshMesa.filter(p => p.mesaId === m.id);
              if (mesaPedidos.length === 0) return m;
              const existingIds = new Set(m.pedidos.map(p => p.id));
              const newPedidos = mesaPedidos.filter(p => !existingIds.has(p.id));
              if (newPedidos.length === 0) {
                const updatedPedidos = m.pedidos.map(existing => {
                  const fresh = mesaPedidos.find(f => f.id === existing.id);
                  return fresh ?? existing;
                });
                const pedidoChanged = updatedPedidos.some((p, i) => p.pronto !== m.pedidos[i]?.pronto);
                if (!pedidoChanged) return m;
                changed = true;
                const updated = { ...m, pedidos: updatedPedidos };
                updated.status = derivarStatus(updated);
                return updated;
              }
              changed = true;
              const allPedidos = [...m.pedidos, ...newPedidos];
              const total = allPedidos.reduce((acc, p) => acc + p.total, 0);
              const updated = { ...m, pedidos: allPedidos, total };
              updated.status = derivarStatus(updated);
              return updated;
            });
            return changed ? { ...prev, mesas } : prev;
          });
        }
      }

      // 2. Fechamentos do dia
      const { data: fechData } = await supabase
        .from("fechamentos").select("*")
        .eq("store_id", sid)
        .gte("criado_em_iso", todayIso)
        .order("criado_em_iso", { ascending: false });
      if (fechData) {
        const freshFech = fechData.map(rowToFechamento);
        setStore(prev => {
          const existingIds = new Set(prev.fechamentos.map(f => f.id));
          const newOnes = freshFech.filter(f => !existingIds.has(f.id));
          const updated = prev.fechamentos.map(existing => {
            const fresh = freshFech.find(f => f.id === existing.id);
            return fresh ?? existing;
          });
          if (newOnes.length > 0) {
            return { ...prev, fechamentos: [...newOnes, ...updated] };
          }
          const changed = updated.some((f, i) => f.cancelado !== prev.fechamentos[i]?.cancelado);
          return changed ? { ...prev, fechamentos: updated } : prev;
        });
      }

      // 3. Estado do caixa
      const { data: caixaData } = await supabase
        .from("estado_caixa").select("*")
        .eq("store_id", sid)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (caixaData?.[0]) {
        const row = caixaData[0];
        setStore(prev => {
          const newAberto = row.aberto ?? false;
          const newFundo = Number(row.fundo_troco ?? 0);
          if (prev.caixaAberto === newAberto && prev.fundoTroco === newFundo) return prev;
          return { ...prev, caixaAberto: newAberto, fundoTroco: newFundo };
        });
      }
    };

    const interval = setInterval(pollAll, 10_000);
    return () => clearInterval(interval);
  }, [activeStoreId]);

  // Merge allFechamentos
  useEffect(() => {
    setAllFechamentos(prev => {
      const ids = new Set(prev.map(f => f.id));
      const newOnes = store.fechamentos.filter(f => !ids.has(f.id));
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
  }, [store.fechamentos]);

  useEffect(() => {
    setAllEventos(prev => {
      const ids = new Set(prev.map(e => e.id));
      const newOnes = store.eventos.filter(e => !ids.has(e.id));
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
  }, [store.eventos]);

  useEffect(() => {
    setAllMovimentacoesCaixa(prev => {
      const ids = new Set(prev.map(m => m.id));
      const newOnes = store.movimentacoesCaixa.filter(m => !ids.has(m.id));
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
  }, [store.movimentacoesCaixa]);

  const getMesa = useCallback((id: string) => store.mesas.find((mesa) => mesa.id === id), [store.mesas]);

  const updateMesa = useCallback((id: string, updates: Partial<Mesa>) => {
    setStore((prev) => ({
      ...prev,
      mesas: prev.mesas.map((mesa) => {
        if (mesa.id !== id) return mesa;
        const updated = { ...mesa, ...updates };
        updated.status = derivarStatus(updated);
        dbSyncEstadoMesa(updated);
        return updated;
      }),
    }));
  }, []);

  const addToCart = useCallback((mesaId: string, item: ItemCarrinho) => {
    setStore((prev) => ({
      ...prev,
      mesas: prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const updated = { ...mesa, carrinho: [...mesa.carrinho, cloneItem(item)] };
        updated.status = derivarStatus(updated);
        dbSyncEstadoMesa(updated);
        return updated;
      }),
    }));
  }, []);

  const updateCartItemQty = useCallback((mesaId: string, uid: string, delta: number, audit?: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const currentItem = mesa.carrinho.find((item) => item.uid === uid);
        if (!currentItem) return mesa;
        const newQty = currentItem.quantidade + delta;
        const carrinho = newQty < 1 ? mesa.carrinho.filter((item) => item.uid !== uid) : mesa.carrinho.map((item) => (item.uid === uid ? { ...item, quantidade: newQty } : item));
        if (audit?.usuario) {
          eventInput = {
            tipo: "caixa", descricao: newQty < 1 ? `Caixa ${audit.usuario.nome} excluiu item ${currentItem.nome} pendente da ${formatMesaNumero(mesa.numero)}` : `Caixa ${audit.usuario.nome} editou item ${currentItem.nome} pendente da ${formatMesaNumero(mesa.numero)}`,
            mesaId, usuarioId: audit.usuario.id, usuarioNome: audit.usuario.nome,
            acao: newQty < 1 ? "cancelar_item" : "editar_pedido", itemNome: currentItem.nome, motivo: newQty < 1 ? audit.motivo : undefined,
          };
        }
        const updated = { ...mesa, carrinho };
        updated.status = derivarStatus(updated);
        dbSyncEstadoMesa(updated);
        return updated;
      });
      return { ...prev, mesas, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const removeFromCart = useCallback((mesaId: string, uid: string, audit?: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const currentItem = mesa.carrinho.find((item) => item.uid === uid);
        if (!currentItem) return mesa;
        if (audit?.usuario) {
          eventInput = {
            tipo: "caixa", descricao: `Caixa ${audit.usuario.nome} excluiu item ${currentItem.nome} pendente da ${formatMesaNumero(mesa.numero)}`,
            mesaId, usuarioId: audit.usuario.id, usuarioNome: audit.usuario.nome, acao: "cancelar_item", itemNome: currentItem.nome, motivo: audit.motivo,
          };
        }
        const updated = { ...mesa, carrinho: mesa.carrinho.filter((item) => item.uid !== uid) };
        updated.status = derivarStatus(updated);
        dbSyncEstadoMesa(updated);
        return updated;
      });
      return { ...prev, mesas, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const confirmarPedido = useCallback(async (mesaId: string, meta?: PedidoMeta) => {
    // Get atomic number from DB BEFORE setStore (async)
    const sid = getActiveStoreId();
    let realNum = proximoNumeroPedido(); // fallback
    if (sid) {
      try {
        const { data: nextNum } = await supabase.rpc("next_order_number" as any, { _store_id: sid });
        if (typeof nextNum === "number") { realNum = nextNum; if (nextNum >= _nextPedidoNumber) _nextPedidoNumber = nextNum + 1; }
      } catch (err) { console.error("confirmarPedido: next_order_number error", err); }
    }

    const now = new Date();
    const origem = meta?.modo === "garcom" || meta?.modo === "caixa" ? meta.modo : meta?.modo === "totem" ? "totem" : "cliente";

    setStore((prev) => {
      const mesa = prev.mesas.find(m => m.id === mesaId);
      if (!mesa || mesa.carrinho.length === 0) return prev;

      const totalPedido = calcularTotalItens(mesa.carrinho);
      const snapshot = mesa.carrinho.map(cloneItem);

      const novoPedido: PedidoRealizado = {
        id: `pedido-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        numeroPedido: realNum, itens: snapshot, total: totalPedido,
        criadoEm: formatClock(now), criadoEmIso: now.toISOString(), origem, mesaId,
        garcomId: origem === "garcom" ? meta?.operador?.id : undefined,
        garcomNome: origem === "garcom" ? meta?.operador?.nome : undefined,
        caixaId: origem === "caixa" ? meta?.operador?.id : undefined,
        caixaNome: origem === "caixa" ? meta?.operador?.nome : undefined,
        paraViagem: meta?.paraViagem || false,
      };

      // Persist to DB via RPC
      if (sid) {
        const row = pedidoToRow(novoPedido, sid);
        supabase.rpc("rpc_insert_pedido" as any, { _data: row }).then(({ error }: any) => {
          if (error) { console.error("DB insert pedido", error); toast.error("Erro ao salvar pedido no banco"); }
        });
      }

      const eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> = origem === "garcom"
        ? { tipo: "pedido", descricao: `Garçom ${meta?.operador?.nome ?? "identificado"} lançou pedido na ${formatMesaNumero(mesa.numero)}`, mesaId, usuarioId: meta?.operador?.id, usuarioNome: meta?.operador?.nome, acao: "lancar_pedido" }
        : origem === "caixa"
          ? { tipo: "caixa", descricao: `Caixa ${meta?.operador?.nome ?? "identificado"} lançou pedido na ${formatMesaNumero(mesa.numero)}`, mesaId, usuarioId: meta?.operador?.id, usuarioNome: meta?.operador?.nome, acao: "lancar_pedido" }
          : { tipo: "pedido", descricao: `Cliente da ${formatMesaNumero(mesa.numero)} enviou pedido`, mesaId, acao: "pedido_cliente" };

      const mesas = prev.mesas.map((m) => {
        if (m.id !== mesaId) return m;
        const updated: Mesa = { ...m, carrinho: [], pedidos: [...m.pedidos, novoPedido], total: m.total + totalPedido, status: "consumo" as const };
        dbSyncEstadoMesa(updated);
        return updated;
      });
      return { ...prev, mesas, eventos: appendEventAndPersist(prev.eventos, eventInput) };
    });
  }, []);

  const chamarGarcomFn = useCallback((mesaId: string) => {
    const chamadoEm = Date.now();
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        eventInput = { tipo: "chamado", descricao: `Cliente da ${formatMesaNumero(mesa.numero)} chamou garçom`, mesaId, acao: "chamar_garcom" };
        const updated = { ...mesa, chamarGarcom: true, chamadoEm };
        dbSyncEstadoMesa(updated as Mesa);
        return updated;
      });
      return { ...prev, mesas, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const dismissChamarGarcom = useCallback((mesaId: string) => {
    setStore((prev) => ({
      ...prev,
      mesas: prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const updated = { ...mesa, chamarGarcom: false, chamadoEm: null };
        dbSyncEstadoMesa(updated as Mesa);
        return updated;
      }),
    }));
  }, []);

  const fecharConta = useCallback((mesaId: string, input?: FecharContaInput) => {
    setStore((prev) => {
      let fechamento: FechamentoConta | null = null;
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const hasContent = mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0;
        if (!hasContent) return mesa;
        const now = new Date();
        if (input?.usuario && input.pagamentos.length > 0) {
          const pagamentos = input.pagamentos.map((p) => ({ ...p }));
          const resumoPagamento = pagamentos.length === 1 ? pagamentos[0].formaPagamento : `${pagamentos.length} formas de pagamento`;
          fechamento = {
            id: `fechamento-${now.getTime()}-${mesa.id}`, numeroComanda: proximoNumeroComanda(),
            mesaId, mesaNumero: mesa.numero, origem: "mesa" as const,
            total: Math.max(mesa.total - (input?.desconto ?? 0), 0), formaPagamento: pagamentos[0].formaPagamento,
            pagamentos, itens: mesa.pedidos.flatMap((p) => p.itens.map(cloneItem)),
            criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
            caixaId: input.usuario.id, caixaNome: input.usuario.nome,
            troco: input.troco ?? 0, subtotal: mesa.total, desconto: input?.desconto ?? 0,
            couvert: input?.couvert ?? 0, numeroPessoas: input?.numeroPessoas ?? 0,
            cpfNota: input?.cpfNota,
          };
          dbInsertFechamento(fechamento);
          eventInput = { tipo: "caixa", descricao: `Caixa ${input.usuario.nome} fechou conta da ${formatMesaNumero(mesa.numero)} com ${resumoPagamento}`, mesaId, usuarioId: input.usuario.id, usuarioNome: input.usuario.nome, acao: "fechar_conta", valor: mesa.total };
        }
        const reset = resetMesa(mesa);
        dbSyncEstadoMesa(reset);
        return reset;
      });
      return { ...prev, mesas, fechamentos: fechamento ? [fechamento, ...prev.fechamentos] : prev.fechamentos, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const estornarFechamento = useCallback((fechamentoId: string, motivo: string, operador: OperationalUser) => {
    setStore(prev => {
      const fechamento = prev.fechamentos.find(f => f.id === fechamentoId);
      if (!fechamento) return prev;
      dbUpdateFechamento(fechamentoId, { cancelado: true, cancelado_em: new Date().toISOString(), cancelado_motivo: motivo, cancelado_por: operador.nome });
      return {
        ...prev,
        fechamentos: prev.fechamentos.map(f => f.id === fechamentoId ? { ...f, cancelado: true, canceladoEm: new Date().toISOString(), canceladoMotivo: motivo, canceladoPor: operador.nome } : f),
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Estorno do fechamento da Mesa ${String(fechamento.mesaNumero).padStart(2, "0")} — ${motivo}`, mesaId: fechamento.mesaId, usuarioId: operador.id, usuarioNome: operador.nome, acao: "cancelar_pedido", valor: fechamento.total }),
      };
    });
  }, []);

  const zerarMesa = useCallback((mesaId: string, audit?: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        if (audit?.usuario) {
          eventInput = { tipo: "caixa", descricao: `Caixa ${audit.usuario.nome} zerou a ${formatMesaNumero(mesa.numero)}`, mesaId, usuarioId: audit.usuario.id, usuarioNome: audit.usuario.nome, acao: "zerar_mesa", motivo: audit.motivo };
        }
        const reset = resetMesa(mesa);
        dbSyncEstadoMesa(reset);
        return reset;
      });
      return { ...prev, mesas, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const ajustarItemPedido = useCallback((mesaId: string, pedidoId: string, itemUid: string, delta: number, audit: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const pedidos = mesa.pedidos.map((pedido) => {
          if (pedido.id !== pedidoId) return pedido;
          const targetItem = pedido.itens.find((item) => item.uid === itemUid);
          if (!targetItem) return pedido;
          const newQty = targetItem.quantidade + delta;
          const itens = newQty < 1 ? pedido.itens.filter((item) => item.uid !== itemUid) : pedido.itens.map((item) => (item.uid === itemUid ? { ...item, quantidade: newQty } : item));
          const pedidoCancelado = itens.length === 0;
          eventInput = { tipo: "caixa", descricao: pedidoCancelado ? `Caixa ${audit.usuario.nome} cancelou o Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}` : newQty < 1 ? `Caixa ${audit.usuario.nome} excluiu item ${targetItem.nome} do Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}` : `Caixa ${audit.usuario.nome} editou item ${targetItem.nome} do Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}`, mesaId, usuarioId: audit.usuario.id, usuarioNome: audit.usuario.nome, acao: pedidoCancelado ? "cancelar_pedido" : newQty < 1 ? "cancelar_item" : "editar_pedido", itemNome: targetItem.nome, motivo: newQty < 1 ? audit.motivo : undefined, pedidoNumero: pedido.numeroPedido };
          const updated = { ...pedido, itens, total: calcularTotalItens(itens) };
          // Sync pedido to DB
          dbUpdatePedido(pedido.id, { itens: JSON.parse(JSON.stringify(itens)), total: updated.total });
          return updated;
        }).filter((pedido) => pedido.itens.length > 0);
        if (!eventInput) return mesa;
        const total = pedidos.reduce((acc, p) => acc + p.total, 0);
        const updated = { ...mesa, pedidos, total };
        updated.status = derivarStatus(updated);
        dbSyncEstadoMesa(updated);
        return updated;
      });
      return { ...prev, mesas, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const cancelarPedido = useCallback((mesaId: string, pedidoId: string, audit: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;
      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;
        const pedido = mesa.pedidos.find((item) => item.id === pedidoId);
        if (!pedido) return mesa;
        eventInput = { tipo: "caixa", descricao: `Caixa ${audit.usuario.nome} cancelou o Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}`, mesaId, usuarioId: audit.usuario.id, usuarioNome: audit.usuario.nome, acao: "cancelar_pedido", motivo: audit.motivo, pedidoNumero: pedido.numeroPedido };
        dbUpdatePedido(pedidoId, { cancelado: true, cancelado_em: new Date().toISOString(), cancelado_motivo: audit.motivo || null, cancelado_por: audit.usuario.nome });
        const pedidos = mesa.pedidos.filter((item) => item.id !== pedidoId);
        const total = pedidos.reduce((acc, item) => acc + item.total, 0);
        const updated = { ...mesa, pedidos, total };
        updated.status = derivarStatus(updated);
        dbSyncEstadoMesa(updated);
        return updated;
      });
      return { ...prev, mesas, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, []);

  const registrarMovimentacaoCaixa = useCallback((input: MovimentacaoInput) => {
    setStore((prev) => {
      const now = new Date();
      const movimentacao: MovimentacaoCaixa = {
        id: `mov-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        tipo: input.tipo, descricao: input.descricao.trim(), valor: input.valor,
        criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
        usuarioId: input.usuario.id, usuarioNome: input.usuario.nome,
      };
      dbInsertMovimentacao(movimentacao);
      return {
        ...prev,
        movimentacoesCaixa: [movimentacao, ...prev.movimentacoesCaixa],
        eventos: appendEventAndPersist(prev.eventos, { tipo: "movimentacao", descricao: `Caixa ${input.usuario.nome} registrou ${input.tipo} de R$ ${input.valor.toFixed(2).replace(".", ",")}`, usuarioId: input.usuario.id, usuarioNome: input.usuario.nome, acao: input.tipo === "entrada" ? "entrada_manual" : "saida_manual", valor: input.valor }),
      };
    });
  }, []);

  const marcarPedidoPronto = useCallback((mesaId: string, pedidoId: string) => {
    dbUpdatePedido(pedidoId, { pronto: true });
    setStore((prev) => {
      const mesas = prev.mesas.map((m) => {
        if (m.id !== mesaId) return m;
        return { ...m, pedidos: m.pedidos.map((p) => p.id === pedidoId ? { ...p, pronto: true as const } : p) };
      });
      return { ...prev, mesas, eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Pedido marcado como pronto`, mesaId, acao: "pedido_pronto" }) };
    });
  }, []);

  const abrirCaixa = useCallback((fundoTroco: number, usuario: OperationalUser) => {
    dbUpsertEstadoCaixa(true, fundoTroco, usuario.nome);
    setStore((prev) => ({
      ...prev, caixaAberto: true, fundoTroco,
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Caixa ${usuario.nome} abriu o caixa com fundo de troco R$ ${fundoTroco.toFixed(2).replace(".", ",")}`, usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "abertura_caixa", valor: fundoTroco }),
    }));
  }, []);

  const fecharCaixaDoDia = useCallback((usuario: OperationalUser, extras?: { diferenca_dinheiro?: number; diferenca_motivo?: string; fundo_proximo?: number }) => {
    dbUpsertEstadoCaixa(false, 0, usuario.nome, extras);
    setStore((prev) => {
      const now = new Date();
      const pedidosTotemAbertos = prev.pedidosBalcao.filter((p) => p.origem === "totem" && p.statusBalcao !== "pago" && p.statusBalcao !== "cancelado");
      const fechamentosTotemExtras: FechamentoConta[] = pedidosTotemAbertos.map((p) => {
        const f: FechamentoConta = {
          id: `fechamento-totem-auto-${now.getTime()}-${p.id}`, mesaId: p.mesaId, mesaNumero: 0, origem: "totem" as const, total: p.total,
          formaPagamento: "pix" as const, pagamentos: [{ id: `pag-totem-auto-${now.getTime()}-${p.id}`, formaPagamento: "pix" as const, valor: p.total }],
          itens: p.itens.map(cloneItem), criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
          caixaId: "totem-auto", caixaNome: "Totem Autoatendimento (fechamento automático)", troco: 0, subtotal: p.total, desconto: 0,
        };
        dbInsertFechamento(f);
        return f;
      });
      // Reset mesas in DB
      const mesasReset = prev.mesas.map(m => resetMesa(m));
      mesasReset.forEach(m => dbSyncEstadoMesa(m));
      return {
        mesas: mesasReset,
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Gerente ${usuario.nome} fechou o caixa do dia`, usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "fechamento_dia" }),
        movimentacoesCaixa: [], fechamentos: [...fechamentosTotemExtras, ...prev.fechamentos],
        caixaAberto: false, fundoTroco: 0, pedidosBalcao: [],
      };
    });
  }, []);

  const criarPedidoBalcao = useCallback(async (input: CriarPedidoBalcaoInput): Promise<number> => {
    const sid = getActiveStoreId();
    const fallback = proximoNumeroPedido();
    let numeroPedido = fallback;
    try {
      const { data: nextNum } = await supabase.rpc("next_order_number", { _store_id: sid });
      if (typeof nextNum === "number") numeroPedido = nextNum;
    } catch { /* use fallback */ }

    const now = new Date();
    const totalPedido = calcularTotalItens(input.itens) + (input.origem === "delivery" ? (input.taxaEntrega ?? 0) : 0);
    const label = input.origem === "delivery" ? `DELIVERY — ${input.clienteNome ?? ""}` : input.origem === "totem" ? "TOTEM" : "BALCÃO";
    const idPrefix = input.origem === "totem" ? "totem" : input.origem === "delivery" ? "delivery" : "balcao";
    const mesaIdGerado = `${idPrefix}-${now.getTime()}`;
    const statusInicial: PedidoRealizado["statusBalcao"] = input.origem === "delivery" && !input.skipConfirmacao ? "aguardando_confirmacao" : "aberto";
    const novoPedido: PedidoRealizado = {
      id: `pedido-${idPrefix}-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      numeroPedido, itens: input.itens.map(cloneItem), total: totalPedido,
      criadoEm: formatClock(now), criadoEmIso: now.toISOString(), origem: input.origem, mesaId: mesaIdGerado,
      caixaId: input.operador.id, caixaNome: input.operador.nome,
      clienteNome: input.clienteNome, clienteTelefone: input.clienteTelefone,
      enderecoCompleto: input.enderecoCompleto, bairro: input.bairro, referencia: input.referencia,
      formaPagamentoDelivery: input.formaPagamentoDelivery, trocoParaQuanto: input.trocoParaQuanto,
      observacaoGeral: input.observacaoGeral, statusBalcao: statusInicial, pronto: false,
    };
    dbInsertPedido(novoPedido);
    const totemPayMethod = input.formaPagamentoTotem ?? "pix";
    const fechamentoTotem: FechamentoConta | null = input.origem === "totem" ? {
      id: `fechamento-totem-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      numeroComanda: proximoNumeroComanda(), mesaId: mesaIdGerado, mesaNumero: 0, origem: "totem" as const, total: totalPedido,
      formaPagamento: totemPayMethod, pagamentos: [{ id: `pag-totem-${now.getTime()}`, formaPagamento: totemPayMethod, valor: totalPedido }],
      itens: input.itens.map(cloneItem), criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
      caixaId: "totem-auto", caixaNome: "Totem Autoatendimento", troco: 0, subtotal: totalPedido, desconto: 0,
    } : null;
    if (fechamentoTotem) dbInsertFechamento(fechamentoTotem);
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: [...prev.pedidosBalcao, novoPedido],
      fechamentos: fechamentoTotem ? [fechamentoTotem, ...prev.fechamentos] : prev.fechamentos,
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `${input.origem === "totem" ? "Totem" : `Caixa ${input.operador.nome}`} criou pedido ${label}`, usuarioId: input.operador.id, usuarioNome: input.operador.nome, acao: "lancar_pedido", valor: totalPedido }),
    }));
    return numeroPedido;
  }, []);

  const marcarPedidoBalcaoPronto = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { pronto: true, status_balcao: "pronto" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, pronto: true, statusBalcao: "pronto" as const } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Pedido balcão/delivery marcado como pronto`, acao: "pedido_pronto" }),
    }));
  }, []);

  const marcarBalcaoSaiu = useCallback((pedidoId: string, motoboyNome: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "saiu", motoboy_nome: motoboyNome });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "saiu" as const, motoboyNome } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Motoboy ${motoboyNome} retirou pedido delivery`, acao: "delivery_saiu" }),
    }));
  }, []);

  const marcarBalcaoEntregue = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "entregue" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "entregue" as const } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Pedido delivery marcado como entregue`, acao: "delivery_entregue" }),
    }));
  }, []);

  const cancelarEntregaMotoboy = useCallback((pedidoId: string, motivo?: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "devolvido", motoboy_nome: null });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "devolvido" as const, motoboyNome: undefined } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Entrega cancelada pelo motoboy${motivo ? `: ${motivo}` : ""}`, acao: "delivery_cancelado_motoboy", motivo }),
    }));
  }, []);

  const marcarBalcaoPronto = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "pronto", motoboy_nome: null });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "pronto" as const, motoboyNome: undefined } : p),
    }));
  }, []);

  const registrarFechamentoMotoboy = useCallback((input: {
    motoboyNome: string; motoboyId: string; dinheiro: number; troco: number; fundoTroco: number;
    pix: number; credito: number; debito: number; totalEntregas: number; pedidosIds: string[]; conferidoPor: string;
  }) => {
    setStore((prev) => {
      const now = new Date();
      const liquidoDinheiro = input.dinheiro - input.troco;
      const totalGeral = liquidoDinheiro + input.fundoTroco + input.pix + input.credito + input.debito;
      const pagamentos: SplitPayment[] = [];
      if (liquidoDinheiro + input.fundoTroco > 0) pagamentos.push({ id: `pag-din-${now.getTime()}`, formaPagamento: "dinheiro", valor: liquidoDinheiro + input.fundoTroco });
      if (input.pix > 0) pagamentos.push({ id: `pag-pix-${now.getTime()}`, formaPagamento: "pix", valor: input.pix });
      if (input.credito > 0) pagamentos.push({ id: `pag-cred-${now.getTime()}`, formaPagamento: "credito", valor: input.credito });
      if (input.debito > 0) pagamentos.push({ id: `pag-deb-${now.getTime()}`, formaPagamento: "debito", valor: input.debito });
      const itensMotoboy: ItemCarrinho[] = [];
      prev.pedidosBalcao.filter(p => input.pedidosIds.includes(p.id)).forEach(p => p.itens.forEach(it => {
        const existente = itensMotoboy.find(i => i.nome === it.nome);
        if (existente) { existente.quantidade += it.quantidade; } else { itensMotoboy.push({ ...it }); }
      }));
      const fechamento: FechamentoConta = {
        id: `fechamento-motoboy-${now.getTime()}-${input.motoboyId}`,
        mesaId: `delivery-motoboy-${input.motoboyId}`, mesaNumero: 0, origem: "motoboy" as const,
        total: totalGeral, subtotal: totalGeral,
        formaPagamento: pagamentos[0]?.formaPagamento ?? "dinheiro",
        pagamentos: pagamentos.length > 0 ? pagamentos : [{ id: `pag-${now.getTime()}`, formaPagamento: "dinheiro", valor: totalGeral }],
        itens: itensMotoboy, criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
        caixaId: input.motoboyId, caixaNome: `Motoboy: ${input.motoboyNome}`,
      };
      dbInsertFechamento(fechamento);
      return {
        ...prev,
        fechamentos: [fechamento, ...prev.fechamentos],
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Fechamento do motoboy ${input.motoboyNome} conferido por ${input.conferidoPor} — ${input.totalEntregas} entregas — Total R$ ${totalGeral.toFixed(2)}`, usuarioNome: input.conferidoPor, acao: "fechar_turno", valor: totalGeral }),
      };
    });
  }, []);

  const fecharContaBalcao = useCallback((pedidoId: string, input: FecharContaInput) => {
    setStore((prev) => {
      const pedido = prev.pedidosBalcao.find((p) => p.id === pedidoId);
      if (!pedido) return prev;
      const now = new Date();
      const pagamentos = input.pagamentos.map((p) => ({ ...p }));
      const resumoPagamento = pagamentos.length === 1 ? pagamentos[0].formaPagamento : `${pagamentos.length} formas de pagamento`;
      const fechamento: FechamentoConta = {
        id: `fechamento-${now.getTime()}-${pedido.id}`, numeroComanda: proximoNumeroComanda(),
        mesaId: pedido.mesaId, mesaNumero: 0,
        origem: (pedido.origem === "delivery" ? "delivery" : pedido.origem === "totem" ? "totem" : "balcao") as FechamentoConta["origem"],
        total: Math.max(pedido.total - (input.desconto ?? 0), 0),
        formaPagamento: pagamentos[0].formaPagamento, pagamentos,
        itens: pedido.itens.map(cloneItem), criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
        caixaId: input.usuario.id, caixaNome: input.usuario.nome,
        troco: input.troco ?? 0, subtotal: pedido.total, desconto: input.desconto ?? 0,
        couvert: input.couvert ?? 0, numeroPessoas: input.numeroPessoas ?? 0,
        cpfNota: input.cpfNota,
      };
      dbInsertFechamento(fechamento);
      dbUpdatePedido(pedidoId, { status_balcao: "pago" });
      return {
        ...prev,
        pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
        fechamentos: [fechamento, ...prev.fechamentos],
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Caixa ${input.usuario.nome} fechou conta ${pedido.origem === "delivery" ? "delivery" : "balcão"} — ${pedido.clienteNome ?? ""} com ${resumoPagamento}`, usuarioId: input.usuario.id, usuarioNome: input.usuario.nome, acao: "fechar_conta", valor: pedido.total }),
      };
    });
  }, []);

  const confirmarPedidoBalcao = useCallback((pedidoId: string, taxaEntrega?: number) => {
    const cfg = getSistemaConfig();
    setStore((prev) => {
      const pedido = prev.pedidosBalcao.find(p => p.id === pedidoId);
      if (!pedido) return prev;
      const isDelivery = pedido.origem === "delivery";
      const cozinhaLigada = !!(cfg.modulos as any)?.cozinha;
      const statusInicial = isDelivery ? "pronto" as const : (cozinhaLigada ? "aberto" as const : "pronto" as const);
      const taxa = taxaEntrega && taxaEntrega > 0 ? taxaEntrega : 0;
      const taxaItem: ItemCarrinho = { uid: `taxa-${Date.now()}`, produtoId: "taxa-entrega", nome: "Taxa de entrega", precoBase: taxa, quantidade: 1, removidos: [], adicionais: [], precoUnitario: taxa };
      const itensAtualizados = taxa > 0 ? [...pedido.itens, taxaItem] : pedido.itens;
      const newTotal = pedido.total + taxa;
      dbUpdatePedido(pedidoId, { status_balcao: statusInicial, pronto: statusInicial === "pronto", itens: JSON.parse(JSON.stringify(itensAtualizados)), total: newTotal });
      return {
        ...prev,
        pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: statusInicial, pronto: statusInicial === "pronto", itens: itensAtualizados, total: newTotal } : p),
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Pedido delivery confirmado pelo caixa`, acao: "confirmar_delivery" }),
      };
    });
  }, []);

  const rejeitarPedidoBalcao = useCallback((pedidoId: string, motivo: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "cancelado", cancelado: true, cancelado_motivo: motivo });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Pedido delivery rejeitado — ${motivo}`, acao: "rejeitar_delivery", motivo }),
    }));
  }, []);

  const cancelarPedidoBalcao = useCallback((pedidoId: string, motivo: string, operador: OperationalUser) => {
    const now = new Date();
    dbUpdatePedido(pedidoId, { status_balcao: "cancelado", cancelado: true, cancelado_em: now.toISOString(), cancelado_motivo: motivo, cancelado_por: operador.nome });
    setStore((prev) => {
      const pedido = prev.pedidosBalcao.find((p) => p.id === pedidoId);
      if (!pedido) return prev;
      return {
        ...prev,
        pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "cancelado" as const, cancelado: true, canceladoEm: now.toISOString(), canceladoMotivo: motivo, canceladoPor: operador.nome } : p),
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Pedido ${pedido.origem === "totem" ? "TOTEM" : pedido.origem === "delivery" ? "DELIVERY" : "BALCÃO"} #${pedido.numeroPedido} cancelado por ${operador.nome} — ${motivo}`, usuarioId: operador.id, usuarioNome: operador.nome, acao: "cancelar_pedido", motivo, valor: pedido.total }),
      };
    });
  }, []);

  const marcarBalcaoRetirado = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "retirado" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "retirado" as const } : p),
    }));
  }, []);

  const marcarBalcaoPreparando = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "preparando" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "preparando" as const } : p),
    }));
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        mesas: store.mesas, eventos: store.eventos, movimentacoesCaixa: store.movimentacoesCaixa,
        fechamentos: store.fechamentos, pedidosBalcao: store.pedidosBalcao,
        caixaAberto: store.caixaAberto, fundoTroco: store.fundoTroco,
        allFechamentos, allEventos, allMovimentacoesCaixa,
        getMesa, updateMesa, addToCart, updateCartItemQty, removeFromCart,
        confirmarPedido, chamarGarcom: chamarGarcomFn, dismissChamarGarcom,
        fecharConta, estornarFechamento, zerarMesa, ajustarItemPedido, cancelarPedido,
        marcarPedidoPronto, registrarMovimentacaoCaixa, abrirCaixa, fecharCaixaDoDia,
        criarPedidoBalcao, marcarPedidoBalcaoPronto, marcarBalcaoSaiu, marcarBalcaoEntregue,
        cancelarEntregaMotoboy, marcarBalcaoPronto, fecharContaBalcao, confirmarPedidoBalcao,
        rejeitarPedidoBalcao, cancelarPedidoBalcao, marcarBalcaoRetirado, marcarBalcaoPreparando,
        registrarFechamentoMotoboy,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = (): RestaurantContextType => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
};
