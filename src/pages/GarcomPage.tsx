import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";

const GarcomPage = () => {
  const { mesas, dismissChamarGarcom } = useRestaurant();
  const navigate = useNavigate();

  return (
    <AppLayout title="Mesas" showBack>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {mesas.map((mesa) => (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            onClick={() => {
              dismissChamarGarcom(mesa.id);
              navigate(`/mesa/${mesa.id}`);
            }}
          />
        ))}
      </div>
    </AppLayout>
  );
};

export default GarcomPage;
