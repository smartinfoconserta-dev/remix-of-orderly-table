import { ScrollText } from "lucide-react";
import { formatPrice, getPaymentMethodStyle, getPaymentMethodLabel } from "./caixaHelpers";
import type { FechamentoConta } from "@/types/restaurant";
import type { SplitPayment } from "@/types/operations";

interface CaixaHistoricoTabProps {
  fechamentos: FechamentoConta[];
  allFechamentos: FechamentoConta[];
}

const CaixaHistoricoTab = ({ fechamentos, allFechamentos }: CaixaHistoricoTabProps) => {
  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <ScrollText className="h-5 w-5 text-primary" />
        <h2 className="text-base font-black text-foreground flex-1">Histórico de Pedidos</h2>
        <span className="text-xs text-muted-foreground">{allFechamentos.length} registros (últimos 30 dias)</span>
      </div>

      {fechamentos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fechamentos hoje</p>
            <p className="text-2xl font-black tabular-nums text-foreground">{fechamentos.filter(f => !f.cancelado).length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Faturado hoje</p>
            <p className="text-2xl font-black tabular-nums text-primary">{formatPrice(fechamentos.filter(f => !f.cancelado).reduce((s, f) => s + f.total, 0))}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estornos</p>
            <p className="text-2xl font-black tabular-nums text-destructive">{fechamentos.filter(f => f.cancelado).length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ticket médio</p>
            <p className="text-2xl font-black tabular-nums text-foreground">
              {(() => {
                const validos = fechamentos.filter(f => !f.cancelado);
                return validos.length > 0 ? formatPrice(validos.reduce((s, f) => s + f.total, 0) / validos.length) : "—";
              })()}
            </p>
          </div>
        </div>
      )}

      {allFechamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <ScrollText className="h-12 w-12 opacity-20" />
          <p className="text-sm font-semibold">Nenhum fechamento registrado</p>
          <p className="text-xs">Os pedidos fechados aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allFechamentos.map((f) => {
            const origemLabel = f.origem === "delivery" ? "🛵 Delivery"
              : f.origem === "totem" ? "🖥️ Totem"
              : f.origem === "balcao" ? "🏪 Balcão"
              : f.mesaNumero ? `🍽️ Mesa ${String(f.mesaNumero).padStart(2, "0")}` : "🍽️ Mesa";
            const dataStr = f.criadoEm || new Date(f.criadoEmIso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            return (
              <div
                key={f.id}
                className={`rounded-xl border p-4 space-y-2 transition-opacity ${
                  f.cancelado ? "opacity-50 border-destructive/20 bg-destructive/5" : "border-border bg-card hover:border-primary/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {f.numeroComanda && (
                      <span className="text-xs font-black text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                        #{String(f.numeroComanda).padStart(4, "0")}
                      </span>
                    )}
                    <span className="text-xs font-bold text-muted-foreground">{origemLabel}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{dataStr}</span>
                    <span className="text-xs text-muted-foreground">por {f.caixaNome || "—"}</span>
                  </div>
                  <span className={`text-lg font-black tabular-nums ${f.cancelado ? "text-destructive line-through" : "text-foreground"}`}>
                    {formatPrice(f.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }])
                    .map((p: SplitPayment, i: number) => {
                      const style = getPaymentMethodStyle(p.formaPagamento);
                      return (
                        <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.borderColor} ${style.bgColor} ${style.color}`}>
                          {getPaymentMethodLabel(p.formaPagamento)} {formatPrice(p.valor)}
                        </span>
                      );
                    })
                  }
                  {f.troco != null && f.troco > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      💵 Troco {formatPrice(f.troco)}
                    </span>
                  )}
                  {f.desconto != null && f.desconto > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      🎁 {formatPrice(f.desconto)}
                    </span>
                  )}
                </div>
                {f.itens && f.itens.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {f.itens.slice(0, 4).map((it, i) => (
                      <span key={i} className="mr-2">{it.quantidade}× {it.nome}</span>
                    ))}
                    {f.itens.length > 4 && <span className="text-muted-foreground/60">+{f.itens.length - 4} mais</span>}
                  </div>
                )}
                {f.cancelado && f.canceladoMotivo && (
                  <p className="text-xs text-destructive">↩️ Estornado: {f.canceladoMotivo} — por {f.canceladoPor}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CaixaHistoricoTab;
