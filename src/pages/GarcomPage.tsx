import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";
import OperationalAccessCard from "@/components/OperationalAccessCard";
import { Button } from "@/components/ui/button";

const GarcomPage = () => {
  const { mesas, dismissChamarGarcom } = useRestaurant();
  const { currentGarcom, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentGarcom) {
    return (
      <AppLayout title="Garçom" showBack>
        <OperationalAccessCard role="garcom" />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Mesas"
      showBack
      headerRight={
        <Button variant="outline" onClick={() => logout("garcom")} className="gap-2 rounded-xl font-bold">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      }
    >
      <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-sm font-bold text-foreground">Garçom logado: {currentGarcom.nome}</p>
        <p className="text-sm text-muted-foreground">
          Selecione uma mesa para iniciar o mesmo fluxo de pedido do cliente, agora com rastreio do operador.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
        {mesas.map((mesa) => (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            onClick={() => {
              dismissChamarGarcom(mesa.id);
              navigate(`/mesa/${mesa.id}`, { state: { garcomNome: currentGarcom.nome } });
            }}
          />
        ))}
      </div>
    </AppLayout>
  );
};

export default GarcomPage;
