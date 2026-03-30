import type { CashMovementType, PaymentMethod, SplitPayment } from "@/types/operations";

export interface ItemCarrinho {
  uid: string;
  produtoId: string;
  nome: string;
  precoBase: number;
  quantidade: number;
  removidos: string[];
  adicionais: { nome: string; preco: number }[];
  bebida?: string | null;
  tipo?: string | null;
  embalagem?: string | null;
  observacoes?: string;
  precoUnitario: number;
  imagemUrl?: string;
  gruposEscolhidos?: { grupoNome: string; tipo: "escolha" | "adicional" | "retirar"; opcoes: { nome: string; preco: number }[] }[];
  setor?: "cozinha" | "bar" | "ambos";
}

export interface PedidoRealizado {
  id: string;
  numeroPedido: number;
  itens: ItemCarrinho[];
  total: number;
  criadoEm: string;
  criadoEmIso: string;
  origem: "mesa" | "cliente" | "garcom" | "caixa" | "balcao" | "delivery" | "totem" | "ifood";
  mesaId: string;
  garcomId?: string;
  garcomNome?: string;
  caixaId?: string;
  caixaNome?: string;
  pronto?: boolean;
  paraViagem?: boolean;
  clienteNome?: string;
  clienteTelefone?: string;
  enderecoCompleto?: string;
  bairro?: string;
  referencia?: string;
  formaPagamentoDelivery?: string;
  trocoParaQuanto?: number;
  observacaoGeral?: string;
  statusBalcao?: "aberto" | "preparando" | "pronto" | "retirado" | "pago" | "saiu" | "entregue" | "aguardando_confirmacao" | "devolvido" | "cancelado" | "pendente_ifood";
  motoboyNome?: string;
  cancelado?: boolean;
  canceladoEm?: string;
  canceladoMotivo?: string;
  canceladoPor?: string;
}

export interface EventoOperacional {
  id: string;
  tipo: "pedido" | "chamado" | "caixa" | "movimentacao";
  descricao: string;
  criadoEm: string;
  criadoEmIso: string;
  mesaId?: string;
  usuarioId?: string;
  usuarioNome?: string;
  acao?: string;
  valor?: number;
  itemNome?: string;
  motivo?: string;
  pedidoNumero?: number;
}

export interface MovimentacaoCaixa {
  id: string;
  tipo: CashMovementType;
  descricao: string;
  valor: number;
  criadoEm: string;
  criadoEmIso: string;
  usuarioId: string;
  usuarioNome: string;
}

export interface FechamentoConta {
  id: string;
  numeroComanda?: number;
  mesaId: string;
  mesaNumero: number;
  total: number;
  formaPagamento: PaymentMethod;
  pagamentos: SplitPayment[];
  itens?: ItemCarrinho[];
  criadoEm: string;
  criadoEmIso: string;
  caixaId: string;
  caixaNome: string;
  troco?: number;
  subtotal?: number;
  desconto?: number;
  couvert?: number;
  numeroPessoas?: number;
  cancelado?: boolean;
  canceladoEm?: string;
  canceladoMotivo?: string;
  canceladoPor?: string;
  origem?: "mesa" | "balcao" | "delivery" | "totem" | "motoboy" | "garcom_pdv";
  cpfNota?: string;
}

export interface Mesa {
  id: string;
  numero: number;
  status: "livre" | "pendente" | "consumo";
  total: number;
  carrinho: ItemCarrinho[];
  pedidos: PedidoRealizado[];
  chamarGarcom: boolean;
  chamadoEm: number | null;
}
