import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Grid3X3, Plus, Pencil, Trash2, KeyRound, ShieldOff, Layers } from "lucide-react";
import { toast } from "sonner";

interface Mesa {
  id: string;
  store_id: string;
  numero: number;
  nome: string | null;
  status: string;
  capacidade: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PinRow {
  id: string;
  module: string;
  label: string | null;
  active: boolean | null;
}

interface Props {
  storeId: string;
  storeName: string;
}

const STATUS_OPTIONS = [
  { value: "livre", label: "Livre", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "ocupada", label: "Ocupada", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { value: "reservada", label: "Reservada", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "inativa", label: "Inativa", color: "bg-muted text-muted-foreground border-border" },
];

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-muted text-muted-foreground border-border";

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

const MesasManager = ({ storeId, storeName }: Props) => {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMesa, setEditingMesa] = useState<Mesa | null>(null);
  const [formNumero, setFormNumero] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formCapacidade, setFormCapacidade] = useState("");
  const [formStatus, setFormStatus] = useState("livre");
  const [saving, setSaving] = useState(false);

  // Batch create dialog
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchCount, setBatchCount] = useState("10");
  const [batchSaving, setBatchSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Mesa | null>(null);

  // PIN dialog
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinMesa, setPinMesa] = useState<Mesa | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [mesaPins, setMesaPins] = useState<PinRow[]>([]);

  const fetchMesas = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("mesas")
      .select("*")
      .eq("store_id", storeId)
      .order("numero");
    setMesas((data as Mesa[]) ?? []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);

  const nextNumero = mesas.length > 0 ? Math.max(...mesas.map((m) => m.numero)) + 1 : 1;

  const openCreate = () => {
    setEditingMesa(null);
    setFormNumero(String(nextNumero));
    setFormNome("");
    setFormCapacidade("");
    setFormStatus("livre");
    setDialogOpen(true);
  };

  const openEdit = (mesa: Mesa) => {
    setEditingMesa(mesa);
    setFormNumero(String(mesa.numero));
    setFormNome(mesa.nome ?? "");
    setFormCapacidade(mesa.capacidade ? String(mesa.capacidade) : "");
    setFormStatus(mesa.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const numero = parseInt(formNumero);
    if (isNaN(numero) || numero < 1) {
      toast.error("Número da mesa inválido");
      return;
    }
    setSaving(true);

    if (editingMesa) {
      const { error } = await (supabase as any)
        .from("mesas")
        .update({
          numero,
          nome: formNome.trim() || null,
          capacidade: formCapacidade ? parseInt(formCapacidade) : null,
          status: formStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMesa.id);

      if (error) {
        toast.error(error.message.includes("unique") ? "Já existe uma mesa com esse número" : error.message);
        setSaving(false);
        return;
      }
      toast.success(`Mesa ${numero} atualizada`);
    } else {
      const { error } = await (supabase as any)
        .from("mesas")
        .insert({
          store_id: storeId,
          numero,
          nome: formNome.trim() || null,
          capacidade: formCapacidade ? parseInt(formCapacidade) : null,
          status: formStatus,
        });

      if (error) {
        toast.error(error.message.includes("unique") ? "Já existe uma mesa com esse número" : error.message);
        setSaving(false);
        return;
      }
      toast.success(`Mesa ${numero} criada`);
    }

    setSaving(false);
    setDialogOpen(false);
    fetchMesas();
  };

  const handleBatchCreate = async () => {
    const count = parseInt(batchCount);
    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Quantidade inválida (1-100)");
      return;
    }
    setBatchSaving(true);

    const startNum = nextNumero;
    const rows = Array.from({ length: count }, (_, i) => ({
      store_id: storeId,
      numero: startNum + i,
      status: "livre",
    }));

    const { error } = await (supabase.from("mesas").insert(rows as any) as any);
    if (error) {
      toast.error(error.message);
      setBatchSaving(false);
      return;
    }

    toast.success(`${count} mesas criadas (${startNum} a ${startNum + count - 1})`);
    setBatchSaving(false);
    setBatchDialogOpen(false);
    fetchMesas();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("mesas").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Mesa ${deleteTarget.numero} excluída`);
    setDeleteTarget(null);
    fetchMesas();
  };

  // PIN management
  const openPinDialog = async (mesa: Mesa) => {
    setPinMesa(mesa);
    setPinValue("");
    setPinDialogOpen(true);

    // Fetch existing pins for this mesa
    const { data } = await (supabase as any)
      .from("module_pins")
      .select("id, module, label, active")
      .eq("store_id", storeId)
      .eq("module", "cliente")
      .like("label", `Mesa ${String(mesa.numero).padStart(2, "0")}%`);
    setMesaPins((data as PinRow[]) ?? []);
  };

  const handleCreatePin = async () => {
    if (!pinMesa) return;
    if (!/^\d{4,6}$/.test(pinValue)) {
      toast.error("O PIN deve ter entre 4 e 6 dígitos");
      return;
    }
    setPinSaving(true);

    const label = `Mesa ${String(pinMesa.numero).padStart(2, "0")}`;
    const { error } = await supabase.rpc("create_module_pin", {
      _store_id: storeId,
      _module: "cliente",
      _pin: pinValue,
      _label: label,
    });

    if (error) {
      toast.error(error.message);
      setPinSaving(false);
      return;
    }

    toast.success(`PIN criado para ${label}`);
    setPinValue("");
    setPinSaving(false);

    // Refresh pins
    const { data } = await (supabase as any)
      .from("module_pins")
      .select("id, module, label, active")
      .eq("store_id", storeId)
      .eq("module", "cliente")
      .like("label", `Mesa ${String(pinMesa.numero).padStart(2, "0")}%`);
    setMesaPins((data as PinRow[]) ?? []);
  };

  const handleDeactivatePin = async (pinId: string) => {
    const { error } = await (supabase as any)
      .from("module_pins")
      .update({ active: false })
      .eq("id", pinId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("PIN desativado");
    setMesaPins((prev) => prev.map((p) => p.id === pinId ? { ...p, active: false } : p));
  };

  const activeMesas = mesas.filter((m) => m.status !== "inativa");
  const inactiveMesas = mesas.filter((m) => m.status === "inativa");

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Mesas</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{mesas.length} mesas</span>
            <span>·</span>
            <span>{mesas.filter((m) => m.status === "livre").length} livres</span>
            <span>·</span>
            <span>{mesas.filter((m) => m.status === "ocupada").length} ocupadas</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl font-bold gap-1.5" onClick={() => setBatchDialogOpen(true)}>
            <Layers className="h-4 w-4" /> Criar em lote
          </Button>
          <Button size="sm" className="rounded-xl font-bold gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova Mesa
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhuma mesa cadastrada.</p>
          <p className="text-xs text-muted-foreground">Crie mesas individualmente ou em lote para começar.</p>
        </div>
      ) : (
        <>
          {/* Mesas grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {activeMesas.map((mesa) => (
              <div
                key={mesa.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-foreground">
                    {String(mesa.numero).padStart(2, "0")}
                  </span>
                  <Badge className={`text-[10px] border ${getStatusStyle(mesa.status)}`}>
                    {getStatusLabel(mesa.status)}
                  </Badge>
                </div>

                {mesa.nome && (
                  <p className="text-xs font-semibold text-muted-foreground truncate">{mesa.nome}</p>
                )}

                {mesa.capacidade && (
                  <p className="text-[10px] text-muted-foreground">{mesa.capacidade} lugares</p>
                )}

                <div className="flex items-center gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-bold gap-1"
                    onClick={() => openEdit(mesa)}
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-bold gap-1 text-primary"
                    onClick={() => openPinDialog(mesa)}
                  >
                    <KeyRound className="h-3 w-3" /> PIN
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(mesa)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive */}
          {inactiveMesas.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mesas inativas</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {inactiveMesas.map((mesa) => (
                  <div key={mesa.id} className="rounded-xl border border-border bg-card p-4 space-y-2 opacity-50">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-foreground">{String(mesa.numero).padStart(2, "0")}</span>
                      <Badge variant="outline" className="text-[10px]">Inativa</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(mesa)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(mesa)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Codes */}
          <div className="space-y-4 pt-4">
            <div>
              <h3 className="text-lg font-black text-foreground">QR Codes das mesas</h3>
              <p className="text-xs text-muted-foreground">Cada QR Code direciona para a mesa correspondente.</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {activeMesas.map((mesa) => {
                const url = `${window.location.origin}/mesa/${mesa.numero}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
                return (
                  <div key={mesa.id} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
                    <img src={qrUrl} alt={`Mesa ${String(mesa.numero).padStart(2, "0")}`} className="w-full aspect-square rounded-lg" loading="lazy" />
                    <span className="text-xs font-black text-foreground">Mesa {String(mesa.numero).padStart(2, "0")}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-[10px] h-7 rounded-lg font-bold gap-1"
                      onClick={() => {
                        const printWindow = window.open("", "_blank", "width=400,height=600");
                        if (!printWindow) return;
                        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Mesa ${String(mesa.numero).padStart(2, "0")}</title><style>
                          body{margin:0;padding:40px 20px;font-family:Arial,sans-serif;text-align:center;background:#fff;color:#000}
                          img{width:260px;height:260px;margin:20px auto}
                          .nome{font-size:18px;font-weight:700;margin-bottom:10px}
                          .mesa{font-size:32px;font-weight:900;margin-top:16px}
                          .url{font-size:10px;color:#888;margin-top:8px;word-break:break-all}
                          @media print{body{padding:20mm 10mm}@page{margin:10mm}}
                        </style></head><body>
                          <div class="nome">${storeName}</div>
                          <img src="${qrUrl}" alt="QR Code Mesa ${String(mesa.numero).padStart(2, "0")}" />
                          <div class="mesa">Mesa ${String(mesa.numero).padStart(2, "0")}</div>
                          <div class="url">${url}</div>
                        </body></html>`;
                        printWindow.document.write(html);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 800);
                      }}
                    >
                      Imprimir QR
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingMesa ? `Editar Mesa ${editingMesa.numero}` : "Nova Mesa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingMesa ? "Atualize os dados da mesa" : "Preencha os dados para criar uma nova mesa"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Número da mesa</label>
              <Input
                type="number"
                min={1}
                value={formNumero}
                onChange={(e) => setFormNumero(e.target.value)}
                placeholder="Ex.: 1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Nome/Apelido <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex.: VIP 1, Terraço"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Capacidade <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                type="number"
                min={1}
                value={formCapacidade}
                onChange={(e) => setFormCapacidade(e.target.value)}
                placeholder="Número de lugares"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl font-bold">
              {saving ? "Salvando…" : editingMesa ? "Salvar alterações" : "Criar mesa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch create dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Criar mesas em lote</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cria mesas sequenciais a partir do número {nextNumero}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Quantidade</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Serão criadas mesas de {nextNumero} a {nextNumero + (parseInt(batchCount) || 0) - 1}
            </p>
            <Button onClick={handleBatchCreate} disabled={batchSaving} className="h-11 rounded-xl font-bold">
              {batchSaving ? "Criando…" : `Criar ${batchCount} mesas`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mesa {deleteTarget?.numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mesa será removida permanentemente.
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

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              PIN — Mesa {pinMesa ? String(pinMesa.numero).padStart(2, "0") : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              PINs de vínculo para o tablet do cliente acessar esta mesa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing pins */}
            {mesaPins.filter((p) => p.active).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PINs ativos</p>
                {mesaPins.filter((p) => p.active).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <Badge variant="secondary" className="text-xs">{p.label}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      onClick={() => handleDeactivatePin(p.id)}
                    >
                      <ShieldOff className="w-3.5 h-3.5 mr-1" /> Revogar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Create new pin */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Novo PIN</label>
              <Input
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
              />
            </div>
            <Button onClick={handleCreatePin} disabled={pinSaving} className="h-11 rounded-xl font-bold w-full">
              {pinSaving ? "Criando…" : "Gerar PIN"}
            </Button>

            {/* Inactive pins */}
            {mesaPins.filter((p) => !p.active).length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inativos</p>
                {mesaPins.filter((p) => !p.active).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 opacity-50">
                    <Badge variant="outline" className="text-[10px]">{p.label}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MesasManager;
