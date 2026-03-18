import { ArrowRight, Instagram, QrCode, Sparkles, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HomeSectionConfig, Produto } from "@/data/menuData";

interface Props {
  content: HomeSectionConfig;
  featuredProducts: Produto[];
  onOpenProduct: (produto: Produto) => void;
  onOpenCategory: (categoriaId: string) => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const RestaurantHomeSection = ({ content, featuredProducts, onOpenProduct, onOpenCategory }: Props) => {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {content.hero.kicker}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{content.hero.title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{content.hero.description}</p>
              </div>
            </div>
            <div className="hidden rounded-3xl border border-border bg-secondary/40 px-4 py-3 text-right md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Destaque do dia</p>
              <p className="mt-1 text-2xl font-black text-foreground">{content.hero.highlight}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {content.quickLinks.map((link) => (
              <button
                key={link.categoriaId}
                type="button"
                onClick={() => onOpenCategory(link.categoriaId)}
                className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/60"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{link.label}</p>
                <p className="mt-1 text-base font-black text-foreground">{link.title}</p>
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Ver opções
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-secondary/30 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Aviso do restaurante</p>
          <h2 className="mt-2 text-2xl font-black text-foreground">{content.notice.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{content.notice.description}</p>
          <div className="mt-5 rounded-3xl border border-border bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Atendimento</p>
            <p className="mt-2 text-lg font-black text-foreground">{content.notice.helper}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Produtos em destaque</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Pedidos mais desejados agora</h2>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenCategory("promocoes")} className="rounded-2xl font-bold">
            Ver promoções
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((produto) => (
            <button
              key={produto.id}
              type="button"
              onClick={() => onOpenProduct(produto)}
              className="overflow-hidden rounded-[1.5rem] border border-border bg-card text-left shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-foreground">{produto.nome}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
                  </div>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-sm font-black text-foreground">{formatPrice(produto.preco)}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Personalizar pedido
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {content.wifi.enabled ? (
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-secondary p-3 text-foreground">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Wi‑Fi</p>
                <h3 className="text-lg font-black text-foreground">{content.wifi.title}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-3xl border border-border bg-secondary/30 p-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-background text-muted-foreground">
                <QrCode className="h-10 w-10" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{content.wifi.networkLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">{content.wifi.passwordLabel}</p>
              </div>
            </div>
          </div>
        ) : null}

        {content.instagram.enabled ? (
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-secondary p-3 text-foreground">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Instagram</p>
                <h3 className="text-lg font-black text-foreground">{content.instagram.title}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{content.instagram.description}</p>
            <div className="mt-4 rounded-3xl border border-border bg-secondary/30 px-4 py-4">
              <p className="text-base font-black text-foreground">{content.instagram.handle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{content.instagram.cta}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Comunicados</p>
          <h3 className="mt-2 text-lg font-black text-foreground">{content.bulletin.title}</h3>
          <div className="mt-4 space-y-3">
            {content.bulletin.items.map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RestaurantHomeSection;
