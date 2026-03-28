import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import { RestaurantProvider, useRestaurant } from "@/contexts/RestaurantContext";
import { CheckCircle2, CreditCard, QrCode, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import DeviceGate from "@/components/DeviceGate";
import type { PaymentMethod } from "@/types/operations";

const AUTO_RESET_MS = 10_000;

type TotemStep = "menu" | "payment" | "confirmed";

const TotemInner = ({ storeId }: { storeId: string }) => {
  const { criarPedidoBalcao } = useRestaurant();
  const [step, setStep] = useState<TotemStep>("menu");
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null);
  const [pendingItens, setPendingItens] = useState<ItemCarrinho[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactive restaurant name & logo from DB
  const [nomeRestaurante, setNomeRestaurante] = useState("");
  const [logoBase64, setLogoBase64] = useState("");

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("restaurant_config")
        .select("nome_restaurante, logo_base64, logo_url")
        .eq("store_id", storeId)
        .maybeSingle();
      if (data) {
        setNomeRestaurante(data.nome_restaurante);
        setLogoBase64(data.logo_base64 || data.logo_url || "");
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
    }, AUTO_RESET_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step]);

  // Called when customer finishes picking items
  const handlePedidoConfirmado = useCallback((itens: ItemCarrinho[]) => {
    setPendingItens(itens);
    setPendingTotal(itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0));
    setStep("payment");
  }, []);

  // Called when customer picks a payment method
  const handlePaymentSelected = useCallback(async (method: PaymentMethod) => {
    const numeroPedido = await criarPedidoBalcao({
      itens: pendingItens,
      origem: "totem",
      operador: { id: "totem-auto", nome: "Totem", role: "caixa", criadoEm: new Date().toISOString() },
      clienteNome: "Totem",
      formaPagamentoTotem: method,
    });
    setPedidoConfirmado(numeroPedido);
    setStep("confirmed");
  }, [criarPedidoBalcao, pendingItens]);

  const handleBackToMenu = useCallback(() => {
    setStep("menu");
    setPendingItens([]);
  }, []);

  const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

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
          onClick={handleBackToMenu}
          className="mt-4 text-sm font-bold underline"
          style={{ color: "#999" }}
        >
          ← Voltar ao cardápio
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
          <p className="text-[120px] leading-none font-black tabular-nums" style={{ color: "#FF6B00" }}>
            #{String(pedidoConfirmado).padStart(3, "0")}
          </p>
          <p className="text-xl font-bold mt-2" style={{ color: "#1A1A1A" }}>Retire quando aparecer na tela</p>
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
