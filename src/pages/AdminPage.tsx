import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, Grid3X3, LayoutDashboard, LogOut, Settings, Shield,
  Users, Wallet, TabletSmartphone, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSistemaConfig, getLicenseLevel, saveSistemaConfig } from "@/lib/adminStorage";
import TeamManager from "@/components/TeamManager";
import MesasManager from "@/components/MesasManager";
import DevicesManager from "@/components/DevicesManager";
import DevicePinsManager from "@/components/DevicePinsManager";
import CaixasSection from "@/components/CaixasSection";
import LicenseBanner from "@/components/LicenseBanner";
import IfoodPainel from "@/components/IfoodPainel";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import AdminRelatorios from "@/components/admin/AdminRelatorios";
import AdminCardapio from "@/components/admin/AdminCardapio";
import AdminConfig from "@/components/admin/AdminConfig";
import AdminLicenca from "@/components/admin/AdminLicenca";

type AdminTab = "dashboard" | "cardapio" | "mesas" | "tablets" | "equipe" | "caixas" | "configuracoes" | "licenca" | "ifood";

const sidebarSections = [
  { id: "dashboard" as const, label: "Início", icon: LayoutDashboard },
  { id: "cardapio" as const, label: "Cardápio", icon: ClipboardList },
  { id: "mesas" as const, label: "Mesas", icon: Grid3X3 },
  { id: "tablets" as const, label: "Dispositivos", icon: TabletSmartphone },
  { id: "equipe" as const, label: "Equipe", icon: Users },
  { id: "caixas" as const, label: "Caixas", icon: Wallet },
  { id: "ifood" as const, label: "iFood", icon: ShoppingBag },
  { id: "totem" as const, label: "Totem", icon: Monitor },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
  { id: "licenca" as const, label: "Meu Plano", icon: Shield },
];

const AdminPage = () => {
  const { logout } = useAuth();
  const { storeId, storeName: ctxStoreName } = useStore();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [totemConfig, setTotemConfig] = useState(() => getSistemaConfig());

  const saveTotemConfig = useCallback((config?: any) => {
    const configToSave = config
      && typeof config === "object"
      && "nomeRestaurante" in config
        ? config
        : totemConfig;
    saveSistemaConfig(configToSave, storeId);
  }, [totemConfig, storeId]);

  const nomeRestaurante = getSistemaConfig().nomeRestaurante || "Restaurante";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 py-2.5 shrink-0 bg-sidebar-background border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground leading-none">{nomeRestaurante}</h1>
            <p className="text-[10px] text-muted-foreground">Painel Administrativo</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary text-xs gap-1.5" onClick={() => logout()}>
          <LogOut className="h-3.5 w-3.5" />Sair
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background">
          <nav className="flex-1 py-3 px-2 space-y-0.5">
            <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menu</p>
            {sidebarSections.map((s) => {
              const Icon = s.icon;
              const active = tab === s.id;
              const licLevel = getLicenseLevel();
              const reportsOnly = licLevel === "reports_only";
              const allowedInReportsOnly = ["dashboard", "caixas", "licenca"];
              const isDisabled = reportsOnly && !allowedInReportsOnly.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => { if (!isDisabled) setTab(s.id); }}
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
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-background" key={tab}>
          {tab === "dashboard" && <AdminRelatorios storeId={storeId} />}
          {tab === "cardapio" && <AdminCardapio storeId={storeId} />}
          {tab === "caixas" && <CaixasSection storeId={storeId} formatPrice={formatPrice} />}
          {tab === "configuracoes" && <AdminConfig storeId={storeId} storeName={nomeRestaurante} />}
          {tab === "licenca" && <AdminLicenca storeId={storeId} />}
          {tab === "mesas" && (
            storeId ? <MesasManager storeId={storeId} storeName={nomeRestaurante} /> : <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada.</p>
          )}
          {tab === "tablets" && (
            <div className="space-y-6 fade-in">
              {storeId ? (<><DevicePinsManager storeId={storeId} /><div className="border-t border-border pt-6"><DevicesManager storeId={storeId} /></div></>) : <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada.</p>}
            </div>
          )}
          {tab === "equipe" && (
            <div className="space-y-6 fade-in">
              {storeId ? <TeamManager storeId={storeId} /> : <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada.</p>}
            </div>
          )}
          {tab === "ifood" && <div className="space-y-4 fade-in"><IfoodPainel /></div>}
          {tab === "totem" && (
            <AdminTotem
              sistemaConfig={totemConfig}
              setSistemaConfig={setTotemConfig}
              storeId={storeId}
              onSave={saveTotemConfig}
            />
          )}
        </main>
      </div>
      <LicenseBanner context="admin" />
    </div>
  );
};

export default AdminPage;
