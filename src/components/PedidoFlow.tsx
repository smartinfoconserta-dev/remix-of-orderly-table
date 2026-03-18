import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Bell, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryIcon from "@/components/CategoryIcon";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import MinhaContaDrawer from "@/components/MinhaContaDrawer";
import RestaurantHomeSection from "@/components/RestaurantHomeSection";
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
import { categorias, produtos, type Categoria, type Produto } from "@/data/menuData";
import { HOME_CAROUSEL_INTERVAL_MS, homeHeroSlides, homeShowcaseConfig } from "@/data/homeShowcaseData";
import { useAuth } from "@/contexts/AuthContext";
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

const HOME_TAB_ID = "inicio";
const HOME_TAB: Categoria = { id: HOME_TAB_ID, nome: "Início", icone: "house" };
const navigationItems = [HOME_TAB, ...categorias];
const CATEGORY_SWITCH_DELAY_MS = 150;
const CATEGORY_EXIT_DURATION_MS = 150;
const CATEGORY_ENTER_DURATION_MS = 130;
const CATEGORY_SKELETON_DURATION_MS = 100;
const CARD_STAGGER_STEP_MS = 50;
const CARD_ANIMATION_DURATION_MS = 200;
const PRODUCT_MODAL_OPEN_DELAY_MS = 120;
const CLIENT_IDLE_TIMEOUT_MS = 30000;
const ORDER_SUBMIT_LOCK_MS = 2000;
const TABLET_MIN_WIDTH = 768;
const TABLET_MAX_WIDTH = 1279;

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const formatMesaLabel = (mesaId: string) => {
  const numeroMesa = mesaId.replace(/\D/g, "") || "1";
  return `Mesa ${numeroMesa.padStart(2, "0")}`;
};

const PedidoFlow = ({ modo, mesaId, garcomNome }: PedidoFlowProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentGarcom } = useAuth();
  const {
    getMesa,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    confirmarPedido,
    chamarGarcom,
    dismissChamarGarcom,
  } = useRestaurant();
  const [categoriaAtiva, setCategoriaAtiva] = useState(HOME_TAB_ID);
  const [categoriaExibida, setCategoriaExibida] = useState(HOME_TAB_ID);
  const [categoryTransitionState, setCategoryTransitionState] = useState<CategoryTransitionState>("idle");
  const [showCategorySkeleton, setShowCategorySkeleton] = useState(false);
  const [cardsAnimatedIn, setCardsAnimatedIn] = useState(false);
  const [selectedProductCardId, setSelectedProductCardId] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [contaOpen, setContaOpen] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [isClientIdle, setIsClientIdle] = useState(false);
  const categorySwitchTimerRef = useRef<number | null>(null);
  const categoryEnterTimerRef = useRef<number | null>(null);
  const categorySkeletonTimerRef = useRef<number | null>(null);
  const cardsAnimationTimerRef = useRef<number | null>(null);
  const openProductTimerRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const orderSubmissionCooldownRef = useRef<number | null>(null);
  const orderSubmissionLockRef = useRef(false);
  const mobileListTopRef = useRef<HTMLDivElement>(null);
  const desktopMainRef = useRef<HTMLElement>(null);

  const mesa = getMesa(mesaId);
  const carrinho = mesa?.carrinho ?? [];

  const mesaLabel = formatMesaLabel(mesaId);
  const nomeAtendimento = garcomNome?.trim() || currentGarcom?.nome || "Equipe de salão";
  const isHomeActive = categoriaExibida === HOME_TAB_ID;
  const isTabletViewport = !isMobile && typeof window !== "undefined" && window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH;
  const shouldEnableClientIdle = modo === "cliente" && isTabletViewport;
  const produtosFiltrados = useMemo(
    () => produtos.filter((p) => p.categoria === categoriaExibida),
    [categoriaExibida],
  );
  const featuredProducts = useMemo(
    () => ["c1", "l2", "pr1"].map((id) => produtos.find((produto) => produto.id === id)).filter(Boolean) as Produto[],
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % homeHeroSlides.length);
    }, HOME_CAROUSEL_INTERVAL_MS);
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
      if (openProductTimerRef.current) {
        window.clearTimeout(openProductTimerRef.current);
      }
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
      if (orderSubmissionCooldownRef.current) {
        window.clearTimeout(orderSubmissionCooldownRef.current);
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

  useEffect(() => {
    if (!shouldEnableClientIdle) {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
      setIsClientIdle(false);
      return;
    }

    const scheduleIdleState = () => {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }

      idleTimeoutRef.current = window.setTimeout(() => {
        setIsClientIdle(true);
      }, CLIENT_IDLE_TIMEOUT_MS);
    };

    const handleUserActivity = () => {
      setIsClientIdle(false);
      scheduleIdleState();
    };

    scheduleIdleState();

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "touchstart", "click", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });

      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };
  }, [shouldEnableClientIdle]);


  const handleOpenProductModal = useCallback((produto: Produto) => {
    setSelectedProductCardId(produto.id);

    if (openProductTimerRef.current) {
      window.clearTimeout(openProductTimerRef.current);
    }

    openProductTimerRef.current = window.setTimeout(() => {
      setProdutoSelecionado(produto);
    }, PRODUCT_MODAL_OPEN_DELAY_MS);
  }, []);

  const handleCloseProductModal = useCallback(() => {
    if (openProductTimerRef.current) {
      window.clearTimeout(openProductTimerRef.current);
      openProductTimerRef.current = null;
    }

    setProdutoSelecionado(null);
    setSelectedProductCardId(null);
  }, []);

  const handleSelectCategoria = useCallback(
    (categoriaId: string) => {
      if (categoriaId === categoriaAtiva && categoriaId === categoriaExibida) return;

      setCategoriaAtiva(categoriaId);
      setCategoryTransitionState("exit");
      setShowCategorySkeleton(categoriaId !== HOME_TAB_ID);
      setSelectedProductCardId(null);
      setIsClientIdle(false);

      if (openProductTimerRef.current) {
        window.clearTimeout(openProductTimerRef.current);
        openProductTimerRef.current = null;
      }

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

      if (categoriaId !== HOME_TAB_ID) {
        categorySkeletonTimerRef.current = window.setTimeout(() => {
          setShowCategorySkeleton(false);
        }, CATEGORY_SKELETON_DURATION_MS);
      }

      categorySwitchTimerRef.current = window.setTimeout(() => {
        setCategoriaExibida(categoriaId);
        setCategoryTransitionState("pre-enter");

        categoryEnterTimerRef.current = window.setTimeout(() => {
          setCategoryTransitionState("idle");
        }, 16);
      }, CATEGORY_SWITCH_DELAY_MS);
    },
    [categoriaAtiva, categoriaExibida, isMobile],
  );

  const handleBack = useCallback(() => {
    if (modo === "cliente") return;

    if (modo === "garcom" && carrinho.length > 0) {
      setShowExitAlert(true);
      return;
    }

    navigate("/garcom");
  }, [carrinho.length, modo, navigate]);

  const handleAddToCart = useCallback(
    (item: ItemCarrinho) => {
      addToCart(mesaId, {
        ...item,
        removidos: [...item.removidos],
        adicionais: item.adicionais.map((adicional) => ({ ...adicional })),
      });
      setProdutoSelecionado(null);
      setSelectedProductCardId(null);
      setCartOpen(true);
      setIsClientIdle(false);
    },
    [addToCart, mesaId],
  );

  const handleChamarGarcom = useCallback(() => {
    chamarGarcom(mesaId);
    toast.success("Garçom a caminho", { duration: 1000, icon: "🔔" });
    setIsClientIdle(false);
  }, [chamarGarcom, mesaId]);

  const validatePendingCart = useCallback(() => {
    const possuiItemInvalido = carrinho.some((item) => item.quantidade <= 0);

    if (!possuiItemInvalido) return true;

    toast.error("Revise o fluxo guiado antes de enviar", { duration: 1400 });
    setCartOpen(true);
    return false;
  }, [carrinho]);

  const handleConfirmar = useCallback(async () => {
    if (carrinho.length === 0 || orderSubmissionLockRef.current) return false;
    if (!validatePendingCart()) return false;

    orderSubmissionLockRef.current = true;

    if (orderSubmissionCooldownRef.current) {
      window.clearTimeout(orderSubmissionCooldownRef.current);
    }

    try {
      confirmarPedido(mesaId, {
        modo,
        operador: modo === "garcom" ? currentGarcom : undefined,
      });
      return true;
    } finally {
      orderSubmissionCooldownRef.current = window.setTimeout(() => {
        orderSubmissionLockRef.current = false;
        orderSubmissionCooldownRef.current = null;
      }, ORDER_SUBMIT_LOCK_MS);
    }
  }, [carrinho.length, confirmarPedido, currentGarcom, mesaId, modo, validatePendingCart]);

  const handleSuccessAcknowledge = useCallback(() => {
    if (categorySwitchTimerRef.current) {
      window.clearTimeout(categorySwitchTimerRef.current);
      categorySwitchTimerRef.current = null;
    }

    if (categoryEnterTimerRef.current) {
      window.clearTimeout(categoryEnterTimerRef.current);
      categoryEnterTimerRef.current = null;
    }

    if (categorySkeletonTimerRef.current) {
      window.clearTimeout(categorySkeletonTimerRef.current);
      categorySkeletonTimerRef.current = null;
    }

    if (cardsAnimationTimerRef.current) {
      window.clearTimeout(cardsAnimationTimerRef.current);
      cardsAnimationTimerRef.current = null;
    }

    if (openProductTimerRef.current) {
      window.clearTimeout(openProductTimerRef.current);
      openProductTimerRef.current = null;
    }

    setCartOpen(false);
    setContaOpen(false);
    setShowExitAlert(false);
    setSelectedProductCardId(null);
    setProdutoSelecionado(null);
    setCategoriaAtiva(HOME_TAB_ID);
    setCategoriaExibida(HOME_TAB_ID);
    setCategoryTransitionState("idle");
    setShowCategorySkeleton(false);
    setCardsAnimatedIn(true);
    setBannerIndex(0);
    setIsClientIdle(false);

    requestAnimationFrame(() => {
      mobileListTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      desktopMainRef.current?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);

  if (!mesa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-card w-full max-w-md space-y-2 p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Mesa não encontrada</h1>
          <p className="text-muted-foreground">Não foi possível localizar a mesa informada.</p>
          {modo !== "cliente" ? (
            <Button onClick={() => navigate("/garcom")} className="rounded-xl">
              Ir para mesas
            </Button>
          ) : null}
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
        {modo === "garcom" && (
          <button onClick={handleBack} className="shrink-0 text-muted-foreground transition-transform active:scale-95">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden text-sm font-medium xl:inline">Mesas</span>
            </div>
          </button>
        )}
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

  const heroBanner = (
    <section className="px-4 pt-4 md:px-6">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-border bg-card shadow-[0_30px_70px_-45px_hsl(var(--foreground)/0.9)]">
        <div className="relative min-h-[260px] w-full md:min-h-[340px]">
          {homeHeroSlides.map((slide, index) => (
            <article
              key={slide.id}
              aria-hidden={index !== bannerIndex}
              className={`absolute inset-0 overflow-hidden transition-all duration-700 ease-out ${index === bannerIndex ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "80% center" }}
                loading={index === 0 ? "eager" : "lazy"}
              />

              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.78) 34%, hsl(var(--background) / 0.36) 58%, hsl(var(--background) / 0.08) 100%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />

              <div className="relative z-10 flex min-h-[260px] items-end p-6 md:min-h-[340px] md:p-8">
                <div className="max-w-xl space-y-3 md:space-y-4">
                  <span className="inline-flex rounded-full border border-border bg-background/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/80 backdrop-blur-md md:text-xs">
                    {slide.label}
                  </span>
                  <div className="space-y-2">
                    <h2 className="max-w-lg text-3xl font-black tracking-tight text-foreground md:text-5xl md:leading-[0.95]">
                      {slide.title}
                    </h2>
                    <p className="max-w-md text-sm text-muted-foreground md:text-base">{slide.description}</p>
                  </div>
                  <p className="text-3xl font-black tracking-tight text-primary drop-shadow-[0_10px_22px_hsl(var(--primary)/0.28)] md:text-5xl">
                    {slide.price}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full bg-background/35 px-3 py-2 backdrop-blur-md">
            {homeHeroSlides.map((slide, index) => (
              <span
                key={slide.id}
                className={`h-1.5 rounded-full transition-all duration-500 ${index === bannerIndex ? "w-8 bg-primary" : "w-1.5 bg-background/70"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
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
      {produtosFiltrados.map((produto, index) => {
        const isCardSelected = selectedProductCardId === produto.id;

        return (
          <button
            key={produto.id}
            onClick={() => handleOpenProductModal(produto)}
            className={`surface-card flex flex-col overflow-hidden text-left will-change-transform active:scale-[0.97] ${
              isCardSelected ? "shadow-[0_16px_36px_-14px_hsl(var(--foreground)/0.34)]" : ""
            }`}
            style={{
              opacity: cardsAnimatedIn ? 1 : 0,
              transform: `translateY(${cardsAnimatedIn ? 0 : 20}px) scale(${isCardSelected ? 1.03 : 1})`,
              transitionProperty: "opacity, transform, box-shadow",
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
        );
      })}
    </div>
  );

  const homeContent = (
    <div
      className={`space-y-5 transition-all ease-in-out ${categoryGridClasses}`}
      style={{
        transitionDuration: `${categoryTransitionState === "exit" ? CATEGORY_EXIT_DURATION_MS : CATEGORY_ENTER_DURATION_MS}ms`,
      }}
    >
      {heroBanner}
      <div className="px-4 md:px-6">
        <RestaurantHomeSection config={homeShowcaseConfig} featuredProducts={featuredProducts} onOpenProduct={handleOpenProductModal} />
      </div>
    </div>
  );

  const skeletonGrid = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="surface-card overflow-hidden">
          <div className="aspect-[4/3] animate-pulse bg-muted/70" />
          <div className="space-y-2 p-3 md:p-4">
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-full animate-pulse rounded-md bg-muted/80" />
            <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted/80" />
            <div className="h-5 w-1/3 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );

  const idleOverlay = shouldEnableClientIdle ? (
    <button
      type="button"
      onClick={() => setIsClientIdle(false)}
      aria-hidden={!isClientIdle}
      tabIndex={isClientIdle ? 0 : -1}
      className={`fixed inset-0 z-[70] transition-opacity duration-500 ${
        isClientIdle ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ backgroundColor: "hsl(var(--background) / 0.42)" }}
    />
  ) : null;

  const mobileContent = (
    <>
      <div className="mt-4">
        <CategoryTabs
          categorias={navigationItems}
          categoriaAtiva={categoriaAtiva}
          onSelect={handleSelectCategoria}
          paddingClassName="px-4 pb-2"
        />
      </div>
      <div ref={mobileListTopRef} />
      <main className={`flex-1 pb-6 pt-2 transition-all duration-500 ${isClientIdle ? "brightness-[0.2] saturate-50" : "brightness-100 saturate-100"}`}>
        <div className="px-4">{showCategorySkeleton ? skeletonGrid : isHomeActive ? homeContent : productGrid}</div>
      </main>
    </>
  );

  const desktopContent = (
    <div className={`flex flex-1 overflow-hidden transition-all duration-500 ${isClientIdle ? "brightness-[0.2] saturate-50" : "brightness-100 saturate-100"}`}>
      <aside className="w-[19rem] shrink-0 overflow-y-auto border-r border-border bg-card/95 px-3 py-3 lg:w-[21rem]">
        <div className="sticky top-0 z-10 rounded-[1.5rem] border border-border bg-background/85 px-5 py-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Navegação</p>
          <p className="mt-2 text-lg font-black text-foreground">Cardápio</p>
        </div>
        <nav className="mt-4 flex flex-col gap-2">
          {[HOME_TAB, ...categorias].map((cat) => {
            const selected = categoriaAtiva === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategoria(cat.id)}
                className={`flex items-center gap-3 rounded-[1.15rem] border px-4 py-4 text-left text-sm font-semibold transition-all duration-300 ease-out ${
                  selected
                    ? "border-primary/35 bg-secondary text-foreground shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.9),inset_0_0_0_1px_hsl(var(--primary)/0.28)]"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary/45 hover:text-foreground"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${selected ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-secondary/55 text-foreground"}`}>
                  <CategoryIcon name={cat.icone} className="h-4.5 w-4.5" />
                </div>
                <span className="truncate">{cat.nome}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main ref={desktopMainRef} className="flex-1 overflow-y-auto pb-8 pt-4">
        {showCategorySkeleton ? <div className="px-6">{skeletonGrid}</div> : isHomeActive ? homeContent : <div className="px-6">{productGrid}</div>}
      </main>
    </div>
  );

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        {header}
        {isMobile ? mobileContent : desktopContent}
        <ProductModal produto={produtoSelecionado} onClose={handleCloseProductModal} onAdd={handleAddToCart} />
        <MinhaContaDrawer pedidos={mesa.pedidos} total={mesa.total} open={contaOpen} onOpenChange={setContaOpen} />
        {idleOverlay}
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
            <AlertDialogCancel className="rounded-xl font-bold">Continuar no pedido</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/garcom")}
              className="rounded-xl bg-secondary font-bold text-foreground hover:bg-secondary/80"
            >
              Ir para mesas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PedidoFlow;