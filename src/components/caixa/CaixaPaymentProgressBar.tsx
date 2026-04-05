/**
 * CaixaPaymentProgressBar — Visual payment progress indicator.
 * Yellow/orange when incomplete, green when 100%. Shows amounts on each side.
 */

import { Check } from "lucide-react";
import { formatPrice } from "./caixaHelpers";

interface CaixaPaymentProgressBarProps {
  totalPago: number;
  totalConta: number;
  progress: number; // 0–1
  isComplete: boolean;
}

const CaixaPaymentProgressBar = ({
  totalPago,
  totalConta,
  progress,
  isComplete,
}: CaixaPaymentProgressBarProps) => {
  const valorRestante = Math.max(totalConta - totalPago, 0);
  const pct = Math.min(Math.round(progress * 100), 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={isComplete ? "text-emerald-400" : "text-muted-foreground"}>
          {formatPrice(totalPago)} pago de {formatPrice(totalConta)}
        </span>
        <span className={isComplete ? "text-emerald-400 flex items-center gap-1" : "text-amber-400"}>
          {isComplete ? (
            <><Check className="h-3 w-3" /> Completo</>
          ) : (
            `Faltam ${formatPrice(valorRestante)}`
          )}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: isComplete
              ? "linear-gradient(90deg, hsl(142 71% 45%), hsl(160 60% 45%))"
              : progress > 0
                ? `linear-gradient(90deg, hsl(38 92% 50%), hsl(${Math.round(progress * 80) + 30} 80% 48%))`
                : "hsl(var(--muted))",
            boxShadow: isComplete
              ? "0 0 12px hsla(142, 71%, 45%, 0.5)"
              : progress > 0.5
                ? "0 0 8px hsla(38, 92%, 50%, 0.3)"
                : "none",
          }}
        />
        {pct > 8 && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-sm">
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
};

export default CaixaPaymentProgressBar;
