import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredDeviceId } from "@/lib/deviceAuth";
import DeviceGate from "@/components/DeviceGate";
import ModuleGate from "@/components/ModuleGate";
import TvPainelRetirada from "@/components/tv/TvPainelRetirada";

const TvInner = ({ storeId }: { storeId: string }) => {
  const navigate = useNavigate();
  const { pedidosBalcao, mesas } = useRestaurant();
  const [clock, setClock] = useState(() => new Date());
  const [modulos, setModulos] = useState<{ mesas: boolean; balcao: boolean; totem: boolean; garcomPdv: boolean }>({
    mesas: true, balcao: false, totem: false, garcomPdv: false,
  });
  const [config, setConfig] = useState<{ nomeRestaurante: string; logoBase64: string; logoUrl: string; identificacaoFastFood: string }>({
    nomeRestaurante: "", logoBase64: "", logoUrl: "", identificacaoFastFood: "codigo",
  });

  // Hidden exit: long-press 5s on logo
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleExitStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      clearStoredDeviceId();
      sessionStorage.removeItem("orderly-device-store-id");
      localStorage.removeItem("orderly-device-store-id");
      sessionStorage.removeItem("obsidian-op-session-v2");
      localStorage.removeItem("obsidian-op-session-v2-persisted");
      navigate("/", { replace: true });
      window.location.reload();
    }, 5000);
  }, [navigate]);
  const handleExitEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  useEffect(() => {
    supabase
      .from("restaurant_config")
      .select("nome_restaurante, logo_base64, logo_url, modo_operacao, modulos, identificacao_fast_food")
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({
            nomeRestaurante: data.nome_restaurante,
            logoBase64: data.logo_base64 ?? "",
            logoUrl: data.logo_url ?? "",
            identificacaoFastFood: data.identificacao_fast_food ?? "codigo",
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
    return list;
  }, [modulos]);

  type PedidoTV = {
    id: string; numero: number; nome: string; origem: string; timestamp: string;
  };

  const pedidosPreparando = useMemo(() => {
    const list: PedidoTV[] = [];
    for (const p of pedidosBalcao) {
      if (origensTV.includes(p.origem) && (p.statusBalcao === "aberto" || p.statusBalcao === "preparando")) {
        list.push({ id: p.id, numero: p.numeroPedido, nome: p.origem === "totem" ? "Totem" : (p.clienteNome || "Balcão"), origem: p.origem, timestamp: p.criadoEmIso });
      }
    }
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

  // Audio alert when new pronto
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevProntosCountRef = useRef(pedidosProntos.length);

  useEffect(() => {
    if (pedidosProntos.length > prevProntosCountRef.current) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const playBeep = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.3;
        osc.start(startTime); osc.stop(startTime + 0.15);
      };
      const now = ctx.currentTime;
      playBeep(now); playBeep(now + 0.35);
    }
    prevProntosCountRef.current = pedidosProntos.length;
  }, [pedidosProntos.length]);

  const logoUrl = config.logoBase64 || config.logoUrl || "";
  const usaNome = config.identificacaoFastFood === "nome";

  if (!modulos.totem && !modulos.balcao && !modulos.garcomPdv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#111" }}>
        {logoUrl && <img src={logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover mb-6" />}
        <h1 className="text-4xl font-black text-white">{config.nomeRestaurante || "Restaurante"}</h1>
        <p className="text-xl font-medium mt-4 text-white/60">TV em standby</p>
        <p className="text-base mt-2 text-white/40">Ative o módulo Totem ou Balcão para exibir o painel</p>
        <p className="text-3xl font-black tabular-nums mt-8 text-white">{clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    );
  }

  return (
    <TvPainelRetirada
      pedidosPreparando={pedidosPreparando}
      pedidosProntos={pedidosProntos}
      nomeRestaurante={config.nomeRestaurante}
      logoUrl={logoUrl}
      clock={clock}
      usaNome={usaNome}
      handleExitStart={handleExitStart}
      handleExitEnd={handleExitEnd}
    />
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
