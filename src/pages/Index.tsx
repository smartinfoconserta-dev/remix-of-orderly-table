import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn, UtensilsCrossed, Hash, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SAVED_EMAIL_KEY = "orderly-saved-email-v1";

type LoginTab = "proprietario" | "funcionario";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authLevel, operationalSession, isLoading, loginUnified, loginByPin } = useAuth();
  const suppressAutoRedirect = Boolean((location.state as { suppressAutoRedirect?: boolean } | null)?.suppressAutoRedirect);

  const [activeTab, setActiveTab] = useState<LoginTab>("proprietario");

  // Proprietário fields
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(SAVED_EMAIL_KEY) ?? ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");

  // Funcionário fields
  const [cnpj, setCnpj] = useState("");
  const [pin, setPin] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoading || suppressAutoRedirect) return;
    const routeMap: Record<string, string> = { tv_retirada: "tv", cliente: "tablet", garcom_pdv: "garcom-pdv", "garcom-pdv": "garcom-pdv" };
    if (authLevel === "master") navigate("/master", { replace: true });
    else if (authLevel === "admin") navigate("/admin", { replace: true });
    else if (authLevel === "operational" && operationalSession?.module) {
      navigate(`/${routeMap[operationalSession.module] ?? operationalSession.module}`, { replace: true });
    }
  }, [authLevel, operationalSession, isLoading, navigate, suppressAutoRedirect]);

  // CNPJ mask
  const handleCnpjChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    let masked = digits;
    if (digits.length > 12) masked = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
    else if (digits.length > 8) masked = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
    else if (digits.length > 5) masked = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
    else if (digits.length > 2) masked = `${digits.slice(0,2)}.${digits.slice(2)}`;
    setCnpj(masked);
  };

  // Proprietário login
  const handleLoginProprietario = async () => {
    if (!email.trim() || !password) {
      setError("Preencha email e senha");
      return;
    }
    setLoading(true);
    setError(null);
    try { localStorage.setItem(SAVED_EMAIL_KEY, email.trim()); } catch {}
    try { sessionStorage.removeItem("orderly-saved-login-v1"); } catch {}

    const result = await loginUnified(email.trim(), password);
    if (!result.ok) {
      setError(result.error ?? "Credenciais inválidas");
      setLoading(false);
      return;
    }
    if (result.redirect) navigate(result.redirect);
  };

  // Funcionário login (CNPJ + PIN)
  const handleLoginFuncionario = async () => {
    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 11) {
      setError("Informe o CNPJ/CPF completo");
      return;
    }
    if (!pin.trim()) {
      setError("Informe o PIN");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Find store by CNPJ
      const { data: storeRows, error: storeErr } = await supabase
        .rpc("get_store_by_cnpj", { _cnpj: cnpjDigits });

      const store = storeRows?.[0];
      if (storeErr || !store) {
        setError("Estabelecimento não encontrado com esse CNPJ/CPF");
        setLoading(false);
        return;
      }

      // 2. Get store slug
      const { data: storeData } = await supabase
        .from("stores")
        .select("slug")
        .eq("id", store.store_id)
        .maybeSingle();

      if (!storeData?.slug) {
        setError("Erro ao localizar loja");
        setLoading(false);
        return;
      }

      // 3. Login by PIN (auto-detect module)
      const result = await loginByPin(storeData.slug, pin.trim());
      if (!result.ok) {
        setError(result.error ?? "PIN inválido");
        setLoading(false);
        return;
      }

      // 4. Resolve garcom route based on store mode
      let module = result.module!;
      if (module === "garcom") {
        const { data: cfg } = await supabase
          .from("restaurant_config")
          .select("modulos")
          .eq("store_id", store.store_id)
          .maybeSingle();
        const modulos = (cfg?.modulos as Record<string, boolean>) ?? {};
        if (modulos.mesas === false) module = "garcom-pdv";
      }

      // 5. Redirect to module
      const routeMap: Record<string, string> = { tv_retirada: "tv", cliente: "tablet", garcom_pdv: "garcom-pdv", "garcom-pdv": "garcom-pdv" };
      const route = routeMap[module] ?? module;
      navigate(`/${route}`, { replace: true });
    } catch {
      setError("Erro ao conectar. Tente novamente.");
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (activeTab === "proprietario") handleLoginProprietario();
    else handleLoginFuncionario();
  };

  // Clear error on tab switch
  const switchTab = (tab: LoginTab) => {
    setActiveTab(tab);
    setError(null);
  };

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
    <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <UtensilsCrossed className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-foreground text-3xl md:text-4xl font-black tracking-tight">
            Orderly Table
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-2">
            Sistema de gestão para restaurantes
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="surface-card p-6 md:p-7">
            {/* Tab switcher */}
            <div className="flex rounded-xl bg-muted p-1 mb-5">
              <button
                type="button"
                onClick={() => switchTab("proprietario")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  activeTab === "proprietario"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Proprietário
              </button>
              <button
                type="button"
                onClick={() => switchTab("funcionario")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  activeTab === "funcionario"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Funcionário
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {activeTab === "proprietario" ? (
                <>
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
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">CNPJ do Restaurante</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={cnpj}
                        onChange={(e) => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">PIN</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••"
                        className="pl-10"
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      />
                    </div>
                  </div>
                </>
              )}

              {error && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button onClick={handleSubmit} disabled={loading} className="h-11 rounded-xl text-base font-bold gap-2">
                <LogIn className="h-4 w-4" />
                {loading
                  ? "Entrando…"
                  : activeTab === "proprietario"
                    ? "Entrar"
                    : "Entrar com PIN"
                }
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground/40 font-medium tracking-wide pb-2">
        v1.0 • Orderly Table
      </p>

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
