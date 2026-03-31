import PedidoFlow from "@/components/PedidoFlow";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface CaixaBalcaoFlowProps {
  balcaoTipo: "balcao" | "delivery";
  balcaoClienteNome: string;
  onPedidoConfirmado: (itens: ItemCarrinho[], paraViagem: boolean) => void;
  onBack: () => void;
}

const CaixaBalcaoFlow = ({
  balcaoTipo,
  balcaoClienteNome,
  onPedidoConfirmado,
  onBack,
}: CaixaBalcaoFlowProps) => {
  return (
    <PedidoFlow
      modo={balcaoTipo}
      clienteNome={balcaoClienteNome}
      onPedidoConfirmado={onPedidoConfirmado}
      onBack={onBack}
    />
  );
};

export default CaixaBalcaoFlow;
