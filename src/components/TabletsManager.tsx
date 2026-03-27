import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TabletSmartphone, Plus, Pencil, Trash2, Power, PowerOff, KeyRound, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface TabletRow {
  id: string;
  nome: string;
  mesa_id: string | null;
  pin_id: string | null;
  pin_code: string | null;
  ativo: boolean;
  created_at: string | null;
}

interface MesaRow {
  id: string;
  numero: number;
  nome: string | null;
}

interface Props {
  storeId: string;
}

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

const TabletsManager = ({ storeId }: Props) => {
  const [tablets, setTablets] = useState<TabletRow[]>([]);
  const [mesas, setMesas] = useState<MesaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTablet, setEditingTablet] = useState<TabletRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TabletRow | null>(null);

  // Shared PIN state
  const [sharedPin, setSharedPin] = useState<string | null>(null);
  const [sharedPinId, setSharedPinId] = useState<string | null>(null);
  const [regeneratingPin, setRegeneratingPin] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formMesaId, setFormMesaId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tabletsRes, mesasRes, pinsRes] = await Promise.all([
      supabase.from("tablets").select("*").eq("store_id", storeId).order("created_at", { ascending: true }),
      supabase.from("mesas").select("id, numero, nome").eq("store_id", storeId).order("numero", { ascending: true }),
      supabase.from("module_pins").select("id, pin_hash, label").eq("store_id", storeId).eq("module", "cliente").eq("active", true).limit(1),
    ]);
    setTablets((tabletsRes.data as TabletRow[] | null) ?? []);
    setMesas((mesasRes.data as MesaRow[] | null) ?? []);

    // Check for existing shared PIN
    const existingPin = pinsRes.data?.[0];
    if (existingPin) {
      setSharedPinId(existingPin.id);
      // Try to find pin_code from any tablet that references this pin
      const tabletWithCode = (tabletsRes.data as TabletRow[] | null)?.find((t) => t.pin_id === existingPin.id && t.pin_code);
      setSharedPin(tabletWithCode?.pin_code ?? null);
    } else {
      setSharedPinId(null);
      setSharedPin(null);
    }

    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMesaLabel = (mesaId: string | null) => {
    if (!mesaId) return "—";
    const mesa = mesas.find((m) => m.id === mesaId);
    if (!mesa) return "—";
    return mesa.nome ? `${String(mesa.numero).padStart(2, "0")} – ${mesa.nome}` : String(mesa.numero).padStart(2, "0");
  };

  // --- Shared PIN ---
  const handleCreateOrRegeneratePin = async () => {
    setRegeneratingPin(true);
    const newPin = generatePin();

    // Deactivate old PIN if exists
    if (sharedPinId) {
      await supabase.from("module_pins").update({ active: false }).eq("id", sharedPinId);
    }

    // Create new shared PIN
    const { data: pinId, error } = await supabase.rpc("create_module_pin", {
      _store_id: storeId,
      _module: "cliente",
      _pin: newPin,
      _label: "Tablet (compartilhado)",
    });

    if (error || !pinId) {
      toast.error("Erro ao gerar PIN");
      setRegeneratingPin(false);
      return;
    }

    // Update all tablets to reference the new shared PIN
    const { error: updateError } = await supabase
      .from("tablets")
      .update({ pin_id: pinId, pin_code: newPin, updated_at: new Date().toISOString() })
      .eq("store_id", storeId);

    if (updateError) {
      console.warn("Erro ao atualizar tablets com novo PIN:", updateError);
    }

    setSharedPinId(pinId);
    setSharedPin(newPin);
    setRegeneratingPin(false);
    toast.success(sharedPinId ? "Novo PIN gerado!" : "PIN criado!");
    fetchData();
  };

  const copyPin = () => {
    if (!sharedPin) return;
    navigator.clipboard.writeText(sharedPin);
    toast.success("PIN copiado!");
  };

  // --- Tablets CRUD ---
  const openCreateDialog = () => {
    setEditingTablet(null);
    setFormNome("");
    setFormMesaId("none");
    setDialogOpen(true);
  };

  const openEditDialog = (tablet: TabletRow) => {
    setEditingTablet(tablet);
    setFormNome(tablet.nome);
    setFormMesaId(tablet.mesa_id ?? "none");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNome.trim()) {
      toast.error("Informe o nome do tablet");
      return;
    }
    setSaving(true);
    const mesaIdValue = formMesaId === "none" ? null : formMesaId;

    if (editingTablet) {
      const { error } = await supabase
        .from("tablets")
        .update({ nome: formNome.trim(), mesa_id: mesaIdValue, updated_at: new Date().toISOString() })
        .eq("id", editingTablet.id);

      if (error) {
        toast.error("Erro ao atualizar tablet");
      } else {
        toast.success("Tablet atualizado");
      }
    } else {
      // Create tablet linked to shared PIN (if exists)
      const { error } = await supabase.from("tablets").insert({
        store_id: storeId,
        nome: formNome.trim(),
        mesa_id: mesaIdValue,
        pin_id: sharedPinId,
        pin_code: sharedPin,
        ativo: true,
      });

      if (error) {
        toast.error("Erro ao criar tablet");
      } else {
        toast.success("Tablet criado!");
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("tablets").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir tablet");
    } else {
      toast.success("Tablet excluído");
    }
    setDeleteTarget(null);
    fetchData();
  };

  const toggleAtivo = async (tablet: TabletRow) => {
    const newAtivo = !tablet.ativo;
    await supabase.from("tablets").update({ ativo: newAtivo, updated_at: new Date().toISOString() }).eq("id", tablet.id);
    toast.success(newAtivo ? "Tablet ativado" : "Tablet desativado");
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando tablets…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Tablets</h2>
          <p className="text-sm text-muted-foreground">{tablets.length} tablet{tablets.length !== 1 ? "s" : ""} cadastrado{tablets.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 rounded-xl font-bold">
          <Plus className="h-4 w-4" /> Novo Tablet
        </Button>
      </div>

      {/* Shared PIN Section */}
      <div className="surface-card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">PIN Único dos Tablets</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Todos os tablets usam o mesmo PIN para acessar o sistema. Compartilhe este código com a equipe.
        </p>

        {sharedPin ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-4xl font-black tabular-nums tracking-[0.3em] text-primary">{sharedPin}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyPin} className="gap-1 rounded-lg text-xs">
                <Copy className="h-3 w-3" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCreateOrRegeneratePin} disabled={regeneratingPin} className="gap-1 rounded-lg text-xs">
                <RefreshCw className={`h-3 w-3 ${regeneratingPin ? "animate-spin" : ""}`} />
                Regenerar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Ao regenerar, o PIN anterior será desativado.</p>
          </div>
        ) : sharedPinId ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-secondary/30 p-5">
            <p className="text-sm text-muted-foreground">PIN configurado (hash seguro armazenado)</p>
            <Button size="sm" variant="outline" onClick={handleCreateOrRegeneratePin} disabled={regeneratingPin} className="gap-1 rounded-lg text-xs">
              <RefreshCw className={`h-3 w-3 ${regeneratingPin ? "animate-spin" : ""}`} />
              Regenerar PIN
            </Button>
          </div>
        ) : (
          <Button onClick={handleCreateOrRegeneratePin} disabled={regeneratingPin} className="h-11 w-full rounded-xl font-bold gap-2">
            <KeyRound className="h-4 w-4" />
            {regeneratingPin ? "Gerando…" : "Gerar PIN dos Tablets"}
          </Button>
        )}
      </div>

      {/* Tablets List */}
      {tablets.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 py-12 text-center">
          <TabletSmartphone className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhum tablet cadastrado. Crie o primeiro para vincular a uma mesa.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tablets.map((tablet) => (
            <div
              key={tablet.id}
              className={`surface-card flex flex-col gap-3 p-4 ${!tablet.ativo ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <TabletSmartphone className="h-5 w-5 text-muted-foreground" />
                  <span className="font-bold text-foreground">{tablet.nome}</span>
                </div>
                <Badge variant={tablet.ativo ? "default" : "secondary"} className="text-[10px]">
                  {tablet.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>Mesa: <span className="font-semibold text-foreground">{getMesaLabel(tablet.mesa_id)}</span></p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEditDialog(tablet)} className="gap-1 rounded-lg text-xs">
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleAtivo(tablet)} className="gap-1 rounded-lg text-xs">
                  {tablet.ativo ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                  {tablet.ativo ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(tablet)} className="gap-1 rounded-lg text-xs">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTablet ? "Editar Tablet" : "Novo Tablet"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nome do Tablet</label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value.slice(0, 50))}
                placeholder="Ex: Tablet Mesa 05"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Mesa vinculada</label>
              <Select value={formMesaId} onValueChange={setFormMesaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma mesa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (selecionar depois)</SelectItem>
                  {mesas.map((mesa) => (
                    <SelectItem key={mesa.id} value={mesa.id}>
                      Mesa {String(mesa.numero).padStart(2, "0")}{mesa.nome ? ` – ${mesa.nome}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={saving} className="h-11 w-full rounded-xl font-bold">
              {saving ? "Salvando…" : editingTablet ? "Salvar alterações" : "Criar Tablet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tablet?</AlertDialogTitle>
            <AlertDialogDescription>
              O tablet "{deleteTarget?.nome}" será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TabletsManager;
