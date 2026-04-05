import { useCallback } from "react";
import { toast } from "sonner";
import type { Dispatch, SetStateAction } from "react";
import type { OperationalUser, PaymentMethod, SplitPayment } from "@/types/operations";
import type { ItemCarrinho, PedidoRealizado, EventoOperacional, FechamentoConta } from "@/types/restaurant";
import type { RestaurantStore, FecharContaInput, CriarPedidoBalcaoInput } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";
import { getSistemaConfig } from "@/lib/adminStorage";
import {
  dbInsertPedido, dbUpdatePedido, dbInsertFechamento,
  cloneItem, calcularTotalItens, buildEvent, dbInsertEvento,
  proximoNumeroPedido, proximoNumeroComanda,
  formatClock, formatDateTime,
} from "@/services/dbHelpers";

// ── Enhanced appendEvent that also persists ──
const appendEventAndPersist = (
  eventos: EventoOperacional[],
  input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">,
): EventoOperacional[] => {
  const evt = buildEvent(input);
  dbInsertEvento(evt);
  return [evt, ...eventos].slice(0, 300);
};

export function useBalcaoActions(setStore: Dispatch<SetStateAction<RestaurantStore>>) {
  const criarPedidoBalcao = useCallback(async (input: CriarPedidoBalcaoInput): Promise<number> => {
    const sid = getActiveStoreId();
    const fallback = proximoNumeroPedido();
    let numeroPedido = fallback;
    try {
      const { data: nextNum } = await supabase.rpc("next_order_number", { _store_id: sid });
      if (typeof nextNum === "number") numeroPedido = nextNum;
    } catch {
      const deviceOffset = parseInt(localStorage.getItem("device-order-offset") || "0", 10);
      if (!deviceOffset) {
        const offset = Math.floor(Math.random() * 900) + 100;
        localStorage.setItem("device-order-offset", String(offset));
        numeroPedido += offset;
      } else {
        numeroPedido += deviceOffset;
      }
    }

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
  }, [setStore]);

  const marcarPedidoBalcaoPronto = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { pronto: true, status_balcao: "pronto" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, pronto: true, statusBalcao: "pronto" as const } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Pedido balcão/delivery marcado como pronto`, acao: "pedido_pronto" }),
    }));
  }, [setStore]);

  const marcarBalcaoSaiu = useCallback((pedidoId: string, motoboyNome: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "saiu", motoboy_nome: motoboyNome });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "saiu" as const, motoboyNome } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Motoboy ${motoboyNome} retirou pedido delivery`, acao: "delivery_saiu" }),
    }));
  }, [setStore]);

  const marcarBalcaoEntregue = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "entregue" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "entregue" as const } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Pedido delivery marcado como entregue`, acao: "delivery_entregue" }),
    }));
  }, [setStore]);

  const cancelarEntregaMotoboy = useCallback((pedidoId: string, motivo?: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "devolvido", motoboy_nome: null });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "devolvido" as const, motoboyNome: undefined } : p),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Entrega cancelada pelo motoboy${motivo ? `: ${motivo}` : ""}`, acao: "delivery_cancelado_motoboy", motivo }),
    }));
  }, [setStore]);

  const marcarBalcaoPronto = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "pronto", motoboy_nome: null });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "pronto" as const, motoboyNome: undefined } : p),
    }));
  }, [setStore]);

  const fecharContaBalcao = useCallback(async (pedidoId: string, input: FecharContaInput): Promise<{ ok: boolean }> => {
    // Read current store
    let currentStore: RestaurantStore | null = null;
    setStore(prev => { currentStore = prev; return prev; });
    if (!currentStore) return { ok: false };

    const pedido = (currentStore as RestaurantStore).pedidosBalcao.find((p) => p.id === pedidoId);
    if (!pedido) return { ok: false };

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

    // 1. Persist fechamento
    const fechResult = await dbInsertFechamento(fechamento);
    if (!fechResult.ok) {
      toast.error("Erro ao salvar fechamento. Tente novamente.");
      return { ok: false };
    }

    // 2. Mark order as paid
    await dbUpdatePedido(pedidoId, { status_balcao: "pago" });

    // 3. Only NOW update local state
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
      fechamentos: [fechamento, ...prev.fechamentos],
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Caixa ${input.usuario.nome} fechou conta ${pedido.origem === "delivery" ? "delivery" : "balcão"} — ${pedido.clienteNome ?? ""} com ${resumoPagamento}`, usuarioId: input.usuario.id, usuarioNome: input.usuario.nome, acao: "fechar_conta", valor: pedido.total }),
    }));

    return { ok: true };
  }, [setStore]);

  const confirmarPedidoBalcao = useCallback((pedidoId: string, taxaEntrega?: number) => {
    const cfg = getSistemaConfig();
    setStore((prev) => {
      const pedido = prev.pedidosBalcao.find(p => p.id === pedidoId);
      if (!pedido) return prev;
      const isDelivery = pedido.origem === "delivery";
      const cozinhaLigada = !!(cfg.modulos as any)?.cozinha;
      const statusInicial = isDelivery ? "pronto" as const : (cozinhaLigada ? "aberto" as const : "pronto" as const);
      const taxa = taxaEntrega && taxaEntrega > 0 ? taxaEntrega : 0;
      // Guard: don't add taxa if already present
      const alreadyHasTaxa = pedido.itens.some(it => it.produtoId === "taxa-entrega");
      const taxaItem: ItemCarrinho = { uid: `taxa-${Date.now()}`, produtoId: "taxa-entrega", nome: "Taxa de entrega", precoBase: taxa, quantidade: 1, removidos: [], adicionais: [], precoUnitario: taxa };
      const itensAtualizados = taxa > 0 && !alreadyHasTaxa ? [...pedido.itens, taxaItem] : pedido.itens;
      const newTotal = alreadyHasTaxa ? pedido.total : pedido.total + taxa;
      dbUpdatePedido(pedidoId, { status_balcao: statusInicial, pronto: statusInicial === "pronto", itens: JSON.parse(JSON.stringify(itensAtualizados)), total: newTotal });
      return {
        ...prev,
        pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: statusInicial, pronto: statusInicial === "pronto", itens: itensAtualizados, total: newTotal } : p),
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Pedido delivery confirmado pelo caixa`, acao: "confirmar_delivery" }),
      };
    });
  }, [setStore]);

  const rejeitarPedidoBalcao = useCallback((pedidoId: string, motivo: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "cancelado", cancelado: true, cancelado_motivo: motivo });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Pedido delivery rejeitado — ${motivo}`, acao: "rejeitar_delivery", motivo }),
    }));
  }, [setStore]);

  const cancelarPedidoBalcao = useCallback((pedidoId: string, motivo: string, operador: OperationalUser) => {
    const now = new Date();
    dbUpdatePedido(pedidoId, { status_balcao: "cancelado", cancelado: true, cancelado_em: now.toISOString(), cancelado_motivo: motivo, cancelado_por: operador.nome });
    setStore((prev) => {
      const pedido = prev.pedidosBalcao.find((p) => p.id === pedidoId);
      if (!pedido) return prev;
      return {
        ...prev,
        pedidosBalcao: prev.pedidosBalcao.filter((p) => p.id !== pedidoId),
        eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Pedido ${pedido.origem === "totem" ? "TOTEM" : pedido.origem === "delivery" ? "DELIVERY" : "BALCÃO"} #${pedido.numeroPedido} cancelado por ${operador.nome} — ${motivo}`, usuarioId: operador.id, usuarioNome: operador.nome, acao: "cancelar_pedido", motivo, valor: pedido.total }),
      };
    });
  }, [setStore]);

  const marcarBalcaoRetirado = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "retirado" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "retirado" as const } : p),
    }));
  }, [setStore]);

  const marcarBalcaoPreparando = useCallback((pedidoId: string) => {
    dbUpdatePedido(pedidoId, { status_balcao: "preparando" });
    setStore((prev) => ({
      ...prev,
      pedidosBalcao: prev.pedidosBalcao.map((p) => p.id === pedidoId ? { ...p, statusBalcao: "preparando" as const } : p),
    }));
  }, [setStore]);

  return {
    criarPedidoBalcao,
    marcarPedidoBalcaoPronto,
    marcarBalcaoSaiu,
    marcarBalcaoEntregue,
    cancelarEntregaMotoboy,
    marcarBalcaoPronto,
    fecharContaBalcao,
    confirmarPedidoBalcao,
    rejeitarPedidoBalcao,
    cancelarPedidoBalcao,
    marcarBalcaoRetirado,
    marcarBalcaoPreparando,
  };
}
