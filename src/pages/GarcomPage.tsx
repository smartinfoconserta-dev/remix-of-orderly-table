import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Bell } from "lucide-react";

const GarcomPage = () => {
  const { mesas } = useRestaurant();
  const navigate = useNavigate();

  return (
    <AppLayout title="Mesas" showBack>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {mesas.map((mesa) => (
          <button
            key={mesa.id}
            onClick={() => navigate(`/mesa/${mesa.id}`)}
            className={`surface-card p-5 md:p-6 flex flex-col items-center justify-center gap-2 min-h-[120px] md:min-h-[140px] relative transition-all ${
              mesa.chamarGarcom
                ? "ring-2 ring-destructive animate-pulse shadow-lg shadow-destructive/20"
                : ""
            }`}
          >
            {mesa.chamarGarcom && (
              <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </span>
            )}
            <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">
              Mesa
            </span>
            <span className="text-foreground text-3xl md:text-4xl font-black tabular-nums">
              {String(mesa.numero).padStart(2, "0")}
            </span>
            <StatusBadge status={mesa.status} />
          </button>
        ))}
      </div>
    </AppLayout>
  );
};

export default GarcomPage;
