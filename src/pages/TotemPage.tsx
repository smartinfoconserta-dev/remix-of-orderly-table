import { useCallback, useEffect, useRef, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { CheckCircle2 } from "lucide-react";
import { getSistemaConfig } from "@/lib/adminStorage";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

const AUTO_RESET_MS = 10_000;

const TotemPage = () => {
  const { criarPedidoBalcao, pedidosBalcao } = useRestaurant();
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = getSistemaConfig();

  // Auto-reset after success
  useEffect(() => {
    if (pedidoConfirmado === null) return;
    timerRef.current = setTimeout(() => setPedidoConfirmado(null), AUTO_RESET_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pedidoConfirmado]);

  const handlePedidoConfirmado = useCallback((itens: ItemCarrinho[]) => {
    const numeroPedido = pedidosBalcao.length + 1;
    criarPedidoBalcao({
      itens,
      origem: "totem",
      operador: { id: "totem-auto", nome: "Totem", role: "caixa" },
      clienteNome: "Totem",
    });
    setPedidoConfirmado(numeroPedido);
  }, [criarPedidoBalcao, pedidosBalcao.length]);

  // Success screen — fast-food style
  if (pedidoConfirmado !== null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8" style={{ background: "#FFFFFF" }}>
        <div className="flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-500">
          <div className="h-28 w-28 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
            <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black" style={{ color: "#1A1A1A" }}>
            Pedido realizado!
          </h1>
          <p className="text-[120px] leading-none font-black tabular-nums" style={{ color: "#FF6B00" }}>
            #{String(pedidoConfirmado).padStart(3, "0")}
          </p>
          <p className="text-xl font-bold mt-2" style={{ color: "#1A1A1A" }}>
            Retire quando aparecer na tela
          </p>
          {config.nomeRestaurante && (
            <p className="text-lg font-bold" style={{ color: "#FF6B00" }}>
              {config.nomeRestaurante}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-64">
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#F3F3F3" }}>
            <div
              className="h-full rounded-full"
              style={{
                background: "#FF6B00",
                animation: `totem-shrink ${AUTO_RESET_MS}ms linear forwards`,
              }}
            />
          </div>
          <p className="text-sm font-bold text-center mt-3" style={{ color: "#999" }}>
            Voltando ao cardápio automaticamente...
          </p>
        </div>

        <style>{`
          @keyframes totem-shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PedidoFlow
        modo="totem"
        onPedidoConfirmado={handlePedidoConfirmado}
      />
    </div>
  );
};

export default TotemPage;
