import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ─── Saved credentials ─── */

const SAVED_CREDS_KEY = "orderly-saved-login-v1";

const Index = () => {
  const navigate = useNavigate();
  const { authLevel, operationalSession, isLoading, loginUnified } = useAuth();

  const [email, setEmail] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SAVED_CREDS_KEY) ?? "{}").email ?? ""; } catch { return ""; }
  });
  const [password, setPassword] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SAVED_CREDS_KEY) ?? "{}").password ?? ""; } catch { return ""; }
  });
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!JSON.parse(sessionStorage.getItem(SAVED_CREDS_KEY) ?? "{}").email; } catch { return false; }
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoading) return;
    const routeMap: Record<string, string> = { tv_retirada: "tv", cliente: "tablet" };
    if (authLevel === "master") navigate("/master", { replace: true });
    else if (authLevel === "admin") navigate("/admin", { replace: true });
    else if (authLevel === "operational" && operationalSession?.module) {
      navigate(`/${routeMap[operationalSession.module] ?? operationalSession.module}`, { replace: true });
    }
  }, [authLevel, operationalSession, isLoading, navigate]);

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

    const result = await loginUnified(email.trim(), password);

    if (!result.ok) {
      setError(result.error ?? "Credenciais inválidas");
      setLoading(false);
      return;
    }

    // Redirect to the resolved destination
    if (result.redirect) {
      navigate(result.redirect);
    }
    // If no redirect, the useEffect will handle it
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
          <div className="flex flex-col gap-4">
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
            <Button onClick={handleLogin} disabled={loading} className="h-11 rounded-xl text-base font-bold gap-2">
              <LogIn className="h-4 w-4" />
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </div>
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
