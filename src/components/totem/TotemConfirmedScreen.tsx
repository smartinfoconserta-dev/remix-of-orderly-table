import { CheckCircle2 } from "lucide-react";

interface Props {
  logoBase64: string;
  nomeRestaurante: string;
  pedidoConfirmado: number;
  clienteNome: string;
  isFastFoodCodigo: boolean;
  isFastFoodNome: boolean;
  autoResetMs: number;
}

const TotemConfirmedScreen = ({ logoBase64, nomeRestaurante, pedidoConfirmado, clienteNome, isFastFoodCodigo, isFastFoodNome, autoResetMs }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8" style={{ background: "#FFFFFF" }}>
    <div className="flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-500">
      <div className="h-28 w-28 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
        <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
      </div>
      <h1 className="text-5xl font-black" style={{ color: "#1A1A1A" }}>Pedido realizado!</h1>

      {isFastFoodCodigo && (
        <>
          <p className="text-lg font-bold mt-2" style={{ color: "#666" }}>Retire com o código abaixo</p>
          <p className="text-[180px] leading-none font-black tabular-nums" style={{ color: "#FF6B00" }}>
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
          <p className="text-4xl font-black tabular-nums mt-2" style={{ color: "#999" }}>
            Pedido #{String(pedidoConfirmado).padStart(3, "0")}
          </p>
        </>
      )}

      {!isFastFoodCodigo && !isFastFoodNome && (
        <>
          <p className="text-6xl leading-none font-black tabular-nums" style={{ color: "#FF6B00" }}>
            #{String(pedidoConfirmado).padStart(3, "0")}
          </p>
          <p className="text-xl font-bold mt-2" style={{ color: "#1A1A1A" }}>Retire quando aparecer na tela</p>
        </>
      )}

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
        <div className="h-full rounded-full" style={{ background: "#FF6B00", animation: `totem-shrink ${autoResetMs}ms linear forwards` }} />
      </div>
      <p className="text-sm font-bold text-center mt-3" style={{ color: "#999" }}>Voltando ao cardápio automaticamente...</p>
    </div>
    <style>{`@keyframes totem-shrink { from { width: 100%; } to { width: 0%; } }`}</style>
  </div>
);

export default TotemConfirmedScreen;
