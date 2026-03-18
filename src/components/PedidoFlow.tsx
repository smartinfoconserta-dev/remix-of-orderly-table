import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Bell, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryIcon from "@/components/CategoryIcon";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import MinhaContaDrawer from "@/components/MinhaContaDrawer";
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
import { banners, categorias, produtos, type Produto } from "@/data/menuData";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface PedidoFlowProps {
  modo: "cliente" | "garcom";
  mesaId: string;
  garcomNome?: string;
}

type CategoryTransitionState = "idle" | "exit" | "pre-enter";

const RESTAURANTE = {
  nome: "Obsidian",
  logoFallback: "OB",
};

const CATEGORY_SWITCH_DELAY_MS = 150;
const CATEGORY_EXIT_DURATION_MS = 150;
const CATEGORY_ENTER_DURATION_MS = 130;
const CATEGORY_SKELETON_DURATION_MS = 100;
const CARD_STAGGER_STEP_MS = 50;
const CARD_ANIMATION_DURATION_MS = 200;

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const formatMesaLabel = (mesaId: string) => {
  const numeroMesa = mesaId.replace(/\D/g, "") || "1";
  return `Mesa ${numeroMesa.padStart(2, "0")}`;
};

const PedidoFlow = ({ modo, mesaId, garcomNome }: PedidoFlowProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    getMesa,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    confirmarPedido,
    chamarGarcom,
    dismissChamarGarcom,
  } = useRestaurant();
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].id);
  const [categoriaExibida, setCategoriaExibida] = useState(categorias[0].id);
  const [categoryTransitionState, setCategoryTransitionState] = useState<CategoryTransitionState>("idle");
  const [showCategorySkeleton, setShowCategorySkeleton] = useState(false);
  const [cardsAnimatedIn, setCardsAnimatedIn] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [contaOpen, setContaOpen] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const categorySwitchTimerRef = useRef<number | null>(null);
  const categoryEnterTimerRef = useRef<number | null>(null);
  const categorySkeletonTimerRef = useRef<number | null>(null);
  const cardsAnimationTimerRef = useRef<number | null>(null);
  const mobileListTopRef = useRef<HTMLDivElement>(null);
  const desktopMainRef = useRef<HTMLElement>(null);

  const mesa = getMesa(mesaId);
  const carrinho = mesa?.carrinho ?? [];
  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const mesaLabel = formatMesaLabel(mesaId);
  const nomeAtendimento = garcomNome?.trim() || "Equipe de salão";
  const produtosFiltrados = produtos.filter((p) => p.categoria === categoriaExibida);

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

  useEffect(() => {
    return () => {
      if (categorySwitchTimerRef.current) {
        window.clearTimeout(categorySwitchTimerRef.current);
      }
      if (categoryEnterTimerRef.current) {
        window.clearTimeout(categoryEnterTimerRef.current);
      }
      if (categorySkeletonTimerRef.current) {
        window.clearTimeout(categorySkeletonTimerRef.current);
      }
      if (cardsAnimationTimerRef.current) {
        window.clearTimeout(cardsAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showCategorySkeleton) {
      setCardsAnimatedIn(false);
      return;
    }

    setCardsAnimatedIn(false);

    if (cardsAnimationTimerRef.current) {
      window.clearTimeout(cardsAnimationTimerRef.current);
    }

    cardsAnimationTimerRef.current = window.setTimeout(() => {
      setCardsAnimatedIn(true);
    }, 16);
  }, [categoriaExibida, showCategorySkeleton]);

  const handleSelectCategoria = useCallback(
    (categoriaId: string) => {
      if (categoriaId === categoriaAtiva && categoriaId === categoriaExibida) return;

      setCategoriaAtiva(categoriaId);
      setCategoryTransitionState("exit");
      setShowCategorySkeleton(true);

      if (isMobile) {
        mobileListTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        desktopMainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (categorySwitchTimerRef.current) {
        window.clearTimeout(categorySwitchTimerRef.current);
      }
      if (categoryEnterTimerRef.current) {
        window.clearTimeout(categoryEnterTimerRef.current);
      }
      if (categorySkeletonTimerRef.current) {
        window.clearTimeout(categorySkeletonTimerRef.current);
      }

      categorySkeletonTimerRef.current = window.setTimeout(() => {
        setShowCategorySkeleton(false);
      }, CATEGORY_SKELETON_DURATION_MS);

      categorySwitchTimerRef.current = window.setTimeout(() => {
        setCategoriaExibida(categoriaId);
        setCategoryTransitionState("pre-enter");

        categoryEnterTimerRef.current = window.setTimeout(() => {
          setCategoryTransitionState("idle");
        }, 16);
      }, CATEGORY_SWITCH_DELAY_MS);
    },
    [categoriaAtiva, categoriaExibida, isMobile]
  );

  const handleBack = useCallback(() => {
    if (modo === "garcom" && carrinho.length > 0) {
      setShowExitAlert(true);
      return;
    }

    navigate(modo === "cliente" ? "/" : "/garcom");
  }, [carrinho.length, modo, navigate]);

  const handleAddToCart = useCallback(
    (item: ItemCarrinho) => {
      addToCart(mesaId, {
        ...item,
        removidos: [...item.removidos],
        adicionais: item.adicionais.map((adicional) => ({ ...adicional })),
      });
      setProdutoSelecionado(null);
      setCartOpen(true);
      toast.success("Item configurado e adicionado ao carrinho", { duration: 1200, icon: "🛒" });
    },
    [addToCart, mesaId]
  );

  const handleChamarGarcom = useCallback(() => {
    chamarGarcom(mesaId);
    toast.success("Garçom a caminho", { duration: 1000, icon: "🔔" });
  }, [chamarGarcom, mesaId]);

  const validatePendingCart = useCallback(() => {
    const possuiItemInvalido = carrinho.some((item) => item.quantidade <= 0);

    if (!possuiItemInvalido) return true;

    toast.error("Revise o fluxo guiado antes de enviar", { duration: 1400 });
    setCartOpen(true);
    return false;
  }, [carrinho]);

  const handleConfirmar = useCallback(async () => {
    if (carrinho.length === 0) return false;
    if (!validatePendingCart()) return false;

    await new Promise((resolve) => window.setTimeout(resolve, 900));
    confirmarPedido(mesaId);
    return true;
  }, [carrinho.length, confirmarPedido, mesaId, validatePendingCart]);

  const handleSuccessAcknowledge = useCallback(() => {
    setCartOpen(false);
    setCategoriaAtiva(categorias[0].id);
    setCategoriaExibida(categorias[0].id);
    setCategoryTransitionState("idle");
    setShowCategorySkeleton(false);
    setCardsAnimatedIn(false);
    setProdutoSelecionado(null);
    window.scrollTo({ top: 0, behavior: isMobile ? "auto" : "smooth" });
  }, [isMobile]);

  if (!mesa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-card w-full max-w-md space-y-2 p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Mesa não encontrada</h1>
          <p className="text-muted-foreground">Não foi possível localizar a mesa informada.</p>
          <Button onClick={() => navigate(modo === "cliente" ? "/" : "/garcom")} className="rounded-xl">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const restaurantIdentity = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-10 w-10 rounded-xl border border-border bg-secondary shadow-sm">
        <AvatarFallback className="rounded-xl bg-secondary text-xs font-extrabold tracking-[0.18em] text-foreground">
          {RESTAURANTE.logoFallback}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-base font-extrabold tracking-tight text-foreground md:text-lg">{RESTAURANTE.nome}</p>
        <p className="truncate text-xs font-medium text-muted-foreground md:text-sm">{mesaLabel}</p>
      </div>
    </div>
  );

  const header = (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button onClick={handleBack} className="shrink-0 text-muted-foreground transition-transform active:scale-95">
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden text-sm font-medium xl:inline">Voltar</span>
          </div>
        </button>
        {restaurantIdentity}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {modo === "garcom" && (
          <div className="hidden items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground md:flex">
            {nomeAtendimento}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setContaOpen(true)}
          className="h-auto gap-2 rounded-xl px-4 py-2.5 text-sm font-bold md:text-base"
        >
          <Wallet className="h-4 w-4 md:h-5 md:w-5" />
          <span>Minha Conta</span>
        </Button>
        <CartDrawer
          carrinho={carrinho}
          onUpdateQty={(uid, delta) => updateCartItemQty(mesaId, uid, delta)}
          onRemove={(uid) => removeFromCart(mesaId, uid)}
          onConfirmar={handleConfirmar}
          onContinueOrdering={() => setCartOpen(false)}
          onSuccessAcknowledge={handleSuccessAcknowledge}
          open={cartOpen}
          onOpenChange={setCartOpen}
        />
        {modo === "cliente" && (
          <Button
            onClick={handleChamarGarcom}
            className="h-auto gap-2 rounded-xl bg-destructive px-5 py-2.5 text-base font-bold text-destructive-foreground hover:bg-destructive/90"
          >
            <Bell className="h-5 w-5" />
            <span className="hidden sm:inline">Chamar Garçom</span>
          </Button>
        )}
      </div>
    </header>
  );

  const bannerSection = (
    <div className="px-4 pt-4 md:px-6">
      <div className="relative h-32 overflow-hidden rounded-2xl border border-border bg-card md:h-40">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${banner.cor} flex flex-col justify-center px-6 transition-all duration-700 ease-in-out md:px-10 ${
              i === bannerIndex ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
          >
            <p className="text-lg font-bold text-foreground md:text-xl">{banner.titulo}</p>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">{banner.subtitulo}</p>
            <p className="mt-1 text-2xl font-black text-primary md:text-3xl">{banner.destaque}</p>
          </div>
        ))}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setBannerIndex(i)}
              className={`h-2 rounded-full transition-all ${i === bannerIndex ? "w-6 bg-foreground" : "w-2 bg-foreground/40"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const flowSummary = (
    <div className="px-4 pt-4 md:px-6">
      <div className="surface-card flex flex-wrap items-center gap-3 p-4 md:gap-4 md:p-5">
        <StatusBadge status={mesa.status} />
        <div className="hidden h-8 w-px bg-border md:block" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground md:text-base">
            {modo === "cliente" ? "Fluxo guiado antes do carrinho" : `${mesaLabel} em atendimento`}
          </p>
          <p className="text-xs text-muted-foreground md:text-sm">
            {modo === "cliente"
              ? "Configure o item por etapas e confirme apenas no carrinho"
              : `Garçom: ${nomeAtendimento}`}
          </p>
        </div>
        <span className="text-lg font-black tabular-nums text-foreground md:text-2xl">
          {formatPrice(mesa.total + totalCarrinho)}
        </span>
      </div>
    </div>
  );

  const categoryGridClasses =
    categoryTransitionState === "exit"
      ? "opacity-0 -translate-x-[10px]"
      : categoryTransitionState === "pre-enter"
        ? "opacity-0 translate-x-[10px]"
        : "opacity-100 translate-x-0";

  const productGrid = (
    <div
      className={`grid grid-cols-2 gap-3 transition-all ease-in-out md:grid-cols-2 md:gap-4 lg:grid-cols-3 ${categoryGridClasses}`}
      style={{
        transitionDuration: `${categoryTransitionState === "exit" ? CATEGORY_EXIT_DURATION_MS : CATEGORY_ENTER_DURATION_MS}ms`,
      }}
    >
      {produtosFiltrados.map((produto, index) => (
        <button
          key={produto.id}
          onClick={() => setProdutoSelecionado(produto)}
          className="surface-card flex flex-col overflow-hidden text-left will-change-transform active:scale-[0.97]"
          style={{
            opacity: cardsAnimatedIn ? 1 : 0,
            transform: cardsAnimatedIn ? "translateY(0)" : "translateY(20px)",
            transitionProperty: "opacity, transform",
            transitionDuration: `${CARD_ANIMATION_DURATION_MS}ms`,
            transitionTimingFunction: "ease-out",
            transitionDelay: `${Math.min(index, 3) * CARD_STAGGER_STEP_MS}ms`,
          }}
        >
          <div className="aspect-[4/3] overflow-hidden">
            <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
            <h2 className="line-clamp-1 text-sm font-bold text-foreground md:text-base">{produto.nome}</h2>
            <p className="line-clamp-2 flex-1 text-xs text-muted-foreground md:text-sm">{produto.descricao}</p>
            <p className="mt-1 text-lg font-black text-foreground md:text-xl">{formatPrice(produto.preco)}</p>
          </div>
        </button>
      ))}
    </div>
  );

  const skeletonGrid = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="surface-card overflow-hidden">
          <div className="aspect-[4/3] bg-muted/70 animate-pulse" />
          <div className="space-y-2 p-3 md:p-4">
            <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-full rounded-md bg-muted/80 animate-pulse" />
            <div className="h-3 w-2/3 rounded-md bg-muted/80 animate-pulse" />
            <div className="h-5 w-1/3 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  const mobileContent = (
    <>
      {bannerSection}
      {flowSummary}
      <div className="mt-4">
        <CategoryTabs
          categorias={categorias}
          categoriaAtiva={categoriaAtiva}
          onSelect={handleSelectCategoria}
          paddingClassName="px-4 pb-2"
        />
      </div>
      <div ref={mobileListTopRef} />
      <main className="flex-1 px-4 pb-6 pt-4">{showCategorySkeleton ? skeletonGrid : productGrid}</main>
    </>
  );

  const desktopContent = (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-card lg:w-72">
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur-md lg:px-5">
          <p className="text-base font-bold text-foreground">Categorias</p>
          <p className="text-sm text-muted-foreground">Fluxo profissional de autoatendimento</p>
        </div>
        <nav className="flex flex-col gap-0 py-2">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategoria(cat.id)}
              className={`relative flex items-center gap-3 border-l-2 px-4 py-3.5 text-left text-sm font-medium transition-all duration-300 ease-in-out ${
                categoriaAtiva === cat.id
                  ? "border-l-primary bg-secondary/50 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25),0_0_16px_hsl(var(--primary)/0.12)]"
                  : "border-l-transparent text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
              }`}
            >
              <CategoryIcon name={cat.icone} className="h-3.5 w-3.5" />
              <span>{cat.nome}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main ref={desktopMainRef} className="flex-1 overflow-y-auto pb-6">
        {bannerSection}
        {flowSummary}
        <div className="px-6 pt-4">{showCategorySkeleton ? skeletonGrid : productGrid}</div>
      </main>
    </div>
  );

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        {header}
        {isMobile ? mobileContent : desktopContent}
        <ProductModal produto={produtoSelecionado} onClose={() => setProdutoSelecionado(null)} onAdd={handleAddToCart} />
        <MinhaContaDrawer pedidos={mesa.pedidos} total={mesa.total} open={contaOpen} onOpenChange={setContaOpen} />
      </div>

      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent className="max-w-sm border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-status-pendente" />
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
              className="rounded-xl bg-secondary font-bold text-foreground hover:bg-secondary/80"
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
