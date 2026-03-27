import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/contexts/RestaurantContext";
import DeviceGate from "@/components/DeviceGate";
import {
  getBoundTabletMesaId,
  setBoundTabletMesaId,
  clearBoundTabletMesaId,
} from "@/lib/tabletBinding";
import { clearStoredDeviceId } from "@/lib/deviceAuth";

const TabletInner = ({ storeId, initialMesaId }: { storeId: string; initialMesaId?: string | null }) => {
  const { mesas } = useRestaurant();
  const [searchParams] = useSearchParams();

  const [mesaId, setMesaId] = useState<string | null>(() => {
    // Priority: URL param > device mesa > saved binding
    const fromUrl = searchParams.get("mesa");
    if (fromUrl) return fromUrl;
    if (initialMesaId) return initialMesaId;
    return getBoundTabletMesaId();
  });

  useEffect(() => {
    if (mesaId) setBoundTabletMesaId(mesaId);
  }, [mesaId]);

  const mesasOrdenadas = useMemo(() => [...mesas].sort((a, b) => a.numero - b.numero), [mesas]);

  const handleSelectMesa = (selectedMesaId: string) => {
    setBoundTabletMesaId(selectedMesaId);
    setMesaId(selectedMesaId);
  };

  const handleExit = () => {
    clearBoundTabletMesaId();
    clearStoredDeviceId();
    setMesaId(null);
    window.location.reload();
  };

  if (mesaId) {
    return (
      <div className="relative">
        <button
          onClick={() => { clearBoundTabletMesaId(); setMesaId(null); }}
          className="fixed right-2 top-2 z-[9999] rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground opacity-60 transition-opacity hover:opacity-100"
        >
          Trocar mesa
        </button>
        <PedidoFlow modo="cliente" mesaId={mesaId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="surface-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Selecionar mesa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha a mesa para vincular este tablet.</p>
          </div>
          <Button variant="outline" onClick={handleExit} className="rounded-xl font-bold">
            Desativar dispositivo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {mesasOrdenadas.map((mesa) => (
            <button
              key={mesa.id}
              type="button"
              onClick={() => handleSelectMesa(mesa.id)}
              className={`flex h-auto min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-4 transition-colors ${
                mesa.status === "consumo"
                  ? "border-emerald-500/50 bg-emerald-500/8"
                  : mesa.status === "pendente"
                    ? "border-amber-500/50 bg-amber-500/8"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className={`text-3xl font-black tabular-nums ${
                mesa.status === "consumo" ? "text-emerald-400" : mesa.status === "pendente" ? "text-amber-400" : "text-foreground"
              }`}>
                {String(mesa.numero).padStart(2, "0")}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                mesa.status === "consumo" ? "text-emerald-400" : mesa.status === "pendente" ? "text-amber-400" : "text-muted-foreground"
              }`}>
                {mesa.status === "consumo" ? "Ocupada" : mesa.status === "pendente" ? "Pendente" : "Livre"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TabletPage = () => (
  <DeviceGate type="tablet">
    {({ storeId, mesaId }) => <TabletInner storeId={storeId} initialMesaId={mesaId} />}
  </DeviceGate>
);

export default TabletPage;
