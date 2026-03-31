import type { ProductStep } from "@/data/menuData";

export type StepId = ProductStep | `grupo-${string}`;

export interface PedidoAtual {
  produtoId: string | null;
  etapaAtual: number;
  adicionais: string[];
  bebida: string | null;
  removidos: string[];
  tipo: string | null;
  viagem: string | null;
  quantidade: number;
  observacao: string;
  gruposEscolhidos: Record<string, string[]>;
}
