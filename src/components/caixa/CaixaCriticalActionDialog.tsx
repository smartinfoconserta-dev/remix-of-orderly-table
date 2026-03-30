import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CaixaCriticalActionDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  buttonLabel?: string;
  managerName: string;
  setManagerName: (v: string) => void;
  managerPin: string;
  setManagerPin: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  error: string | null;
  isLoading: boolean;
  onConfirm: () => void;
}

const CaixaCriticalActionDialog = ({
  open,
  onClose,
  title,
  description,
  buttonLabel,
  managerName,
  setManagerName,
  managerPin,
  setManagerPin,
  reason,
  setReason,
  error,
  isLoading,
  onConfirm,
}: CaixaCriticalActionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
            <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
            <Input value={managerPin} onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 a 6 dígitos" inputMode="numeric" autoComplete="one-time-code" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Motivo da ação</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo obrigatório desta ação" maxLength={180} className="min-h-[110px] rounded-xl" />
          </div>
          {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">Voltar</Button>
          <Button variant="destructive" onClick={onConfirm} className="rounded-xl font-black" disabled={isLoading}>
            {buttonLabel ?? "Autorizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaixaCriticalActionDialog;
