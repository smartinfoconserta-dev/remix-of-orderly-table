import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Plus, Pencil, Trash2, Phone, Mail, MapPin, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { type Cliente, getClientes, addCliente, updateCliente, removeCliente } from "@/lib/masterStorage";

const MASTER_PASS = "master2025";

const SEGMENTOS = ["hamburgeria", "pizzaria", "sushi", "pastel", "a-la-carte", "outro"];
const SEGMENTO_LABELS: Record<string, string> = {
  hamburgeria: "Hamburgeria",
  pizzaria: "Pizzaria",
  sushi: "Sushi",
  pastel: "Pastel",
  "a-la-carte": "À la carte",
  outro: "Outro",
};

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const DIAS_VENCIMENTO = [1, 5, 10, 15, 20, 25];

const emptyForm = {
  nomeRestaurante: "", nomeContato: "", email: "", dataVencimento: "",
  ativo: true, avisoAtivo: false, avisoTexto: "",
  telefone: "", cnpj: "", cidade: "", estado: "", endereco: "",
  segmento: "hamburgeria", diaVencimento: 10, valorMensalidade: 0,
  observacoes: "", historicoPagamentos: [] as any[],
};

function proximoVencimento(diaVencimento: number): string {
  const hoje = new Date();
  let mes = hoje.getMonth();
  let ano = hoje.getFullYear();
  if (hoje.getDate() > diaVencimento) {
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  const lastDay = new Date(ano, mes + 1, 0).getDate();
  const dia = Math.min(diaVencimento, lastDay);
  return `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
}

const MasterPage = () => {
  const [authed, setAuthed] = useState(false);
  const [senha, setSenha] = useState("");
  const [senhaErro, setSenhaErro] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const refresh = () => setClientes(getClientes());

  const handleLogin = () => {
    if (senha === MASTER_PASS) { setAuthed(true); setSenhaErro(false); refresh(); }
    else setSenhaErro(true);
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (c: Cliente) => {
    setEditId(c.id);
    setForm({
      nomeRestaurante: c.nomeRestaurante, nomeContato: c.nomeContato, email: c.email,
      dataVencimento: c.dataVencimento, ativo: c.ativo, avisoAtivo: c.avisoAtivo, avisoTexto: c.avisoTexto,
      telefone: c.telefone || "", cnpj: c.cnpj || "", cidade: c.cidade || "",
      estado: c.estado || "", endereco: c.endereco || "", segmento: c.segmento || "hamburgeria",
      diaVencimento: c.diaVencimento || 10, valorMensalidade: c.valorMensalidade || 0,
      observacoes: c.observacoes || "", historicoPagamentos: c.historicoPagamentos || [],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nomeRestaurante.trim() || !form.nomeContato.trim()) {
      toast.error("Preencha nome do restaurante e contato.");
      return;
    }
    if (editId) { updateCliente(editId, form); toast.success("Cliente atualizado."); }
    else { addCliente(form); toast.success("Cliente criado."); }
    setDialogOpen(false);
    refresh();
  };

  const handleRemove = () => {
    if (removeId) { removeCliente(removeId); toast.success("Cliente removido."); setRemoveId(null); refresh(); }
  };

  const toggleAtivo = (c: Cliente) => { updateCliente(c.id, { ativo: !c.ativo }); refresh(); };

  const isVencido = (d: string) => d && new Date(d) < new Date(new Date().toISOString().slice(0, 10));

  const f = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow">
          <h1 className="text-2xl font-black text-center text-foreground">Painel Master</h1>
          <Input type="password" placeholder="Senha master" value={senha} onChange={(e) => { setSenha(e.target.value); setSenhaErro(false); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          {senhaErro && <p className="text-sm text-destructive text-center">Senha incorreta.</p>}
          <Button className="w-full" onClick={handleLogin}>Entrar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Painel Master</h1>
          <Button variant="outline" size="sm" onClick={() => setAuthed(false)}><LogOut className="w-4 h-4 mr-1" /> Sair</Button>
        </div>

        {/* Toolbar */}
        <div className="flex justify-end">
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
        </div>

        {/* List */}
        <div className="grid gap-4">
          {clientes.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-5 space-y-3">
              {/* Row 1 - Name + badges */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-lg text-foreground">{c.nomeRestaurante}</p>
                  {c.segmento && <Badge variant="secondary">{SEGMENTO_LABELS[c.segmento] || c.segmento}</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={c.ativo ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-destructive hover:bg-destructive text-destructive-foreground"}>{c.ativo ? "Ativo" : "Bloqueado"}</Badge>
                  {isVencido(c.dataVencimento) && <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">Vencido</Badge>}
                  <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRemoveId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Row 2 - Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.cidade && c.estado ? `${c.cidade} - ${c.estado}` : "—"}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.telefone || "—"}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email || "—"}</span>
                <span className="flex items-center gap-1 font-semibold text-foreground"><DollarSign className="w-3.5 h-3.5" />R$ {(c.valorMensalidade || 0).toFixed(2)}</span>
              </div>

              {/* Row 3 - Vencimento */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{c.nomeContato}</span>
                <span>Próximo venc.: {c.diaVencimento ? proximoVencimento(c.diaVencimento) : "—"}</span>
                <span>Licença: {c.dataVencimento || "—"}</span>
              </div>
            </div>
          ))}
          {clientes.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado.</p>}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {/* Identificação */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Identificação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Nome do restaurante</Label><Input value={form.nomeRestaurante} onChange={(e) => f("nomeRestaurante", e.target.value)} /></div>
                <div>
                  <Label>Segmento</Label>
                  <Select value={form.segmento} onValueChange={(v) => f("segmento", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEGMENTOS.map((s) => <SelectItem key={s} value={s}>{SEGMENTO_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>CNPJ</Label><Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => f("cnpj", e.target.value)} /></div>
                <div><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => f("telefone", e.target.value)} /></div>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Contato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Nome do contato</Label><Input value={form.nomeContato} onChange={(e) => f("nomeContato", e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} /></div>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Localização</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3"><Label>Endereço</Label><Input placeholder="Rua, número" value={form.endereco} onChange={(e) => f("endereco", e.target.value)} /></div>
                <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => f("cidade", e.target.value)} /></div>
                <div>
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => f("estado", v)}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{ESTADOS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contrato */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Contrato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Valor da mensalidade</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input type="number" className="pl-10" value={form.valorMensalidade || ""} onChange={(e) => f("valorMensalidade", parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div>
                  <Label>Dia de vencimento</Label>
                  <Select value={String(form.diaVencimento)} onValueChange={(v) => f("diaVencimento", Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIAS_VENCIMENTO.map((d) => <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data de vencimento da licença</Label><Input type="date" value={form.dataVencimento} onChange={(e) => f("dataVencimento", e.target.value)} /></div>
                <div className="flex items-center gap-2 pt-5"><Switch checked={form.ativo} onCheckedChange={(v) => f("ativo", v)} /><Label>{form.ativo ? "Ativo" : "Bloqueado"}</Label></div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Observações</h3>
              <Textarea placeholder="Observações livres sobre o cliente..." value={form.observacoes} onChange={(e) => f("observacoes", e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove AlertDialog */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover cliente?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleRemove}>Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterPage;
