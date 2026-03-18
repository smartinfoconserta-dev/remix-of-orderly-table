import { ArrowUpRight, Instagram, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Produto } from "@/data/menuData";
import type { HomeShowcaseConfig } from "@/data/homeShowcaseData";

interface Props {
  config: HomeShowcaseConfig;
  featuredProducts: Produto[];
  onOpenProduct: (produto: Produto) => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const infoCards = [
  {
    id: "instagram",
    title: "Visite nosso Instagram",
    icon: Instagram,
    badge: "Instagram",
    helper: "Aponte a câmera para abrir nosso perfil.",
    qrLabel: "QR Code Instagram",
  },
  {
    id: "wifi",
    title: "Conecte-se ao Wi‑Fi",
    icon: Wifi,
    badge: "Wi‑Fi",
    helper: "Escaneie para acessar a rede da casa.",
    qrLabel: "QR Code Wi‑Fi",
  },
] as const;

const RestaurantHomeSection = ({ config, featuredProducts, onOpenProduct }: Props) => {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {infoCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.id}
              className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_24px_60px_-38px_hsl(var(--foreground)/0.9)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/40" />
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative flex h-full items-start justify-between gap-4">
                <div className="max-w-[15rem] space-y-3">
                  <span className="inline-flex rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-md">
                    {card.badge}
                  </span>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight text-foreground">{card.title}</h2>
                    <p className="text-sm text-muted-foreground">{card.helper}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.9)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="relative shrink-0 rounded-[1.5rem] border border-border bg-background/80 p-3 shadow-[inset_0_1px_0_hsl(var(--background)),0_16px_40px_-28px_hsl(var(--foreground)/0.8)] backdrop-blur-sm">
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-border bg-secondary/50 text-center">
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <span key={`${card.id}-${index}`} className="h-2.5 w-2.5 rounded-[2px] bg-foreground/80" />
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {card.qrLabel}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

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
