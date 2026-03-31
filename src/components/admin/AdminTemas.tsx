import { useState } from "react";
import { Check, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SistemaConfig } from "@/lib/adminStorage";
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
  preview: { bg: string; surface: string; primary: string; text: string; muted: string };
  vars: Record<string, string>;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Escuro elegante com detalhes em laranja",
    preview: { bg: "#0A0A0A", surface: "#161616", primary: "#F97316", text: "#FAFAFA", muted: "#71717A" },
    vars: { "--theme-bg": "#0A0A0A", "--theme-surface": "#161616", "--theme-text": "#FAFAFA", "--theme-muted": "#71717A", "--theme-primary": "#F97316", "--theme-border": "#27272A", "--theme-sidebar-bg": "#0F0F0F", "--theme-sidebar-active": "#F97316" },
  },
  {
    id: "clean",
    name: "Clean",
    description: "Fundo claro, limpo e moderno",
    preview: { bg: "#FFFFFF", surface: "#F4F4F5", primary: "#2563EB", text: "#18181B", muted: "#71717A" },
    vars: { "--theme-bg": "#FFFFFF", "--theme-surface": "#F4F4F5", "--theme-text": "#18181B", "--theme-muted": "#71717A", "--theme-primary": "#2563EB", "--theme-border": "#E4E4E7", "--theme-sidebar-bg": "#FAFAFA", "--theme-sidebar-active": "#2563EB" },
  },
  {
    id: "rustico",
    name: "Rústico",
    description: "Tons quentes, acolhedor e natural",
    preview: { bg: "#1C1917", surface: "#292524", primary: "#D97706", text: "#FAFAF9", muted: "#A8A29E" },
    vars: { "--theme-bg": "#1C1917", "--theme-surface": "#292524", "--theme-text": "#FAFAF9", "--theme-muted": "#A8A29E", "--theme-primary": "#D97706", "--theme-border": "#44403C", "--theme-sidebar-bg": "#1C1917", "--theme-sidebar-active": "#D97706" },
  },
  {
    id: "premium",
    name: "Premium",
    description: "Escuro sofisticado com dourado",
    preview: { bg: "#09090B", surface: "#18181B", primary: "#EAB308", text: "#FAFAFA", muted: "#A1A1AA" },
    vars: { "--theme-bg": "#09090B", "--theme-surface": "#18181B", "--theme-text": "#FAFAFA", "--theme-muted": "#A1A1AA", "--theme-primary": "#EAB308", "--theme-border": "#27272A", "--theme-sidebar-bg": "#09090B", "--theme-sidebar-active": "#EAB308" },
  },
  {
    id: "fresh",
    name: "Fresh",
    description: "Claro e vibrante, ideal para fast food",
    preview: { bg: "#FFFFFF", surface: "#F0FDF4", primary: "#16A34A", text: "#14532D", muted: "#6B7280" },
    vars: { "--theme-bg": "#FFFFFF", "--theme-surface": "#F0FDF4", "--theme-text": "#14532D", "--theme-muted": "#6B7280", "--theme-primary": "#16A34A", "--theme-border": "#DCFCE7", "--theme-sidebar-bg": "#F0FDF4", "--theme-sidebar-active": "#16A34A" },
  },
  {
    id: "crimson",
    name: "Vermelho Intenso",
    description: "Ousado e marcante, ideal para hamburguerias",
    preview: { bg: "#0C0A09", surface: "#1C1917", primary: "#DC2626", text: "#FAFAF9", muted: "#A8A29E" },
    vars: { "--theme-bg": "#0C0A09", "--theme-surface": "#1C1917", "--theme-text": "#FAFAF9", "--theme-muted": "#A8A29E", "--theme-primary": "#DC2626", "--theme-border": "#44403C", "--theme-sidebar-bg": "#0C0A09", "--theme-sidebar-active": "#DC2626" },
  },
];

const AdminTemas = ({ sistemaConfig, setSistemaConfig, storeId, onSave }: AdminTemasProps) => {
  const selectedTheme = sistemaConfig.temaCardapio || "obsidian";
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [customColor, setCustomColor] = useState(sistemaConfig.corPrimaria || "#F97316");

  const handleSelectTheme = (tema: ThemePreset) => {
    const next: SistemaConfig = {
      ...sistemaConfig,
      temaCardapio: tema.id,
      corPrimaria: tema.vars["--theme-primary"],
    };
    setSistemaConfig(next);
    // Persist immediately then notify
    setTimeout(() => {
      onSave();
      toast.success(`Tema "${tema.name}" aplicado!`);
    }, 50);
  };

  const handleCustomColorSave = () => {
    const next: SistemaConfig = { ...sistemaConfig, corPrimaria: customColor };
    setSistemaConfig(next);
    onSave();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Temas grid */}
      <div className="space-y-3">
        <p className="text-base font-bold text-foreground">Escolha o tema do cardápio</p>
        <p className="text-sm text-muted-foreground">O tema será aplicado no cardápio digital, totem e delivery.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {THEME_PRESETS.map((tema) => {
            const isSelected = selectedTheme === tema.id;
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
                {/* Mini preview */}
                <div
                  className="rounded-lg overflow-hidden h-24 flex"
                  style={{ backgroundColor: tema.preview.bg }}
                >
                  {/* Mini sidebar */}
                  <div
                    className="w-8 shrink-0 flex flex-col items-center gap-1.5 pt-3"
                    style={{ backgroundColor: tema.vars["--theme-sidebar-bg"] }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tema.preview.primary }} />
                    <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: tema.preview.muted, opacity: 0.4 }} />
                    <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: tema.preview.muted, opacity: 0.4 }} />
                    <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: tema.preview.muted, opacity: 0.4 }} />
                  </div>
                  {/* Mini content */}
                  <div className="flex-1 p-2 space-y-1.5">
                    <div className="h-2 w-12 rounded-full" style={{ backgroundColor: tema.preview.text, opacity: 0.8 }} />
                    <div className="flex gap-1.5">
                      <div className="h-8 w-10 rounded" style={{ backgroundColor: tema.preview.surface }} />
                      <div className="h-8 w-10 rounded" style={{ backgroundColor: tema.preview.surface }} />
                    </div>
                    <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: tema.preview.primary }} />
                  </div>
                </div>

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

      {/* Cor personalizada */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-bold text-foreground">Cor personalizada</p>
              <p className="text-sm text-muted-foreground">Sobrescreve a cor primária do tema selecionado</p>
            </div>
          </div>
          <Switch checked={useCustomColor} onCheckedChange={setUseCustomColor} />
        </div>

        {useCustomColor && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <span className="text-sm text-muted-foreground font-mono">{customColor}</span>
            </div>
            <Button onClick={handleCustomColorSave} className="rounded-xl font-bold gap-2">
              <Save className="h-4 w-4" /> Salvar cor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTemas;
