import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed } from "lucide-react";
import { formatPrice } from "@/components/caixa/caixaHelpers";
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
}

const CardapioPublico = () => {
  const { slug } = useParams<{ slug: string }>();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const load = async () => {
      // 1. Lookup store by slug
      const { data: storeData } = await supabase.rpc("get_store_by_slug", { _slug: slug });
      if (!storeData || storeData.length === 0) { setNotFound(true); setLoading(false); return; }
      const sid = storeData[0].id;
      setStoreId(sid);

      // 2. Parallel fetch
      const [configRes, catRes, prodRes] = await Promise.all([
        supabase.from("restaurant_config").select("nome_restaurante, logo_url, logo_base64, tema_cardapio, cor_primaria, tema_personalizado, fundo_tipo, fundo_cor, fundo_gradiente, letra_cor, sidebar_cor, cards_cor").eq("store_id", sid).maybeSingle(),
        supabase.from("restaurant_categories").select("id, nome, icone, ordem").eq("store_id", sid).order("ordem"),
        supabase.from("produtos").select("id, nome, descricao, preco, imagem, categoria_id, controle_estoque, quantidade_estoque").eq("store_id", sid).eq("ativo", true).eq("removido", false).order("ordem"),
      ]);

      if (configRes.data) {
        setStoreName(configRes.data.nome_restaurante || "");
        setLogoUrl(configRes.data.logo_url || configRes.data.logo_base64 || "");

        // Apply theme
        const cfg = configRes.data;
        if (containerRef.current) {
          clearThemeFromElement(containerRef.current);
          if (cfg.tema_personalizado) {
            applyCustomThemeToElement(containerRef.current, {
              fundoTipo: (cfg.fundo_tipo as "solido" | "gradiente") || undefined,
              fundoCor: cfg.fundo_cor || undefined,
              fundoGradiente: cfg.fundo_gradiente as { cor1: string; cor2: string; direcao: string } | undefined,
              letraCor: cfg.letra_cor || undefined,
              corPrimaria: cfg.cor_primaria || undefined,
              sidebarCor: cfg.sidebar_cor || undefined,
              cardsCor: cfg.cards_cor || undefined,
            });
          } else {
            const themeId = cfg.tema_cardapio || "obsidian";
            applyThemeToElement(
              containerRef.current,
              themeId,
              cfg.cor_primaria || undefined,
            );
          }
        }
      }

      const cats = (catRes.data ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        icone: c.icone,
        ordem: c.ordem ?? 0,
      }));
      setCategorias(cats);
      if (cats.length > 0) setActiveCategory(cats[0].id);

      setProdutos(
        (prodRes.data ?? []).map((p) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao ?? "",
          preco: p.preco,
          imagem: p.imagem ?? "",
          categoriaId: p.categoria_id,
          quantidadeEstoque: p.quantidade_estoque ?? 0,
          controleEstoque: p.controle_estoque ?? false,
        }))
      );

      setLoading(false);
    };

    load();
  }, [slug]);

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

  return (
    <div ref={containerRef} className="min-h-svh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-10 w-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
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
            <div className="flex gap-1 px-4 py-2">
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.icone} {cat.nome}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products grid */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum produto nesta categoria.</p>
        ) : (
          <div className="grid gap-3">
            {filteredProducts.map((prod) => {
              const esgotado = prod.controleEstoque && prod.quantidadeEstoque <= 0;
              return (
                <div
                  key={prod.id}
                  className={`flex gap-3 rounded-2xl border border-border bg-card p-3 ${esgotado ? "opacity-50" : ""}`}
                >
                  {prod.imagem ? (
                    <img
                      src={prod.imagem}
                      alt={prod.nome}
                      className="h-20 w-20 rounded-xl object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground leading-tight truncate">
                        {prod.nome}
                        {esgotado && (
                          <span className="ml-2 inline-block text-[10px] font-black bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                            Esgotado
                          </span>
                        )}
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
    </div>
  );
};

export default CardapioPublico;
