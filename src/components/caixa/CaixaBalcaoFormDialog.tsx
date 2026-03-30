import { Loader2, Search, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
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
import { findClienteDelivery, type ClienteDelivery } from "@/lib/deliveryStorage";

interface CaixaBalcaoFormDialogProps {
  open: boolean;
  onClose: () => void;
  isDesktop: boolean;
  balcaoTipo: "balcao" | "delivery";
  setBalcaoTipo: (v: "balcao" | "delivery") => void;
  balcaoClienteNome: string;
  setBalcaoClienteNome: (v: string) => void;
  balcaoTelefone: string;
  setBalcaoTelefone: (v: string) => void;
  balcaoCpf: string;
  setBalcaoCpf: (v: string) => void;
  balcaoEndereco: string;
  setBalcaoEndereco: (v: string) => void;
  balcaoNumero: string;
  setBalcaoNumero: (v: string) => void;
  balcaoBairro: string;
  setBalcaoBairro: (v: string) => void;
  balcaoComplemento: string;
  setBalcaoComplemento: (v: string) => void;
  balcaoReferencia: string;
  setBalcaoReferencia: (v: string) => void;
  deliveryStep: "busca" | "form";
  setDeliveryStep: (v: "busca" | "form") => void;
  deliveryBusca: string;
  setDeliveryBusca: (v: string) => void;
  deliveryResultados: ClienteDelivery[];
  setDeliveryResultados: (v: ClienteDelivery[]) => void;
  deliveryCep: string;
  setDeliveryCep: (v: string) => void;
  deliveryCepLoading: boolean;
  setDeliveryCepLoading: (v: boolean) => void;
  deliveryCepErro: string;
  setDeliveryCepErro: (v: string) => void;
  deliveryCidade: string;
  setDeliveryCidade: (v: string) => void;
  onOpenCardapio: () => void;
  caixaStoreIdRef: React.MutableRefObject<string | null>;
}

const CaixaBalcaoFormDialog = ({
  open,
  onClose,
  isDesktop,
  balcaoTipo,
  setBalcaoTipo,
  balcaoClienteNome,
  setBalcaoClienteNome,
  balcaoTelefone,
  setBalcaoTelefone,
  balcaoCpf,
  setBalcaoCpf,
  balcaoEndereco,
  setBalcaoEndereco,
  balcaoNumero,
  setBalcaoNumero,
  balcaoBairro,
  setBalcaoBairro,
  balcaoComplemento,
  setBalcaoComplemento,
  balcaoReferencia,
  setBalcaoReferencia,
  deliveryStep,
  setDeliveryStep,
  deliveryBusca,
  setDeliveryBusca,
  deliveryResultados,
  setDeliveryResultados,
  deliveryCep,
  setDeliveryCep,
  deliveryCepLoading,
  setDeliveryCepLoading,
  deliveryCepErro,
  setDeliveryCepErro,
  deliveryCidade,
  setDeliveryCidade,
  onOpenCardapio,
  caixaStoreIdRef,
}: CaixaBalcaoFormDialogProps) => {
  const balcaoFormContent = (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={balcaoTipo === "balcao" ? "default" : "outline"} onClick={() => { setBalcaoTipo("balcao"); setDeliveryStep("busca"); }} className="flex-1 rounded-xl font-black">Balcão</Button>
        <Button variant={balcaoTipo === "delivery" ? "default" : "outline"} onClick={() => { setBalcaoTipo("delivery"); setDeliveryStep("busca"); }} className="flex-1 rounded-xl font-black">Delivery</Button>
      </div>
      {balcaoTipo === "balcao" && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Nome do cliente *</label>
          <Input value={balcaoClienteNome} onChange={(e) => setBalcaoClienteNome(e.target.value)} placeholder="Nome do cliente" />
        </div>
      )}
      {balcaoTipo === "delivery" && deliveryStep === "busca" && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <label className="text-xs font-semibold text-foreground">Buscar cliente por CPF ou Telefone</label>
          <div className="flex gap-2">
            <Input value={deliveryBusca} onChange={(e) => setDeliveryBusca(e.target.value)} placeholder="CPF ou telefone..." onKeyDown={async (e) => { if (e.key === "Enter") setDeliveryResultados(await findClienteDelivery(deliveryBusca, caixaStoreIdRef.current)); }} />
            <Button size="sm" onClick={async () => setDeliveryResultados(await findClienteDelivery(deliveryBusca, caixaStoreIdRef.current))} className="rounded-xl font-bold gap-1.5 shrink-0"><Search className="h-4 w-4" />Buscar</Button>
          </div>
          {deliveryResultados.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {deliveryResultados.slice(0, 5).map((cli) => (
                <button key={cli.id} type="button" onClick={() => { setBalcaoClienteNome(cli.nome); setBalcaoCpf(cli.cpf); setBalcaoTelefone(cli.telefone); setBalcaoEndereco(cli.endereco); setBalcaoNumero(cli.numero); setBalcaoBairro(cli.bairro); setBalcaoComplemento(cli.complemento); setBalcaoReferencia(cli.referencia); setDeliveryStep("form"); }} className="w-full text-left rounded-xl border border-border bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                  <p className="text-sm font-bold text-foreground">{cli.nome}</p>
                  <p className="text-xs text-muted-foreground">{cli.telefone} {cli.endereco ? `— ${cli.endereco}, ${cli.numero}` : ""}</p>
                </button>
              ))}
            </div>
          )}
          {deliveryBusca.trim() && deliveryResultados.length === 0 && (
            <div className="text-center py-3 space-y-2">
              <p className="text-xs text-muted-foreground">Cliente não encontrado</p>
              <Button size="sm" variant="outline" onClick={() => setDeliveryStep("form")} className="rounded-xl font-bold">Cadastrar novo cliente</Button>
            </div>
          )}
          {!deliveryBusca.trim() && (
            <Button size="sm" variant="ghost" onClick={() => setDeliveryStep("form")} className="w-full rounded-xl font-bold text-xs text-muted-foreground">Pular busca — cadastrar novo</Button>
          )}
        </div>
      )}
      {balcaoTipo === "delivery" && deliveryStep === "form" && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Nome completo *</label><Input value={balcaoClienteNome} onChange={(e) => setBalcaoClienteNome(e.target.value)} placeholder="Nome completo" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Telefone *</label><Input value={balcaoTelefone} onChange={(e) => setBalcaoTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">CPF *</label><Input value={balcaoCpf} onChange={(e) => setBalcaoCpf(e.target.value)} placeholder="000.000.000-00" /></div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">CEP</label>
            <div className="flex gap-2 items-center">
              <Input value={deliveryCep} onChange={(e) => { let v = e.target.value.replace(/\D/g, "").slice(0, 8); if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5); setDeliveryCep(v); setDeliveryCepErro(""); const digits = v.replace(/\D/g, ""); if (digits.length === 8) { setDeliveryCepLoading(true); fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json()).then(data => { if (data.erro) { setDeliveryCepErro("CEP não encontrado"); } else { setBalcaoEndereco(data.logradouro || ""); setBalcaoBairro(data.bairro || ""); setDeliveryCidade(data.localidade ? `${data.localidade} - ${data.uf}` : ""); } }).catch(() => setDeliveryCepErro("Erro ao buscar CEP")).finally(() => setDeliveryCepLoading(false)); } }} placeholder="00000-000" className="flex-1" />
              {deliveryCepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {deliveryCepErro && <p className="text-xs text-destructive">{deliveryCepErro}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1"><label className="text-xs font-semibold text-foreground">Endereço / Rua *</label><Input value={balcaoEndereco} onChange={(e) => setBalcaoEndereco(e.target.value)} placeholder="Rua" /></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Número *</label><Input value={balcaoNumero} onChange={(e) => setBalcaoNumero(e.target.value)} placeholder="Nº" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Bairro</label><Input value={balcaoBairro} onChange={(e) => setBalcaoBairro(e.target.value)} placeholder="Bairro" /></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Cidade</label><Input value={deliveryCidade} readOnly={!!deliveryCidade} onChange={(e) => setDeliveryCidade(e.target.value)} placeholder="Cidade" className={deliveryCidade ? "bg-muted" : ""} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Complemento</label><Input value={balcaoComplemento} onChange={(e) => setBalcaoComplemento(e.target.value)} placeholder="Apto, bloco..." /></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Referência</label><Input value={balcaoReferencia} onChange={(e) => setBalcaoReferencia(e.target.value)} placeholder="Próximo a..." /></div>
          </div>
        </div>
      )}
    </div>
  );

  const balcaoFooterButtons = (
    <>
      {balcaoTipo === "delivery" && deliveryStep === "form" && (
        <Button variant="ghost" onClick={() => setDeliveryStep("busca")} className="rounded-xl font-bold mr-auto">← Voltar</Button>
      )}
      <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">Cancelar</Button>
      {(balcaoTipo === "balcao" || deliveryStep === "form") && (
        <Button
          disabled={balcaoTipo === "balcao" ? !balcaoClienteNome.trim() : !balcaoClienteNome.trim() || !balcaoTelefone.trim() || !balcaoCpf.trim() || !balcaoEndereco.trim() || !balcaoNumero.trim()}
          onClick={() => {
            if (balcaoTipo === "balcao" && !balcaoClienteNome.trim()) { toast.error("Informe o nome do cliente", { duration: 1400 }); return; }
            if (balcaoTipo === "delivery") {
              if (!balcaoClienteNome.trim()) { toast.error("Informe o nome do cliente", { duration: 1400 }); return; }
              if (!balcaoTelefone.trim()) { toast.error("Informe o telefone", { duration: 1400 }); return; }
              if (!balcaoCpf.trim()) { toast.error("Informe o CPF do cliente", { duration: 1400 }); return; }
              if (!balcaoEndereco.trim()) { toast.error("Informe o endereço", { duration: 1400 }); return; }
              if (!balcaoNumero.trim()) { toast.error("Informe o número do endereço", { duration: 1400 }); return; }
            }
            onOpenCardapio();
          }}
          className="rounded-xl font-black gap-1.5"
        >
          <ShoppingCart className="h-4 w-4" />
          {balcaoTipo === "delivery" ? "Salvar e abrir cardápio" : "Abrir cardápio"}
        </Button>
      )}
    </>
  );

  if (isDesktop) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
        <div className="flex-1 bg-foreground/60" onClick={onClose} />
        <div className="w-[520px] h-screen bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
          <header className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <h2 className="text-base font-black text-foreground">Pedido Balcão / Delivery</h2>
              <p className="text-xs text-muted-foreground">Preencha os dados e abra o cardápio completo.</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-5">
            {balcaoFormContent}
          </div>
          <footer className="border-t border-border px-5 py-4 flex items-center justify-end gap-3 shrink-0">
            {balcaoFooterButtons}
          </footer>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Pedido Balcão / Delivery</DialogTitle>
          <DialogDescription>Preencha os dados e abra o cardápio completo.</DialogDescription>
        </DialogHeader>
        {balcaoFormContent}
        <DialogFooter className="gap-3 sm:gap-0">
          {balcaoFooterButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaixaBalcaoFormDialog;
