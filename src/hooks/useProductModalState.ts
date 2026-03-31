import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Produto, ProductStep, GrupoPersonalizacao } from "@/data/menuData";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import type { StepId, PedidoAtual } from "@/types/productModal";
import { formatPrice } from "@/components/caixa/caixaHelpers";

export interface UseProductModalStateParams {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: ItemCarrinho) => void;
  isGarcomMobile: boolean;
  skipEmbalagemDefault: boolean;
}

const baseStepMeta: Record<ProductStep, { label: string; optional: boolean }> = {
  adicionais: { label: "Adicionais", optional: true },
  bebida: { label: "Bebida", optional: true },
  remover: { label: "Retirar algum item?", optional: true },
  tipo: { label: "Tipo", optional: false },
  embalagem: { label: "Embalagem", optional: false },
  quantidade: { label: "Quantidade", optional: false },
};

const defaultBebidaOptions = ["Coca-Cola 350ml", "Guaraná 350ml", "Água sem gás"];
const defaultEmbalagemOptions = ["Consumir na mesa", "Para viagem"];
const standardFlowOrder: ProductStep[] = ["adicionais", "bebida", "remover", "tipo", "embalagem", "quantidade"];
const ADD_BUTTON_LOCK_MS = 500;
export const STEP_TRANSITION_MS = 250;

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

const isComboProduct = (produto: Produto | null) => produto?.categoria === "combos";

const isBaseStepAvailable = (produto: Produto | null, step: ProductStep, skipEmbalagemDefault = false) => {
  if (!produto) return false;
  if (step === "adicionais") return Boolean(produto.adicionais?.length);
  if (step === "bebida") return isComboProduct(produto) && Boolean((produto.bebidaOptions?.length ?? 0) || defaultBebidaOptions.length);
  if (step === "remover") return Boolean(produto.ingredientesRemoviveis?.length);
  if (step === "tipo") return getTipoOptions(produto).length > 0;
  if (step === "embalagem") {
    if (skipEmbalagemDefault) return false;
    if (produto.embalagemOptions?.length) {
      const isDefault = produto.embalagemOptions.length === 2
        && produto.embalagemOptions.includes("Consumir na mesa")
        && produto.embalagemOptions.includes("Para viagem");
      if (!isDefault) return true;
    }
    return produto.permiteLevar !== false;
  }
  if (step === "quantidade") return true;
  return false;
};

const getSortedGrupos = (produto: Produto | null): GrupoPersonalizacao[] => {
  if (!produto?.grupos?.length) return [];
  const obrigatorios = produto.grupos.filter((g) => g.obrigatorio);
  const opcionais = produto.grupos.filter((g) => !g.obrigatorio);
  return [...obrigatorios, ...opcionais];
};

const resolveSteps = (produto: Produto | null, skipEmbalagemDefault = false): StepId[] => {
  if (!produto) return ["quantidade"];
  const baseSteps = standardFlowOrder.filter((step) => isBaseStepAvailable(produto, step, skipEmbalagemDefault));
  const sortedGrupos = getSortedGrupos(produto);
  const grupoSteps: StepId[] = sortedGrupos.map((g) => `grupo-${g.id}` as StepId);
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

export function useProductModalState({
  produto,
  onClose,
  onAdd,
  isGarcomMobile,
  skipEmbalagemDefault,
}: UseProductModalStateParams) {
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

  const getStepMeta = useCallback(
    (stepId: StepId): { label: string; optional: boolean } => {
      if (stepId in baseStepMeta) return baseStepMeta[stepId as ProductStep];
      const grupoId = stepId.replace("grupo-", "");
      const grupo = sortedGrupos.find((g) => g.id === grupoId);
      if (grupo) return { label: grupo.nome || "Personalização", optional: !grupo.obrigatorio };
      return { label: "Personalização", optional: true };
    },
    [sortedGrupos],
  );

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

  const toggleRemover = useCallback((ingrediente: string) => {
    setPedidoAtual((prev) => ({
      ...prev,
      removidos: prev.removidos.includes(ingrediente)
        ? prev.removidos.filter((item) => item !== ingrediente)
        : [...prev.removidos, ingrediente],
    }));
  }, []);

  const toggleAdicional = useCallback((id: string) => {
    setPedidoAtual((prev) => ({
      ...prev,
      adicionais: prev.adicionais.includes(id)
        ? prev.adicionais.filter((item) => item !== id)
        : [...prev.adicionais, id],
    }));
  }, []);

  const toggleGrupoOpcao = useCallback((grupoId: string, opcaoId: string, obrigatorio: boolean) => {
    setPedidoAtual((prev) => {
      const current = prev.gruposEscolhidos[grupoId] || [];
      let next: string[];
      if (obrigatorio) {
        next = [opcaoId];
      } else {
        next = current.includes(opcaoId)
          ? current.filter((id) => id !== opcaoId)
          : [...current, opcaoId];
      }
      return { ...prev, gruposEscolhidos: { ...prev.gruposEscolhidos, [grupoId]: next } };
    });
  }, []);

  const adicionaisComPreco = useMemo(() => {
    if (!produto?.adicionais) return [];
    return produto.adicionais.filter((adicional) => pedidoAtual.adicionais.includes(adicional.id));
  }, [pedidoAtual.adicionais, produto]);

  const grupoPrecoExtra = useMemo(() => {
    let total = 0;
    for (const grupo of sortedGrupos) {
      const escolhidos = pedidoAtual.gruposEscolhidos[grupo.id] || [];
      for (const opcaoId of escolhidos) {
        const opcao = grupo.opcoes.find((o) => o.id === opcaoId);
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

  const getSummary = useCallback(
    (stepId: StepId): string => {
      if (stepId === "adicionais") return adicionaisComPreco.length > 0 ? `${adicionaisComPreco.length} selecionado(s)` : "Opcional";
      if (stepId === "bebida") return pedidoAtual.bebida ?? "Opcional";
      if (stepId === "remover") return pedidoAtual.removidos.length > 0 ? `${pedidoAtual.removidos.length} ingrediente(s)` : "Nenhum ajuste";
      if (stepId === "tipo") return pedidoAtual.tipo ?? "Seleção obrigatória";
      if (stepId === "embalagem") return pedidoAtual.viagem ?? "Seleção obrigatória";
      if (stepId === "quantidade") return `${pedidoAtual.quantidade} item(ns) • ${formatPrice(precoTotal)}`;
      const grupoId = stepId.replace("grupo-", "");
      const grupo = sortedGrupos.find((g) => g.id === grupoId);
      const escolhidos = pedidoAtual.gruposEscolhidos[grupoId] || [];
      if (!grupo) return "";
      if (escolhidos.length === 0) return grupo.obrigatorio ? "Seleção obrigatória" : "Opcional";
      const nomes = escolhidos.map((id) => grupo.opcoes.find((o) => o.id === id)?.nome).filter(Boolean);
      return nomes.join(", ");
    },
    [adicionaisComPreco, pedidoAtual, precoTotal, sortedGrupos],
  );

  const validarEtapa = useCallback(
    (stepId: StepId) => {
      const meta = getStepMeta(stepId);
      if (meta.optional) return true;
      if (stepId === "tipo") return Boolean(pedidoAtual.tipo);
      if (stepId === "embalagem") return true;
      if (stepId === "quantidade") return pedidoAtual.quantidade >= 1;
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

  const goToStep = useCallback(
    (stepId: StepId) => {
      const targetIndex = flowSteps.findIndex((step) => step === stepId);
      if (targetIndex === -1 || targetIndex > activeStepIndex) return;
      updatePedidoAtual("etapaAtual", targetIndex + 1);
    },
    [flowSteps, activeStepIndex, updatePedidoAtual],
  );

  const proximaEtapa = useCallback(() => {
    if (isLastStep || !validarEtapa(activeStep)) return;
    updatePedidoAtual("etapaAtual", Math.min(pedidoAtual.etapaAtual + 1, flowSteps.length));
  }, [isLastStep, validarEtapa, activeStep, updatePedidoAtual, pedidoAtual.etapaAtual, flowSteps.length]);

  const voltarEtapa = useCallback(() => {
    updatePedidoAtual("etapaAtual", Math.max(pedidoAtual.etapaAtual - 1, 1));
  }, [updatePedidoAtual, pedidoAtual.etapaAtual]);

  const handleSkip = useCallback(() => {
    if (activeDefinition?.optional) {
      proximaEtapa();
    }
  }, [activeDefinition, proximaEtapa]);

  const handleAdd = useCallback(() => {
    if (!produto || isAddLocked) return;
    if (!flowSteps.every((step) => validarEtapa(step))) return;

    const gruposData: { grupoNome: string; tipo: "escolha" | "adicional" | "retirar"; opcoes: { nome: string; preco: number }[] }[] = [];
    for (const grupo of sortedGrupos) {
      const escolhidos = pedidoAtual.gruposEscolhidos[grupo.id] || [];
      if (escolhidos.length > 0) {
        const opcoes = escolhidos
          .map((id) => grupo.opcoes.find((o) => o.id === id))
          .filter(Boolean)
          .map((o) => ({ nome: o!.nome, preco: grupo.tipo === "retirar" ? 0 : o!.preco }));
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
      setor: produto.setor ?? "cozinha",
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
  }, [
    produto, isAddLocked, flowSteps, validarEtapa, sortedGrupos, pedidoAtual,
    adicionaisComPreco, precoUnitario, clearAddLockTimeout, onAdd, onClose, resetPedidoAtual,
  ]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        clearAddLockTimeout();
        clearStepTransition();
        setPreviousStep(null);
        setTransitionPhase("idle");
        setIsAddLocked(false);
        resetPedidoAtual();
        onClose();
      }
    },
    [clearAddLockTimeout, clearStepTransition, resetPedidoAtual, onClose],
  );

  return {
    pedidoAtual,
    isAddLocked,
    displayStep,
    previousStep,
    transitionDirection,
    transitionPhase,
    tipoOptions,
    bebidaOptions,
    embalagemOptions,
    flowSteps,
    sortedGrupos,
    adicionaisComPreco,
    precoTotal,
    activeStepIndex,
    activeStep,
    isLastStep,
    activeDefinition,
    canSkipCurrentStep,
    canAdvanceCurrentStep,
    canSubmitItem,
    getStepMeta,
    getSummary,
    updatePedidoAtual,
    toggleRemover,
    toggleAdicional,
    toggleGrupoOpcao,
    goToStep,
    proximaEtapa,
    voltarEtapa,
    handleSkip,
    handleAdd,
    handleOpenChange,
  };
}
