import { QrCode, CreditCard, Smartphone } from "lucide-react";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import type { PaymentMethod } from "@/types/operations";

interface Props {
  logoBase64: string;
  nomeRestaurante: string;
  pendingTotal: number;
  clienteNome: string;
  isFastFoodNome: boolean;
  onSelectPayment: (method: PaymentMethod) => void;
  onBack: () => void;
}

const TotemPaymentScreen = ({ logoBase64, nomeRestaurante, pendingTotal, clienteNome, isFastFoodNome, onSelectPayment, onBack }: Props) => (
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
      <button
        onClick={() => onSelectPayment("pix")}
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

      <button
        onClick={() => onSelectPayment("credito")}
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

      <button
        onClick={() => onSelectPayment("debito")}
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
      onClick={onBack}
      className="mt-4 text-sm font-bold underline"
      style={{ color: "#999" }}
    >
      ← {isFastFoodNome ? "Voltar" : "Voltar ao cardápio"}
    </button>
  </div>
);

export default TotemPaymentScreen;
