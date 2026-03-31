import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Produto } from "@/data/menuData";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import { useProductModalState, STEP_TRANSITION_MS } from "@/hooks/useProductModalState";
import ProductModalStepContent from "@/components/product/ProductModalStepContent";
import ProductModalSidebar from "@/components/product/ProductModalSidebar";

interface Props {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: ItemCarrinho) => void;
  isGarcomMobile?: boolean;
  skipEmbalagemDefault?: boolean;
}

const ProductModal = ({ produto, onClose, onAdd, isGarcomMobile = false, skipEmbalagemDefault = false }: Props) => {
  const state = useProductModalState({ produto, onClose, onAdd, isGarcomMobile, skipEmbalagemDefault });

  const stepContentProps = {
    produto: produto!,
    pedidoAtual: state.pedidoAtual,
    updatePedidoAtual: state.updatePedidoAtual,
    toggleRemover: state.toggleRemover,
    toggleAdicional: state.toggleAdicional,
    toggleGrupoOpcao: state.toggleGrupoOpcao,
    sortedGrupos: state.sortedGrupos,
    tipoOptions: state.tipoOptions,
    bebidaOptions: state.bebidaOptions,
    embalagemOptions: state.embalagemOptions,
    adicionaisComPreco: state.adicionaisComPreco,
    precoTotal: state.precoTotal,
  };

  const renderTransitionWrapper = (content: React.ReactNode, prevContent: React.ReactNode | null) => (
    <div className="relative overflow-hidden">
      {state.previousStep && prevContent ? (
        <div
          className={`absolute inset-0 transition-all ease-in-out ${
            state.transitionDirection === 1
              ? state.transitionPhase === "running"
                ? "-translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
              : state.transitionPhase === "running"
                ? "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
          }`}
          style={{ transitionDuration: `${STEP_TRANSITION_MS}ms` }}
        >
          {prevContent}
        </div>
      ) : null}

      <div
        className={`relative transition-all ease-in-out ${
          state.previousStep
            ? state.transitionDirection === 1
              ? state.transitionPhase === "preparing"
                ? "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
              : state.transitionPhase === "preparing"
                ? "-translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            : "translate-x-0 opacity-100"
        }`}
        style={{ transitionDuration: `${STEP_TRANSITION_MS}ms` }}
      >
        {content}
      </div>
    </div>
  );

  return (
    <Dialog open={!!produto} onOpenChange={state.handleOpenChange}>
      <DialogContent
        hideCloseButton
        useDefaultAnimation={false}
        overlayClassName="bg-foreground/70 backdrop-blur-sm data-[state=open]:duration-250 data-[state=closed]:duration-250 data-[state=open]:ease-out data-[state=closed]:ease-out"
        contentAnimationClassName={
          isGarcomMobile
            ? "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10 data-[state=open]:duration-220 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in"
            : "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:duration-220 data-[state=closed]:duration-220 data-[state=open]:ease-out data-[state=closed]:ease-out"
        }
        className={
          isGarcomMobile
            ? "fixed inset-0 z-[70] w-full h-[100dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-border bg-card p-0"
            : "max-h-[94vh] max-w-6xl overflow-hidden rounded-[2rem] border-border bg-card p-0 max-md:fixed max-md:inset-0 max-md:max-h-[100dvh] max-md:max-w-none max-md:rounded-none max-md:translate-x-0 max-md:translate-y-0"
        }
      >
        <DialogTitle className="sr-only">Personalizar item do pedido</DialogTitle>
        <DialogDescription className="sr-only">
          Personalize o item, adicione ao carrinho e volte ao fluxo de pedido sem perder o contexto da mesa.
        </DialogDescription>
        {produto && (
          <div className={`flex flex-col overflow-hidden ${isGarcomMobile ? "h-[100dvh]" : "max-h-[94vh] max-md:max-h-[100dvh]"}`}>
            {isGarcomMobile ? (
              <>
                {/* Mobile header */}
                <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 pb-3 pt-4 backdrop-blur-md">
                  <div className="pr-12">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Etapa {state.activeStepIndex + 1} de {state.flowSteps.length}
                    </p>
                    <h2 className="mt-1 text-xl font-black leading-tight text-foreground">{produto.nome}</h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{produto.descricao}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => state.handleOpenChange(false)}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground"
                    aria-label="Fechar modal do produto"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile step pills + content */}
                <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
                  <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {state.flowSteps.map((step, index) => {
                      const selected = state.activeStep === step;
                      const completed = index < state.activeStepIndex;
                      const meta = state.getStepMeta(step);

                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => state.goToStep(step)}
                          disabled={index > state.activeStepIndex}
                          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-primary bg-secondary text-foreground"
                              : completed
                                ? "border-border bg-card text-foreground"
                                : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-black ${
                              selected ? "bg-primary text-primary-foreground" : completed ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {renderTransitionWrapper(
                    <ProductModalStepContent step={state.displayStep} {...stepContentProps} />,
                    state.previousStep ? <ProductModalStepContent step={state.previousStep} {...stepContentProps} /> : null,
                  )}
                </section>

                {/* Mobile footer */}
                <div className="sticky bottom-0 z-20 flex-shrink-0 border-t border-border bg-card/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subtotal</p>
                      <p className="text-2xl font-black text-foreground">{formatPrice(state.precoTotal)}</p>
                    </div>
                    <p className="pb-1 text-sm text-muted-foreground">{state.pedidoAtual.quantidade} item(ns)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={state.handleSkip}
                      disabled={!state.canSkipCurrentStep}
                      className="h-12 rounded-2xl px-4 font-bold disabled:pointer-events-none disabled:opacity-50"
                    >
                      Pular
                    </Button>
                    <Button
                      type="button"
                      onClick={state.isLastStep ? state.handleAdd : state.proximaEtapa}
                      disabled={state.isLastStep ? state.isAddLocked || !state.canSubmitItem : !state.canAdvanceCurrentStep}
                      className="h-12 rounded-2xl px-4 font-black transition-transform duration-100 ease-in-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-70"
                    >
                      {state.isLastStep ? "Adicionar" : "Avançar"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Desktop header */}
                <div className="relative border-b border-border bg-card px-5 py-5 md:px-6">
                  <div className="pr-12">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Autoatendimento guiado</p>
                    <h2 className="mt-2 text-2xl font-black text-foreground md:text-3xl">{produto.nome}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{produto.descricao}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => state.handleOpenChange(false)}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Desktop sidebar + content */}
                <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[300px_1fr]">
                  <ProductModalSidebar
                    flowSteps={state.flowSteps}
                    activeStep={state.activeStep}
                    activeStepIndex={state.activeStepIndex}
                    getStepMeta={state.getStepMeta}
                    getSummary={state.getSummary}
                    goToStep={state.goToStep}
                  />

                  <section className="flex min-h-0 flex-col overflow-y-auto p-5 md:p-6">
                    <div className="relative min-h-[520px] flex-1 overflow-hidden">
                      {renderTransitionWrapper(
                        <ProductModalStepContent step={state.displayStep} {...stepContentProps} />,
                        state.previousStep ? <ProductModalStepContent step={state.previousStep} {...stepContentProps} /> : null,
                      )}
                    </div>
                  </section>
                </div>

                {/* Desktop footer */}
                <div className="border-t border-border bg-card px-4 py-4 md:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Subtotal do item</p>
                      <p className="text-xl font-black text-foreground md:text-2xl">{formatPrice(state.precoTotal)}</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {state.activeStepIndex > 0 ? (
                        <Button type="button" variant="outline" onClick={state.voltarEtapa} className="h-12 rounded-2xl px-5 font-bold">
                          Voltar
                        </Button>
                      ) : null}

                      {!state.isLastStep && state.activeDefinition?.optional ? (
                        <Button type="button" variant="outline" onClick={state.handleSkip} className="h-12 rounded-2xl px-5 font-bold">
                          Pular
                        </Button>
                      ) : null}

                      {!state.isLastStep ? (
                        <Button
                          type="button"
                          onClick={state.proximaEtapa}
                          className="h-12 rounded-2xl px-6 font-black transition-transform duration-100 ease-in-out active:scale-[0.97]"
                        >
                          Avançar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={state.handleAdd}
                          disabled={state.isAddLocked}
                          className="h-12 rounded-2xl px-6 font-black transition-transform duration-100 ease-in-out active:scale-[0.97] md:min-w-[240px] disabled:pointer-events-none disabled:opacity-70"
                        >
                          Adicionar ao carrinho
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
