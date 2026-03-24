import { useEffect, useRef, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { CheckCircle2 } from "lucide-react";

const TOTEM_MESA_ID = "__totem__";
const AUTO_RESET_MS = 10_000;

const TotemPage = () => {
  const { mesas } = useRestaurant();
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPedidoCountRef = useRef(0);

  const totemMesa = mesas.find((m) => m.id === TOTEM_MESA_ID);

  // Detect new pedido by watching pedidos count
  useEffect(() => {
    if (!totemMesa) return;
    const count = totemMesa.pedidos.length;
    if (count > lastPedidoCountRef.current && lastPedidoCountRef.current > 0) {
      const lastPedido = totemMesa.pedidos[count - 1];
      setPedidoConfirmado(lastPedido?.numeroPedido ?? count);
    }
    lastPedidoCountRef.current = count;
  }, [totemMesa?.pedidos.length]);

  // Auto-reset after success
  useEffect(() => {
    if (pedidoConfirmado === null) return;
    timerRef.current = setTimeout(() => setPedidoConfirmado(null), AUTO_RESET_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pedidoConfirmado]);

  // Also set initial count on mount
  useEffect(() => {
    if (totemMesa) {
      lastPedidoCountRef.current = totemMesa.pedidos.length;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Success screen
  if (pedidoConfirmado !== null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-500">
          <CheckCircle2 className="h-24 w-24 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-4xl font-black text-foreground">Pedido realizado!</h1>
          <p className="text-6xl font-black text-primary">#{pedidoConfirmado}</p>
          <p className="text-lg text-muted-foreground mt-2">
            Retire quando aparecer na tela
          </p>
        </div>
        <div className="mt-8">
          <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                animation: `totem-shrink ${AUTO_RESET_MS}ms linear forwards`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
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
        mesaId={TOTEM_MESA_ID}
      />
    </div>
  );
};

export default TotemPage;
