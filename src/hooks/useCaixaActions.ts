import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { OperationalUser, CashMovementType, SplitPayment } from "@/types/operations";
import type { ItemCarrinho, PedidoRealizado, EventoOperacional, MovimentacaoCaixa, FechamentoConta } from "@/types/restaurant";
import type { RestaurantStore } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";
import {
  dbInsertFechamento, dbUpdateFechamento, dbInsertMovimentacao,
  dbUpsertEstadoCaixa, dbSyncEstadoMesa, dbInsertEvento, dbUpdatePedido,
  cloneItem, resetMesa, buildEvent,
  proximoNumeroComanda, proximoNumeroComandaAsync, formatDateTime,
} from "@/services/dbHelpers";

interface MovimentacaoInput {
  tipo: CashMovementType;
  descricao: string;
  valor: number;
  usuario: OperationalUser;
}

// ── Enhanced appendEvent that also persists ──
const appendEventAndPersist = (
  eventos: EventoOperacional[],
  input: Omit<EventoOperacional, "id" | "criadoEm" | "criadoEmIso">,
): EventoOperacional[] => {
  const evt = buildEvent(input);
  dbInsertEvento(evt);
  return [evt, ...eventos].slice(0, 300);
};

export function useCaixaActions(setStore: Dispatch<SetStateAction<RestaurantStore>>, getStoreSnapshot: () => RestaurantStore) {
  const abrirCaixa = useCallback((fundoTroco: number, usuario: OperationalUser) => {
    dbUpsertEstadoCaixa(true, fundoTroco, usuario.nome);
    setStore((prev) => ({
      ...prev, caixaAberto: true, fundoTroco,
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Caixa ${usuario.nome} abriu o caixa com fundo de troco R$ ${fundoTroco.toFixed(2).replace(".", ",")}`, usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "abertura_caixa", valor: fundoTroco }),
    }));
  }, [setStore]);

  const fecharCaixaDoDia = useCallback(async (usuario: OperationalUser, extras?: { diferenca_dinheiro?: number; diferenca_motivo?: string; fundo_proximo?: number }): Promise<{ ok: boolean }> => {
    try { localStorage.removeItem("obsidian-caixa-operadores-v1"); } catch {}

    const prev = getStoreSnapshot();
    const now = new Date();

    // Fix fundo_proximo: save original fundoTroco, not counted total
    const fixedExtras = { ...extras };
    if (fixedExtras.fundo_proximo !== undefined) {
      fixedExtras.fundo_proximo = prev.fundoTroco; // save original fund, not counted cash
    }

    // 2. Persist caixa state FIRST
    await dbUpsertEstadoCaixa(false, 0, usuario.nome, fixedExtras);

    // 3. Close open totem orders
    const pedidosTotemAbertos = prev.pedidosBalcao.filter((p) => p.origem === "totem" && p.statusBalcao !== "pago" && p.statusBalcao !== "cancelado");
    const fechamentosTotemExtras: FechamentoConta[] = [];
    for (const p of pedidosTotemAbertos) {
      const numComanda = await proximoNumeroComandaAsync();
      const f: FechamentoConta = {
        id: `fechamento-totem-auto-${now.getTime()}-${p.id}`, numeroComanda: numComanda, mesaId: p.mesaId, mesaNumero: 0, origem: "totem" as const, total: p.total,
        formaPagamento: "pix" as const, pagamentos: [{ id: `pag-totem-auto-${now.getTime()}-${p.id}`, formaPagamento: "pix" as const, valor: p.total }],
        itens: p.itens.map(cloneItem), criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
        caixaId: "totem-auto", caixaNome: "Totem Autoatendimento (fechamento automático)", troco: 0, subtotal: p.total, desconto: 0,
      };
      await dbInsertFechamento(f);
      fechamentosTotemExtras.push(f);
    }

    // 4. Mark open balcão/delivery pedidos as cancelado
    const pedidosBalcaoAbertos = prev.pedidosBalcao.filter((p) =>
      p.origem !== "totem" && p.statusBalcao !== "pago" && p.statusBalcao !== "cancelado"
    );
    for (const p of pedidosBalcaoAbertos) {
      await dbUpdatePedido(p.id, {
        status_balcao: "cancelado",
        cancelado: true,
        cancelado_em: now.toISOString(),
        cancelado_motivo: "Fechamento do turno",
        cancelado_por: usuario.nome,
      });
    }

    // 5. Reset all mesas and mark mesa orders as paid
    const mesasReset = prev.mesas.map(m => resetMesa(m));
    for (const mesa of prev.mesas) {
      for (const pedido of mesa.pedidos) {
        await dbUpdatePedido(pedido.id, { status_balcao: "pago" });
      }
    }
    for (const m of mesasReset) { await dbSyncEstadoMesa(m); }

    // 6. NOW update local state
    setStore((prevState) => ({
      ...prevState,
      mesas: mesasReset,
      eventos: appendEventAndPersist(prevState.eventos, { tipo: "caixa", descricao: `Gerente ${usuario.nome} fechou o caixa do dia`, usuarioId: usuario.id, usuarioNome: usuario.nome, acao: "fechamento_dia" }),
      movimentacoesCaixa: [], fechamentos: [...fechamentosTotemExtras, ...prevState.fechamentos],
      caixaAberto: false, fundoTroco: 0, pedidosBalcao: [],
    }));

    return { ok: true };
  }, [setStore]);

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
  }, [setStore]);

  const registrarFechamentoMotoboy = useCallback(async (input: {
    motoboyNome: string; motoboyId: string; dinheiro: number; troco: number; fundoTroco: number;
    pix: number; credito: number; debito: number; totalEntregas: number; pedidosIds: string[]; conferidoPor: string;
  }) => {
    const numComanda = await proximoNumeroComandaAsync();
    const prev = getStoreSnapshot();
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
      numeroComanda: numComanda, mesaId: `delivery-motoboy-${input.motoboyId}`, mesaNumero: 0, origem: "motoboy" as const,
      total: totalGeral, subtotal: totalGeral,
      formaPagamento: pagamentos[0]?.formaPagamento ?? "dinheiro",
      pagamentos: pagamentos.length > 0 ? pagamentos : [{ id: `pag-${now.getTime()}`, formaPagamento: "dinheiro", valor: totalGeral }],
      itens: itensMotoboy, criadoEm: formatDateTime(now), criadoEmIso: now.toISOString(),
      caixaId: input.motoboyId, caixaNome: `Motoboy: ${input.motoboyNome}`,
    };
    await dbInsertFechamento(fechamento);
    setStore((prevState) => ({
      ...prevState,
      fechamentos: [fechamento, ...prevState.fechamentos],
      eventos: appendEventAndPersist(prevState.eventos, { tipo: "caixa", descricao: `Fechamento do motoboy ${input.motoboyNome} conferido por ${input.conferidoPor} — ${input.totalEntregas} entregas — Total R$ ${totalGeral.toFixed(2)}`, usuarioNome: input.conferidoPor, acao: "fechar_turno", valor: totalGeral }),
    }));
  }, [setStore, getStoreSnapshot]);

  const estornarFechamento = useCallback(async (fechamentoId: string, motivo: string, operador: OperationalUser) => {
    const currentStore = getStoreSnapshot();

    const fechamento = currentStore.fechamentos.find(f => f.id === fechamentoId);
    if (!fechamento) return;

    // 1. Mark fechamento as cancelled
    dbUpdateFechamento(fechamentoId, { cancelado: true, cancelado_em: new Date().toISOString(), cancelado_motivo: motivo, cancelado_por: operador.nome });

    // 2. Reopen pedidos from this fechamento (set them back to "aberto")
    // Find pedidos by mesaId that were paid around the same time
    if (fechamento.mesaId) {
      // For mesa fechamentos, find all pedidos from this mesa that were marked as "pago"
      // and reopen them so the mesa reappears
      const allPedidosRes = await supabase.rpc("rpc_get_operational_pedidos" as any, { _store_id: getActiveStoreId() });
      const allPedidos = (allPedidosRes.data ?? []) as any[];
      const mesaPedidosPagos = allPedidos.filter((p: any) =>
        p.mesa_id === fechamento.mesaId && p.status_balcao === "pago" && !p.cancelado
      );
      for (const p of mesaPedidosPagos) {
        await dbUpdatePedido(p.id, { status_balcao: "aberto" });
      }
    }

    // 3. Update local state
    setStore(prev => ({
      ...prev,
      fechamentos: prev.fechamentos.map(f => f.id === fechamentoId ? { ...f, cancelado: true, canceladoEm: new Date().toISOString(), canceladoMotivo: motivo, canceladoPor: operador.nome } : f),
      eventos: appendEventAndPersist(prev.eventos, { tipo: "caixa", descricao: `Estorno do fechamento da Mesa ${String(fechamento.mesaNumero).padStart(2, "0")} — ${motivo}`, mesaId: fechamento.mesaId, usuarioId: operador.id, usuarioNome: operador.nome, acao: "cancelar_pedido", valor: fechamento.total }),
    }));
  }, [setStore]);

  return {
    abrirCaixa,
    fecharCaixaDoDia,
    registrarMovimentacaoCaixa,
    registrarFechamentoMotoboy,
    estornarFechamento,
  };
}
