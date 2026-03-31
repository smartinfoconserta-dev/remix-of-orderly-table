import { ArrowLeft, Bell, Search, ShoppingCart, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PedidoFlowHeaderProps {
  modo: string;
  isTotem: boolean;
  isGarcomMobile: boolean;
  isExternalOrder: boolean;
  mesaLabel: string;
  restaurante: { nome: string; logoUrl: string; logoFallback: string };
  logoEstilo: string;
  logoRadius: string;
  logoRadiusSm: string;
  cardapioHeaderEstilo: string;
  useBannerHeader: boolean;
  cardapioBannerBase64: string;
  nomeAtendimento: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onBack: () => void;
  onLogoPointerDown: () => void;
  onLogoPointerUp: () => void;
  onChamarGarcom?: () => void;
  onCartOpen: () => void;
  onContaOpen: () => void;
  chamarGarcomAtivo?: boolean;
  cartItemCount: number;
  cartElement: React.ReactNode;
}

export function buildPedidoFlowHeader(props: PedidoFlowHeaderProps) {
  const {
    modo,
    isTotem,
    isGarcomMobile,
    isExternalOrder,
    mesaLabel,
    restaurante: RESTAURANTE,
    logoEstilo,
    logoRadius,
    logoRadiusSm,
    cardapioHeaderEstilo,
    useBannerHeader,
    cardapioBannerBase64,
    nomeAtendimento,
    searchQuery,
    setSearchQuery,
    onBack,
    onLogoPointerDown,
    onLogoPointerUp,
    onChamarGarcom,
    onCartOpen,
    onContaOpen,
    chamarGarcomAtivo,
    cartItemCount,
    cartElement,
  } = props;

  const restaurantIdentity = modo === "delivery" ? (
    <Avatar className={`h-8 w-8 shrink-0 ${logoRadiusSm} border border-border bg-secondary shadow-sm select-none touch-none`}
      onPointerDown={onLogoPointerDown}
      onPointerUp={onLogoPointerUp}
      onPointerLeave={onLogoPointerUp}
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
    null
  ) : RESTAURANTE.logoUrl && logoEstilo === "quadrada" ? (
    <>
      <div className="w-[11rem] lg:w-[13rem] shrink-0 absolute left-0 top-0 bottom-0 overflow-hidden z-10">
        <img
          src={RESTAURANTE.logoUrl}
          alt={RESTAURANTE.nome}
          className="block w-full h-full object-cover select-none touch-none"
          onPointerDown={onLogoPointerDown}
          onPointerUp={onLogoPointerUp}
          onPointerLeave={onLogoPointerUp}
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
        onPointerDown={onLogoPointerDown}
        onPointerUp={onLogoPointerUp}
        onPointerLeave={onLogoPointerUp}
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

  const bannerHeader = useBannerHeader ? (
    <div className="sticky top-0 z-50">
      <div style={{ backgroundImage: `url(${cardapioBannerBase64})`, backgroundSize: "cover", backgroundPosition: "center", height: "90px", position: "relative" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to bottom, transparent, hsl(var(--background)))" }} />
        {RESTAURANTE.logoUrl && (
          <img src={RESTAURANTE.logoUrl} alt={RESTAURANTE.nome} className="absolute left-3 top-3 h-10 w-10 rounded-xl object-contain bg-foreground/40 p-1" />
        )}
        {mesaLabel && (
          <div className="absolute right-3 top-3 rounded-lg bg-foreground/50 px-3 py-1 text-sm font-bold text-background">
            {mesaLabel}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const header = (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between gap-3 border-b relative ${
        isTotem ? "border-border bg-background" : "border-border bg-background/95 backdrop-blur-md"
      } ${
        isGarcomMobile ? "px-4 py-4" : "px-4 py-3 md:px-6"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {modo !== "cliente" && modo !== "delivery" && modo !== "totem" && (
          <button
            type="button"
            onClick={onBack}
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
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${isTotem ? "text-muted-foreground" : "text-muted-foreground"}`} />
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
            onClick={onCartOpen}
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
            onClick={onCartOpen}
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
                onClick={onContaOpen}
                className="h-auto gap-2 rounded-xl px-4 py-2.5 text-sm font-bold md:text-base"
                aria-label="Abrir minha conta"
              >
                <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                <span>Minha Conta</span>
              </Button>
            )}
          </>
        )}
        {cartElement}
        {modo === "cliente" && onChamarGarcom && (
          <Button
            onClick={onChamarGarcom}
            className={`h-auto gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-all duration-300 ${
              chamarGarcomAtivo
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
          >
            <Bell className={`h-5 w-5 ${chamarGarcomAtivo ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">
              {chamarGarcomAtivo ? "Garçom a caminho ✕" : "Chamar Garçom"}
            </span>
          </Button>
        )}
      </div>
    </header>
  );

  return { header, bannerHeader };
}
