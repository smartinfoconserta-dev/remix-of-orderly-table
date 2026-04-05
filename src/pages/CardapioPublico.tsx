import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SearchX, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import CategoryIcon from "@/components/CategoryIcon";
import {
  applyThemeToElement,
  applyCustomThemeToElement,
  clearThemeFromElement,
} from "@/lib/themeEngine";

interface Categoria {
  id: string;
  nome: string;
  icone: string;
  ordem: number;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoriaId: string;
  quantidadeEstoque: number;
  controleEstoque: boolean;
  estoqueMinimo: number;
}

// ── In-memory cache for public menu (5 min TTL) ──
interface MenuCache {
  slug: string;
  fetchedAt: number;
  storeName: string;
  logoUrl: string;
  logoEstilo: "quadrada" | "circular";
  categorias: Categoria[];
  produtos: Produto[];
  configRow: any;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _menuCache: MenuCache | null = null;

function isCacheValid(slug: string): boolean {
  return !!_menuCache && _menuCache.slug === slug && (Date.now() - _menuCache.fetchedAt) < CACHE_TTL_MS;
}

const CardapioPublico = () => {
  const { slug } = useParams<{ slug: string }>();
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoEstilo, setLogoEstilo] = useState<"quadrada" | "circular">("quadrada");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    // Use cache if valid
    if (isCacheValid(slug) && _menuCache) {
      setStoreName(_menuCache.storeName);
      setLogoUrl(_menuCache.logoUrl);
      setLogoEstilo(_menuCache.logoEstilo);
      setCategorias(_menuCache.categorias);
      setProdutos(_menuCache.produtos);
      if (_menuCache.categorias.length > 0) setActiveCategory(_menuCache.categorias[0].id);
      setLoading(false);
      // Apply theme from cached config
      applyThemeFromConfig(_menuCache.configRow);
      return;
    }

    const load = async () => {
      const { data: storeData } = await supabase.rpc("get_store_by_slug", { _slug: slug });
      if (!storeData || storeData.length === 0) { setNotFound(true); setLoading(false); return; }
      const sid = storeData[0].id;

      const [configRes, catRes, prodRes] = await Promise.all([
        supabase.from("restaurant_config").select("nome_restaurante, logo_url, logo_base64, logo_estilo, tema_cardapio, cor_primaria, tema_personalizado, fundo_tipo, fundo_cor, fundo_gradiente, letra_cor, sidebar_cor, cards_cor").eq("store_id", sid).maybeSingle(),
        supabase.from("restaurant_categories").select("id, nome, icone, ordem").eq("store_id", sid).order("ordem"),
        supabase.from("produtos").select("id, nome, descricao, preco, imagem, categoria_id, controle_estoque, quantidade_estoque, estoque_minimo").eq("store_id", sid).eq("ativo", true).eq("removido", false).order("ordem"),
      ]);

      const cfg = configRes.data;
      const name = cfg?.nome_restaurante || "";
      const logo = cfg?.logo_url || cfg?.logo_base64 || "";
      const estilo = (cfg?.logo_estilo as "quadrada" | "circular") || "quadrada";

      setStoreName(name);
      setLogoUrl(logo);
      setLogoEstilo(estilo);

      if (cfg) applyThemeFromConfig(cfg);

      const cats = (catRes.data ?? []).map((c) => ({
        id: c.id, nome: c.nome, icone: c.icone, ordem: c.ordem ?? 0,
      }));
      setCategorias(cats);
      if (cats.length > 0) setActiveCategory(cats[0].id);

      const prods = (prodRes.data ?? []).map((p) => ({
        id: p.id, nome: p.nome, descricao: p.descricao ?? "",
        preco: p.preco, imagem: p.imagem ?? "", categoriaId: p.categoria_id,
        quantidadeEstoque: p.quantidade_estoque ?? 0, controleEstoque: p.controle_estoque ?? false,
        estoqueMinimo: p.estoque_minimo ?? 0,
      }));
      setProdutos(prods);

      // Update cache
      _menuCache = {
        slug, fetchedAt: Date.now(), storeName: name, logoUrl: logo, logoEstilo: estilo,
        categorias: cats, produtos: prods, configRow: cfg,
      };

      setLoading(false);
    };

    load();
  }, [slug]);

  const applyThemeFromConfig = (cfg: any) => {
    const el = containerRef.current;
    if (!el || !cfg) return;
    clearThemeFromElement(el);
    if (cfg.tema_personalizado) {
      applyCustomThemeToElement(el, {
        fundoTipo: (cfg.fundo_tipo as "solido" | "gradiente") || undefined,
        fundoCor: cfg.fundo_cor || undefined,
        fundoGradiente: cfg.fundo_gradiente as { cor1: string; cor2: string; direcao: string } | undefined,
        letraCor: cfg.letra_cor || undefined,
        corPrimaria: cfg.cor_primaria || undefined,
        sidebarCor: cfg.sidebar_cor || undefined,
        cardsCor: cfg.cards_cor || undefined,
      });
    } else {
      applyThemeToElement(el, cfg.tema_cardapio || "obsidian", cfg.cor_primaria || undefined);
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <UtensilsCrossed className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-black text-foreground">Restaurante não encontrado</h1>
        <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  const filteredProducts = activeCategory
    ? produtos.filter((p) => p.categoriaId === activeCategory)
    : produtos;

  const logoRounded = logoEstilo === "circular" ? "rounded-full" : "rounded-xl";

  return (
    <div ref={containerRef} className="min-h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className={`h-11 w-11 ${logoRounded} object-cover shrink-0 ring-2 ring-primary/20`} />
          ) : (
            <div className={`h-11 w-11 ${logoRounded} bg-primary/10 flex items-center justify-center shrink-0`}>
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-black text-foreground leading-tight">{storeName}</h1>
            <p className="text-xs text-muted-foreground">Cardápio digital</p>
          </div>
        </div>
      </header>

      {/* Category tabs */}
      {categorias.length > 0 && (
        <div className="sticky top-[73px] z-10 border-b border-border bg-card/90 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 px-4 py-2.5">
              {categorias.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <CategoryIcon name={cat.icone} className="w-4 h-4" />
                    {cat.nome}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <main className="mx-auto max-w-2xl w-full px-4 py-6 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
              <SearchX className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Nenhum produto nesta categoria</p>
            <p className="text-xs text-muted-foreground/70">Volte em breve, novidades chegando!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredProducts.map((prod) => {
              const esgotado = prod.controleEstoque && prod.quantidadeEstoque <= 0;
              const estoqueBaixo = prod.controleEstoque && !esgotado && prod.estoqueMinimo > 0 && prod.quantidadeEstoque <= prod.estoqueMinimo;
              return (
                <div
                  key={prod.id}
                  className={`flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-transform duration-150 ${esgotado ? "opacity-50 grayscale" : "hover:scale-[1.01]"}`}
                >
                  <div className="relative h-20 w-20 shrink-0">
                    {prod.imagem ? (
                      <img
                        src={prod.imagem}
                        alt={prod.nome}
                        className="h-20 w-20 rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center">
                        <UtensilsCrossed className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                    {esgotado && (
                      <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                        <span className="text-[9px] font-black text-destructive uppercase">Esgotado</span>
                      </div>
                    )}
                    {estoqueBaixo && (
                      <div className="absolute -top-1 -right-1">
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[8px] font-black">
                          <AlertTriangle className="h-2.5 w-2.5" /> Últimas
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground leading-tight truncate">
                        {prod.nome}
                      </p>
                      {prod.descricao && (
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{prod.descricao}</p>
                      )}
                    </div>
                    <p className="text-sm font-black text-primary mt-1">{formatPrice(prod.preco)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-[10px] text-muted-foreground/40 font-medium tracking-wide">
          Cardápio digital por <span className="font-bold">Orderly Table</span>
        </p>
      </footer>
    </div>
  );
};

export default CardapioPublico;
