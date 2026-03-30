/**
 * CaixaBalcaoDetail — extracted from CaixaPage lines ~3098-3424.
 * Balcão/Delivery detail view with 2-column layout.
 * NO logic changes from original.
 */
import {
  Check,
  MessageCircle,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
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
} from "./caixaHelpers";
import type { PaymentMethod, SplitPayment, OperationalUser } from "@/types/operations";

interface PedidoBalcao {
  id: string;
  numeroPedido: number;
  clienteNome?: string;
  clienteTelefone?: string;
  enderecoCompleto?: string;
  bairro?: string;
  referencia?: string;
  statusBalcao: string;
  total: number;
  origem: string;
  observacaoGeral?: string;
  itens: Array<{
    uid: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    adicionais: Array<{ nome: string }>;
    removidos: string[];
  }>;
  [key: string]: any;
}

interface CaixaBalcaoDetailProps {
  balcaoPedido: PedidoBalcao;
  balcaoPayments: SplitPayment[];
  setBalcaoPayments: (v: SplitPayment[] | ((prev: SplitPayment[]) => SplitPayment[])) => void;
  balcaoPaymentMethod: PaymentMethod;
  setBalcaoPaymentMethod: (v: PaymentMethod) => void;
  balcaoPaymentValue: string;
  setBalcaoPaymentValue: (v: string) => void;
  balcaoValorEntregue: string;
  setBalcaoValorEntregue: (v: string) => void;
  cpfNotaBalcao: string;
  setCpfNotaBalcao: (v: string) => void;
  cpfNotaBalcaoOpen: boolean;
  setCpfNotaBalcaoOpen: (v: boolean) => void;
  balcaoTotalConta: number;
  balcaoValorRestante: number;
  balcaoFechamentoPronto: boolean;
  balcaoTotalPago: number;
  balcaoPaymentProgress: number;
  balcaoValorEntregueNum: number;
  balcaoTrocoCalculado: number;
  sistemaConfig: any;
  currentOperator: OperationalUser;
  handleFecharBalcao: () => void;
  handleAddBalcaoPayment: () => void;
  setTrocoRegistrado: (v: number) => void;
}

const CaixaBalcaoDetail = ({
  balcaoPedido,
  balcaoPayments, setBalcaoPayments,
  balcaoPaymentMethod, setBalcaoPaymentMethod,
  balcaoPaymentValue, setBalcaoPaymentValue,
  balcaoValorEntregue, setBalcaoValorEntregue,
  cpfNotaBalcao, setCpfNotaBalcao,
  cpfNotaBalcaoOpen, setCpfNotaBalcaoOpen,
  balcaoTotalConta, balcaoValorRestante,
  balcaoFechamentoPronto, balcaoTotalPago,
  balcaoPaymentProgress, balcaoValorEntregueNum, balcaoTrocoCalculado,
  sistemaConfig, currentOperator,
  handleFecharBalcao, handleAddBalcaoPayment, setTrocoRegistrado,
}: CaixaBalcaoDetailProps) => {

  return (
    <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[2fr_3fr] gap-5 p-4 md:p-6 fade-in">

      {/* ═══ LEFT: COMANDA ═══ */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            <ReceiptText className="h-4.5 w-4.5 text-primary" />
            Comanda — {balcaoPedido.origem === "delivery" ? "Delivery" : "Balcão"}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          <div className="space-y-1">
            <p className="px-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pedido #{balcaoPedido.numeroPedido} • {balcaoPedido.clienteNome || "—"}
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">Qtd</th>
                    <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</th>
                    <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balcaoPedido.itens.map((item) => (
                    <tr key={item.uid} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-3 tabular-nums text-muted-foreground font-semibold">{item.quantidade}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-foreground">{item.nome}</p>
                        {item.adicionais.length > 0 && <p className="text-xs text-primary mt-0.5">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>}
                        {item.removidos.length > 0 && <p className="text-xs text-destructive mt-0.5">Sem {item.removidos.join(", ")}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground">{formatPrice(item.precoUnitario * item.quantidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {balcaoPedido.observacaoGeral && (
            <p className="text-xs text-muted-foreground italic border-t border-border pt-2">Obs: {balcaoPedido.observacaoGeral}</p>
          )}
          {balcaoPedido.origem === "delivery" && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1 text-xs">
              <p className="font-black text-foreground">Dados do delivery</p>
              {balcaoPedido.clienteTelefone && (
                <div className="flex items-center gap-1">
                  <p className="text-muted-foreground">Tel: {balcaoPedido.clienteTelefone}</p>
                  <a href={`https://wa.me/55${balcaoPedido.clienteTelefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-secondary transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
              {balcaoPedido.enderecoCompleto && <p className="text-muted-foreground">End: {balcaoPedido.enderecoCompleto}</p>}
              {balcaoPedido.bairro && <p className="text-muted-foreground">Bairro: {balcaoPedido.bairro}</p>}
              {balcaoPedido.referencia && <p className="text-muted-foreground">Ref: {balcaoPedido.referencia}</p>}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-foreground">Total</span>
            <span className="text-xl font-black text-foreground tabular-nums">{formatPrice(balcaoPedido.total)}</span>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: PAGAMENTO ═══ */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Total da conta</span>
              <span className="text-2xl font-black text-foreground tabular-nums">{formatPrice(balcaoTotalConta)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Total pago</span>
              <span className={`text-2xl font-black tabular-nums ${balcaoFechamentoPronto ? "text-status-consumo" : balcaoTotalPago > 0 ? "text-primary" : "text-foreground"}`}>
                {formatPrice(balcaoTotalPago)}
              </span>
            </div>
            <div className={`flex items-center justify-between rounded-2xl p-4 ${balcaoFechamentoPronto ? "bg-status-consumo/10" : "bg-destructive/5"}`}>
              <span className={`text-base font-black ${balcaoFechamentoPronto ? "text-status-consumo" : "text-destructive"}`}>Restante</span>
              <span className={`text-3xl font-black tabular-nums ${balcaoFechamentoPronto ? "text-status-consumo" : "text-destructive"}`}>
                {balcaoFechamentoPronto ? (
                  <span className="flex items-center gap-2"><Check className="h-6 w-6" /> Quitado</span>
                ) : formatPrice(balcaoValorRestante)}
              </span>
            </div>
          </div>

          <div className="relative rounded-full bg-secondary h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${balcaoPaymentProgress * 100}%`,
                backgroundColor: balcaoFechamentoPronto
                  ? "hsl(var(--status-consumo))"
                  : balcaoPaymentProgress > 0
                    ? `hsl(${Math.round(balcaoPaymentProgress * 120)}, 70%, 45%)`
                    : "hsl(var(--destructive) / 0.4)",
              }}
            />
          </div>

          {!balcaoFechamentoPronto && balcaoTotalConta > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {paymentMethodOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = balcaoPaymentMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setBalcaoPaymentMethod(opt.value);
                      if (opt.value !== "dinheiro") {
                        setBalcaoPaymentValue(balcaoValorRestante.toFixed(2).replace(".", ","));
                      } else {
                        setBalcaoValorEntregue("");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-4 transition-colors ${
                      isSelected ? `border-white ${opt.bgColor}` : `${opt.idleBorder} ${opt.idleBg} opacity-50`
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-black ${isSelected ? "text-white" : "text-muted-foreground"}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!balcaoFechamentoPronto && balcaoTotalConta > 0 && (
            <div className="space-y-3">
              {balcaoPaymentMethod === "dinheiro" ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Cliente entregou (R$)
                      </label>
                      <Input
                        value={balcaoValorEntregue}
                        onChange={(e) => setBalcaoValorEntregue(e.target.value)}
                        placeholder="Ex.: 50,00"
                        inputMode="decimal"
                        autoComplete="off"
                        className="h-12 rounded-xl text-lg font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[20, 50, 100, 200].map((qv) => (
                      <Button
                        key={qv}
                        type="button"
                        variant="outline"
                        className="rounded-xl font-bold tabular-nums flex-1 h-10"
                        onClick={() => setBalcaoValorEntregue(qv.toFixed(2).replace(".", ","))}
                      >
                        R$ {qv}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl font-bold tabular-nums flex-1 h-10 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => setBalcaoValorEntregue(balcaoValorRestante.toFixed(2).replace(".", ","))}
                    >
                      Exato
                    </Button>
                  </div>
                  {Number.isFinite(balcaoValorEntregueNum) && balcaoValorEntregueNum > 0 && (
                    <div className={`rounded-xl p-3 flex items-center justify-between border ${
                      balcaoTrocoCalculado > 0
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : balcaoValorEntregueNum === balcaoValorRestante
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                    }`}>
                      <span className={`text-sm font-black ${
                        balcaoTrocoCalculado > 0 || balcaoValorEntregueNum === balcaoValorRestante
                          ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {balcaoTrocoCalculado > 0
                          ? "💵 Troco para o cliente"
                          : balcaoValorEntregueNum === balcaoValorRestante
                          ? "✓ Valor exato"
                          : `↓ Faltam ${formatPrice(balcaoValorRestante - balcaoValorEntregueNum)}`}
                      </span>
                      <span className={`text-xl font-black tabular-nums ${
                        balcaoTrocoCalculado > 0 || balcaoValorEntregueNum === balcaoValorRestante
                          ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {balcaoTrocoCalculado > 0 ? formatPrice(balcaoTrocoCalculado) : formatPrice(balcaoValorEntregueNum)}
                      </span>
                    </div>
                  )}
                  <Button
                    className={`w-full h-11 rounded-xl font-black text-sm ${
                      balcaoTrocoCalculado > 0 || balcaoValorEntregueNum === balcaoValorRestante
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : balcaoValorEntregueNum > 0 && balcaoValorEntregueNum < balcaoValorRestante
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : ""
                    }`}
                    variant={balcaoValorEntregueNum > 0 ? "default" : "outline"}
                    disabled={!Number.isFinite(balcaoValorEntregueNum) || balcaoValorEntregueNum <= 0}
                    onClick={() => {
                      const balcaoValorDinheiroARegistrar = Math.min(balcaoValorEntregueNum, balcaoValorRestante);
                      setTrocoRegistrado(balcaoTrocoCalculado);
                      setBalcaoPayments(prev => [...prev, {
                        id: `pag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        formaPagamento: "dinheiro" as PaymentMethod,
                        valor: Number(balcaoValorDinheiroARegistrar.toFixed(2))
                      }]);
                      setBalcaoValorEntregue("");
                    }}
                  >
                    {!Number.isFinite(balcaoValorEntregueNum) || balcaoValorEntregueNum <= 0
                      ? "Digite o valor entregue"
                      : balcaoTrocoCalculado > 0
                      ? `+ Dinheiro — Troco: ${formatPrice(balcaoTrocoCalculado)}`
                      : balcaoValorEntregueNum < balcaoValorRestante
                      ? `+ Registrar ${formatPrice(balcaoValorEntregueNum)} em dinheiro`
                      : `+ Adicionar dinheiro exato`}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Valor</label>
                      <Input value={balcaoPaymentValue} onChange={(e) => setBalcaoPaymentValue(e.target.value)} placeholder="Ex.: 25,00" inputMode="decimal" autoComplete="off" className="h-12 rounded-xl text-lg font-bold" />
                    </div>
                    <Button onClick={handleAddBalcaoPayment} className="rounded-xl font-black h-12 px-6 text-base">
                      <Plus className="h-5 w-5" /> Adicionar
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {QUICK_VALUES.map((qv) => (
                      <Button key={qv} type="button" variant="outline" className="rounded-xl font-bold tabular-nums flex-1 h-10" disabled={qv > balcaoValorRestante} onClick={() => setBalcaoPaymentValue(qv.toFixed(2).replace(".", ","))}>
                        +R$ {qv}
                      </Button>
                    ))}
                    {balcaoValorRestante > 0 && !QUICK_VALUES.includes(Math.round(balcaoValorRestante * 100) / 100) && (
                      <Button type="button" variant="outline" className="rounded-xl font-bold tabular-nums flex-1 h-10 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setBalcaoPaymentValue(balcaoValorRestante.toFixed(2).replace(".", ","))}>
                        Restante
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {balcaoPayments.length > 0 && (
            <div className="space-y-2">
              {balcaoPayments.map((payment) => {
                const style = getPaymentMethodStyle(payment.formaPagamento);
                const Icon = style.icon;
                return (
                  <div key={payment.id} className={`flex items-center gap-3 rounded-2xl border ${style.borderColor} ${style.bgColor} px-4 py-3`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bgColor} ${style.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="flex-1 text-sm font-bold text-foreground">{getPaymentMethodLabel(payment.formaPagamento)}</p>
                    <span className={`text-base font-black tabular-nums ${style.color}`}>{formatPrice(payment.valor)}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setBalcaoPayments((prev) => prev.filter((p) => p.id !== payment.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CPF na nota */}
        {sistemaConfig.cpfNotaAtivo && (
        <div className="border-t border-border px-5 pt-3">
          <button onClick={() => setCpfNotaBalcaoOpen(!cpfNotaBalcaoOpen)} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            {cpfNotaBalcao ? `CPF: ${cpfNotaBalcao}` : "📄 CPF na nota?"}
          </button>
          {cpfNotaBalcaoOpen && (
            <div className="mt-2">
              <Input
                value={cpfNotaBalcao}
                onChange={(e) => setCpfNotaBalcao(formatCpfMask(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="rounded-xl text-sm"
              />
            </div>
          )}
        </div>
        )}

        <div className="border-t border-border p-5 bg-card space-y-2">
          <Button
            onClick={handleFecharBalcao}
            disabled={!balcaoFechamentoPronto || balcaoPayments.length === 0}
            className={`w-full h-14 rounded-2xl text-lg font-black transition-all ${
              balcaoFechamentoPronto
                ? "bg-status-consumo text-white hover:bg-status-consumo/90 shadow-[0_0_20px_hsl(var(--status-consumo)/0.3)]"
                : ""
            }`}
          >
            {balcaoFechamentoPronto ? <ShieldCheck className="h-5 w-5" /> : <Check className="h-5 w-5" />}
            Confirmar fechamento
          </Button>
          {!balcaoFechamentoPronto && balcaoTotalConta > 0 && (
            <p className="text-center text-xs text-muted-foreground">O fechamento só será liberado quando o total pago for exatamente igual ao total da conta.</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default CaixaBalcaoDetail;
