import { useMemo } from "react";
import { AlertTriangle, ShieldX } from "lucide-react";
import { getLicencaDaysLeft, isSystemBlocked, getLicencaConfig } from "@/lib/adminStorage";

interface LicenseBannerProps {
  /** If true, shows a full-screen blocking overlay instead of a banner */
  blockMode?: boolean;
}

const LicenseBanner = ({ blockMode = false }: LicenseBannerProps) => {
  const status = useMemo(() => {
    const lic = getLicencaConfig();
    if (!lic.dataVencimento && lic.ativo) return null; // No license configured, don't show anything
    const blocked = isSystemBlocked();
    const daysLeft = getLicencaDaysLeft();
    return { blocked, daysLeft, ativo: lic.ativo };
  }, []);

  if (!status) return null;

  // Full-screen block overlay
  if (blockMode && status.blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <ShieldX className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Sistema bloqueado</h2>
          <p className="text-sm text-muted-foreground">
            {!status.ativo
              ? "A licença foi desativada pelo administrador. Entre em contato com o suporte para reativar."
              : "A licença expirou. Entre em contato com o suporte para renovar."}
          </p>
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
        <ShieldX className="h-4 w-4 shrink-0" />
        <span>Licença expirada — entre em contato com o suporte</span>
      </div>
    );
  }

  return null;
};

export default LicenseBanner;
