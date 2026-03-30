import type { Produto } from "@/data/menuData";
import type { HomeShowcaseConfig } from "@/data/homeShowcaseData";
import { formatPrice } from "@/components/caixa/caixaHelpers";

interface QrInfoCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  badge: string;
  qrUrl: string;
  bgImage: string;
}

interface PedidoFlowHomeProps {
  categoryFadeKey: number;
  categoryFadeClass: string;
  heroBanner: React.ReactNode;
  qrInfoCards: QrInfoCard[];
  comboProducts: Produto[];
  featuredProducts: Produto[];
  homeShowcaseConfig: HomeShowcaseConfig;
  onSelectProduto: (produto: Produto) => void;
}

const PedidoFlowHome = ({
  categoryFadeKey,
  categoryFadeClass,
  heroBanner,
  qrInfoCards,
  comboProducts,
  featuredProducts,
  homeShowcaseConfig,
  onSelectProduto,
}: PedidoFlowHomeProps) => {
  return (
    <div
      key={`home-${categoryFadeKey}`}
      className={`space-y-5 ${categoryFadeClass}`}
    >
      {heroBanner}
      <div className="px-4 md:px-6 space-y-6">
        {/* Dynamic QR info cards */}
        <div className="grid gap-4 md:grid-cols-2">
            {qrInfoCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.id}
                  className="relative h-[160px] overflow-hidden rounded-2xl border border-border"
                >
                  {/* Background: image or solid dark */}
                  {card.bgImage ? (
                    <img src={card.bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[hsl(var(--card))]" />
                  )}
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/55" />

                  {/* Content */}
                  <div className="relative flex h-full items-center justify-between gap-4 p-5">
                    {/* Left: icon + text */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1 pt-0.5">
                        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                          {card.badge}
                        </span>
                        <h2 className="text-[0.95rem] font-black leading-tight text-white md:text-base">
                          {card.title}
                        </h2>
                        <p className="text-xs leading-snug text-white/70">{card.subtitle}</p>
                      </div>
                    </div>
                    {/* Right: QR code */}
                    <div className="shrink-0 rounded-xl bg-white p-2 shadow-lg">
                      <img
                        src={card.qrUrl}
                        alt={`QR Code ${card.badge}`}
                        className="h-24 w-24 rounded-lg object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

        {/* Combos section */}
        {comboProducts.length > 0 && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Combos</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">Combos especiais</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {comboProducts.map((produto) => (
                <button
                  key={produto.id}
                  type="button"
                  onClick={() => onSelectProduto(produto)}
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
                  <div className="space-y-2 p-4">
                    <h3 className="line-clamp-1 text-base font-black text-foreground">{produto.nome}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
                    <p className="text-lg font-black text-primary">{formatPrice(produto.preco)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured products */}
        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{homeShowcaseConfig.featuredLabel}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-[2rem]">{homeShowcaseConfig.featuredTitle}</h2>
          </div>
        </div>
        <div className="relative pt-1">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {featuredProducts.map((produto) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => onSelectProduto(produto)}
                className="group w-[252px] shrink-0 overflow-hidden rounded-[1.75rem] border border-border bg-card text-left shadow-[0_20px_45px_-30px_hsl(var(--foreground)/0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-1 text-base font-black text-foreground">{produto.nome}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-black text-foreground">{formatPrice(produto.preco)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidoFlowHome;
