import {
  fetchConfig,
  saveConfig,
  fetchLicenca,
  saveLicenca,
  fetchCategorias,
  saveCategorias,
  syncPending,
} from "./configService";
import { supabase } from "@/integrations/supabase/client";

export interface CategoriaCustom {
  id: string;
  nome: string;
  icone: string;
  ordem: number;
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
  abertura: string;
  fechamento: string;
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
    mesas?: boolean;
    balcao?: boolean;
    totem?: boolean;
    tvRetirada?: boolean;
    cozinha?: boolean;
    delivery?: boolean;
    motoboy?: boolean;
    garcomPdv?: boolean;
  };
  tipoRestaurante?: "restaurante" | "fastfood" | "completo";
  deliverySeparado?: boolean;
  plano?: "restaurante" | "fastfood" | "completo";
  /** @deprecated Use modulos.mesas / modulos.balcao instead */
  modoOperacao?: "restaurante" | "fast_food";
  identificacaoFastFood?: "codigo" | "nome_cliente";
  impressoras?: ImpressoraConfig[];
  cpfNotaAtivo?: boolean;
  cardapioHeaderEstilo?: "padrao" | "banner";
  cardapioBannerBase64?: string;
}

export interface ImpressoraConfig {
  id: string;
  nome: string;
  setor: "caixa" | "cozinha" | "bar" | "delivery";
  tipo: "rede" | "usb" | "bluetooth";
  ip: string;
  largura: "58mm" | "80mm";
  ativa: boolean;
}

export interface LicencaConfig {
  nomeCliente: string;
  dataVencimento: string;
  ativo: boolean;
  plano?: "restaurante" | "fastfood" | "completo";
}

export type PlanoModulos = "restaurante" | "fastfood" | "completo";

export function getModulosDoPlano(plano: PlanoModulos): {
  mesas: boolean;
  balcao: boolean;
  cozinha: boolean;
  delivery: boolean;
  motoboy: boolean;
  totem: boolean;
  tvRetirada: boolean;
  garcomPdv: boolean;
} {
  switch (plano) {
    case "restaurante":
      return {
        mesas: true,
        balcao: true,
        cozinha: true,
        delivery: false,
        motoboy: false,
        totem: false,
        tvRetirada: false,
        garcomPdv: false,
      };
    case "fastfood":
      return {
        mesas: false,
        balcao: true,
        cozinha: true,
        delivery: false,
        motoboy: false,
        totem: true,
        tvRetirada: true,
        garcomPdv: true,
      };
    case "completo":
      return {
        mesas: true,
        balcao: true,
        cozinha: true,
        delivery: false,
        motoboy: false,
        totem: true,
        tvRetirada: true,
        garcomPdv: true,
      };
  }
}

// ─────────────────────────────────
// CACHE EM MEMÓRIA (não localStorage)
// ─────────────────────────────────

let _configCache: SistemaConfig | null = null;
let _licencaCache: LicencaConfig | null = null;


const defaultSistemaConfig: SistemaConfig = {
  nomeRestaurante: "Obsidian",
  logoUrl: "",
  corPrimaria: "",
  banners: [],
  instagramUrl: "",
  senhaWifi: "",
  
  couvertAtivo: false,
  couvertValor: 0,
  couvertObrigatorio: false,
};

// ─────────────────────────────────
// CONFIG DO SISTEMA
// ─────────────────────────────────

/** Leitura rápida do cache. Use getSistemaConfigAsync para dado do banco. */
export function getSistemaConfig(): SistemaConfig {
  return _configCache ?? { ...defaultSistemaConfig };
}

/** Atualiza o cache em memória (usado pelo configService após fetch) */
export function setConfigCache(config: SistemaConfig) {
  _configCache = config;
}

/** Atualiza o cache de licença em memória */
export function setLicencaCache(lic: LicencaConfig) {
  _licencaCache = lic;
}

export async function saveSistemaConfig(config: SistemaConfig, storeId?: string | null): Promise<void> {
  _configCache = config;
  await saveConfig(config, storeId);
}

// ─────────────────────────────────
// LICENÇA
// ─────────────────────────────────

export function getLicencaConfig(): LicencaConfig {
  return _licencaCache ?? { nomeCliente: "", dataVencimento: "", ativo: true };
}

export async function saveLicencaConfig(config: LicencaConfig, storeId?: string | null): Promise<void> {
  _licencaCache = config;
  await saveLicenca(config, storeId);
}

export function getLicencaDaysLeft(): number | null {
  const lic = getLicencaConfig();
  if (!lic.dataVencimento) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(lic.dataVencimento + "T00:00:00");
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

export type LicenseLevel = "ok" | "warning" | "expired" | "partial_block" | "reports_only" | "full_block";

export function getLicenseLevel(): LicenseLevel {
  const lic = getLicencaConfig();
  if (!lic.ativo) return "full_block";
  const days = getLicencaDaysLeft();
  if (days === null) return "ok";
  if (days > 5) return "ok";
  if (days > 0) return "warning";
  if (days > -7) return "expired";
  if (days > -30) return "partial_block";
  if (days > -45) return "reports_only";
  return "full_block";
}

export function isSystemBlocked(): boolean {
  const level = getLicenseLevel();
  return level === "full_block";
}

export function isOperationBlocked(): boolean {
  const level = getLicenseLevel();
  return ["partial_block", "reports_only", "full_block"].includes(level);
}

// ─────────────────────────────────
// MESAS CONFIG
// ─────────────────────────────────

export function getMesasConfig(): MesasConfig {
  return { totalMesas: 20 }; // fallback sync
}

export async function getMesasConfigAsync(storeId?: string | null): Promise<MesasConfig> {
  try {
    let query = supabase.from("mesas").select("id", { count: "exact", head: true });
    if (storeId) query = query.eq("store_id", storeId);
    const { count } = await query;
    if (count !== null && count > 0) return { totalMesas: count };
  } catch (err) { console.error("[adminStorage] erro:", err); }
  return { totalMesas: 20 };
}

export async function saveMesasConfig(config: MesasConfig, storeId?: string | null): Promise<void> {
  try {
    let existingQuery = supabase.from("restaurant_config").select("id").limit(1);
    if (storeId) existingQuery = existingQuery.eq("store_id", storeId);
    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      await supabase
        .from("restaurant_config")
        .update({ total_mesas: config.totalMesas })
        .eq("id", existing.id);
    }
  } catch (err) {
    console.error("Erro ao salvar config de mesas:", err);
  }
}

// ─────────────────────────────────
// COR PRIMÁRIA
// ─────────────────────────────────

export function applyCustomPrimaryColor() {
  const cfg = getSistemaConfig();
  if (!cfg.corPrimaria) return;
  const hex = cfg.corPrimaria;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
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
  document.documentElement.style.setProperty(
    "--primary-foreground",
    `${hDeg} ${Math.round(sPct * 0.3)}% ${fgL}%`
  );
}

// ─────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────

export function getCategoriasCustom(): CategoriaCustom[] {
  return [];
}

export async function saveCategoriasCustom(
  cats: CategoriaCustom[],
  storeId?: string | null
): Promise<void> {
  await saveCategorias(cats, storeId);
}

// ─────────────────────────────────
// HORÁRIOS DE FUNCIONAMENTO
// ─────────────────────────────────

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
  const cfg = getSistemaConfig();
  return cfg.horarioFuncionamento ?? { ...defaultHorariosSemana };
}

export async function saveHorariosFuncionamento(
  h: HorariosSemana,
  storeId?: string | null
): Promise<void> {
  const config = getSistemaConfig();
  await saveSistemaConfig({ ...config, horarioFuncionamento: h }, storeId);
}

export function isDeliveryAberto(): {
  aberto: boolean;
  mensagem: string;
  proximoHorario: string;
  horasRestantes?: number;
} {
  const horarios = getHorariosFuncionamento();
  const agora = new Date();
  const diasSemana: (keyof HorariosSemana)[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const diaAtual = diasSemana[agora.getDay()];
  const horarioDia = horarios[diaAtual];
  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const calcularHorasAte = (targetHora: string, diasAdiante = 0): number => {
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
        return { texto: `Abrimos ${nomeDia} às ${h.abertura}`, horas };
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

  return {
    aberto: true,
    mensagem: `Aberto até ${horarioDia.fechamento}`,
    proximoHorario: "",
    horasRestantes: 0,
  };
}

// ─────────────────────────────────
// EXPORTS ASSÍNCRONOS (Supabase)
// ─────────────────────────────────

export const getSistemaConfigAsync = fetchConfig;
export const saveSistemaConfigAsync = saveConfig;
export const getLicencaConfigAsync = fetchLicenca;
export const saveLicencaConfigAsync = saveLicenca;
export const getCategoriasCustomAsync = fetchCategorias;
export const saveCategoriasCustomAsync = saveCategorias;
export const syncPendingChanges = syncPending;