import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CaixaRejectDialogProps {
  open: boolean;
  onClose: () => void;
  motivo: string;
  setMotivo: (v: string) => void;
  onConfirm: () => void;
}

const CaixaRejectDialog = ({
  open,
  onClose,
  motivo,
  setMotivo,
  onConfirm,
}: CaixaRejectDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Rejeitar pedido
          </DialogTitle>
          <DialogDescription>Informe o motivo da rejeição.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Motivo *</label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Produto indisponível, endereço fora da área..."
              maxLength={200}
              className="min-h-[80px] rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!motivo.trim()}
            onClick={onConfirm}
            className="rounded-xl font-black"
          >
            Confirmar rejeição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaixaRejectDialog;
