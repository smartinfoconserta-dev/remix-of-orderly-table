export interface Pagamento {
  id: string;
  data: string;
  valor: number;
  metodo: string;
  observacao: string;
}

export interface Cliente {
  id: string;
  nomeRestaurante: string;
  nomeContato: string;
  email: string;
  dataVencimento: string;
  ativo: boolean;
  criadoEm: string;
  avisoAtivo: boolean;
  avisoTexto: string;
  telefone: string;
  cnpj: string;
  cidade: string;
  estado: string;
  endereco: string;
  segmento: string;
  diaVencimento: number;
  valorMensalidade: number;
  observacoes: string;
  historicoPagamentos: Pagamento[];
}

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
}

const STORAGE_KEY = "orderly-master-v1";
const DESPESAS_KEY = "orderly-master-despesas-v1";

// --- Clientes ---

export function getClientes(): Cliente[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed: Cliente = {
      id: "demo-001",
      nomeRestaurante: "Burger House Premium",
      nomeContato: "João Silva",
      email: "joao@burgerhouse.com.br",
      dataVencimento: "2025-12-31",
      ativo: true,
      criadoEm: new Date().toISOString(),
      avisoAtivo: false,
      avisoTexto: "",
      telefone: "(11) 99876-5432",
      cnpj: "12.345.678/0001-99",
      cidade: "São Paulo",
      estado: "SP",
      endereco: "Rua Augusta, 1200",
      segmento: "hamburgeria",
      diaVencimento: 10,
      valorMensalidade: 299.90,
      observacoes: "Cliente desde 2024. Plano premium com suporte prioritário.",
      historicoPagamentos: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    return [seed];
  }
  return JSON.parse(raw);
}

export function saveClientes(clientes: Cliente[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
}

export function addCliente(dados: Omit<Cliente, "id" | "criadoEm">): Cliente {
  const clientes = getClientes();
  const novo: Cliente = { ...dados, id: crypto.randomUUID(), criadoEm: new Date().toISOString() };
  clientes.push(novo);
  saveClientes(clientes);
  return novo;
}

export function updateCliente(id: string, dados: Partial<Cliente>): void {
  const clientes = getClientes();
  const idx = clientes.findIndex((c) => c.id === id);
  if (idx !== -1) { clientes[idx] = { ...clientes[idx], ...dados }; saveClientes(clientes); }
}

export function removeCliente(id: string): void {
  saveClientes(getClientes().filter((c) => c.id !== id));
}

// --- Despesas ---

export function getDespesas(): Despesa[] {
  const raw = localStorage.getItem(DESPESAS_KEY);
  if (!raw) {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    const seeds: Despesa[] = [
      { id: "desp-001", descricao: "Gasolina visita cliente SP", valor: 120.00, categoria: "gasolina", data: `${mesAtual}-05` },
      { id: "desp-002", descricao: "Assinatura servidor cloud", valor: 89.90, categoria: "software", data: `${mesAtual}-01` },
    ];
    localStorage.setItem(DESPESAS_KEY, JSON.stringify(seeds));
    return seeds;
  }
  return JSON.parse(raw);
}

export function saveDespesas(despesas: Despesa[]): void {
  localStorage.setItem(DESPESAS_KEY, JSON.stringify(despesas));
}

export function addDespesa(dados: Omit<Despesa, "id">): Despesa {
  const despesas = getDespesas();
  const nova: Despesa = { ...dados, id: crypto.randomUUID() };
  despesas.push(nova);
  saveDespesas(despesas);
  return nova;
}
