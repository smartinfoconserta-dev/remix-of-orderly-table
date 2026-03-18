import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, TabletSmartphone } from "lucide-react";
import PedidoFlow from "@/components/PedidoFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import {
  TABLET_BINDING_CHANGED_EVENT,
  TABLET_LOGIN_CHANGED_EVENT,
  clearTabletLoginUser,
  getBoundTabletMesaId,
  getTabletLoginUser,
  setBoundTabletMesaId,
  setTabletLoginUser,
} from "@/lib/tabletBinding";

const TABLET_USERNAME = "tablet";
const TABLET_PASSWORD = "obsidian";

const ClientePage = () => {
  const { mesas } = useRestaurant();
  const [mesaId, setMesaId] = useState<string | null>(() => getBoundTabletMesaId());
  const [tabletUser, setTabletUser] = useState<string | null>(() => getTabletLoginUser());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useRouteLock("/cliente");

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
        setUsername("");
        setPassword("");
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

  const handleLogin = () => {
    const normalizedUsername = username.trim().toLocaleLowerCase("pt-BR");
    const normalizedPassword = password.trim();

    if (normalizedUsername !== TABLET_USERNAME || normalizedPassword !== TABLET_PASSWORD) {
      setLoginError("Usuário ou senha inválidos para o tablet");
      return;
    }

    const authenticatedUser = setTabletLoginUser(TABLET_USERNAME);
    setTabletUser(authenticatedUser);
    setPassword("");
    setLoginError(null);
  };

  const handleSelectMesa = (selectedMesaId: string) => {
    const boundMesaId = setBoundTabletMesaId(selectedMesaId);
    setMesaId(boundMesaId);
  };

  if (mesaId) {
    return <PedidoFlow modo="cliente" mesaId={mesaId} />;
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
            <p className="text-sm text-muted-foreground">Faça login para liberar o tablet e selecionar a mesa de atendimento.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Usuário</label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value.slice(0, 24))}
                placeholder="Usuário do tablet"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value.slice(0, 24))}
                placeholder="Senha do tablet"
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleLogin();
                  }
                }}
              />
            </div>

            {loginError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{loginError}</p>}

            <Button onClick={handleLogin} className="h-12 w-full rounded-xl text-base font-black">
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Tablet liberado</p>
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
            <Button
              key={mesa.id}
              type="button"
              variant="outline"
              onClick={() => handleSelectMesa(mesa.id)}
              className="flex h-auto min-h-24 flex-col items-start gap-2 rounded-2xl border-border bg-card px-4 py-4 text-left hover:bg-secondary"
            >
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Mesa</span>
              <span className="text-2xl font-black text-foreground">{String(mesa.numero).padStart(2, "0")}</span>
              <span className="text-xs font-medium text-muted-foreground">Status {mesa.status}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientePage;
