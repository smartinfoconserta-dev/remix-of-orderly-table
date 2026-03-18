export type UserRole = "garcom" | "caixa";

export interface OperationalUser {
  id: string;
  nome: string;
  role: UserRole;
  criadoEm: string;
}

export type CashMovementType = "entrada" | "saida";
