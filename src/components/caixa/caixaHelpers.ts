/**
 * Shared helpers and constants used across Caixa sub-components.
 * Extracted from CaixaPage.tsx — NO logic changes.
 */
import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
} from "lucide-react";
import type { PaymentMethod } from "@/types/operations";

export const normStr = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export const toCents = (value: number) => Math.round(value * 100);

export const formatCpfMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const parseCurrencyInput = (value: string) => {
  const sanitized = value.trim().replace(/[^\d,.-]/g, "");
  if (!sanitized) return Number.NaN;
  if (sanitized.includes(",")) {
    return Number(sanitized.replace(/\./g, "").replace(",", "."));
  }
  return Number(sanitized);
};

export const paymentMethodOptions: Array<{
  value: PaymentMethod;
  label: string;
  icon: typeof Landmark;
  color: string;
  bgColor: string;
  borderColor: string;
  idleBg: string;
  idleBorder: string;
}> = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/30", idleBg: "bg-[#14532d]/40", idleBorder: "border-[#16a34a]/25" },
  { value: "credito", label: "Crédito", icon: CreditCard, color: "text-blue-400", bgColor: "bg-blue-500/15", borderColor: "border-blue-500/30", idleBg: "bg-[#0c1e3d]", idleBorder: "border-[#1e3a5f]" },
  { value: "debito", label: "Débito", icon: Wallet, color: "text-amber-400", bgColor: "bg-amber-500/15", borderColor: "border-amber-500/30", idleBg: "bg-[#2a1500]", idleBorder: "border-[#7c3900]" },
  { value: "pix", label: "PIX", icon: Smartphone, color: "text-purple-400", bgColor: "bg-purple-500/15", borderColor: "border-purple-500/30", idleBg: "bg-[#1a0a2e]", idleBorder: "border-[#4a1572]" },
];

export const getPaymentMethodLabel = (method: PaymentMethod) =>
  paymentMethodOptions.find((option) => option.value === method)?.label ?? method;

export const getPaymentMethodStyle = (method: PaymentMethod) =>
  paymentMethodOptions.find((option) => option.value === method) ?? paymentMethodOptions[0];

export const QUICK_VALUES = [10, 20, 50, 100];

export const actionLabels: Record<string, string> = {
  cancelar_item: "Exclusão de item",
  cancelar_pedido: "Cancelamento de pedido",
  editar_pedido: "Ajuste de pedido",
  fechar_conta: "Fechamento de conta",
  zerar_mesa: "Zeragem de mesa",
  entrada_manual: "Entrada manual",
  saida_manual: "Saída manual",
  chamar_garcom: "Chamada de garçom",
  lancar_pedido: "Lançamento de pedido",
  pedido_cliente: "Pedido do cliente",
};

export const getEventDotColor = (evento: { acao?: string; tipo?: string }) => {
  const a = evento.acao ?? evento.tipo ?? "";
  if (a === "pedido_cliente" || a === "chamar_garcom_cliente") return "bg-emerald-500";
  if (a === "fechar_conta" || a === "zerar_mesa") return "bg-blue-500";
  return "bg-amber-500";
};
