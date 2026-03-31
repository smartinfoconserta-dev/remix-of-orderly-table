import { useState, useMemo } from "react";
import { Check, Monitor, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SistemaConfig } from "@/lib/adminStorage";
import { THEME_PRESETS, GRADIENT_DIRECTIONS } from "@/lib/themePresets";
import MiniTabletPreview from "@/components/admin/MiniTabletPreview";
import ColorPickerRow from "@/components/admin/ColorPickerRow";
import { toast } from "sonner";

interface AdminTotemProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  storeId: string | null;
  onSave: (config?: SistemaConfig) => void;
}

const AdminTotem = ({ sistemaConfig, setSistemaConfig, storeId, onSave }: AdminTotemProps) => {
  const usaGlobal = !sistemaConfig.totemTema && !sistemaConfig.totemCorPrimaria && !sistemaConfig.totemTemaPersonalizado;
  const [useGlobal, setUseGlobal] = useState(usaGlobal);

  const selectedTheme = sistemaConfig.totemTema || sistemaConfig.temaCardapio || "obsidian";
  const isCustom = sistemaConfig.totemTemaPersonalizado ?? false;

  const [fundoTipo, setFundoTipo] = useState<"solido" | "gradiente">(sistemaConfig.totemFundoTipo || "solido");
  const [fundoCor, setFundoCor] = useState(sistemaConfig.totemFundoCor || "#0A0A0A");
  const [fundoGrad1, setFundoGrad1] = useState(sistemaConfig.totemFundoGradiente?.cor1 || "#0A0A0A");
  const [fundoGrad2, setFundoGrad2] = useState(sistemaConfig.totemFundoGradiente?.cor2 || "#1a1a2e");
  const [fundoDir, setFundoDir] = useState(sistemaConfig.totemFundoGradiente?.direcao || "to bottom");
  const [corPrimaria, setCorPrimaria] = useState(sistemaConfig.totemCorPrimaria || sistemaConfig.corPrimaria || "#F97316");
  const [letraCor, setLetraCor] = useState(sistemaConfig.totemLetraCor || "#FAFAFA");
  const [sidebarCor, setSidebarCor] = useState(sistemaConfig.totemSidebarCor || "#0F0F0F");
  const [cardsCor, setCardsCor] = useState(sistemaConfig.totemCardsCor || "#161616");

  const customPreview = useMemo(() => ({
    bg: fundoTipo === "gradiente" ? fundoGrad1 : fundoCor,
    bgGradient: fundoTipo === "gradiente" ? `linear-gradient(${fundoDir}, ${fundoGrad1}, ${fundoGrad2})` : undefined,
    surface: cardsCor, text: letraCor, muted: "#71717A", primary: corPrimaria, sidebar: sidebarCor,
  }), [fundoTipo, fundoCor, fundoGrad1, fundoGrad2, fundoDir, cardsCor, letraCor, corPrimaria, sidebarCor]);

  const handleToggleGlobal = (checked: boolean) => {
    setUseGlobal(checked);
    if (checked) {
      const next: SistemaConfig = {
        ...sistemaConfig,
        totemTema: undefined, totemCorPrimaria: undefined, totemTemaPersonalizado: undefined,
        totemFundoTipo: undefined, totemFundoCor: undefined, totemFundoGradiente: undefined,
        totemLetraCor: undefined, totemSidebarCor: undefined, totemCardsCor: undefined,
      };
      setSistemaConfig(next);
      setTimeout(() => { onSave(next); toast.success("Totem usando aparência global"); }, 50);
    }
  };

  const handleSelectTheme = (tema: typeof THEME_PRESETS[0]) => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      totemTema: tema.id,
      totemCorPrimaria: tema.preview.primary,
      totemTemaPersonalizado: false,
    };
    setSistemaConfig(next);
    setTimeout(() => { onSave(next); toast.success(`Tema "${tema.name}" aplicado ao totem!`); }, 50);
  };

  const handleCustomSave = () => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      totemTemaPersonalizado: true,
      totemFundoTipo: fundoTipo,
      totemFundoCor: fundoCor,
      totemFundoGradiente: fundoTipo === "gradiente" ? { cor1: fundoGrad1, cor2: fundoGrad2, direcao: fundoDir } : undefined,
      totemCorPrimaria: corPrimaria,
      totemLetraCor: letraCor,
      totemSidebarCor: sidebarCor,
      totemCardsCor: cardsCor,
    };
    setSistemaConfig(next);
    setTimeout(() => { onSave(next); toast.success("Tema personalizado do totem salvo!"); }, 50);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <h2 className="text-lg font-black text-foreground">Aparência do Totem</h2>
        <p className="text-sm text-muted-foreground">Configure o visual do totem de autoatendimento separadamente do cardápio digital.</p>
      </div>

      <div className="surface-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Usar aparência global</p>
            <p className="text-sm text-muted-foreground">Quando ligado, o totem herda o tema do cardápio</p>
          </div>
          <Switch checked={useGlobal} onCheckedChange={handleToggleGlobal} />
        </div>
      </div>

      {!useGlobal && (
        <>
          <div className="space-y-3">
            <p className="text-base font-bold text-foreground">Tema do totem</p>
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
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-bold text-foreground">Personalizar cores do totem</p>
                <p className="text-sm text-muted-foreground">Cores customizadas apenas para o totem</p>
              </div>
            </div>

            <div className="space-y-6 pt-3 border-t border-border">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">Preview</p>
                </div>
                <div className="flex justify-center py-2">
                  <MiniTabletPreview {...customPreview} size="lg" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold">Cor de fundo</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="totemFundoTipo" checked={fundoTipo === "solido"} onChange={() => setFundoTipo("solido")} className="accent-[hsl(var(--primary))]" />
                    <span className="text-sm">Sólida</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="totemFundoTipo" checked={fundoTipo === "gradiente"} onChange={() => setFundoTipo("gradiente")} className="accent-[hsl(var(--primary))]" />
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
                <Label className="text-sm font-bold">Cor primária</Label>
                <ColorPickerRow label="Primária" value={corPrimaria} onChange={setCorPrimaria} />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold">Cor das letras</Label>
                <ColorPickerRow label="Texto" value={letraCor} onChange={setLetraCor} />
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
                <Save className="h-4 w-4" /> Salvar aparência do totem
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminTotem;
