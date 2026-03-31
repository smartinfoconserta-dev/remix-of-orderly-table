import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PedidoRealizado } from "@/contexts/RestaurantContext";

interface MotoboyDialogsProps {
  showManualPick: boolean;
  setShowManualPick: (v: boolean) => void;
  pedidosDisponiveis: PedidoRealizado[];
  confirmandoPedido: PedidoRealizado | null;
  setConfirmandoPedido: (p: PedidoRealizado | null) => void;
  onConfirmarRetirada: (pedido: PedidoRealizado) => void;
  confirmandoEntregue: PedidoRealizado | null;
  setConfirmandoEntregue: (p: PedidoRealizado | null) => void;
  onConfirmarEntrega: (pedido: PedidoRealizado) => void;
  confirmandoDevolvido: PedidoRealizado | null;
  setConfirmandoDevolvido: (p: PedidoRealizado | null) => void;
  motivoDevolucao: string;
  setMotivoDevolucao: (v: string) => void;
  onConfirmarDevolucao: (pedido: PedidoRealizado, motivo?: string) => void;
  usbScanOpen: boolean;
  setUsbScanOpen: (v: boolean) => void;
  usbScanInput: string;
  setUsbScanInput: (v: string) => void;
  usbScanInputRef: React.RefObject<HTMLInputElement>;
  onUsbScan: (raw: string) => void;
}

export default function MotoboyDialogs({
  showManualPick,
  setShowManualPick,
  pedidosDisponiveis,
  confirmandoPedido,
  setConfirmandoPedido,
  onConfirmarRetirada,
  confirmandoEntregue,
  setConfirmandoEntregue,
  onConfirmarEntrega,
  confirmandoDevolvido,
  setConfirmandoDevolvido,
  motivoDevolucao,
  setMotivoDevolucao,
  onConfirmarDevolucao,
  usbScanOpen,
  setUsbScanOpen,
  usbScanInput,
  setUsbScanInput,
  usbScanInputRef,
  onUsbScan,
}: MotoboyDialogsProps) {
  return (
    <>
      {/* MODAL 1 — Lista de pedidos para retirada manual */}
      {showManualPick && !confirmandoPedido && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
            <div>
              <p className="font-black text-lg text-foreground">Pedidos para retirar</p>
              <p className="text-xs text-muted-foreground">Toque no pedido que você vai entregar</p>
            </div>
            <button onClick={() => setShowManualPick(false)}
              className="h-10 w-10 flex items-center justify-center rounded-full border border-border bg-card">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pedidosDisponiveis.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>Nenhum pedido disponível para retirada</p>
              </div>
            ) : (
              pedidosDisponiveis.map(p => (
                <button key={p.id} onClick={() => setConfirmandoPedido(p)}
                  className="w-full text-left rounded-2xl border border-amber-500/30 bg-card p-4 space-y-2 active:scale-[0.98] transition-transform">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{p.clienteNome || "Cliente"}</p>
                      {p.bairro && <span className="text-[10px] font-bold bg-orange-600 text-white rounded-full px-2 py-0.5 mt-1 inline-block">{p.bairro}</span>}
                    </div>
                    <span className="text-3xl font-black text-amber-500 shrink-0">#{p.numeroPedido}</span>
                  </div>
                  {p.enderecoCompleto && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.enderecoCompleto}{p.bairro ? ` — ${p.bairro}` : ""}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-black">R$ {p.total.toFixed(2)}</span>
                    {p.formaPagamentoDelivery && (
                      <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{p.formaPagamentoDelivery}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 2 — Confirmação de retirada */}
      {confirmandoPedido && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirmar retirada</p>
              <span className="text-5xl font-black text-amber-500 block">#{confirmandoPedido.numeroPedido}</span>
              <p className="text-lg font-black text-foreground">{confirmandoPedido.clienteNome || "Cliente"}</p>
              {confirmandoPedido.enderecoCompleto && (
                <p className="text-sm text-muted-foreground">{confirmandoPedido.enderecoCompleto}</p>
              )}
              <p className="text-xl font-black text-foreground pt-1">R$ {confirmandoPedido.total.toFixed(2)}</p>
            </div>
            <p className="text-center text-sm text-muted-foreground bg-secondary rounded-xl p-3">
              Você está retirando este pedido para entrega. Tem certeza?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => setConfirmandoPedido(null)}>
                Não
              </Button>
              <Button className="flex-1 h-12 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onConfirmarRetirada(confirmandoPedido)}>
                Sim, retirei
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3 — Confirmação de entrega */}
      {confirmandoEntregue && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirmar entrega</p>
              <span className="text-5xl font-black text-emerald-500 block">#{confirmandoEntregue.numeroPedido}</span>
              <p className="text-lg font-black text-foreground">{confirmandoEntregue.clienteNome || "Cliente"}</p>
              <p className="text-xl font-black text-foreground pt-1">R$ {confirmandoEntregue.total.toFixed(2)}</p>
            </div>
            <p className="text-center text-sm text-muted-foreground bg-secondary rounded-xl p-3">
              O pedido foi entregue ao cliente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => setConfirmandoEntregue(null)}>
                Não
              </Button>
              <Button className="flex-1 h-12 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onConfirmarEntrega(confirmandoEntregue)}>
                Sim, entregue!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4 — Não entregue com motivo */}
      {confirmandoDevolvido && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Não conseguiu entregar?</p>
              <span className="text-5xl font-black text-orange-500 block">#{confirmandoDevolvido.numeroPedido}</span>
              <p className="text-lg font-black text-foreground">{confirmandoDevolvido.clienteNome || "Cliente"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">Motivo (opcional)</p>
              <Input
                placeholder="Ex: Cliente não estava, endereço errado..."
                value={motivoDevolucao}
                onChange={(e) => setMotivoDevolucao(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground bg-secondary rounded-xl p-3">
              O pedido voltará para o caixa resolver.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => { setConfirmandoDevolvido(null); setMotivoDevolucao(""); }}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 h-12 rounded-xl font-black"
                onClick={() => onConfirmarDevolucao(confirmandoDevolvido, motivoDevolucao || undefined)}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* USB QR Scanner Dialog */}
      <Dialog open={usbScanOpen} onOpenChange={(o) => { setUsbScanOpen(o); if (!o) setUsbScanInput(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear pedido</DialogTitle>
            <DialogDescription>Escaneie o QR Code do pedido ou digite o código</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              ref={usbScanInputRef}
              autoFocus
              value={usbScanInput}
              onChange={(e) => setUsbScanInput(e.target.value)}
              placeholder="Aguardando leitura..."
              className="text-lg font-mono h-12"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUsbScan(usbScanInput);
                  setUsbScanInput("");
                  setTimeout(() => usbScanInputRef.current?.focus(), 50);
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center">O leitor USB envia os dados como digitação. Pressione Enter ou escaneie.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUsbScanOpen(false); setUsbScanInput(""); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
