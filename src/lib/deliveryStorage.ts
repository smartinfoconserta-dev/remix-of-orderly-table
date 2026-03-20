const CLIENTES_KEY = "orderly-clientes-delivery-v1";

export interface ClienteDelivery {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  endereco: string;
  numero: string;
  bairro: string;
  complemento: string;
  referencia: string;
  criadoEm: string;
  ultimoPedido: string;
}

export function getClientesDelivery(): ClienteDelivery[] {
  try {
    const raw = localStorage.getItem(CLIENTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveClientesDelivery(clientes: ClienteDelivery[]): void {
  localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientes));
}

export function findClienteDelivery(busca: string): ClienteDelivery[] {
  if (!busca.trim()) return [];
  const term = busca.trim().toLowerCase();
  return getClientesDelivery().filter(
    (c) =>
      c.nome.toLowerCase().includes(term) ||
      c.telefone.replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
      c.cpf.replace(/\D/g, "").includes(term.replace(/\D/g, "")),
  );
}

export function upsertClienteDelivery(
  dados: Omit<ClienteDelivery, "id" | "criadoEm" | "ultimoPedido"> & {
    id?: string;
    criadoEm?: string;
  },
): ClienteDelivery {
  const clientes = getClientesDelivery();
  const now = new Date().toISOString();
  const telNorm = dados.telefone.replace(/\D/g, "");
  const cpfNorm = dados.cpf.replace(/\D/g, "");

  const existing = clientes.find(
    (c) =>
      (cpfNorm && c.cpf.replace(/\D/g, "") === cpfNorm) ||
      (telNorm && c.telefone.replace(/\D/g, "") === telNorm),
  );

  if (existing) {
    const updated: ClienteDelivery = {
      ...existing,
      nome: dados.nome || existing.nome,
      cpf: dados.cpf || existing.cpf,
      telefone: dados.telefone || existing.telefone,
      endereco: dados.endereco || existing.endereco,
      numero: dados.numero || existing.numero,
      bairro: dados.bairro || existing.bairro,
      complemento: dados.complemento || existing.complemento,
      referencia: dados.referencia || existing.referencia,
      ultimoPedido: now,
    };
    const next = clientes.map((c) => (c.id === existing.id ? updated : c));
    saveClientesDelivery(next);
    return updated;
  }

  const novo: ClienteDelivery = {
    id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nome: dados.nome,
    cpf: dados.cpf,
    telefone: dados.telefone,
    endereco: dados.endereco,
    numero: dados.numero,
    bairro: dados.bairro,
    complemento: dados.complemento,
    referencia: dados.referencia,
    criadoEm: now,
    ultimoPedido: now,
  };
  saveClientesDelivery([novo, ...clientes]);
  return novo;
}
