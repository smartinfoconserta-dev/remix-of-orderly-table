/**
 * CaixaMovimentacaoDialog — extracted from CaixaPage lines ~3832-3965.
 * Desktop: fullscreen side panel. Mobile: Dialog.
 * NO logic changes from original.
 */
import { X } from "lucide-react";
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
import { formatPrice, parseCurrencyInput } from "./caixaHelpers";
import type { CashMovementType } from "@/types/operations";

interface MovimentacaoItem {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  criadoEm: string;
}

interface CaixaMovimentacaoDialogProps {
  movModalOpen: boolean;
  setMovModalOpen: (v: boolean) => void;
  movTipo: CashMovementType;
  setMovTipo: (v: CashMovementType) => void;
  movDescricao: string;
  setMovDescricao: (v: string) => void;
  movValor: string;
  setMovValor: (v: string) => void;
  movConfirmStep: boolean;
  setMovConfirmStep: (v: boolean) => void;
  isDesktop: boolean;
  handleRegistrarMovimentacao: () => void;
  movimentacoesCaixa: MovimentacaoItem[];
}

const MovimentacaoFormContent = ({
  movTipo, setMovTipo, movDescricao, setMovDescricao,
  movValor, setMovValor, movConfirmStep, setMovConfirmStep,
  handleRegistrarMovimentacao, movimentacoesCaixa,
}: Pick<CaixaMovimentacaoDialogProps,
  'movTipo' | 'setMovTipo' | 'movDescricao' | 'setMovDescricao' |
  'movValor' | 'setMovValor' | 'movConfirmStep' | 'setMovConfirmStep' |
  'handleRegistrarMovimentacao' | 'movimentacoesCaixa'
>) => {
  if (movConfirmStep) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-center space-y-1">
          <p className="font-black text-foreground">Confirma {movTipo === "saida" ? "sangria" : "suprimento"} de {formatPrice(parseCurrencyInput(movValor) || 0)}?</p>
          <p className="text-muted-foreground">Motivo: {movDescricao}</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setMovConfirmStep(false)} className="rounded-xl font-bold">Voltar</Button>
          <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Confirmar</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Tipo</label>
        <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as CashMovementType)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          <option value="entrada">Suprimento (entrada)</option>
          <option value="saida">Sangria (saída)</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Motivo / Descrição *</label>
        <Input value={movDescricao} onChange={(e) => setMovDescricao(e.target.value)} placeholder="Ex.: Troco para entrega, Reforço de caixa" maxLength={100} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Valor (R$) *</label>
        <Input value={movValor} onChange={(e) => setMovValor(e.target.value)} placeholder="0,00" inputMode="decimal" className="text-lg font-black" onKeyDown={(e) => e.key === "Enter" && handleRegistrarMovimentacao()} />
      </div>
      {movimentacoesCaixa.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Últimas movimentações</p>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {movimentacoesCaixa.slice(0, 5).map((mov) => (
              <div key={mov.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                <span className={`font-black tabular-nums ${mov.tipo === "entrada" ? "text-emerald-400" : "text-destructive"}`}>{mov.tipo === "entrada" ? "Suprimento" : "Sangria"}</span>
                <span className="font-black tabular-nums text-foreground">{formatPrice(mov.valor)}</span>
                <span className="flex-1 truncate text-muted-foreground">{mov.descricao}</span>
                <span className="tabular-nums text-muted-foreground/60">{mov.criadoEm}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const CaixaMovimentacaoDialog = (props: CaixaMovimentacaoDialogProps) => {
  const {
    movModalOpen, setMovModalOpen,
    movTipo, setMovTipo, movDescricao, setMovDescricao,
    movValor, setMovValor, movConfirmStep, setMovConfirmStep,
    isDesktop, handleRegistrarMovimentacao, movimentacoesCaixa,
  } = props;

  const formProps = {
    movTipo, setMovTipo, movDescricao, setMovDescricao,
    movValor, setMovValor, movConfirmStep, setMovConfirmStep,
    handleRegistrarMovimentacao, movimentacoesCaixa,
  };

  if (isDesktop) {
    return movModalOpen ? (
      <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
        <div className="flex-1 bg-foreground/60" onClick={() => { setMovModalOpen(false); setMovConfirmStep(false); }} />
        <div className="w-[480px] h-screen bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
          <header className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
            <div>
              <h2 className="text-base font-black text-foreground">Registrar movimentação</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Sangria (saída) ou suprimento (entrada) de valores no caixa.</p>
            </div>
            <button onClick={() => { setMovModalOpen(false); setMovConfirmStep(false); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <MovimentacaoFormContent {...formProps} />
          </div>
          {!movConfirmStep && (
            <footer className="border-t border-border px-5 py-4 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setMovModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Registrar</Button>
            </footer>
          )}
        </div>
      </div>
    ) : null;
  }

  return (
    <Dialog open={movModalOpen} onOpenChange={(open) => { if (!open) { setMovModalOpen(false); setMovConfirmStep(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimentação</DialogTitle>
          <DialogDescription>Sangria (saída) ou suprimento (entrada) de valores no caixa.</DialogDescription>
        </DialogHeader>
        {movConfirmStep ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-center space-y-1">
              <p className="font-black text-foreground">Confirma {movTipo === "saida" ? "sangria" : "suprimento"} de {formatPrice(parseCurrencyInput(movValor) || 0)}?</p>
              <p className="text-muted-foreground">Motivo: {movDescricao}</p>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setMovConfirmStep(false)} className="rounded-xl font-bold">Voltar</Button>
              <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Confirmar</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <MovimentacaoFormContent {...formProps} />
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setMovModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Registrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CaixaMovimentacaoDialog;
