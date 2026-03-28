import { useMemo } from "react";
import { AlertTriangle, ShieldOff, LogOut, MessageCircle } from "lucide-react";
import { getLicenseDaysLeft, getLicenseLevel, getLicencaConfig, getSistemaConfig, type LicenseLevel } from "@/lib/adminStorage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface LicenseBannerProps {
  context: "admin" | "operational" | "gerente";
}

const LicenseBanner = ({ context }: LicenseBannerProps) => {
  const { logout } = useAuth();

  const level = useMemo(() => getLicenseLevel(), []);
  const daysLeft = useMemo(() => {
    const lic = getLicencaConfig();
    if (!lic.dataVencimento) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(lic.dataVencimento + "T00:00:00");
    return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  }, []);
  const sistemaConfig = useMemo(() => getSistemaConfig(), []);

  if (level === "ok") return null;

  const logoSrc = sistemaConfig.logoBase64 || sistemaConfig.logoUrl;

  const dataFormatada = (() => {
    try {
      const lic = getLicencaConfig();
      const parts = lic.dataVencimento?.split("-");
      if (parts && parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch { /* ignore */ }
    return "—";
  })();

  const whatsappButton = (full = false) => (
    <Button
      className={`rounded-xl font-bold gap-2 ${full ? "w-full max-w-xs" : ""}`}
      size={full ? "default" : "sm"}
      onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
    >
      <MessageCircle className="h-4 w-4" />
      Entrar em contato
    </Button>
  );

  const logoutButton = () => (
    <button
      type="button"
      onClick={() => logout()}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair
    </button>
  );

  // ── Full-screen block overlay ──
  const fullScreenBlock = (title: string, message: string) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center max-w-md px-8">
        {logoSrc && (
          <img src={logoSrc} alt={sistemaConfig.nomeRestaurante} className="h-16 w-16 rounded-2xl object-contain opacity-40" />
        )}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldOff className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        {whatsappButton(true)}
        <p className="text-xs text-muted-foreground/60">Se você acredita que isso é um erro, entre em contato com o suporte.</p>
        {logoutButton()}
      </div>
    </div>
  );

  // ── Bottom-right banner ──
  const bottomBanner = (text: string, variant: "amber" | "red", showWhatsapp = false) => (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-lg text-xs font-bold ${
        variant === "red"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
      }`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{text}</span>
      {showWhatsapp && (
        <button
          onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
          className="ml-2 underline hover:no-underline"
        >
          Falar com suporte
        </button>
      )}
    </div>
  );

  // ── Top red banner ──
  const topBanner = (text: string) => (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive">
      <ShieldOff className="h-4 w-4 shrink-0" />
      <span>{text}</span>
      <button
        onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
        className="ml-2 underline hover:no-underline"
      >
        Regularizar
      </button>
    </div>
  );

  // ═══ FULL_BLOCK: fullscreen everywhere ═══
  if (level === "full_block") {
    const lic = getLicencaConfig();
    const msg = !lic.ativo
      ? "A licença foi desativada pelo administrador. Entre em contato para reativar."
      : `Seu plano expirou em ${dataFormatada}. Entre em contato para renovar.`;
    return fullScreenBlock("Acesso suspenso", msg);
  }

  // ═══ REPORTS_ONLY ═══
  if (level === "reports_only") {
    if (context === "admin") {
      return topBanner("Sistema em modo somente leitura — regularize sua pendência financeira para restaurar o acesso completo.");
    }
    return fullScreenBlock("Acesso suspenso", "O sistema está em modo restrito por pendência financeira. Apenas relatórios estão disponíveis no painel administrativo.");
  }

  // ═══ PARTIAL_BLOCK ═══
  if (level === "partial_block") {
    if (context === "operational") {
      return fullScreenBlock("Operação suspensa", "Operação suspensa por pendência financeira. Entre em contato para regularizar.");
    }
    // admin / gerente: top banner only
    return topBanner("Operação suspensa por pendência financeira — regularize para reativar caixa, garçom e cozinha.");
  }

  // ═══ EXPIRED ═══
  if (level === "expired") {
    return bottomBanner(`Plano vencido em ${dataFormatada}. Regularize para evitar suspensão.`, "red", true);
  }

  // ═══ WARNING ═══
  if (level === "warning") {
    if (context !== "admin") return null;
    const dText = daysLeft === 1 ? "1 dia" : `${daysLeft} dias`;
    return bottomBanner(`Seu plano vence em ${dText}`, "amber");
  }

  return null;
};

export default LicenseBanner;
