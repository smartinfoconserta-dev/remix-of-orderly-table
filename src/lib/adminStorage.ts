import type { Produto } from "@/data/menuData";

const CARDAPIO_KEY = "orderly-cardapio-v1";
const MESAS_CONFIG_KEY = "orderly-mesas-config-v1";
const SISTEMA_CONFIG_KEY = "orderly-config-v1";

export interface ProdutoOverride extends Produto {
  ativo: boolean;
}

export interface MesasConfig {
  totalMesas: number;
}

export interface SistemaConfig {
  nomeRestaurante: string;
  logoUrl: string;
}

// --- Cardápio ---
export function getCardapioOverrides(): Record<string, ProdutoOverride> {
  try {
    const raw = localStorage.getItem(CARDAPIO_KEY);
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
    return raw ? JSON.parse(raw) : { nomeRestaurante: "Obsidian", logoUrl: "" };
  } catch {
    return { nomeRestaurante: "Obsidian", logoUrl: "" };
  }
}

export function saveSistemaConfig(config: SistemaConfig) {
  localStorage.setItem(SISTEMA_CONFIG_KEY, JSON.stringify(config));
}
