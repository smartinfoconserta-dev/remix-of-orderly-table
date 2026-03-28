import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestaurant } from "@/contexts/RestaurantContext";
import DeviceGate from "@/components/DeviceGate";
import { getStoredDeviceId, clearStoredDeviceId } from "@/lib/deviceAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LockKeyhole, LogOut } from "lucide-react";
import { toast } from "sonner";

const MESA_STORAGE_KEY = "orderly-tablet-mesa";

/** Update mesa_id on the devices table for this device */
async function updateDeviceMesa(mesaId: string | null) {
  const deviceId = getStoredDeviceId();
  if (!deviceId) return;
  try {
    await supabase
      .from("devices")
      .update({ mesa_id: mesaId } as any)
      .eq("device_id", deviceId);
  } catch (err) {
    console.error("[TabletPage] updateDeviceMesa error:", err);
  }
}

function saveMesaToStorage(mesaId: string) {
  try { sessionStorage.setItem(MESA_STORAGE_KEY, mesaId); } catch {}
}

function getMesaFromStorage(): string | null {
  try { return sessionStorage.getItem(MESA_STORAGE_KEY); } catch { return null; }
}

function clearMesaFromStorage() {
  try { sessionStorage.removeItem(MESA_STORAGE_KEY); } catch {}
}

async function logEvento(storeId: string, tipo: string, email: string, descricao: string) {
  try {
    await supabase.rpc("rpc_insert_evento", {
      _data: {
        id: crypto.randomUUID(),
        store_id: storeId,
        tipo,
        usuario_nome: email,
        descricao,
        criado_em: new Date().toLocaleString("pt-BR"),
        criado_em_iso: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[TabletPage] logEvento error:", err);
  }
}

const TabletInner = ({ storeId, initialMesaId }: { storeId: string; initialMesaId?: string | null }) => {
  const { mesas } = useRestaurant();
  const [searchParams] = useSearchParams();

  const [mesaId, setMesaId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("mesa");
    if (fromUrl) return fromUrl;
    const fromStorage = getMesaFromStorage();
    if (fromStorage) return fromStorage;
    if (initialMesaId) return initialMesaId;
    return null;
  });

  // Auth dialog state
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authAction, setAuthAction] = useState<"mesa" | "deactivate">("mesa");

  // Track if user is authenticated for mesa selection
  const [authenticated, setAuthenticated] = useState(false);
  const [authUserEmail, setAuthUserEmail] = useState("");

  // When mesaId changes, persist to DB and sessionStorage
  useEffect(() => {
    if (mesaId) {
      updateDeviceMesa(mesaId);
      saveMesaToStorage(mesaId);
    }
  }, [mesaId]);

  const mesasOrdenadas = useMemo(() => [...mesas].sort((a, b) => a.numero - b.numero), [mesas]);

  const openAuthDialog = useCallback((action: "mesa" | "deactivate") => {
    setAuthAction(action);
    setAuthEmail("");
    setAuthPassword("");
    setAuthError(null);
    setAuthLoading(false);
    setAuthOpen(true);
  }, []);

  const handleAuth = useCallback(async () => {
    if (authLoading || !authEmail.trim() || !authPassword) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) {
        setAuthError("Email ou senha inválidos");
        setAuthLoading(false);
        return;
      }

      // Salva email ANTES do signOut
      const userEmail = authEmail.trim();
      
      // SignOut IMEDIATO para não contaminar AuthContext
      await supabase.auth.signOut();
      
      setAuthUserEmail(userEmail);
      setAuthOpen(false);
      setAuthLoading(false);

      if (authAction === "deactivate") {
        await logEvento(storeId, "tablet_desativado", userEmail, `Dispositivo desativado por ${userEmail}`);
        updateDeviceMesa(null);
        clearMesaFromStorage();
        clearStoredDeviceId();
        toast.success("Dispositivo desativado", { duration: 1500 });
        window.location.reload();
      } else {
        setAuthenticated(true);
      }
    } catch {
      setAuthError("Erro ao autenticar");
      setAuthLoading(false);
    }
  }, [authEmail, authPassword, authLoading, authAction, storeId]);

  const handleSelectMesa = useCallback(async (selectedMesaId: string) => {
    setMesaId(selectedMesaId);
    saveMesaToStorage(selectedMesaId);
    const mesaNum = mesas.find((m) => m.id === selectedMesaId)?.numero;
    await logEvento(
      storeId,
      "tablet_mesa_vinculada",
      authUserEmail,
      `Mesa ${mesaNum ?? "?"} vinculada por ${authUserEmail}`
    );
    setAuthenticated(false);
    setAuthUserEmail("");
    toast.success(`Mesa ${String(mesaNum ?? "").padStart(2, "0")} vinculada`, { duration: 1200 });
  }, [mesas, storeId, authUserEmail]);

  // If mesa is set, show PedidoFlow directly
  if (mesaId) {
    return <PedidoFlow modo="cliente" mesaId={mesaId} />;
  }

  // No mesa yet: need auth before showing mesa grid
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="surface-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Tablet não vinculado</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Um funcionário precisa vincular este tablet a uma mesa.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openAuthDialog("mesa")} className="rounded-xl font-bold">
                <LockKeyhole className="mr-2 h-4 w-4" />
                Vincular mesa
              </Button>
              <Button variant="outline" onClick={() => openAuthDialog("deactivate")} className="rounded-xl font-bold">
                <LogOut className="mr-2 h-4 w-4" />
                Desativar
              </Button>
            </div>
          </div>
        </div>

        {/* Auth dialog */}
        <Dialog open={authOpen} onOpenChange={(open) => !open && setAuthOpen(false)}>
          <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5" />
                Autenticação de funcionário
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {authAction === "deactivate"
                  ? "Insira suas credenciais para desativar o dispositivo."
                  : "Insira suas credenciais para vincular uma mesa."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="funcionario@empresa.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Senha</label>
                <Input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAuth();
                    }
                  }}
                />
              </div>
              {authError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {authError}
                </p>
              )}
              <Button onClick={handleAuth} disabled={authLoading} className="h-11 w-full rounded-xl font-black">
                <LockKeyhole className="h-4 w-4" />
                {authLoading ? "Autenticando..." : "Entrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Authenticated: show mesa grid
  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="surface-card flex flex-col gap-3 p-5">
          <h1 className="text-2xl font-black text-foreground">Selecionar mesa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha a mesa para vincular este tablet.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {mesasOrdenadas.map((mesa) => (
            <button
              key={mesa.id}
              type="button"
              onClick={() => handleSelectMesa(mesa.id)}
              className={`flex h-auto min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-4 transition-colors ${
                mesa.status === "consumo"
                  ? "border-emerald-500/50 bg-emerald-500/8"
                  : mesa.status === "pendente"
                    ? "border-amber-500/50 bg-amber-500/8"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className={`text-3xl font-black tabular-nums ${
                mesa.status === "consumo" ? "text-emerald-400" : mesa.status === "pendente" ? "text-amber-400" : "text-foreground"
              }`}>
                {String(mesa.numero).padStart(2, "0")}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                mesa.status === "consumo" ? "text-emerald-400" : mesa.status === "pendente" ? "text-amber-400" : "text-muted-foreground"
              }`}>
                {mesa.status === "consumo" ? "Ocupada" : mesa.status === "pendente" ? "Pendente" : "Livre"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TabletPage = () => (
  <DeviceGate type="tablet">
    {({ storeId, mesaId }) => <TabletInner storeId={storeId} initialMesaId={mesaId} />}
  </DeviceGate>
);

export default TabletPage;
