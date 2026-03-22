import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Check, ChevronRight, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Produto, ProductStep, GrupoPersonalizacao } from "@/data/menuData";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: ItemCarrinho) => void;
  isGarcomMobile?: boolean;
  skipEmbalagemDefault?: boolean;
}

type StepId = ProductStep | `grupo-${string}`;

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
  gruposEscolhidos: Record<string, string[]>; // grupoId -> opcaoId[]
}

const baseStepMeta: Record<ProductStep, { label: string; optional: boolean }> = {
  adicionais: { label: "Adicionais", optional: true },
  bebida: { label: "Bebida", optional: true },
  remover: { label: "Remover ingredientes", optional: true },
  tipo: { label: "Tipo", optional: false },
  embalagem: { label: "Embalagem", optional: false },
  quantidade: { label: "Quantidade", optional: false },
};

const defaultBebidaOptions = ["Coca-Cola 350ml", "Guaraná 350ml", "Água sem gás"];
const defaultEmbalagemOptions = ["Consumir na mesa", "Para viagem"];
const standardFlowOrder: ProductStep[] = ["adicionais", "bebida", "remover", "tipo", "embalagem", "quantidade"];
const ADD_BUTTON_LOCK_MS = 500;
const STEP_TRANSITION_MS = 250;

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
  gruposEscolhidos: {},
});

const getTipoOptions = (produto: Produto | null): string[] => {
  if (!produto) return [];
  if (produto.tipoOptions?.length) return produto.tipoOptions;
  return [];
};

const categoriasComEmbalagem = ["lanches", "combos"];

const isComboProduct = (produto: Produto | null) => produto?.categoria === "combos";

const isBaseStepAvailable = (produto: Produto | null, step: ProductStep, skipEmbalagemDefault = false) => {
  if (!produto) return false;
  if (step === "adicionais") return Boolean(produto.adicionais?.length);
  if (step === "bebida") return isComboProduct(produto) && Boolean((produto.bebidaOptions?.length ?? 0) || defaultBebidaOptions.length);
  if (step === "remover") return Boolean(produto.ingredientesRemoviveis?.length);
  if (step === "tipo") return getTipoOptions(produto).length > 0;
  if (step === "embalagem") {
    if (produto.embalagemOptions?.length) {
      const isDefault = produto.embalagemOptions.length === 2
        && produto.embalagemOptions.includes("Consumir na mesa")
        && produto.embalagemOptions.includes("Para viagem");
      if (!isDefault) return true;
    }
    if (skipEmbalagemDefault) return false;
    if (produto.permiteLevar === false) return false;
    return categoriasComEmbalagem.includes(produto.categoria);
  }
  if (step === "quantidade") return true;
  return false;
};

const getSortedGrupos = (produto: Produto | null): GrupoPersonalizacao[] => {
  if (!produto?.grupos?.length) return [];
  const obrigatorios = produto.grupos.filter(g => g.obrigatorio);
  const opcionais = produto.grupos.filter(g => !g.obrigatorio);
  return [...obrigatorios, ...opcionais];
};

const resolveSteps = (produto: Produto | null, skipEmbalagemDefault = false): StepId[] => {
  if (!produto) return ["quantidade"];

  const baseSteps = standardFlowOrder.filter((step) => isBaseStepAvailable(produto, step, skipEmbalagemDefault));
  
  // Insert grupo steps before "quantidade"
  const sortedGrupos = getSortedGrupos(produto);
  const grupoSteps: StepId[] = sortedGrupos.map(g => `grupo-${g.id}` as StepId);
  
  const quantidadeIndex = baseSteps.indexOf("quantidade");
  if (quantidadeIndex === -1) {
    return [...baseSteps, ...grupoSteps, "quantidade"];
  }
  
  return [
    ...baseSteps.slice(0, quantidadeIndex),
    ...grupoSteps,
    ...baseSteps.slice(quantidadeIndex),
  ];
};

const ProductModal = ({ produto, onClose, onAdd, isGarcomMobile = false, skipEmbalagemDefault = false }: Props) => {
  const [pedidoAtual, setPedidoAtual] = useState<PedidoAtual>(() => createPedidoAtual());
  const [isAddLocked, setIsAddLocked] = useState(false);
  const [displayStep, setDisplayStep] = useState<StepId>("quantidade");
  const [previousStep, setPreviousStep] = useState<StepId | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "preparing" | "running">("idle");
  const addLockTimeoutRef = useRef<number | null>(null);
  const stepTransitionTimeoutRef = useRef<number | null>(null);
  const stepTransitionFrameRef = useRef<number | null>(null);

  const tipoOptions = useMemo(() => getTipoOptions(produto), [produto]);
  const bebidaOptions = useMemo(
    () => ["Sem bebida", ...(produto?.bebidaOptions?.length ? produto.bebidaOptions : defaultBebidaOptions)],
    [produto],
  );
  const embalagemOptions = useMemo(
    () => (produto?.embalagemOptions?.length ? produto.embalagemOptions : defaultEmbalagemOptions),
    [produto],
  );
  const flowSteps = useMemo(() => resolveSteps(produto, skipEmbalagemDefault), [produto, skipEmbalagemDefault]);
  const sortedGrupos = useMemo(() => getSortedGrupos(produto), [produto]);

  // Build a dynamic stepMeta lookup
  const getStepMeta = useCallback((stepId: StepId): { label: string; optional: boolean } => {
    if (stepId in baseStepMeta) return baseStepMeta[stepId as ProductStep];
    // grupo step
    const grupoId = stepId.replace("grupo-", "");
    const grupo = sortedGrupos.find(g => g.id === grupoId);
    if (grupo) return { label: grupo.nome || "Personalização", optional: !grupo.obrigatorio };
    return { label: "Personalização", optional: true };
  }, [sortedGrupos]);

  const clearAddLockTimeout = useCallback(() => {
    if (addLockTimeoutRef.current) {
      window.clearTimeout(addLockTimeoutRef.current);
      addLockTimeoutRef.current = null;
    }
  }, []);

  const clearStepTransition = useCallback(() => {
    if (stepTransitionTimeoutRef.current) {
      window.clearTimeout(stepTransitionTimeoutRef.current);
      stepTransitionTimeoutRef.current = null;
    }
    if (stepTransitionFrameRef.current) {
      window.cancelAnimationFrame(stepTransitionFrameRef.current);
      stepTransitionFrameRef.current = null;
    }
  }, []);

  const resetPedidoAtual = useCallback((produtoId: string | null = null) => {
    setPedidoAtual(createPedidoAtual(produtoId));
  }, []);

  useEffect(() => {
    clearAddLockTimeout();
    clearStepTransition();
    setIsAddLocked(false);
    setPreviousStep(null);
    setTransitionPhase("idle");

    if (produto) {
      const resolvedSteps = resolveSteps(produto, skipEmbalagemDefault);
      setDisplayStep(resolvedSteps[0] ?? "quantidade");
      resetPedidoAtual(produto.id);
      return;
    }

    setDisplayStep("quantidade");
    resetPedidoAtual();
  }, [produto, resetPedidoAtual, clearAddLockTimeout, clearStepTransition]);

  useEffect(
    () => () => {
      clearAddLockTimeout();
      clearStepTransition();
    },
    [clearAddLockTimeout, clearStepTransition],
  );

  const activeStepIndex = Math.min(Math.max(pedidoAtual.etapaAtual - 1, 0), Math.max(flowSteps.length - 1, 0));
  const activeStep = flowSteps[activeStepIndex] ?? "quantidade";
  const isLastStep = activeStepIndex === flowSteps.length - 1;
  const activeDefinition = getStepMeta(activeStep);

  useEffect(() => {
    if (!produto) return;
    if (activeStep === displayStep) return;

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || isGarcomMobile) {
      clearStepTransition();
      setPreviousStep(null);
      setDisplayStep(activeStep);
      setTransitionPhase("idle");
      return;
    }

    const fromIndex = flowSteps.indexOf(displayStep);
    const toIndex = flowSteps.indexOf(activeStep);
    const direction: 1 | -1 = fromIndex === -1 || toIndex === -1 || toIndex >= fromIndex ? 1 : -1;

    clearStepTransition();
    setTransitionDirection(direction);
    setPreviousStep(displayStep);
    setDisplayStep(activeStep);
    setTransitionPhase("preparing");

    stepTransitionFrameRef.current = window.requestAnimationFrame(() => {
      setTransitionPhase("running");
      stepTransitionFrameRef.current = null;
    });

    stepTransitionTimeoutRef.current = window.setTimeout(() => {
      setPreviousStep(null);
      setTransitionPhase("idle");
      stepTransitionTimeoutRef.current = null;
    }, STEP_TRANSITION_MS);
  }, [activeStep, clearStepTransition, displayStep, flowSteps, produto, isGarcomMobile]);

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

  const toggleGrupoOpcao = (grupoId: string, opcaoId: string, obrigatorio: boolean) => {
    setPedidoAtual((prev) => {
      const current = prev.gruposEscolhidos[grupoId] || [];
      let next: string[];
      if (obrigatorio) {
        // Radio behavior - single selection
        next = [opcaoId];
      } else {
        // Checkbox behavior - toggle
        next = current.includes(opcaoId)
          ? current.filter(id => id !== opcaoId)
          : [...current, opcaoId];
      }
      return { ...prev, gruposEscolhidos: { ...prev.gruposEscolhidos, [grupoId]: next } };
    });
  };

  const adicionaisComPreco = useMemo(() => {
    if (!produto?.adicionais) return [];
    return produto.adicionais.filter((adicional) => pedidoAtual.adicionais.includes(adicional.id));
  }, [pedidoAtual.adicionais, produto]);

  // Calculate grupo prices
  const grupoPrecoExtra = useMemo(() => {
    let total = 0;
    for (const grupo of sortedGrupos) {
      const escolhidos = pedidoAtual.gruposEscolhidos[grupo.id] || [];
      for (const opcaoId of escolhidos) {
        const opcao = grupo.opcoes.find(o => o.id === opcaoId);
        if (opcao) total += opcao.preco;
      }
    }
    return total;
  }, [sortedGrupos, pedidoAtual.gruposEscolhidos]);

  const precoUnitario = useMemo(() => {
    if (!produto) return 0;
    return produto.preco + adicionaisComPreco.reduce((acc, adicional) => acc + adicional.preco, 0) + grupoPrecoExtra;
  }, [produto, adicionaisComPreco, grupoPrecoExtra]);

  const precoTotal = precoUnitario * pedidoAtual.quantidade;

  const getSummary = useCallback((stepId: StepId): string => {
    if (stepId === "adicionais") return adicionaisComPreco.length > 0 ? `${adicionaisComPreco.length} selecionado(s)` : "Opcional";
    if (stepId === "bebida") return pedidoAtual.bebida ?? "Opcional";
    if (stepId === "remover") return pedidoAtual.removidos.length > 0 ? `${pedidoAtual.removidos.length} ingrediente(s)` : "Nenhum ajuste";
    if (stepId === "tipo") return pedidoAtual.tipo ?? "Seleção obrigatória";
    if (stepId === "embalagem") return pedidoAtual.viagem ?? "Seleção obrigatória";
    if (stepId === "quantidade") return `${pedidoAtual.quantidade} item(ns) • ${formatPrice(precoTotal)}`;
    // Grupo step
    const grupoId = stepId.replace("grupo-", "");
    const grupo = sortedGrupos.find(g => g.id === grupoId);
    const escolhidos = pedidoAtual.gruposEscolhidos[grupoId] || [];
    if (!grupo) return "";
    if (escolhidos.length === 0) return grupo.obrigatorio ? "Seleção obrigatória" : "Opcional";
    const nomes = escolhidos.map(id => grupo.opcoes.find(o => o.id === id)?.nome).filter(Boolean);
    return nomes.join(", ");
  }, [adicionaisComPreco, pedidoAtual, precoTotal, sortedGrupos]);

  const validarEtapa = useCallback(
    (stepId: StepId) => {
      const meta = getStepMeta(stepId);
      if (meta.optional) return true;
      if (stepId === "tipo") return Boolean(pedidoAtual.tipo);
      if (stepId === "embalagem") return true;
      if (stepId === "quantidade") return pedidoAtual.quantidade >= 1;
      // Grupo obrigatório
      if (stepId.startsWith("grupo-")) {
        const grupoId = stepId.replace("grupo-", "");
        const escolhidos = pedidoAtual.gruposEscolhidos[grupoId] || [];
        return escolhidos.length > 0;
      }
      return true;
    },
    [pedidoAtual.quantidade, pedidoAtual.tipo, pedidoAtual.viagem, pedidoAtual.gruposEscolhidos, getStepMeta],
  );

  const canSkipCurrentStep = Boolean(activeDefinition?.optional && !isLastStep);
  const canAdvanceCurrentStep = validarEtapa(activeStep);
  const canSubmitItem = flowSteps.every((step) => validarEtapa(step));

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
    if (!produto || isAddLocked) return;
    if (!flowSteps.every((step) => validarEtapa(step))) return;

    // Build gruposEscolhidos for ItemCarrinho
    const gruposData: { grupoNome: string; tipo: "escolha" | "adicional" | "retirar"; opcoes: { nome: string; preco: number }[] }[] = [];
    for (const grupo of sortedGrupos) {
      const escolhidos = pedidoAtual.gruposEscolhidos[grupo.id] || [];
      if (escolhidos.length > 0) {
        const opcoes = escolhidos
          .map(id => grupo.opcoes.find(o => o.id === id))
          .filter(Boolean)
          .map(o => ({ nome: o!.nome, preco: grupo.tipo === "retirar" ? 0 : o!.preco }));
        gruposData.push({ grupoNome: grupo.nome, tipo: grupo.tipo || "adicional", opcoes });
      }
    }

    const itemSnapshot: ItemCarrinho = {
      uid: `${produto.id}-${Date.now()}`,
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: produto.preco,
      quantidade: pedidoAtual.quantidade,
      removidos: [...pedidoAtual.removidos],
      adicionais: adicionaisComPreco.map((adicional) => ({ nome: adicional.nome, preco: adicional.preco })),
      bebida: flowSteps.includes("bebida") && pedidoAtual.bebida !== "Sem bebida" ? pedidoAtual.bebida : null,
      tipo: flowSteps.includes("tipo") ? pedidoAtual.tipo : undefined,
      embalagem: flowSteps.includes("embalagem") ? pedidoAtual.viagem : undefined,
      observacoes: pedidoAtual.observacao.trim(),
      precoUnitario,
      imagemUrl: produto.imagem || undefined,
      gruposEscolhidos: gruposData.length > 0 ? gruposData : undefined,
    };

    setIsAddLocked(true);
    clearAddLockTimeout();
    onAdd(itemSnapshot);
    onClose();
    resetPedidoAtual();

    addLockTimeoutRef.current = window.setTimeout(() => {
      setIsAddLocked(false);
      addLockTimeoutRef.current = null;
    }, ADD_BUTTON_LOCK_MS);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      clearAddLockTimeout();
      clearStepTransition();
      setPreviousStep(null);
      setTransitionPhase("idle");
      setIsAddLocked(false);
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
    itemKey,
  }: {
    checked: boolean;
    onCheckedChange: () => void;
    title: string;
    subtitle: string;
    price?: string;
    itemKey: string;
  }) => (
    <label
      key={itemKey}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/30"
    >
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

  const renderGrupoStep = (grupo: GrupoPersonalizacao) => {
    const escolhidos = pedidoAtual.gruposEscolhidos[grupo.id] || [];
    const tipo = grupo.tipo || "adicional";

    if (tipo === "escolha") {
      // Radio - single selection, required
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-foreground">{grupo.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Escolha uma opção (obrigatório)</p>
          </div>
          <RadioGroup value={escolhidos[0] || ""} onValueChange={(val) => toggleGrupoOpcao(grupo.id, val, true)} className="space-y-3">
            {grupo.opcoes.map((opcao) => {
              const selected = escolhidos[0] === opcao.id;
              return (
                <label
                  key={opcao.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                    selected
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                >
                  <RadioGroupItem value={opcao.id} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-foreground">{opcao.nome}</p>
                      {opcao.preco > 0 && <span className="text-sm font-black text-primary">+ {formatPrice(opcao.preco)}</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>
      );
    }

    if (tipo === "retirar") {
      // Checkbox - remove items, red styling
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-foreground">{grupo.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Marque o que deseja retirar (opcional)</p>
          </div>
          <div className="space-y-3">
            {grupo.opcoes.map((opcao) => {
              const checked = escolhidos.includes(opcao.id);
              return (
                <label
                  key={opcao.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                    checked
                      ? "border-destructive/50 bg-destructive/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleGrupoOpcao(grupo.id, opcao.id, false)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-bold ${checked ? "text-destructive line-through" : "text-foreground"}`}>
                        {opcao.nome}
                      </p>
                      {checked && <span className="text-sm font-black text-destructive">✕</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    // tipo === "adicional" - Checkbox with green styling
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">{grupo.nome}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Selecione os adicionais desejados (opcional)</p>
        </div>
        <div className="space-y-3">
          {grupo.opcoes.map((opcao) => {
            const checked = escolhidos.includes(opcao.id);
            return (
              <label
                key={opcao.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                  checked
                    ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleGrupoOpcao(grupo.id, opcao.id, false)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">{opcao.nome}</p>
                    <div className="flex items-center gap-2">
                      {checked && <span className="text-sm font-black text-emerald-600">✓</span>}
                      {opcao.preco > 0 && <span className="text-sm font-black text-primary">+ {formatPrice(opcao.preco)}</span>}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepContent = (step: StepId) => {
    if (!produto) return null;

    // Handle grupo steps
    if (typeof step === "string" && step.startsWith("grupo-")) {
      const grupoId = step.replace("grupo-", "");
      const grupo = sortedGrupos.find(g => g.id === grupoId);
      if (grupo) return renderGrupoStep(grupo);
      return null;
    }

    if (step === "adicionais") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-foreground">Adicionais do item</h3>
            <p className="mt-1 text-sm text-muted-foreground">Selecione múltiplos complementos antes de seguir.</p>
          </div>
          <div className="space-y-3">
            {produto.adicionais?.map((adicional) =>
              renderCheckboxCard({
                itemKey: adicional.id,
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

    if (step === "bebida") {
      return renderRadioStep({
        value: pedidoAtual.bebida ?? "",
        onChange: (value) => updatePedidoAtual("bebida", value),
        options: bebidaOptions,
        title: "Bebida vinculada ao pedido",
        description: "Escolha uma opção única para registrar junto ao item.",
      });
    }

    if (step === "remover") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black text-foreground">Remover ingredientes</h3>
            <p className="mt-1 text-sm text-muted-foreground">Marque somente o que deve sair do preparo.</p>
          </div>
          <div className="space-y-3">
            {produto.ingredientesRemoviveis?.map((ingrediente) =>
              renderCheckboxCard({
                itemKey: ingrediente,
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

    if (step === "tipo") {
      return renderRadioStep({
        value: pedidoAtual.tipo ?? "",
        onChange: (value) => updatePedidoAtual("tipo", value),
        options: tipoOptions,
        title: "Tipo do preparo",
        description: "Defina o padrão do item antes de seguir para o fechamento do pedido.",
      });
    }

    if (step === "embalagem") {
      const querLevar = Boolean(pedidoAtual.viagem && pedidoAtual.viagem !== "");
      return (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-black text-foreground">Vai levar para viagem?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Deixe desmarcado se for consumir aqui no restaurante.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updatePedidoAtual("viagem", querLevar ? "" : "Para viagem")}
            className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99] ${
              querLevar
                ? "border-amber-500 bg-amber-500/10"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
              querLevar ? "border-amber-500 bg-amber-500" : "border-border bg-background"
            }`}>
              {querLevar && <span className="text-white text-sm font-black">✓</span>}
            </div>
            <div className="min-w-0">
              <p className={`text-base font-black ${querLevar ? "text-amber-400" : "text-foreground"}`}>
                🛍️ Embalar para viagem
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {querLevar ? "Será embalado para levar" : "Toque para solicitar embalagem"}
              </p>
            </div>
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Pode pular se for comer aqui mesmo.
          </p>
        </div>
      );
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
          {!pedidoAtual.observacao && (
            <button
              type="button"
              onClick={() => updatePedidoAtual("observacao", " ")}
              className="text-sm font-bold text-primary hover:underline"
            >
              ➕ Adicionar observação
            </button>
          )}
          {pedidoAtual.observacao && (
            <>
              <Label htmlFor="observacoes-finais" className="text-sm font-bold text-foreground">
                Observação
              </Label>
              <Textarea
                id="observacoes-finais"
                autoFocus
                value={pedidoAtual.observacao.trimStart()}
                onChange={(event) => updatePedidoAtual("observacao", event.target.value)}
                placeholder="Ex.: sem cebola, servir separado, mandar guardanapos..."
                className="min-h-24 resize-none rounded-2xl border-border bg-card"
                maxLength={180}
              />
              <p className="text-right text-xs text-muted-foreground">{pedidoAtual.observacao.trim().length}/180</p>
            </>
          )}
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
                <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 pb-3 pt-4 backdrop-blur-md">
                  <div className="pr-12">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Etapa {activeStepIndex + 1} de {flowSteps.length}
                    </p>
                    <h2 className="mt-1 text-xl font-black leading-tight text-foreground">{produto.nome}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{getStepMeta(displayStep).label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenChange(false)}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground"
                    aria-label="Fechar modal do produto"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
                  <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
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

                  <div className="relative overflow-hidden">
                    {previousStep ? (
                      <div
                        className={`absolute inset-0 transition-all ease-in-out ${
                          transitionDirection === 1
                            ? transitionPhase === "running"
                              ? "-translate-x-full opacity-0"
                              : "translate-x-0 opacity-100"
                            : transitionPhase === "running"
                              ? "translate-x-full opacity-0"
                              : "translate-x-0 opacity-100"
                        }`}
                        style={{ transitionDuration: `${STEP_TRANSITION_MS}ms` }}
                      >
                        {renderStepContent(previousStep)}
                      </div>
                    ) : null}

                    <div
                      className={`relative transition-all ease-in-out ${
                        previousStep
                          ? transitionDirection === 1
                            ? transitionPhase === "preparing"
                              ? "translate-x-full opacity-0"
                              : "translate-x-0 opacity-100"
                            : transitionPhase === "preparing"
                              ? "-translate-x-full opacity-0"
                              : "translate-x-0 opacity-100"
                          : "translate-x-0 opacity-100"
                      }`}
                      style={{ transitionDuration: `${STEP_TRANSITION_MS}ms` }}
                    >
                      {renderStepContent(displayStep)}
                    </div>
                  </div>
                </section>

                <div className="sticky bottom-0 z-20 flex-shrink-0 border-t border-border bg-card/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subtotal</p>
                      <p className="text-2xl font-black text-foreground">{formatPrice(precoTotal)}</p>
                    </div>
                    <p className="pb-1 text-sm text-muted-foreground">{pedidoAtual.quantidade} item(ns)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkip}
                      disabled={!canSkipCurrentStep}
                      className="h-12 rounded-2xl px-4 font-bold disabled:pointer-events-none disabled:opacity-50"
                    >
                      Pular
                    </Button>
                    <Button
                      type="button"
                      onClick={isLastStep ? handleAdd : proximaEtapa}
                      disabled={isLastStep ? isAddLocked || !canSubmitItem : !canAdvanceCurrentStep}
                      className="h-12 rounded-2xl px-4 font-black transition-transform duration-100 ease-in-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-70"
                    >
                      {isLastStep ? "Adicionar" : "Avançar"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
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

                <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[300px_1fr]">
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
                              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-primary text-primary-foreground" : completed ? "bg-secondary text-foreground" : "border border-border text-muted-foreground"}`}>
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

                  <section className="flex min-h-0 flex-col overflow-y-auto p-5 md:p-6">
                    <div className="relative min-h-[520px] flex-1 overflow-hidden">
                      {previousStep ? (
                        <div
                          className={`absolute inset-0 transition-all ease-in-out ${
                            transitionDirection === 1
                              ? transitionPhase === "running"
                                ? "-translate-x-full opacity-0"
                                : "translate-x-0 opacity-100"
                              : transitionPhase === "running"
                                ? "translate-x-full opacity-0"
                                : "translate-x-0 opacity-100"
                          }`}
                          style={{ transitionDuration: `${STEP_TRANSITION_MS}ms` }}
                        >
                          {renderStepContent(previousStep)}
                        </div>
                      ) : null}

                      <div
                        className={`relative transition-all ease-in-out ${
                          previousStep
                            ? transitionDirection === 1
                              ? transitionPhase === "preparing"
                                ? "translate-x-full opacity-0"
                                : "translate-x-0 opacity-100"
                              : transitionPhase === "preparing"
                                ? "-translate-x-full opacity-0"
                                : "translate-x-0 opacity-100"
                            : "translate-x-0 opacity-100"
                        }`}
                        style={{ transitionDuration: `${STEP_TRANSITION_MS}ms` }}
                      >
                        {renderStepContent(displayStep)}
                      </div>
                    </div>
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
                        <Button
                          type="button"
                          onClick={proximaEtapa}
                          className="h-12 rounded-2xl px-6 font-black transition-transform duration-100 ease-in-out active:scale-[0.97]"
                        >
                          Avançar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleAdd}
                          disabled={isAddLocked}
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
