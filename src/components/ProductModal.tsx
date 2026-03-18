import { useState, useMemo, useCallback, useEffect } from "react";
import { Check, ChevronRight, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Produto, ProductStep } from "@/data/menuData";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: ItemCarrinho) => void;
}

type StepId = ProductStep;

const stepMeta: Record<StepId, { label: string; optional: boolean }> = {
  adicionais: { label: "Adicionais", optional: true },
  bebida: { label: "Bebida", optional: true },
  remover: { label: "Remover ingredientes", optional: true },
  tipo: { label: "Tipo", optional: false },
  embalagem: { label: "Embalagem", optional: false },
  quantidade: { label: "Quantidade", optional: false },
};

const defaultBebidaOptions = ["Coca-Cola 350ml", "Guaraná 350ml", "Água sem gás"];
const defaultEmbalagemOptions = ["Consumir na mesa", "Para viagem"];
const standardFlowOrder: StepId[] = ["adicionais", "bebida", "remover", "tipo", "embalagem", "quantidade"];

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

const getTipoOptions = (produto: Produto | null) => {
  if (!produto) return ["Padrão da casa"];
  if (produto.tipoOptions?.length) return produto.tipoOptions;
  if (produto.categoria === "lanches") return ["Tradicional", "Artesanal", "No ponto da casa"];
  if (produto.categoria === "combos") return ["Completo", "Compartilhar", "Executivo"];
  if (produto.categoria === "bebidas") return ["Gelada", "Sem gelo", "Temperatura ambiente"];
  if (produto.categoria === "sobremesas") return ["Tradicional", "Servir agora", "Com calda extra"];
  return ["Padrão da casa", "Porção para compartilhar", "Execução rápida"];
};

const isComboProduct = (produto: Produto | null) => produto?.categoria === "combos";

const isStepAvailable = (produto: Produto | null, step: StepId) => {
  if (!produto) return false;
  if (step === "adicionais") return Boolean(produto.adicionais?.length);
  if (step === "bebida") return isComboProduct(produto) && Boolean((produto.bebidaOptions?.length ?? 0) || defaultBebidaOptions.length);
  if (step === "remover") return Boolean(produto.ingredientesRemoviveis?.length);
  if (step === "tipo" || step === "embalagem" || step === "quantidade") return true;
  return false;
};

const resolveSteps = (produto: Produto | null): StepId[] => {
  if (!produto) return ["quantidade"];

  return standardFlowOrder.filter((step) => isStepAvailable(produto, step));
};

const ProductModal = ({ produto, onClose, onAdd }: Props) => {
  const tipoOptions = useMemo(() => getTipoOptions(produto), [produto]);
  const bebidaOptions = useMemo(
    () => ["Sem bebida", ...(produto?.bebidaOptions?.length ? produto.bebidaOptions : defaultBebidaOptions)],
    [produto],
  );
  const embalagemOptions = useMemo(
    () => (produto?.embalagemOptions?.length ? produto.embalagemOptions : defaultEmbalagemOptions),
    [produto],
  );
  const flowSteps = useMemo(() => resolveSteps(produto), [produto]);
  const initialStep = flowSteps[0] ?? "quantidade";

  const [removidos, setRemovidos] = useState<string[]>([]);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [bebidaSelecionada, setBebidaSelecionada] = useState<string>(bebidaOptions[0]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>(tipoOptions[0]);
  const [embalagemSelecionada, setEmbalagemSelecionada] = useState<string>(embalagemOptions[0]);
  const [observacoes, setObservacoes] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [activeStep, setActiveStep] = useState<StepId>(initialStep);

  const resetState = useCallback(() => {
    setRemovidos([]);
    setAdicionaisSelecionados([]);
    setBebidaSelecionada(bebidaOptions[0]);
    setTipoSelecionado(tipoOptions[0]);
    setEmbalagemSelecionada(embalagemOptions[0]);
    setObservacoes("");
    setQuantidade(1);
    setActiveStep(initialStep);
  }, [bebidaOptions, embalagemOptions, initialStep, tipoOptions]);

  useEffect(() => {
    if (produto) {
      resetState();
    }
  }, [produto?.id, resetState]);

  const activeStepIndex = flowSteps.findIndex((step) => step === activeStep);
  const isLastStep = activeStep === flowSteps[flowSteps.length - 1];
  const activeDefinition = stepMeta[activeStep];

  const toggleRemover = (ingrediente: string) => {
    setRemovidos((prev) =>
      prev.includes(ingrediente)
        ? prev.filter((r) => r !== ingrediente)
        : [...prev, ingrediente],
    );
  };

  const toggleAdicional = (id: string) => {
    setAdicionaisSelecionados((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const adicionaisComPreco = useMemo(() => {
    if (!produto?.adicionais) return [];
    return produto.adicionais.filter((a) => adicionaisSelecionados.includes(a.id));
  }, [produto, adicionaisSelecionados]);

  const precoUnitario = useMemo(() => {
    if (!produto) return 0;
    return produto.preco + adicionaisComPreco.reduce((acc, a) => acc + a.preco, 0);
  }, [produto, adicionaisComPreco]);

  const precoTotal = precoUnitario * quantidade;

  const summaryByStep: Record<StepId, string> = {
    adicionais: adicionaisComPreco.length > 0 ? `${adicionaisComPreco.length} selecionado(s)` : "Opcional",
    bebida: bebidaSelecionada,
    remover: removidos.length > 0 ? `${removidos.length} ingrediente(s)` : "Nenhum ajuste",
    tipo: tipoSelecionado,
    embalagem: embalagemSelecionada,
    quantidade: `${quantidade} item(ns) • ${formatPrice(precoTotal)}`,
  };

  const goToStep = (stepId: StepId) => {
    const targetIndex = flowSteps.findIndex((step) => step === stepId);
    if (targetIndex === -1 || targetIndex > activeStepIndex) return;
    setActiveStep(stepId);
  };

  const goToNextStep = () => {
    if (isLastStep) return;
    const nextStep = flowSteps[activeStepIndex + 1];
    if (nextStep) setActiveStep(nextStep);
  };

  const goToPreviousStep = () => {
    const previousStep = flowSteps[activeStepIndex - 1];
    if (previousStep) setActiveStep(previousStep);
  };

  const handleSkip = () => {
    if (activeDefinition?.optional) {
      goToNextStep();
    }
  };

  const handleAdd = () => {
    if (!produto) return;

    onAdd({
      uid: `${produto.id}-${Date.now()}`,
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: produto.preco,
      quantidade,
      removidos,
      adicionais: adicionaisComPreco.map((a) => ({ nome: a.nome, preco: a.preco })),
      bebida: flowSteps.includes("bebida") && bebidaSelecionada !== "Sem bebida" ? bebidaSelecionada : null,
      tipo: flowSteps.includes("tipo") ? tipoSelecionado : undefined,
      embalagem: flowSteps.includes("embalagem") ? embalagemSelecionada : undefined,
      observacoes: observacoes.trim(),
      precoUnitario,
    });

    resetState();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
      onClose();
    }
  };

  const renderCheckboxCard = ({
    checked,
    onCheckedChange,
    title,
    subtitle,
    price,
  }: {
    checked: boolean;
    onCheckedChange: () => void;
    title: string;
    subtitle: string;
    price?: string;
  }) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/30">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {price ? <span className="text-sm font-black text-primary">{price}</span> : null}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </label>
  );

  const renderRadioStep = ({
    value,
    onChange,
    options,
    title,
    description,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    title: string;
    description: string;
  }) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-black text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/30"
          >
            <RadioGroupItem value={option} className="mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{option}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );

  const renderStepContent = () => {
    if (!produto) return null;

    if (activeStep === "adicionais") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-foreground">Adicionais do item</h3>
            <p className="mt-1 text-sm text-muted-foreground">Selecione múltiplos complementos antes de seguir.</p>
          </div>
          <div className="space-y-3">
            {produto.adicionais?.map((adicional) =>
              renderCheckboxCard({
                checked: adicionaisSelecionados.includes(adicional.id),
                onCheckedChange: () => toggleAdicional(adicional.id),
                title: adicional.nome,
                subtitle: "Complemento opcional do preparo",
                price: `+ ${formatPrice(adicional.preco)}`,
              }),
            )}
          </div>
        </div>
      );
    }

    if (activeStep === "bebida") {
      return renderRadioStep({
        value: bebidaSelecionada,
        onChange: setBebidaSelecionada,
        options: bebidaOptions,
        title: "Bebida vinculada ao pedido",
        description: "Escolha uma opção única para registrar junto ao item.",
      });
    }

    if (activeStep === "remover") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-foreground">Remover ingredientes</h3>
            <p className="mt-1 text-sm text-muted-foreground">Marque somente o que deve sair do preparo.</p>
          </div>
          <div className="space-y-3">
            {produto.ingredientesRemoviveis?.map((ingrediente) =>
              renderCheckboxCard({
                checked: removidos.includes(ingrediente),
                onCheckedChange: () => toggleRemover(ingrediente),
                title: ingrediente,
                subtitle: "Será removido deste item",
              }),
            )}
          </div>
        </div>
      );
    }

    if (activeStep === "tipo") {
      return renderRadioStep({
        value: tipoSelecionado,
        onChange: setTipoSelecionado,
        options: tipoOptions,
        title: "Tipo do preparo",
        description: "Etapa obrigatória para padronizar a execução na cozinha.",
      });
    }

    if (activeStep === "embalagem") {
      return renderRadioStep({
        value: embalagemSelecionada,
        onChange: setEmbalagemSelecionada,
        options: embalagemOptions,
        title: "Embalagem do pedido",
        description: "Defina como o item deve ser entregue ao cliente.",
      });
    }

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-black text-foreground">Quantidade e observações finais</h3>
          <p className="mt-1 text-sm text-muted-foreground">Revise o item antes de adicionar ao carrinho.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition-transform active:scale-90"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-3xl font-black text-foreground">{quantidade}</p>
              <p className="text-sm text-muted-foreground">unidade(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setQuantidade((q) => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition-transform active:scale-90"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes-finais" className="text-sm font-bold text-foreground">
            Observação
          </Label>
          <Textarea
            id="observacoes-finais"
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Ex.: sem cebola, servir separado, mandar guardanapos..."
            className="min-h-32 resize-none rounded-2xl border-border bg-card"
            maxLength={180}
          />
          <p className="text-right text-xs text-muted-foreground">{observacoes.length}/180</p>
        </div>

        <div className="rounded-3xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Subtotal atual</span>
            <span>{quantidade} item(ns)</span>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(precoTotal)}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={!!produto} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-6xl overflow-hidden rounded-[2rem] border-border bg-card p-0">
        {produto && (
          <div className="flex max-h-[94vh] flex-col overflow-hidden">
            <div className="relative border-b border-border bg-card px-5 py-5 md:px-6">
              <div className="pr-12">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Autoatendimento guiado</p>
                <h2 className="mt-2 text-2xl font-black text-foreground md:text-3xl">{produto.nome}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{produto.descricao}</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
              <aside className="border-b border-border bg-secondary/20 p-4 md:border-b-0 md:border-r md:p-5">
                <div className="space-y-2">
                  {flowSteps.map((step, index) => {
                    const selected = activeStep === step;
                    const completed = index < activeStepIndex;

                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => goToStep(step)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                          selected
                            ? "border-primary bg-card text-foreground shadow-sm"
                            : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card/70 hover:text-foreground"
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-primary text-primary-foreground" : completed ? "bg-secondary text-foreground" : "border border-border text-muted-foreground"}`}>
                            {completed ? <Check className="h-4 w-4" /> : index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold">{stepMeta[step].label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{summaryByStep[step]}</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-h-0 overflow-y-auto p-5 md:p-6">
                {renderStepContent()}
                <div className="h-6" />
              </section>
            </div>

            <div className="border-t border-border bg-card px-4 py-4 md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal do item</p>
                  <p className="text-xl font-black text-foreground md:text-2xl">{formatPrice(precoTotal)}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {activeStepIndex > 0 ? (
                    <Button type="button" variant="outline" onClick={goToPreviousStep} className="h-12 rounded-2xl px-5 font-bold">
                      Voltar
                    </Button>
                  ) : null}

                  {!isLastStep && activeDefinition?.optional ? (
                    <Button type="button" variant="outline" onClick={handleSkip} className="h-12 rounded-2xl px-5 font-bold">
                      Pular
                    </Button>
                  ) : null}

                  {!isLastStep ? (
                    <Button type="button" onClick={goToNextStep} className="h-12 rounded-2xl px-6 font-black">
                      Avançar
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleAdd} className="h-12 rounded-2xl px-6 font-black md:min-w-[240px]">
                      Adicionar ao carrinho
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;