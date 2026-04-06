import { useState, useCallback, useEffect } from "react";
import { Palette, Image, Megaphone, MessageCircle, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSistemaConfig, saveSistemaConfig, saveSistemaConfigAsync, getSistemaConfigAsync,
  applyCustomPrimaryColor, type SistemaConfig,
} from "@/lib/adminStorage";
import AdminAparencia from "./AdminAparencia";
import AdminBanners from "./AdminBanners";
import AdminRedes from "./AdminRedes";
import AdminTemas from "./AdminTemas";
import { toast } from "sonner";

interface Props {
  storeId: string | null;
}

type SubSection = "inicio" | "aparencia" | "temas" | "banners" | "redes";

const cards = [
  { id: "aparencia" as const, icon: Palette, label: "Logo e Nome", desc: "Logo, formato e cor primária" },
  { id: "temas" as const, icon: Image, label: "Temas", desc: "Visual do cardápio e cores" },
  { id: "banners" as const, icon: Megaphone, label: "Banners", desc: "Promoções e destaques" },
  { id: "redes" as const, icon: MessageCircle, label: "WhatsApp e Redes", desc: "Comunicação e QR codes" },
];

const AdminAparenciaTab = ({ storeId }: Props) => {
  const [section, setSection] = useState<SubSection>("inicio");
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then(setSistemaConfig);
  }, [storeId]);

  const saveSistema = useCallback((configOverride?: SistemaConfig | unknown) => {
    const toSave = (configOverride && typeof configOverride === "object" && "nomeRestaurante" in (configOverride as any)) ? configOverride as SistemaConfig : sistemaConfig;
    saveSistemaConfig(toSave, storeId);
    saveSistemaConfigAsync(toSave, storeId);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig, storeId]);

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
            {section === "inicio" ? "Aparência" : cards.find(c => c.id === section)?.label}
          </h2>
          {section === "inicio" && <p className="text-sm text-muted-foreground">Personalize o visual do seu estabelecimento</p>}
        </div>
      </div>

      {section === "inicio" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
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

      {section === "aparencia" && <AdminAparencia sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} onSave={saveSistema} />}
      {section === "temas" && <AdminTemas sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} storeId={storeId} onSave={saveSistema} />}
      {section === "banners" && <AdminBanners sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} onSave={saveSistema} />}
      {section === "redes" && <AdminRedes sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} onSave={saveSistema} />}
    </div>
  );
};

export default AdminAparenciaTab;
