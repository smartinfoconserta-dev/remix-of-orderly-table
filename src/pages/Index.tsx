import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, ChefHat, HandPlatter, Settings, User, Wallet } from "lucide-react";

interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const ModeCard = ({ title, description, icon, onClick }: ModeCardProps) => (
  <button
    onClick={onClick}
    className="surface-card p-8 md:p-10 flex flex-col items-center justify-center gap-4 min-h-[160px] md:min-h-[200px] w-full"
  >
    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="text-center">
      <span className="text-foreground text-xl font-bold block">{title}</span>
      <span className="text-muted-foreground text-sm mt-1 block">{description}</span>
    </div>
  </button>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center mb-4">
        <h1 className="text-foreground text-3xl md:text-4xl font-black tracking-tight">
          Restaurante
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mt-2">
          Selecione o modo de acesso
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        <ModeCard
          title="Cliente"
          description="Cardápio, pedidos e conta"
          icon={<User size={28} />}
          onClick={() => navigate("/cliente")}
        />
        <ModeCard
          title="Garçom"
          description="Mesas e lançamento de pedidos"
          icon={<HandPlatter size={28} />}
          onClick={() => navigate("/garcom")}
        />
        <ModeCard
          title="Cozinha"
          description="Painel de pedidos em tempo real"
          icon={<ChefHat size={28} />}
          onClick={() => navigate("/cozinha")}
        />
        <ModeCard
          title="Caixa"
          description="Mesas, pagamentos e fechamento"
          icon={<Wallet size={28} />}
          onClick={() => navigate("/caixa")}
        />
        <ModeCard
          title="Gerente"
          description="Acesso completo e relatórios"
          icon={<BriefcaseBusiness size={28} />}
          onClick={() => navigate("/gerente")}
        />
        <ModeCard
          title="Admin"
          description="Configurações do sistema"
          icon={<Settings size={28} />}
          onClick={() => navigate("/admin")}
        />
      </div>
    </div>
  );
};

export default Index;
