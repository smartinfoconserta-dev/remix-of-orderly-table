import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const MODULES = [
  { value: "garcom", label: "Garçom" },
  { value: "garcom_pdv", label: "Garçom PDV" },
  { value: "caixa", label: "Caixa" },
  { value: "cozinha", label: "Cozinha" },
  { value: "delivery", label: "Delivery" },
  { value: "totem", label: "Totem" },
  { value: "tv_retirada", label: "TV Retirada" },
  { value: "gerente", label: "Gerente" },
  { value: "motoboy", label: "Motoboy" },
  { value: "administrador", label: "Administrador" },
  { value: "cardapio", label: "Cardápio" },
];

const MODULE_LABELS: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.value, m.label]));

interface PinRow {
  id: string;
  module: string;
  label: string | null;
  active: boolean | null;
  created_at: string | null;
}

interface Props {
  stores: { id: string; name: string; slug: string }[];
}

const StorePinsManager = ({ stores }: Props) => {
  const [selectedStore, setSelectedStore] = useState<string>(stores[0]?.id ?? "");
  const [pins, setPins] = useState<PinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formModule, setFormModule] = useState("garcom");
  const [formPin, setFormPin] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPins = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("module_pins")
      .select("id, module, label, active, created_at")
      .eq("store_id", selectedStore)
      .order("module")
      .order("created_at", { ascending: false });
    setPins((data as PinRow[]) ?? []);
    setLoading(false);
  }, [selectedStore]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const handleAdd = async () => {
    if (!/^\d{4,6}$/.test(formPin)) {
      toast.error("O PIN deve ter entre 4 e 6 dígitos");
      return;
    }
    setSaving(true);

    const { error } = await supabase.rpc("create_module_pin", {
      _store_id: selectedStore,
      _module: formModule,
      _pin: formPin,
      _label: formLabel.trim() || null,
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("PIN adicionado");
    setDialogOpen(false);
    setFormPin("");
    setFormLabel("");
    setSaving(false);
    fetchPins();
  };

  const handleDeactivate = async (pinId: string) => {
    const { error } = await supabase
      .from("module_pins")
      .update({ active: false })
      .eq("id", pinId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("PIN desativado");
    fetchPins();
  };

  const activePins = pins.filter((p) => p.active);
  const inactivePins = pins.filter((p) => !p.active);

  // Group active pins by module
  const grouped = activePins.reduce<Record<string, PinRow[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const storeName = stores.find((s) => s.id === selectedStore)?.name ?? "";

  return (
    <div className="space-y-4">
      {/* Store selector */}
      {stores.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Loja:</span>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {stores.length === 1 && (
        <p className="text-sm text-muted-foreground">Loja: <span className="font-semibold text-foreground">{storeName}</span></p>
      )}

      {/* Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" /> PINs Ativos
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar PIN
        </Button>
      </div>

      {/* Active PINs by module */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : activePins.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum PIN ativo para esta loja.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([mod, modPins]) => (
            <div key={mod} className="rounded-xl border bg-card p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">{MODULE_LABELS[mod] ?? mod}</p>
              {modPins.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{p.label || "Sem rótulo"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : ""}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeactivate(p.id)}
                  >
                    <ShieldOff className="w-4 h-4 mr-1" /> Desativar
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Inactive PINs */}
      {inactivePins.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inativos</p>
          {inactivePins.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 opacity-60">
              <Badge variant="outline" className="text-xs">{MODULE_LABELS[p.module] ?? p.module}</Badge>
              <span className="text-xs text-muted-foreground">{p.label || "Sem rótulo"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add PIN Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Novo PIN</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Módulo</label>
              <Select value={formModule} onValueChange={setFormModule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN numérico</label>
              <Input
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Rótulo <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Ex.: Garçom João"
                maxLength={40}
              />
            </div>
            <Button onClick={handleAdd} disabled={saving} className="h-11 rounded-xl font-bold">
              {saving ? "Salvando…" : "Salvar PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorePinsManager;
