import { Upload, ImagePlus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SistemaConfig } from "@/lib/adminStorage";
import { toast } from "sonner";

interface AdminAparenciaProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  onSave: () => void;
}

const AdminAparencia = ({ sistemaConfig, setSistemaConfig, onSave }: AdminAparenciaProps) => {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="surface-card space-y-5 rounded-2xl p-6">
        {/* Nome do restaurante */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Nome do restaurante</label>
          <Input className="h-11 rounded-xl" value={sistemaConfig.nomeRestaurante} onChange={(e) => setSistemaConfig((c) => ({ ...c, nomeRestaurante: e.target.value }))} placeholder="Nome do restaurante" />
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Logo do restaurante</label>
          {(sistemaConfig.logoBase64 || sistemaConfig.logoUrl) && (
            <div className="flex items-center gap-3">
              <img src={sistemaConfig.logoBase64 || sistemaConfig.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl border border-border object-cover" />
              {sistemaConfig.logoBase64 && (
                <button type="button" onClick={() => setSistemaConfig((c) => ({ ...c, logoBase64: "" }))} className="text-sm text-destructive hover:underline">Remover foto</button>
              )}
            </div>
          )}
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            <Upload className="h-5 w-5" />Fazer upload da logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]; if (!file) return;
              if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
              const reader = new FileReader();
              reader.onload = () => setSistemaConfig((c) => ({ ...c, logoBase64: reader.result as string }));
              reader.readAsDataURL(file); e.target.value = "";
            }} />
          </label>
          <p className="text-sm text-muted-foreground pt-1">Ou cole uma URL</p>
          <Input className="h-11 rounded-xl" value={sistemaConfig.logoUrl} onChange={(e) => setSistemaConfig((c) => ({ ...c, logoUrl: e.target.value }))} placeholder="https://..." />
        </div>

        {/* Formato da logo */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Formato da logo</label>
          <div className="flex gap-2">
            {([{ id: "quadrada" as const, label: "Quadrada", preview: "rounded-xl" }, { id: "circular" as const, label: "Circular", preview: "rounded-full" }]).map(opt => (
              <button key={opt.id} type="button" onClick={() => setSistemaConfig(c => ({ ...c, logoEstilo: opt.id }))}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors flex-1 ${(sistemaConfig.logoEstilo || "quadrada") === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30"}`}>
                <div className={`h-8 w-8 ${opt.preview} border border-border bg-card flex items-center justify-center shrink-0 overflow-hidden`}>
                  {(sistemaConfig.logoBase64 || sistemaConfig.logoUrl) ? (<img src={sistemaConfig.logoBase64 || sistemaConfig.logoUrl} alt="" className={`h-full w-full ${opt.preview} object-cover`} />) : (<span className="text-[8px] font-black text-muted-foreground">AB</span>)}
                </div>
                <span className="text-sm font-bold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cabeçalho do cardápio */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Topo do cardápio (tablet/totem)</label>
          <p className="text-sm text-muted-foreground">Como aparece o cabeçalho do cardápio digital</p>
          <div className="flex gap-2">
            {([{ id: "padrao" as const, label: "Padrão" }, { id: "banner" as const, label: "Banner personalizado" }]).map(opt => (
              <button key={opt.id} type="button" onClick={() => setSistemaConfig(c => ({ ...c, cardapioHeaderEstilo: opt.id }))}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors flex-1 ${(sistemaConfig.cardapioHeaderEstilo || "padrao") === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30"}`}>
                <span className="text-sm font-bold">{opt.label}</span>
              </button>
            ))}
          </div>
          {sistemaConfig.cardapioHeaderEstilo === "banner" && (
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-muted-foreground">Imagem de fundo do topo</label>
              {sistemaConfig.cardapioBannerBase64 && (
                <div className="flex items-center gap-3">
                  <img src={sistemaConfig.cardapioBannerBase64} alt="Banner" className="h-14 w-full max-w-xs rounded-xl border border-border object-cover" />
                  <button type="button" onClick={() => setSistemaConfig(c => ({ ...c, cardapioBannerBase64: "" }))} className="text-sm text-destructive hover:underline"><X className="h-4 w-4" /></button>
                </div>
              )}
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                <ImagePlus className="h-5 w-5" />{sistemaConfig.cardapioBannerBase64 ? "Trocar imagem" : "Fazer upload do banner"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                  const reader = new FileReader();
                  reader.onload = () => setSistemaConfig(c => ({ ...c, cardapioBannerBase64: reader.result as string }));
                  reader.readAsDataURL(file); e.target.value = "";
                }} />
              </label>
            </div>
          )}
        </div>

        {/* Cor primária */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Cor primária</label>
          <div className="flex items-center gap-3">
            <input type="color" value={sistemaConfig.corPrimaria || "#f97316"} onChange={(e) => setSistemaConfig((c) => ({ ...c, corPrimaria: e.target.value }))} className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent" />
            <span className="text-sm text-muted-foreground font-mono">{sistemaConfig.corPrimaria || "#f97316"}</span>
          </div>
        </div>

        {/* Estilo da sidebar / categorias */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Estilo do menu de categorias</label>
          <p className="text-xs text-muted-foreground">Como as categorias aparecem no cardápio digital</p>
          <div className="flex flex-col gap-2">
            {([
              { id: "icone-texto" as const, label: "Ícone + Texto", desc: "Ícone ao lado do nome (padrão)" },
              { id: "icone-acima" as const, label: "Ícone em cima", desc: "Ícone centralizado acima do nome" },
              { id: "so-texto" as const, label: "Só texto", desc: "Apenas o nome da categoria" },
            ]).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSistemaConfig(c => ({ ...c, sidebarEstilo: opt.id }))}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  (sistemaConfig.sidebarEstilo || "icone-texto") === opt.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                }`}
              >
                <div className="flex-1">
                  <span className="text-sm font-bold">{opt.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onSave} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
    </div>
  );
};

export default AdminAparencia;
