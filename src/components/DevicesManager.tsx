import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Power, PowerOff, Trash2, RefreshCw, Monitor, TabletSmartphone, Tv } from "lucide-react";
import { toast } from "sonner";
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

interface DeviceRow {
  id: string;
  device_id: string;
  type: string;
  label: string;
  active: boolean;
  mesa_id: string | null;
  activated_at: string;
  last_seen_at: string | null;
}

interface Props {
  storeId: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  tablet: <TabletSmartphone className="h-4 w-4" />,
  totem: <Monitor className="h-4 w-4" />,
  tv: <Tv className="h-4 w-4" />,
};

const DevicesManager = ({ storeId }: Props) => {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("devices" as any)
      .select("id, device_id, type, label, active, mesa_id, activated_at, last_seen_at")
      .eq("store_id", storeId)
      .order("activated_at", { ascending: false });
    setDevices((data as any as DeviceRow[]) ?? []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (device: DeviceRow) => {
    await supabase
      .from("devices" as any)
      .update({ active: !device.active, updated_at: new Date().toISOString() } as any)
      .eq("id", device.id);
    toast.success(device.active ? "Dispositivo desativado" : "Dispositivo ativado");
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("devices" as any).delete().eq("id", deleteId);
    toast.success("Dispositivo removido");
    setDeleteId(null);
    load();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-foreground">Dispositivos Registrados</h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {devices.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum dispositivo registrado. Acesse <code>/tablet</code>, <code>/totem</code> ou <code>/tv</code> em um dispositivo para ativá-lo.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {devices.map((d) => (
          <div key={d.id} className="surface-card flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
              {TYPE_ICON[d.type] ?? <Monitor className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground truncate">{d.label || d.type}</span>
                <Badge variant={d.active ? "default" : "destructive"} className="text-[10px]">
                  {d.active ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant="outline" className="text-[10px] uppercase">{d.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ativado: {formatDate(d.activated_at)} · Último acesso: {formatDate(d.last_seen_at)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => toggleActive(d)} title={d.active ? "Desativar" : "Ativar"}>
                {d.active ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-emerald-500" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)} title="Remover">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover dispositivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O dispositivo precisará ser ativado novamente com PIN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DevicesManager;
