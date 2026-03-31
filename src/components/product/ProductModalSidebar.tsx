import { Check, ChevronRight } from "lucide-react";
import type { StepId } from "@/types/productModal";

export interface ProductModalSidebarProps {
  flowSteps: StepId[];
  activeStep: StepId;
  activeStepIndex: number;
  getStepMeta: (stepId: StepId) => { label: string; optional: boolean };
  getSummary: (stepId: StepId) => string;
  goToStep: (stepId: StepId) => void;
}

const ProductModalSidebar = ({
  flowSteps,
  activeStep,
  activeStepIndex,
  getStepMeta,
  getSummary,
  goToStep,
}: ProductModalSidebarProps) => (
  <aside className="border-b border-border bg-secondary/20 p-4 md:border-b-0 md:border-r md:p-5">
    <div className="space-y-2">
      {flowSteps.map((step, index) => {
        const selected = activeStep === step;
        const completed = index < activeStepIndex;
        const meta = getStepMeta(step);

        return (
          <button
            key={step}
            type="button"
            onClick={() => goToStep(step)}
            disabled={index > activeStepIndex}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
              selected
                ? "border-primary bg-card text-foreground shadow-sm"
                : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card/70 hover:text-foreground"
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : completed
                      ? "bg-secondary text-foreground"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {completed ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">{meta.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{getSummary(step)}</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
          </button>
        );
      })}
    </div>
  </aside>
);

export default ProductModalSidebar;
