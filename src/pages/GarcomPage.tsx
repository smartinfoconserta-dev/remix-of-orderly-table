import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";

const GARCOM_NOME = "Garçom de plantão";

const GarcomPage = () => {
  const { mesas, dismissChamarGarcom } = useRestaurant();
  const navigate = useNavigate();

  return (
    <AppLayout title="Mesas" showBack>
      <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-foreground text-sm font-bold">{GARCOM_NOME}</p>
        <p className="text-muted-foreground text-sm">Selecione uma mesa para iniciar o mesmo fluxo de pedido do cliente.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {mesas.map((mesa) => (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            onClick={() => {
              dismissChamarGarcom(mesa.id);
              navigate(`/mesa/${mesa.id}`, { state: { garcomNome: GARCOM_NOME } });
            }}
          />
        ))}
      </div>
    </AppLayout>
  );
};

export default GarcomPage;
