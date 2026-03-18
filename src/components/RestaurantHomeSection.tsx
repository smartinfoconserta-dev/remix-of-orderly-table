import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Produto } from "@/data/menuData";
import type { HomeShowcaseConfig } from "@/data/homeShowcaseData";

interface Props {
  config: HomeShowcaseConfig;
  featuredProducts: Produto[];
  onOpenProduct: (produto: Produto) => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const RestaurantHomeSection = ({ config, featuredProducts, onOpenProduct }: Props) => {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{config.featuredLabel}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-[2rem]">{config.featuredTitle}</h1>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-background to-transparent md:block" />
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {featuredProducts.map((produto) => (
            <button
              key={produto.id}
              type="button"
              onClick={() => onOpenProduct(produto)}
              className="group w-[252px] shrink-0 overflow-hidden rounded-[1.75rem] border border-border bg-card text-left shadow-[0_20px_45px_-30px_hsl(var(--foreground)/0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-1 text-base font-black text-foreground">{produto.nome}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-black text-foreground">
                    {formatPrice(produto.preco)}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full rounded-2xl justify-between px-4 font-bold"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenProduct(produto);
                  }}
                >
                  Ver produto
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RestaurantHomeSection;
