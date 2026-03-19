import type { Produto } from "@/data/menuData";

const CARDAPIO_KEY = "orderly-cardapio-overrides-v1";
const MESAS_CONFIG_KEY = "orderly-mesas-config-v1";
const SISTEMA_CONFIG_KEY = "orderly-config-v1";
const LICENCA_KEY = "orderly-licenca-v1";

export interface ProdutoOverride extends Produto {
  ativo: boolean;
}

export interface MesasConfig {
  totalMesas: number;
}

export interface SistemaConfig {
  nomeRestaurante: string;
  logoUrl: string;
  corPrimaria: string;
}

export interface LicencaConfig {
  nomeCliente: string;
  dataVencimento: string; // YYYY-MM-DD
  ativo: boolean;
}

// --- Cardápio ---
export function getCardapioOverrides(): Record<string, ProdutoOverride> {
  try {
    // Try new key first, fall back to old key for migration
    const raw = localStorage.getItem(CARDAPIO_KEY) || localStorage.getItem("orderly-cardapio-v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCardapioOverrides(overrides: Record<string, ProdutoOverride>) {
  localStorage.setItem(CARDAPIO_KEY, JSON.stringify(overrides));
}

// --- Mesas ---
export function getMesasConfig(): MesasConfig {
  try {
    const raw = localStorage.getItem(MESAS_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { totalMesas: 20 };
  } catch {
    return { totalMesas: 20 };
  }
}

export function saveMesasConfig(config: MesasConfig) {
  localStorage.setItem(MESAS_CONFIG_KEY, JSON.stringify(config));
}

// --- Sistema ---
export function getSistemaConfig(): SistemaConfig {
  try {
    const raw = localStorage.getItem(SISTEMA_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { nomeRestaurante: "Obsidian", logoUrl: "", corPrimaria: "" };
  } catch {
    return { nomeRestaurante: "Obsidian", logoUrl: "", corPrimaria: "" };
  }
}

export function saveSistemaConfig(config: SistemaConfig) {
  localStorage.setItem(SISTEMA_CONFIG_KEY, JSON.stringify(config));
}

// --- Licença ---
export function getLicencaConfig(): LicencaConfig {
  try {
    const raw = localStorage.getItem(LICENCA_KEY);
    return raw ? JSON.parse(raw) : { nomeCliente: "", dataVencimento: "", ativo: true };
  } catch {
    return { nomeCliente: "", dataVencimento: "", ativo: true };
  }
}

export function saveLicencaConfig(config: LicencaConfig) {
  localStorage.setItem(LICENCA_KEY, JSON.stringify(config));
}

/** Returns days until license expiry. Negative = expired. null = no date set. */
export function getLicencaDaysLeft(): number | null {
  const lic = getLicencaConfig();
  if (!lic.dataVencimento) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(lic.dataVencimento + "T00:00:00");
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

/** Check if the system is blocked (expired or manually deactivated) */
export function isSystemBlocked(): boolean {
  const lic = getLicencaConfig();
  if (!lic.ativo) return true;
  const days = getLicencaDaysLeft();
  if (days !== null && days < 0) return true;
  return false;
}

/** Apply custom primary color from config to :root CSS variable */
export function applyCustomPrimaryColor() {
  const cfg = getSistemaConfig();
  if (!cfg.corPrimaria) return;
  // Convert hex to HSL for the CSS variable
  const hex = cfg.corPrimaria;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  document.documentElement.style.setProperty("--primary", `${hDeg} ${sPct}% ${lPct}%`);
  // Also set foreground for contrast
  const fgL = lPct > 55 ? 10 : 98;
  document.documentElement.style.setProperty("--primary-foreground", `${hDeg} ${Math.round(sPct * 0.3)}% ${fgL}%`);
}
