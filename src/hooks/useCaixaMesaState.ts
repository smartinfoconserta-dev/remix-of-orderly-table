import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaymentMethod, SplitPayment } from "@/types/operations";
import type { Mesa } from "@/types/restaurant";
import { toCents, parseCurrencyInput } from "@/components/caixa/caixaHelpers";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";

interface UseCaixaMesaStateParams {
  mesas: Mesa[];
  sistemaConfig: any;
  accessMode: "caixa" | "gerente";
  descontoAplicado: number;
  setDescontoAplicado: (v: number) => void;
  setDescontoInput: (v: string) => void;
  setDescontoMotivo: (v: string) => void;
  setDescontoManagerName: (v: string) => void;
  setDescontoManagerPin: (v: string) => void;
  setDescontoError: (v: string | null) => void;
}

export function useCaixaMesaState({
  mesas,
  sistemaConfig,
  accessMode,
  descontoAplicado,
  setDescontoAplicado,
  setDescontoInput,
  setDescontoMotivo,
  setDescontoManagerName,
  setDescontoManagerPin,
  setDescontoError,
}: UseCaixaMesaStateParams) {
  /* ── mesa selection / comanda ── */
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [comandaOpen, setComandaOpen] = useState(false);
  const [mesaTab, setMesaTab] = useState<"comanda" | "pagamento" | "historico">("comanda");

  /* ── closing payments ── */
  const [closingPayments, setClosingPayments] = useState<SplitPayment[]>([]);
  const [closingPaymentMethod, setClosingPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [closingPaymentValue, setClosingPaymentValue] = useState("");
  const [valorEntregue, setValorEntregue] = useState("");
  const [trocoRegistrado, setTrocoRegistrado] = useState(0);

  /* ── couvert / cpf ── */
  const [couvertPessoas, setCouvertPessoas] = useState(0);
  const [couvertDispensado, setCouvertDispensado] = useState(false);
  const [cpfNotaMesa, setCpfNotaMesa] = useState("");
  const [cpfNotaMesaOpen, setCpfNotaMesaOpen] = useState(false);

  /* ── finance lock ── */
  const [financeUnlocked, setFinanceUnlocked] = useState(accessMode === "gerente");
  const [financeManagerName, setFinanceManagerName] = useState("");
  const [financeManagerPin, setFinanceManagerPin] = useState("");
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [isUnlockingFinance, setIsUnlockingFinance] = useState(false);

  /* ── caixa opening ── */
  const [fundoTrocoInput, setFundoTrocoInput] = useState("");

  useEffect(() => {
    const storeId = getActiveStoreId();
    if (!storeId) return;
    supabase.from("estado_caixa").select("fundo_proximo").eq("store_id", storeId).order("updated_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const val = Number(data?.[0]?.fundo_proximo ?? 0);
        if (val > 0) setFundoTrocoInput(val.toFixed(2).replace(".", ","));
      });
  }, []);

  /* ── derived mesa ── */
  const mesa = mesaSelecionada ? mesas.find((item) => item.id === mesaSelecionada) ?? null : null;

  /* ── reset ── */
  const resetCloseAccountState = useCallback(() => {
    setClosingPayments([]);
    setClosingPaymentMethod("dinheiro");
    setClosingPaymentValue("");
    setValorEntregue("");
    setTrocoRegistrado(0);
    setDescontoAplicado(0);
    setDescontoInput("");
    setDescontoMotivo("");
    setDescontoManagerName("");
    setDescontoManagerPin("");
    setDescontoError(null);
    setCouvertPessoas(0);
    setCouvertDispensado(false);
    setCpfNotaMesa("");
    setCpfNotaMesaOpen(false);
  }, [setDescontoAplicado, setDescontoInput, setDescontoMotivo, setDescontoManagerName, setDescontoManagerPin, setDescontoError]);

  const handleVoltar = useCallback((resetBalcaoPayments: () => void) => {
    setComandaOpen(false);
    setMesaSelecionada(null);
    setMesaTab("comanda");
    resetCloseAccountState();
    resetBalcaoPayments();
  }, [resetCloseAccountState]);

  /* ── payment math (mesa) ── */
  const couvertValorUnit = sistemaConfig.couvertAtivo && !couvertDispensado && couvertPessoas > 0
    ? (sistemaConfig.couvertValor ?? 0)
    : 0;
  const couvertTotal = couvertValorUnit * couvertPessoas;
  const totalConta = Math.max((mesa?.total ?? 0) - descontoAplicado + couvertTotal, 0);
  const totalContaCents = toCents(totalConta);
  const totalPago = useMemo(() => closingPayments.reduce((acc, p) => acc + p.valor, 0), [closingPayments]);
  const totalPagoCents = toCents(totalPago);
  const valorRestante = Math.max((totalContaCents - totalPagoCents) / 100, 0);
  const fechamentoPronto = totalContaCents > 0 && totalPagoCents === totalContaCents;
  const paymentProgress = totalContaCents > 0 ? Math.min(totalPagoCents / totalContaCents, 1) : 0;
  const valorEntregueNum = parseCurrencyInput(valorEntregue);
  const valorEntregueValido = Number.isFinite(valorEntregueNum) && valorEntregueNum > 0;
  const trocoCalculado = closingPaymentMethod === "dinheiro" && Number.isFinite(valorEntregueNum) && valorEntregueNum > valorRestante
    ? valorEntregueNum - valorRestante : 0;
  const valorDinheiroARegistrar = Number.isFinite(valorEntregueNum) ? Math.min(valorEntregueNum, valorRestante) : 0;

  return {
    mesaSelecionada, setMesaSelecionada,
    comandaOpen, setComandaOpen,
    mesaTab, setMesaTab,
    closingPayments, setClosingPayments,
    closingPaymentMethod, setClosingPaymentMethod,
    closingPaymentValue, setClosingPaymentValue,
    valorEntregue, setValorEntregue,
    trocoRegistrado, setTrocoRegistrado,
    couvertPessoas, setCouvertPessoas,
    couvertDispensado, setCouvertDispensado,
    cpfNotaMesa, setCpfNotaMesa,
    cpfNotaMesaOpen, setCpfNotaMesaOpen,
    financeUnlocked, setFinanceUnlocked,
    financeManagerName, setFinanceManagerName,
    financeManagerPin, setFinanceManagerPin,
    financeError, setFinanceError,
    isUnlockingFinance, setIsUnlockingFinance,
    fundoTrocoInput, setFundoTrocoInput,
    mesa,
    resetCloseAccountState,
    handleVoltar,
    // payment math
    couvertValorUnit, couvertTotal,
    totalConta, totalContaCents,
    totalPago, totalPagoCents,
    valorRestante, fechamentoPronto, paymentProgress,
    valorEntregueNum, valorEntregueValido,
    trocoCalculado, valorDinheiroARegistrar,
  };
}
