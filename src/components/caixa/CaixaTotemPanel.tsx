/**
 * CaixaTotemPanel — extracted from CaixaPage lines ~2133-2316.
 * NO logic changes from original.
 */
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "./caixaHelpers";
import type { OperationalUser } from "@/types/operations";

interface PedidoBalcao {
  id: string;
  numeroPedido: number;
  clienteNome?: string;
  statusBalcao?: string;
  canceladoMotivo?: string;
  total: number;
  itens: Array<{ uid: string; nome: string; quantidade: number }>;
  criadoEmIso: string;
  [key: string]: any;
}

interface CaixaTotemPanelProps {
  pedidosTotem: PedidoBalcao[];
  pedidosTotemAtivos: PedidoBalcao[];
  isFastFoodGlobal: boolean;
  pedidosAguardandoConfirmacao: PedidoBalcao[];
  marcarBalcaoRetirado: (id: string) => void;
  cancelarPedidoBalcao: (id: string, motivo: string, operador: OperationalUser) => void;
  verifyEmployeeAccess: (nome: string, pin: string) => Promise<{ ok: boolean; error?: string; user?: any }>;
  currentCaixa: OperationalUser | null;
  currentGerente: OperationalUser | null;
  setCaixaView: (v: "mesas" | "delivery" | "totem" | "historico" | "ifood") => void;
  totemCancelOpen: string | null;
  setTotemCancelOpen: (v: string | null) => void;
  totemCancelMotivo: string;
  setTotemCancelMotivo: (v: string) => void;
  totemCancelPin: string;
  setTotemCancelPin: (v: string) => void;
  totemCancelError: string | null;
  setTotemCancelError: (v: string | null) => void;
  totemCancelLoading: boolean;
  setTotemCancelLoading: (v: boolean) => void;
}

const CaixaTotemPanel = ({
  pedidosTotem, pedidosTotemAtivos,
  isFastFoodGlobal, pedidosAguardandoConfirmacao,
  marcarBalcaoRetirado, cancelarPedidoBalcao, verifyEmployeeAccess,
  currentCaixa, currentGerente, setCaixaView,
  totemCancelOpen, setTotemCancelOpen,
  totemCancelMotivo, setTotemCancelMotivo,
  totemCancelPin, setTotemCancelPin,
  totemCancelError, setTotemCancelError,
  totemCancelLoading, setTotemCancelLoading,
}: CaixaTotemPanelProps) => {
  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xl">🖥️</span>
        <h2 className="text-base font-black text-foreground flex-1">Pedidos do Totem</h2>
        <span className="text-xs text-muted-foreground">{pedidosTotemAtivos.length} ativo{pedidosTotemAtivos.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Alerta de delivery pendente no modo fast food */}
      {isFastFoodGlobal && pedidosAguardandoConfirmacao.length > 0 && (
        <button
          onClick={() => setCaixaView("delivery")}
          className="w-full rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4 flex items-center gap-3 hover:bg-amber-500/15 transition-colors animate-pulse"
        >
          <Bell className="h-6 w-6 text-amber-400 shrink-0" />
          <div className="text-left flex-1">
            <p className="text-sm font-black text-amber-400">
              {pedidosAguardandoConfirmacao.length} pedido{pedidosAguardandoConfirmacao.length > 1 ? "s" : ""} delivery aguardando confirmação
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Toque para ver e confirmar com taxa + tempo</p>
          </div>
          <span className="text-2xl">🛵</span>
        </button>
      )}

      {pedidosTotem.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <span className="text-5xl opacity-20">🖥️</span>
          <p className="text-sm font-semibold">Nenhum pedido do totem no momento</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {pedidosTotem.map((pt) => {
            const isCancelado = pt.statusBalcao === "cancelado";
            const isRetirado = pt.statusBalcao === "retirado";
            const isPronto = pt.statusBalcao === "pronto";
            const isPreparando = pt.statusBalcao === "preparando";
            return (
              <div
                key={pt.id}
                className={`rounded-2xl border p-5 space-y-3 ${
                  isCancelado ? "opacity-50 border-red-500/30 bg-red-500/5"
                  : isRetirado ? "opacity-50 border-border bg-secondary/30"
                  : isPronto ? "border-emerald-500/50 bg-emerald-500/5"
                  : isPreparando ? "border-amber-500/50 bg-amber-500/5"
                  : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black tabular-nums" style={{ color: "#FF6B00" }}>
                    #{String(pt.numeroPedido).padStart(3, "0")}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    isCancelado ? "border-red-500/25 bg-red-500/10 text-red-400"
                    : isRetirado ? "border-border bg-muted text-muted-foreground"
                    : isPronto ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                    : isPreparando ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                  }`}>
                    {isCancelado ? "CANCELADO" : isRetirado ? "Retirado" : isPronto ? "PRONTO ✓" : isPreparando ? "Preparando..." : "Aberto"}
                  </span>
                </div>

                <div className="text-sm text-foreground">
                  {pt.itens.map((it) => (
                    <span key={it.uid} className="mr-2">
                      {it.quantidade}x {it.nome}
                    </span>
                  ))}
                </div>

                <div className="text-lg font-black tabular-nums text-foreground">
                  {formatPrice(pt.total)}
                </div>

                {isCancelado && pt.canceladoMotivo && (
                  <p className="text-xs text-red-400">Motivo: {pt.canceladoMotivo}</p>
                )}

                {isPronto && (
                  <button
                    type="button"
                    onClick={() => marcarBalcaoRetirado(pt.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Retirado
                  </button>
                )}

                {!isCancelado && !isRetirado && (
                  <button
                    type="button"
                    onClick={() => { setTotemCancelOpen(pt.id); setTotemCancelMotivo(""); setTotemCancelPin(""); setTotemCancelError(null); }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel modal */}
      {totemCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-black text-foreground">Cancelar pedido</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Motivo do cancelamento *</label>
                <textarea
                  value={totemCancelMotivo}
                  onChange={(e) => setTotemCancelMotivo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground resize-none"
                  rows={2}
                  placeholder="Descreva o motivo..."
                  maxLength={200}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Sua senha (PIN) *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={totemCancelPin}
                  onChange={(e) => setTotemCancelPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
                  placeholder="PIN de 4-6 dígitos"
                  maxLength={6}
                />
              </div>
              {totemCancelError && (
                <p className="text-xs font-bold text-destructive">{totemCancelError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTotemCancelOpen(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={totemCancelLoading || !totemCancelMotivo.trim() || totemCancelPin.length < 4}
                onClick={async () => {
                  if (totemCancelPin.length < 4) { setTotemCancelError("PIN inválido"); return; }
                  setTotemCancelLoading(true);
                  setTotemCancelError(null);
                  const operadorNome = currentCaixa?.nome || currentGerente?.nome || "";
                  const result = await verifyEmployeeAccess(operadorNome, totemCancelPin);
                  if (!result.ok) { setTotemCancelError(result.error ?? "PIN incorreto"); setTotemCancelLoading(false); return; }
                  cancelarPedidoBalcao(totemCancelOpen!, totemCancelMotivo.trim(), {
                    id: result.user?.id || "unknown",
                    nome: result.user?.nome || operadorNome,
                    role: (result.user?.role as any) || "caixa",
                    criadoEm: new Date().toISOString(),
                  });
                  setTotemCancelOpen(null);
                  setTotemCancelLoading(false);
                }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                {totemCancelLoading ? "Verificando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaixaTotemPanel;
