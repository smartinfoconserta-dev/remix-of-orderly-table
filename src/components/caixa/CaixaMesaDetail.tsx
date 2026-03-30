/**
 * CaixaMesaDetail — extracted from CaixaPage lines ~2477-3097.
 * Mesa detail view with 2-column layout (comanda + payment).
 * NO logic changes from original.
 */
import {
  Check,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatPrice,
  formatCpfMask,
  parseCurrencyInput,
  paymentMethodOptions,
  getPaymentMethodLabel,
  getPaymentMethodStyle,
  QUICK_VALUES,
  toCents,
} from "./caixaHelpers";
import type { PaymentMethod, SplitPayment, OperationalUser } from "@/types/operations";

interface Mesa {
  id: string;
  numero: number;
  status: string;
  total: number;
  pedidos: Array<{
    id: string;
    numeroPedido: number;
    origem: string;
    paraViagem?: boolean;
    criadoEmIso: string;
    itens: Array<{
      uid: string;
      nome: string;
      quantidade: number;
      precoUnitario: number;
      imagemUrl?: string;
      adicionais: Array<{ nome: string }>;
      removidos: string[];
      observacoes?: string;
    }>;
  }>;
  carrinho: Array<{
    uid: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    imagemUrl?: string;
    adicionais: Array<{ nome: string }>;
    removidos: string[];
  }>;
}

interface FechamentoItem {
  id: string;
  total: number;
  criadoEm: string;
  criadoEmIso: string;
  caixaNome: string;
  formaPagamento: PaymentMethod;
  pagamentos?: SplitPayment[];
  troco?: number;
  desconto?: number;
  couvert?: number;
  numeroPessoas?: number;
  cancelado?: boolean;
  canceladoMotivo?: string;
  canceladoPor?: string;
  numeroComanda?: number;
  itens?: Array<{ quantidade: number; nome: string; precoUnitario: number }>;
}

interface CaixaMesaDetailProps {
  mesa: Mesa;
  mesaTab: "comanda" | "pagamento" | "historico";
  setMesaTab: (v: "comanda" | "pagamento" | "historico") => void;
  closingPayments: SplitPayment[];
  closingPaymentMethod: PaymentMethod;
  setClosingPaymentMethod: (v: PaymentMethod) => void;
  closingPaymentValue: string;
  setClosingPaymentValue: (v: string) => void;
  trocoRegistrado: number;
  descontoAplicado: number;
  setDescontoAplicado: (v: number) => void;
  couvertPessoas: number;
  setCouvertPessoas: (v: number | ((p: number) => number)) => void;
  couvertDispensado: boolean;
  setCouvertDispensado: (v: boolean) => void;
  cpfNotaMesa: string;
  setCpfNotaMesa: (v: string) => void;
  cpfNotaMesaOpen: boolean;
  setCpfNotaMesaOpen: (v: boolean) => void;
  setDescontoModalOpen: (v: boolean) => void;
  totalConta: number;
  couvertTotal: number;
  valorRestante: number;
  fechamentoPronto: boolean;
  totalPago: number;
  paymentProgress: number;
  couvertValorUnit: number;
  sistemaConfig: any;
  currentOperator: OperationalUser;
  fechamentosDaMesa: FechamentoItem[];
  handleFechar: () => void;
  handleAddPayment: () => void;
  handleRemovePayment: (id: string) => void;
  openCriticalAction: (action: any) => void;
  ajustarItemPedido: (mesaId: string, pedidoId: string, itemUid: string, delta: number, ctx: any) => void;
  setEstornoFechamentoId: (v: string | null) => void;
  setEstornoModalOpen: (v: boolean) => void;
}

const CaixaMesaDetail = ({
  mesa, mesaTab, setMesaTab,
  closingPayments, closingPaymentMethod, setClosingPaymentMethod,
  closingPaymentValue, setClosingPaymentValue,
  trocoRegistrado, descontoAplicado, setDescontoAplicado,
  couvertPessoas, setCouvertPessoas, couvertDispensado, setCouvertDispensado,
  cpfNotaMesa, setCpfNotaMesa, cpfNotaMesaOpen, setCpfNotaMesaOpen,
  setDescontoModalOpen,
  totalConta, couvertTotal, valorRestante, fechamentoPronto, totalPago,
  paymentProgress, couvertValorUnit, sistemaConfig, currentOperator,
  fechamentosDaMesa,
  handleFechar, handleAddPayment, handleRemovePayment,
  openCriticalAction, ajustarItemPedido,
  setEstornoFechamentoId, setEstornoModalOpen,
}: CaixaMesaDetailProps) => {

  return (
    <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[2fr_3fr] gap-5 p-4 md:p-6 fade-in">

      {/* ═══ LEFT: COMANDA ═══ */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4 space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">Mesa {String(mesa.numero).padStart(2, "0")}</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              mesa.status === "consumo" ? "border-status-consumo/30 bg-status-consumo/10 text-status-consumo"
              : mesa.status === "pendente" ? "border-status-pendente/30 bg-status-pendente/10 text-status-pendente"
              : "border-border bg-secondary text-muted-foreground"
            }`}>
              {mesa.status === "livre" ? "LIVRE" : mesa.status === "pendente" ? "PENDENTE" : "EM CONSUMO"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-foreground tabular-nums">{formatPrice(totalConta)}</p>
            <p className="text-xs text-muted-foreground">Operador: {currentOperator.nome}</p>
          </div>
        </div>

        {mesa.pedidos.some((p) => p.paraViagem) && (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5">
            <ShoppingBag className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs font-black text-amber-400">Este pedido é para levar — embale ao finalizar</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {mesa.pedidos.length === 0 && mesa.carrinho.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <ReceiptText className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum item na comanda.</p>
            </div>
          ) : (
            <>
              {mesa.pedidos.map((pedido) => (
                <div key={pedido.id} className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Pedido #{pedido.numeroPedido} • {pedido.origem === "garcom" ? `Garçom` : pedido.origem === "caixa" ? `Caixa` : "Cliente"}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 px-2"
                      onClick={() => openCriticalAction({ type: "cancelar_pedido", mesaId: mesa.id, mesaNumero: mesa.numero, pedidoId: pedido.id, pedidoNumero: pedido.numeroPedido })}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                    {pedido.itens.map((item) => (
                      <div key={item.uid} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                        <div className="shrink-0 h-11 w-11 rounded-lg overflow-hidden border border-border bg-secondary">
                          {item.imagemUrl ? (
                            <img src={item.imagemUrl} alt={item.nome} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                              <ReceiptText className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-black text-muted-foreground tabular-nums shrink-0">{item.quantidade}×</span>
                            <p className="text-sm font-bold text-foreground truncate">{item.nome}</p>
                          </div>
                          {item.adicionais.length > 0 && (
                            <p className="text-xs text-primary mt-0.5 truncate">+ {item.adicionais.map(a => a.nome).join(", ")}</p>
                          )}
                          {item.removidos.length > 0 && (
                            <p className="text-xs text-destructive mt-0.5 truncate">Sem {item.removidos.join(", ")}</p>
                          )}
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{item.observacoes}"</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-black tabular-nums text-foreground">
                          {formatPrice(item.precoUnitario * item.quantidade)}
                        </span>
                        <div className="shrink-0 flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                            onClick={() => item.quantidade === 1
                              ? openCriticalAction({ type: "remover_item_pedido", mesaId: mesa.id, mesaNumero: mesa.numero, pedidoId: pedido.id, pedidoNumero: pedido.numeroPedido, itemUid: item.uid, itemNome: item.nome, quantidade: item.quantidade })
                              : ajustarItemPedido(mesa.id, pedido.id, item.uid, -1, { usuario: currentOperator })
                            }>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                            onClick={() => ajustarItemPedido(mesa.id, pedido.id, item.uid, 1, { usuario: currentOperator })}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                            onClick={() => openCriticalAction({ type: "remover_item_pedido", mesaId: mesa.id, mesaNumero: mesa.numero, pedidoId: pedido.id, pedidoNumero: pedido.numeroPedido, itemUid: item.uid, itemNome: item.nome, quantidade: item.quantidade })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Pending cart items */}
              {mesa.carrinho.length > 0 && (
                <div className="space-y-1">
                  <p className="px-1 text-xs font-bold text-status-pendente uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="h-3 w-3" />
                    Itens pendentes ({mesa.carrinho.length})
                  </p>
                  <div className="rounded-xl border border-status-pendente/20 overflow-hidden divide-y divide-border/50">
                    {mesa.carrinho.map((item) => (
                      <div key={item.uid} className="flex items-center gap-3 px-3 py-2.5 bg-status-pendente/5">
                        <div className="shrink-0 h-11 w-11 rounded-lg overflow-hidden border border-border bg-secondary">
                          {item.imagemUrl ? (
                            <img src={item.imagemUrl} alt={item.nome} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                              <ReceiptText className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-black text-muted-foreground tabular-nums shrink-0">{item.quantidade}×</span>
                            <p className="text-sm font-bold text-foreground truncate">{item.nome}</p>
                          </div>
                          {item.adicionais.length > 0 && (
                            <p className="text-xs text-primary mt-0.5 truncate">+ {item.adicionais.map(a => a.nome).join(", ")}</p>
                          )}
                          {item.removidos.length > 0 && (
                            <p className="text-xs text-destructive mt-0.5 truncate">Sem {item.removidos.join(", ")}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-black tabular-nums text-foreground">
                          {formatPrice(item.precoUnitario * item.quantidade)}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => openCriticalAction({ type: "remover_item_carrinho", mesaId: mesa.id, mesaNumero: mesa.numero, itemUid: item.uid, itemNome: item.nome })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Comanda footer */}
        <div className="border-t border-border px-5 py-4 space-y-2 bg-card">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums font-semibold">{formatPrice(totalConta)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-foreground">Total</span>
            <span className="text-xl font-black text-foreground tabular-nums">{formatPrice(totalConta)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border text-muted-foreground">
            <span className="uppercase tracking-wider font-bold">{mesa.pedidos.length} pedido(s)</span>
            <span className="tabular-nums font-bold text-foreground">{formatPrice(totalConta)}</span>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: PAGAMENTO or HISTÓRICO ═══ */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {mesaTab === "historico" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-base font-black text-foreground">Histórico de fechamentos</h3>
              <Button variant="outline" size="sm" onClick={() => setMesaTab("comanda")}
                className="rounded-xl font-bold text-xs gap-1.5">
                ← Voltar para comanda
              </Button>
            </div>
            {fechamentosDaMesa.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <ReceiptText className="h-10 w-10 opacity-30" />
                <p className="text-sm">Nenhum fechamento anterior para esta mesa.</p>
              </div>
            ) : (
              fechamentosDaMesa.map(f => (
                <div key={f.id} className={`rounded-xl border bg-card p-4 space-y-3 transition-opacity ${
                  f.cancelado ? "opacity-50 border-destructive/20" : "border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {f.numeroComanda && (
                        <span className="text-xs font-black text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                          #{String(f.numeroComanda).padStart(4, "0")}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-black text-foreground">{f.criadoEm}</p>
                        <p className="text-xs text-muted-foreground">por {f.caixaNome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!f.cancelado ? (
                        <button
                          onClick={() => {
                            setEstornoFechamentoId(f.id);
                            setEstornoModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
                        >
                          ↩️ Estornar
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-destructive/50">↩️ Estornado</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const trocoStr = f.troco && f.troco > 0
                            ? `<div class="print-item"><span>💵 Troco devolvido</span><span>R$ ${f.troco.toFixed(2).replace(".", ",")}</span></div>`
                            : "";
                          const descontoStr = f.desconto && f.desconto > 0
                            ? `<div class="print-item" style="color:#c85b0a"><span>🎁 Desconto aplicado</span><span>- R$ ${f.desconto.toFixed(2).replace(".", ",")}</span></div>`
                            : "";
                          const couvertStr = f.couvert && f.couvert > 0
                            ? `<div class="print-item" style="color:#059669"><span>🍽️ Couvert (${f.numeroPessoas ?? 0} pessoa${(f.numeroPessoas ?? 0) !== 1 ? "s" : ""})</span><span>+ R$ ${f.couvert.toFixed(2).replace(".", ",")}</span></div>`
                            : "";
                          const pagStr = (f.pagamentos?.length
                            ? f.pagamentos
                            : [{ formaPagamento: f.formaPagamento, valor: f.total }]
                          ).map((p: any) => `<div class="print-item"><span>${getPaymentMethodLabel(p.formaPagamento as PaymentMethod)}</span><span>R$ ${p.valor.toFixed(2).replace(".", ",")}</span></div>`).join("");
                          const itensStr = (f.itens || []).map((it: any) =>
                            `<div class="print-item"><span>${it.quantidade}x ${it.nome}</span><span>R$ ${(it.precoUnitario * it.quantidade).toFixed(2).replace(".", ",")}</span></div>`
                          ).join("");
                          const w = window.open("", "_blank", "width=400,height=600");
                          if (!w) return;
                          w.document.write(`<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:13px;padding:16px;max-width:300px;margin:0 auto}h2{text-align:center;font-size:15px;margin-bottom:4px}.sub{text-align:center;color:#666;font-size:11px;margin-bottom:12px}hr{border:none;border-top:1px dashed #999;margin:8px 0}.print-item{display:flex;justify-content:space-between;margin:3px 0}.total{font-weight:bold;font-size:15px;display:flex;justify-content:space-between;margin-top:8px}.center{text-align:center;margin-top:12px;font-size:11px;color:#666}</style></head><body><h2>Mesa ${String(mesa?.numero ?? "").padStart(2, "0")}${f.numeroComanda ? ` — Comanda #${String(f.numeroComanda).padStart(4, "0")}` : ""}</h2><div class="sub">${f.criadoEm} • ${f.caixaNome}</div><hr/>${itensStr}<hr/>${descontoStr}${couvertStr}${pagStr}${trocoStr}<hr/><div class="total"><span>TOTAL</span><span>R$ ${f.total.toFixed(2).replace(".", ",")}</span></div><div class="center">Obrigado pela visita!</div></body></html>`);
                          w.document.close();
                          w.focus();
                          setTimeout(() => { w.print(); w.close(); }, 400);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir
                      </button>
                      <p className="text-xl font-black tabular-nums text-primary">{formatPrice(f.total)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }])
                      .map((p: SplitPayment, i: number) => {
                        const style = getPaymentMethodStyle(p.formaPagamento);
                        const Icon = style.icon;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`h-6 w-6 flex items-center justify-center rounded-lg ${style.bgColor} ${style.color}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="text-sm text-foreground flex-1">{getPaymentMethodLabel(p.formaPagamento)}</span>
                            <span className={`text-sm font-black tabular-nums ${style.color}`}>{formatPrice(p.valor)}</span>
                          </div>
                        );
                      })}
                    {f.troco != null && f.troco > 0 && (
                      <p className="text-xs text-emerald-400">💵 Troco: {formatPrice(f.troco)}</p>
                    )}
                  </div>
                  {f.cancelado && f.canceladoMotivo && (
                    <p className="text-xs text-destructive">↩️ Estornado: {f.canceladoMotivo} — por {f.canceladoPor}</p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
            {/* Payment header */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-muted-foreground">Total a pagar</p>
                <p className="text-2xl font-black tabular-nums text-foreground">{formatPrice(totalConta)}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-xs text-muted-foreground font-bold">
                  {fechamentoPronto ? "Quitado ✓" : "Restante"}
                </p>
                <p className={`text-xl font-black tabular-nums ${fechamentoPronto ? "text-emerald-400" : "text-destructive"}`}>
                  {fechamentoPronto ? formatPrice(0) : formatPrice(valorRestante)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative rounded-full bg-secondary h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${paymentProgress * 100}%`,
                  backgroundColor: fechamentoPronto
                    ? "hsl(var(--status-consumo))"
                    : paymentProgress > 0
                      ? `hsl(${Math.round(paymentProgress * 120)}, 70%, 45%)`
                      : "hsl(var(--destructive) / 0.4)",
                  boxShadow: fechamentoPronto ? "0 0 12px hsl(var(--status-consumo) / 0.5)" : "none",
                }}
              />
            </div>

            {mesa.pedidos.some((p) => p.paraViagem) && !fechamentoPronto && totalConta > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
                <ShoppingBag className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs font-bold text-amber-400">Lembrar: pedido para levar — verifique a embalagem</p>
              </div>
            )}

            {!descontoAplicado && closingPayments.length === 0 && totalConta > 0 && (
              <button onClick={() => setDescontoModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors w-fit">
                <span>🎁</span> Aplicar desconto
              </button>
            )}

            {descontoAplicado > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span>🎁</span>
                  <div>
                    <p className="text-xs font-bold text-primary">Desconto aplicado</p>
                    <p className="text-[10px] text-muted-foreground">Original: {formatPrice(mesa?.total ?? 0)} → Com desconto: {formatPrice(totalConta)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-primary tabular-nums">- {formatPrice(descontoAplicado)}</span>
                  {closingPayments.length === 0 && (
                    <button onClick={() => setDescontoAplicado(0)} className="text-xs text-destructive hover:underline">remover</button>
                  )}
                </div>
              </div>
            )}

            {/* Couvert */}
            {sistemaConfig.couvertAtivo && !couvertDispensado && mesa && !mesa.pedidos.every(p => p.paraViagem) && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                    🍽️ Couvert
                    <span className="text-muted-foreground font-normal">
                      {formatPrice(sistemaConfig.couvertValor ?? 0)}/pessoa
                    </span>
                  </p>
                  {!sistemaConfig.couvertObrigatorio && (
                    <button
                      onClick={() => setCouvertDispensado(true)}
                      className="text-xs text-destructive/70 hover:text-destructive font-bold"
                    >
                      Dispensar
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCouvertPessoas(p => Math.max(0, p - 1))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-foreground"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[3rem] text-center text-base font-black tabular-nums">
                    {couvertPessoas} {couvertPessoas === 1 ? "pessoa" : "pessoas"}
                  </span>
                  <button
                    onClick={() => setCouvertPessoas(p => p + 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  {couvertPessoas > 0 && (
                    <span className="ml-auto text-sm font-black tabular-nums text-primary">
                      + {formatPrice(couvertTotal)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {couvertDispensado && (
              <div className="flex items-center justify-between rounded-xl bg-secondary/40 border border-border px-3 py-2">
                <span className="text-xs text-muted-foreground">🍽️ Couvert dispensado</span>
                <button onClick={() => setCouvertDispensado(false)} className="text-xs text-primary font-bold">
                  Reverter
                </button>
              </div>
            )}

            {!fechamentoPronto && totalConta > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {paymentMethodOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = closingPaymentMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setClosingPaymentMethod(opt.value as PaymentMethod);
                        if (opt.value === "dinheiro") {
                          setClosingPaymentValue("");
                        } else {
                          setClosingPaymentValue(valorRestante.toFixed(2).replace(".", ","));
                        }
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-3 transition-colors ${
                        isSelected
                          ? `border-white ${opt.bgColor}`
                          : `${opt.idleBorder} ${opt.idleBg} opacity-50`
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-black ${isSelected ? "text-white" : "text-muted-foreground"}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input + quick values */}
            {!fechamentoPronto && totalConta > 0 && (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {closingPaymentMethod === "dinheiro" ? "Valor entregue (R$)" : "Valor"}
                    </label>
                    <Input
                      value={closingPaymentValue}
                      onChange={(e) => setClosingPaymentValue(e.target.value)}
                      placeholder={closingPaymentMethod === "dinheiro" ? "Ex.: 50,00" : "Ex.: 25,00"}
                      inputMode="decimal"
                      autoComplete="off"
                      className="h-11 rounded-xl text-base font-bold"
                    />
                  </div>
                  {(() => {
                    const entregou = parseCurrencyInput(closingPaymentValue);
                    const temTroco = closingPaymentMethod === "dinheiro" &&
                      Number.isFinite(entregou) && entregou > valorRestante;
                    const troco = temTroco ? entregou - valorRestante : 0;
                    return (
                      <Button
                        onClick={handleAddPayment}
                        className={`rounded-xl font-black h-11 px-4 shrink-0 transition-all ${
                          temTroco
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
                            : ""
                        }`}
                      >
                        {temTroco ? (
                          <span className="flex flex-col items-center leading-tight">
                            <span className="text-xs font-bold opacity-80">Troco: {formatPrice(troco)}</span>
                            <span className="text-sm font-black">✓ Confirmar</span>
                          </span>
                        ) : (
                          <><Plus className="h-4 w-4 mr-1" /> Adicionar</>
                        )}
                      </Button>
                    );
                  })()}
                </div>
                {/* Quick values */}
                <div className="flex items-center gap-1.5">
                  {(closingPaymentMethod === "dinheiro" ? [20, 50, 100, 200] : QUICK_VALUES).map((qv) => (
                    <Button key={qv} type="button" variant="outline"
                      className="rounded-xl font-bold tabular-nums flex-1 h-9 text-sm"
                      onClick={() => setClosingPaymentValue(qv.toFixed(2).replace(".", ","))}>
                      {closingPaymentMethod === "dinheiro" ? `R$ ${qv}` : `+R$ ${qv}`}
                    </Button>
                  ))}
                  <Button type="button" variant="outline"
                    className="rounded-xl font-bold flex-1 h-9 text-sm border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setClosingPaymentValue(valorRestante.toFixed(2).replace(".", ","))}>
                    {closingPaymentMethod === "dinheiro" ? "Exato" : "Restante"}
                  </Button>
                </div>
                {/* Troco display */}
                {closingPaymentMethod === "dinheiro" && (() => {
                  const entregou = parseCurrencyInput(closingPaymentValue);
                  if (!Number.isFinite(entregou) || entregou <= valorRestante) return null;
                  const troco = entregou - valorRestante;
                  return (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border-2 border-emerald-500/50 px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-widest">Troco para o cliente</p>
                        <p className="text-sm font-bold text-emerald-400">Devolver ao cliente</p>
                      </div>
                      <span className="text-3xl font-black tabular-nums text-emerald-400">{formatPrice(troco)}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Payment list */}
            {closingPayments.length > 0 && (
              <div className="space-y-1.5">
                {closingPayments.map((payment) => {
                  const style = getPaymentMethodStyle(payment.formaPagamento);
                  const Icon = style.icon;
                  return (
                    <div key={payment.id} className={`flex items-center gap-2 rounded-xl border ${style.borderColor} ${style.bgColor} px-3 py-2`}>
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.bgColor} ${style.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="flex-1 text-sm font-bold text-foreground">{getPaymentMethodLabel(payment.formaPagamento)}</p>
                      <span className={`text-sm font-black tabular-nums ${style.color}`}>{formatPrice(payment.valor)}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRemovePayment(payment.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                {trocoRegistrado > 0 && (
                  <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💵</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-widest">Troco</p>
                        <p className="text-sm font-bold text-emerald-400">Devolver ao cliente</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black tabular-nums text-emerald-400">
                      {formatPrice(trocoRegistrado)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CPF na nota */}
          {sistemaConfig.cpfNotaAtivo && (
          <div className="border-t border-border px-3 pt-3">
            <button onClick={() => setCpfNotaMesaOpen(!cpfNotaMesaOpen)} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
              {cpfNotaMesa ? `CPF: ${cpfNotaMesa}` : "📄 CPF na nota?"}
            </button>
            {cpfNotaMesaOpen && (
              <div className="mt-2">
                <Input
                  value={cpfNotaMesa}
                  onChange={(e) => setCpfNotaMesa(formatCpfMask(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  className="rounded-xl text-sm"
                />
              </div>
            )}
          </div>
          )}

          {/* Sticky bottom: confirm */}
          <div className="border-t border-border p-3 bg-card space-y-2">
            <Button
              onClick={handleFechar}
              disabled={!fechamentoPronto || closingPayments.length === 0}
              className={`w-full h-14 rounded-2xl text-lg font-black transition-all ${
                fechamentoPronto
                  ? "bg-status-consumo text-white hover:bg-status-consumo/90 shadow-[0_0_20px_hsl(var(--status-consumo)/0.3)]"
                  : ""
              }`}
            >
              {fechamentoPronto ? <ShieldCheck className="h-5 w-5" /> : <Check className="h-5 w-5" />}
              Confirmar fechamento
            </Button>
            {!fechamentoPronto && totalConta > 0 && (
              <p className="text-center text-xs text-muted-foreground">O fechamento só será liberado quando o total pago for igual ao total da conta.</p>
            )}
          </div>
          </>
        )}
      </div>

    </div>
  );
};

export default CaixaMesaDetail;
