import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, ChefHat, CircleDollarSign, HandPlatter, KeyRound, Monitor, Settings, ShieldCheck, Tablet, User } from "lucide-react";
import { getSistemaConfig } from "@/lib/adminStorage";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const AdminLoginDialog = () => {
  const navigate = useNavigate();
  const { loginAsMaster, loginAsAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  };

  const handleLogin = async (tab: "master" | "admin") => {
    if (!email.trim() || !password) {
      setError("Preencha email e senha");
      return;
    }
    setLoading(true);
    setError(null);

    const result = tab === "master"
      ? await loginAsMaster(email.trim(), password)
      : await loginAsAdmin(email.trim(), password);

    if (!result.ok) {
      setError(result.error ?? "Falha ao autenticar");
      setLoading(false);
      return;
    }

    setOpen(false);
    reset();
    navigate(tab === "master" ? "/master" : "/admin");
  };

  const fields = (tab: "master" | "admin") => (
    <div className="flex flex-col gap-4 pt-2">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Senha</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button
        onClick={() => handleLogin(tab)}
        disabled={loading}
        className="h-11 rounded-xl text-base font-bold"
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <KeyRound className="h-3.5 w-3.5" />
          Acesso administrativo
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">Acesso Administrativo</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="master" onValueChange={() => setError(null)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="master">Master</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="master">{fields("master")}</TabsContent>
          <TabsContent value="admin">{fields("admin")}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

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
          title="Cardápio"
          description="Faça seu pedido"
          icon={<User size={28} />}
          onClick={() => navigate("/cliente")}
        />
        <ModeCard
          title="Garçom"
          description="Atender mesas e lançar pedidos"
          icon={<HandPlatter size={28} />}
          onClick={() => navigate("/garcom")}
        />
        <ModeCard
          title="Cozinha"
          description="Pedidos em preparo"
          icon={<ChefHat size={28} />}
          onClick={() => navigate("/cozinha")}
        />
        <ModeCard
          title="Caixa"
          description="Pagamentos e fechamento de mesas"
          icon={<CircleDollarSign size={28} />}
          onClick={() => navigate("/caixa")}
        />
        <ModeCard
          title="Delivery"
          description="Receber e gerenciar entregas"
          icon={<span className="text-2xl">🛵</span>}
          onClick={() => navigate("/delivery")}
        />
        <ModeCard
          title="Totem"
          description="Autoatendimento"
          icon={<Tablet size={28} />}
          onClick={() => navigate("/totem")}
        />
        <ModeCard
          title="TV Retirada"
          description="Painel de pedidos prontos"
          icon={<Monitor size={28} />}
          onClick={() => navigate("/tv")}
        />
        <ModeCard
          title="Gerente"
          description="Relatórios e gestão"
          icon={<ShieldCheck size={28} />}
          onClick={() => navigate("/gerente")}
        />
        <ModeCard
          title="Motoboy"
          description="Minhas entregas"
          icon={<Bike size={28} />}
          onClick={() => navigate("/motoboy")}
        />
      </div>

      {/* Footer — admin access */}
      <div className="mt-4">
        <AdminLoginDialog />
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
