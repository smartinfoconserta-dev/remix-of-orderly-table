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
}

const STORAGE_KEY = "orderly-master-v1";

export function getClientes(): Cliente[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed: Cliente = {
      id: "demo-001",
      nomeRestaurante: "Restaurante Exemplo",
      nomeContato: "João Silva",
      email: "joao@exemplo.com",
      dataVencimento: "2025-12-31",
      ativo: true,
      criadoEm: new Date().toISOString(),
      avisoAtivo: false,
      avisoTexto: "",
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
  const novo: Cliente = {
    ...dados,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
  };
  clientes.push(novo);
  saveClientes(clientes);
  return novo;
}

export function updateCliente(id: string, dados: Partial<Cliente>): void {
  const clientes = getClientes();
  const idx = clientes.findIndex((c) => c.id === id);
  if (idx !== -1) {
    clientes[idx] = { ...clientes[idx], ...dados };
    saveClientes(clientes);
  }
}

export function removeCliente(id: string): void {
  saveClientes(getClientes().filter((c) => c.id !== id));
}
