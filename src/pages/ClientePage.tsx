import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categorias, produtos, banners, type Produto } from "@/data/menuData";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import StickyOrderButton from "@/components/StickyOrderButton";
import CategoryTabs from "@/components/CategoryTabs";
import { useIsMobile } from "@/hooks/use-mobile";
import CategoryIcon from "@/components/CategoryIcon";
import { toast } from "sonner";

const MESA_CLIENTE = "mesa-1";

const ClientePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getMesa, addToCart, updateCartItemQty, removeFromCart, confirmarPedido, chamarGarcom } = useRestaurant();
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].id);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  const mesa = getMesa(MESA_CLIENTE);
  const carrinho = mesa?.carrinho ?? [];

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const produtosFiltrados = produtos.filter((p) => p.categoria === categoriaAtiva);

  const handleChamarGarcom = useCallback(() => {
    chamarGarcom(MESA_CLIENTE);
    toast.success("Garçom a caminho!", { duration: 1000, icon: "🔔" });
  }, [chamarGarcom]);

  const handleAddToCart = useCallback((item: ItemCarrinho) => {
    addToCart(MESA_CLIENTE, item);
    toast.success("Item adicionado!", { duration: 1000, icon: "✅" });
  }, [addToCart]);

  const handleConfirmar = useCallback(() => {
    confirmarPedido(MESA_CLIENTE);
    toast.success("Pedido confirmado!", { duration: 1500, icon: "🎉" });
  }, [confirmarPedido]);

  const header = (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-2">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-muted-foreground active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Voltar</span>
      </button>
      <h1 className="text-foreground text-lg font-bold">Cardápio</h1>
      <div className="flex items-center gap-2">
        <CartDrawer
          carrinho={carrinho}
          onUpdateQty={(uid, delta) => updateCartItemQty(MESA_CLIENTE, uid, delta)}
          onRemove={(uid) => removeFromCart(MESA_CLIENTE, uid)}
          onConfirmar={handleConfirmar}
        />
        <Button
          onClick={handleChamarGarcom}
          className="rounded-xl gap-2 text-base font-bold px-5 py-2.5 h-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <Bell className="w-5 h-5" />
          <span className="hidden sm:inline">Chamar Garçom</span>
        </Button>
      </div>
    </header>
  );

  const bannerSection = (
    <div className="px-4 md:px-6 pt-4">
      <div className="relative overflow-hidden rounded-2xl h-32 md:h-40">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 bg-gradient-to-r ${banner.cor} rounded-2xl flex flex-col justify-center px-6 md:px-10 transition-all duration-700 ease-in-out ${
              i === bannerIndex ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
            }`}
          >
            <p className="text-foreground text-xl md:text-2xl font-black">{banner.titulo}</p>
            <p className="text-foreground/80 text-sm md:text-base mt-1">{banner.subtitulo}</p>
            <p className="text-foreground text-2xl md:text-3xl font-black mt-1">{banner.destaque}</p>
          </div>
        ))}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setBannerIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === bannerIndex ? "bg-foreground w-6" : "bg-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const productGrid = (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {produtosFiltrados.map((produto) => (
        <button
          key={produto.id}
          onClick={() => setProdutoSelecionado(produto)}
          className="surface-card overflow-hidden text-left flex flex-col active:scale-[0.97] transition-transform"
        >
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={produto.imagem}
              alt={produto.nome}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-3 md:p-4 flex flex-col gap-1 flex-1">
            <h3 className="text-foreground text-sm md:text-base font-bold line-clamp-1">
              {produto.nome}
            </h3>
            <p className="text-muted-foreground text-xs md:text-sm line-clamp-2 flex-1">
              {produto.descricao}
            </p>
            <p className="text-foreground text-lg md:text-xl font-black mt-1">
              R$ {produto.preco.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {header}

      {isMobile ? (
        /* ===== MOBILE: banner + horizontal tabs + grid ===== */
        <>
          {bannerSection}

          <div className="mt-4">
            <CategoryTabs
              categorias={categorias}
              categoriaAtiva={categoriaAtiva}
              onSelect={setCategoriaAtiva}
              paddingClassName="px-4 pb-2"
            />
          </div>

          <main className="flex-1 px-4 pt-4 pb-6">
            {productGrid}
            {carrinho.length > 0 && <div className="h-20" />}
          </main>
        </>
      ) : (
        /* ===== TABLET+: sidebar fixa + conteúdo à direita ===== */
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar fixa */}
          <aside className="w-56 lg:w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
            <nav className="flex flex-col gap-1 p-3">
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left ${
                    categoriaAtiva === cat.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span className="text-xl">{cat.icone}</span>
                  <span>{cat.nome}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Conteúdo principal */}
          <main className="flex-1 overflow-y-auto">
            {bannerSection}
            <div className="px-6 pt-4 pb-6">
              {productGrid}
              {carrinho.length > 0 && <div className="h-20" />}
            </div>
          </main>
        </div>
      )}

      <ProductModal
        produto={produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
        onAdd={handleAddToCart}
      />

      <StickyOrderButton
        total={carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0)}
        onConfirmar={handleConfirmar}
      />
    </div>
  );
};

export default ClientePage;
