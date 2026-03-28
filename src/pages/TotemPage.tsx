import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import { RestaurantProvider, useRestaurant } from "@/contexts/RestaurantContext";
import { CheckCircle2, CreditCard, FileText, QrCode, Smartphone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import DeviceGate from "@/components/DeviceGate";
import type { PaymentMethod } from "@/types/operations";

const AUTO_RESET_MS = 10_000;

type TotemStep = "menu" | "name" | "cpf" | "payment" | "confirmed";

const TotemInner = ({ storeId }: { storeId: string }) => {
  const { criarPedidoBalcao } = useRestaurant();
  const [step, setStep] = useState<TotemStep>("menu");
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null);
  const [pendingItens, setPendingItens] = useState<ItemCarrinho[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fast Food identification
  const [modoOperacao, setModoOperacao] = useState<string>("restaurante");
  const [identificacaoFastFood, setIdentificacaoFastFood] = useState<string>("codigo");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCpf, setClienteCpf] = useState("");
  const [cpfWanted, setCpfWanted] = useState<boolean | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod | null>(null);

  // Reactive restaurant name & logo from DB
  const [nomeRestaurante, setNomeRestaurante] = useState("");
  const [logoBase64, setLogoBase64] = useState("");

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("restaurant_config")
        .select("nome_restaurante, logo_base64, logo_url, modo_operacao, identificacao_fast_food")
        .eq("store_id", storeId)
        .maybeSingle();
      if (data) {
        setNomeRestaurante(data.nome_restaurante);
        setLogoBase64(data.logo_base64 || data.logo_url || "");
        setModoOperacao(data.modo_operacao ?? "restaurante");
        setIdentificacaoFastFood(data.identificacao_fast_food ?? "codigo");
      }
    };
    loadConfig();

    // Subscribe to realtime updates for reactive name/logo
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
          setModoOperacao(row.modo_operacao ?? "restaurante");
          setIdentificacaoFastFood(row.identificacao_fast_food ?? "codigo");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  // Auto-reset after confirmation
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

  // Called when customer finishes picking items
  const handlePedidoConfirmado = useCallback((itens: ItemCarrinho[]) => {
    setPendingItens(itens);
    setPendingTotal(itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0));

    // In fast_food mode with nome_cliente identification, ask for name first
    if (modoOperacao === "fast_food" && identificacaoFastFood === "nome_cliente") {
      setStep("name");
    } else {
      setStep("payment");
    }
  }, [modoOperacao, identificacaoFastFood]);

  const handleNameConfirmed = useCallback(() => {
    if (!clienteNome.trim()) return;
    setStep("payment");
  }, [clienteNome]);

  // Called when customer picks a payment method — go to CPF step
  const handlePaymentSelected = useCallback((method: PaymentMethod) => {
    setPendingPaymentMethod(method);
    setStep("cpf");
  }, []);

  // CPF mask helper
  const formatCpfMask = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Called after CPF step (with or without CPF)
  const handleCpfConfirmed = useCallback(async () => {
    const nome = modoOperacao === "fast_food" && identificacaoFastFood === "nome_cliente" && clienteNome.trim()
      ? clienteNome.trim()
      : "Totem";

    const observacaoCpf = clienteCpf.trim() ? `CPF: ${clienteCpf.trim()}` : undefined;

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
  }, [criarPedidoBalcao, pendingItens, modoOperacao, identificacaoFastFood, clienteNome, clienteCpf, pendingPaymentMethod]);

  const handleBackToMenu = useCallback(() => {
    setStep("menu");
    setPendingItens([]);
    setClienteNome("");
    setClienteCpf("");
    setCpfWanted(null);
    setPendingPaymentMethod(null);
  }, []);

  const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const isFastFoodCodigo = modoOperacao === "fast_food" && identificacaoFastFood === "codigo";
  const isFastFoodNome = modoOperacao === "fast_food" && identificacaoFastFood === "nome_cliente";

  // ─── Name input screen (fast food nome_cliente) ───
  if (step === "name") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "#FFFFFF" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          {logoBase64 && (
            <img src={logoBase64} alt={nomeRestaurante} className="h-16 w-16 rounded-xl object-contain" />
          )}
          <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Qual é o seu nome?</h1>
          <p className="text-base font-medium" style={{ color: "#666" }}>
            Vamos chamar você quando o pedido estiver pronto
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <input
            type="text"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameConfirmed(); }}
            placeholder="Digite seu nome..."
            autoFocus
            className="w-full h-16 text-2xl font-bold text-center rounded-2xl border-2 outline-none transition-colors"
            style={{
              borderColor: clienteNome.trim() ? "#FF6B00" : "#E0E0E0",
              background: clienteNome.trim() ? "#FFF8F0" : "#FAFAFA",
              color: "#1A1A1A",
            }}
          />

          <button
            onClick={handleNameConfirmed}
            disabled={!clienteNome.trim()}
            className="w-full h-16 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "#FF6B00" }}
          >
            Continuar →
          </button>
        </div>

        <button
          onClick={handleBackToMenu}
          className="mt-2 text-sm font-bold underline"
          style={{ color: "#999" }}
        >
          ← Voltar ao cardápio
        </button>
      </div>
    );
  }

  // ─── Payment screen ───
  if (step === "payment") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "#FFFFFF" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          {logoBase64 && (
            <img src={logoBase64} alt={nomeRestaurante} className="h-16 w-16 rounded-xl object-contain" />
          )}
          <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Como você vai pagar?</h1>
          <p className="text-xl font-bold" style={{ color: "#FF6B00" }}>
            Total: {formatPrice(pendingTotal)}
          </p>
          {isFastFoodNome && clienteNome.trim() && (
            <p className="text-base font-bold" style={{ color: "#666" }}>
              Pedido de: <span style={{ color: "#1A1A1A" }}>{clienteNome.trim()}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          {/* PIX */}
          <button
            onClick={() => handlePaymentSelected("pix")}
            className="flex items-center gap-5 h-20 rounded-2xl border-2 px-6 transition-all active:scale-[0.98]"
            style={{ borderColor: "#FF6B00", background: "#FFF8F0" }}
          >
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "#FF6B00" }}>
              <QrCode className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-black" style={{ color: "#1A1A1A" }}>PIX</p>
              <p className="text-sm font-medium" style={{ color: "#666" }}>Escaneie o QR Code no caixa</p>
            </div>
          </button>

          {/* Crédito */}
          <button
            onClick={() => handlePaymentSelected("credito")}
            className="flex items-center gap-5 h-20 rounded-2xl border-2 px-6 transition-all active:scale-[0.98]"
            style={{ borderColor: "#E0E0E0", background: "#FFFFFF" }}
          >
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "#333" }}>
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-black" style={{ color: "#1A1A1A" }}>Cartão de Crédito</p>
              <p className="text-sm font-medium" style={{ color: "#666" }}>Insira o cartão na maquininha</p>
            </div>
          </button>

          {/* Débito */}
          <button
            onClick={() => handlePaymentSelected("debito")}
            className="flex items-center gap-5 h-20 rounded-2xl border-2 px-6 transition-all active:scale-[0.98]"
            style={{ borderColor: "#E0E0E0", background: "#FFFFFF" }}
          >
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "#555" }}>
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-black" style={{ color: "#1A1A1A" }}>Cartão de Débito</p>
              <p className="text-sm font-medium" style={{ color: "#666" }}>Insira o cartão na maquininha</p>
            </div>
          </button>
        </div>

        <button
          onClick={() => isFastFoodNome ? setStep("name") : handleBackToMenu()}
          className="mt-4 text-sm font-bold underline"
          style={{ color: "#999" }}
        >
          ← {isFastFoodNome ? "Voltar" : "Voltar ao cardápio"}
        </button>
      </div>
    );
  }

  // ─── CPF step ───
  if (step === "cpf") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "#FFFFFF" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          {logoBase64 && (
            <img src={logoBase64} alt={nomeRestaurante} className="h-16 w-16 rounded-xl object-contain" />
          )}
          <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Deseja CPF na nota?</h1>
        </div>

        {cpfWanted === null && (
          <div className="flex gap-4 w-full max-w-md">
            <button
              onClick={() => setCpfWanted(true)}
              className="flex-1 h-20 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98]"
              style={{ background: "#FF6B00" }}
            >
              Sim
            </button>
            <button
              onClick={() => { setCpfWanted(false); handleCpfConfirmed(); }}
              className="flex-1 h-20 rounded-2xl text-xl font-black transition-all active:scale-[0.98] border-2"
              style={{ borderColor: "#E0E0E0", color: "#666", background: "#FAFAFA" }}
            >
              Não, obrigado
            </button>
          </div>
        )}

        {cpfWanted === true && (
          <div className="w-full max-w-md space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={clienteCpf}
              onChange={(e) => setClienteCpf(formatCpfMask(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter" && clienteCpf.replace(/\D/g, "").length === 11) handleCpfConfirmed(); }}
              placeholder="000.000.000-00"
              autoFocus
              className="w-full h-16 text-2xl font-bold text-center rounded-2xl border-2 outline-none transition-colors"
              style={{
                borderColor: clienteCpf.replace(/\D/g, "").length === 11 ? "#FF6B00" : "#E0E0E0",
                background: clienteCpf.replace(/\D/g, "").length === 11 ? "#FFF8F0" : "#FAFAFA",
                color: "#1A1A1A",
              }}
            />

            <button
              onClick={handleCpfConfirmed}
              disabled={clienteCpf.replace(/\D/g, "").length !== 11}
              className="w-full h-16 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: "#FF6B00" }}
            >
              Confirmar
            </button>

            <button
              onClick={() => { setClienteCpf(""); setCpfWanted(null); }}
              className="w-full text-sm font-bold underline"
              style={{ color: "#999" }}
            >
              Não quero CPF
            </button>
          </div>
        )}

        <button
          onClick={() => { setCpfWanted(null); setClienteCpf(""); setStep("payment"); }}
          className="mt-2 text-sm font-bold underline"
          style={{ color: "#999" }}
        >
          ← Voltar
        </button>
      </div>
    );
  }

  // ─── Confirmation screen ───
  if (step === "confirmed" && pedidoConfirmado !== null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8" style={{ background: "#FFFFFF" }}>
        <div className="flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-500">
          <div className="h-28 w-28 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
            <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black" style={{ color: "#1A1A1A" }}>Pedido realizado!</h1>

          {isFastFoodCodigo && (
            <>
              <p className="text-lg font-bold mt-2" style={{ color: "#666" }}>Retire com o código abaixo</p>
              <p className="text-[140px] leading-none font-black tabular-nums" style={{ color: "#FF6B00" }}>
                #{String(pedidoConfirmado).padStart(3, "0")}
              </p>
            </>
          )}

          {isFastFoodNome && clienteNome.trim() && (
            <>
              <p className="text-lg font-bold mt-2" style={{ color: "#666" }}>Vamos chamar você pelo nome</p>
              <p className="text-[80px] leading-none font-black" style={{ color: "#FF6B00" }}>
                {clienteNome.trim()}
              </p>
              <p className="text-2xl font-bold tabular-nums mt-2" style={{ color: "#999" }}>
                Pedido #{String(pedidoConfirmado).padStart(3, "0")}
              </p>
            </>
          )}

          {!isFastFoodCodigo && !isFastFoodNome && (
            <>
              <p className="text-[120px] leading-none font-black tabular-nums" style={{ color: "#FF6B00" }}>
                #{String(pedidoConfirmado).padStart(3, "0")}
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: "#1A1A1A" }}>Retire quando aparecer na tela</p>
            </>
          )}

          {/* QR Code for pickup */}
          <div className="flex flex-col items-center gap-2 mt-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RETIRADA:${pedidoConfirmado}`}
              alt="QR Code para retirada"
              className="w-32 h-32"
            />
            <p className="text-sm font-bold" style={{ color: "#666" }}>Apresente este código ao retirar seu pedido</p>
          </div>

          {nomeRestaurante && (
            <p className="text-lg font-bold" style={{ color: "#FF6B00" }}>{nomeRestaurante}</p>
          )}
        </div>
        <div className="w-64">
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#F3F3F3" }}>
            <div className="h-full rounded-full" style={{ background: "#FF6B00", animation: `totem-shrink ${AUTO_RESET_MS}ms linear forwards` }} />
          </div>
          <p className="text-sm font-bold text-center mt-3" style={{ color: "#999" }}>Voltando ao cardápio automaticamente...</p>
        </div>
        <style>{`@keyframes totem-shrink { from { width: 100%; } to { width: 0%; } }`}</style>
      </div>
    );
  }

  // ─── Menu ───
  return (
    <div style={{ minHeight: "100dvh", background: "#FFFFFF" }}>
      <PedidoFlow modo="totem" onPedidoConfirmado={handlePedidoConfirmado} />
    </div>
  );
};

const TotemPage = () => (
  <DeviceGate type="totem">
    {({ storeId }) => <TotemInner storeId={storeId} />}
  </DeviceGate>
);

export default TotemPage;
