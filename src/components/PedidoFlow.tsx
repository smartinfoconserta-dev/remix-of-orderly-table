import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryIcon from "@/components/CategoryIcon";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import StickyOrderButton from "@/components/StickyOrderButton";
import StatusBadge from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { categorias, produtos, banners, type Produto } from "@/data/menuData";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface PedidoFlowProps {
  modo: "cliente" | "garcom";
  mesaId: string;
  garcomNome?: string;
}

const RESTAURANTE = {
  nome: "Obsidian",
  logoFallback: "OB",
};

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const formatMesaLabel = (mesaId: string) => {
  const numeroMesa = mesaId.replace(/\D/g, "") || "1";
  return `Mesa ${numeroMesa.padStart(2, "0")}`;
};

const PedidoFlow = ({ modo, mesaId, garcomNome }: PedidoFlowProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getMesa, addToCart, updateCartItemQty, removeFromCart, confirmarPedido, chamarGarcom, dismissChamarGarcom } = useRestaurant();
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].id);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);

  const mesa = getMesa(mesaId);
  const carrinho = mesa?.carrinho ?? [];
  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const mesaLabel = formatMesaLabel(mesaId);
  const nomeAtendimento = garcomNome?.trim() || "Equipe de salão";
  const produtosFiltrados = produtos.filter((p) => p.categoria === categoriaAtiva);

  const invalidItemIds = useMemo(() => {
    return carrinho
      .filter((item) => {
        const produto = produtos.find((p) => p.id === item.produtoId) as
          | (typeof produtos)[number] & { opcoesObrigatorias?: string[]; minimoObrigatorio?: number }
          | undefined;
        const minimoObrigatorio = produto?.minimoObrigatorio ?? produto?.opcoesObrigatorias?.length ?? 0;
        const totalOpcoesSelecionadas = item.removidos.length + item.adicionais.length;
        return item.quantidade <= 0 || totalOpcoesSelecionadas < minimoObrigatorio;
      })
      .map((item) => item.uid);
  }, [carrinho]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (modo === "garcom" && mesa?.chamarGarcom) {
      dismissChamarGarcom(mesaId);
    }
  }, [dismissChamarGarcom, mesa?.chamarGarcom, mesaId, modo]);

  const handleBack = useCallback(() => {
    if (modo === "garcom" && carrinho.length > 0) {
      setShowExitAlert(true);
      return;
    }

    navigate(modo === "cliente" ? "/" : "/garcom");
  }, [carrinho.length, modo, navigate]);

  const handleAddToCart = useCallback((item: ItemCarrinho) => {
    addToCart(mesaId, item);
    toast.success("Item adicionado!", { duration: 1000, icon: "✅" });
  }, [addToCart, mesaId]);

  const handleChamarGarcom = useCallback(() => {
    chamarGarcom(mesaId);
    toast.success("Garçom a caminho", { duration: 1000, icon: "🔔" });
  }, [chamarGarcom, mesaId]);

  const validatePendingCart = useCallback(() => {
    if (invalidItemIds.length === 0) return true;
    toast.error("Revise o pedido antes de enviar", { duration: 1400 });
    setCartOpen(true);
    return false;
  }, [invalidItemIds.length]);

  const handleConfirmar = useCallback(async () => {
    if (carrinho.length === 0) return false;
    if (!validatePendingCart()) return false;

    await new Promise((resolve) => window.setTimeout(resolve, 900));
    confirmarPedido(mesaId);
    toast.success("Pedido enviado com sucesso", { duration: 1200, icon: "✅" });
    return true;
  }, [carrinho.length, confirmarPedido, mesaId, validatePendingCart]);

  if (!mesa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="surface-card w-full max-w-md p-6 text-center space-y-2">
          <h1 className="text-foreground text-xl font-bold">Mesa não encontrada</h1>
          <p className="text-muted-foreground">Não foi possível localizar a mesa informada.</p>
          <Button onClick={() => navigate(modo === "cliente" ? "/" : "/garcom")} className="rounded-xl">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const restaurantIdentity = (
    <div className="flex items-center gap-3 min-w-0">
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
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden xl:inline">Voltar</span>
        </button>
        {restaurantIdentity}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {modo === "garcom" && (
          <div className="hidden md:flex items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">
            {nomeAtendimento}
          </div>
        )}
        <CartDrawer
          carrinho={carrinho}
          onUpdateQty={(uid, delta) => updateCartItemQty(mesaId, uid, delta)}
          onRemove={(uid) => removeFromCart(mesaId, uid)}
          onConfirmar={handleConfirmar}
          open={cartOpen}
          onOpenChange={setCartOpen}
        />
        {modo === "cliente" && (
          <Button
            onClick={handleChamarGarcom}
            className="rounded-xl gap-2 text-base font-bold px-5 py-2.5 h-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Bell className="w-5 h-5" />
            <span className="hidden sm:inline">Chamar Garçom</span>
          </Button>
        )}
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
              className={`w-2 h-2 rounded-full transition-all ${i === bannerIndex ? "bg-foreground w-6" : "bg-foreground/40"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const flowSummary = (
    <div className="px-4 md:px-6 pt-4">
      <div className="surface-card p-4 md:p-5 flex flex-wrap items-center gap-3 md:gap-4">
        <StatusBadge status={mesa.status} />
        <div className="h-8 w-px bg-border hidden md:block" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm md:text-base font-bold">
            {modo === "cliente" ? "Revise o carrinho antes de enviar" : `${mesaLabel} em atendimento`}
          </p>
          <p className="text-muted-foreground text-xs md:text-sm">
            {modo === "cliente" ? "Nenhum pedido é enviado direto do produto" : `Garçom: ${nomeAtendimento}`}
          </p>
        </div>
        <span className="text-foreground text-lg md:text-2xl font-black tabular-nums">
          {formatPrice(mesa.total + totalCarrinho)}
        </span>
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
            <h2 className="text-foreground text-sm md:text-base font-bold line-clamp-1">
              {produto.nome}
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm line-clamp-2 flex-1">
              {produto.descricao}
            </p>
            <p className="text-foreground text-lg md:text-xl font-black mt-1">
              {formatPrice(produto.preco)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );

  const historySection = mesa.pedidos.length > 0 && (
    <section className="flex flex-col gap-3 pt-6">
      <h2 className="text-foreground text-base font-bold px-1">Pedidos enviados</h2>
      {mesa.pedidos.map((pedido) => (
        <div key={pedido.id} className="bg-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground text-sm font-bold">Pedido #{pedido.numeroPedido}</span>
            <span className="text-muted-foreground text-xs font-medium">{pedido.criadoEm}</span>
          </div>
          <div className="space-y-2">
            {pedido.itens.map((item) => (
              <div key={item.uid} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium">
                    {item.quantidade}x {item.nome}
                  </p>
                  {item.adicionais.length > 0 && (
                    <p className="text-primary text-xs">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>
                  )}
                  {item.removidos.length > 0 && (
                    <p className="text-destructive text-xs">Sem {item.removidos.join(", ")}</p>
                  )}
                  {item.bebida && <p className="text-muted-foreground text-xs">Bebida: {item.bebida}</p>}
                  {item.observacoes && <p className="text-muted-foreground text-xs">Obs.: {item.observacoes}</p>}
                </div>
                <span className="text-foreground text-sm font-bold whitespace-nowrap">
                  {formatPrice(item.precoUnitario * item.quantidade)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Total do pedido</span>
            <span className="text-foreground text-base font-black">{formatPrice(pedido.total)}</span>
          </div>
        </div>
      ))}
    </section>
  );

  const mobileContent = (
    <>
      {bannerSection}
      {flowSummary}
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
        {historySection}
        {carrinho.length > 0 && <div className="h-20" />}
      </main>
    </>
  );

  const desktopContent = (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 lg:w-72 shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-md px-4 lg:px-5 py-4">
          <p className="text-foreground text-base font-bold">Categorias</p>
          <p className="text-muted-foreground text-sm">Fluxo unificado de pedidos</p>
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
      <main className="flex-1 overflow-y-auto pb-6">
        {bannerSection}
        {flowSummary}
        <div className="px-6 pt-4">
          {productGrid}
          {historySection}
          {carrinho.length > 0 && <div className="h-20" />}
        </div>
      </main>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        {header}
        {isMobile ? mobileContent : desktopContent}
        <ProductModal
          produto={produtoSelecionado}
          onClose={() => setProdutoSelecionado(null)}
          onAdd={handleAddToCart}
        />
        {carrinho.length > 0 && (
          <StickyOrderButton
            total={totalCarrinho}
            onOpenCart={() => setCartOpen(true)}
            label="Ver carrinho"
            showTotal={false}
          />
        )}
      </div>

      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-status-pendente" />
              Itens não enviados
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Existem {carrinho.length} {carrinho.length === 1 ? "item" : "itens"} no carrinho que ainda não {carrinho.length === 1 ? "foi enviado" : "foram enviados"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/garcom")}
              className="rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80"
            >
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PedidoFlow;
