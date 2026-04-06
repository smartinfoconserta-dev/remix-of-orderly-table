import { useCallback, useEffect, useRef, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import OfflineIndicator from "@/components/OfflineIndicator";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import DeviceGate from "@/components/DeviceGate";
import ModuleGate from "@/components/ModuleGate";
import type { PaymentMethod } from "@/types/operations";

import TotemNameScreen from "@/components/totem/TotemNameScreen";
import TotemPaymentScreen from "@/components/totem/TotemPaymentScreen";
import TotemAguardandoScreen from "@/components/totem/TotemAguardandoScreen";
import TotemCpfScreen from "@/components/totem/TotemCpfScreen";
import TotemConfirmedScreen from "@/components/totem/TotemConfirmedScreen";

const AUTO_RESET_MS = 10_000;
const PAYMENT_TIMEOUT_MS = 120_000;

type TotemStep = "menu" | "name" | "cpf" | "payment" | "aguardando_pagamento" | "confirmed";

const TotemInner = ({ storeId }: { storeId: string }) => {
  const { criarPedidoBalcao } = useRestaurant();
  const [step, setStep] = useState<TotemStep>("menu");
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null);
  const [pendingItens, setPendingItens] = useState<ItemCarrinho[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [identificacaoFastFood, setIdentificacaoFastFood] = useState<string>("codigo");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCpf, setClienteCpf] = useState("");
  const [cpfWanted, setCpfWanted] = useState<boolean | null>(null);
  const [cpfNotaAtivo, setCpfNotaAtivo] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod | null>(null);

  const [nomeRestaurante, setNomeRestaurante] = useState("");
  const [logoBase64, setLogoBase64] = useState("");

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("restaurant_config")
        .select("nome_restaurante, logo_base64, logo_url, identificacao_fast_food, cpf_nota_ativo")
        .eq("store_id", storeId)
        .maybeSingle();
      if (data) {
        setNomeRestaurante(data.nome_restaurante);
        setLogoBase64(data.logo_base64 || data.logo_url || "");
        setIdentificacaoFastFood(data.identificacao_fast_food ?? "codigo");
        setCpfNotaAtivo(data.cpf_nota_ativo ?? false);
      }
    };
    loadConfig();

    const channel = supabase
      .channel(`totem-config-${storeId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "restaurant_config",
        filter: `store_id=eq.${storeId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row) {
          setNomeRestaurante(row.nome_restaurante || "");
          setLogoBase64(row.logo_base64 || row.logo_url || "");
          setIdentificacaoFastFood(row.identificacao_fast_food ?? "codigo");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  useEffect(() => {
    if (step !== "confirmed") return;
    timerRef.current = setTimeout(() => {
      setStep("menu");
      setPedidoConfirmado(null);
      setPendingItens([]);
      setClienteNome("");
      setClienteCpf("");
      setCpfWanted(null);
      setPendingPaymentMethod(null);
    }, AUTO_RESET_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step]);

  const handleBackToMenu = useCallback(() => {
    setStep("menu");
    setPendingItens([]);
    setClienteNome("");
    setClienteCpf("");
    setCpfWanted(null);
    setPendingPaymentMethod(null);
  }, []);

  const paymentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (step !== "aguardando_pagamento") {
      if (paymentTimerRef.current) { clearTimeout(paymentTimerRef.current); paymentTimerRef.current = null; }
      return;
    }
    paymentTimerRef.current = setTimeout(() => {
      handleBackToMenu();
    }, PAYMENT_TIMEOUT_MS);
    return () => { if (paymentTimerRef.current) clearTimeout(paymentTimerRef.current); };
  }, [step, handleBackToMenu]);

  const handlePedidoConfirmado = useCallback((itens: ItemCarrinho[]) => {
    setPendingItens(itens);
    setPendingTotal(itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0));
    if (identificacaoFastFood === "nome_cliente") {
      setStep("name");
    } else {
      setStep("payment");
    }
  }, [identificacaoFastFood]);

  const handleNameConfirmed = useCallback(() => {
    if (!clienteNome.trim()) return;
    setStep("payment");
  }, [clienteNome]);

  const skipCpfRef = useRef(false);
  const handlePaymentSelected = useCallback((method: PaymentMethod) => {
    setPendingPaymentMethod(method);
    setStep("aguardando_pagamento");
  }, []);

  const handlePaymentConfirmed = useCallback(() => {
    if (cpfNotaAtivo) {
      setStep("cpf");
    } else {
      setCpfWanted(false);
      setClienteCpf("");
      skipCpfRef.current = true;
      setStep("cpf");
    }
  }, [cpfNotaAtivo]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCpfConfirmed = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const nome = identificacaoFastFood === "nome_cliente" && clienteNome.trim()
      ? clienteNome.trim()
      : "Totem";

    const observacaoCpf = clienteCpf.trim() ? `CPF: ${clienteCpf.trim()}` : undefined;

    try {
      const numeroPedido = await criarPedidoBalcao({
        itens: pendingItens,
        origem: "totem",
        operador: { id: "totem-auto", nome: "Totem", role: "caixa", criadoEm: new Date().toISOString() },
        clienteNome: nome,
        formaPagamentoTotem: pendingPaymentMethod ?? "pix",
        observacaoGeral: observacaoCpf,
      });
      setPedidoConfirmado(numeroPedido);
      setStep("confirmed");
    } catch (err) {
      console.error("Totem: erro ao criar pedido", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, criarPedidoBalcao, pendingItens, identificacaoFastFood, clienteNome, clienteCpf, pendingPaymentMethod]);

  useEffect(() => {
    if (step === "cpf" && skipCpfRef.current) {
      skipCpfRef.current = false;
      handleCpfConfirmed();
    }
  }, [step, handleCpfConfirmed]);

  const isFastFoodCodigo = identificacaoFastFood === "codigo";
  const isFastFoodNome = identificacaoFastFood === "nome_cliente";

  if (step === "name") {
    return (
      <TotemNameScreen
        logoBase64={logoBase64}
        nomeRestaurante={nomeRestaurante}
        clienteNome={clienteNome}
        setClienteNome={setClienteNome}
        onConfirm={handleNameConfirmed}
        onBack={handleBackToMenu}
      />
    );
  }

  if (step === "payment") {
    return (
      <TotemPaymentScreen
        logoBase64={logoBase64}
        nomeRestaurante={nomeRestaurante}
        pendingTotal={pendingTotal}
        clienteNome={clienteNome}
        isFastFoodNome={isFastFoodNome}
        onSelectPayment={handlePaymentSelected}
        onBack={() => isFastFoodNome ? setStep("name") : handleBackToMenu()}
      />
    );
  }

  if (step === "aguardando_pagamento" && pendingPaymentMethod) {
    return (
      <TotemAguardandoScreen
        logoBase64={logoBase64}
        nomeRestaurante={nomeRestaurante}
        pendingTotal={pendingTotal}
        pendingPaymentMethod={pendingPaymentMethod}
        timeoutMs={PAYMENT_TIMEOUT_MS}
        onConfirmPayment={handlePaymentConfirmed}
        onBack={() => setStep("payment")}
      />
    );
  }

  if (step === "cpf") {
    return (
      <TotemCpfScreen
        logoBase64={logoBase64}
        nomeRestaurante={nomeRestaurante}
        clienteCpf={clienteCpf}
        setClienteCpf={setClienteCpf}
        cpfWanted={cpfWanted}
        setCpfWanted={setCpfWanted}
        onConfirm={handleCpfConfirmed}
        onBack={() => { setCpfWanted(null); setClienteCpf(""); setStep("payment"); }}
      />
    );
  }

  if (step === "confirmed" && pedidoConfirmado !== null) {
    return (
      <TotemConfirmedScreen
        logoBase64={logoBase64}
        nomeRestaurante={nomeRestaurante}
        pedidoConfirmado={pedidoConfirmado}
        clienteNome={clienteNome}
        isFastFoodCodigo={isFastFoodCodigo}
        isFastFoodNome={isFastFoodNome}
        autoResetMs={AUTO_RESET_MS}
      />
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#FFFFFF" }}>
      <OfflineIndicator />
      <PedidoFlow modo="totem" onPedidoConfirmado={handlePedidoConfirmado} deviceStoreId={storeId} />
    </div>
  );
};

const TotemPage = () => (
  <ModuleGate moduleKey="totem" moduleName="Totem de Autoatendimento">
    <DeviceGate type="totem">
      {({ storeId }) => <TotemInner storeId={storeId} />}
    </DeviceGate>
  </ModuleGate>
);

export default TotemPage;
