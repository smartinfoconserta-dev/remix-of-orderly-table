import { useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import DeviceGate from "@/components/DeviceGate";
import { Bell } from "lucide-react";

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
    return list;
  }, [modulos]);

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
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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

  // Audio alert
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevProntosCountRef = useRef(pedidosProntos.length);

  useEffect(() => {
    if (pedidosProntos.length > prevProntosCountRef.current) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
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
  const latestPronto = pedidosProntos.length > 0 ? pedidosProntos[0] : null;
  const fmt = (n: number) => String(n).padStart(3, "0");

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
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-stretch">
        {/* Left: Logo + title */}
        <div className="flex-1 flex items-center gap-4 px-6 py-4 bg-primary">
          <Bell className="h-8 w-8 text-primary-foreground" />
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide text-primary-foreground">
              Retire seu pedido
            </h1>
          </div>
        </div>

        {/* Right: Chamando senha */}
        <div className="flex flex-col items-center justify-center px-8 py-3 bg-card min-w-[280px] border-l-4 border-primary">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chamando senha:</span>
          {latestPronto ? (
            <span className="text-6xl xl:text-7xl font-black tabular-nums text-primary animate-pulse leading-none mt-1">
              {fmt(latestPronto.numero)}
            </span>
          ) : (
            <span className="text-3xl font-bold text-muted-foreground/40 mt-1">---</span>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex min-h-0">
        {/* Left column: Senhas Chamadas (Prontos) */}
        <div className="flex-1 flex flex-col bg-primary/10">
          <div className="px-5 py-3 bg-primary/20">
            <h2 className="text-base font-black uppercase tracking-widest text-center text-foreground">
              Senhas Chamadas
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {pedidosProntos.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-lg font-medium text-muted-foreground/40">Nenhuma senha chamada</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {pedidosProntos.map((p, i) => {
                  const isLatest = latestPronto?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`w-full max-w-[280px] text-center rounded-lg transition-all ${
                        isLatest
                          ? "py-4 bg-primary text-primary-foreground border-2 border-primary shadow-lg"
                          : i < 3
                            ? "py-3 bg-card border border-border"
                            : "py-2 bg-card/60 border border-border/50"
                      }`}
                    >
                      <span className={`font-black tabular-nums ${
                        isLatest ? "text-5xl xl:text-6xl" : i < 3 ? "text-3xl xl:text-4xl" : "text-2xl"
                      }`}>
                        {fmt(p.numero)}
                      </span>
                      {p.nome && p.nome !== "Totem" && p.nome !== "Balcão" && (
                        <p className={`text-xs font-medium mt-0.5 ${isLatest ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {p.nome}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Próximas Senhas (Preparando) */}
        <div className="flex-1 flex flex-col bg-accent/10">
          <div className="px-5 py-3 bg-accent/20">
            <h2 className="text-base font-black uppercase tracking-widest text-center text-foreground">
              Próximas Senhas
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {pedidosPreparando.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-lg font-medium text-muted-foreground/40">Nenhum pedido</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 auto-rows-min">
                {pedidosPreparando.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col items-center justify-center py-4 rounded-lg bg-card border border-border"
                  >
                    <span className="text-3xl xl:text-4xl font-black tabular-nums text-foreground">
                      {fmt(p.numero)}
                    </span>
                    {p.nome && p.nome !== "Totem" && p.nome !== "Balcão" && (
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{p.nome}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="px-6 py-3 bg-primary flex items-center justify-between">
        <p className="text-sm font-bold text-primary-foreground uppercase tracking-wide">
          Por favor aguarde sua senha no painel!
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-primary-foreground/70">{config.nomeRestaurante}</span>
          <span className="text-sm font-black tabular-nums text-primary-foreground">
            {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
};

const TvPage = () => (
  <DeviceGate type="tv">
    {({ storeId }) => <TvInner storeId={storeId} />}
  </DeviceGate>
);

export default TvPage;
