import { ArrowUpRight, Instagram, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import qrInstagram from "@/assets/qr-instagram-premium.svg";
import qrWifi from "@/assets/qr-wifi-premium.svg";
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
    subtitle: "Aponte a câmera para acessar nosso perfil",
    icon: Instagram,
    badge: "Instagram",
    qrLabel: "QR Code do Instagram do restaurante",
    qrImage: qrInstagram,
    articleClassName:
      "bg-[linear-gradient(90deg,hsl(var(--primary)/0.18)_0%,hsl(var(--card))_26%,hsl(var(--card))_72%,hsl(var(--secondary))_100%)] shadow-[0_24px_60px_-34px_hsl(var(--primary)/0.38)]",
    iconWrapClassName:
      "border border-primary/30 bg-[linear-gradient(180deg,hsl(var(--primary)/0.16)_0%,hsl(var(--primary)/0.08)_100%)] text-primary shadow-[0_20px_38px_-22px_hsl(var(--primary)/0.8)]",
    badgeClassName: "border-primary/20 bg-[hsl(var(--background)/0.45)] text-primary",
    ambientGlowClassName: "bg-primary/18",
    qrGlowClassName: "bg-foreground/20",
  },
  {
    id: "wifi",
    title: "Conecte-se ao Wi‑Fi grátis",
    subtitle: "Escaneie para acessar a rede da casa",
    icon: Wifi,
    badge: "Wi‑Fi",
    qrLabel: "QR Code do Wi‑Fi do restaurante",
    qrImage: qrWifi,
    articleClassName:
      "bg-[linear-gradient(90deg,hsl(var(--card))_0%,hsl(var(--card))_58%,hsl(var(--secondary))_100%)] shadow-[0_24px_60px_-34px_hsl(var(--foreground)/0.28)]",
    iconWrapClassName:
      "border border-border bg-[linear-gradient(180deg,hsl(var(--secondary-foreground)/0.08)_0%,hsl(var(--secondary))_100%)] text-foreground shadow-[0_18px_34px_-22px_hsl(var(--foreground)/0.55)]",
    badgeClassName: "border-border bg-[hsl(var(--background)/0.45)] text-foreground/82",
    ambientGlowClassName: "bg-foreground/6",
    qrGlowClassName: "bg-foreground/18",
  },
] as const;

const RestaurantHomeSection = ({ config, featuredProducts, onOpenProduct }: Props) => {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {infoCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.id}
              className={`relative overflow-hidden rounded-[2rem] border border-border p-5 md:p-6 ${card.articleClassName}`}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.06)_0%,hsl(var(--background)/0.18)_100%)]" />
              <div className={`absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl ${card.ambientGlowClassName}`} />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent" />

              <div className="relative flex items-center justify-between gap-5">
                <div className="min-w-0 flex-1 space-y-5">
                  <span className={`inline-flex rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.26em] ${card.badgeClassName}`}>
                    {card.badge}
                  </span>

                  <div className="flex items-start gap-4">
                    <div className={`flex h-[4.1rem] w-[4.1rem] shrink-0 items-center justify-center rounded-[1.35rem] ${card.iconWrapClassName}`}>
                      <Icon className="h-7 w-7" />
                    </div>

                    <div className="min-w-0 max-w-[15rem] space-y-1.5 pt-1">
                      <h2 className="text-[1.05rem] font-black leading-[1.05] tracking-tight text-foreground md:text-[1.25rem]">
                        {card.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-[0.98rem]">{card.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="relative shrink-0">
                  <div className={`absolute inset-x-5 bottom-1 h-10 rounded-full blur-2xl ${card.qrGlowClassName}`} />
                  <div className="rounded-[1.9rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)] p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05),0_24px_50px_-28px_hsl(var(--foreground)/0.85)]">
                    <div className="rounded-[1.45rem] bg-[hsl(var(--background)/0.9)] p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]">
                      <div className="rounded-[1.1rem] bg-[hsl(var(--foreground))] p-2.5">
                        <img
                          src={card.qrImage}
                          alt={card.qrLabel}
                          className="h-[7.25rem] w-[7.25rem] rounded-[0.95rem] object-cover md:h-[7.75rem] md:w-[7.75rem]"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{config.featuredLabel}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-[2rem]">{config.featuredTitle}</h1>
        </div>
      </div>

      <div className="relative pt-1">
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
                  className="h-11 w-full justify-between rounded-2xl px-4 font-bold"
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
