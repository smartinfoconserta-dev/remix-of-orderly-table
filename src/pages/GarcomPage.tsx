import { LogOut } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";
import OperationalAccessCard from "@/components/OperationalAccessCard";
import LicenseBanner from "@/components/LicenseBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";

const GarcomPage = () => {
  const { mesas, dismissChamarGarcom } = useRestaurant();
  const { currentGarcom, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mesaIdSelecionada = searchParams.get("mesa")?.trim() ?? "";

  useRouteLock("/garcom");

  if (!currentGarcom) {
    return (
      <AppLayout title="Garçom">
        <OperationalAccessCard role="garcom" />
      </AppLayout>
    );
  }

  if (mesaIdSelecionada) {
    return <PedidoFlow modo="garcom" mesaId={mesaIdSelecionada} garcomNome={currentGarcom.nome} />;
  }

  return (
    <AppLayout
      title="Mesas"
      headerRight={
        <Button variant="outline" onClick={() => logout("garcom")} className="gap-2 rounded-xl font-bold">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      }
    >
      <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-base font-bold text-foreground">{currentGarcom.nome}</p>
        <p className="text-sm text-muted-foreground">Selecione uma mesa para lançar pedidos.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {mesas.map((mesa) => (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            showIndicators
            onClick={() => {
              dismissChamarGarcom(mesa.id);
              setSearchParams({ mesa: mesa.id });
            }}
          />
        ))}
      </div>
    </AppLayout>
  );
};

export default GarcomPage;
