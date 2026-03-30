import { Check, Smartphone, Truck } from "lucide-react";
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
import { formatPrice } from "./caixaHelpers";
import type { ItemCarrinho } from "@/types/restaurant";
import type { PaymentMethod } from "@/types/operations";

interface CaixaDeliveryConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  itens: ItemCarrinho[];
  sistemaConfig: { taxaEntrega?: number; tempoEntrega?: string };
  balcaoClienteNome: string;
  balcaoEndereco: string;
  balcaoNumero: string;
  balcaoBairro: string;
  balcaoTelefone: string;
  balcaoFormaPag: PaymentMethod;
  setBalcaoFormaPag: (v: PaymentMethod) => void;
  balcaoTroco: string;
  setBalcaoTroco: (v: string) => void;
  deliveryTempoEstimado: string;
  setDeliveryTempoEstimado: (v: string) => void;
  onConfirm: (sendWhatsapp: boolean) => void;
  onBackToCardapio: () => void;
}

const CaixaDeliveryConfirmDialog = ({
  open,
  onClose,
  itens,
  sistemaConfig,
  balcaoClienteNome,
  balcaoEndereco,
  balcaoNumero,
  balcaoBairro,
  balcaoTelefone,
  balcaoFormaPag,
  setBalcaoFormaPag,
  balcaoTroco,
  setBalcaoTroco,
  deliveryTempoEstimado,
  setDeliveryTempoEstimado,
  onConfirm,
  onBackToCardapio,
}: CaixaDeliveryConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-400" />
            Confirmar pedido delivery
          </DialogTitle>
          <DialogDescription>Revise o pedido antes de enviar para a cozinha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Resumo dos itens */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <p className="text-xs font-black text-foreground uppercase tracking-widest">Itens do pedido</p>
            {itens.map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-foreground">{it.quantidade}× {it.nome}</span>
                <span className="font-bold tabular-nums text-foreground">{formatPrice(it.precoUnitario * it.quantidade)}</span>
              </div>
            ))}
            {(sistemaConfig.taxaEntrega ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxa de entrega</span>
                <span>{formatPrice(sistemaConfig.taxaEntrega!)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-sm font-black text-foreground">Total</span>
              <span className="text-lg font-black tabular-nums text-primary">{formatPrice(itens.reduce((s, it) => s + it.precoUnitario * it.quantidade, 0) + (sistemaConfig.taxaEntrega ?? 0))}</span>
            </div>
          </div>

          {/* Endereço */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <p className="text-xs font-black text-foreground uppercase tracking-widest">Entrega</p>
            <p className="text-sm text-foreground">{balcaoClienteNome}</p>
            <p className="text-xs text-muted-foreground">{balcaoEndereco}{balcaoNumero ? `, ${balcaoNumero}` : ""}{balcaoBairro ? ` — ${balcaoBairro}` : ""}</p>
            {balcaoTelefone && <p className="text-xs text-muted-foreground">{balcaoTelefone}</p>}
          </div>

          {/* Pagamento */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <p className="text-xs font-black text-foreground uppercase tracking-widest">Pagamento</p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Forma de pagamento</label>
              <select value={balcaoFormaPag} onChange={(e) => setBalcaoFormaPag(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
                <option value="pix">PIX</option>
              </select>
            </div>
            {balcaoFormaPag === "dinheiro" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Troco para quanto?</label>
                <Input value={balcaoTroco} onChange={(e) => setBalcaoTroco(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
            )}
          </div>

          {/* Tempo estimado */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <label className="text-xs font-black text-foreground uppercase tracking-widest">🕐 Tempo estimado (minutos)</label>
            <Input
              value={deliveryTempoEstimado}
              onChange={(e) => setDeliveryTempoEstimado(e.target.value.replace(/\D/g, ""))}
              placeholder={sistemaConfig.tempoEntrega || "40"}
              inputMode="numeric"
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="outline" onClick={onBackToCardapio} className="rounded-xl font-bold w-full">← Voltar ao cardápio</Button>
          <Button onClick={() => onConfirm(false)} className="rounded-xl font-black gap-1.5 w-full">
            <Check className="h-4 w-4" />
            Confirmar e enviar para cozinha
          </Button>
          {balcaoTelefone.trim() && (
            <Button onClick={() => onConfirm(true)} variant="outline" className="rounded-xl font-black gap-1.5 w-full border-green-500/30 text-green-600 hover:bg-green-500/10">
              <Smartphone className="h-4 w-4" />
              Confirmar e avisar cliente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaixaDeliveryConfirmDialog;
