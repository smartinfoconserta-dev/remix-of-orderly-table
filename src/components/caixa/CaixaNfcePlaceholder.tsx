/**
 * CaixaNfcePlaceholder — Visual placeholder for future NFC-e integration.
 */
import { FileText } from "lucide-react";

const CaixaNfcePlaceholder = () => (
  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 px-4 py-3">
    <FileText className="h-5 w-5 text-muted-foreground/50 shrink-0" />
    <div>
      <p className="text-xs font-bold text-muted-foreground/70">Nota Fiscal Eletrônica</p>
      <p className="text-[10px] text-muted-foreground/50">Integração em breve</p>
    </div>
  </div>
);

export default CaixaNfcePlaceholder;
