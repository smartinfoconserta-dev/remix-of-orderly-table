/**
 * CaixaNfcePlaceholder — Shows NFC-e status based on fiscal configuration.
 */
import { FileText, CheckCircle2 } from "lucide-react";
import { getSistemaConfig } from "@/lib/adminStorage";

const CaixaNfcePlaceholder = () => {
  const cfg = getSistemaConfig();
  const nfce = cfg.nfceConfig;
  const isConfigured = !!(nfce?.token && nfce?.ambiente);

  if (isConfigured) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">NFC-e ativa</p>
          <p className="text-[10px] text-emerald-500/70">
            {nfce.ambiente === "producao" ? "Produção" : "Homologação"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 px-4 py-3">
      <FileText className="h-5 w-5 text-muted-foreground/50 shrink-0" />
      <div>
        <p className="text-xs font-bold text-muted-foreground/70">Nota Fiscal Eletrônica</p>
        <p className="text-[10px] text-muted-foreground/50">Configure na aba Fiscal do Admin</p>
      </div>
    </div>
  );
};

export default CaixaNfcePlaceholder;
