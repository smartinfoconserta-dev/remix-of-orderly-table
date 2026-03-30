import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, parseCurrencyInput } from "./caixaHelpers";

interface CaixaDescontoDialogProps {
  open: boolean;
  onClose: () => void;
  descontoTipo: "percentual" | "valor";
  setDescontoTipo: (v: "percentual" | "valor") => void;
  descontoInput: string;
  setDescontoInput: (v: string) => void;
  descontoMotivo: string;
  setDescontoMotivo: (v: string) => void;
  descontoManagerName: string;
  setDescontoManagerName: (v: string) => void;
  descontoManagerPin: string;
  setDescontoManagerPin: (v: string) => void;
  descontoError: string | null;
  mesaTotal: number;
  onAplicar: () => void;
}

const CaixaDescontoDialog = ({
  open,
  onClose,
  descontoTipo,
  setDescontoTipo,
  descontoInput,
  setDescontoInput,
  descontoMotivo,
  setDescontoMotivo,
  descontoManagerName,
  setDescontoManagerName,
  descontoManagerPin,
  setDescontoManagerPin,
  descontoError,
  mesaTotal,
  onAplicar,
}: CaixaDescontoDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-base font-black">🎁 Aplicar desconto</p>
          <p className="text-xs text-muted-foreground mt-0.5">Requer autorização do gerente</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["percentual", "valor"] as const).map(t => (
              <button key={t} onClick={() => setDescontoTipo(t)}
                className={`rounded-xl border py-2.5 text-sm font-black transition-colors ${descontoTipo === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {t === "percentual" ? "% Percentual" : "R$ Valor fixo"}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">
              {descontoTipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}
            </label>
            <Input value={descontoInput} onChange={e => setDescontoInput(e.target.value)}
              placeholder={descontoTipo === "percentual" ? "Ex.: 10" : "Ex.: 15,00"}
              inputMode="decimal" className="h-11 rounded-xl font-bold text-lg" />
            {descontoTipo === "percentual" && (() => {
              const pct = parseCurrencyInput(descontoInput);
              if (!Number.isFinite(pct) || pct <= 0) return null;
              return <p className="text-xs text-primary font-bold">= {formatPrice(mesaTotal * (pct / 100))} de desconto</p>;
            })()}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Motivo (obrigatório)</label>
            <Input value={descontoMotivo} onChange={e => setDescontoMotivo(e.target.value)}
              placeholder="Ex.: cliente VIP, cortesia, erro no pedido" className="h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Nome do gerente</label>
              <Input value={descontoManagerName} onChange={e => setDescontoManagerName(e.target.value)}
                placeholder="Nome" className="h-10 rounded-xl text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">PIN</label>
              <Input value={descontoManagerPin} onChange={e => setDescontoManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                type="password" inputMode="numeric" placeholder="••••"
                className="h-10 rounded-xl text-sm text-center tracking-widest font-black" />
            </div>
          </div>
          {descontoError && <p className="text-xs text-destructive font-bold">{descontoError}</p>}
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 rounded-xl font-black" onClick={onAplicar}>Aplicar desconto</Button>
        </div>
      </div>
    </div>
  );
};

export default CaixaDescontoDialog;
