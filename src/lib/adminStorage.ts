import { type Produto, produtos as baseProdutos } from "@/data/menuData";
import { fetchConfig, saveConfig, fetchLicenca, saveLicenca, fetchCategorias, saveCategorias, syncPending } from "./configService";

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

export interface HorarioFuncionamento {
  ativo: boolean;
  abertura: string; // "HH:MM"
  fechamento: string; // "HH:MM"
}

export interface HorariosSemana {
  dom: HorarioFuncionamento;
  seg: HorarioFuncionamento;
  ter: HorarioFuncionamento;
  qua: HorarioFuncionamento;
  qui: HorarioFuncionamento;
  sex: HorarioFuncionamento;
  sab: HorarioFuncionamento;
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
  horarioFuncionamento?: HorariosSemana;
  mensagemFechado?: string;
  logoEstilo?: "quadrada" | "circular";
  impressaoPorSetor?: boolean;
  nomeImpressoraCozinha?: string;
  nomeImpressoraBar?: string;
  modulos?: {
    totem?: boolean;
    tvRetirada?: boolean;
    cozinha?: boolean;
    delivery?: boolean;
    motoboy?: boolean;
  };
  plano?: "basico" | "medio" | "pro" | "premium";
  modoTV?: "padrao" | "completo";
}

export interface LicencaConfig {
  nomeCliente: string;
  dataVencimento: string; // YYYY-MM-DD
  ativo: boolean;
  plano?: "basico" | "medio" | "pro" | "premium";
}

export type PlanoModulos = "basico" | "medio" | "pro" | "premium";

export function getModulosDoPlano(plano: PlanoModulos): { cozinha: boolean; delivery: boolean; motoboy: boolean; totem: boolean; tvRetirada: boolean } {
  return {
    cozinha: true,
    delivery: plano === "medio" || plano === "pro" || plano === "premium",
    motoboy: plano === "pro" || plano === "premium",
    totem: plano === "premium",
    tvRetirada: plano === "premium",
  };
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

// --- Horários de Funcionamento ---
const HORARIOS_KEY = "orderly-horarios-v1";

const defaultHorario: HorarioFuncionamento = { ativo: true, abertura: "18:00", fechamento: "23:00" };

export const defaultHorariosSemana: HorariosSemana = {
  dom: { ...defaultHorario, ativo: false },
  seg: { ...defaultHorario },
  ter: { ...defaultHorario },
  qua: { ...defaultHorario },
  qui: { ...defaultHorario },
  sex: { ...defaultHorario },
  sab: { ...defaultHorario },
};

export function getHorariosFuncionamento(): HorariosSemana {
  try {
    const raw = localStorage.getItem(HORARIOS_KEY);
    return raw ? { ...defaultHorariosSemana, ...JSON.parse(raw) } : { ...defaultHorariosSemana };
  } catch { return { ...defaultHorariosSemana }; }
}

export function saveHorariosFuncionamento(h: HorariosSemana) {
  localStorage.setItem(HORARIOS_KEY, JSON.stringify(h));
}

export function isDeliveryAberto(): { aberto: boolean; mensagem: string; proximoHorario: string; horasRestantes?: number } {
  const horarios = getHorariosFuncionamento();
  const agora = new Date();
  const diasSemana: (keyof HorariosSemana)[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const diaAtual = diasSemana[agora.getDay()];
  const horarioDia = horarios[diaAtual];

  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const calcularHorasAte = (targetHora: string, diasAdiante: number = 0): number => {
    const [h, m] = targetHora.split(":").map(Number);
    const target = new Date(agora);
    target.setDate(target.getDate() + diasAdiante);
    target.setHours(h, m, 0, 0);
    return Math.max(0, Math.round((target.getTime() - agora.getTime()) / 3600000));
  };

  const buscarProximoDia = (): { texto: string; horas: number } => {
    for (let i = 1; i <= 7; i++) {
      const proximoDia = diasSemana[(agora.getDay() + i) % 7];
      const h = horarios[proximoDia];
      if (h.ativo) {
        const horas = calcularHorasAte(h.abertura, i);
        const nomeDia = nomes[(agora.getDay() + i) % 7];
        return {
          texto: `Abrimos ${nomeDia} às ${h.abertura}`,
          horas,
        };
      }
    }
    return { texto: "", horas: 0 };
  };

  if (!horarioDia.ativo) {
    const proximo = buscarProximoDia();
    return {
      aberto: false,
      mensagem: "Fechados hoje",
      proximoHorario: proximo.texto,
      horasRestantes: proximo.horas,
    };
  }

  const [hAb, mAb] = horarioDia.abertura.split(":").map(Number);
  const [hFe, mFe] = horarioDia.fechamento.split(":").map(Number);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosAbertura = hAb * 60 + mAb;
  const minutesFechamento = hFe * 60 + mFe;

  if (minutosAgora < minutosAbertura) {
    const horas = calcularHorasAte(horarioDia.abertura);
    return {
      aberto: false,
      mensagem: "Ainda não abrimos",
      proximoHorario: `Abrimos às ${horarioDia.abertura}`,
      horasRestantes: horas,
    };
  }

  if (minutosAgora >= minutesFechamento) {
    const proximo = buscarProximoDia();
    return {
      aberto: false,
      mensagem: "Já encerramos por hoje",
      proximoHorario: proximo.texto,
      horasRestantes: proximo.horas,
    };
  }

  return { aberto: true, mensagem: `Aberto até ${horarioDia.fechamento}`, proximoHorario: "", horasRestantes: 0 };
}