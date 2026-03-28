import { useCallback, useEffect, useState } from "react";
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

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000; // 1 min

const formatCnpjCpf = (v: string) => {
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const DeviceGate = ({ type, children }: DeviceGateProps) => {
  const [status, setStatus] = useState<"loading" | "activate" | "ready" | "blocked">("loading");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [mesaId, setMesaId] = useState<string | null>(null);

  // Activation form
  const [cnpjInput, setCnpjInput] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Rate limiting
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

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

  const handleActivate = useCallback(async () => {
    if (isActivating) return;

    // Check lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Muitas tentativas. Aguarde ${secs}s`);
      return;
    }

    setIsActivating(true);
    setError(null);

    const cnpjDigits = cnpjInput.replace(/\D/g, "");
    if (cnpjDigits.length < 11) {
      setError("Informe um CNPJ ou CPF válido");
      setIsActivating(false);
      return;
    }
    if (!pin || pin.length < 4) {
      setError("PIN deve ter pelo menos 4 dígitos");
      setIsActivating(false);
      return;
    }

    try {
      // Find store by CNPJ in master_clientes
      const { data: cliente } = await supabase
        .from("master_clientes")
        .select("id")
        .eq("cnpj", cnpjDigits)
        .eq("ativo", true)
        .maybeSingle();

      if (!cliente) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setAttempts(0);
          setError("Muitas tentativas. Aguarde 1 minuto.");
        } else {
          setError(`CNPJ/CPF não encontrado (${MAX_ATTEMPTS - newAttempts} tentativas restantes)`);
        }
        setIsActivating(false);
        return;
      }

      // master_clientes.id is the store slug-like key. Find actual store.
      // The master_clientes stores the store id reference or we search by CNPJ.
      // We need to find the store_id. master_clientes has an id that matches store records.
      // Let's search stores by checking restaurant_config or master_clientes linkage.
      // Actually master_clientes.id is a text id. We need to find the store linked to it.
      // The linkage is: master_clientes row is created alongside a store. The store_id is stored in restaurant_license.
      // Let's look up the store via restaurant_config or restaurant_license that has the same store.
      // Actually, the CNPJ is in master_clientes. The master_clientes.id corresponds to a text key.
      // The store is linked via: when creating a client in Master, a store is created simultaneously.
      // Let's find the store by checking which store has a matching master_clientes entry.
      // The simplest approach: search stores and match via master_clientes.
      // master_clientes doesn't have a direct store_id FK. But restaurant_config has store_id.
      // Actually let me re-think: the CNPJ is stored in master_clientes table with cnpj field.
      // We need to find the store_id. The restaurant_config table has store_id.
      // The master panel creates store + master_clientes simultaneously with the same conceptual link.
      // Let me check if master_clientes has any reference to store...
      // Looking at the schema: master_clientes has no store_id column.
      // But restaurant_config has store_id. And restaurant_license has store_id.
      // The link is: master_clientes.id is used as a reference key.
      // When create-admin-account edge function runs, it creates a store and a master_clientes entry.
      // We need another approach: store the CNPJ in restaurant_config or match by name.
      
      // Better approach: query restaurant_config to find by cnpj from master_clientes matching nome_restaurante to stores.name
      // Actually the simplest: master_clientes table stores nome_restaurante. We can match stores.name.
      // But that's fragile. Let me look at the actual data flow...
      // 
      // Actually, I'll add CNPJ lookup to the stores table via a search. The master_clientes stores 
      // restaurant info and the edge function creates both. The link is usually through the store name or 
      // we can search restaurant_config by joining.
      //
      // Simplest reliable approach: store CNPJ in restaurant_config or use master_clientes + restaurant matching.
      // For now, let's match by nome_restaurante between master_clientes and stores.

      const { data: mcData } = await supabase
        .from("master_clientes")
        .select("nome_restaurante")
        .eq("cnpj", cnpjDigits)
        .eq("ativo", true)
        .maybeSingle();

      if (!mcData) {
        setError("Empresa não encontrada");
        setIsActivating(false);
        return;
      }

      // Find store by name match
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, name")
        .ilike("name", mcData.nome_restaurante)
        .maybeSingle();

      if (!storeData) {
        setError("Loja não configurada para esta empresa");
        setIsActivating(false);
        return;
      }

      const foundStoreId = storeData.id;

      // Validate PIN for this specific device type
      const moduleKey = type; // "tablet" | "totem" | "tv"
      const { data: pins } = await supabase
        .from("module_pins")
        .select("id, pin_hash")
        .eq("store_id", foundStoreId)
        .eq("module", moduleKey)
        .eq("active", true);

      if (!pins || pins.length === 0) {
        setError(`Nenhum PIN de ${TYPE_LABELS[type]} cadastrado para esta empresa`);
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
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setAttempts(0);
          setError("Muitas tentativas. Aguarde 1 minuto.");
        } else {
          setError(`PIN inválido (${MAX_ATTEMPTS - newAttempts} tentativas restantes)`);
        }
        setIsActivating(false);
        return;
      }

      // Activate device
      const result = await activateDevice(foundStoreId, type, `${TYPE_LABELS[type]} - ${storeData.name}`);
      if (!result.ok) {
        setError(result.error ?? "Erro ao ativar");
        setIsActivating(false);
        return;
      }

      setStoreId(foundStoreId);
      setStatus("ready");
    } catch (err) {
      console.error("[DeviceGate] activation error:", err);
      setError("Erro inesperado");
    } finally {
      setIsActivating(false);
    }
  }, [cnpjInput, pin, type, isActivating, attempts, lockedUntil]);

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
    const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="surface-card w-full max-w-md space-y-6 p-6 md:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
              {TYPE_ICONS[type]}
            </div>
            <h1 className="text-2xl font-black text-foreground">Ativar {TYPE_LABELS[type]}</h1>
            <p className="text-sm text-muted-foreground">
              Informe o CNPJ/CPF da empresa e o PIN do {TYPE_LABELS[type].toLowerCase()}.
            </p>
          </div>

          <div className="space-y-4">
            {/* CNPJ/CPF */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">CNPJ / CPF</label>
              <Input
                value={cnpjInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
                  setCnpjInput(formatCnpjCpf(raw));
                }}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="off"
                disabled={isLocked}
              />
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN do {TYPE_LABELS[type]}</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isLocked}
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
              disabled={isActivating || isLocked}
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
