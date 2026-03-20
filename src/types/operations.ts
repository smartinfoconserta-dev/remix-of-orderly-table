export type UserRole = "garcom" | "caixa" | "gerente" | "admin";

export type PaymentMethod = "dinheiro" | "credito" | "debito" | "pix";

export interface SplitPayment {
  id: string;
  formaPagamento: PaymentMethod;
  valor: number;
}

export interface OperationalUser {
  id: string;
  nome: string;
  role: UserRole;
  criadoEm: string;
}

export type CashMovementType = "entrada" | "saida";
