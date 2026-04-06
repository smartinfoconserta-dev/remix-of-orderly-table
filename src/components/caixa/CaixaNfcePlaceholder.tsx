/**
 * CaixaNfcePlaceholder — Compact NFC-e badge or nothing.
 */
import { CheckCircle2 } from "lucide-react";
import { getSistemaConfig } from "@/lib/adminStorage";

const CaixaNfcePlaceholder = () => {
  const cfg = getSistemaConfig();
  const nfce = cfg.nfceConfig;
  const isConfigured = !!(nfce?.token && nfce?.ambiente);

  if (!isConfigured) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">NFC-e ativa</span>
      <span className="text-[10px] text-emerald-500/70">
        • {nfce.ambiente === "producao" ? "Produção" : "Homologação"}
      </span>
    </div>
  );
};

export default CaixaNfcePlaceholder;
