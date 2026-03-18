import { useEffect, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import { TABLET_BINDING_CHANGED_EVENT, getBoundTabletMesaId, setBoundTabletMesaId } from "@/lib/tabletBinding";

const ClientePage = () => {
  const [mesaId, setMesaId] = useState<string | null>(() => getBoundTabletMesaId());

  useEffect(() => {
    if (!mesaId) return;
    setBoundTabletMesaId(mesaId);
  }, [mesaId]);

  useEffect(() => {
    const syncTabletBinding = () => {
      setMesaId(getBoundTabletMesaId());
    };

    window.addEventListener("storage", syncTabletBinding);
    window.addEventListener(TABLET_BINDING_CHANGED_EVENT, syncTabletBinding);

    return () => {
      window.removeEventListener("storage", syncTabletBinding);
      window.removeEventListener(TABLET_BINDING_CHANGED_EVENT, syncTabletBinding);
    };
  }, []);

  if (!mesaId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="surface-card w-full max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-black text-foreground">Tablet sem mesa vinculada</h1>
          <p className="text-sm text-muted-foreground">Solicite ao gerente no caixa a vinculação deste terminal antes de iniciar novos pedidos.</p>
        </div>
      </div>
    );
  }

  return <PedidoFlow modo="cliente" mesaId={mesaId} />;
};

export default ClientePage;
