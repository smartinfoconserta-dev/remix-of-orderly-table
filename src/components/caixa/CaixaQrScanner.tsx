import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CaixaQrScannerProps {
  open: boolean;
  onClose: () => void;
  input: string;
  setInput: (v: string) => void;
  onScan: (value: string) => void;
}

const CaixaQrScanner = ({ open, onClose, input, setInput, onScan }: CaixaQrScannerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leitura de QR Code</DialogTitle>
          <DialogDescription>
            Escaneie o cupom do cliente ou digite o código
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Aguardando leitura..."
            className="text-lg font-mono h-12"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onScan(input);
                setInput("");
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
          />
          <p className="text-xs text-muted-foreground text-center">
            O leitor USB envia os dados como digitação. Pressione Enter ou escaneie.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaixaQrScanner;
