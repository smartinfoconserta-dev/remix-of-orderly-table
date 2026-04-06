import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, LayoutDashboard, LogOut, Settings, Shield,
  Truck, Palette, Receipt, Wrench, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSistemaConfig, getSistemaConfigAsync, getLicenseLevel, type SistemaConfig } from "@/lib/adminStorage";
import LicenseBanner from "@/components/LicenseBanner";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminCardapio from "@/components/admin/AdminCardapio";
import AdminOperacao from "@/components/admin/AdminOperacao";
import AdminDelivery from "@/components/admin/AdminDelivery";
import AdminAparenciaTab from "@/components/admin/AdminAparenciaTab";
import AdminFiscal from "@/components/admin/AdminFiscal";
import AdminConfig from "@/components/admin/AdminConfig";
import AdminLicenca from "@/components/admin/AdminLicenca";
import SetupWizard from "@/components/admin/SetupWizard";
import { useIsMobile } from "@/hooks/use-mobile";

type AdminTab = "dashboard" | "cardapio" | "operacao" | "delivery" | "aparencia" | "fiscal" | "configuracoes" | "licenca";

const sidebarSections = [
  { id: "dashboard" as const, label: "Início", icon: LayoutDashboard },
  { id: "cardapio" as const, label: "Cardápio", icon: ClipboardList },
  { id: "operacao" as const, label: "Operação", icon: Wrench },
  { id: "delivery" as const, label: "Delivery", icon: Truck },
  { id: "aparencia" as const, label: "Aparência", icon: Palette },
  { id: "fiscal" as const, label: "Fiscal", icon: Receipt },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
  { id: "licenca" as const, label: "Meu Plano", icon: Shield },
];

const AdminPage = () => {
  const { logout } = useAuth();
  const { storeId, storeName: ctxStoreName } = useStore();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [showWizard, setShowWizard] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<SistemaConfig>(getSistemaConfig);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const nomeRestaurante = currentConfig.nomeRestaurante || "Restaurante";

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then((cfg) => {
      setCurrentConfig(cfg);
      setConfigLoaded(true);
      if (!cfg.setupCompleto) {
        setShowWizard(true);
      }
    });
  }, [storeId]);

  const handleWizardComplete = (cfg: SistemaConfig) => {
    setCurrentConfig(cfg);
    setShowWizard(false);
  };

  const handleOpenWizard = () => setShowWizard(true);

  const handleSelectTab = (id: AdminTab) => {
    setTab(id);
    setDrawerOpen(false);
  };

  if (showWizard && configLoaded) {
    return <SetupWizard storeId={storeId} currentConfig={currentConfig} onComplete={handleWizardComplete} />;
  }

  const licLevel = getLicenseLevel();
  const reportsOnly = licLevel === "reports_only";
  const allowedInReportsOnly = ["dashboard", "licenca"];

  const sidebarNav = (
    <nav className="flex-1 py-3 px-2 space-y-0.5">
      <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menu</p>
      {sidebarSections.map((s) => {
        const Icon = s.icon;
        const active = tab === s.id;
        const isDisabled = reportsOnly && !allowedInReportsOnly.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={isDisabled}
            onClick={() => handleSelectTab(s.id)}
            className={`flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
              isDisabled
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : active
                  ? "bg-primary/15 text-primary font-bold"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {s.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col min-h-svh bg-background">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 shrink-0 bg-sidebar-background border-b border-sidebar-border">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Mobile hamburger */}
          {isMobile && (
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[260px] p-0 bg-sidebar-background border-sidebar-border">
                <div className="px-4 py-4 border-b border-sidebar-border">
                  <h2 className="text-sm font-bold text-sidebar-foreground">{nomeRestaurante}</h2>
                  <p className="text-[10px] text-muted-foreground">Painel Administrativo</p>
                </div>
                {sidebarNav}
              </SheetContent>
            </Sheet>
          )}
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-foreground leading-none truncate">{nomeRestaurante}</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">Painel Administrativo</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary text-xs gap-1.5 shrink-0" onClick={() => logout()}>
          <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sair</span>
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background">
            {sidebarNav}
          </aside>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background" key={tab}>
          {tab === "dashboard" && <AdminDashboard storeId={storeId} />}
          {tab === "cardapio" && <AdminCardapio storeId={storeId} />}
          {tab === "operacao" && <AdminOperacao storeId={storeId} storeName={nomeRestaurante} />}
          {tab === "delivery" && <AdminDelivery storeId={storeId} />}
          {tab === "aparencia" && <AdminAparenciaTab storeId={storeId} />}
          {tab === "fiscal" && <AdminFiscal storeId={storeId} />}
          {tab === "configuracoes" && <AdminConfig storeId={storeId} storeName={nomeRestaurante} onOpenWizard={handleOpenWizard} />}
          {tab === "licenca" && <AdminLicenca storeId={storeId} />}
        </main>
      </div>
      <LicenseBanner context="admin" />
    </div>
  );
};

export default AdminPage;
