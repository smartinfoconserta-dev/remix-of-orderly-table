import { useState, useMemo, useCallback, useEffect } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Produto } from "@/data/menuData";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: ItemCarrinho) => void;
}

const ProductModal = ({ produto, onClose, onAdd }: Props) => {
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [quantidade, setQuantidade] = useState(1);

  const resetState = useCallback(() => {
    setRemovidos([]);
    setAdicionaisSelecionados([]);
    setQuantidade(1);
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

  return (
    <Dialog open={!!produto} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-border bg-card p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {produto && (
          <>
            <div className="relative aspect-video overflow-hidden flex-shrink-0">
              <img
                src={produto.imagem}
                alt={produto.nome}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleOpenChange(false)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-0 space-y-5">
              <div>
                <h2 className="text-foreground text-xl md:text-2xl font-black">{produto.nome}</h2>
                <p className="text-muted-foreground text-sm md:text-base mt-1">{produto.descricao}</p>
                <p className="text-primary text-2xl font-black mt-2">
                  R$ {produto.preco.toFixed(2).replace(".", ",")}
                </p>
              </div>

              {produto.ingredientesRemoviveis && produto.ingredientesRemoviveis.length > 0 && (
                <div>
                  <h3 className="text-foreground text-sm font-bold mb-2">Remover ingredientes</h3>
                  <div className="flex flex-wrap gap-2">
                    {produto.ingredientesRemoviveis.map((ing) => {
                      const isRemovido = removidos.includes(ing);
                      return (
                        <button
                          key={ing}
                          onClick={() => toggleRemover(ing)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                            isRemovido
                              ? "bg-destructive/20 text-destructive line-through"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {isRemovido ? "Sem " : ""}{ing}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {produto.adicionais && produto.adicionais.length > 0 && (
                <div>
                  <h3 className="text-foreground text-sm font-bold mb-2">Adicionais</h3>
                  <div className="space-y-2">
                    {produto.adicionais.map((ad) => {
                      const selected = adicionaisSelecionados.includes(ad.id);
                      return (
                        <button
                          key={ad.id}
                          onClick={() => toggleAdicional(ad.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                            selected
                              ? "bg-primary/15 border-2 border-primary text-foreground"
                              : "bg-secondary text-secondary-foreground border-2 border-transparent"
                          }`}
                        >
                          <span>{ad.nome}</span>
                          <span className="text-primary font-black">+ R$ {ad.preco.toFixed(2).replace(".", ",")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-foreground text-sm font-bold mb-2">Quantidade</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-foreground active:scale-90 transition-transform"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-foreground text-2xl font-black min-w-[3ch] text-center">
                    {quantidade}
                  </span>
                  <button
                    onClick={() => setQuantidade((q) => q + 1)}
                    className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-foreground active:scale-90 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="h-20" />
            </div>

            <div className="sticky bottom-0 p-4 bg-card border-t border-border">
              <Button
                onClick={handleAdd}
                className="w-full h-14 rounded-xl text-lg font-black gap-2"
              >
                + Adicionar — R$ {precoTotal.toFixed(2).replace(".", ",")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
