import { useState } from "react";
import { Grid3X3, TabletSmartphone, Users, ArrowLeft } from "lucide-react";
import MesasManager from "@/components/MesasManager";
import DevicesManager from "@/components/DevicesManager";
import DevicePinsManager from "@/components/DevicePinsManager";
import TeamManager from "@/components/TeamManager";

interface Props {
  storeId: string | null;
  storeName: string;
}

type SubSection = "inicio" | "mesas" | "dispositivos" | "equipe";

const cards = [
  { id: "mesas" as const, icon: Grid3X3, label: "Mesas", desc: "Configurar quantidade e layout das mesas" },
  { id: "dispositivos" as const, icon: TabletSmartphone, label: "Dispositivos", desc: "Tablets, totens, TVs e PINs de acesso" },
  { id: "equipe" as const, icon: Users, label: "Equipe", desc: "Garçons, caixas, gerentes e PINs" },
];

const AdminOperacao = ({ storeId, storeName }: Props) => {
  const [section, setSection] = useState<SubSection>("inicio");

  if (!storeId) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada.</p>;
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center gap-3">
        {section !== "inicio" && (
          <button onClick={() => setSection("inicio")} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        )}
        <div>
          <h2 className="text-2xl font-black text-foreground">
            {section === "inicio" ? "Operação" : cards.find(c => c.id === section)?.label}
          </h2>
          {section === "inicio" && <p className="text-sm text-muted-foreground">Gerencie mesas, dispositivos e equipe</p>}
        </div>
      </div>

      {section === "inicio" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <button key={card.id} onClick={() => setSection(card.id)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 text-left hover:border-primary/30 hover:bg-accent/50 transition-all">
                <Icon className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-base font-bold text-foreground">{card.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{card.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {section === "mesas" && <MesasManager storeId={storeId} storeName={storeName} />}
      {section === "dispositivos" && (
        <div className="space-y-6">
          <DevicePinsManager storeId={storeId} />
          <div className="border-t border-border pt-6">
            <DevicesManager storeId={storeId} />
          </div>
        </div>
      )}
      {section === "equipe" && <TeamManager storeId={storeId} />}
    </div>
  );
};

export default AdminOperacao;
