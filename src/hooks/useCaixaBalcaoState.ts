import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaymentMethod, SplitPayment } from "@/types/operations";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import { getBairrosAsync, type Bairro, type ClienteDelivery } from "@/lib/deliveryStorage";
import { getActiveStoreId } from "@/lib/sessionManager";
import { toCents, parseCurrencyInput } from "@/components/caixa/caixaHelpers";
import type { PedidoRealizado } from "@/types/restaurant";

export function useCaixaBalcaoState(pedidosBalcao: PedidoRealizado[]) {
  /* ── core balcão/delivery states ── */
  const [balcaoOpen, setBalcaoOpen] = useState(false);
  const [balcaoTipo, setBalcaoTipo] = useState<"balcao" | "delivery">("balcao");
  const [balcaoClienteNome, setBalcaoClienteNome] = useState("");
  const [balcaoTelefone, setBalcaoTelefone] = useState("");
  const [balcaoEndereco, setBalcaoEndereco] = useState("");
  const [balcaoBairro, setBalcaoBairro] = useState("");
  const [balcaoReferencia, setBalcaoReferencia] = useState("");
  const [balcaoFormaPag, setBalcaoFormaPag] = useState<PaymentMethod>("dinheiro");
  const [balcaoTroco, setBalcaoTroco] = useState("");
  const [balcaoCpf, setBalcaoCpf] = useState("");
  const [balcaoNumero, setBalcaoNumero] = useState("");
  const [balcaoComplemento, setBalcaoComplemento] = useState("");
  const [deliveryBusca, setDeliveryBusca] = useState("");
  const [deliveryResultados, setDeliveryResultados] = useState<ClienteDelivery[]>([]);
  const [deliveryStep, setDeliveryStep] = useState<"busca" | "form">("busca");
  const [deliveryCep, setDeliveryCep] = useState("");
  const [deliveryCepLoading, setDeliveryCepLoading] = useState(false);
  const [deliveryCepErro, setDeliveryCepErro] = useState("");
  const [deliveryCidade, setDeliveryCidade] = useState("");
  const [balcaoPedidoSelecionado, setBalcaoPedidoSelecionado] = useState<string | null>(null);
  const [balcaoPayments, setBalcaoPayments] = useState<SplitPayment[]>([]);
  const [balcaoPaymentMethod, setBalcaoPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [balcaoPaymentValue, setBalcaoPaymentValue] = useState("");
  const [balcaoValorEntregue, setBalcaoValorEntregue] = useState("");
  const [balcaoFlowAtivo, setBalcaoFlowAtivo] = useState(false);

  /* ── delivery confirm / reject ── */
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [deliveryPendingItens, setDeliveryPendingItens] = useState<ItemCarrinho[]>([]);
  const [deliveryPendingParaViagem, setDeliveryPendingParaViagem] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectPedidoId, setRejectPedidoId] = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");
  const [confirmTempoId, setConfirmTempoId] = useState<string | null>(null);
  const [confirmTempo, setConfirmTempo] = useState("");
  const [confirmTempoCustom, setConfirmTempoCustom] = useState("");
  const [confirmTaxaEntrega, setConfirmTaxaEntrega] = useState("");
  const [deliveryTempoEstimado, setDeliveryTempoEstimado] = useState("");

  /* ── search / cpf / bairros ── */
  const [buscaDelivery, setBuscaDelivery] = useState("");
  const [cpfNotaBalcao, setCpfNotaBalcao] = useState("");
  const [cpfNotaBalcaoOpen, setCpfNotaBalcaoOpen] = useState(false);
  const [bairrosCache, setBairrosCache] = useState<Bairro[]>([]);
  const caixaStoreIdRef = useRef<string | null>(null);

  /* ── load bairros on mount ── */
  useEffect(() => {
    const sid = getActiveStoreId();
    caixaStoreIdRef.current = sid;
    if (sid) getBairrosAsync(sid).then(setBairrosCache);
  }, []);

  /* ── reset ── */
  const resetBalcaoStates = useCallback(() => {
    setBalcaoFlowAtivo(false);
    setBalcaoOpen(false);
    setBalcaoTipo("balcao");
    setBalcaoClienteNome("");
    setBalcaoTelefone("");
    setBalcaoEndereco("");
    setBalcaoBairro("");
    setBalcaoReferencia("");
    setBalcaoFormaPag("dinheiro");
    setBalcaoTroco("");
    setBalcaoCpf("");
    setBalcaoNumero("");
    setBalcaoComplemento("");
    setDeliveryBusca("");
    setDeliveryResultados([]);
    setDeliveryStep("busca");
    setDeliveryCep("");
    setDeliveryCepLoading(false);
    setDeliveryCepErro("");
    setDeliveryCidade("");
  }, []);

  /* ── payment math (balcão) ── */
  const balcaoPedidoFromList = balcaoPedidoSelecionado
    ? pedidosBalcao.find((p) => p.id === balcaoPedidoSelecionado) ?? null
    : null;
  // Keep a snapshot so the order doesn't vanish mid-payment if polling updates the list
  const balcaoPedidoSnapshotRef = useRef<PedidoRealizado | null>(null);
  if (balcaoPedidoFromList) {
    balcaoPedidoSnapshotRef.current = balcaoPedidoFromList;
  }
  if (!balcaoPedidoSelecionado) {
    balcaoPedidoSnapshotRef.current = null;
  }
  const balcaoPedido = balcaoPedidoFromList ?? balcaoPedidoSnapshotRef.current;
  const balcaoTotalConta = balcaoPedido?.total ?? 0;
  const balcaoTotalContaCents = toCents(balcaoTotalConta);
  const balcaoTotalPago = useMemo(() => balcaoPayments.reduce((acc, p) => acc + p.valor, 0), [balcaoPayments]);
  const balcaoTotalPagoCents = toCents(balcaoTotalPago);
  const balcaoValorRestante = Math.max((balcaoTotalContaCents - balcaoTotalPagoCents) / 100, 0);
  const balcaoFechamentoPronto = balcaoTotalContaCents > 0 && balcaoTotalPagoCents === balcaoTotalContaCents;
  const balcaoPaymentProgress = balcaoTotalContaCents > 0 ? Math.min(balcaoTotalPagoCents / balcaoTotalContaCents, 1) : 0;
  const balcaoValorEntregueNum = parseCurrencyInput(balcaoValorEntregue);
  const balcaoTrocoCalculado = balcaoPaymentMethod === "dinheiro" && Number.isFinite(balcaoValorEntregueNum) && balcaoValorEntregueNum > balcaoValorRestante
    ? balcaoValorEntregueNum - balcaoValorRestante : 0;

  /* ── derived order lists ── */
  const pedidosBalcaoAtivos = useMemo(() => pedidosBalcao.filter((p) => p.statusBalcao !== "pago" && p.statusBalcao !== "cancelado"), [pedidosBalcao]);
  const pedidosDeliveryAtivos = useMemo(() => pedidosBalcaoAtivos.filter((p) => p.origem === "delivery" && p.statusBalcao !== "aguardando_confirmacao"), [pedidosBalcaoAtivos]);
  const pedidosAguardandoConfirmacao = useMemo(() =>
    [...pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao === "aguardando_confirmacao")]
      .sort((a, b) => new Date(a.criadoEmIso).getTime() - new Date(b.criadoEmIso).getTime()),
    [pedidosBalcao]
  );
  const pedidosBalcaoSoAtivos = useMemo(() => pedidosBalcaoAtivos.filter((p) => p.origem === "balcao"), [pedidosBalcaoAtivos]);
  const pedidosTotem = useMemo(() =>
    pedidosBalcao.filter((p) => p.origem === "totem").sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime()),
    [pedidosBalcao]
  );
  const pedidosTotemAtivos = useMemo(() => pedidosTotem.filter((p) => p.statusBalcao !== "cancelado" && p.statusBalcao !== "retirado"), [pedidosTotem]);

  const pedidosParaRetirar = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "pronto" && !p.motoboyNome),
    [pedidosDeliveryAtivos]
  );
  const pedidosEmRota = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "saiu"),
    [pedidosDeliveryAtivos]
  );
  const pedidosDevolvidos = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "devolvido"),
    [pedidosDeliveryAtivos]
  );
  const pedidosEntregues = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "entregue" || p.statusBalcao === "pago"),
    [pedidosDeliveryAtivos]
  );
  const motoboyAtivos = useMemo(() => {
    const map = new Map<string, { emRota: number; entregues: number }>();
    pedidosDeliveryAtivos.forEach(p => {
      if (!p.motoboyNome) return;
      const atual = map.get(p.motoboyNome) || { emRota: 0, entregues: 0 };
      if (p.statusBalcao === "saiu") atual.emRota++;
      if (p.statusBalcao === "entregue" || p.statusBalcao === "pago") atual.entregues++;
      map.set(p.motoboyNome, atual);
    });
    return [...map.entries()].map(([nome, dados]) => ({ nome, ...dados }));
  }, [pedidosDeliveryAtivos]);

  return {
    balcaoOpen, setBalcaoOpen,
    balcaoTipo, setBalcaoTipo,
    balcaoClienteNome, setBalcaoClienteNome,
    balcaoTelefone, setBalcaoTelefone,
    balcaoEndereco, setBalcaoEndereco,
    balcaoBairro, setBalcaoBairro,
    balcaoReferencia, setBalcaoReferencia,
    balcaoFormaPag, setBalcaoFormaPag,
    balcaoTroco, setBalcaoTroco,
    balcaoCpf, setBalcaoCpf,
    balcaoNumero, setBalcaoNumero,
    balcaoComplemento, setBalcaoComplemento,
    deliveryBusca, setDeliveryBusca,
    deliveryResultados, setDeliveryResultados,
    deliveryStep, setDeliveryStep,
    deliveryCep, setDeliveryCep,
    deliveryCepLoading, setDeliveryCepLoading,
    deliveryCepErro, setDeliveryCepErro,
    deliveryCidade, setDeliveryCidade,
    balcaoPedidoSelecionado, setBalcaoPedidoSelecionado,
    balcaoPayments, setBalcaoPayments,
    balcaoPaymentMethod, setBalcaoPaymentMethod,
    balcaoPaymentValue, setBalcaoPaymentValue,
    balcaoValorEntregue, setBalcaoValorEntregue,
    balcaoFlowAtivo, setBalcaoFlowAtivo,
    deliveryConfirmOpen, setDeliveryConfirmOpen,
    deliveryPendingItens, setDeliveryPendingItens,
    deliveryPendingParaViagem, setDeliveryPendingParaViagem,
    rejectDialogOpen, setRejectDialogOpen,
    rejectPedidoId, setRejectPedidoId,
    rejectMotivo, setRejectMotivo,
    confirmTempoId, setConfirmTempoId,
    confirmTempo, setConfirmTempo,
    confirmTempoCustom, setConfirmTempoCustom,
    confirmTaxaEntrega, setConfirmTaxaEntrega,
    deliveryTempoEstimado, setDeliveryTempoEstimado,
    buscaDelivery, setBuscaDelivery,
    cpfNotaBalcao, setCpfNotaBalcao,
    cpfNotaBalcaoOpen, setCpfNotaBalcaoOpen,
    bairrosCache, setBairrosCache,
    caixaStoreIdRef,
    resetBalcaoStates,
    // payment math
    balcaoPedido,
    balcaoTotalConta,
    balcaoTotalContaCents,
    balcaoTotalPago,
    balcaoTotalPagoCents,
    balcaoValorRestante,
    balcaoFechamentoPronto,
    balcaoPaymentProgress,
    balcaoValorEntregueNum,
    balcaoTrocoCalculado,
    // derived order lists
    pedidosBalcaoAtivos,
    pedidosDeliveryAtivos,
    pedidosAguardandoConfirmacao,
    pedidosBalcaoSoAtivos,
    pedidosTotem,
    pedidosTotemAtivos,
    pedidosParaRetirar,
    pedidosEmRota,
    pedidosDevolvidos,
    pedidosEntregues,
    motoboyAtivos,
  };
}
