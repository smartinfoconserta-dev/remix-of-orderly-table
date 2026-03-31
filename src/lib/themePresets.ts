export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  preview: { bg: string; surface: string; primary: string; text: string; muted: string; sidebar: string };
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "obsidian", name: "Obsidian", description: "Escuro elegante com detalhes em laranja", preview: { bg: "#0A0A0A", surface: "#161616", primary: "#F97316", text: "#FAFAFA", muted: "#71717A", sidebar: "#0F0F0F" } },
  { id: "italiano", name: "Italiano", description: "Claro elegante, tons quentes e verde oliva", preview: { bg: "#F5F2EC", surface: "#FFFFFF", primary: "#5E8C61", text: "#2B2B2B", muted: "#6B6B6B", sidebar: "#EDE7DD" } },
  { id: "sorveteria", name: "Sorveteria", description: "Azul claro, leve e refrescante", preview: { bg: "#EAF4FF", surface: "#FFFFFF", primary: "#6BB6FF", text: "#1E2A38", muted: "#6C7A89", sidebar: "#DCEBFF" } },
  { id: "darkroxo", name: "Dark Roxo", description: "Premium escuro com roxo, ideal para drinks", preview: { bg: "#0F0F14", surface: "#1A1A22", primary: "#8B5CF6", text: "#FFFFFF", muted: "#A1A1AA", sidebar: "#14141B" } },
  { id: "hamburgueria", name: "Hamburgueria", description: "Preto com laranja forte, alto contraste", preview: { bg: "#0B0B0D", surface: "#151518", primary: "#FF7A00", text: "#FFFFFF", muted: "#A1A1AA", sidebar: "#101014" } },
  { id: "teal", name: "Teal Moderno", description: "Dark com verde-azulado, visual tech moderno", preview: { bg: "#0A0F10", surface: "#121A1C", primary: "#14B8A6", text: "#FFFFFF", muted: "#94A3B8", sidebar: "#0E1416" } },
  // ── Novos temas por segmento ──
  { id: "acai", name: "Açaí", description: "Claro com roxo vibrante, perfeito para açaiterias", preview: { bg: "#F5F0FF", surface: "#FFFFFF", primary: "#7C3AED", text: "#2D1B4E", muted: "#8B7AA8", sidebar: "#EDE5FF" } },
  { id: "pizzaria", name: "Pizzaria", description: "Claro quente com vermelho, estilo cantina", preview: { bg: "#FFF8F0", surface: "#FFFFFF", primary: "#DC2626", text: "#3D1F00", muted: "#8B7355", sidebar: "#FFF0E0" } },
  { id: "cafeteria", name: "Cafeteria", description: "Tons marrons aconchegantes, clima de café", preview: { bg: "#FAF5F0", surface: "#FFFFFF", primary: "#92400E", text: "#3E2C1E", muted: "#8B7562", sidebar: "#F0E8DD" } },
  { id: "japones", name: "Japonês", description: "Escuro elegante com vermelho, estilo oriental", preview: { bg: "#0C0C0C", surface: "#1A1A1A", primary: "#EF4444", text: "#F5F5F0", muted: "#9CA3AF", sidebar: "#111111" } },
  { id: "bar", name: "Bar/Drinks", description: "Noturno sofisticado com dourado", preview: { bg: "#0A0A12", surface: "#14141F", primary: "#F59E0B", text: "#F5F5FF", muted: "#9CA3B8", sidebar: "#0F0F18" } },
  { id: "padaria", name: "Padaria", description: "Claro acolhedor com laranja, clima artesanal", preview: { bg: "#FFFCF5", surface: "#FFFFFF", primary: "#D97706", text: "#3D3020", muted: "#9B8B70", sidebar: "#FFF8EB" } },
  { id: "churrascaria", name: "Churrascaria", description: "Escuro rústico com vermelho intenso", preview: { bg: "#0D0806", surface: "#1A1210", primary: "#B91C1C", text: "#FFF8F0", muted: "#A89080", sidebar: "#120E0A" } },
  { id: "saudavel", name: "Saudável", description: "Claro fresco com verde, natural e leve", preview: { bg: "#F0FAF0", surface: "#FFFFFF", primary: "#16A34A", text: "#1A3A1A", muted: "#6B8B6B", sidebar: "#E5F5E5" } },
];

export const GRADIENT_DIRECTIONS = [
  { value: "to bottom", label: "Cima → Baixo" },
  { value: "to right", label: "Esquerda → Direita" },
  { value: "to bottom right", label: "Diagonal ↘" },
  { value: "to top right", label: "Diagonal ↗" },
];
