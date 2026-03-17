import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { categorias, produtos, type Produto } from "@/data/menuData";
import ProductModal from "@/components/ProductModal";
import CategoryTabs from "@/components/CategoryTabs";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddItem: (item: ItemCarrinho) => void;
}

const MenuOverlay = ({ open, onClose, onAddItem }: Props) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].id);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  

  const produtosFiltrados = produtos.filter((p) => p.categoria === categoriaAtiva);

  const handleAdd = useCallback(
    (item: ItemCarrinho) => {
      onAddItem(item);
    },
    [onAddItem]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="text-foreground text-lg font-bold">Adicionar Itens</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Categorias scroll horizontal */}
      <CategoryTabs
        categorias={categorias}
        categoriaAtiva={categoriaAtiva}
        onSelect={setCategoriaAtiva}
        paddingClassName="px-4 py-3"
      />

      {/* Grid de produtos */}
      <main className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {produtosFiltrados.map((produto) => (
            <button
              key={produto.id}
              onClick={() => setProdutoSelecionado(produto)}
              className="surface-card overflow-hidden text-left flex flex-col active:scale-[0.97] transition-transform"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 md:p-4 flex flex-col gap-1 flex-1">
                <h3 className="text-foreground text-sm md:text-base font-bold line-clamp-1">
                  {produto.nome}
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm line-clamp-2 flex-1">
                  {produto.descricao}
                </p>
                <p className="text-foreground text-lg md:text-xl font-black mt-1">
                  R$ {produto.preco.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* ProductModal reutilizado */}
      <ProductModal
        produto={produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
        onAdd={handleAdd}
      />
    </div>
  );
};

export default MenuOverlay;
