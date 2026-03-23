import { type Produto, produtos as baseProdutos } from "@/data/menuData";

const CARDAPIO_KEY = "orderly-cardapio-overrides-v1";
const MESAS_CONFIG_KEY = "orderly-mesas-config-v1";
const SISTEMA_CONFIG_KEY = "orderly-config-v1";
const LICENCA_KEY = "orderly-licenca-v1";
const CATEGORIAS_KEY = "orderly-categorias-v1";

export interface CategoriaCustom {
  id: string;
  nome: string;
  icone: string;
  ordem: number;
}

export interface ProdutoOverride extends Produto {
  ativo: boolean;
  removido?: boolean;
  imagemBase64?: string;
  disponivelDelivery?: boolean;
}

export interface MesasConfig {
  totalMesas: number;
}

export interface BannerConfig {
  id: string;
  titulo: string;
  subtitulo: string;
  preco: string;
  imagemUrl: string;
  imagemBase64?: string;
}

export interface SistemaConfig {
  nomeRestaurante: string;
  logoUrl: string;
  logoBase64?: string;
  corPrimaria: string;
  banners?: BannerConfig[];
  instagramUrl?: string;
  senhaWifi?: string;
  instagramBg?: string;
  wifiBg?: string;
  taxaEntrega?: number;
  telefoneRestaurante?: string;
  tempoEntrega?: string;
  mensagemBoasVindas?: string;
  deliveryAtivo?: boolean;
  modoIdentificacaoDelivery?: "visitante" | "cadastro";
  cozinhaAtiva?: boolean;
  couvertAtivo?: boolean;
  couvertValor?: number;
  couvertObrigatorio?: boolean;
}

export interface LicencaConfig {
  nomeCliente: string;
  dataVencimento: string; // YYYY-MM-DD
  ativo: boolean;
}

// --- Cardápio ---
export function getCardapioOverrides(): Record<string, ProdutoOverride> {
  try {
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
const defaultSistemaConfig: SistemaConfig = {
  nomeRestaurante: "Obsidian",
  logoUrl: "",
  corPrimaria: "",
  banners: [],
  instagramUrl: "",
  senhaWifi: "",
  cozinhaAtiva: false,
  couvertAtivo: false,
  couvertValor: 0,
  couvertObrigatorio: false,
};

export function getSistemaConfig(): SistemaConfig {
  try {
    const raw = localStorage.getItem(SISTEMA_CONFIG_KEY);
    if (!raw) return { ...defaultSistemaConfig };
    const parsed = { ...defaultSistemaConfig, ...JSON.parse(raw) };
    if (parsed.deliveryAtivo === undefined) parsed.deliveryAtivo = true;
    return parsed;
  } catch {
    return { ...defaultSistemaConfig };
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
  const fgL = lPct > 55 ? 10 : 98;
  document.documentElement.style.setProperty("--primary-foreground", `${hDeg} ${Math.round(sPct * 0.3)}% ${fgL}%`);
}

// --- Categorias Custom ---
export function getCategoriasCustom(): CategoriaCustom[] {
  try {
    const raw = localStorage.getItem(CATEGORIAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCategoriasCustom(cats: CategoriaCustom[]): void {
  localStorage.setItem(CATEGORIAS_KEY, JSON.stringify(cats));
}

// --- Produtos Delivery ---
export function getProdutosDelivery(): ProdutoOverride[] {
  const overrides = getCardapioOverrides();
  const base = baseProdutos.map((p) => {
    const ov = overrides[p.id];
    if (ov) return { ...p, ...ov };
    return { ...p, ativo: true } as ProdutoOverride;
  });
  const customIds = Object.keys(overrides).filter((id) => !baseProdutos.some((p) => p.id === id));
  const custom = customIds.map((id) => overrides[id]);
  return [...base, ...custom].filter(
    (p) => p.ativo === true && p.removido !== true && p.disponivelDelivery !== false,
  );
}