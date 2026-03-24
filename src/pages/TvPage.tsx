import { useEffect, useMemo, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { getSistemaConfig } from "@/lib/adminStorage";

const TvPage = () => {
  const { mesas, pedidosBalcao } = useRestaurant();
  const config = getSistemaConfig();
  const [clock, setClock] = useState(() => new Date());

  // Update clock every 30s
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const pedidosProntos = useMemo(() => {
    const prontos: { id: string; numero: number; nome: string; timestamp: string }[] = [];

    for (const mesa of mesas) {
      for (const p of mesa.pedidos) {
        if (p.pronto) {
          prontos.push({
            id: p.id,
            numero: p.numeroPedido,
            nome: p.clienteNome || `Mesa ${mesa.numero}`,
            timestamp: p.criadoEmIso,
          });
        }
      }
    }

    for (const p of pedidosBalcao) {
      if (p.pronto || p.statusBalcao === "pronto") {
        prontos.push({
          id: p.id,
          numero: p.numeroPedido,
          nome: p.clienteNome || (p.origem === "delivery" ? "Delivery" : p.origem === "totem" ? "Totem" : "Balcão"),
          timestamp: p.criadoEmIso,
        });
      }
    }

    prontos.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return prontos;
  }, [mesas, pedidosBalcao]);

  const latest = pedidosProntos[pedidosProntos.length - 1] ?? null;
  const others = pedidosProntos.slice(0, -1);
  const logoUrl = config.logoBase64 || config.logoUrl || "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      {/* Header */}
      <div className="px-10 py-8 flex items-center justify-between" style={{ borderBottom: "3px solid #FF6B00" }}>
        <div className="flex items-center gap-5">
          {logoUrl && (
            <img src={logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
          )}
          <div>
            <h1 className="text-5xl font-black uppercase tracking-wider" style={{ color: "#FF6B00" }}>
              Pedidos Prontos
            </h1>
            <p className="text-xl font-bold mt-1" style={{ color: "#1A1A1A", opacity: 0.5 }}>
              {config.nomeRestaurante || "Restaurante"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black tabular-nums" style={{ color: "#FF6B00" }}>
            {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-10">
        {pedidosProntos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl mb-4">🍔</p>
              <p className="text-4xl font-black" style={{ color: "#E0E0E0" }}>
                Nenhum pedido pronto
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: "#E0E0E0" }}>
                no momento
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Grid of ready orders */}
            {others.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 mb-10">
                {others.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl px-6 py-6 text-center"
                    style={{ background: "#FFF5EC", border: "2px solid #FFD4AD" }}
                  >
                    <p className="text-5xl font-black tabular-nums" style={{ color: "#FF6B00" }}>
                      #{String(p.numero).padStart(3, "0")}
                    </p>
                    <p className="text-lg font-bold mt-2 truncate" style={{ color: "#1A1A1A" }}>
                      {p.nome}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Latest order — big highlight */}
            {latest && (
              <div className="mt-auto">
                <div
                  className="rounded-3xl px-12 py-10 text-center tv-pulse shadow-2xl"
                  style={{ background: "#FF6B00" }}
                >
                  <p className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-3" style={{ opacity: 0.8 }}>
                    Último pedido pronto
                  </p>
                  <p className="text-[140px] leading-none font-black text-white tabular-nums">
                    #{String(latest.numero).padStart(3, "0")}
                  </p>
                  <p className="text-3xl font-bold text-white mt-4" style={{ opacity: 0.9 }}>
                    {latest.nome}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes tv-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,0,0.4); }
          50% { transform: scale(1.01); box-shadow: 0 0 40px 10px rgba(255,107,0,0.2); }
        }
        .tv-pulse {
          animation: tv-pulse 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TvPage;
