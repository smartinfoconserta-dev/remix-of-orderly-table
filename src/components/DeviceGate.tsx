import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor, TabletSmartphone, Tv, LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  getStoredDeviceId,
  validateDevice,
  activateDevice,
  clearStoredDeviceId,
  type DeviceType,
} from "@/lib/deviceAuth";

interface DeviceGateProps {
  type: DeviceType;
  children: (ctx: { storeId: string; mesaId?: string | null }) => React.ReactNode;
}

const TYPE_LABELS: Record<DeviceType, string> = {
  tablet: "Tablet",
  totem: "Totem",
  tv: "TV",
};

const TYPE_ICONS: Record<DeviceType, React.ReactNode> = {
  tablet: <TabletSmartphone className="h-6 w-6" />,
  totem: <Monitor className="h-6 w-6" />,
  tv: <Tv className="h-6 w-6" />,
};

interface StoreOption {
  id: string;
  name: string;
  slug: string;
}

const DeviceGate = ({ type, children }: DeviceGateProps) => {
  const [status, setStatus] = useState<"loading" | "activate" | "ready" | "blocked">("loading");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [mesaId, setMesaId] = useState<string | null>(null);

  // Activation form
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);

  // On mount, check if device is already registered
  useEffect(() => {
    const check = async () => {
      const deviceId = getStoredDeviceId();
      if (!deviceId) {
        setStatus("activate");
        return;
      }

      const result = await validateDevice(deviceId);
      if (result.ok && result.storeId) {
        setStoreId(result.storeId);
        setMesaId(result.mesaId ?? null);
        setStatus("ready");
      } else {
        clearStoredDeviceId();
        setError(result.error ?? null);
        setStatus(result.error?.includes("desativado") ? "blocked" : "activate");
      }
    };
    check();
  }, []);

  // Load stores when activation screen shows
  useEffect(() => {
    if (status !== "activate") return;
    const loadStores = async () => {
      setLoadingStores(true);
      try {
        const { data } = await supabase
          .from("stores")
          .select("id, name, slug")
          .order("name");
        setStores(data ?? []);
      } catch {
        console.error("[DeviceGate] failed to load stores");
      } finally {
        setLoadingStores(false);
      }
    };
    loadStores();
  }, [status]);

  const handleActivate = useCallback(async () => {
    if (isActivating) return;
    setIsActivating(true);
    setError(null);

    if (!selectedStoreId) {
      setError("Selecione uma empresa");
      setIsActivating(false);
      return;
    }
    if (!pin || pin.length < 4) {
      setError("PIN deve ter pelo menos 4 dígitos");
      setIsActivating(false);
      return;
    }

    try {
      const store = stores.find((s) => s.id === selectedStoreId);
      if (!store) {
        setError("Empresa não encontrada");
        setIsActivating(false);
        return;
      }

      // Validate PIN against module_pins for this store
      const { data: pins } = await supabase
        .from("module_pins")
        .select("id, pin_hash, module")
        .eq("store_id", store.id)
        .eq("active", true);

      if (!pins || pins.length === 0) {
        setError("Nenhum PIN cadastrado para esta empresa");
        setIsActivating(false);
        return;
      }

      let pinValid = false;
      for (const p of pins) {
        const { data: isMatch } = await supabase.rpc("verify_pin", {
          input_pin: pin,
          stored_hash: p.pin_hash,
        });
        if (isMatch) {
          pinValid = true;
          break;
        }
      }

      if (!pinValid) {
        setError("PIN inválido");
        setIsActivating(false);
        return;
      }

      // Activate device
      const result = await activateDevice(store.id, type, `${TYPE_LABELS[type]} - ${store.name}`);
      if (!result.ok) {
        setError(result.error ?? "Erro ao ativar");
        setIsActivating(false);
        return;
      }

      setStoreId(store.id);
      setStatus("ready");
    } catch (err) {
      console.error("[DeviceGate] activation error:", err);
      setError("Erro inesperado");
    } finally {
      setIsActivating(false);
    }
  }, [selectedStoreId, pin, type, isActivating, stores]);

  // Loading
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Verificando dispositivo...</p>
        </div>
      </div>
    );
  }

  // Blocked
  if (status === "blocked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="surface-card w-full max-w-md space-y-6 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-foreground">Dispositivo bloqueado</h1>
          <p className="text-sm text-muted-foreground">
            Este dispositivo foi desativado pelo administrador. Entre em contato com o responsável.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              clearStoredDeviceId();
              setError(null);
              setStatus("activate");
            }}
          >
            Tentar nova ativação
          </Button>
        </div>
      </div>
    );
  }

  // Activation form
  if (status === "activate") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="surface-card w-full max-w-md space-y-6 p-6 md:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
              {TYPE_ICONS[type]}
            </div>
            <h1 className="text-2xl font-black text-foreground">Ativar {TYPE_LABELS[type]}</h1>
            <p className="text-sm text-muted-foreground">
              Selecione a empresa e informe o PIN para registrar este dispositivo.
            </p>
          </div>

          <div className="space-y-4">
            {/* Store autocomplete */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Empresa</label>
              <div className="relative">
                <Input
                  value={storeSearch}
                  onChange={(e) => {
                    setStoreSearch(e.target.value);
                    setSelectedStoreId("");
                    setShowStoreList(true);
                  }}
                  onFocus={() => setShowStoreList(true)}
                  placeholder={loadingStores ? "Carregando..." : "Digite o nome da empresa"}
                  autoComplete="off"
                  disabled={loadingStores}
                />
                {showStoreList && filteredStores.length > 0 && !selectedStoreId && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                    {filteredStores.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStoreId(s.id);
                          setStoreSearch(s.name);
                          setShowStoreList(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {showStoreList && storeSearch.length > 0 && filteredStores.length === 0 && !selectedStoreId && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg px-4 py-3">
                    <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN de Ativação</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleActivate();
                  }
                }}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="h-12 w-full rounded-xl text-base font-black"
            >
              {isActivating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              {isActivating ? "Ativando..." : "Ativar dispositivo"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ready
  if (storeId) {
    return <>{children({ storeId, mesaId })}</>;
  }

  return null;
};

export default DeviceGate;
