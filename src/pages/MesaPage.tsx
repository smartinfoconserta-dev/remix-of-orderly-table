import { useLocation, useParams } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";

interface MesaLocationState {
  garcomNome?: string;
}

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = (location.state as MesaLocationState | null) ?? null;

  return <PedidoFlow modo="garcom" mesaId={id ?? ""} garcomNome={state?.garcomNome} />;
};

export default MesaPage;
