import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, RefreshCw, Copy, Eye, TabletSmartphone, Monitor, Tv } from "lucide-react";
import { toast } from "sonner";

interface Props {
  storeId: string;
}

const DEVICE_TYPES = [
  { module: "tablet", label: "Tablet", icon: TabletSmartphone, desc: "PIN usado para ativar tablets do restaurante" },
  { module: "totem", label: "Totem", icon: Monitor, desc: "PIN usado para ativar totens de autoatendimento" },
  { module: "tv", label: "TV", icon: Tv, desc: "PIN usado para ativar telas de retirada" },
] as const;

interface PinState {
  pinId: string | null;
  pinCode: string | null; // only available right after creation
  exists: boolean;
}

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

const DevicePinsManager = ({ storeId }: Props) => {
  const [pins, setPins] = useState<Record<string, PinState>>({
    tablet: { pinId: null, pinCode: null, exists: false },
    totem: { pinId: null, pinCode: null, exists: false },
    tv: { pinId: null, pinCode: null, exists: false },
  });
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  // "Ver PIN" flow
  const [verPinModule, setVerPinModule] = useState<string | null>(null);
  const [verPinPassword, setVerPinPassword] = useState("");
  const [verPinLoading, setVerPinLoading] = useState(false);

  const loadPins = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_pins")
      .select("id, module, label")
      .eq("store_id", storeId)
      .in("module", ["tablet", "totem", "tv"])
      .eq("active", true);

    const newPins: Record<string, PinState> = {
      tablet: { pinId: null, pinCode: null, exists: false },
      totem: { pinId: null, pinCode: null, exists: false },
      tv: { pinId: null, pinCode: null, exists: false },
    };

    if (data) {
      for (const row of data) {
        if (row.module in newPins) {
          newPins[row.module] = { pinId: row.id, pinCode: null, exists: true };
        }
      }
    }

    setPins(newPins);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { loadPins(); }, [loadPins]);

  const handleCreateOrRegenerate = async (module: string) => {
    setRegenerating(module);
    const newPin = generatePin();
    const current = pins[module];

    // Deactivate old
    if (current?.pinId) {
      await supabase.from("module_pins").update({ active: false }).eq("id", current.pinId);
    }

    // Create new
    const label = DEVICE_TYPES.find(d => d.module === module)?.label ?? module;
    const { data: pinId, error } = await supabase.rpc("create_module_pin", {
      _store_id: storeId,
      _module: module,
      _pin: newPin,
      _label: `PIN ${label}`,
    });

    if (error || !pinId) {
      toast.error("Erro ao gerar PIN");
      setRegenerating(null);
      return;
    }

    // When PIN changes via regenerate, invalidate all devices of this type
    await supabase
      .from("devices")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("type", module);

    setPins(prev => ({
      ...prev,
      [module]: { pinId, pinCode: newPin, exists: true },
    }));

    setRegenerating(null);
    toast.success(current?.exists ? `Novo PIN de ${label} gerado! Dispositivos antigos foram desativados.` : `PIN de ${label} criado!`);
  };

  // "Ver PIN" — generates a new PIN WITHOUT deactivating existing devices
  const handleVerPin = async () => {
    if (!verPinModule || !verPinPassword.trim()) return;
    setVerPinLoading(true);

    // Verify admin password by re-authenticating
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("Não foi possível verificar o usuário logado");
      setVerPinLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: verPinPassword,
    });

    if (authError) {
      toast.error("Senha incorreta");
      setVerPinLoading(false);
      return;
    }

    // Generate new PIN without deactivating old one or devices
    const newPin = generatePin();
    const current = pins[verPinModule];
    const label = DEVICE_TYPES.find(d => d.module === verPinModule)?.label ?? verPinModule;

    // Deactivate old PIN record (but NOT devices)
    if (current?.pinId) {
      await supabase.from("module_pins").update({ active: false }).eq("id", current.pinId);
    }

    const { data: pinId, error } = await supabase.rpc("create_module_pin", {
      _store_id: storeId,
      _module: verPinModule,
      _pin: newPin,
      _label: `PIN ${label}`,
    });

    if (error || !pinId) {
      toast.error("Erro ao gerar PIN");
      setVerPinLoading(false);
      return;
    }

    setPins(prev => ({
      ...prev,
      [verPinModule!]: { pinId, pinCode: newPin, exists: true },
    }));

    setVerPinLoading(false);
    setVerPinModule(null);
    setVerPinPassword("");
    toast.success(`Novo PIN de ${label} gerado! Dispositivos existentes continuam ativos.`);
  };

  const copyPin = (module: string) => {
    const code = pins[module]?.pinCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("PIN copiado!");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Carregando PINs...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-black text-foreground">PINs de Ativação</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cada tipo de dispositivo possui um PIN separado. O PIN é exigido apenas no primeiro acesso.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {DEVICE_TYPES.map(({ module, label, icon: Icon, desc }) => {
          const state = pins[module];
          const isRegen = regenerating === module;

          return (
            <div key={module} className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">PIN do {label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>

              {state.pinCode ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-3xl font-black tabular-nums tracking-[0.3em] text-primary">{state.pinCode}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyPin(module)} className="gap-1 rounded-lg text-xs">
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCreateOrRegenerate(module)} disabled={isRegen} className="gap-1 rounded-lg text-xs">
                      <RefreshCw className={`h-3 w-3 ${isRegen ? "animate-spin" : ""}`} /> Regenerar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Ao regenerar, dispositivos atuais serão desativados.</p>
                </div>
              ) : state.exists ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">PIN configurado ✓</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setVerPinModule(module); setVerPinPassword(""); }}
                      className="gap-1 rounded-lg text-xs"
                    >
                      <Eye className="h-3 w-3" /> Ver PIN
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCreateOrRegenerate(module)} disabled={isRegen} className="gap-1 rounded-lg text-xs">
                      <RefreshCw className={`h-3 w-3 ${isRegen ? "animate-spin" : ""}`} /> Regenerar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">"Ver PIN" gera um novo sem desativar dispositivos.</p>
                </div>
              ) : (
                <Button onClick={() => handleCreateOrRegenerate(module)} disabled={isRegen} className="h-10 w-full rounded-xl font-bold gap-2 text-sm">
                  <KeyRound className="h-4 w-4" />
                  {isRegen ? "Gerando…" : `Gerar PIN`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Verify password dialog for "Ver PIN" */}
      <Dialog open={!!verPinModule} onOpenChange={(open) => { if (!open) { setVerPinModule(null); setVerPinPassword(""); } }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Confirmar identidade</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Digite sua senha para gerar um novo PIN de <span className="font-semibold text-foreground">{DEVICE_TYPES.find(d => d.module === verPinModule)?.label}</span> sem desativar dispositivos existentes.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Senha</label>
              <Input
                type="password"
                value={verPinPassword}
                onChange={(e) => setVerPinPassword(e.target.value)}
                placeholder="Sua senha de login"
                onKeyDown={(e) => { if (e.key === "Enter") handleVerPin(); }}
                autoFocus
              />
            </div>
            <Button onClick={handleVerPin} disabled={verPinLoading || !verPinPassword.trim()} className="h-11 rounded-xl font-bold">
              {verPinLoading ? "Verificando…" : "Confirmar e ver PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevicePinsManager;
