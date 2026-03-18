import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
const RESTAURANTE = {
  nome: "Obsidian",
  logoFallback: "OB",
};

const formatMesaLabel = (mesaId: string) => {
  const numeroMesa = mesaId.replace(/\D/g, "") || "1";
  return `Mesa ${numeroMesa.padStart(2, "0")}`;
};

const ClientePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getMesa, addToCart, updateCartItemQty, removeFromCart, confirmarPedido, chamarGarcom } = useRestaurant();
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].id);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const mesa = getMesa(MESA_CLIENTE);
  const carrinho = mesa?.carrinho ?? [];
  const mesaLabel = formatMesaLabel(MESA_CLIENTE);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const produtosFiltrados = produtos.filter((p) => p.categoria === categoriaAtiva);

  const handleChamarGarcom = useCallback(() => {
    chamarGarcom(MESA_CLIENTE);
    toast.success("Garçom a caminho", { duration: 1000, icon: "🔔" });
  }, [chamarGarcom]);

  const handleAddToCart = useCallback((item: ItemCarrinho) => {
    addToCart(MESA_CLIENTE, item);
    toast.success("Item adicionado!", { duration: 1000, icon: "✅" });
  }, [addToCart]);

  const handleConfirmar = useCallback(async () => {
    if (carrinho.length === 0) return false;

    await new Promise((resolve) => window.setTimeout(resolve, 900));
    confirmarPedido(MESA_CLIENTE);
    toast.success("Pedido enviado com sucesso", { duration: 1200, icon: "✅" });
    return true;
  }, [carrinho.length, confirmarPedido]);

  const restaurantIdentity = (
    <div className="flex items-center gap-3 min-w-0 pointer-events-none select-none">
      <Avatar className="h-10 w-10 rounded-xl border border-border bg-secondary shadow-sm">
        <AvatarFallback className="rounded-xl bg-secondary text-foreground text-xs font-extrabold tracking-[0.18em]">
          {RESTAURANTE.logoFallback}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-foreground text-base md:text-lg font-extrabold tracking-tight truncate">
          {RESTAURANTE.nome}
        </p>
        <p className="text-muted-foreground text-xs md:text-sm font-medium truncate">
          {mesaLabel}
        </p>
      </div>
    </div>
  );

  const header = (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden xl:inline">Voltar</span>
        </button>
        {isMobile && restaurantIdentity}
      </div>
      {!isMobile && <h1 className="text-foreground text-lg font-bold shrink-0">Cardápio</h1>}
      <div className="flex items-center gap-2 shrink-0">
        <CartDrawer
          carrinho={carrinho}
          onUpdateQty={(uid, delta) => updateCartItemQty(MESA_CLIENTE, uid, delta)}
          onRemove={(uid) => removeFromCart(MESA_CLIENTE, uid)}
          onConfirmar={handleConfirmar}
          open={cartOpen}
          onOpenChange={setCartOpen}
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
      <div className="relative overflow-hidden rounded-2xl h-32 md:h-40 border border-border bg-card">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 bg-gradient-to-r ${banner.cor} rounded-2xl flex flex-col justify-center px-6 md:px-10 transition-all duration-700 ease-in-out ${
              i === bannerIndex ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
            }`}
          >
            <p className="text-foreground text-lg md:text-xl font-bold">{banner.titulo}</p>
            <p className="text-muted-foreground text-sm md:text-base mt-1">{banner.subtitulo}</p>
            <p className="text-primary text-2xl md:text-3xl font-black mt-1">{banner.destaque}</p>
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
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 lg:w-72 shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-md px-4 lg:px-5 py-4">
              {restaurantIdentity}
            </div>
            <nav className="flex flex-col gap-0 py-2">
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all text-left border-l-2 ${
                    categoriaAtiva === cat.id
                      ? "border-l-primary bg-secondary/50 text-foreground"
                      : "border-l-transparent text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                  }`}
                >
                  <CategoryIcon name={cat.icone} className="w-3.5 h-3.5" />
                  <span>{cat.nome}</span>
                </button>
              ))}
            </nav>
          </aside>

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

      {carrinho.length > 0 && (
        <StickyOrderButton
          total={carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0)}
          onOpenCart={() => setCartOpen(true)}
          label="Ver carrinho"
          showTotal={false}
        />
      )}
    </div>
  );
};

export default ClientePage;
