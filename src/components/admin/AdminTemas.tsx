import { useState, useMemo } from "react";
import { Check, Palette, Save, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SistemaConfig } from "@/lib/adminStorage";
import { THEME_MAP } from "@/lib/themeEngine";
import { toast } from "sonner";

interface AdminTemasProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  storeId: string | null;
  onSave: () => void;
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  preview: { bg: string; surface: string; primary: string; text: string; muted: string; sidebar: string };
}

const THEME_PRESETS: ThemePreset[] = [
  { id: "obsidian", name: "Obsidian", description: "Escuro elegante com detalhes em laranja", preview: { bg: "#0A0A0A", surface: "#161616", primary: "#F97316", text: "#FAFAFA", muted: "#71717A", sidebar: "#0F0F0F" } },
  { id: "clean", name: "Clean", description: "Fundo claro, limpo e moderno", preview: { bg: "#FFFFFF", surface: "#F4F4F5", primary: "#2563EB", text: "#18181B", muted: "#71717A", sidebar: "#FAFAFA" } },
  { id: "rustico", name: "Rústico", description: "Tons quentes, acolhedor e natural", preview: { bg: "#1C1917", surface: "#292524", primary: "#D97706", text: "#FAFAF9", muted: "#A8A29E", sidebar: "#1C1917" } },
  { id: "premium", name: "Premium", description: "Escuro sofisticado com dourado", preview: { bg: "#09090B", surface: "#18181B", primary: "#EAB308", text: "#FAFAFA", muted: "#A1A1AA", sidebar: "#09090B" } },
  { id: "fresh", name: "Fresh", description: "Claro e vibrante, ideal para fast food", preview: { bg: "#FFFFFF", surface: "#F0FDF4", primary: "#16A34A", text: "#14532D", muted: "#6B7280", sidebar: "#F0FDF4" } },
  { id: "crimson", name: "Vermelho Intenso", description: "Ousado e marcante, ideal para hamburguerias", preview: { bg: "#0C0A09", surface: "#1C1917", primary: "#DC2626", text: "#FAFAF9", muted: "#A8A29E", sidebar: "#0C0A09" } },
];

// ── Mini Tablet Preview ──
const MiniTabletPreview = ({ bg, bgGradient, surface, text, muted, primary, sidebar, size = "sm" }: {
  bg: string; bgGradient?: string; surface: string; text: string; muted: string; primary: string; sidebar: string; size?: "sm" | "lg";
}) => {
  const w = size === "lg" ? "w-[380px]" : "w-full";
  const h = size === "lg" ? "h-[240px]" : "h-[120px]";
  return (
    <div className={`${w} ${h} rounded-xl border-[3px] border-zinc-600 overflow-hidden flex shadow-lg`} style={{ background: bgGradient || bg }}>
      {/* Sidebar */}
      <div className="w-[18%] flex flex-col gap-1 p-1.5 pt-3" style={{ backgroundColor: sidebar }}>
        <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: primary, opacity: 0.9 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
      </div>
      {/* Content */}
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        {/* Header */}
        <div className="flex items-center gap-1">
          <div className="h-2 w-8 rounded-full" style={{ backgroundColor: text, opacity: 0.7 }} />
          <div className="flex-1" />
          <div className="h-2 w-4 rounded" style={{ backgroundColor: primary, opacity: 0.5 }} />
        </div>
        {/* Banner */}
        <div className="h-[35%] rounded-md" style={{ background: `linear-gradient(135deg, ${primary}44, ${primary}22)`, border: `1px solid ${primary}33` }} />
        {/* Products */}
        <div className="flex gap-1 flex-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 rounded overflow-hidden" style={{ backgroundColor: surface, border: `1px solid ${muted}22` }}>
              <div className="h-[55%]" style={{ backgroundColor: muted, opacity: 0.15 }} />
              <div className="p-0.5">
                <div className="h-1 w-3/4 rounded-full mt-0.5" style={{ backgroundColor: text, opacity: 0.5 }} />
                <div className="h-1 w-1/2 rounded-full mt-0.5" style={{ backgroundColor: primary, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Color Picker Row ──
const ColorPickerRow = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-3">
    <div className="relative h-10 w-14 shrink-0">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      <div className="h-full w-full rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: value }} />
    </div>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono text-sm bg-card text-foreground border-border" maxLength={7} />
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

const GRADIENT_DIRECTIONS = [
  { value: "to bottom", label: "Cima → Baixo" },
  { value: "to right", label: "Esquerda → Direita" },
  { value: "to bottom right", label: "Diagonal ↘" },
  { value: "to top right", label: "Diagonal ↗" },
];

const AdminTemas = ({ sistemaConfig, setSistemaConfig, storeId, onSave }: AdminTemasProps) => {
  const selectedTheme = sistemaConfig.temaCardapio || "obsidian";
  const isCustom = sistemaConfig.temaPersonalizado ?? false;

  // Local state for custom colors (initialized from config)
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

  // Live preview colors for custom mode
  const customPreview = useMemo(() => ({
    bg: fundoTipo === "gradiente" ? fundoGrad1 : fundoCor,
    bgGradient: fundoTipo === "gradiente" ? `linear-gradient(${fundoDir}, ${fundoGrad1}, ${fundoGrad2})` : undefined,
    surface: cardsCor,
    text: letraCor,
    muted: "#71717A",
    primary: corPrimaria,
    sidebar: sidebarCor,
  }), [fundoTipo, fundoCor, fundoGrad1, fundoGrad2, fundoDir, cardsCor, letraCor, corPrimaria, sidebarCor]);

  const handleSelectTheme = (tema: ThemePreset) => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      temaCardapio: tema.id,
      corPrimaria: tema.preview.primary,
      temaPersonalizado: false,
    };
    setSistemaConfig(next);
    setTimeout(() => {
      onSave(next);
      toast.success(`Tema "${tema.name}" aplicado!`);
    }, 50);
  };

  const handleToggleCustom = (checked: boolean) => {
    const next: SistemaConfig = { ...sistemaConfig, temaPersonalizado: checked };
    setSistemaConfig(next);
    if (!checked) {
      setTimeout(() => { onSave(); }, 50);
    }
  };

  const handleCustomSave = () => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      temaPersonalizado: true,
      fundoTipo,
      fundoCor,
      fundoGradiente: fundoTipo === "gradiente" ? { cor1: fundoGrad1, cor2: fundoGrad2, direcao: fundoDir } : undefined,
      letraTipo,
      letraCor,
      letraGradiente: letraTipo === "gradiente" ? { cor1: letraGrad1, cor2: letraGrad2, direcao: letraDir } : undefined,
      corPrimaria,
      sidebarCor,
      cardsCor,
    };
    setSistemaConfig(next);
    setTimeout(() => {
      onSave();
      toast.success("Tema personalizado salvo!");
    }, 50);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ═══ SEÇÃO 1: Temas Prontos ═══ */}
      <div className="space-y-3">
        <p className="text-base font-bold text-foreground">Escolha o tema do cardápio</p>
        <p className="text-sm text-muted-foreground">O tema será aplicado no cardápio digital, totem e delivery.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {THEME_PRESETS.map((tema) => {
            const isSelected = selectedTheme === tema.id && !isCustom;
            return (
              <button
                key={tema.id}
                type="button"
                onClick={() => handleSelectTheme(tema)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {/* Mini tablet preview */}
                <MiniTabletPreview
                  bg={tema.preview.bg}
                  surface={tema.preview.surface}
                  text={tema.preview.text}
                  muted={tema.preview.muted}
                  primary={tema.preview.primary}
                  sidebar={tema.preview.sidebar}
                  size="sm"
                />

                {/* Label */}
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

      {/* ═══ SEÇÃO 2: Personalização Avançada ═══ */}
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
            {/* Live preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-bold text-foreground">Preview ao vivo</p>
              </div>
              <div className="flex justify-center py-2">
                <MiniTabletPreview {...customPreview} size="lg" />
              </div>
            </div>

            {/* a) Cor de fundo */}
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
                    <SelectContent>
                      {GRADIENT_DIRECTIONS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* b) Cor das letras */}
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
                    <SelectContent>
                      {GRADIENT_DIRECTIONS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* c) Cor primária */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor primária (botões, preços, destaques)</Label>
              <ColorPickerRow label="Primária" value={corPrimaria} onChange={setCorPrimaria} />
            </div>

            {/* d) Cor da sidebar */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor da sidebar</Label>
              <ColorPickerRow label="Sidebar" value={sidebarCor} onChange={setSidebarCor} />
            </div>

            {/* e) Cor dos cards */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">Cor dos cards</Label>
              <ColorPickerRow label="Cards" value={cardsCor} onChange={setCardsCor} />
            </div>

            {/* Save */}
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
