import { useMemo } from "react";
import { AlertTriangle, ShieldOff, LogOut, MessageCircle } from "lucide-react";
import { getLicencaDaysLeft, isSystemBlocked, getLicencaConfig, getSistemaConfig } from "@/lib/adminStorage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface LicenseBannerProps {
  /** If true, shows a full-screen blocking overlay instead of a banner */
  blockMode?: boolean;
}

const LicenseBanner = ({ blockMode = false }: LicenseBannerProps) => {
  const { logout } = useAuth();

  const status = useMemo(() => {
    const lic = getLicencaConfig();
    if (!lic.dataVencimento && lic.ativo) return null;
    const blocked = isSystemBlocked();
    const daysLeft = getLicencaDaysLeft();
    return { blocked, daysLeft, ativo: lic.ativo, dataVencimento: lic.dataVencimento };
  }, []);

  const sistemaConfig = useMemo(() => getSistemaConfig(), []);

  if (!status) return null;

  // Full-screen block overlay
  if (blockMode && status.blocked) {
    const dataFormatada = (() => {
      try {
        const parts = status.dataVencimento?.split("-");
        if (parts && parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch { /* ignore */ }
      return status.dataVencimento || "—";
    })();

    const logoSrc = sistemaConfig.logoBase64 || sistemaConfig.logoUrl;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center max-w-md px-8">
          {/* Logo */}
          {logoSrc && (
            <img
              src={logoSrc}
              alt={sistemaConfig.nomeRestaurante}
              className="h-16 w-16 rounded-2xl object-contain opacity-40"
            />
          )}

          {/* Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldOff className="h-10 w-10 text-destructive" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-foreground">Acesso suspenso</h2>

          {/* Message */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {!status.ativo
              ? "A licença foi desativada pelo administrador. Entre em contato para reativar."
              : `Seu plano expirou em ${dataFormatada}. Entre em contato para renovar.`}
          </p>

          {/* WhatsApp button */}
          <Button
            className="rounded-xl font-bold gap-2 w-full max-w-xs"
            onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
          >
            <MessageCircle className="h-4 w-4" />
            Entrar em contato
          </Button>

          {/* Support note */}
          <p className="text-xs text-muted-foreground/60">
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>

          {/* Logout */}
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>
    );
  }

  // Warning banner — only show if expiring within 7 days
  if (status.daysLeft !== null && status.daysLeft >= 0 && status.daysLeft <= 7) {
    const isUrgent = status.daysLeft <= 2;
    const daysText = status.daysLeft === 0
      ? "Licença vence hoje — renove com seu fornecedor"
      : `Licença vence em ${status.daysLeft} dia${status.daysLeft !== 1 ? "s" : ""} — renove com seu fornecedor`;
    return (
      <div
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-lg text-xs font-bold ${
          isUrgent
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
        }`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{daysText}</span>
      </div>
    );
  }

  // Expired banner (not block mode)
  if (status.blocked && !blockMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 shadow-lg text-xs font-bold text-destructive">
        <ShieldOff className="h-4 w-4 shrink-0" />
        <span>Licença expirada — entre em contato com o suporte</span>
      </div>
    );
  }

  return null;
};

export default LicenseBanner;
