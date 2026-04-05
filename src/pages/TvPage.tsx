import { useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import DeviceGate from "@/components/DeviceGate";

type PedidoTV = {
  id: string;
  numero: number;
  nome: string;
  origem: string;
  timestamp: string;
};

const TvInner = ({ storeId }: { storeId: string }) => {
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
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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

  const CardPedido = ({ p, variant }: { p: PedidoTV; variant: "preparando" | "pronto" }) => {
    const isPronto = variant === "pronto";
    const showName = p.nome && p.nome !== "Totem" && p.nome !== "Balcão";
    return (
      <div className={`rounded-2xl px-5 py-5 text-center transition-all ${isPronto ? "tv-pulse" : ""}`} style={{ background: isPronto ? "#FF6B00" : "#FFF8F0", border: isPronto ? "2px solid #FF6B00" : "2px solid #FFD4AD" }}>
        <p className="text-4xl xl:text-5xl font-black tabular-nums" style={{ color: isPronto ? "#FFFFFF" : "#FF6B00" }}>#{String(p.numero).padStart(3, "0")}</p>
        {showName && <p className="text-sm xl:text-base font-bold mt-2 truncate" style={{ color: isPronto ? "rgba(255,255,255,0.85)" : "#1A1A1A" }}>{p.nome}</p>}
      </div>
    );
  };

  const EmptyCol = ({ text }: { text: string }) => (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-2xl font-bold" style={{ color: "#D4D4D4" }}>{text}</p>
    </div>
  );

  if (!modulos.totem && !modulos.balcao && !modulos.garcomPdv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#FFFFFF" }}>
        {logoUrl && <img src={logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover mb-6" />}
        <h1 className="text-4xl font-black" style={{ color: "#FF6B00" }}>{config.nomeRestaurante || "Restaurante"}</h1>
        <p className="text-xl font-bold mt-4" style={{ color: "#999" }}>TV em standby</p>
        <p className="text-base mt-2" style={{ color: "#BBB" }}>Ative o módulo Totem ou Balcão para exibir o painel de retirada</p>
        <p className="text-3xl font-black tabular-nums mt-8" style={{ color: "#FF6B00" }}>{clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      <div className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: "3px solid #FF6B00" }}>
        <div className="flex items-center gap-4">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />}
          <div>
            <h1 className="text-4xl font-black uppercase tracking-wider" style={{ color: "#FF6B00" }}>Painel de Pedidos</h1>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#1A1A1A", opacity: 0.5 }}>{config.nomeRestaurante || "Restaurante"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums" style={{ color: "#FF6B00" }}>{clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col border-r-2" style={{ borderColor: "#F0F0F0" }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#FFFBF5", borderBottom: "2px solid #FFE8CC" }}>
            <span className="text-2xl">🔥</span>
            <h2 className="text-2xl font-black uppercase tracking-widest" style={{ color: "#D97706" }}>Preparando</h2>
            {pedidosPreparando.length > 0 && (
              <span className="ml-auto text-lg font-black rounded-full w-9 h-9 flex items-center justify-center" style={{ background: "#FEF3C7", color: "#D97706" }}>{pedidosPreparando.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {pedidosPreparando.length === 0 ? <EmptyCol text="Nenhum pedido" /> : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">{pedidosPreparando.map((p) => <CardPedido key={p.id} p={p} variant="preparando" />)}</div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#F0FFF4", borderBottom: "2px solid #BBF7D0" }}>
            <span className="text-2xl">✅</span>
            <h2 className="text-2xl font-black uppercase tracking-widest" style={{ color: "#16A34A" }}>Pronto</h2>
            {pedidosProntos.length > 0 && (
              <span className="ml-auto text-lg font-black rounded-full w-9 h-9 flex items-center justify-center" style={{ background: "#DCFCE7", color: "#16A34A" }}>{pedidosProntos.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {pedidosProntos.length === 0 ? <EmptyCol text="Nenhum pedido pronto" /> : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">{pedidosProntos.map((p) => <CardPedido key={p.id} p={p} variant="pronto" />)}</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tv-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,0,0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 30px 8px rgba(255,107,0,0.15); }
        }
        .tv-pulse { animation: tv-pulse 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

const TvPage = () => (
  <DeviceGate type="tv">
    {({ storeId }) => <TvInner storeId={storeId} />}
  </DeviceGate>
);

export default TvPage;
