import { ArrowUpRight, Instagram, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import qrInstagramFallback from "@/assets/qr-instagram-premium.png";
import qrWifiFallback from "@/assets/qr-wifi-premium.png";
import bgInstagramDefault from "@/assets/bg-instagram-card.jpg";
import bgWifiDefault from "@/assets/bg-wifi-card.jpg";
import { getSistemaConfig } from "@/lib/adminStorage";
import type { Produto } from "@/data/menuData";
import type { HomeShowcaseConfig } from "@/data/homeShowcaseData";
import { formatPrice } from "@/components/caixa/caixaHelpers";

interface Props {
  config: HomeShowcaseConfig;
  featuredProducts: Produto[];
  onOpenProduct: (produto: Produto) => void;
}

const RestaurantHomeSection = ({ config, featuredProducts, onOpenProduct }: Props) => {
  const sistemaConfig = getSistemaConfig();

  const cards = [
    {
      id: "instagram",
      title: "Visite nosso Instagram",
      subtitle: "Aponte a câmera para acessar nosso perfil",
      icon: Instagram,
      badge: "Instagram",
      qrLabel: "QR Code do Instagram do restaurante",
      dataValue: sistemaConfig.instagramUrl,
      fallbackQr: qrInstagramFallback,
      bgImage: sistemaConfig.instagramBg || bgInstagramDefault,
    },
    {
      id: "wifi",
      title: "Conecte-se ao Wi‑Fi grátis",
      subtitle: "Escaneie para acessar a rede da casa",
      icon: Wifi,
      badge: "Wi‑Fi",
      qrLabel: "QR Code do Wi‑Fi do restaurante",
      dataValue: sistemaConfig.senhaWifi,
      fallbackQr: qrWifiFallback,
      bgImage: sistemaConfig.wifiBg || bgWifiDefault,
    },
  ];

  // Hide cards that have no data value configured
  const visibleCards = cards.filter(card => card.dataValue && card.dataValue.trim() !== "");

  return (
    <section className="space-y-6">
      {visibleCards.length > 0 && (
        <div className={`grid gap-4 ${visibleCards.length === 1 ? "grid-cols-1 max-w-lg" : "grid-cols-2"}`}>
          {visibleCards.map((card) => {
            const Icon = card.icon;
            const qrSrc = card.dataValue
              ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(card.dataValue)}`
              : card.fallbackQr;

            return (
              <article
                key={card.id}
                className="relative h-[160px] overflow-hidden rounded-[2rem] border border-border"
              >
                {/* Background layer */}
                {card.bgImage ? (
                  <img
                    src={card.bgImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-hidden
                  />
                ) : (
                  <div className="absolute inset-0 bg-card" />
                )}

                {/* Dark overlay */}
                <div className={`absolute inset-0 ${card.bgImage ? "bg-black/55" : "bg-transparent"}`} />

                {/* Content */}
                <div className="relative flex h-full items-center justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1 space-y-3">
                    <span className="inline-flex rounded-full border border-foreground/20 bg-background/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-foreground backdrop-blur-sm">
                      {card.badge}
                    </span>
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-foreground/20 bg-background/20 backdrop-blur-sm">
                        <Icon className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h2 className="text-sm font-black leading-tight text-foreground md:text-base">
                          {card.title}
                        </h2>
                        <p className="text-xs text-muted-foreground md:text-sm">{card.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="shrink-0">
                    <div className="rounded-2xl border border-foreground/10 bg-white p-2 shadow-lg">
                      <img
                        src={qrSrc}
                        alt={card.qrLabel}
                        className="h-24 w-24 rounded-xl object-cover md:h-28 md:w-28"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

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
