/**
 * CaixaPedidosFastFoodPanel — Painel de pedidos ativos para modo Fast Food.
 * Mostra todos os pedidos do dia em cards com badges de origem,
 * status visual e botões de ação por status.
 */
import { Check, Clock, ChefHat, Package } from "lucide-react";
import { formatPrice } from "./caixaHelpers";

interface PedidoBalcao {
  id: string;
  numeroPedido: number;
  clienteNome?: string;
  statusBalcao?: string;
  canceladoMotivo?: string;
  total: number;
  origem: string;
  itens: Array<{ uid: string; nome: string; quantidade: number }>;
  criadoEmIso: string;
  [key: string]: any;
}

interface CaixaPedidosFastFoodPanelProps {
  pedidos: PedidoBalcao[];
  marcarBalcaoPreparando: (id: string) => void;
  marcarBalcaoPronto: (id: string) => void;
  marcarBalcaoRetirado: (id: string) => void;
  onPagar: (id: string) => void;
}

const ORIGIN_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  totem: { label: "TOTEM", bg: "bg-orange-500/15 border-orange-500/40", text: "text-orange-400" },
  garcom: { label: "GARÇOM PDV", bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-400" },
  garcom_pdv: { label: "GARÇOM PDV", bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-400" },
  caixa: { label: "CAIXA", bg: "bg-blue-500/15 border-blue-500/40", text: "text-blue-400" },
  balcao: { label: "BALCÃO", bg: "bg-blue-500/15 border-blue-500/40", text: "text-blue-400" },
  delivery: { label: "DELIVERY", bg: "bg-purple-500/15 border-purple-500/40", text: "text-purple-400" },
  ifood: { label: "IFOOD", bg: "bg-red-500/15 border-red-500/40", text: "text-red-400" },
};

const STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; textColor: string }> = {
  aberto: { label: "Aguardando", border: "border-amber-500/50", bg: "bg-amber-500/5", textColor: "text-amber-400" },
  preparando: { label: "Preparando", border: "border-amber-500/50", bg: "bg-amber-500/5", textColor: "text-amber-400" },
  pronto: { label: "Pronto ✓", border: "border-emerald-500/50", bg: "bg-emerald-500/5", textColor: "text-emerald-400" },
  retirado: { label: "Retirado", border: "border-muted", bg: "bg-secondary/30", textColor: "text-muted-foreground" },
  pago: { label: "Pago", border: "border-purple-500/50", bg: "bg-purple-500/5", textColor: "text-purple-400" },
  cancelado: { label: "Cancelado", border: "border-red-500/30", bg: "bg-red-500/5", textColor: "text-red-400" },
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const CaixaPedidosFastFoodPanel = ({
  pedidos,
  marcarBalcaoPreparando,
  marcarBalcaoPronto,
  marcarBalcaoRetirado,
  onPagar,
}: CaixaPedidosFastFoodPanelProps) => {
  // Filter: show active orders (not cancelado, not pago)
  const pedidosAtivos = pedidos.filter(
    (p) => p.statusBalcao !== "cancelado" && p.statusBalcao !== "pago" && !p.cancelado
  );

  // Sort: pronto first, then preparando, then aberto — newest first within group
  const sorted = [...pedidosAtivos].sort((a, b) => {
    const order: Record<string, number> = { pronto: 0, preparando: 1, aberto: 2, retirado: 3 };
    const oa = order[a.statusBalcao || "aberto"] ?? 4;
    const ob = order[b.statusBalcao || "aberto"] ?? 4;
    if (oa !== ob) return oa - ob;
    return new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime();
  });

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xl">📋</span>
        <h2 className="text-base font-black text-foreground flex-1">Pedidos</h2>
        <span className="text-xs text-muted-foreground">
          {pedidosAtivos.length} ativo{pedidosAtivos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <span className="text-5xl opacity-20">📋</span>
          <p className="text-sm font-semibold">Nenhum pedido ativo no momento</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const status = p.statusBalcao || "aberto";
            const sc = STATUS_CONFIG[status] || STATUS_CONFIG.aberto;
            const origin = ORIGIN_STYLES[p.origem] || ORIGIN_STYLES.balcao;
            const isPronto = status === "pronto";
            const isRetirado = status === "retirado";

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 space-y-3 transition-all ${sc.border} ${sc.bg} ${
                  isPronto ? "ring-2 ring-emerald-500/30" : ""
                } ${isRetirado ? "opacity-60" : ""}`}
              >
                {/* Top row: origin badge + status */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${origin.bg} ${origin.text}`}
                  >
                    {origin.label}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${sc.border} ${sc.bg} ${sc.textColor}`}
                  >
                    {sc.label}
                  </span>
                </div>

                {/* Order number + time */}
                <div className="flex items-end justify-between">
                  <span
                    className="text-3xl font-black tabular-nums"
                    style={{ color: "#FF6B00" }}
                  >
                    #{String(p.numeroPedido).padStart(3, "0")}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(p.criadoEmIso)}
                  </div>
                </div>

                {/* Client name */}
                {p.clienteNome && (
                  <p className="text-sm font-semibold text-foreground truncate">
                    {p.clienteNome}
                  </p>
                )}

                {/* Items summary */}
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {p.itens.map((it, i) => (
                    <span key={it.uid}>
                      {i > 0 && " · "}
                      {it.quantidade}x {it.nome}
                    </span>
                  ))}
                </div>

                {/* Total */}
                <div className="text-lg font-black tabular-nums text-foreground">
                  {formatPrice(p.total)}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {status === "aberto" && (
                    <>
                      <button
                        type="button"
                        onClick={() => marcarBalcaoPreparando(p.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all"
                      >
                        <ChefHat className="h-3.5 w-3.5" />
                        Preparando
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarBalcaoPronto(p.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Pronto
                      </button>
                    </>
                  )}

                  {status === "preparando" && (
                    <button
                      type="button"
                      onClick={() => marcarBalcaoPronto(p.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Pronto
                    </button>
                  )}

                  {isPronto && (
                    <button
                      type="button"
                      onClick={() => marcarBalcaoRetirado(p.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-[0.98] transition-all animate-pulse"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Retirado
                    </button>
                  )}

                  {(isPronto || isRetirado) && (
                    <button
                      type="button"
                      onClick={() => onPagar(p.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 py-2.5 text-xs font-bold text-purple-400 hover:bg-purple-500/20 active:scale-[0.98] transition-all"
                    >
                      💰 Pagar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CaixaPedidosFastFoodPanel;
