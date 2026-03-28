import { supabase } from "@/integrations/supabase/client";

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
  plano: string;
  dataInicio: string;
  dataTermino: string;
  planoModulos?: "basico" | "medio" | "pro" | "premium";
}

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
}

// ─── CLIENTES ───────────────────────────────────

export async function getClientes(): Promise<Cliente[]> {
  try {
    const { data, error } = await supabase
      .from("master_clientes")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      nomeRestaurante: r.nome_restaurante ?? "",
      nomeContato: r.nome_contato ?? "",
      email: r.email ?? "",
      dataVencimento: r.data_vencimento ?? "",
      ativo: r.ativo ?? true,
      criadoEm: r.criado_em ?? new Date().toISOString(),
      avisoAtivo: r.aviso_ativo ?? false,
      avisoTexto: r.aviso_texto ?? "",
      telefone: r.telefone ?? "",
      cnpj: r.cnpj ?? "",
      cidade: r.cidade ?? "",
      estado: r.estado ?? "",
      endereco: r.endereco ?? "",
      segmento: r.segmento ?? "",
      diaVencimento: r.dia_vencimento ?? 10,
      valorMensalidade: Number(r.valor_mensalidade ?? 0),
      observacoes: r.observacoes ?? "",
      historicoPagamentos: (r.historico_pagamentos as unknown as Pagamento[]) ?? [],
      plano: r.plano ?? "anual",
      dataInicio: r.data_inicio ?? "",
      dataTermino: r.data_termino ?? "",
      planoModulos: (r.plano_modulos as Cliente["planoModulos"]) ?? "basico",
    }));
  } catch (err) {
    console.error("[masterStorage] erro:", err);
    return [];
  }
}

export async function saveClientes(clientes: Cliente[]): Promise<void> {
  // Não usado diretamente — use addCliente/updateCliente/removeCliente
}

export async function addCliente(dados: Omit<Cliente, "id" | "criadoEm">): Promise<Cliente> {
  const novo: Cliente = { ...dados, id: crypto.randomUUID(), criadoEm: new Date().toISOString() };
  await supabase.from("master_clientes").insert({
    id: novo.id,
    nome_restaurante: novo.nomeRestaurante,
    nome_contato: novo.nomeContato,
    email: novo.email,
    data_vencimento: novo.dataVencimento,
    ativo: novo.ativo,
    criado_em: novo.criadoEm,
    aviso_ativo: novo.avisoAtivo,
    aviso_texto: novo.avisoTexto,
    telefone: novo.telefone,
    cnpj: novo.cnpj,
    cidade: novo.cidade,
    estado: novo.estado,
    endereco: novo.endereco,
    segmento: novo.segmento,
    dia_vencimento: novo.diaVencimento,
    valor_mensalidade: novo.valorMensalidade,
    observacoes: novo.observacoes,
    historico_pagamentos: novo.historicoPagamentos as any,
    plano: novo.plano,
    data_inicio: novo.dataInicio,
    data_termino: novo.dataTermino,
    plano_modulos: novo.planoModulos ?? "basico",
  });
  return novo;
}

export async function updateCliente(id: string, dados: Partial<Cliente>): Promise<void> {
  const row: any = {};
  if (dados.nomeRestaurante !== undefined) row.nome_restaurante = dados.nomeRestaurante;
  if (dados.nomeContato !== undefined) row.nome_contato = dados.nomeContato;
  if (dados.email !== undefined) row.email = dados.email;
  if (dados.dataVencimento !== undefined) row.data_vencimento = dados.dataVencimento;
  if (dados.ativo !== undefined) row.ativo = dados.ativo;
  if (dados.avisoAtivo !== undefined) row.aviso_ativo = dados.avisoAtivo;
  if (dados.avisoTexto !== undefined) row.aviso_texto = dados.avisoTexto;
  if (dados.telefone !== undefined) row.telefone = dados.telefone;
  if (dados.cnpj !== undefined) row.cnpj = dados.cnpj;
  if (dados.cidade !== undefined) row.cidade = dados.cidade;
  if (dados.estado !== undefined) row.estado = dados.estado;
  if (dados.endereco !== undefined) row.endereco = dados.endereco;
  if (dados.segmento !== undefined) row.segmento = dados.segmento;
  if (dados.diaVencimento !== undefined) row.dia_vencimento = dados.diaVencimento;
  if (dados.valorMensalidade !== undefined) row.valor_mensalidade = dados.valorMensalidade;
  if (dados.observacoes !== undefined) row.observacoes = dados.observacoes;
  if (dados.historicoPagamentos !== undefined) row.historico_pagamentos = dados.historicoPagamentos;
  if (dados.plano !== undefined) row.plano = dados.plano;
  if (dados.dataInicio !== undefined) row.data_inicio = dados.dataInicio;
  if (dados.dataTermino !== undefined) row.data_termino = dados.dataTermino;
  if (dados.planoModulos !== undefined) row.plano_modulos = dados.planoModulos;
  row.updated_at = new Date().toISOString();
  await supabase.from("master_clientes").update(row).eq("id", id);
}

export async function removeCliente(id: string): Promise<void> {
  await supabase.from("master_clientes").delete().eq("id", id);
}

// ─── DESPESAS ───────────────────────────────────

export async function getDespesas(): Promise<Despesa[]> {
  try {
    const { data, error } = await supabase
      .from("master_despesas")
      .select("*")
      .order("data", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      descricao: r.descricao ?? "",
      valor: Number(r.valor ?? 0),
      categoria: r.categoria ?? "",
      data: r.data ?? "",
    }));
  } catch (err) {
    console.error("[masterStorage] erro:", err);
    return [];
  }
}

export async function saveDespesas(despesas: Despesa[]): Promise<void> {
  // Não usado diretamente — use addDespesa
}

export async function addDespesa(dados: Omit<Despesa, "id">): Promise<Despesa> {
  const nova: Despesa = { ...dados, id: crypto.randomUUID() };
  await supabase.from("master_despesas").insert({
    id: nova.id,
    descricao: nova.descricao,
    valor: nova.valor,
    categoria: nova.categoria,
    data: nova.data,
  });
  return nova;
}