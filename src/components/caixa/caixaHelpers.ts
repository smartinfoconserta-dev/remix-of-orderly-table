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

// ── Shared print receipt helper ──

export interface PrintComandaData {
  tipo: string;
  numero: number;
  dataHora: string;
  itens: Array<{ quantidade: number; nome: string; preco: number }>;
  subtotal: number;
  taxaEntrega?: number;
  total: number;
  formaPagamento?: string;
  paraViagem?: boolean;
  desconto?: number;
  couvert?: number;
  numeroPessoas?: number;
  origem?: string;
  clienteNome?: string;
  endereco?: string;
  cpfNota?: string;
}

export function printComanda(data: PrintComandaData, nomeRestaurante: string) {
  let el = document.getElementById("comanda-print");
  if (!el) {
    el = document.createElement("div");
    el.id = "comanda-print";
    el.style.display = "none";
    document.body.appendChild(el);
  }
  const nomeRest = nomeRestaurante || "Restaurante";
  const SEP = '<div class="print-sep">--------------------------------</div>';
  const taxaHtml = (data.taxaEntrega ?? 0) > 0
    ? `<div class="print-item"><span>Taxa de entrega</span><span>R$ ${data.taxaEntrega!.toFixed(2).replace(".", ",")}</span></div>`
    : "";
  const pagHtml = data.formaPagamento
    ? `<div class="print-center">${data.formaPagamento}</div>`
    : "";
  const descontoHtml = (data.desconto ?? 0) > 0
    ? `<div class="print-item"><span>Desconto</span><span>- R$ ${data.desconto!.toFixed(2).replace(".", ",")}</span></div>`
    : "";
  const couvertHtml = (data.couvert ?? 0) > 0
    ? `<div class="print-item"><span>Couvert (${data.numeroPessoas ?? 0}p)</span><span>+ R$ ${data.couvert!.toFixed(2).replace(".", ",")}</span></div>`
    : "";
  const paraLevarHtml = data.paraViagem
    ? `${SEP}<div class="print-center" style="font-size:14px;font-weight:900;letter-spacing:1px">*** PARA LEVAR ***</div>${SEP}`
    : "";
  const now = new Date();
  const footerDate = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const isBalcaoTotem = data.origem === "balcao" || data.origem === "totem";
  const isDelivery = data.origem === "delivery";
  const cpfHtml = data.cpfNota ? `<p style="text-align:center;font-size:11px;margin-top:8px">CPF: ${data.cpfNota}</p>` : "";

  let headerHtml = "";
  if (isDelivery) {
    headerHtml = `
      <h2>${nomeRest}</h2>
      <div style="text-align:center;padding:12px 0;border:3px solid #000;margin-bottom:12px;background:#f0f0f0">
        <p style="font-size:42px;font-weight:900;line-height:1;margin:0">#${String(data.numero).padStart(3,"0")}</p>
        <p style="font-size:14px;font-weight:bold;margin-top:4px">DELIVERY</p>
        <p style="font-size:16px;font-weight:bold;margin-top:2px">${data.clienteNome || ""}</p>
      </div>
      ${data.endereco ? `<div style="font-weight:bold;font-size:12px;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:8px">${data.endereco}</div>` : ""}
      <div class="print-center" style="font-size:10px">${data.dataHora}</div>
    `;
  } else if (isBalcaoTotem) {
    headerHtml = `
      <h2>${nomeRest}</h2>
      <div style="text-align:center;padding:16px 0;border-bottom:3px solid #000;margin-bottom:12px">
        <p style="font-size:48px;font-weight:900;line-height:1;margin:0">#${String(data.numero).padStart(3,"0")}</p>
        <p style="font-size:12px;margin-top:4px">Seu número de pedido</p>
      </div>
      <div class="print-center">${data.tipo}</div>
      <div class="print-center" style="font-size:10px">${data.dataHora}</div>
    `;
  } else {
    headerHtml = `
      <h2>${nomeRest}</h2>
      <div class="print-center">${data.tipo}</div>
      <div class="print-pedido-num">#${data.numero}</div>
      <div class="print-center" style="font-size:10px">${data.dataHora}</div>
    `;
  }

  el.innerHTML = `
    ${headerHtml}
    ${paraLevarHtml}
    ${SEP}
    ${data.itens.map((it) => `<div class="print-item"><span>${it.quantidade}x ${it.nome}</span><span>R$ ${(it.preco * it.quantidade).toFixed(2).replace(".", ",")}</span></div>`).join("")}
    ${SEP}
    <div class="print-item"><span>Subtotal</span><span>R$ ${data.subtotal.toFixed(2).replace(".", ",")}</span></div>
    ${taxaHtml}${descontoHtml}${couvertHtml}
    <div class="print-total"><span>TOTAL</span><span>R$ ${data.total.toFixed(2).replace(".", ",")}</span></div>
    ${SEP}
    ${pagHtml}
    <div style="text-align:center;margin:12px 0"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RETIRADA:${data.numero}" style="width:120px;height:120px" /><p style="font-size:10px;margin-top:4px">Apresente para retirar</p></div>
    ${cpfHtml}
    <div class="print-footer">${footerDate}</div>
    <div class="print-footer">Obrigado pela preferencia!</div>
  `;
  el.style.display = "block";
  window.print();
  el.style.display = "none";
}