import { useLocation, useParams } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import OperationalAccessCard from "@/components/OperationalAccessCard";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

interface MesaLocationState {
  garcomNome?: string;
}

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentGarcom } = useAuth();
  const state = (location.state as MesaLocationState | null) ?? null;

  if (!currentGarcom) {
    return (
      <AppLayout title="Acesso do Garçom" showBack>
        <OperationalAccessCard role="garcom" />
      </AppLayout>
    );
  }

  return <PedidoFlow modo="garcom" mesaId={id ?? ""} garcomNome={state?.garcomNome ?? currentGarcom.nome} />;
};

export default MesaPage;
