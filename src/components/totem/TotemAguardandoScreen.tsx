import { QrCode, CreditCard, Wifi, Timer } from "lucide-react";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import type { PaymentMethod } from "@/types/operations";

interface Props {
  logoBase64: string;
  nomeRestaurante: string;
  pendingTotal: number;
  pendingPaymentMethod: PaymentMethod;
  timeoutMs: number;
  onConfirmPayment: () => void;
  onBack: () => void;
}

const TotemAguardandoScreen = ({ logoBase64, nomeRestaurante, pendingTotal, pendingPaymentMethod, timeoutMs, onConfirmPayment, onBack }: Props) => {
  const isPix = pendingPaymentMethod === "pix";
  const methodLabel = isPix ? "PIX" : pendingPaymentMethod === "credito" ? "Crédito" : "Débito";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "#FFFFFF" }}>
      <div className="flex flex-col items-center gap-5 text-center">
        {logoBase64 && (
          <img src={logoBase64} alt={nomeRestaurante} className="h-16 w-16 rounded-xl object-contain" />
        )}

        {isPix ? (
          <>
            <div className="h-24 w-24 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
              <QrCode className="h-14 w-14 text-white" />
            </div>
            <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Pagamento via PIX</h1>
            <p className="text-base font-medium max-w-sm" style={{ color: "#666" }}>
              Apresente o QR Code ao caixa ou escaneie com o app do seu banco
            </p>
            <div
              className="w-52 h-52 rounded-2xl border-4 flex flex-col items-center justify-center gap-3"
              style={{ borderColor: "#FF6B00", background: "#FFF8F0" }}
            >
              <QrCode className="h-20 w-20" style={{ color: "#FF6B00" }} />
              <p className="text-xs font-bold" style={{ color: "#999" }}>QR Code PIX</p>
            </div>
          </>
        ) : (
          <>
            <div className="h-24 w-24 rounded-full flex items-center justify-center" style={{ background: "#333" }}>
              <CreditCard className="h-14 w-14 text-white" />
            </div>
            <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Pagamento com {methodLabel}</h1>
            <p className="text-base font-medium max-w-sm" style={{ color: "#666" }}>
              Insira ou aproxime o cartão na maquininha ao lado
            </p>
            <div
              className="w-40 h-52 rounded-2xl border-4 flex flex-col items-center justify-center gap-3"
              style={{ borderColor: "#E0E0E0", background: "#FAFAFA" }}
            >
              <Wifi className="h-12 w-12 rotate-90" style={{ color: "#666" }} />
              <p className="text-xs font-bold text-center px-2" style={{ color: "#999" }}>Aproxime ou insira o cartão</p>
            </div>
          </>
        )}

        <p className="text-2xl font-black mt-2" style={{ color: "#FF6B00" }}>
          {formatPrice(pendingTotal)}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md">
        <button
          onClick={onConfirmPayment}
          className="w-full h-16 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98]"
          style={{ background: "#FF6B00" }}
        >
          {isPix ? "✓ Já paguei" : "✓ Pagamento realizado"}
        </button>
        <button
          onClick={onBack}
          className="w-full h-14 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] border-2"
          style={{ borderColor: "#E0E0E0", color: "#666", background: "#FAFAFA" }}
        >
          ← Voltar
        </button>
      </div>

      <div className="w-64 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Timer className="h-4 w-4" style={{ color: "#999" }} />
          <p className="text-xs font-bold" style={{ color: "#999" }}>Tempo limite: 2 minutos</p>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#F3F3F3" }}>
          <div className="h-full rounded-full" style={{ background: "#FF6B00", animation: `totem-shrink ${timeoutMs}ms linear forwards` }} />
        </div>
      </div>
      <style>{`@keyframes totem-shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
};

export default TotemAguardandoScreen;
