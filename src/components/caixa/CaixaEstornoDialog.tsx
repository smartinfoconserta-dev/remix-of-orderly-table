import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CaixaEstornoDialogProps {
  open: boolean;
  onClose: () => void;
  estornoMotivo: string;
  setEstornoMotivo: (v: string) => void;
  estornoNome: string;
  setEstornoNome: (v: string) => void;
  estornoPin: string;
  setEstornoPin: (v: string) => void;
  estornoError: string | null;
  onConfirmar: () => void;
}

const CaixaEstornoDialog = ({
  open,
  onClose,
  estornoMotivo,
  setEstornoMotivo,
  estornoNome,
  setEstornoNome,
  estornoPin,
  setEstornoPin,
  estornoError,
  onConfirmar,
}: CaixaEstornoDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-destructive/5">
          <p className="text-base font-black text-destructive">↩️ Estornar fechamento</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            O fechamento é marcado como cancelado e registrado no log. Não remove o valor do caixa.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Motivo do estorno (obrigatório)</label>
            <Input
              value={estornoMotivo}
              onChange={e => setEstornoMotivo(e.target.value)}
              placeholder="Ex.: pagamento incorreto, cliente reclamou..."
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Nome do gerente</label>
              <Input
                value={estornoNome}
                onChange={e => setEstornoNome(e.target.value)}
                placeholder="Nome"
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">PIN</label>
              <Input
                value={estornoPin}
                onChange={e => setEstornoPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                type="password"
                inputMode="numeric"
                placeholder="••••"
                className="h-10 rounded-xl text-sm text-center tracking-widest font-black"
              />
            </div>
          </div>
          {estornoError && (
            <p className="text-xs text-destructive font-bold">{estornoError}</p>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" className="flex-1 rounded-xl font-black" onClick={onConfirmar}>
            Confirmar estorno
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CaixaEstornoDialog;
