/**
 * CaixaTurnoReport — extracted from CaixaPage.
 * Includes: desktop fullscreen, mobile dialog, and close dialog (both variants).
 * NO logic changes from original.
 */
import { LockKeyhole, ReceiptText, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatPrice, parseCurrencyInput, paymentMethodOptions } from "./caixaHelpers";

interface ResumoFinanceiro {
  totalDia: number;
  dinheiro: number;
  credito: number;
  debito: number;
  pix: number;
  entradasExtras: number;
  saidas: number;
}

interface ResumoDeliveryTurno {
  totalEntregas: number;
  conferidos: number;
  pendentes: number;
  totalConferido: number;
  motoboyNomes: string[];
}

interface PedidoBalcao {
  id: string;
  numeroPedido: number;
  statusBalcao?: string;
  total: number;
  origem: string;
  formaPagamentoDelivery?: string;
  motoboyNome?: string;
  [key: string]: any;
}

interface FechamentoItem {
  id: string;
  total: number;
  cancelado?: boolean;
  [key: string]: any;
}

interface CaixaTurnoReportProps {
  turnoReportOpen: boolean;
  setTurnoReportOpen: (v: boolean) => void;
  turnoModalOpen: boolean;
  setTurnoModalOpen: (v: boolean) => void;
  turnoManagerName: string;
  setTurnoManagerName: (v: string) => void;
  turnoManagerPin: string;
  setTurnoManagerPin: (v: string) => void;
  turnoError: string | null;
  setTurnoError: (v: string | null) => void;
  isClosingTurno: boolean;
  dinheiroContado: string;
  setDinheiroContado: (v: string) => void;
  motivoDiferenca: string;
  setMotivoDiferenca: (v: string) => void;
  isDesktop: boolean;
  resumoFinanceiro: ResumoFinanceiro;
  fundoTroco: number;
  caixaAberto: boolean;
  caixaOpenTime: string | null;
  clockStr: string;
  pedidosBalcao: PedidoBalcao[];
  fechamentos: FechamentoItem[];
  movimentacoesCaixa: Array<{ id: string; tipo: string; valor: number; descricao: string; criadoEm: string }>;
  resumoDeliveryTurno: ResumoDeliveryTurno;
  handleCloseTurno: () => void;
  accessMode: string;
  currentOperatorNome: string;
}

const CaixaTurnoReport = ({
  turnoReportOpen, setTurnoReportOpen,
  turnoModalOpen, setTurnoModalOpen,
  turnoManagerName, setTurnoManagerName,
  turnoManagerPin, setTurnoManagerPin,
  turnoError, setTurnoError,
  isClosingTurno, dinheiroContado, setDinheiroContado,
  motivoDiferenca, setMotivoDiferenca,
  isDesktop, resumoFinanceiro, fundoTroco,
  caixaOpenTime, clockStr,
  pedidosBalcao, fechamentos, movimentacoesCaixa,
  resumoDeliveryTurno,
  handleCloseTurno, accessMode, currentOperatorNome,
}: CaixaTurnoReportProps) => {

  const openCloseModal = () => {
    setTurnoReportOpen(false);
    setTurnoModalOpen(true);
    setTurnoManagerName(accessMode === "gerente" ? currentOperatorNome : "");
    setTurnoManagerPin("");
    setTurnoError(null);
  };

  /* ── Shared content: payment summary cards ── */
  const renderPaymentSummaryCards = () => (
    <div className="grid grid-cols-2 gap-3">
      {paymentMethodOptions.map((pm) => {
        const val = resumoFinanceiro[pm.value as keyof typeof resumoFinanceiro] as number;
        return (
          <div key={pm.value} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${pm.bgColor} ${pm.color}`}>
              {(() => { const Icon = pm.icon; return <Icon className="h-4 w-4" />; })()}
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">{pm.label}</p>
              <p className={`text-sm font-black tabular-nums ${pm.color}`}>{formatPrice(val)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Shared content: financial summary ── */
  const renderFinancialSummary = (compact = false) => (
    <div className={`rounded-xl border border-border bg-card ${compact ? "p-4 space-y-2 text-sm" : "p-6 space-y-3"}`}>
      <div className="flex justify-between"><span className="text-muted-foreground">Sangrias (saídas)</span><span className="font-black tabular-nums text-destructive">{formatPrice(resumoFinanceiro.saidas)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Suprimentos (entradas)</span><span className="font-black tabular-nums text-emerald-400">{formatPrice(resumoFinanceiro.entradasExtras)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Fundo de troco inicial</span><span className="font-black tabular-nums text-foreground">{formatPrice(fundoTroco)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Comandas fechadas</span><span className="font-black tabular-nums text-foreground">{fechamentos.length}</span></div>
      {movimentacoesCaixa.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Movimentações</p>
          {movimentacoesCaixa.slice(0, 5).map((mov) => (
            <div key={mov.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground truncate flex-1">{mov.tipo === "entrada" ? "↑ Suprimento" : "↓ Sangria"} — {mov.descricao}</span>
              <span className={`font-bold tabular-nums ml-2 ${mov.tipo === "entrada" ? "text-emerald-400" : "text-destructive"}`}>{formatPrice(mov.valor)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-border pt-2 flex justify-between">
        <span className="font-black text-foreground">Total líquido em caixa</span>
        <span className="font-black tabular-nums text-primary text-lg">{formatPrice(fundoTroco + resumoFinanceiro.totalDia + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas)}</span>
      </div>
    </div>
  );

  /* ── Shared: Cash count section ── */
  const CashCountSection = ({ compact = false }: { compact?: boolean }) => (
    <div className={`rounded-xl border border-border bg-card ${compact ? "p-4 space-y-3" : "p-6 space-y-4"}`}>
      <h3 className={`${compact ? "text-sm" : "text-base"} font-black text-foreground`}>Conferência de caixa</h3>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-muted-foreground">Dinheiro contado em caixa (R$)</label>
        <Input value={dinheiroContado} onChange={(e) => setDinheiroContado(e.target.value)} placeholder="0,00" inputMode="decimal" className={`text-lg font-black h-12 rounded-xl ${compact ? "" : "max-w-xs"}`} />
      </div>
      {(() => {
        const contado = parseCurrencyInput(dinheiroContado);
        const esperado = fundoTroco + resumoFinanceiro.dinheiro + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas;
        if (!Number.isFinite(contado)) return null;
        const diff = contado - esperado;
        return (
          <div className="space-y-1">
            <div className={`flex justify-between ${compact ? "text-xs" : "text-sm"} text-muted-foreground`}>
              <span>Total esperado em dinheiro</span>
              <span className="font-black tabular-nums">{formatPrice(esperado)}</span>
            </div>
            <div className={`flex justify-between items-center rounded-lg ${compact ? "p-2" : "p-3"} ${diff === 0 ? "bg-emerald-500/10" : diff > 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
              <span className="text-sm font-black">{diff === 0 ? "✓ Caixa bateu — sem diferença" : diff > 0 ? `↑ Sobra de ${formatPrice(diff)} — registrar motivo` : `↓ Falta de ${formatPrice(Math.abs(diff))} — registrar motivo`}</span>
              <span className={`text-sm font-black tabular-nums ${diff === 0 ? "text-emerald-400" : diff > 0 ? "text-emerald-400" : "text-destructive"}`}>
                {diff === 0 ? "R$ 0,00" : diff > 0 ? `+${formatPrice(diff)}` : formatPrice(diff)}
              </span>
            </div>
            {diff !== 0 && (
              <div className="space-y-1 mt-2">
                <label className="text-xs font-bold text-muted-foreground">
                  Motivo da diferença (opcional)
                </label>
                <Input
                  value={motivoDiferenca}
                  onChange={e => setMotivoDiferenca(e.target.value)}
                  placeholder={diff > 0 ? "Ex: troco esquecido na gaveta" : "Ex: troco devolvido a menos"}
                  className="h-9 rounded-xl text-sm"
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  /* ── Shared: Delivery do turno ── */
  const DeliveryTurnoSection = ({ compact = false }: { compact?: boolean }) => {
    const deliveryPedidos = pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao !== "aguardando_confirmacao");
    if (deliveryPedidos.length === 0) return null;
    const entregues = deliveryPedidos.filter(p => p.statusBalcao === "entregue" || p.statusBalcao === "pago");
    const devolvidos = deliveryPedidos.filter(p => p.statusBalcao === "devolvido");
    const emAberto = deliveryPedidos.filter(p => p.statusBalcao === "saiu" || p.statusBalcao === "pronto" || p.statusBalcao === "aberto");
    const totalDelivery = entregues.reduce((s, p) => s + p.total, 0);
    const dinheiroDelivery = entregues.filter((p) => p.formaPagamentoDelivery === "dinheiro").reduce((s, p) => s + p.total, 0);
    const outrosDelivery = totalDelivery - dinheiroDelivery;
    return (
      <div className={`rounded-xl border border-border bg-card ${compact ? "p-4 space-y-2 text-sm" : "p-6 space-y-3 text-sm"}`}>
        <h3 className={`${compact ? "text-sm" : "text-base"} font-black text-foreground flex items-center gap-2`}>
          <Truck className="h-4 w-4 text-primary" /> Delivery do turno
        </h3>
        <div className="flex justify-between"><span className="text-muted-foreground">Pedidos entregues</span><span className="font-black tabular-nums text-foreground">{entregues.length}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total delivery</span><span className="font-black tabular-nums text-primary">{formatPrice(totalDelivery)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{compact ? "Em dinheiro (motoboy)" : "Em dinheiro (motoboy presta contas)"}</span><span className="font-black tabular-nums text-amber-400">{formatPrice(dinheiroDelivery)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{compact ? "PIX/cartão" : "PIX/cartão (já liquidado)"}</span><span className="font-black tabular-nums text-emerald-400">{formatPrice(outrosDelivery)}</span></div>
        {devolvidos.length > 0 && (
          <div className="flex justify-between"><span className="text-orange-400">Devolvidos{compact ? "" : " sem entrega"}</span><span className="font-bold tabular-nums text-orange-400">{devolvidos.length}</span></div>
        )}
        {emAberto.length > 0 && (
          <div className="flex justify-between"><span className="text-amber-400">{compact ? "Em rota" : "Ainda em rota / aguardando"}</span><span className="font-bold tabular-nums text-amber-400">{emAberto.length}</span></div>
        )}
      </div>
    );
  };

  /* ── Shared: Motoboy fechamentos ── */
  const MotoboyFechamentosSection = ({ compact = false }: { compact?: boolean }) => {
    if (resumoDeliveryTurno.totalEntregas <= 0) return null;
    return (
      <div className={`rounded-xl border border-blue-500/20 bg-blue-500/5 ${compact ? "p-4 space-y-2" : "p-6 space-y-3"}`}>
        <p className={`${compact ? "text-xs" : "text-sm"} font-black text-blue-400 flex items-center gap-1.5`}>
          🏍️ Fechamentos de motoboys
        </p>
        <div className={`space-y-1${compact ? "" : ".5"} ${compact ? "text-xs" : "text-sm"}`}>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entregas realizadas</span>
            <span className="font-bold">{resumoDeliveryTurno.totalEntregas}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fechamentos conferidos</span>
            <span className="font-bold text-emerald-400">{resumoDeliveryTurno.conferidos}</span>
          </div>
          {resumoDeliveryTurno.pendentes > 0 && (
            <div className="flex justify-between">
              <span className="text-amber-400 font-bold">⚠ Aguardando conferência</span>
              <span className="font-black text-amber-400">{resumoDeliveryTurno.pendentes}</span>
            </div>
          )}
          <div className={`flex justify-between border-t border-blue-500/20 pt-1${compact ? "" : ".5"}`}>
            <span className="font-bold text-foreground">Total delivery conferido</span>
            <span className="font-black tabular-nums text-blue-400">{formatPrice(resumoDeliveryTurno.totalConferido)}</span>
          </div>
          {resumoDeliveryTurno.motoboyNomes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Motoboys ativos</span>
              <span className="font-bold text-right">{resumoDeliveryTurno.motoboyNomes.join(", ")}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Turno Close Modal content ── */
  const TurnoCloseContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
        <Input value={turnoManagerName} onChange={(e) => setTurnoManagerName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
        <Input value={turnoManagerPin} onChange={(e) => setTurnoManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 a 6 dígitos" inputMode="numeric" autoComplete="one-time-code" onKeyDown={(e) => e.key === "Enter" && handleCloseTurno()} />
      </div>
      {turnoError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{turnoError}</p>}
    </div>
  );

  return (
    <>
      {/* ── TURNO REPORT ── */}
      {isDesktop ? (
        turnoReportOpen && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
            <header className="flex items-center gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
              <ReceiptText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black text-foreground flex-1">Relatório do turno</h2>
              <p className="text-sm text-muted-foreground">Confira o resumo antes de fechar o turno.</p>
              <button onClick={() => setTurnoReportOpen(false)} className="ml-4 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-8 space-y-6">
                <PaymentSummaryCards />
                <FinancialSummary />
                <CashCountSection />
                <DeliveryTurnoSection />
                <MotoboyFechamentosSection />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Aberto: {caixaOpenTime || "—"}</span>
                  <span>Agora: {clockStr}</span>
                </div>
              </div>
            </div>
            <footer className="border-t border-border bg-card px-8 py-4 flex items-center justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setTurnoReportOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button variant="destructive" onClick={openCloseModal} className="rounded-xl font-black">
                Prosseguir com fechamento
              </Button>
            </footer>
          </div>
        )
      ) : (
        <Dialog open={turnoReportOpen} onOpenChange={setTurnoReportOpen}>
          <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Relatório do turno
              </DialogTitle>
              <DialogDescription>Confira o resumo antes de fechar o turno.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <PaymentSummaryCards />
              <FinancialSummary compact />
              <CashCountSection compact />
              <DeliveryTurnoSection compact />
              <MotoboyFechamentosSection compact />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Aberto: {caixaOpenTime || "—"}</span>
                <span>Agora: {clockStr}</span>
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setTurnoReportOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button variant="destructive" onClick={openCloseModal} className="rounded-xl font-black">
                Prosseguir com fechamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── TURNO CLOSE MODAL ── */}
      {isDesktop ? (
        turnoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-foreground/80" onClick={() => { setTurnoModalOpen(false); setTurnoError(null); }} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-black text-foreground flex-1">Fechar turno</h2>
                <button onClick={() => { setTurnoModalOpen(false); setTurnoError(null); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Autorização de gerente necessária para confirmar o fechamento.</p>
              <TurnoCloseContent />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setTurnoModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button variant="destructive" onClick={handleCloseTurno} className="rounded-xl font-black" disabled={isClosingTurno}>
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        <Dialog open={turnoModalOpen} onOpenChange={(open) => { if (!open) { setTurnoModalOpen(false); setTurnoError(null); } }}>
          <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-destructive" />
                Fechar turno
              </DialogTitle>
              <DialogDescription>Autorização de gerente necessária para confirmar o fechamento.</DialogDescription>
            </DialogHeader>
            <TurnoCloseContent />
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setTurnoModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button variant="destructive" onClick={handleCloseTurno} className="rounded-xl font-black" disabled={isClosingTurno}>
                Confirmar fechamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CaixaTurnoReport;
