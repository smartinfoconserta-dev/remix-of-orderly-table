import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { OperationalUser } from "@/types/operations";
import type { ItemCarrinho, PedidoRealizado, EventoOperacional, FechamentoConta, Mesa } from "@/types/restaurant";
import type { RestaurantStore, ActionAuditInput, PedidoMeta, FecharContaInput } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";
import {
  dbInsertPedido, dbUpdatePedido, dbInsertFechamento, dbSyncEstadoMesa,
  cloneItem, calcularTotalItens, derivarStatus, resetMesa, buildEvent,
  dbInsertEvento, proximoNumeroPedido, proximoNumeroComanda,
  _nextPedidoNumber, setNextPedidoNumber,
  formatMesaNumero, formatClock, formatDateTime,
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

export function useMesaActions(setStore: Dispatch<SetStateAction<RestaurantStore>>) {
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
  }, [setStore]);

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
  }, [setStore]);

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
  }, [setStore]);

  const confirmarPedido = useCallback(async (mesaId: string, meta?: PedidoMeta) => {
    const sid = getActiveStoreId();
    let realNum = proximoNumeroPedido();
    if (sid) {
      try {
        const { data: nextNum } = await supabase.rpc("next_order_number" as any, { _store_id: sid });
        if (typeof nextNum === "number") { realNum = nextNum; if (nextNum >= _nextPedidoNumber) setNextPedidoNumber(nextNum + 1); }
      } catch (err) {
        console.error("confirmarPedido: next_order_number error", err);
        const deviceOffset = parseInt(localStorage.getItem("device-order-offset") || "0", 10);
        if (!deviceOffset) {
          const offset = Math.floor(Math.random() * 900) + 100;
          localStorage.setItem("device-order-offset", String(offset));
          realNum += offset;
        } else {
          realNum += deviceOffset;
        }
      }
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

      if (sid) {
        dbInsertPedido(novoPedido);
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
  }, [setStore]);

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
  }, [setStore]);

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
  }, [setStore]);

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
            mesaId, mesaNumero: mesa.numero, origem: (input.origemOverride ?? "mesa") as FechamentoConta["origem"],
            total: Math.max(mesa.total - (input?.desconto ?? 0), 0), formaPagamento: pagamentos[0].formaPagamento,
            pagamentos, itens: mesa.pedidos.flatMap((p) => p.itens.map(cloneItem)),
            criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
            caixaId: input.usuario.id, caixaNome: input.usuario.nome,
            troco: input.troco ?? 0, subtotal: mesa.total, desconto: input?.desconto ?? 0,
            couvert: input?.couvert ?? 0, numeroPessoas: input?.numeroPessoas ?? 0,
            cpfNota: input?.cpfNota,
          };
          dbInsertFechamento(fechamento);
          mesa.pedidos.forEach((pedido) => {
            dbUpdatePedido(pedido.id, { status_balcao: "pago" });
          });
          eventInput = { tipo: "caixa", descricao: `Caixa ${input.usuario.nome} fechou conta da ${formatMesaNumero(mesa.numero)} com ${resumoPagamento}`, mesaId, usuarioId: input.usuario.id, usuarioNome: input.usuario.nome, acao: "fechar_conta", valor: mesa.total };
        }
        const reset = resetMesa(mesa);
        dbSyncEstadoMesa(reset);
        return reset;
      });
      return { ...prev, mesas, fechamentos: fechamento ? [fechamento, ...prev.fechamentos] : prev.fechamentos, eventos: eventInput ? appendEventAndPersist(prev.eventos, eventInput) : prev.eventos };
    });
  }, [setStore]);

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
  }, [setStore]);

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
  }, [setStore]);

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
  }, [setStore]);

  const marcarPedidoPronto = useCallback((mesaId: string, pedidoId: string) => {
    dbUpdatePedido(pedidoId, { pronto: true });
    setStore((prev) => {
      const mesas = prev.mesas.map((m) => {
        if (m.id !== mesaId) return m;
        return { ...m, pedidos: m.pedidos.map((p) => p.id === pedidoId ? { ...p, pronto: true as const } : p) };
      });
      return { ...prev, mesas, eventos: appendEventAndPersist(prev.eventos, { tipo: "pedido", descricao: `Pedido marcado como pronto`, mesaId, acao: "pedido_pronto" }) };
    });
  }, [setStore]);

  return {
    addToCart,
    updateCartItemQty,
    removeFromCart,
    confirmarPedido,
    chamarGarcom: chamarGarcomFn,
    dismissChamarGarcom,
    fecharConta,
    zerarMesa,
    ajustarItemPedido,
    cancelarPedido,
    marcarPedidoPronto,
  };
}
