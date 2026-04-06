import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredDeviceId } from "@/lib/deviceAuth";
import DeviceGate from "@/components/DeviceGate";
import ModuleGate from "@/components/ModuleGate";

type PedidoTV = {
  id: string;
  numero: number;
  nome: string;
  origem: string;
  timestamp: string;
};

const TvInner = ({ storeId }: { storeId: string }) => {
  const navigate = useNavigate();
  const { pedidosBalcao, mesas } = useRestaurant();
  const [clock, setClock] = useState(() => new Date());
  const [modulos, setModulos] = useState<{ mesas: boolean; balcao: boolean; totem: boolean; garcomPdv: boolean }>({
    mesas: true, balcao: false, totem: false, garcomPdv: false,
  });
  const [config, setConfig] = useState<{ nomeRestaurante: string; logoBase64: string; logoUrl: string }>({
    nomeRestaurante: "",
    logoBase64: "",
    logoUrl: "",
  });

  // Hidden exit: long-press 5s on title
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleExitStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      clearStoredDeviceId();
      sessionStorage.removeItem("orderly-device-store-id");
      localStorage.removeItem("orderly-device-store-id");
      navigate("/", { replace: true });
    }, 5000);
  }, [navigate]);
  const handleExitEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  useEffect(() => {
    supabase
      .from("restaurant_config")
      .select("nome_restaurante, logo_base64, logo_url, modo_operacao, modulos")
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({
            nomeRestaurante: data.nome_restaurante,
            logoBase64: data.logo_base64 ?? "",
            logoUrl: data.logo_url ?? "",
          });
          const m = (data.modulos as any) ?? {};
          const hasMesas = m.mesas !== undefined ? m.mesas : (data.modo_operacao !== "fast_food");
          const hasBalcao = m.balcao !== undefined ? m.balcao : (data.modo_operacao === "fast_food");
          const hasTotem = m.totem === true;
          const hasGarcomPdv = m.garcomPdv === true;
          setModulos({ mesas: hasMesas, balcao: hasBalcao, totem: hasTotem, garcomPdv: hasGarcomPdv });
        }
      });
  }, [storeId]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const origensTV = useMemo(() => {
    const list: string[] = [];
    if (modulos.totem) list.push("totem");
    if (modulos.balcao) list.push("balcao");
    // garcom_pdv será adicionado no futuro
    return list;
  }, [modulos]);

  const pedidosPreparando = useMemo(() => {
    const list: PedidoTV[] = [];
    for (const p of pedidosBalcao) {
      if (origensTV.includes(p.origem) && (p.statusBalcao === "aberto" || p.statusBalcao === "preparando")) {
        list.push({ id: p.id, numero: p.numeroPedido, nome: p.origem === "totem" ? "Totem" : (p.clienteNome || "Balcão"), origem: p.origem, timestamp: p.criadoEmIso });
      }
    }
    // Garçom PDV: pedidos de mesa ainda não prontos
    if (modulos.garcomPdv) {
      for (const mesa of mesas) {
        for (const p of mesa.pedidos) {
          if (!p.pronto) {
            list.push({ id: p.id, numero: p.numeroPedido, nome: `Mesa ${mesa.numero}`, origem: "garcom_pdv", timestamp: p.criadoEmIso });
          }
        }
      }
    }
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return list;
  }, [pedidosBalcao, origensTV, modulos.garcomPdv, mesas]);

  const pedidosProntos = useMemo(() => {
    const list: PedidoTV[] = [];
    for (const p of pedidosBalcao) {
      if (origensTV.includes(p.origem) && (p.statusBalcao === "pronto" || p.statusBalcao === "devolvido")) {
        list.push({ id: p.id, numero: p.numeroPedido, nome: p.origem === "totem" ? "Totem" : (p.clienteNome || "Balcão"), origem: p.origem, timestamp: p.criadoEmIso });
      }
    }
    // Garçom PDV: pedidos de mesa marcados como prontos
    if (modulos.garcomPdv) {
      for (const mesa of mesas) {
        for (const p of mesa.pedidos) {
          if (p.pronto) {
            list.push({ id: p.id, numero: p.numeroPedido, nome: `Mesa ${mesa.numero}`, origem: "garcom_pdv", timestamp: p.criadoEmIso });
          }
        }
      }
    }
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return list;
  }, [pedidosBalcao, origensTV, modulos.garcomPdv, mesas]);

  // Audio alert when a new pedido becomes "pronto"
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevProntosCountRef = useRef(pedidosProntos.length);

  useEffect(() => {
    if (pedidosProntos.length > prevProntosCountRef.current) {
      // Play two short beeps at 880Hz
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const playBeep = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      };
      const now = ctx.currentTime;
      playBeep(now);
      playBeep(now + 0.35);
    }
    prevProntosCountRef.current = pedidosProntos.length;
  }, [pedidosProntos.length]);

  const logoUrl = config.logoBase64 || config.logoUrl || "";

  // The most recent "pronto" order (last added) should be highlighted
  const latestPronto = pedidosProntos.length > 0 ? pedidosProntos[0] : null;

  const OrderRow = ({ p, isLatest }: { p: PedidoTV; isLatest?: boolean }) => {
    const showName = p.nome && p.nome !== "Totem" && p.nome !== "Balcão";
    return (
      <div className={`flex items-center gap-4 rounded-xl px-5 transition-all ${
        isLatest
          ? "py-6 bg-primary/10 border-2 border-primary"
          : "py-4 bg-card border border-border"
      }`}>
        <span className={`font-black tabular-nums ${isLatest ? "text-4xl xl:text-5xl" : "text-2xl xl:text-3xl"} text-foreground`}>
          #{String(p.numero).padStart(3, "0")}
        </span>
        {showName && (
          <span className={`font-semibold truncate text-muted-foreground ${isLatest ? "text-lg" : "text-sm"}`}>{p.nome}</span>
        )}
        {isLatest && (
          <span className="ml-auto text-xs font-bold uppercase tracking-wider text-primary animate-pulse">Novo</span>
        )}
      </div>
    );
  };

  const EmptyCol = ({ text }: { text: string }) => (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-lg font-medium text-muted-foreground/50">{text}</p>
    </div>
  );

  if (!modulos.totem && !modulos.balcao && !modulos.garcomPdv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        {logoUrl && <img src={logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover mb-6" />}
        <h1 className="text-4xl font-black text-foreground">{config.nomeRestaurante || "Restaurante"}</h1>
        <p className="text-xl font-medium mt-4 text-muted-foreground">TV em standby</p>
        <p className="text-base mt-2 text-muted-foreground/60">Ative o módulo Totem ou Balcão para exibir o painel</p>
        <p className="text-3xl font-black tabular-nums mt-8 text-foreground">{clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          {logoUrl && <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
          <div>
            <h1
              className="text-2xl md:text-3xl font-black uppercase tracking-wide text-foreground select-none cursor-default"
              onMouseDown={handleExitStart}
              onMouseUp={handleExitEnd}
              onMouseLeave={handleExitEnd}
              onTouchStart={handleExitStart}
              onTouchEnd={handleExitEnd}
              onTouchCancel={handleExitEnd}
            >Painel de Pedidos</h1>
            <p className="text-sm font-medium text-muted-foreground">{config.nomeRestaurante || "Restaurante"}</p>
          </div>
        </div>
        <p className="text-2xl md:text-3xl font-black tabular-nums text-foreground">{clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>

      {/* Columns */}
      <div className="flex-1 flex min-h-0">
        {/* Preparando */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-5 py-3 flex items-center gap-3 border-b border-border bg-muted/30">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">Preparando</h2>
            {pedidosPreparando.length > 0 && (
              <span className="ml-auto text-sm font-bold text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{pedidosPreparando.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {pedidosPreparando.length === 0 ? <EmptyCol text="Nenhum pedido" /> : (
              <div className="flex flex-col gap-3">
                {pedidosPreparando.map((p) => <OrderRow key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>

        {/* Pronto */}
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 flex items-center gap-3 border-b border-border bg-muted/30">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">Pronto</h2>
            {pedidosProntos.length > 0 && (
              <span className="ml-auto text-sm font-bold text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{pedidosProntos.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {pedidosProntos.length === 0 ? <EmptyCol text="Nenhum pedido pronto" /> : (
              <div className="flex flex-col gap-3">
                {pedidosProntos.map((p) => (
                  <OrderRow key={p.id} p={p} isLatest={latestPronto?.id === p.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TvPage = () => (
  <ModuleGate moduleKey="tvRetirada" moduleName="TV de Retirada">
    <DeviceGate type="tv">
      {({ storeId }) => <TvInner storeId={storeId} />}
    </DeviceGate>
  </ModuleGate>
);

export default TvPage;
