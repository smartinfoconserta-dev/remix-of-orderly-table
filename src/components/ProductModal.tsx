import { useState, useMemo, useCallback, useEffect } from "react";
import { Check, ChevronRight, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Produto } from "@/data/menuData";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: ItemCarrinho) => void;
}

type StepId = "adicionais" | "bebida" | "observacoes" | "quantidade";

const steps: Array<{ id: StepId; label: string }> = [
  { id: "adicionais", label: "Adicionais" },
  { id: "bebida", label: "Bebida" },
  { id: "observacoes", label: "Observações" },
  { id: "quantidade", label: "Quantidade" },
];

const bebidaOptions = ["Sem bebida", "Coca-Cola 350ml", "Guaraná 350ml", "Água sem gás"];

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

const ProductModal = ({ produto, onClose, onAdd }: Props) => {
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [bebidaSelecionada, setBebidaSelecionada] = useState<string>(bebidaOptions[0]);
  const [observacoes, setObservacoes] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [activeStep, setActiveStep] = useState<StepId>("adicionais");

  const resetState = useCallback(() => {
    setRemovidos([]);
    setAdicionaisSelecionados([]);
    setBebidaSelecionada(bebidaOptions[0]);
    setObservacoes("");
    setQuantidade(1);
    setActiveStep("adicionais");
  }, []);

  useEffect(() => {
    if (produto) {
      resetState();
    }
  }, [produto?.id, resetState]);

  const toggleRemover = (ingrediente: string) => {
    setRemovidos((prev) =>
      prev.includes(ingrediente)
        ? prev.filter((r) => r !== ingrediente)
        : [...prev, ingrediente]
    );
  };

  const toggleAdicional = (id: string) => {
    setAdicionaisSelecionados((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
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
    adicionais:
      adicionaisComPreco.length > 0 || removidos.length > 0
        ? `${adicionaisComPreco.length} adicional(is) • ${removidos.length} remoção(ões)`
        : "Nenhuma personalização",
    bebida: bebidaSelecionada,
    observacoes: observacoes.trim() ? "Observação preenchida" : "Sem observações",
    quantidade: `${quantidade} unidade(s)`,
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
      bebida: bebidaSelecionada === "Sem bebida" ? null : bebidaSelecionada,
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

  const renderStepContent = () => {
    if (!produto) return null;

    if (activeStep === "adicionais") {
      return (
        <div className="space-y-5">
          {produto.ingredientesRemoviveis && produto.ingredientesRemoviveis.length > 0 ? (
            <section className="space-y-3">
              <div>
                <h3 className="text-foreground text-base font-bold">Remover ingredientes</h3>
                <p className="text-muted-foreground text-sm">Marque o que deve sair do preparo.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {produto.ingredientesRemoviveis.map((ing) => {
                  const isRemovido = removidos.includes(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => toggleRemover(ing)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                        isRemovido
                          ? "border-destructive/40 bg-destructive/10 text-foreground"
                          : "border-border bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {isRemovido ? `Sem ${ing}` : ing}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {produto.adicionais && produto.adicionais.length > 0 ? (
            <section className="space-y-3">
              <div>
                <h3 className="text-foreground text-base font-bold">Escolha adicionais</h3>
                <p className="text-muted-foreground text-sm">Selecione os complementos desejados.</p>
              </div>
              <div className="space-y-2">
                {produto.adicionais.map((ad) => {
                  const selected = adicionaisSelecionados.includes(ad.id);
                  return (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => toggleAdicional(ad.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                        selected
                          ? "border-primary bg-secondary text-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{ad.nome}</p>
                        <p className="text-muted-foreground text-xs">Adiciona ao preparo</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-primary">+ {formatPrice(ad.preco)}</span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {(!produto.ingredientesRemoviveis || produto.ingredientesRemoviveis.length === 0) &&
          (!produto.adicionais || produto.adicionais.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5">
              <p className="text-foreground text-sm font-semibold">Este item não possui personalizações nesta etapa.</p>
              <p className="text-muted-foreground text-sm mt-1">Siga para bebida, observações ou ajuste a quantidade.</p>
            </div>
          ) : null}
        </div>
      );
    }

    if (activeStep === "bebida") {
      return (
        <div className="space-y-3">
          <div>
            <h3 className="text-foreground text-base font-bold">Deseja vincular uma bebida?</h3>
            <p className="text-muted-foreground text-sm">Escolha uma opção para registrar a preferência do cliente.</p>
          </div>
          <div className="space-y-2">
            {bebidaOptions.map((bebida) => {
              const selected = bebidaSelecionada === bebida;
              return (
                <button
                  key={bebida}
                  type="button"
                  onClick={() => setBebidaSelecionada(bebida)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                    selected
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{bebida}</p>
                    <p className="text-muted-foreground text-xs">
                      {bebida === "Sem bebida" ? "Nenhuma bebida vinculada" : "Preferência registrada com o item"}
                    </p>
                  </div>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeStep === "observacoes") {
      return (
        <div className="space-y-3">
          <div>
            <h3 className="text-foreground text-base font-bold">Observações do preparo</h3>
            <p className="text-muted-foreground text-sm">Adicione instruções úteis para evitar erros no atendimento.</p>
          </div>
          <Textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Ex.: ponto da carne, sem gelo, mandar ketchup à parte..."
            className="min-h-40 resize-none rounded-2xl border-border bg-card"
            maxLength={180}
          />
          <p className="text-muted-foreground text-xs text-right">{observacoes.length}/180</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-foreground text-base font-bold">Defina a quantidade</h3>
          <p className="text-muted-foreground text-sm">Revise o total antes de adicionar ao carrinho.</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4">
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground transition-transform active:scale-90"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-foreground text-3xl font-black">{quantidade}</p>
            <p className="text-muted-foreground text-sm">unidade(s)</p>
          </div>
          <button
            type="button"
            onClick={() => setQuantidade((q) => q + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground transition-transform active:scale-90"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={!!produto} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-[2rem] border-border bg-card p-0">
        {produto && (
          <div className="flex max-h-[92vh] flex-col overflow-hidden">
            <div className="relative border-b border-border">
              <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
                <div className="relative aspect-[16/8] overflow-hidden md:aspect-auto md:min-h-[220px]">
                  <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.22em]">Fluxo guiado</p>
                    <h2 className="mt-2 text-foreground text-2xl font-black md:text-3xl">{produto.nome}</h2>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{produto.descricao}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3 bg-card px-5 py-5 md:px-6">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.22em]">Preço base</p>
                    <p className="mt-2 text-foreground text-3xl font-black">{formatPrice(produto.preco)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                      <p className="text-muted-foreground text-xs">Configuração</p>
                      <p className="mt-1 text-sm font-bold text-foreground">Etapa a etapa</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                      <p className="text-muted-foreground text-xs">Total atual</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{formatPrice(precoTotal)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[280px_1fr]">
              <aside className="border-b border-border bg-secondary/20 p-4 md:border-b-0 md:border-r md:p-5">
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const selected = activeStep === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStep(step.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                          selected
                            ? "border-primary bg-card text-foreground shadow-sm"
                            : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card/70 hover:text-foreground"
                        }`}
                      >
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Etapa {index + 1}</p>
                          <p className="mt-1 text-sm font-bold">{step.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{summaryByStep[step.id]}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-h-0 overflow-y-auto p-5 md:p-6">
                {renderStepContent()}
                <div className="h-8" />
              </section>
            </div>

            <div className="border-t border-border bg-card px-4 py-4 md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Resumo do item</p>
                  <p className="text-foreground text-xl font-black">{formatPrice(precoTotal)}</p>
                </div>
                <Button onClick={handleAdd} className="h-14 rounded-2xl px-6 text-base font-black md:min-w-[280px]">
                  Adicionar ao carrinho
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
