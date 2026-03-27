import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Building2, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ─── Store search hook ─── */

interface StoreOption {
  name: string;
  slug: string;
}

const useStoreSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase.rpc("search_stores", { query: query.trim() });
      setResults((data as StoreOption[]) ?? []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return { query, setQuery, results, isSearching };
};

/* ─── Admin Login Tab ─── */

const SAVED_CREDS_KEY = "orderly-saved-login-v1";

const AdminLoginTab = () => {
  const navigate = useNavigate();
  const { loginAsMaster, loginAsAdmin } = useAuth();
  const [email, setEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_CREDS_KEY) ?? "{}").email ?? ""; } catch { return ""; }
  });
  const [password, setPassword] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_CREDS_KEY) ?? "{}").password ?? ""; } catch { return ""; }
  });
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem(SAVED_CREDS_KEY) ?? "{}").email; } catch { return false; }
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Preencha email e senha");
      return;
    }
    setLoading(true);
    setError(null);

    // Save or clear credentials
    if (rememberMe) {
      localStorage.setItem(SAVED_CREDS_KEY, JSON.stringify({ email: email.trim(), password }));
    } else {
      localStorage.removeItem(SAVED_CREDS_KEY);
    }

    // Try master first, then admin
    const masterResult = await loginAsMaster(email.trim(), password);
    if (masterResult.ok) {
      navigate("/master");
      return;
    }

    const adminResult = await loginAsAdmin(email.trim(), password);
    if (adminResult.ok) {
      navigate("/admin");
      return;
    }

    setError(adminResult.error ?? "Credenciais inválidas ou sem permissão");
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Senha</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => {
            setRememberMe(e.target.checked);
            if (!e.target.checked) localStorage.removeItem(SAVED_CREDS_KEY);
          }}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-muted-foreground">Lembrar credenciais</span>
      </label>
      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button onClick={handleLogin} disabled={loading} className="h-11 rounded-xl text-base font-bold">
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </div>
  );
};

/* ─── Operational Login Tab ─── */

const OperationalLoginTab = () => {
  const navigate = useNavigate();
  const { loginByPin } = useAuth();
  const { query, setQuery, results, isSearching } = useStoreSearch();
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelectStore = (store: StoreOption) => {
    setSelectedSlug(store.slug);
    setSelectedName(store.name);
    setQuery(store.name);
    setShowDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedSlug) {
      setError("Selecione uma empresa");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("O PIN deve ter entre 4 e 6 números");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await loginByPin(selectedSlug, pin);

    if (!result.ok) {
      setError(result.error ?? "Não foi possível entrar");
      setLoading(false);
      return;
    }

    const moduleRouteMap: Record<string, string> = { tv_retirada: "tv", cliente: "tablet" };
    navigate(`/${moduleRouteMap[result.module!] ?? result.module}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="space-y-2 relative" ref={dropdownRef}>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4" />
          Empresa
        </label>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedSlug("");
            setSelectedName("");
            setShowDropdown(true);
          }}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder="Digite o nome ou código da empresa"
        />
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
            {results.map((store) => (
              <button
                key={store.slug}
                type="button"
                onClick={() => handleSelectStore(store)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent transition-colors"
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-medium text-foreground">{store.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{store.slug}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {showDropdown && query.length >= 2 && results.length === 0 && !isSearching && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg">
            Nenhuma empresa encontrada
          </div>
        )}
        {selectedName && (
          <p className="text-xs text-muted-foreground">
            Selecionada: <span className="font-semibold text-foreground">{selectedName}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Hash className="h-4 w-4" />
          PIN numérico
        </label>
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="4 a 6 dígitos"
          inputMode="numeric"
          autoComplete="one-time-code"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button onClick={handleSubmit} disabled={loading} className="h-11 rounded-xl text-base font-bold">
        {loading ? "Verificando…" : "Entrar"}
      </Button>
    </div>
  );
};

/* ─── Main Page ─── */

const Index = () => {
  const navigate = useNavigate();
  const { authLevel, operationalSession, isLoading } = useAuth();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoading) return;
    if (authLevel === "master") navigate("/master", { replace: true });
    else if (authLevel === "admin") navigate("/admin", { replace: true });
    else if (authLevel === "operational" && operationalSession?.module) {
      navigate(`/${operationalSession.module}`, { replace: true });
    }
  }, [authLevel, operationalSession, isLoading, navigate]);

  // PWA install prompt
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const deferredRef = useRef<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e;
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredRef.current) return;
    deferredRef.current.prompt();
    const result = await deferredRef.current.userChoicePromise;
    if (result?.outcome === "accepted") setShowInstallBanner(false);
    deferredRef.current = null;
  };

  if (isLoading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center mb-2">
        <h1 className="text-foreground text-3xl md:text-4xl font-black tracking-tight">
          Orderly Table
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mt-2">
          Acesse o sistema
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="surface-card p-6 md:p-7">
          <Tabs defaultValue="admin">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="admin" className="gap-2">
                <KeyRound className="h-4 w-4" />
                Administração
              </TabsTrigger>
              <TabsTrigger value="operational" className="gap-2">
                <Hash className="h-4 w-4" />
                Operacional
              </TabsTrigger>
            </TabsList>
            <TabsContent value="admin">
              <AdminLoginTab />
            </TabsContent>
            <TabsContent value="operational">
              <OperationalLoginTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showInstallBanner && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleInstall}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 rounded-2xl bg-primary/15 border border-primary/25 px-4 py-3 text-sm font-bold text-primary backdrop-blur-sm transition-colors hover:bg-primary/20"
          >
            📲 Instalar como app — toque aqui
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
