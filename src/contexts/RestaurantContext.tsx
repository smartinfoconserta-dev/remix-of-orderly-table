import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CashMovementType, OperationalUser, PaymentMethod, SplitPayment } from "@/types/operations";
import { getSistemaConfig, getSistemaConfigAsync } from "@/lib/adminStorage";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { useMesaActions } from "@/hooks/useMesaActions";
import { useBalcaoActions } from "@/hooks/useBalcaoActions";
import { useCaixaActions } from "@/hooks/useCaixaActions";

// Types — re-exported for backward compatibility
import type {
  ItemCarrinho, PedidoRealizado, EventoOperacional,
  MovimentacaoCaixa, FechamentoConta, Mesa,
} from "@/types/restaurant";
export type { ItemCarrinho, PedidoRealizado, EventoOperacional, MovimentacaoCaixa, FechamentoConta, Mesa };

// DB helpers & pure functions
import {
  pedidoToRow, rowToPedido, fechamentoToRow, rowToFechamento,
  eventoToRow, rowToEvento, movToRow, rowToMovimentacao,
  dbInsertPedido, dbUpdatePedido, dbInsertFechamento, dbUpdateFechamento,
  dbInsertEvento, dbInsertMovimentacao, dbUpsertEstadoCaixa, dbSyncEstadoMesa,
  decrementStock, normalizeItem, cloneItem, calcularTotalItens,
  criarMesasIniciais, derivarStatus, resetMesa, buildEvent, appendEvent,
  proximoNumeroPedido, proximoNumeroComanda, _nextPedidoNumber,
  setNextPedidoNumber, setContadorComanda,
  formatMesaNumero, formatClock, formatDateTime,
} from "@/services/dbHelpers";

const BALCAO_ORIGINS = ["balcao", "delivery", "totem", "ifood"] as const;

export interface PedidoMeta {
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

export interface ActionAuditInput {
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
  origemOverride?: FechamentoConta["origem"];
}

export interface RestaurantStore {
  mesas: Mesa[];
  eventos: EventoOperacional[];
  movimentacoesCaixa: MovimentacaoCaixa[];
  fechamentos: FechamentoConta[];
  caixaAberto: boolean;
  fundoTroco: number;
  pedidosBalcao: PedidoRealizado[];
}

export interface CriarPedidoBalcaoInput {
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

const estadoInicial = (): RestaurantStore => ({
  mesas: [], eventos: [], movimentacoesCaixa: [], fechamentos: [], caixaAberto: false, fundoTroco: 0, pedidosBalcao: [],
});

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
  // Debounce: ignore Realtime/polling caixa overrides for 15s after a local change
  const caixaLocalChangeTs = useRef(0);
  const { operationalSession, authLevel } = useAuth();
  const { storeId: contextStoreId } = useStore();
  const loadedStoreRef = useRef<string | null>(null);
  const derivedStoreId = operationalSession?.storeId ?? contextStoreId ?? null;
  const [activeStoreId, setActiveStoreId] = useState<string | null>(() => derivedStoreId ?? getActiveStoreId());

  // Sync active store changes from auth/device sessions with a polling fallback
  useEffect(() => {
    const syncActiveStoreId = () => {
      const current = derivedStoreId ?? getActiveStoreId();
      setActiveStoreId(prev => prev !== current ? current : prev);
      if (!current && authLevel === "unauthenticated") {
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
      if (loadedStoreRef.current === sid) return;
      loadedStoreRef.current = sid;

      console.log("[RestaurantContext] Loading data for store:", sid);
      await getSistemaConfigAsync(sid);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = today.toISOString();

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

      const { data: maxPedidoData } = await supabase
        .from("pedidos")
        .select("numero_pedido")
        .eq("store_id", sid)
        .order("numero_pedido", { ascending: false })
        .limit(1);
      setNextPedidoNumber((maxPedidoData?.[0]?.numero_pedido ?? 0) + 1);

      const allPedidos = (pedidosRes.data ?? []).map(rowToPedido);
      const pedidosMesa = allPedidos.filter(p => !(BALCAO_ORIGINS as ReadonlyArray<string>).includes(p.origem));
      const pedidosBalcao = allPedidos.filter(p => (BALCAO_ORIGINS as ReadonlyArray<string>).includes(p.origem));
      const fechamentos = (fechRes.data ?? []).map(rowToFechamento);
      const maxComanda = fechamentos.reduce((max, f) => Math.max(max, f.numeroComanda ?? 0), 0);
      setContadorComanda(maxComanda);
      const eventos = (evtRes.data ?? []).map(rowToEvento);
      const movimentacoes = (movRes.data ?? []).map(rowToMovimentacao);

      console.log(`[RestaurantContext] Loaded: ${allPedidos.length} pedidos, ${fechamentos.length} fechamentos, caixa: ${caixaRes.data?.[0]?.aberto ?? "N/A"}`);

      const estadoMesasMap = new Map<string, any>();
      for (const row of (estadoMesasRes.data ?? [])) {
        estadoMesasMap.set(row.mesa_id ?? row.id, row);
      }

      const pedidosPorMesa = new Map<string, PedidoRealizado[]>();
      for (const p of pedidosMesa) {
        if (!p.mesaId) continue;
        const arr = pedidosPorMesa.get(p.mesaId) ?? [];
        arr.push(p);
        pedidosPorMesa.set(p.mesaId, arr);
      }

      const mesasDb = mesasDbRes.data ?? [];
      const mesasList = mesasDb.length > 0 ? mesasDb : criarMesasIniciais();

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
        mesas, eventos, movimentacoesCaixa: movimentacoes, fechamentos,
        caixaAberto: caixaRow?.aberto ?? false,
        fundoTroco: Number(caixaRow?.fundo_troco ?? 0),
        pedidosBalcao,
      });
      const allFechs = (allFechRes.data ?? []).map(rowToFechamento);
      setAllFechamentos(allFechs);
      setAllEventos(eventos);
      setAllMovimentacoesCaixa(movimentacoes);
    };

    load();

    const retryInterval = setInterval(() => {
      const sid = getActiveStoreId();
      if (sid && loadedStoreRef.current !== sid) { load(); }
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
            if ((BALCAO_ORIGINS as ReadonlyArray<string>).includes(p.origem)) {
              if (prev.pedidosBalcao.find(x => x.id === p.id)) return prev;
              return { ...prev, pedidosBalcao: [...prev.pedidosBalcao, p] };
            } else {
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
            const isBalcaoOrigin = (BALCAO_ORIGINS as ReadonlyArray<string>).includes(p.origem);
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
          // Skip if a local caixa change happened recently (debounce race condition)
          if (Date.now() - caixaLocalChangeTs.current < 15_000) return;
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
              const pedidos = Array.isArray(row.pedidos) ? (row.pedidos as any[]) as typeof m.pedidos : m.pedidos;
              const total = typeof row.total === "number" ? row.total : m.total;
              const chamarGarcom = row.chamar_garcom ?? m.chamarGarcom;
              const chamadoEm = row.chamado_em ?? m.chamadoEm;
              const status = row.status ?? m.status;
              const updated = { ...m, carrinho, pedidos, total, chamarGarcom, chamadoEm, status };
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
      const [pedidosRes, fechRes, caixaRes] = await Promise.all([
        supabase.rpc("rpc_get_operational_pedidos" as any, { _store_id: sid }),
        supabase.from("fechamentos").select("*").eq("store_id", sid).gte("criado_em_iso", todayIso).order("criado_em_iso", { ascending: false }),
        supabase.from("estado_caixa").select("*").eq("store_id", sid).order("updated_at", { ascending: false }).limit(1),
      ]);

      const { data: pedidosData, error: pedidosErr } = pedidosRes;
      if (!pedidosErr && pedidosData) {
        const freshPedidos = (pedidosData as any[]).map(rowToPedido);
        const freshBalcao = freshPedidos.filter(p => (BALCAO_ORIGINS as ReadonlyArray<string>).includes(p.origem));

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

        // Skip mesa re-population during debounce window (after fecharCaixaDoDia)
        const freshMesa = freshPedidos.filter(p => !(BALCAO_ORIGINS as ReadonlyArray<string>).includes(p.origem));
        if (freshMesa.length > 0 && Date.now() - caixaLocalChangeTs.current >= 15_000) {
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

      const { data: fechData } = fechRes;
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

      const { data: caixaData } = caixaRes;
      if (caixaData?.[0] && Date.now() - caixaLocalChangeTs.current >= 15_000) {
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

  // ── Hooks for actions ──
  const mesaActions = useMesaActions(setStore);
  const balcaoActions = useBalcaoActions(setStore);
  const caixaActions = useCaixaActions(setStore);

  // Wrap caixa actions to stamp local change timestamp (prevents Realtime/polling race)
  const wrappedAbrirCaixa = useCallback((...args: Parameters<typeof caixaActions.abrirCaixa>) => {
    caixaLocalChangeTs.current = Date.now();
    caixaActions.abrirCaixa(...args);
  }, [caixaActions.abrirCaixa]);
  const wrappedFecharCaixaDoDia = useCallback((...args: Parameters<typeof caixaActions.fecharCaixaDoDia>) => {
    caixaLocalChangeTs.current = Date.now();
    caixaActions.fecharCaixaDoDia(...args);
  }, [caixaActions.fecharCaixaDoDia]);

  return (
    <RestaurantContext.Provider
      value={{
        mesas: store.mesas, eventos: store.eventos, movimentacoesCaixa: store.movimentacoesCaixa,
        fechamentos: store.fechamentos, pedidosBalcao: store.pedidosBalcao,
        caixaAberto: store.caixaAberto, fundoTroco: store.fundoTroco,
        allFechamentos, allEventos, allMovimentacoesCaixa,
        getMesa, updateMesa,
        ...mesaActions,
        chamarGarcom: mesaActions.chamarGarcom,
        ...caixaActions,
        abrirCaixa: wrappedAbrirCaixa,
        fecharCaixaDoDia: wrappedFecharCaixaDoDia,
        ...balcaoActions,
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
