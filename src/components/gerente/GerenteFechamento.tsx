import { AlertTriangle, Banknote, CreditCard, Smartphone, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import type { FechamentoConta, MovimentacaoCaixa } from "@/types/restaurant";
import type { PaymentMethod } from "@/types/operations";

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote; color: string; bg: string }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { value: "credito", label: "Crédito", icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/15" },
  { value: "debito", label: "Débito", icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/15" },
  { value: "pix", label: "PIX", icon: Smartphone, color: "text-purple-400", bg: "bg-purple-500/15" },
];

interface GerenteFechamentoProps {
  pinVerificado: boolean;
  pinGateUI: React.ReactNode;
  fechamentos: FechamentoConta[];
  movimentacoesCaixa: MovimentacaoCaixa[];
  fundoTroco: number;
  caixaAberto: boolean;
  onFecharDia: () => void;
}

const GerenteFechamento = ({
  pinVerificado,
  pinGateUI,
  fechamentos,
  movimentacoesCaixa,
  fundoTroco,
  caixaAberto,
  onFecharDia,
}: GerenteFechamentoProps) => {
  const activeFech = fechamentos.filter(f => !f.cancelado);
  const sumByMethod = (method: PaymentMethod) =>
    activeFech.reduce((acc, f) => {
      const pags = f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }];
      return acc + pags.filter(p => p.formaPagamento === method).reduce((a, p) => a + p.valor, 0);
    }, 0);

  const totalVendas = activeFech.reduce((acc, f) => acc + f.total, 0);
  const entradasExtras = movimentacoesCaixa.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + m.valor, 0);
  const saidas = movimentacoesCaixa.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + m.valor, 0);
  const dinheiroEmCaixa = fundoTroco + sumByMethod("dinheiro") + entradasExtras - saidas;

  if (!pinVerificado) return <>{pinGateUI}</>;

  const paymentCards = (
    <div className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Vendas por forma de pagamento</h2>
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((pm) => {
          const Icon = pm.icon;
          const total = sumByMethod(pm.value);
          return (
            <div key={pm.value} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pm.bg} ${pm.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">{pm.label}</p>
                <p className={`text-lg font-black tabular-nums ${pm.color}`}>{formatPrice(total)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const summaryBlock = (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-foreground">Faturamento do dia</span>
        <span className="text-lg font-black tabular-nums text-primary">{formatPrice(totalVendas)}</span>
      </div>
      <div className="border-t border-border my-2" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Fundo de troco</span>
        <span className="font-bold tabular-nums text-foreground">{formatPrice(fundoTroco)}</span>
      </div>
      {entradasExtras > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Entradas extras</span>
          <span className="font-bold tabular-nums text-emerald-400">+ {formatPrice(entradasExtras)}</span>
        </div>
      )}
      {saidas > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saídas (sangria)</span>
          <span className="font-bold tabular-nums text-destructive">- {formatPrice(saidas)}</span>
        </div>
      )}
      <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
        <span className="text-base font-black text-foreground">Total em caixa (gaveta)</span>
        <span className="text-2xl font-black tabular-nums text-primary">{formatPrice(dinheiroEmCaixa)}</span>
      </div>
    </div>
  );

  if (!caixaAberto) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-lg font-black text-foreground">Caixa fechado</h2>
          <p className="text-sm text-muted-foreground">O caixa do dia foi encerrado. Para abrir um novo turno, acesse a tela do Caixa.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Resumo do último turno</h2>
        </div>
        {paymentCards}
        {summaryBlock}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {paymentCards}
      {summaryBlock}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full h-12 rounded-xl text-base font-black gap-2">
            <XCircle className="h-5 w-5" />
            Fechar caixa do dia
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar fechamento do dia
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá zerar todas as mesas, limpar movimentações e fechamentos do turno. Os logs de auditoria serão preservados. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onFecharDia} className="rounded-xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GerenteFechamento;
