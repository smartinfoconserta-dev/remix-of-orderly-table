import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, ChefHat, HandPlatter, User } from "lucide-react";
import { getSistemaConfig } from "@/lib/adminStorage";

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
  const config = getSistemaConfig();
  const nomeRestaurante = config.nomeRestaurante || "Orderly Table";

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const deferredRef = useRef<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e;
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredRef.current) return;
    deferredRef.current.prompt();
    const result = await deferredRef.current.userChoicePromise;
    if (result?.outcome === "accepted") {
      setShowInstallBanner(false);
    }
    deferredRef.current = null;
  };

  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6 gap-6 relative">
      <div className="text-center mb-4">
        <h1 className="text-foreground text-3xl md:text-4xl font-black tracking-tight">
          {nomeRestaurante}
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
          title="Motoboy"
          description="Entregas em andamento"
          icon={<Bike size={28} />}
          onClick={() => navigate("/motoboy")}
        />
      </div>

      {showInstallBanner && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleInstall}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 rounded-2xl bg-primary/15 border border-primary/25 px-4 py-3 text-sm font-bold text-primary backdrop-blur-sm transition-colors hover:bg-primary/20"
          >
            📲 Instalar como app — toque aqui
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
