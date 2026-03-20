import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type Cliente, getClientes, addCliente, updateCliente, removeCliente } from "@/lib/masterStorage";

const MASTER_PASS = "master2025";

const emptyForm = { nomeRestaurante: "", nomeContato: "", email: "", dataVencimento: "", ativo: true, avisoAtivo: false, avisoTexto: "" };

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
    if (senha === MASTER_PASS) {
      setAuthed(true);
      setSenhaErro(false);
      refresh();
    } else {
      setSenhaErro(true);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditId(c.id);
    setForm({ nomeRestaurante: c.nomeRestaurante, nomeContato: c.nomeContato, email: c.email, dataVencimento: c.dataVencimento, ativo: c.ativo, avisoAtivo: c.avisoAtivo, avisoTexto: c.avisoTexto });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nomeRestaurante.trim() || !form.nomeContato.trim()) {
      toast.error("Preencha nome do restaurante e contato.");
      return;
    }
    if (editId) {
      updateCliente(editId, form);
      toast.success("Cliente atualizado.");
    } else {
      addCliente(form);
      toast.success("Cliente criado.");
    }
    setDialogOpen(false);
    refresh();
  };

  const handleRemove = () => {
    if (removeId) {
      removeCliente(removeId);
      toast.success("Cliente removido.");
      setRemoveId(null);
      refresh();
    }
  };

  const toggleAtivo = (c: Cliente) => {
    updateCliente(c.id, { ativo: !c.ativo });
    refresh();
  };

  const isVencido = (d: string) => d && new Date(d) < new Date(new Date().toISOString().slice(0, 10));

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
      <div className="max-w-4xl mx-auto space-y-6">
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
            <div key={c.id} className="rounded-2xl border bg-card p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 space-y-1">
                <p className="font-bold text-foreground">{c.nomeRestaurante}</p>
                <p className="text-sm text-muted-foreground">{c.nomeContato} · {c.email}</p>
                <p className="text-xs text-muted-foreground">Vencimento: {c.dataVencimento || "—"}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={c.ativo ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-destructive hover:bg-destructive text-destructive-foreground"}>{c.ativo ? "Ativo" : "Bloqueado"}</Badge>
                {isVencido(c.dataVencimento) && <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">Vencido</Badge>}
                <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRemoveId(c.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          {clientes.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado.</p>}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do restaurante</Label><Input value={form.nomeRestaurante} onChange={(e) => setForm({ ...form, nomeRestaurante: e.target.value })} /></div>
            <div><Label>Nome do contato</Label><Input value={form.nomeContato} onChange={(e) => setForm({ ...form, nomeContato: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Data de vencimento</Label><Input type="date" value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>{form.ativo ? "Ativo" : "Bloqueado"}</Label></div>
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
