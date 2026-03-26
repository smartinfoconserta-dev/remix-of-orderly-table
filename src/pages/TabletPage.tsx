import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole, TabletSmartphone } from "lucide-react";
import PedidoFlow from "@/components/PedidoFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import { supabase } from "@/integrations/supabase/client";
import {
  TABLET_BINDING_CHANGED_EVENT,
  TABLET_LOGIN_CHANGED_EVENT,
  getBoundTabletMesaId,
  getTabletLoginUser,
  setBoundTabletMesaId,
  setTabletLoginUser,
  clearBoundTabletMesaId,
  clearTabletLoginUser,
} from "@/lib/tabletBinding";

const TabletPage = () => {
  const { mesas } = useRestaurant();
  const { loginByPin, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mesaId, setMesaId] = useState<string | null>(() => {
    const savedMesa = getBoundTabletMesaId();
    const savedUser = getTabletLoginUser();
    if (savedMesa && !savedUser) {
      clearBoundTabletMesaId();
      return null;
    }
    return savedMesa;
  });
  const [tabletUser, setTabletUser] = useState<string | null>(() => getTabletLoginUser());
  const [storeSlug, setStoreSlug] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // QR Code: se veio ?mesa=ID, vincula automaticamente e pula login/seleção
  useEffect(() => {
    const mesaFromUrl = searchParams.get("mesa");
    if (mesaFromUrl && !mesaId) {
      setBoundTabletMesaId(mesaFromUrl);
      setMesaId(mesaFromUrl);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useRouteLock("/tablet", Boolean(tabletUser || mesaId));

  useEffect(() => {
    if (!mesaId) return;
    setBoundTabletMesaId(mesaId);
  }, [mesaId]);

  useEffect(() => {
    const syncTabletAccess = () => {
      const nextMesaId = getBoundTabletMesaId();
      const nextTabletUser = getTabletLoginUser();

      setMesaId(nextMesaId);
      setTabletUser(nextTabletUser);

      if (!nextMesaId && !nextTabletUser) {
        setStoreSlug("");
        setPin("");
        setLoginError(null);
      }
    };

    window.addEventListener("storage", syncTabletAccess);
    window.addEventListener(TABLET_BINDING_CHANGED_EVENT, syncTabletAccess);
    window.addEventListener(TABLET_LOGIN_CHANGED_EVENT, syncTabletAccess);

    return () => {
      window.removeEventListener("storage", syncTabletAccess);
      window.removeEventListener(TABLET_BINDING_CHANGED_EVENT, syncTabletAccess);
      window.removeEventListener(TABLET_LOGIN_CHANGED_EVENT, syncTabletAccess);
    };
  }, []);

  const mesasOrdenadas = useMemo(() => [...mesas].sort((a, b) => a.numero - b.numero), [mesas]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);

    const result = await loginByPin(storeSlug.trim(), pin);
    console.log("[TabletPage] loginByPin result:", JSON.stringify(result));

    if (!result.ok) {
      setLoginError(result.error ?? "Credenciais inválidas");
      setIsLoggingIn(false);
      return;
    }

    if (result.module !== "cliente") {
      setLoginError("Este PIN não é de Tablet. Cadastre um PIN do módulo 'Tablet' no painel.");
      setIsLoggingIn(false);
      return;
    }

    const userName = result.module ?? "Operador";
    const authenticatedUser = setTabletLoginUser(userName);
    setTabletUser(authenticatedUser);
    setPin("");
    setLoginError(null);

    // Auto-vínculo: buscar se este PIN está associado a um tablet com mesa
    try {
      // Find the pin_id that matched — we need to look it up by store + module
      const { data: tabletRows } = await supabase
        .from("tablets")
        .select("mesa_id")
        .eq("ativo", true)
        .not("mesa_id", "is", null);

      // Since loginByPin doesn't return pin_id, we use the operational session's pinLabel
      // to find the matching tablet. The pin label matches the tablet name.
      if (tabletRows && tabletRows.length > 0) {
        // We'll try to match via the pin label from the auth context
        // For now, check if there's a tablet with a matching pin
        const { data: matchingTablets } = await supabase
          .from("tablets")
          .select("mesa_id, nome, pin_id")
          .eq("ativo", true)
          .not("mesa_id", "is", null)
          .not("pin_id", "is", null);

        if (matchingTablets) {
          // Get all active pins for this store to find which one matched our PIN
          for (const tablet of matchingTablets) {
            if (!tablet.pin_id) continue;
            const { data: pinRow } = await supabase
              .from("module_pins")
              .select("pin_hash")
              .eq("id", tablet.pin_id)
              .eq("active", true)
              .maybeSingle();

            if (pinRow) {
              const { data: isValid } = await supabase.rpc("verify_pin", {
                input_pin: pin,
                stored_hash: pinRow.pin_hash,
              });
              if (isValid && tablet.mesa_id) {
                const boundMesaId = setBoundTabletMesaId(tablet.mesa_id);
                setMesaId(boundMesaId);
                setIsLoggingIn(false);
                return;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[TabletPage] Auto-vínculo falhou, mostrando seleção de mesa:", err);
    }

    setIsLoggingIn(false);
  };

  const handleSelectMesa = (selectedMesaId: string) => {
    const boundMesaId = setBoundTabletMesaId(selectedMesaId);
    setMesaId(boundMesaId);
  };

  const handleDevExit = async () => {
    clearBoundTabletMesaId();
    clearTabletLoginUser();
    setMesaId(null);
    setTabletUser(null);
    setStoreSlug("");
    setPin("");
    setLoginError(null);
    await logout();
    navigate("/", { replace: true });
  };

  if (mesaId) {
    return (
      <div className="relative">
        <button
          onClick={() => void handleDevExit()}
          className="fixed right-2 top-2 z-[9999] rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground opacity-60 transition-opacity hover:opacity-100"
        >
          Sair (dev)
        </button>
        <PedidoFlow modo="cliente" mesaId={mesaId} />
      </div>
    );
  }

  if (!tabletUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="surface-card w-full max-w-md space-y-6 p-6 md:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
              <TabletSmartphone className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Acesso do tablet</h1>
            <p className="text-sm text-muted-foreground">Informe o código da loja e o PIN para liberar o tablet.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Código da Loja</label>
              <Input
                value={storeSlug}
                onChange={(event) => setStoreSlug(event.target.value.slice(0, 40))}
                placeholder="Ex: minha-loja"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleLogin();
                  }
                }}
              />
            </div>

            {loginError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{loginError}</p>}

            <Button onClick={handleLogin} disabled={isLoggingIn} className="h-12 w-full rounded-xl text-base font-black">
              <LockKeyhole className="h-4 w-4" />
              Entrar no tablet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="surface-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Tablet liberado por <span className="text-foreground">{tabletUser}</span></p>
            <h1 className="mt-2 text-2xl font-black text-foreground">Selecionar mesa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha a mesa para vincular este tablet e iniciar o atendimento do cliente.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearTabletLoginUser();
              setTabletUser(null);
            }}
            className="rounded-xl font-bold"
          >
            Trocar login
          </Button>
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
                mesa.status === "consumo"
                  ? "text-emerald-400"
                  : mesa.status === "pendente"
                    ? "text-amber-400"
                    : "text-foreground"
              }`}>
                {String(mesa.numero).padStart(2, "0")}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                mesa.status === "consumo"
                  ? "text-emerald-400"
                  : mesa.status === "pendente"
                    ? "text-amber-400"
                    : "text-muted-foreground"
              }`}>
                {mesa.status === "consumo" ? "Ocupada" : mesa.status === "pendente" ? "Pendente" : "Livre"}
              </span>
              {mesa.status === "consumo" && (
                <span className="text-xs font-black tabular-nums text-emerald-400">
                  {`R$ ${mesa.total.toFixed(2).replace(".", ",")}`}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabletPage;
