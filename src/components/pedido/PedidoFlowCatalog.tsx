import { Plus } from "lucide-react";
import { type Produto } from "@/data/menuData";
import { formatPrice } from "@/components/caixa/caixaHelpers";

const CARD_ANIMATION_DURATION_MS = 200;

interface PedidoFlowCatalogProps {
  produtos: Produto[];
  searchQuery: string;
  searchResultCount: number;
  categoryFadeKey: number;
  selectedProductCardId: string | null;
  onSelectProduto: (produto: Produto) => void;
  isTotem: boolean;
  isGarcomMobile: boolean;
}

const PedidoFlowCatalog = ({
  produtos,
  searchQuery,
  searchResultCount,
  categoryFadeKey,
  selectedProductCardId,
  onSelectProduto,
  isTotem,
  isGarcomMobile,
}: PedidoFlowCatalogProps) => {
  return (
    <div>
      {searchQuery.trim() && (
        <p className={`text-xs px-4 pb-2 ${isTotem ? "text-muted-foreground" : "text-muted-foreground"}`}>
          {searchResultCount} resultado(s) para "{searchQuery}"
        </p>
      )}
      <div
        key={categoryFadeKey}
        className={`grid ${isTotem ? "grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"}`}
      >
        {produtos.map((produto, index) => {
          const isCardSelected = selectedProductCardId === produto.id;

          return (
            <article
              key={produto.id}
              className={`group overflow-hidden ${isTotem ? "rounded-2xl border border-border bg-card shadow-md" : "rounded-[1.75rem] border border-border bg-card shadow-[0_20px_45px_-30px_hsl(var(--foreground)/0.8)]"} text-left transition-all duration-300 hover:-translate-y-0.5 ${isTotem ? "hover:border-primary/30" : "hover:border-primary/30"} card-fade-up ${
                isCardSelected ? `scale-[1.01] ${isTotem ? "shadow-lg" : "shadow-[0_20px_44px_-24px_hsl(var(--foreground)/0.92)]"}` : ""
              }`}
              style={{
                animationDelay: `${index * 30}ms`,
                transitionProperty: "transform, box-shadow",
                transitionDuration: `${CARD_ANIMATION_DURATION_MS}ms`,
                transitionTimingFunction: "ease-out",
              }}
            >
              <button type="button" onClick={() => onSelectProduto(produto)} className="flex w-full flex-col text-left">
                <div className={isTotem ? "aspect-[4/3] overflow-hidden" : "aspect-[3/2] overflow-hidden"}>
                  <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className={`flex flex-1 flex-col gap-2 p-4 ${isTotem ? "min-h-[7rem]" : "min-h-[9rem]"}`}>
                  <h2 className={`line-clamp-2 font-black leading-tight ${isTotem ? "text-lg text-foreground" : "text-[1.05rem] text-foreground"}`}>{produto.nome}</h2>
                  {!isTotem && <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{produto.descricao}</p>}
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className={`font-black tracking-tight ${isTotem ? "text-lg text-primary" : "text-[1.05rem] text-foreground"}`}>{formatPrice(produto.preco)}</p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectProduto(produto);
                      }}
                      className={`flex items-center justify-center transition-transform active:scale-95 ${
                        isTotem
                          ? "h-12 rounded-xl bg-primary px-4 text-primary-foreground font-black text-sm shadow-md gap-1"
                          : "h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-[0_18px_32px_-22px_hsl(var(--primary)/0.95)]"
                      }`}
                      aria-label={`Adicionar ${produto.nome}`}
                    >
                      <Plus className={isTotem ? "h-4 w-4" : "h-5 w-5"} />
                      {isTotem && <span>ADICIONAR</span>}
                    </button>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default PedidoFlowCatalog;
