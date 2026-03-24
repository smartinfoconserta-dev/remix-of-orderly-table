import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CashMovementType, OperationalUser, PaymentMethod, SplitPayment } from "@/types/operations";
import { getSistemaConfig } from "@/lib/adminStorage";

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
  origem: "cliente" | "garcom" | "caixa" | "balcao" | "delivery" | "totem";
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
  statusBalcao?: "aberto" | "pronto" | "pago" | "saiu" | "entregue" | "aguardando_confirmacao" | "devolvido";
  motoboyNome?: string;
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
  desconto?: number;
  couvert?: number;
  numeroPessoas?: number;
  cancelado?: boolean;
  canceladoEm?: string;
  canceladoMotivo?: string;
  canceladoPor?: string;
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
  confirmarPedido: (mesaId: string, meta?: PedidoMeta) => void;
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
  fecharCaixaDoDia: (usuario: OperationalUser) => void;
  criarPedidoBalcao: (input: CriarPedidoBalcaoInput) => void;
  marcarPedidoBalcaoPronto: (pedidoId: string) => void;
  marcarBalcaoSaiu: (pedidoId: string, motoboyNome: string) => void;
  marcarBalcaoEntregue: (pedidoId: string) => void;
  cancelarEntregaMotoboy: (pedidoId: string, motivo?: string) => void;
  marcarBalcaoPronto: (pedidoId: string) => void;
  fecharContaBalcao: (pedidoId: string, input: FecharContaInput) => void;
  confirmarPedidoBalcao: (pedidoId: string, taxaEntrega?: number) => void;
  rejeitarPedidoBalcao: (pedidoId: string, motivo: string) => void;
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

const RESTAURANT_STORAGE_KEY = "obsidian-restaurant-v2";
const FECHAMENTOS_HIST_KEY = "orderly-fechamentos-v1";
const EVENTOS_HIST_KEY = "orderly-eventos-v1";
const MOVIMENTACOES_HIST_KEY = "orderly-movimentacoes-v1";

function derivarStatus(m: Pick<Mesa, "carrinho" | "pedidos">): Mesa["status"] {
  if (m.pedidos.length > 0) return "consumo";
  if (m.carrinho.length > 0) return "pendente";
  return "livre";
}

const formatMesaNumero = (numero: number) => `Mesa ${String(numero).padStart(2, "0")}`;

const formatClock = (date = new Date()) =>
  date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDateTime = (date = new Date()) =>
  date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const buildEvent = (
  input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">,
): EventoOperacional => {
  const now = new Date();

  return {
    id: `evento-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: formatDateTime(now),
    criadoEmIso: now.toISOString(),
    ...input,
  };
};

const appendEvent = (
  eventos: EventoOperacional[],
  input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">,
) => [buildEvent(input), ...eventos].slice(0, 300);

const calcularTotalItens = (itens: ItemCarrinho[]) =>
  itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);

const criarMesasIniciais = (): Mesa[] => {
  let total = 20;
  try {
    const raw = window.localStorage.getItem("orderly-mesas-config-v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.totalMesas === "number" && parsed.totalMesas >= 1) {
        total = Math.min(parsed.totalMesas, 100);
      }
    }
  } catch { /* ignore */ }
  return Array.from({ length: total }, (_, i) => ({
    id: `mesa-${i + 1}`,
    numero: i + 1,
    status: "livre" as const,
    total: 0,
    carrinho: [],
    pedidos: [],
    chamarGarcom: false,
    chamadoEm: null,
  }));
};

const cloneItem = (item: ItemCarrinho): ItemCarrinho => ({
  ...item,
  removidos: [...item.removidos],
  adicionais: item.adicionais.map((adicional) => ({ ...adicional })),
});

const normalizeItem = (item: Partial<ItemCarrinho>, index = 0): ItemCarrinho => ({
  uid: String(item.uid ?? `item-${Date.now()}-${index}`),
  produtoId: String(item.produtoId ?? ""),
  nome: String(item.nome ?? "Item"),
  precoBase: Number(item.precoBase ?? item.precoUnitario ?? 0),
  quantidade: Number(item.quantidade ?? 1),
  removidos: Array.isArray(item.removidos) ? item.removidos.map(String) : [],
  adicionais: Array.isArray(item.adicionais)
    ? item.adicionais.map((adicional) => ({
        nome: String(adicional.nome ?? "Adicional"),
        preco: Number(adicional.preco ?? 0),
      }))
    : [],
  bebida: item.bebida ?? null,
  tipo: item.tipo ?? null,
  embalagem: item.embalagem ?? null,
  observacoes: item.observacoes ?? "",
  precoUnitario: Number(item.precoUnitario ?? item.precoBase ?? 0),
  imagemUrl: item.imagemUrl ?? undefined,
  gruposEscolhidos: Array.isArray(item.gruposEscolhidos) ? item.gruposEscolhidos : undefined,
  setor: item.setor ?? undefined,
});

const normalizePedido = (pedido: Partial<PedidoRealizado>, mesaId: string, index = 0): PedidoRealizado => {
  const itens = Array.isArray(pedido.itens) ? pedido.itens.map((item, itemIndex) => normalizeItem(item, itemIndex)) : [];
  const origem = pedido.origem === "garcom" || pedido.origem === "caixa" || pedido.origem === "balcao" || pedido.origem === "delivery" ? pedido.origem : "cliente";

  return {
    id: String(pedido.id ?? `pedido-${Date.now()}-${index}`),
    numeroPedido: Number(pedido.numeroPedido ?? index + 1),
    itens,
    total: Number(pedido.total ?? calcularTotalItens(itens)),
    criadoEm: typeof pedido.criadoEm === "string" ? pedido.criadoEm : formatClock(),
    criadoEmIso: typeof pedido.criadoEmIso === "string" ? pedido.criadoEmIso : new Date().toISOString(),
    origem,
    mesaId,
    garcomId: pedido.garcomId,
    garcomNome: pedido.garcomNome,
    caixaId: pedido.caixaId,
    caixaNome: pedido.caixaNome,
  };
};

const normalizeMesa = (mesa: Partial<Mesa>, fallbackNumero: number): Mesa => {
  const numero = Number(mesa.numero ?? fallbackNumero);
  const id = String(mesa.id ?? `mesa-${numero}`);
  const carrinho = Array.isArray(mesa.carrinho) ? mesa.carrinho.map((item, index) => normalizeItem(item, index)) : [];
  const pedidos = Array.isArray(mesa.pedidos) ? mesa.pedidos.map((pedido, index) => normalizePedido(pedido, id, index)) : [];
  const total = Number(mesa.total ?? pedidos.reduce((acc, pedido) => acc + pedido.total, 0));

  return {
    id,
    numero,
    status: derivarStatus({ carrinho, pedidos }),
    total,
    carrinho,
    pedidos,
    chamarGarcom: Boolean(mesa.chamarGarcom),
    chamadoEm: typeof mesa.chamadoEm === "number" ? mesa.chamadoEm : null,
  };
};

const normalizePaymentMethod = (value: unknown): PaymentMethod => {
  if (value === "credito" || value === "debito" || value === "pix") return value;
  return "dinheiro";
};

const normalizeSplitPayment = (payment: Partial<SplitPayment>, index = 0): SplitPayment => ({
  id: String(payment.id ?? `pag-${Date.now()}-${index}`),
  formaPagamento: normalizePaymentMethod(payment.formaPagamento),
  valor: Number(payment.valor ?? 0),
});

const readStore = (): RestaurantStore => {
  if (typeof window === "undefined") {
    return {
      mesas: criarMesasIniciais(),
      eventos: [],
      movimentacoesCaixa: [],
      fechamentos: [],
      caixaAberto: false,
      fundoTroco: 0,
      pedidosBalcao: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(RESTAURANT_STORAGE_KEY);
    if (!raw) {
      return {
        mesas: criarMesasIniciais(),
        eventos: [],
        movimentacoesCaixa: [],
        fechamentos: [],
        caixaAberto: false,
        fundoTroco: 0,
        pedidosBalcao: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<RestaurantStore> | Mesa[];
    const rawMesas = Array.isArray(parsed) ? parsed : parsed.mesas;

    return {
      mesas: Array.isArray(rawMesas)
        ? rawMesas.map((mesa, index) => normalizeMesa(mesa, index + 1))
        : criarMesasIniciais(),
      eventos: Array.isArray((parsed as Partial<RestaurantStore>).eventos)
        ? (parsed as Partial<RestaurantStore>).eventos!.map((evento) => ({
            id: String(evento.id ?? `evento-${Date.now()}`),
            tipo: evento.tipo === "caixa" || evento.tipo === "movimentacao" || evento.tipo === "chamado" ? evento.tipo : "pedido",
            descricao: String(evento.descricao ?? "Evento operacional"),
            criadoEm: String(evento.criadoEm ?? formatDateTime()),
            criadoEmIso: String(evento.criadoEmIso ?? new Date().toISOString()),
            mesaId: evento.mesaId,
            usuarioId: evento.usuarioId,
            usuarioNome: evento.usuarioNome,
            acao: evento.acao,
            valor: typeof evento.valor === "number" ? evento.valor : undefined,
            itemNome: typeof evento.itemNome === "string" ? evento.itemNome : undefined,
            motivo: typeof evento.motivo === "string" ? evento.motivo : undefined,
            pedidoNumero: typeof evento.pedidoNumero === "number" ? evento.pedidoNumero : undefined,
          }))
        : [],
      movimentacoesCaixa: Array.isArray((parsed as Partial<RestaurantStore>).movimentacoesCaixa)
        ? (parsed as Partial<RestaurantStore>).movimentacoesCaixa!.map((movimentacao) => ({
            id: String(movimentacao.id ?? `mov-${Date.now()}`),
            tipo: movimentacao.tipo === "saida" ? "saida" : "entrada",
            descricao: String(movimentacao.descricao ?? "Movimentação"),
            valor: Number(movimentacao.valor ?? 0),
            criadoEm: String(movimentacao.criadoEm ?? formatDateTime()),
            criadoEmIso: String(movimentacao.criadoEmIso ?? new Date().toISOString()),
            usuarioId: String(movimentacao.usuarioId ?? ""),
            usuarioNome: String(movimentacao.usuarioNome ?? "Operador"),
          }))
        : [],
      fechamentos: Array.isArray((parsed as Partial<RestaurantStore>).fechamentos)
        ? (parsed as Partial<RestaurantStore>).fechamentos!.map((fechamento, index) => {
            const pagamentos = Array.isArray((fechamento as Partial<FechamentoConta>).pagamentos)
              ? (fechamento as Partial<FechamentoConta>).pagamentos!.map((payment, paymentIndex) =>
                  normalizeSplitPayment(payment, paymentIndex),
                )
              : [
                  normalizeSplitPayment(
                    {
                      formaPagamento: (fechamento as Partial<FechamentoConta>).formaPagamento,
                      valor: Number(fechamento.total ?? 0),
                    },
                    index,
                  ),
                ];

            const rawItens = (fechamento as Partial<FechamentoConta>).itens;

            return {
              id: String(fechamento.id ?? `fech-${Date.now()}`),
              mesaId: String(fechamento.mesaId ?? ""),
              mesaNumero: Number(fechamento.mesaNumero ?? 0),
              total: Number(fechamento.total ?? 0),
              formaPagamento: pagamentos[0]?.formaPagamento ?? normalizePaymentMethod((fechamento as Partial<FechamentoConta>).formaPagamento),
              pagamentos,
              itens: Array.isArray(rawItens) ? rawItens.map((item, idx) => normalizeItem(item, idx)) : undefined,
              criadoEm: String(fechamento.criadoEm ?? formatDateTime()),
              criadoEmIso: String(fechamento.criadoEmIso ?? new Date().toISOString()),
              caixaId: String(fechamento.caixaId ?? ""),
              caixaNome: String(fechamento.caixaNome ?? "Caixa"),
            };
          })
        : [],
      caixaAberto: Boolean((parsed as Partial<RestaurantStore>).caixaAberto),
      fundoTroco: Number((parsed as Partial<RestaurantStore>).fundoTroco ?? 0),
      pedidosBalcao: Array.isArray((parsed as Partial<RestaurantStore>).pedidosBalcao)
        ? (parsed as Partial<RestaurantStore>).pedidosBalcao! : [],
    };
  } catch {
    return {
      mesas: criarMesasIniciais(),
      eventos: [],
      movimentacoesCaixa: [],
      fechamentos: [],
      caixaAberto: false,
      fundoTroco: 0,
      pedidosBalcao: [],
    };
  }
};

const resetMesa = (mesa: Mesa): Mesa => ({
  ...mesa,
  carrinho: [],
  pedidos: [],
  total: 0,
  chamarGarcom: false,
  chamadoEm: null,
  status: "livre" as const,
});

const readHistoricalArray = <T extends { id: string }>(key: string): T[] => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
  const ids = new Set(existing.map((i) => i.id));
  const newItems = incoming.filter((i) => !ids.has(i.id));
  return newItems.length > 0 ? [...existing, ...newItems] : existing;
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<RestaurantStore>(readStore);
  const [allFechamentos, setAllFechamentos] = useState<FechamentoConta[]>(() => readHistoricalArray<FechamentoConta>(FECHAMENTOS_HIST_KEY));
  const [allEventos, setAllEventos] = useState<EventoOperacional[]>(() => readHistoricalArray<EventoOperacional>(EVENTOS_HIST_KEY));
  const [allMovimentacoesCaixa, setAllMovimentacoesCaixa] = useState<MovimentacaoCaixa[]>(() => readHistoricalArray<MovimentacaoCaixa>(MOVIMENTACOES_HIST_KEY));

  useEffect(() => {
    window.localStorage.setItem(RESTAURANT_STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  // Merge current store arrays into historical (append-only, survives day close)
  useEffect(() => {
    setAllFechamentos((prev) => {
      const merged = mergeById(prev, store.fechamentos);
      if (merged !== prev) window.localStorage.setItem(FECHAMENTOS_HIST_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [store.fechamentos]);

  useEffect(() => {
    setAllEventos((prev) => {
      const merged = mergeById(prev, store.eventos);
      if (merged !== prev) window.localStorage.setItem(EVENTOS_HIST_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [store.eventos]);

  useEffect(() => {
    setAllMovimentacoesCaixa((prev) => {
      const merged = mergeById(prev, store.movimentacoesCaixa);
      if (merged !== prev) window.localStorage.setItem(MOVIMENTACOES_HIST_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [store.movimentacoesCaixa]);

  const getMesa = useCallback(
    (id: string) => store.mesas.find((mesa) => mesa.id === id),
    [store.mesas],
  );

  const updateMesa = useCallback((id: string, updates: Partial<Mesa>) => {
    setStore((prev) => ({
      ...prev,
      mesas: prev.mesas.map((mesa) => {
        if (mesa.id !== id) return mesa;
        const updated = { ...mesa, ...updates };
        updated.status = derivarStatus(updated);
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
        const carrinho = newQty < 1
          ? mesa.carrinho.filter((item) => item.uid !== uid)
          : mesa.carrinho.map((item) => (item.uid === uid ? { ...item, quantidade: newQty } : item));

        if (audit?.usuario) {
          eventInput = {
            tipo: "caixa",
            descricao:
              newQty < 1
                ? `Caixa ${audit.usuario.nome} excluiu item ${currentItem.nome} pendente da ${formatMesaNumero(mesa.numero)}`
                : `Caixa ${audit.usuario.nome} editou item ${currentItem.nome} pendente da ${formatMesaNumero(mesa.numero)}`,
            mesaId,
            usuarioId: audit.usuario.id,
            usuarioNome: audit.usuario.nome,
            acao: newQty < 1 ? "cancelar_item" : "editar_pedido",
            itemNome: currentItem.nome,
            motivo: newQty < 1 ? audit.motivo : undefined,
          };
        }

        const updated = { ...mesa, carrinho };
        updated.status = derivarStatus(updated);
        return updated;
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
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
            tipo: "caixa",
            descricao: `Caixa ${audit.usuario.nome} excluiu item ${currentItem.nome} pendente da ${formatMesaNumero(mesa.numero)}`,
            mesaId,
            usuarioId: audit.usuario.id,
            usuarioNome: audit.usuario.nome,
            acao: "cancelar_item",
            itemNome: currentItem.nome,
            motivo: audit.motivo,
          };
        }

        const updated = { ...mesa, carrinho: mesa.carrinho.filter((item) => item.uid !== uid) };
        updated.status = derivarStatus(updated);
        return updated;
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const confirmarPedido = useCallback((mesaId: string, meta?: PedidoMeta) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;

      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId || mesa.carrinho.length === 0) return mesa;

        const totalPedido = calcularTotalItens(mesa.carrinho);
        const snapshot = mesa.carrinho.map(cloneItem);
        const now = new Date();
        const origem = meta?.modo === "garcom" || meta?.modo === "caixa" ? meta.modo : meta?.modo === "totem" ? "totem" : "cliente";
        const novoPedido: PedidoRealizado = {
          id: `pedido-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
          numeroPedido: mesa.pedidos.length + 1,
          itens: snapshot,
          total: totalPedido,
          criadoEm: formatClock(now),
          criadoEmIso: now.toISOString(),
          origem,
          mesaId,
          garcomId: origem === "garcom" ? meta?.operador?.id : undefined,
          garcomNome: origem === "garcom" ? meta?.operador?.nome : undefined,
          caixaId: origem === "caixa" ? meta?.operador?.id : undefined,
          caixaNome: origem === "caixa" ? meta?.operador?.nome : undefined,
          paraViagem: meta?.paraViagem || false,
        };

        eventInput = origem === "garcom"
          ? {
              tipo: "pedido",
              descricao: `Garçom ${meta?.operador?.nome ?? "identificado"} lançou pedido na ${formatMesaNumero(mesa.numero)}`,
              mesaId,
              usuarioId: meta?.operador?.id,
              usuarioNome: meta?.operador?.nome,
              acao: "lancar_pedido",
            }
          : origem === "caixa"
            ? {
                tipo: "caixa",
                descricao: `Caixa ${meta?.operador?.nome ?? "identificado"} lançou pedido na ${formatMesaNumero(mesa.numero)}`,
                mesaId,
                usuarioId: meta?.operador?.id,
                usuarioNome: meta?.operador?.nome,
                acao: "lancar_pedido",
              }
            : {
                tipo: "pedido",
                descricao: `Cliente da ${formatMesaNumero(mesa.numero)} enviou pedido`,
                mesaId,
                acao: "pedido_cliente",
              };

        return {
          ...mesa,
          carrinho: [],
          pedidos: [...mesa.pedidos, novoPedido],
          total: mesa.total + totalPedido,
          status: "consumo" as const,
        };
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const chamarGarcomFn = useCallback((mesaId: string) => {
    const chamadoEm = Date.now();

    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;

      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;

        eventInput = {
          tipo: "chamado",
          descricao: `Cliente da ${formatMesaNumero(mesa.numero)} chamou garçom`,
          mesaId,
          acao: "chamar_garcom",
        };

        return { ...mesa, chamarGarcom: true, chamadoEm };
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const dismissChamarGarcom = useCallback((mesaId: string) => {
    setStore((prev) => ({
      ...prev,
      mesas: prev.mesas.map((mesa) =>
        mesa.id === mesaId ? { ...mesa, chamarGarcom: false, chamadoEm: null } : mesa,
      ),
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
          const pagamentos = input.pagamentos.map((payment) => ({ ...payment }));
          const resumoPagamento = pagamentos.length === 1
            ? pagamentos[0].formaPagamento
            : `${pagamentos.length} formas de pagamento`;

          const proximoNumeroMesa = (() => {
            try {
              const atual = parseInt(localStorage.getItem("obsidian-contador-comanda-v1") ?? "0", 10);
              const proximo = (isNaN(atual) ? 0 : atual) + 1;
              localStorage.setItem("obsidian-contador-comanda-v1", String(proximo));
              return proximo;
            } catch { return 0; }
          })();

          fechamento = {
            id: `fechamento-${now.getTime()}-${mesa.id}`,
            numeroComanda: proximoNumeroMesa,
            mesaId,
            mesaNumero: mesa.numero,
            total: Math.max(mesa.total - (input?.desconto ?? 0), 0),
            formaPagamento: pagamentos[0].formaPagamento,
            pagamentos,
            itens: mesa.pedidos.flatMap((p) => p.itens.map(cloneItem)),
            criadoEm: formatDateTime(now),
            criadoEmIso: now.toISOString(),
            caixaId: input.usuario.id,
            caixaNome: input.usuario.nome,
            troco: input.troco ?? 0,
            desconto: input?.desconto ?? 0,
            couvert: input?.couvert ?? 0,
            numeroPessoas: input?.numeroPessoas ?? 0,
          };

          eventInput = {
            tipo: "caixa",
            descricao: `Caixa ${input.usuario.nome} fechou conta da ${formatMesaNumero(mesa.numero)} com ${resumoPagamento}`,
            mesaId,
            usuarioId: input.usuario.id,
            usuarioNome: input.usuario.nome,
            acao: "fechar_conta",
            valor: mesa.total,
          };
        }

        return resetMesa(mesa);
      });

      return {
        ...prev,
        mesas,
        fechamentos: fechamento ? [fechamento, ...prev.fechamentos] : prev.fechamentos,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const estornarFechamento = useCallback((
    fechamentoId: string,
    motivo: string,
    operador: OperationalUser
  ) => {
    setStore(prev => {
      const fechamento = prev.fechamentos.find(f => f.id === fechamentoId);
      if (!fechamento) return prev;
      return {
        ...prev,
        fechamentos: prev.fechamentos.map(f =>
          f.id === fechamentoId
            ? {
                ...f,
                cancelado: true,
                canceladoEm: new Date().toISOString(),
                canceladoMotivo: motivo,
                canceladoPor: operador.nome,
              }
            : f
        ),
        eventos: appendEvent(prev.eventos, {
          tipo: "caixa",
          descricao: `Estorno do fechamento da Mesa ${String(fechamento.mesaNumero).padStart(2, "0")} — ${motivo}`,
          mesaId: fechamento.mesaId,
          usuarioId: operador.id,
          usuarioNome: operador.nome,
          acao: "cancelar_pedido",
          valor: fechamento.total,
        }),
      };
    });
  }, []);

  const zerarMesa = useCallback((mesaId: string, audit?: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;

      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;

        if (audit?.usuario) {
          eventInput = {
            tipo: "caixa",
            descricao: `Caixa ${audit.usuario.nome} zerou a ${formatMesaNumero(mesa.numero)}`,
            mesaId,
            usuarioId: audit.usuario.id,
            usuarioNome: audit.usuario.nome,
            acao: "zerar_mesa",
            motivo: audit.motivo,
          };
        }

        return resetMesa(mesa);
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const ajustarItemPedido = useCallback((mesaId: string, pedidoId: string, itemUid: string, delta: number, audit: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;

      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;

        const pedidos = mesa.pedidos
          .map((pedido) => {
            if (pedido.id !== pedidoId) return pedido;

            const targetItem = pedido.itens.find((item) => item.uid === itemUid);
            if (!targetItem) return pedido;

            const newQty = targetItem.quantidade + delta;
            const itens = newQty < 1
              ? pedido.itens.filter((item) => item.uid !== itemUid)
              : pedido.itens.map((item) => (item.uid === itemUid ? { ...item, quantidade: newQty } : item));
            const pedidoCancelado = itens.length === 0;

            eventInput = {
              tipo: "caixa",
              descricao:
                pedidoCancelado
                  ? `Caixa ${audit.usuario.nome} cancelou o Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}`
                  : newQty < 1
                    ? `Caixa ${audit.usuario.nome} excluiu item ${targetItem.nome} do Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}`
                    : `Caixa ${audit.usuario.nome} editou item ${targetItem.nome} do Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}`,
              mesaId,
              usuarioId: audit.usuario.id,
              usuarioNome: audit.usuario.nome,
              acao: pedidoCancelado ? "cancelar_pedido" : newQty < 1 ? "cancelar_item" : "editar_pedido",
              itemNome: targetItem.nome,
              motivo: newQty < 1 ? audit.motivo : undefined,
              pedidoNumero: pedido.numeroPedido,
            };

            return {
              ...pedido,
              itens,
              total: calcularTotalItens(itens),
            };
          })
          .filter((pedido) => pedido.itens.length > 0);

        if (!eventInput) return mesa;

        const total = pedidos.reduce((acc, pedido) => acc + pedido.total, 0);
        const updated = { ...mesa, pedidos, total };
        updated.status = derivarStatus(updated);
        return updated;
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const cancelarPedido = useCallback((mesaId: string, pedidoId: string, audit: ActionAuditInput) => {
    setStore((prev) => {
      let eventInput: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso"> | null = null;

      const mesas = prev.mesas.map((mesa) => {
        if (mesa.id !== mesaId) return mesa;

        const pedido = mesa.pedidos.find((item) => item.id === pedidoId);
        if (!pedido) return mesa;

        eventInput = {
          tipo: "caixa",
          descricao: `Caixa ${audit.usuario.nome} cancelou o Pedido #${pedido.numeroPedido} da ${formatMesaNumero(mesa.numero)}`,
          mesaId,
          usuarioId: audit.usuario.id,
          usuarioNome: audit.usuario.nome,
          acao: "cancelar_pedido",
          motivo: audit.motivo,
          pedidoNumero: pedido.numeroPedido,
        };

        const pedidos = mesa.pedidos.filter((item) => item.id !== pedidoId);
        const total = pedidos.reduce((acc, item) => acc + item.total, 0);
        const updated = { ...mesa, pedidos, total };
        updated.status = derivarStatus(updated);
        return updated;
      });

      return {
        ...prev,
        mesas,
        eventos: eventInput ? appendEvent(prev.eventos, eventInput) : prev.eventos,
      };
    });
  }, []);

  const registrarMovimentacaoCaixa = useCallback((input: MovimentacaoInput) => {
    setStore((prev) => {
      const now = new Date();
      const movimentacao: MovimentacaoCaixa = {
        id: `mov-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        tipo: input.tipo,
        descricao: input.descricao.trim(),
        valor: input.valor,
        criadoEm: formatDateTime(now),
        criadoEmIso: now.toISOString(),
        usuarioId: input.usuario.id,
        usuarioNome: input.usuario.nome,
      };

      return {
        ...prev,
        movimentacoesCaixa: [movimentacao, ...prev.movimentacoesCaixa],
        eventos: appendEvent(prev.eventos, {
          tipo: "movimentacao",
          descricao: `Caixa ${input.usuario.nome} registrou ${input.tipo} de R$ ${input.valor.toFixed(2).replace(".", ",")}`,
          usuarioId: input.usuario.id,
          usuarioNome: input.usuario.nome,
          acao: input.tipo === "entrada" ? "entrada_manual" : "saida_manual",
          valor: input.valor,
        }),
      };
    });
  }, []);

  const marcarPedidoPronto = useCallback((mesaId: string, pedidoId: string) => {
    setStore((prev) => {
      const mesas = prev.mesas.map((m) => {
        if (m.id !== mesaId) return m;
        const pedidos = m.pedidos.map((p) =>
          p.id === pedidoId ? { ...p, pronto: true as const } : p,
        );
        return { ...m, pedidos };
      });
      return {
        ...prev,
        mesas,
        eventos: appendEvent(prev.eventos, {
          tipo: "pedido",
          descricao: `Pedido marcado como pronto`,
          mesaId,
          acao: "pedido_pronto",
        }),
      };
    });
  }, []);

  const abrirCaixa = useCallback((fundoTroco: number, usuario: OperationalUser) => {
    setStore((prev) => ({
      ...prev,
      caixaAberto: true,
      fundoTroco,
      eventos: appendEvent(prev.eventos, {
        tipo: "caixa",
        descricao: `Caixa ${usuario.nome} abriu o caixa com fundo de troco R$ ${fundoTroco.toFixed(2).replace(".", ",")}`,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        acao: "abertura_caixa",
        valor: fundoTroco,
      }),
    }));
  }, []);

  const fecharCaixaDoDia = useCallback((usuario: OperationalUser) => {
    setStore((prev) => ({
      mesas: criarMesasIniciais(),
      eventos: appendEvent(prev.eventos, {
        tipo: "caixa",
        descricao: `Gerente ${usuario.nome} fechou o caixa do dia`,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        acao: "fechamento_dia",
      }),
      movimentacoesCaixa: [],
      fechamentos: [],
      caixaAberto: false,
      fundoTroco: 0,
      pedidosBalcao: [],
    }));
  }, []);

  const criarPedidoBalcao = useCallback((input: CriarPedidoBalcaoInput) => {
    setStore((prev) => {
      const now = new Date();
      const totalPedido = calcularTotalItens(input.itens) + (input.origem === "delivery" ? (input.taxaEntrega ?? 0) : 0);
      const label = input.origem === "delivery" ? `DELIVERY — ${input.clienteNome ?? ""}` : input.origem === "totem" ? "TOTEM" : "BALCÃO";
      const novoPedido: PedidoRealizado = {
        id: `pedido-balcao-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        numeroPedido: prev.pedidosBalcao.length + 1,
        itens: input.itens.map(cloneItem),
        total: totalPedido,
        criadoEm: formatClock(now),
        criadoEmIso: now.toISOString(),
        origem: input.origem,
        mesaId: `balcao-${now.getTime()}`,
        caixaId: input.operador.id,
        caixaNome: input.operador.nome,
        clienteNome: input.clienteNome,
        clienteTelefone: input.clienteTelefone,
        enderecoCompleto: input.enderecoCompleto,
        bairro: input.bairro,
        referencia: input.referencia,
        formaPagamentoDelivery: input.formaPagamentoDelivery,
        trocoParaQuanto: input.trocoParaQuanto,
        observacaoGeral: input.observacaoGeral,
        statusBalcao: input.origem === "delivery" ? "aguardando_confirmacao" : input.origem === "totem" ? "aberto" : "aberto",
      };
      return {
        ...prev,
        pedidosBalcao: [...prev.pedidosBalcao, novoPedido],
        eventos: appendEvent(prev.eventos, {
          tipo: "caixa",
          descricao: `Caixa ${input.operador.nome} criou pedido ${label}`,
          usuarioId: input.operador.id,
          usuarioNome: input.operador.nome,
          acao: "lancar_pedido",
          valor: totalPedido,
        }),
      };
    });
  }, []);

  const marcarPedidoBalcaoPronto = useCallback((pedidoId: string) => {
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) =>
        p.id === pedidoId ? { ...p, pronto: true, statusBalcao: "pronto" as const } : p,
      ),
      eventos: appendEvent(prev.eventos, {
        tipo: "pedido",
        descricao: `Pedido balcão/delivery marcado como pronto`,
        acao: "pedido_pronto",
      }),
    }));
  }, []);

  const marcarBalcaoSaiu = useCallback((pedidoId: string, motoboyNome: string) => {
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) =>
        p.id === pedidoId ? { ...p, statusBalcao: "saiu" as const, motoboyNome } : p,
      ),
      eventos: appendEvent(prev.eventos, {
        tipo: "pedido",
        descricao: `Motoboy ${motoboyNome} retirou pedido delivery`,
        acao: "delivery_saiu",
      }),
    }));
  }, []);

  const marcarBalcaoEntregue = useCallback((pedidoId: string) => {
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) =>
        p.id === pedidoId ? { ...p, statusBalcao: "entregue" as const } : p,
      ),
      eventos: appendEvent(prev.eventos, {
        tipo: "pedido",
        descricao: `Pedido delivery marcado como entregue`,
        acao: "delivery_entregue",
      }),
    }));
  }, []);

  const cancelarEntregaMotoboy = useCallback((pedidoId: string, motivo?: string) => {
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) =>
        p.id === pedidoId ? { ...p, statusBalcao: "devolvido" as const, motoboyNome: undefined } : p,
      ),
      eventos: appendEvent(prev.eventos, {
        tipo: "pedido",
        descricao: `Entrega cancelada pelo motoboy${motivo ? `: ${motivo}` : ""}`,
        acao: "delivery_cancelado_motoboy",
        motivo,
      }),
    }));
  }, []);

  const marcarBalcaoPronto = useCallback((pedidoId: string) => {
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) =>
        p.id === pedidoId ? { ...p, statusBalcao: "pronto" as const, motoboyNome: undefined } : p,
      ),
    }));
  }, []);

  const registrarFechamentoMotoboy = useCallback((input: {
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
  }) => {
    setStore((prev) => {
      const now = new Date();
      const liquidoDinheiro = input.dinheiro - input.troco;
      const totalGeral = liquidoDinheiro + input.fundoTroco + input.pix + input.credito + input.debito;

      const pagamentos: SplitPayment[] = [];
      if (liquidoDinheiro + input.fundoTroco > 0) pagamentos.push({
        id: `pag-din-${now.getTime()}`,
        formaPagamento: "dinheiro",
        valor: liquidoDinheiro + input.fundoTroco,
      });
      if (input.pix > 0) pagamentos.push({
        id: `pag-pix-${now.getTime()}`,
        formaPagamento: "pix",
        valor: input.pix,
      });
      if (input.credito > 0) pagamentos.push({
        id: `pag-cred-${now.getTime()}`,
        formaPagamento: "credito",
        valor: input.credito,
      });
      if (input.debito > 0) pagamentos.push({
        id: `pag-deb-${now.getTime()}`,
        formaPagamento: "debito",
        valor: input.debito,
      });

      const itensMotoboy: ItemCarrinho[] = [];
      prev.pedidosBalcao
        .filter(p => input.pedidosIds.includes(p.id))
        .forEach(p => p.itens.forEach(it => {
          const existente = itensMotoboy.find(i => i.nome === it.nome);
          if (existente) {
            existente.quantidade += it.quantidade;
          } else {
            itensMotoboy.push({ ...it });
          }
        }));

      const fechamento: FechamentoConta = {
        id: `fechamento-motoboy-${now.getTime()}-${input.motoboyId}`,
        mesaId: `delivery-motoboy-${input.motoboyId}`,
        mesaNumero: 0,
        total: totalGeral,
        formaPagamento: pagamentos[0]?.formaPagamento ?? "dinheiro",
        pagamentos: pagamentos.length > 0 ? pagamentos : [{ id: `pag-${now.getTime()}`, formaPagamento: "dinheiro", valor: totalGeral }],
        itens: itensMotoboy,
        criadoEm: formatDateTime(now),
        criadoEmIso: now.toISOString(),
        caixaId: input.motoboyId,
        caixaNome: `Motoboy: ${input.motoboyNome}`,
      };

      return {
        ...prev,
        fechamentos: [fechamento, ...prev.fechamentos],
        eventos: appendEvent(prev.eventos, {
          tipo: "caixa",
          descricao: `Fechamento do motoboy ${input.motoboyNome} conferido por ${input.conferidoPor} — ${input.totalEntregas} entregas — Total R$ ${totalGeral.toFixed(2)}`,
          usuarioNome: input.conferidoPor,
          acao: "fechar_turno",
          valor: totalGeral,
        }),
      };
    });
  }, []);

  const fecharContaBalcao = useCallback((pedidoId: string, input: FecharContaInput) => {
    setStore((prev) => {
      const pedido = prev.pedidosBalcao.find((p) => p.id === pedidoId);
      if (!pedido) return prev;

      const now = new Date();
      const pagamentos = input.pagamentos.map((payment) => ({ ...payment }));
      const resumoPagamento = pagamentos.length === 1
        ? pagamentos[0].formaPagamento
        : `${pagamentos.length} formas de pagamento`;

      const proximoNumeroBalcao = (() => {
        try {
          const atual = parseInt(localStorage.getItem("obsidian-contador-comanda-v1") ?? "0", 10);
          const proximo = (isNaN(atual) ? 0 : atual) + 1;
          localStorage.setItem("obsidian-contador-comanda-v1", String(proximo));
          return proximo;
        } catch { return 0; }
      })();

      const fechamento: FechamentoConta = {
        id: `fechamento-${now.getTime()}-${pedido.id}`,
        numeroComanda: proximoNumeroBalcao,
        mesaId: pedido.mesaId,
        mesaNumero: 0,
        total: Math.max(pedido.total - (input.desconto ?? 0), 0),
        formaPagamento: pagamentos[0].formaPagamento,
        pagamentos,
        itens: pedido.itens.map(cloneItem),
        criadoEm: formatDateTime(now),
        criadoEmIso: now.toISOString(),
        caixaId: input.usuario.id,
        caixaNome: input.usuario.nome,
        troco: input.troco ?? 0,
        desconto: input.desconto ?? 0,
        couvert: input.couvert ?? 0,
        numeroPessoas: input.numeroPessoas ?? 0,
      };

      return {
        ...prev,
        pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
        fechamentos: [fechamento, ...prev.fechamentos],
        eventos: appendEvent(prev.eventos, {
          tipo: "caixa",
          descricao: `Caixa ${input.usuario.nome} fechou conta ${pedido.origem === "delivery" ? "delivery" : "balcão"} — ${pedido.clienteNome ?? ""} com ${resumoPagamento}`,
          usuarioId: input.usuario.id,
          usuarioNome: input.usuario.nome,
          acao: "fechar_conta",
          valor: pedido.total,
        }),
      };
    });
  }, []);

  const confirmarPedidoBalcao = useCallback((pedidoId: string, taxaEntrega?: number) => {
    const cfg = getSistemaConfig();
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => {
        if (p.id !== pedidoId) return p;
        // Delivery: sempre "pronto" para motoboy ver imediatamente (cozinha é paralela)
        // Balcão: respeita config de cozinhaAtiva
        const isDelivery = p.origem === "delivery";
        const statusInicial = isDelivery
          ? "pronto" as const
          : (cfg.cozinhaAtiva ? "aberto" as const : "pronto" as const);
        const taxa = taxaEntrega && taxaEntrega > 0 ? taxaEntrega : 0;
        const taxaItem: ItemCarrinho = { uid: `taxa-${Date.now()}`, produtoId: "taxa-entrega", nome: "Taxa de entrega", precoBase: taxa, quantidade: 1, removidos: [], adicionais: [], precoUnitario: taxa };
        const itensAtualizados = taxa > 0 ? [...p.itens, taxaItem] : p.itens;
        return { ...p, statusBalcao: statusInicial, pronto: statusInicial === "pronto", itens: itensAtualizados, total: p.total + taxa };
      }),
      eventos: appendEvent(prev.eventos, {
        tipo: "caixa",
        descricao: `Pedido delivery confirmado pelo caixa`,
        acao: "confirmar_delivery",
      }),
    }));
  }, []);

  const rejeitarPedidoBalcao = useCallback((pedidoId: string, motivo: string) => {
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
      eventos: appendEvent(prev.eventos, {
        tipo: "caixa",
        descricao: `Pedido delivery rejeitado — ${motivo}`,
        acao: "rejeitar_delivery",
        motivo,
      }),
    }));
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        mesas: store.mesas,
        eventos: store.eventos,
        movimentacoesCaixa: store.movimentacoesCaixa,
        fechamentos: store.fechamentos,
        pedidosBalcao: store.pedidosBalcao,
        caixaAberto: store.caixaAberto,
        fundoTroco: store.fundoTroco,
        allFechamentos,
        allEventos,
        allMovimentacoesCaixa,
        getMesa,
        updateMesa,
        addToCart,
        updateCartItemQty,
        removeFromCart,
        confirmarPedido,
        chamarGarcom: chamarGarcomFn,
        dismissChamarGarcom,
        fecharConta,
        estornarFechamento,
        zerarMesa,
        ajustarItemPedido,
        cancelarPedido,
        marcarPedidoPronto,
        registrarMovimentacaoCaixa,
        abrirCaixa,
        fecharCaixaDoDia,
        criarPedidoBalcao,
        marcarPedidoBalcaoPronto,
        marcarBalcaoSaiu,
        marcarBalcaoEntregue,
        cancelarEntregaMotoboy,
        marcarBalcaoPronto,
        fecharContaBalcao,
        confirmarPedidoBalcao,
        rejeitarPedidoBalcao,
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
