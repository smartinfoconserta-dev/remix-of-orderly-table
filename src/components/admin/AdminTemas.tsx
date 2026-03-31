import { useState, useMemo } from "react";
import { Check, Palette, Save, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SistemaConfig } from "@/lib/adminStorage";
import { THEME_MAP } from "@/lib/themeEngine";
import { THEME_PRESETS, GRADIENT_DIRECTIONS } from "@/lib/themePresets";
import MiniTabletPreview from "@/components/admin/MiniTabletPreview";
import ColorPickerRow from "@/components/admin/ColorPickerRow";
import { toast } from "sonner";

interface AdminTemasProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  storeId: string | null;
  onSave: (config?: SistemaConfig) => void;
}

const AdminTemas = ({ sistemaConfig, setSistemaConfig, storeId, onSave }: AdminTemasProps) => {
  const selectedTheme = sistemaConfig.temaCardapio || "obsidian";
  const isCustom = sistemaConfig.temaPersonalizado ?? false;

  const [fundoTipo, setFundoTipo] = useState<"solido" | "gradiente">(sistemaConfig.fundoTipo || "solido");
  const [fundoCor, setFundoCor] = useState(sistemaConfig.fundoCor || "#0A0A0A");
  const [fundoGrad1, setFundoGrad1] = useState(sistemaConfig.fundoGradiente?.cor1 || "#0A0A0A");
  const [fundoGrad2, setFundoGrad2] = useState(sistemaConfig.fundoGradiente?.cor2 || "#1a1a2e");
  const [fundoDir, setFundoDir] = useState(sistemaConfig.fundoGradiente?.direcao || "to bottom");

  const [letraTipo, setLetraTipo] = useState<"solido" | "gradiente">(sistemaConfig.letraTipo || "solido");
  const [letraCor, setLetraCor] = useState(sistemaConfig.letraCor || "#FAFAFA");
  const [letraGrad1, setLetraGrad1] = useState(sistemaConfig.letraGradiente?.cor1 || "#FAFAFA");
  const [letraGrad2, setLetraGrad2] = useState(sistemaConfig.letraGradiente?.cor2 || "#a1a1aa");
  const [letraDir, setLetraDir] = useState(sistemaConfig.letraGradiente?.direcao || "to right");

  const [corPrimaria, setCorPrimaria] = useState(sistemaConfig.corPrimaria || "#F97316");
  const [sidebarCor, setSidebarCor] = useState(sistemaConfig.sidebarCor || "#0F0F0F");
  const [cardsCor, setCardsCor] = useState(sistemaConfig.cardsCor || "#161616");

  const customPreview = useMemo(() => ({
    bg: fundoTipo === "gradiente" ? fundoGrad1 : fundoCor,
    bgGradient: fundoTipo === "gradiente" ? `linear-gradient(${fundoDir}, ${fundoGrad1}, ${fundoGrad2})` : undefined,
    surface: cardsCor,
    text: letraCor,
    muted: "#71717A",
    primary: corPrimaria,
    sidebar: sidebarCor,
  }), [fundoTipo, fundoCor, fundoGrad1, fundoGrad2, fundoDir, cardsCor, letraCor, corPrimaria, sidebarCor]);

  const handleSelectTheme = (tema: typeof THEME_PRESETS[0]) => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      temaCardapio: tema.id,
      corPrimaria: tema.preview.primary,
      temaPersonalizado: false,
    };
    setSistemaConfig(next);
    setTimeout(() => { onSave(next); toast.success(`Tema "${tema.name}" aplicado!`); }, 50);
  };

  const handleToggleCustom = (checked: boolean) => {
    const next: SistemaConfig = { ...sistemaConfig, temaPersonalizado: checked };
    setSistemaConfig(next);
    if (!checked) setTimeout(() => { onSave(next); }, 50);
  };

  const handleCustomSave = () => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      temaPersonalizado: true,
      fundoTipo, fundoCor,
      fundoGradiente: fundoTipo === "gradiente" ? { cor1: fundoGrad1, cor2: fundoGrad2, direcao: fundoDir } : undefined,
      letraTipo, letraCor,
      letraGradiente: letraTipo === "gradiente" ? { cor1: letraGrad1, cor2: letraGrad2, direcao: letraDir } : undefined,
      corPrimaria, sidebarCor, cardsCor,
    };
    setSistemaConfig(next);
    setTimeout(() => { onSave(next); toast.success("Tema personalizado salvo!"); }, 50);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-3">
        <p className="text-base font-bold text-foreground">Escolha o tema do cardápio</p>
        <p className="text-sm text-muted-foreground">O tema será aplicado no cardápio digital, totem e delivery.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {THEME_PRESETS.map((tema) => {
            const isSelected = selectedTheme === tema.id && !isCustom;
            return (
              <button key={tema.id} type="button" onClick={() => handleSelectTheme(tema)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                <MiniTabletPreview bg={tema.preview.bg} surface={tema.preview.surface} text={tema.preview.text} muted={tema.preview.muted} primary={tema.preview.primary} sidebar={tema.preview.sidebar} size="sm" />
                <div className="mt-2.5">
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    {tema.name}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tema.description}</p>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-bold text-foreground">Personalizar cores manualmente</p>
              <p className="text-sm text-muted-foreground">Sobrescreve o tema selecionado com cores customizadas</p>
            </div>
          </div>
          <Switch checked={isCustom} onCheckedChange={handleToggleCustom} />
        </div>

        {isCustom && (
          <div className="space-y-6 pt-3 border-t border-border">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-bold text-foreground">Preview ao vivo</p>
              </div>
              <div className="flex justify-center py-2">
                <MiniTabletPreview {...customPreview} size="lg" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor de fundo</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="fundoTipo" checked={fundoTipo === "solido"} onChange={() => setFundoTipo("solido")} className="accent-[hsl(var(--primary))]" />
                  <span className="text-sm">Cor sólida</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="fundoTipo" checked={fundoTipo === "gradiente"} onChange={() => setFundoTipo("gradiente")} className="accent-[hsl(var(--primary))]" />
                  <span className="text-sm">Degradê</span>
                </label>
              </div>
              {fundoTipo === "solido" ? (
                <ColorPickerRow label="Fundo" value={fundoCor} onChange={setFundoCor} />
              ) : (
                <div className="space-y-2">
                  <ColorPickerRow label="Início" value={fundoGrad1} onChange={setFundoGrad1} />
                  <ColorPickerRow label="Fim" value={fundoGrad2} onChange={setFundoGrad2} />
                  <Select value={fundoDir} onValueChange={setFundoDir}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{GRADIENT_DIRECTIONS.map(d => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor das letras</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="letraTipo" checked={letraTipo === "solido"} onChange={() => setLetraTipo("solido")} className="accent-[hsl(var(--primary))]" />
                  <span className="text-sm">Cor sólida</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="letraTipo" checked={letraTipo === "gradiente"} onChange={() => setLetraTipo("gradiente")} className="accent-[hsl(var(--primary))]" />
                  <span className="text-sm">Degradê</span>
                </label>
              </div>
              {letraTipo === "solido" ? (
                <ColorPickerRow label="Texto" value={letraCor} onChange={setLetraCor} />
              ) : (
                <div className="space-y-2">
                  <ColorPickerRow label="Início" value={letraGrad1} onChange={setLetraGrad1} />
                  <ColorPickerRow label="Fim" value={letraGrad2} onChange={setLetraGrad2} />
                  <Select value={letraDir} onValueChange={setLetraDir}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{GRADIENT_DIRECTIONS.map(d => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor primária (botões, preços, destaques)</Label>
              <ColorPickerRow label="Primária" value={corPrimaria} onChange={setCorPrimaria} />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor da sidebar</Label>
              <ColorPickerRow label="Sidebar" value={sidebarCor} onChange={setSidebarCor} />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor dos cards</Label>
              <ColorPickerRow label="Cards" value={cardsCor} onChange={setCardsCor} />
            </div>

            <Button onClick={handleCustomSave} className="rounded-xl font-bold gap-2 w-full sm:w-auto">
              <Save className="h-4 w-4" /> Salvar tema personalizado
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTemas;
