function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface ThemeVars {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  border: string;
  sidebarBg: string;
}

export const THEME_MAP: Record<string, ThemeVars> = {
  obsidian: {
    bg: "#0A0A0A", surface: "#161616", text: "#FAFAFA", muted: "#71717A",
    primary: "#F97316", border: "#27272A", sidebarBg: "#0F0F0F",
  },
  italiano: {
    bg: "#F5F2EC", surface: "#FFFFFF", text: "#2B2B2B", muted: "#6B6B6B",
    primary: "#5E8C61", border: "#E0D9CE", sidebarBg: "#EDE7DD",
  },
  sorveteria: {
    bg: "#EAF4FF", surface: "#FFFFFF", text: "#1E2A38", muted: "#6C7A89",
    primary: "#6BB6FF", border: "#D6E4F5", sidebarBg: "#DCEBFF",
  },
  darkroxo: {
    bg: "#0F0F14", surface: "#1A1A22", text: "#FFFFFF", muted: "#A1A1AA",
    primary: "#8B5CF6", border: "#2A2A35", sidebarBg: "#14141B",
  },
  hamburgueria: {
    bg: "#0B0B0D", surface: "#151518", text: "#FFFFFF", muted: "#A1A1AA",
    primary: "#FF7A00", border: "#26262E", sidebarBg: "#101014",
  },
  teal: {
    bg: "#0A0F10", surface: "#121A1C", text: "#FFFFFF", muted: "#94A3B8",
    primary: "#14B8A6", border: "#1F2A2E", sidebarBg: "#0E1416",
  },
};

export function applyThemeToElement(element: HTMLElement, themeId: string, customPrimary?: string): void {
  const theme = THEME_MAP[themeId];
  if (!theme) return;
  // Clear any inline background from gradient mode
  element.style.background = "";
  element.style.minHeight = "";

  const primary = customPrimary || theme.primary;

  // Detect if primary is light for foreground contrast
  const pR = parseInt(primary.replace("#", "").substring(0, 2), 16);
  const pG = parseInt(primary.replace("#", "").substring(2, 4), 16);
  const pB = parseInt(primary.replace("#", "").substring(4, 6), 16);
  const primaryLum = (0.299 * pR + 0.587 * pG + 0.114 * pB) / 255;
  const primaryFg = primaryLum > 0.5 ? "0 0% 10%" : "0 0% 100%";

  element.style.setProperty("--background", hexToHSL(theme.bg));
  element.style.setProperty("--foreground", hexToHSL(theme.text));
  element.style.setProperty("--card", hexToHSL(theme.surface));
  element.style.setProperty("--card-foreground", hexToHSL(theme.text));
  element.style.setProperty("--popover", hexToHSL(theme.surface));
  element.style.setProperty("--popover-foreground", hexToHSL(theme.text));
  element.style.setProperty("--primary", hexToHSL(primary));
  element.style.setProperty("--primary-foreground", primaryFg);
  element.style.setProperty("--secondary", hexToHSL(theme.surface));
  element.style.setProperty("--secondary-foreground", hexToHSL(theme.text));
  element.style.setProperty("--muted", hexToHSL(theme.surface));
  element.style.setProperty("--muted-foreground", hexToHSL(theme.muted));
  element.style.setProperty("--accent", hexToHSL(theme.surface));
  element.style.setProperty("--accent-foreground", hexToHSL(theme.text));
  element.style.setProperty("--border", hexToHSL(theme.border));
  element.style.setProperty("--input", hexToHSL(theme.border));
  element.style.setProperty("--ring", hexToHSL(primary));
  element.style.setProperty("--surface", hexToHSL(theme.surface));
  element.style.setProperty("--sidebar-background", hexToHSL(theme.sidebarBg));
  element.style.setProperty("--sidebar-foreground", hexToHSL(theme.text));
  element.style.setProperty("--sidebar-primary", hexToHSL(primary));
  element.style.setProperty("--sidebar-border", hexToHSL(theme.border));
}

export function applyCustomThemeToElement(element: HTMLElement, config: {
  fundoTipo?: "solido" | "gradiente";
  fundoCor?: string;
  fundoGradiente?: { cor1: string; cor2: string; direcao: string };
  letraTipo?: "solido" | "gradiente";
  letraCor?: string;
  letraGradiente?: { cor1: string; cor2: string; direcao: string };
  corPrimaria?: string;
  sidebarCor?: string;
  cardsCor?: string;
}): void {
  // Background
  if (config.fundoTipo === "gradiente" && config.fundoGradiente) {
    element.style.setProperty("--background", "0 0% 0% / 0");
    element.style.background = `linear-gradient(${config.fundoGradiente.direcao}, ${config.fundoGradiente.cor1}, ${config.fundoGradiente.cor2})`;
    element.style.minHeight = "100dvh";
  } else if (config.fundoCor) {
    element.style.setProperty("--background", hexToHSL(config.fundoCor));
    element.style.background = "";
  }

  // Text
  if (config.letraCor) {
    element.style.setProperty("--foreground", hexToHSL(config.letraCor));
    element.style.setProperty("--card-foreground", hexToHSL(config.letraCor));
    element.style.setProperty("--popover-foreground", hexToHSL(config.letraCor));
    element.style.setProperty("--secondary-foreground", hexToHSL(config.letraCor));
    element.style.setProperty("--accent-foreground", hexToHSL(config.letraCor));
    element.style.setProperty("--sidebar-foreground", hexToHSL(config.letraCor));
  }

  // Primary
  if (config.corPrimaria) {
    const pR = parseInt(config.corPrimaria.replace("#", "").substring(0, 2), 16);
    const pG = parseInt(config.corPrimaria.replace("#", "").substring(2, 4), 16);
    const pB = parseInt(config.corPrimaria.replace("#", "").substring(4, 6), 16);
    const primaryLum = (0.299 * pR + 0.587 * pG + 0.114 * pB) / 255;
    const primaryFg = primaryLum > 0.5 ? "0 0% 10%" : "0 0% 100%";
    element.style.setProperty("--primary", hexToHSL(config.corPrimaria));
    element.style.setProperty("--primary-foreground", primaryFg);
    element.style.setProperty("--ring", hexToHSL(config.corPrimaria));
    element.style.setProperty("--sidebar-primary", hexToHSL(config.corPrimaria));
  }

  // Sidebar
  if (config.sidebarCor) {
    element.style.setProperty("--sidebar-background", hexToHSL(config.sidebarCor));
  }

  // Cards
  if (config.cardsCor) {
    element.style.setProperty("--card", hexToHSL(config.cardsCor));
    element.style.setProperty("--surface", hexToHSL(config.cardsCor));
    element.style.setProperty("--secondary", hexToHSL(config.cardsCor));
    element.style.setProperty("--muted", hexToHSL(config.cardsCor));
    element.style.setProperty("--accent", hexToHSL(config.cardsCor));
    element.style.setProperty("--popover", hexToHSL(config.cardsCor));
  }
}

export function clearThemeFromElement(element: HTMLElement): void {
  const vars = [
    "--background", "--foreground", "--card", "--card-foreground",
    "--popover", "--popover-foreground", "--primary", "--primary-foreground",
    "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
    "--accent", "--accent-foreground", "--border", "--input", "--ring",
    "--surface", "--sidebar-background", "--sidebar-foreground",
    "--sidebar-primary", "--sidebar-border",
  ];
  vars.forEach(v => element.style.removeProperty(v));
  element.style.background = "";
  element.style.minHeight = "";
}
