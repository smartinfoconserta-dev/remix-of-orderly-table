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

interface PedidoAtual {
  produtoId: string | null;
  etapaAtual: number;
  adicionais: string[];
  bebida: string | null;
  removidos: string[];
  tipo: string | null;
  viagem: string | null;
  quantidade: number;
  observacao: string;
}

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

const createPedidoAtual = (produtoId: string | null = null): PedidoAtual => ({
  produtoId,
  etapaAtual: 1,
  adicionais: [],
  bebida: null,
  removidos: [],
  tipo: null,
  viagem: null,
  quantidade: 1,
  observacao: "",
});

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
  const [pedidoAtual, setPedidoAtual] = useState<PedidoAtual>(() => createPedidoAtual());

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

  const resetPedidoAtual = useCallback((produtoId: string | null = null) => {
    setPedidoAtual(createPedidoAtual(produtoId));
  }, []);

  useEffect(() => {
    if (produto) {
      resetPedidoAtual(produto.id);
      return;
    }

    resetPedidoAtual();
  }, [produto, resetPedidoAtual]);

  const activeStepIndex = Math.min(Math.max(pedidoAtual.etapaAtual - 1, 0), Math.max(flowSteps.length - 1, 0));
  const activeStep = flowSteps[activeStepIndex] ?? "quantidade";
  const isLastStep = activeStepIndex === flowSteps.length - 1;
  const activeDefinition = stepMeta[activeStep];

  const updatePedidoAtual = useCallback(<K extends keyof PedidoAtual>(field: K, value: PedidoAtual[K]) => {
    setPedidoAtual((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleRemover = (ingrediente: string) => {
    setPedidoAtual((prev) => ({
      ...prev,
      removidos: prev.removidos.includes(ingrediente)
        ? prev.removidos.filter((item) => item !== ingrediente)
        : [...prev.removidos, ingrediente],
    }));
  };

  const toggleAdicional = (id: string) => {
    setPedidoAtual((prev) => ({
      ...prev,
      adicionais: prev.adicionais.includes(id)
        ? prev.adicionais.filter((item) => item !== id)
        : [...prev.adicionais, id],
    }));
  };

  const adicionaisComPreco = useMemo(() => {
    if (!produto?.adicionais) return [];
    return produto.adicionais.filter((adicional) => pedidoAtual.adicionais.includes(adicional.id));
  }, [pedidoAtual.adicionais, produto]);

  const precoUnitario = useMemo(() => {
    if (!produto) return 0;
    return produto.preco + adicionaisComPreco.reduce((acc, adicional) => acc + adicional.preco, 0);
  }, [produto, adicionaisComPreco]);

  const precoTotal = precoUnitario * pedidoAtual.quantidade;

  const summaryByStep: Record<StepId, string> = {
    adicionais: adicionaisComPreco.length > 0 ? `${adicionaisComPreco.length} selecionado(s)` : "Opcional",
    bebida: pedidoAtual.bebida ?? "Opcional",
    remover: pedidoAtual.removidos.length > 0 ? `${pedidoAtual.removidos.length} ingrediente(s)` : "Nenhum ajuste",
    tipo: pedidoAtual.tipo ?? "Seleção obrigatória",
    embalagem: pedidoAtual.viagem ?? "Seleção obrigatória",
    quantidade: `${pedidoAtual.quantidade} item(ns) • ${formatPrice(precoTotal)}`,
  };

  const validarEtapa = useCallback(
    (stepId: StepId) => {
      if (stepMeta[stepId].optional) return true;
      if (stepId === "tipo") return Boolean(pedidoAtual.tipo);
      if (stepId === "embalagem") return Boolean(pedidoAtual.viagem);
      if (stepId === "quantidade") return pedidoAtual.quantidade >= 1;
      return true;
    },
    [pedidoAtual.quantidade, pedidoAtual.tipo, pedidoAtual.viagem],
  );

  const goToStep = (stepId: StepId) => {
    const targetIndex = flowSteps.findIndex((step) => step === stepId);
    if (targetIndex === -1 || targetIndex > activeStepIndex) return;

    updatePedidoAtual("etapaAtual", targetIndex + 1);
  };

  const proximaEtapa = () => {
    if (isLastStep || !validarEtapa(activeStep)) return;

    updatePedidoAtual("etapaAtual", Math.min(pedidoAtual.etapaAtual + 1, flowSteps.length));
  };

  const voltarEtapa = () => {
    updatePedidoAtual("etapaAtual", Math.max(pedidoAtual.etapaAtual - 1, 1));
  };

  const handleSkip = () => {
    if (activeDefinition?.optional) {
      proximaEtapa();
    }
  };

  const handleAdd = () => {
    if (!produto) return;
    if (!flowSteps.every((step) => validarEtapa(step))) return;

    onAdd({
      uid: `${produto.id}-${Date.now()}`,
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: produto.preco,
      quantidade: pedidoAtual.quantidade,
      removidos: pedidoAtual.removidos,
      adicionais: adicionaisComPreco.map((adicional) => ({ nome: adicional.nome, preco: adicional.preco })),
      bebida: flowSteps.includes("bebida") && pedidoAtual.bebida !== "Sem bebida" ? pedidoAtual.bebida : null,
      tipo: flowSteps.includes("tipo") ? pedidoAtual.tipo : undefined,
      embalagem: flowSteps.includes("embalagem") ? pedidoAtual.viagem : undefined,
      observacoes: pedidoAtual.observacao.trim(),
      precoUnitario,
    });

    resetPedidoAtual();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetPedidoAtual();
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
                checked: pedidoAtual.adicionais.includes(adicional.id),
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
        value: pedidoAtual.bebida ?? "",
        onChange: (value) => updatePedidoAtual("bebida", value),
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
                checked: pedidoAtual.removidos.includes(ingrediente),
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
        value: pedidoAtual.tipo ?? "",
        onChange: (value) => updatePedidoAtual("tipo", value),
        options: tipoOptions,
        title: "Tipo do preparo",
        description: "Defina o padrão do item antes de seguir para o fechamento do pedido.",
      });
    }

    if (activeStep === "embalagem") {
      return renderRadioStep({
        value: pedidoAtual.viagem ?? "",
        onChange: (value) => updatePedidoAtual("viagem", value),
        options: embalagemOptions,
        title: "Viagem ou consumo local",
        description: "Informe como este item será servido para evitar erros de entrega.",
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
              onClick={() => updatePedidoAtual("quantidade", Math.max(1, pedidoAtual.quantidade - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition-transform active:scale-90"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-3xl font-black text-foreground">{pedidoAtual.quantidade}</p>
              <p className="text-sm text-muted-foreground">unidade(s)</p>
            </div>
            <button
              type="button"
              onClick={() => updatePedidoAtual("quantidade", pedidoAtual.quantidade + 1)}
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
            value={pedidoAtual.observacao}
            onChange={(event) => updatePedidoAtual("observacao", event.target.value)}
            placeholder="Ex.: sem cebola, servir separado, mandar guardanapos..."
            className="min-h-32 resize-none rounded-2xl border-border bg-card"
            maxLength={180}
          />
          <p className="text-right text-xs text-muted-foreground">{pedidoAtual.observacao.length}/180</p>
        </div>

        <div className="rounded-3xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Subtotal atual</span>
            <span>{pedidoAtual.quantidade} item(ns)</span>
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
                        disabled={index > activeStepIndex}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
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
                    <Button type="button" variant="outline" onClick={voltarEtapa} className="h-12 rounded-2xl px-5 font-bold">
                      Voltar
                    </Button>
                  ) : null}

                  {!isLastStep && activeDefinition?.optional ? (
                    <Button type="button" variant="outline" onClick={handleSkip} className="h-12 rounded-2xl px-5 font-bold">
                      Pular
                    </Button>
                  ) : null}

                  {!isLastStep ? (
                    <Button type="button" onClick={proximaEtapa} className="h-12 rounded-2xl px-6 font-black">
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
