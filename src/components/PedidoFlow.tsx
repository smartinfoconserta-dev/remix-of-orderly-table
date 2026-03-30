import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Bell, Instagram, LockKeyhole, RefreshCw, Search, ShoppingBag, ShoppingCart, Unlink, Wallet, Wifi, X } from "lucide-react";
import qrInstagramFallback from "@/assets/qr-instagram-premium.png";
import qrWifiFallback from "@/assets/qr-wifi-premium.png";
import bgInstagramDefault from "@/assets/bg-instagram-card.jpg";
import bgWifiDefault from "@/assets/bg-wifi-card.jpg";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryIcon from "@/components/CategoryIcon";
import ProductModal from "@/components/ProductModal";
import PedidoFlowCart from "@/components/pedido/PedidoFlowCart";
import PedidoFlowCatalog from "@/components/pedido/PedidoFlowCatalog";
import PedidoFlowHome from "@/components/pedido/PedidoFlowHome";
import MinhaContaDrawer from "@/components/MinhaContaDrawer";
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
import { categorias as defaultCategorias, type Categoria, type Produto } from "@/data/menuData";
import { getSistemaConfig, getCategoriasCustom, type SistemaConfig } from "@/lib/adminStorage";
import { getCachedProdutos, getCachedCategorias, preloadProducts } from "@/hooks/useProducts";
import { HOME_CAROUSEL_INTERVAL_MS, homeHeroSlides, homeShowcaseConfig } from "@/data/homeShowcaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  clearTabletLoginUser,
} from "@/lib/tabletBinding";
import { getStoredDeviceId } from "@/lib/deviceAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";
import { formatPrice } from "@/components/caixa/caixaHelpers";

interface PedidoFlowProps {
  modo: "cliente" | "garcom" | "caixa" | "balcao" | "delivery" | "totem";
  mesaId?: string;
  garcomNome?: string;
  clienteNome?: string;
  onBack?: () => void;
  onPedidoConfirmado?: (itens: ItemCarrinho[], paraViagem: boolean) => void;
  deviceStoreId?: string | null;
}

// sysConfig moved inside component as state


// Products are loaded reactively inside the component

// activeBannerSlides moved inside component

const HOME_TAB_ID = "inicio";
const HOME_TAB: Categoria = { id: HOME_TAB_ID, nome: "Início", icone: "house" };
// customCats & navigationItems moved inside component via useMemo
const PRODUCT_MODAL_OPEN_DELAY_MS = 120;
const CLIENT_IDLE_TIMEOUT_MS = 30000;
const ORDER_SUBMIT_LOCK_MS = 2000;
const TABLET_MIN_WIDTH = 768;
const TABLET_MAX_WIDTH = 1279;
const LONG_PRESS_DURATION_MS = 5000;

const formatMesaLabel = (mesaId: string) => {
  const numeroMesa = mesaId.replace(/\D/g, "") || "1";
  return `Mesa ${numeroMesa.padStart(2, "0")}`;
};

const PedidoFlow = ({ modo, mesaId = "__external__", garcomNome, clienteNome, onBack, onPedidoConfirmado, deviceStoreId: propStoreId }: PedidoFlowProps) => {
  const isTotem = modo === "totem";
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentGarcom, currentCaixa, verifyEmployeeAccess } = useAuth();
  const {
    getMesa,
    mesas,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    confirmarPedido,
    chamarGarcom,
    dismissChamarGarcom,
  } = useRestaurant();
  const isExternalOrder = modo === "balcao" || modo === "delivery" || modo === "totem";

  // ── sysConfig as reactive state (loads from DB) ──
  const [sysConfig, setSysConfig] = useState<SistemaConfig>(() => getSistemaConfig());

  // Reactive product/category loading from Supabase cache
  const [produtos, setProdutos] = useState<Produto[]>(() => getCachedProdutos());
  const [dbCategorias, setDbCategorias] = useState<Categoria[]>(() => getCachedCategorias());

  // Get storeId from prop (delivery), sessionStorage (device), or null
  const deviceStoreId = useMemo(() => {
    if (propStoreId) return propStoreId;
    return getActiveStoreId();
  }, [propStoreId]);

  useEffect(() => {
    let cancelled = false;
    preloadProducts(deviceStoreId).then(() => {
      if (cancelled) return;
      setProdutos([...getCachedProdutos()]);
      setDbCategorias([...getCachedCategorias()]);
    });
    return () => { cancelled = true; };
  }, [deviceStoreId]);

  // Load config from DB
  useEffect(() => {
    import("@/lib/configService").then(({ fetchConfig }) => {
      fetchConfig(deviceStoreId).then((config) => {
        if (config) setSysConfig(config);
      });
    });
  }, [deviceStoreId]);

  const logoEstilo = sysConfig.logoEstilo || "quadrada";
  const logoRadius = logoEstilo === "circular" ? "rounded-full" : "rounded-xl";
  const logoRadiusSm = logoEstilo === "circular" ? "rounded-full" : "rounded-lg";
  const cardapioHeaderEstilo = sysConfig.cardapioHeaderEstilo || "padrao";
  const cardapioBannerBase64 = sysConfig.cardapioBannerBase64 || "";
  const RESTAURANTE = {
    nome: sysConfig.nomeRestaurante || "Restaurante",
    logoUrl: sysConfig.logoBase64 || sysConfig.logoUrl || "",
    logoFallback: (sysConfig.nomeRestaurante || "Restaurante").slice(0, 2).toUpperCase(),
  };

  const configBanners = sysConfig.banners?.filter((b) => b.titulo && b.imagemUrl) ?? [];
  const activeBannerSlides = configBanners.length > 0
    ? configBanners.map((b, i) => ({
        id: b.id || `cb-${i}`,
        image: b.imagemUrl,
        label: "",
        title: b.titulo,
        description: b.subtitulo,
        price: b.preco,
        alt: b.titulo,
      }))
    : homeHeroSlides;

  const customCats = useMemo(() => getCategoriasCustom(), []);
  const allCategorias: Categoria[] = useMemo(() => {
    // If we have DB categories, use them exclusively; only add custom cats that don't exist in DB by name or id
    if (dbCategorias.length > 0) return dbCategorias;
    return [
      ...dbCategorias,
      ...customCats.filter((c) => !dbCategorias.some((dc) => dc.id === c.id || dc.nome === c.nome)).map((c) => ({ id: c.id, nome: c.nome, icone: c.icone })),
    ];
  }, [customCats, dbCategorias]);
  const navigationItems = useMemo(() => [HOME_TAB, ...allCategorias], [allCategorias]);
  const [localCarrinho, setLocalCarrinho] = useState<ItemCarrinho[]>([]);
  const firstCatId = allCategorias[0]?.id ?? HOME_TAB_ID;
  const [categoriaAtiva, setCategoriaAtiva] = useState(isExternalOrder ? firstCatId : HOME_TAB_ID);
  const [categoriaExibida, setCategoriaExibida] = useState(isExternalOrder ? firstCatId : HOME_TAB_ID);
  const [categoryFadeKey, setCategoryFadeKey] = useState(0);
  const [selectedProductCardId, setSelectedProductCardId] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [contaOpen, setContaOpen] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [paraViagem, setParaViagem] = useState(modo === "delivery");
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientIdle, setIsClientIdle] = useState(false);
  const [_showGarcomBanner] = useState(false); // kept for hook order stability
  const garcomBannerTimerRef = useRef<number | null>(null); // kept for hook order stability

  // Hidden admin modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [showMesaSelector, setShowMesaSelector] = useState(false);
  const [adminUserEmail, setAdminUserEmail] = useState("");

  const longPressTimerRef = useRef<number | null>(null);
  const openProductTimerRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const orderSubmissionCooldownRef = useRef<number | null>(null);
  const orderSubmissionLockRef = useRef(false);
  const mobileListTopRef = useRef<HTMLDivElement>(null);
  const desktopMainRef = useRef<HTMLElement>(null);

  const mesa = getMesa(mesaId);
  const carrinho = isExternalOrder ? localCarrinho : (mesa?.carrinho ?? []);

  const mesaLabel = isExternalOrder
    ? (modo === "delivery" ? `Delivery — ${clienteNome || ""}` : `Balcão — ${clienteNome || ""}`)
    : formatMesaLabel(mesaId);
  const nomeAtendimento = garcomNome?.trim() || currentGarcom?.nome || currentCaixa?.nome || "Equipe operacional";
  const isGarcomMobile = modo === "garcom" || modo === "delivery";
  const isHomeActive = categoriaExibida === HOME_TAB_ID;
  const isTabletViewport = !isMobile && typeof window !== "undefined" && window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH;
  const shouldEnableClientIdle = modo === "cliente" && isTabletViewport;

  const produtosDisponiveis = useMemo(() => {
    return produtos;
  }, [produtos]);

  const cartTotal = useMemo(
    () => carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0),
    [carrinho],
  );
  const cartItemCount = useMemo(() => carrinho.reduce((acc, item) => acc + item.quantidade, 0), [carrinho]);
  const produtosDaCategoria = useMemo(
    () => produtosDisponiveis.filter((p) => p.categoria === categoriaExibida),
    [categoriaExibida, produtosDisponiveis],
  );
  const produtosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return produtosDaCategoria;
    const q = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return produtosDisponiveis.filter(p => {
      const nome = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const desc = (p.descricao || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nome.includes(q) || desc.includes(q);
    });
  }, [searchQuery, produtosDaCategoria, produtosDisponiveis]);
  const featuredProducts = useMemo(
    () => ["c1", "l2", "pr1"].map((id) => produtos.find((produto) => produto.id === id)).filter(Boolean) as Produto[],
    [produtos],
  );

  // Combo products for home section
  const comboProducts = useMemo(
    () => produtos.filter((p) => p.categoria === "combos"),
    [produtos],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % activeBannerSlides.length);
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
      if (openProductTimerRef.current) {
        window.clearTimeout(openProductTimerRef.current);
      }
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
      if (orderSubmissionCooldownRef.current) {
        window.clearTimeout(orderSubmissionCooldownRef.current);
      }
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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
      openProductTimerRef.current = null;
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

  const handleCartOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setCartOpen(false);
        return;
      }

      if (openProductTimerRef.current) {
        window.clearTimeout(openProductTimerRef.current);
        openProductTimerRef.current = null;
      }

      setContaOpen(false);

      if (produtoSelecionado) {
        setProdutoSelecionado(null);
        setSelectedProductCardId(null);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCartOpen(true);
          });
        });

        return;
      }

      setCartOpen(true);
    },
    [produtoSelecionado],
  );

  const handleSelectCategoria = useCallback(
    (categoriaId: string) => {
      if (categoriaId === categoriaAtiva) return;

      setCategoriaAtiva(categoriaId);
      setCategoriaExibida(categoriaId);
      setCategoryFadeKey((k) => k + 1);
      setSelectedProductCardId(null);
      setIsClientIdle(false);

      if (openProductTimerRef.current) {
        window.clearTimeout(openProductTimerRef.current);
        openProductTimerRef.current = null;
      }

      if (isMobile) {
        mobileListTopRef.current?.scrollIntoView({ behavior: isGarcomMobile ? "auto" : "auto", block: "start" });
      } else {
        desktopMainRef.current?.scrollTo({ top: 0, behavior: "auto" });
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    [categoriaAtiva, isGarcomMobile, isMobile],
  );

  const navigateBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }

    navigate(modo === "garcom" ? "/garcom" : "/caixa");
  }, [modo, navigate, onBack]);

  const handleBack = useCallback(() => {
    if (modo === "cliente" || modo === "totem") return;

    if (carrinho.length > 0) {
      setShowExitAlert(true);
      return;
    }

    navigateBack();
  }, [carrinho.length, modo, navigateBack]);

  const handleAddToCart = useCallback(
    (item: ItemCarrinho) => {
      if (isExternalOrder) {
        setLocalCarrinho(prev => [...prev, {
          ...item,
          removidos: [...item.removidos],
          adicionais: item.adicionais.map((adicional) => ({ ...adicional })),
        }]);
      } else {
        addToCart(mesaId, {
          ...item,
          removidos: [...item.removidos],
          adicionais: item.adicionais.map((adicional) => ({ ...adicional })),
        });
      }
      setSelectedProductCardId(null);
      setProdutoSelecionado(null);
      setIsClientIdle(false);
      handleCartOpenChange(true);
    },
    [addToCart, handleCartOpenChange, isExternalOrder, mesaId],
  );

  const handleChamarGarcom = useCallback(() => {
    if (mesa?.chamarGarcom) {
      // Already called — dismiss
      dismissChamarGarcom(mesaId);
      toast("Chamado cancelado", { duration: 1000, icon: "✕" });
    } else {
      chamarGarcom(mesaId);
      toast.success("Garçom a caminho", { duration: 1000, icon: "🔔" });
    }
    setIsClientIdle(false);
  }, [chamarGarcom, dismissChamarGarcom, mesa?.chamarGarcom, mesaId]);

  // ── Long-press admin gesture ──
  const handleLogoPointerDown = useCallback(() => {
    if (modo !== "cliente") return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      setAdminModalOpen(true);
      setAdminAuthenticated(false);
      setAdminEmail("");
      setAdminPassword("");
      setAdminError(null);
      setShowMesaSelector(false);
    }, LONG_PRESS_DURATION_MS);
  }, [modo]);

  const handleLogoPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleAdminLogin = useCallback(async () => {
    if (isAdminLoggingIn || !adminEmail.trim() || !adminPassword) return;
    setIsAdminLoggingIn(true);
    setAdminError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });
      if (error) {
        setAdminError("Email ou senha inválidos");
        setIsAdminLoggingIn(false);
        return;
      }
      setAdminAuthenticated(true);
      setAdminUserEmail(adminEmail.trim());
      setAdminPassword("");
      setAdminError(null);
      setIsAdminLoggingIn(false);
    } catch {
      setAdminError("Erro ao autenticar");
      setIsAdminLoggingIn(false);
    }
  }, [adminEmail, adminPassword, isAdminLoggingIn]);

  const handleAdminTrocarMesa = useCallback(() => {
    setShowMesaSelector(true);
  }, []);

  const handleAdminSelectNewMesa = useCallback(async (newMesaId: string) => {
    const deviceId = getStoredDeviceId();
    if (deviceId) {
      await supabase.from("devices").update({ mesa_id: newMesaId } as any).eq("device_id", deviceId);
    }
    // Save to sessionStorage
    try { sessionStorage.setItem("orderly-tablet-mesa", newMesaId); } catch {}
    // Find mesa numbers for logging
    const oldMesaNum = mesas.find((m) => m.id === mesaId)?.numero;
    const newMesaNum = mesas.find((m) => m.id === newMesaId)?.numero;
    // Log event
    if (deviceStoreId) {
      try {
        await supabase.rpc("rpc_insert_evento", {
          _data: {
            id: crypto.randomUUID(),
            store_id: deviceStoreId,
            tipo: "tablet_mesa_trocada",
            usuario_nome: adminUserEmail,
            descricao: `Mesa trocada de ${oldMesaNum ?? "?"} para ${newMesaNum ?? "?"} por ${adminUserEmail}`,
            criado_em: new Date().toLocaleString("pt-BR"),
            criado_em_iso: new Date().toISOString(),
          },
        });
      } catch {}
    }
    await supabase.auth.signOut();
    setAdminModalOpen(false);
    toast.success("Mesa trocada com sucesso", { duration: 1200, icon: "🔄" });
    window.location.reload();
  }, [mesas, mesaId, deviceStoreId, adminUserEmail]);

  const handleAdminDesvincular = useCallback(async () => {
    const deviceId = getStoredDeviceId();
    if (deviceId) {
      await supabase.from("devices").update({ mesa_id: null } as any).eq("device_id", deviceId);
    }
    // Clear sessionStorage
    try { sessionStorage.removeItem("orderly-tablet-mesa"); } catch {}
    // Log event
    if (deviceStoreId) {
      try {
        await supabase.rpc("rpc_insert_evento", {
          _data: {
            id: crypto.randomUUID(),
            store_id: deviceStoreId,
            tipo: "tablet_desvinculado",
            usuario_nome: adminUserEmail,
            descricao: `Tablet desvinculado por ${adminUserEmail}`,
            criado_em: new Date().toLocaleString("pt-BR"),
            criado_em_iso: new Date().toISOString(),
          },
        });
      } catch {}
    }
    await supabase.auth.signOut();
    clearTabletLoginUser();
    setAdminModalOpen(false);
    toast.success("Tablet desvinculado", { duration: 1200, icon: "📱" });
  }, [deviceStoreId, adminUserEmail]);

  const mesasOrdenadas = useMemo(() => [...mesas].sort((a, b) => a.numero - b.numero), [mesas]);

  // Dynamic QR code info cards (must be before early return to maintain hook order)
  const qrInfoCards = useMemo(() => {
    return [
      {
        id: "instagram",
        title: "Visite nosso Instagram",
        subtitle: "Aponte a câmera para acessar nosso perfil",
        icon: Instagram,
        badge: "Instagram",
        qrUrl: sysConfig.instagramUrl
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sysConfig.instagramUrl)}`
          : qrInstagramFallback,
        bgImage: sysConfig.instagramBg || bgInstagramDefault,
      },
      {
        id: "wifi",
        title: "Conecte-se ao Wi‑Fi grátis",
        subtitle: "Escaneie para acessar a rede da casa",
        icon: Wifi,
        badge: "Wi‑Fi",
        qrUrl: sysConfig.senhaWifi
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`WIFI:T:WPA;S:${RESTAURANTE.nome};P:${sysConfig.senhaWifi};;`)}`
          : qrWifiFallback,
        bgImage: sysConfig.wifiBg || bgWifiDefault,
      },
    ];
  }, []);

  const validatePendingCart = useCallback(() => {
    const possuiItemInvalido = carrinho.some((item) => item.quantidade <= 0);

    if (!possuiItemInvalido) return true;

    toast.error("Revise o fluxo guiado antes de enviar", { duration: 1400 });
    setCartOpen(true);
    return false;
  }, [carrinho]);

  const handleConfirmar = useCallback(async () => {
    if (carrinho.length === 0 || orderSubmissionLockRef.current) return false;
    if (!isExternalOrder && !validatePendingCart()) return false;

    orderSubmissionLockRef.current = true;

    if (orderSubmissionCooldownRef.current) {
      window.clearTimeout(orderSubmissionCooldownRef.current);
    }

    try {
      if (isExternalOrder && onPedidoConfirmado) {
        onPedidoConfirmado([...carrinho], paraViagem);
        setLocalCarrinho([]);
        return true;
      }

      const operador = modo === "garcom" ? currentGarcom : modo === "caixa" ? currentCaixa : undefined;
      await confirmarPedido(mesaId, {
        modo: modo as "cliente" | "garcom" | "caixa" | "totem",
        operador,
        paraViagem,
      });
      return true;
    } finally {
      orderSubmissionCooldownRef.current = window.setTimeout(() => {
        orderSubmissionLockRef.current = false;
        orderSubmissionCooldownRef.current = null;
      }, ORDER_SUBMIT_LOCK_MS);
    }
  }, [carrinho, confirmarPedido, currentCaixa, currentGarcom, isExternalOrder, mesaId, modo, onPedidoConfirmado, paraViagem, validatePendingCart]);

  const handleSuccessAcknowledge = useCallback(() => {
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
    setCategoryFadeKey((k) => k + 1);
    setBannerIndex(0);
    setIsClientIdle(false);

    requestAnimationFrame(() => {
      mobileListTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      desktopMainRef.current?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);

  if (!mesa && !isExternalOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-card w-full max-w-md space-y-2 p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Mesa não encontrada</h1>
          <p className="text-muted-foreground">Não foi possível localizar a mesa informada.</p>
          {modo !== "cliente" ? (
            <Button onClick={navigateBack} className="rounded-xl">
              Ir para mesas
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const restaurantIdentity = modo === "delivery" ? (
    <Avatar className={`h-8 w-8 shrink-0 ${logoRadiusSm} border border-border bg-secondary shadow-sm select-none touch-none`}
      onPointerDown={handleLogoPointerDown}
      onPointerUp={handleLogoPointerUp}
      onPointerLeave={handleLogoPointerUp}
    >
      {RESTAURANTE.logoUrl ? (
        <img src={RESTAURANTE.logoUrl} alt={RESTAURANTE.nome} className={`h-full w-full ${logoRadiusSm} object-cover`} />
      ) : (
        <AvatarFallback className={`${logoRadiusSm} bg-secondary text-[10px] font-extrabold tracking-widest text-foreground`}>
          {RESTAURANTE.logoFallback}
        </AvatarFallback>
      )}
    </Avatar>
  ) : modo === "garcom" ? (
    <div className="min-w-0">
      <p className="truncate text-xl font-black tracking-tight text-foreground">{mesaLabel}</p>
    </div>
  ) : cardapioHeaderEstilo === "banner" && cardapioBannerBase64 && (modo === "cliente" || modo === "totem") ? (
    null // banner mode — identity is rendered in custom banner header below
  ) : RESTAURANTE.logoUrl && logoEstilo === "quadrada" ? (
    <>
      <div className="w-[11rem] lg:w-[13rem] shrink-0 absolute left-0 top-0 bottom-0 overflow-hidden z-10">
        <img
          src={RESTAURANTE.logoUrl}
          alt={RESTAURANTE.nome}
          className="block w-full h-full object-cover select-none touch-none"
          onPointerDown={handleLogoPointerDown}
          onPointerUp={handleLogoPointerUp}
          onPointerLeave={handleLogoPointerUp}
          onContextMenu={(e) => modo === "cliente" && e.preventDefault()}
          draggable={false}
        />
      </div>
      <div className="w-[11rem] lg:w-[13rem] shrink-0" />
      <div className="flex-1" />
      {mesaLabel && (
        <p className="text-sm font-bold text-foreground">{mesaLabel}</p>
      )}
    </>
  ) : (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        className={`h-10 w-10 ${logoRadius} border border-border bg-secondary shadow-sm select-none touch-none`}
        onPointerDown={handleLogoPointerDown}
        onPointerUp={handleLogoPointerUp}
        onPointerLeave={handleLogoPointerUp}
        onContextMenu={(e) => modo === "cliente" && e.preventDefault()}
      >
        {RESTAURANTE.logoUrl ? (
          <img src={RESTAURANTE.logoUrl} alt={RESTAURANTE.nome} className={`h-full w-full ${logoRadius} object-cover`} />
        ) : (
          <AvatarFallback className={`${logoRadius} bg-secondary text-xs font-extrabold tracking-[0.18em] text-foreground`}>
            {RESTAURANTE.logoFallback}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-base font-extrabold tracking-tight text-foreground md:text-lg">{RESTAURANTE.nome}</p>
        <p className="truncate text-xs font-medium text-muted-foreground md:text-sm">{mesaLabel}</p>
      </div>
    </div>
  );

  const useBannerHeader = cardapioHeaderEstilo === "banner" && cardapioBannerBase64 && (modo === "cliente" || modo === "totem");

  const bannerHeader = useBannerHeader ? (
    <div className="sticky top-0 z-50">
      <div style={{ backgroundImage: `url(${cardapioBannerBase64})`, backgroundSize: "cover", backgroundPosition: "center", height: "90px", position: "relative" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to bottom, transparent, hsl(var(--background)))" }} />
        {RESTAURANTE.logoUrl && (
          <img src={RESTAURANTE.logoUrl} alt={RESTAURANTE.nome} className="absolute left-3 top-3 h-10 w-10 rounded-xl object-contain bg-black/40 p-1" />
        )}
        {mesaLabel && (
          <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-3 py-1 text-sm font-bold text-white">
            {mesaLabel}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const header = (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between gap-3 border-b relative ${
        isTotem ? "border-gray-200 bg-white" : "border-border bg-background/95 backdrop-blur-md"
      } ${
        isGarcomMobile ? "px-4 py-4" : "px-4 py-3 md:px-6"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {modo !== "cliente" && modo !== "delivery" && modo !== "totem" && (
          <button
            type="button"
            onClick={handleBack}
            className={`shrink-0 text-muted-foreground transition-transform active:scale-95 ${
              isGarcomMobile ? "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card" : ""
            }`}
            aria-label="Voltar para mesas"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden text-sm font-medium xl:inline">Mesas</span>
            </div>
          </button>
        )}
        {restaurantIdentity}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {(modo === "delivery" || modo === "cliente" || modo === "totem") && (
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${isTotem ? "text-gray-400" : "text-muted-foreground"}`} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`h-9 w-36 rounded-xl border pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:w-48 transition-all ${
                isTotem
                  ? "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:ring-[#FF6B00]"
                  : "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:ring-primary"
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isTotem ? "text-gray-400 hover:text-gray-700" : "text-muted-foreground hover:text-foreground"}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {isGarcomMobile && modo !== "delivery" ? (
          <Button
            type="button"
            onClick={() => handleCartOpenChange(true)}
            className="relative h-12 rounded-full bg-primary px-5 text-base font-black text-primary-foreground shadow-[0_20px_38px_-22px_hsl(var(--primary)/0.95)] hover:bg-primary/90"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Ver carrinho
            {cartItemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full border border-primary bg-primary text-sm font-black text-primary-foreground">
                {cartItemCount}
              </span>
            ) : null}
          </Button>
        ) : modo === "delivery" ? (
          <button
            type="button"
            onClick={() => handleCartOpenChange(true)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary border-2 border-background text-[11px] font-black text-primary-foreground">
                {cartItemCount}
              </span>
            )}
          </button>
        ) : (
          <>
            {modo !== "cliente" ? (
              <div className="hidden items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground md:flex">
                {nomeAtendimento}
              </div>
            ) : null}
            {!isExternalOrder && (
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => setContaOpen(true)}
                className="h-auto gap-2 rounded-xl px-4 py-2.5 text-sm font-bold md:text-base"
                aria-label="Abrir minha conta"
              >
                <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                <span>Minha Conta</span>
              </Button>
            )}
          </>
        )}
        <PedidoFlowCart
          carrinho={carrinho}
          onUpdateQty={(uid, delta) => {
            if (isExternalOrder) {
              setLocalCarrinho(prev => prev.map(item =>
                item.uid === uid ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item
              ));
            } else {
              updateCartItemQty(mesaId, uid, delta);
            }
          }}
          onRemoveItem={(uid) => {
            if (isExternalOrder) {
              setLocalCarrinho(prev => prev.filter(item => item.uid !== uid));
            } else {
              removeFromCart(mesaId, uid);
            }
          }}
          onConfirmar={handleConfirmar}
          onContinueOrdering={() => handleCartOpenChange(false)}
          onSuccessAcknowledge={handleSuccessAcknowledge}
          open={cartOpen}
          onOpenChange={handleCartOpenChange}
          hideTrigger={isGarcomMobile}
          modo={modo}
          isTotemMode={isTotem}
          showStickyBar={(isGarcomMobile || isTotem)}
          onStickyBarClick={() => handleCartOpenChange(true)}
        />
        {modo === "cliente" && (
          <Button
            onClick={handleChamarGarcom}
            className={`h-auto gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-all duration-300 ${
              mesa?.chamarGarcom
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
          >
            <Bell className={`h-5 w-5 ${mesa?.chamarGarcom ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">
              {mesa?.chamarGarcom ? "Garçom a caminho ✕" : "Chamar Garçom"}
            </span>
          </Button>
        )}
      </div>
    </header>
  );

  const heroBanner = (
    <section className="px-4 pt-4 md:px-6">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-border bg-card shadow-[0_30px_70px_-45px_hsl(var(--foreground)/0.9)]">
        <div className="relative min-h-[260px] w-full md:min-h-[340px]">
          {activeBannerSlides.map((slide, index) => (
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
                  {slide.label && (
                    <span className="inline-flex rounded-full border border-border bg-background/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/80 backdrop-blur-md md:text-xs">
                      {slide.label}
                    </span>
                  )}
                  <div className="space-y-2">
                    <h2 className="max-w-lg text-3xl font-black tracking-tight text-foreground md:text-5xl md:leading-[0.95]">
                      {slide.title}
                    </h2>
                    {slide.description && (
                      <p className="max-w-md text-sm text-muted-foreground md:text-base">{slide.description}</p>
                    )}
                  </div>
                  {slide.price && (
                    <p className="text-3xl font-black tracking-tight text-primary drop-shadow-[0_10px_22px_hsl(var(--primary)/0.28)] md:text-5xl">
                      {slide.price}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full bg-background/35 px-3 py-2 backdrop-blur-md">
            {activeBannerSlides.map((slide, index) => (
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



  const categoryFadeClass = "";

  const visibleProducts = isGarcomMobile && categoriaExibida === HOME_TAB_ID ? produtos : produtosFiltrados;

  const productGrid = (
    <PedidoFlowCatalog
      produtos={visibleProducts}
      searchQuery={searchQuery}
      searchResultCount={produtosFiltrados.length}
      categoryFadeKey={categoryFadeKey}
      selectedProductCardId={selectedProductCardId}
      onSelectProduto={handleOpenProductModal}
      isTotem={isTotem}
      isGarcomMobile={isGarcomMobile}
    />
  );

  const homeContent = (
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
                  onClick={() => handleOpenProductModal(produto)}
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
                onClick={() => handleOpenProductModal(produto)}
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

  const skeletonGrid = (
    <div className={`${isGarcomMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3"}`}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="surface-card overflow-hidden rounded-[1.5rem]">
          <div className={`${isGarcomMobile ? "aspect-[0.98]" : "aspect-[4/3]"} animate-pulse bg-muted/70`} />
          <div className="space-y-2 p-4">
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
      <div className={`sticky ${isTotem ? "top-[57px] z-40 border-b border-gray-200 bg-white pt-2" : "top-[57px] z-40 border-b border-border bg-background/95 pt-2 backdrop-blur-md"}`}>
        <CategoryTabs
          categorias={navigationItems}
          categoriaAtiva={categoriaAtiva}
          onSelect={handleSelectCategoria}
          paddingClassName={isGarcomMobile ? "px-4 pb-3" : "px-4 pb-2"}
          totemMode={isTotem}
        />
      </div>
      <div ref={mobileListTopRef} />
      <main className={`pt-3 px-4 ${isGarcomMobile && carrinho.length > 0 ? "pb-32" : "pb-24"} ${isClientIdle ? "brightness-[0.2] saturate-50" : "brightness-100 saturate-100"} ${isTotem ? "bg-white" : ""}`}>
        <div>{isGarcomMobile && !isTotem ? productGrid : isHomeActive && !isTotem ? homeContent : productGrid}</div>
      </main>
    </>
  );

  const desktopContent = (
    <div className={`flex flex-1 items-stretch transition-all duration-500 ${isClientIdle ? "brightness-[0.2] saturate-50" : "brightness-100 saturate-100"}`}>
      <aside className={`w-[11rem] shrink-0 overflow-y-auto border-r border-border bg-card/95 px-3 py-4 lg:w-[13rem] sticky top-[73px] max-h-[calc(100vh-73px)] scrollbar-hide flex flex-col ${[HOME_TAB, ...allCategorias].length <= 8 ? "justify-center" : "justify-start"}`} style={{ scrollbarWidth: "none" }}>
        <nav className="flex flex-col gap-2">
          {[HOME_TAB, ...allCategorias].map((cat) => {
            const selected = categoriaAtiva === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategoria(cat.id)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                  selected
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary/15 text-primary" : "bg-secondary/60 text-muted-foreground"}`}>
                  <CategoryIcon name={cat.icone} className="h-3.5 w-3.5" />
                </div>
                <span className="truncate">{cat.nome}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main ref={desktopMainRef} className="flex-1 overflow-y-auto pb-8 pt-4">
        {isHomeActive ? homeContent : <div className="px-4 max-w-4xl">{productGrid}</div>}
      </main>
    </div>
  );

  const garcomBanner = null;

  return (
    <>
      <div className={`flex flex-col ${isTotem ? "bg-white max-w-[480px] mx-auto" : "bg-background"}`} style={{ minHeight: '100dvh' }}>
        {useBannerHeader ? bannerHeader : header}
        {garcomBanner}
        {(isMobile || modo === "garcom" || modo === "delivery" || isTotem) ? mobileContent : desktopContent}
        <ProductModal produto={produtoSelecionado} onClose={handleCloseProductModal} onAdd={handleAddToCart} isGarcomMobile={isGarcomMobile} skipEmbalagemDefault={modo === "delivery"} />
        {mesa && <MinhaContaDrawer pedidos={mesa.pedidos} total={mesa.total} open={contaOpen} onOpenChange={setContaOpen} />}
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
              onClick={navigateBack}
              className="rounded-xl bg-secondary font-bold text-foreground hover:bg-secondary/80"
            >
              Ir para mesas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden admin modal — only for client mode */}
      {modo === "cliente" && (
        <Dialog open={adminModalOpen} onOpenChange={(open) => {
          if (!open) {
            setAdminModalOpen(false);
            setAdminAuthenticated(false);
            setAdminEmail("");
            setAdminPassword("");
            setAdminError(null);
            setShowMesaSelector(false);
          }
        }}>
          <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5" />
                {adminAuthenticated ? "Gerenciar tablet" : "Acesso de funcionário"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {adminAuthenticated
                  ? "Escolha a ação desejada para este terminal."
                  : "Insira suas credenciais para continuar."}
              </DialogDescription>
            </DialogHeader>

            {!adminAuthenticated ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Email</label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="funcionario@empresa.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Senha</label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdminLogin();
                      }
                    }}
                  />
                </div>
                {adminError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{adminError}</p>}
                <Button onClick={handleAdminLogin} disabled={isAdminLoggingIn} className="h-11 w-full rounded-xl font-black">
                  <LockKeyhole className="h-4 w-4" />
                  {isAdminLoggingIn ? "Autenticando..." : "Entrar"}
                </Button>
              </div>
            ) : showMesaSelector ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione a nova mesa para este tablet:</p>
                <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
                  {mesasOrdenadas.map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      variant={m.id === mesaId ? "secondary" : "outline"}
                      disabled={m.id === mesaId}
                      onClick={() => handleAdminSelectNewMesa(m.id)}
                      className="flex h-auto flex-col gap-1 rounded-xl py-3"
                    >
                      <span className="text-lg font-black">{String(m.numero).padStart(2, "0")}</span>
                      <span className="text-[10px] text-muted-foreground">{m.status}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button onClick={handleAdminTrocarMesa} variant="outline" className="h-14 justify-start gap-4 rounded-2xl px-5 font-bold">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-black text-foreground">Trocar mesa</p>
                    <p className="text-xs font-normal text-muted-foreground">Vincular este tablet a outra mesa</p>
                  </div>
                </Button>
                <Button onClick={handleAdminDesvincular} variant="outline" className="h-14 justify-start gap-4 rounded-2xl px-5 font-bold">
                  <Unlink className="h-5 w-5 text-destructive" />
                  <div className="text-left">
                    <p className="text-sm font-black text-foreground">Desvincular tablet</p>
                    <p className="text-xs font-normal text-muted-foreground">Voltar à tela de login do funcionário</p>
                  </div>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PedidoFlow;