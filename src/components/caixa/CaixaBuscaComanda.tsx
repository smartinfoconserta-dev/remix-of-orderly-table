import { Search, Printer } from "lucide-react";
import { formatPrice, getPaymentMethodStyle, getPaymentMethodLabel } from "./caixaHelpers";
import type { FechamentoConta } from "@/types/restaurant";
import type { PaymentMethod, SplitPayment } from "@/types/operations";

interface CaixaBuscaComandaProps {
  open: boolean;
  onClose: () => void;
  resultados: FechamentoConta[];
  busca: string;
  setBusca: (v: string) => void;
  onEstornar: (fechamentoId: string) => void;
}

const CaixaBuscaComanda = ({ open, onClose, resultados, busca, setBusca, onEstornar }: CaixaBuscaComandaProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          autoFocus
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por #0001, mesa 02, nome do operador..."
          className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          onClick={onClose}
          className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border"
        >
          Fechar
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {busca.trim() === "" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Search className="h-10 w-10 opacity-20" />
            <p className="text-sm font-bold">Digite o número da comanda</p>
            <p className="text-xs">Ex: #0001, mesa 02, nome do operador</p>
          </div>
        ) : resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <p className="text-sm font-bold">Nenhum resultado para &quot;{busca}&quot;</p>
          </div>
        ) : (
          resultados.map(f => (
            <div key={f.id} className={`rounded-xl border bg-card p-4 space-y-2 ${
              f.cancelado ? "opacity-50 border-destructive/20" : "border-border"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {f.numeroComanda && (
                    <span className="text-sm font-black text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                      #{String(f.numeroComanda).padStart(4, "0")}
                    </span>
                  )}
                  <span className="text-sm font-bold text-foreground">
                    {f.mesaNumero === 0 ? "Balcão" : `Mesa ${String(f.mesaNumero).padStart(2, "0")}`}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.criadoEm}</span>
                  <span className="text-xs text-muted-foreground">· {f.caixaNome}</span>
                  {f.cancelado && (
                    <span className="text-xs font-black text-destructive">↩️ Estornado</span>
                  )}
                </div>
                <span className="text-lg font-black tabular-nums text-primary">
                  {formatPrice(f.total)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(f.pagamentos?.length
                  ? f.pagamentos
                  : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }]
                ).map((p: SplitPayment, i: number) => {
                  const style = getPaymentMethodStyle(p.formaPagamento);
                  const Icon = style.icon;
                  return (
                    <div key={i} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${style.bgColor} ${style.borderColor}`}>
                      <Icon className={`h-3 w-3 ${style.color}`} />
                      <span className={`text-xs font-bold tabular-nums ${style.color}`}>{formatPrice(p.valor)}</span>
                    </div>
                  );
                })}
                {f.troco != null && f.troco > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                    <span className="text-xs font-bold text-emerald-400">💵 Troco: {formatPrice(f.troco)}</span>
                  </div>
                )}
                {f.desconto != null && f.desconto > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
                    <span className="text-xs font-bold text-primary">🎁 Desconto: -{formatPrice(f.desconto)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {f.itens && f.itens.length > 0 && (
                    <span>
                      {f.itens.slice(0, 2).map((it, i) => (
                        <span key={i}>{it.quantidade}× {it.nome}{i < Math.min(f.itens!.length, 2) - 1 ? ", " : ""}</span>
                      ))}
                      {f.itens.length > 2 && <span> +{f.itens.length - 2} itens</span>}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                      w.document.write(`<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:13px;padding:16px;max-width:300px;margin:0 auto}h2{text-align:center;font-size:15px;margin-bottom:4px}.sub{text-align:center;color:#666;font-size:11px;margin-bottom:12px}hr{border:none;border-top:1px dashed #999;margin:8px 0}.print-item{display:flex;justify-content:space-between;margin:3px 0}.total{font-weight:bold;font-size:15px;display:flex;justify-content:space-between;margin-top:8px}.center{text-align:center;margin-top:12px;font-size:11px;color:#666}</style></head><body><h2>${f.mesaNumero === 0 ? "Balcão" : `Mesa ${String(f.mesaNumero).padStart(2,"0")}`}${f.numeroComanda ? ` — Comanda #${String(f.numeroComanda).padStart(4,"0")}` : ""}</h2><div class="sub">${f.criadoEm} • ${f.caixaNome}</div><hr/>${itensStr}<hr/>${descontoStr}${couvertStr}${pagStr}${trocoStr}<hr/><div class="total"><span>TOTAL</span><span>R$ ${f.total.toFixed(2).replace(".",",")}</span></div><div class="center">Obrigado pela visita!</div></body></html>`);
                      w.document.close();
                      w.focus();
                      setTimeout(() => { w.print(); w.close(); }, 400);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Printer className="h-3 w-3" /> Reimprimir
                  </button>
                  {!f.cancelado && (
                    <button
                      type="button"
                      onClick={() => onEstornar(f.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive/70 hover:text-destructive hover:border-destructive transition-colors"
                    >
                      ↩️ Estornar
                    </button>
                  )}
                  {f.cancelado && (
                    <span className="text-xs font-bold text-destructive/50 px-2">↩️ Estornado</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaixaBuscaComanda;
