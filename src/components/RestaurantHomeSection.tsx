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
      "bg-[linear-gradient(135deg,hsl(var(--primary)/0.2)_0%,hsl(var(--card))_45%,hsl(var(--card))_100%)] shadow-[0_32px_80px_-42px_hsl(var(--primary)/0.46)]",
    iconWrapClassName:
      "border border-primary/25 bg-[linear-gradient(180deg,hsl(var(--primary)/0.22)_0%,hsl(var(--primary)/0.1)_100%)] text-primary shadow-[0_24px_48px_-24px_hsl(var(--primary)/0.8)]",
    qrGlowClassName: "bg-primary/18",
    badgeClassName: "border-primary/20 bg-primary/10 text-primary",
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
      "bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--card))_52%,hsl(var(--card))_100%)] shadow-[0_32px_80px_-44px_hsl(var(--foreground)/0.26)]",
    iconWrapClassName:
      "border border-border bg-[linear-gradient(180deg,hsl(var(--secondary-foreground)/0.08)_0%,hsl(var(--secondary))_100%)] text-foreground shadow-[0_24px_48px_-24px_hsl(var(--foreground)/0.5)]",
    qrGlowClassName: "bg-foreground/10",
    badgeClassName: "border-border bg-background/55 text-foreground/80",
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
              className={`relative overflow-hidden rounded-[1.75rem] border border-border p-5 backdrop-blur-sm md:p-6 ${card.articleClassName}`}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.02)_0%,hsl(var(--background)/0.28)_100%)]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
              <div className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-background/20 blur-3xl" />
              <div className={`absolute right-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full blur-3xl ${card.qrGlowClassName}`} />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] backdrop-blur-md md:text-xs ${card.badgeClassName}`}>
                    {card.badge}
                  </span>

                  <div className="flex items-start gap-4">
                    <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] ${card.iconWrapClassName}`}>
                      <div className="absolute inset-[1px] rounded-[calc(1.1rem-1px)] border border-foreground/10" />
                      <Icon className="relative z-10 h-6 w-6" />
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <h2 className="text-xl font-black tracking-tight text-foreground md:text-[1.35rem]">{card.title}</h2>
                      <p className="max-w-[18rem] text-sm leading-relaxed text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="relative shrink-0 self-end sm:self-auto">
                  <div className={`absolute inset-3 rounded-[1.35rem] blur-2xl ${card.qrGlowClassName}`} />
                  <div className="relative rounded-[1.55rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background)/0.96)_0%,hsl(var(--secondary))_100%)] p-2 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08),0_24px_50px_-28px_hsl(var(--foreground)/0.95)] backdrop-blur-md">
                    <div className="rounded-[1.2rem] bg-card p-2">
                      <div className="rounded-[1rem] bg-background p-2 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)]">
                        <img
                          src={card.qrImage}
                          alt={card.qrLabel}
                          className="h-28 w-28 rounded-[0.9rem] object-cover md:h-32 md:w-32"
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
