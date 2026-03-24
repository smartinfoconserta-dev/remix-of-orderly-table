import { useMemo } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { getSistemaConfig } from "@/lib/adminStorage";

const TvPage = () => {
  const { mesas, pedidosBalcao } = useRestaurant();
  const config = getSistemaConfig();

  const pedidosProntos = useMemo(() => {
    const prontos: { id: string; numero: number; nome: string; timestamp: string }[] = [];

    // Pedidos de mesa (cliente, garçom, caixa, totem)
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

    // Pedidos balcão / delivery / totem avulso
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

    // Sort by timestamp ascending — latest last
    prontos.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return prontos;
  }, [mesas, pedidosBalcao]);

  const latest = pedidosProntos[pedidosProntos.length - 1] ?? null;
  const others = pedidosProntos.slice(0, -1);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between border-b-2 border-orange-200">
        <div>
          <h1 className="text-4xl font-black text-orange-500 tracking-wider uppercase">
            Pedidos Prontos
          </h1>
          <p className="text-lg text-orange-400/70 font-bold mt-1">
            {config.nomeRestaurante || "Restaurante"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-orange-400 tabular-nums" suppressHydrationWarning>
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-8">
        {pedidosProntos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-3xl font-bold text-gray-300">
              Nenhum pedido pronto no momento
            </p>
          </div>
        ) : (
          <>
            {/* List of ready orders */}
            {others.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {others.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-6 py-4 text-center"
                  >
                    <p className="text-4xl font-black text-orange-600 tabular-nums">
                      #{String(p.numero).padStart(3, "0")}
                    </p>
                    <p className="text-sm font-bold text-orange-400 mt-1 truncate">
                      {p.nome}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Latest order — highlighted */}
            {latest && (
              <div className="mt-auto">
                <div className="rounded-3xl bg-orange-500 px-10 py-8 text-center animate-pulse-slow shadow-lg">
                  <p className="text-lg font-bold text-orange-100 uppercase tracking-widest mb-2">
                    Último pedido pronto
                  </p>
                  <p className="text-8xl font-black text-white tabular-nums">
                    #{String(latest.numero).padStart(3, "0")}
                  </p>
                  <p className="text-2xl font-bold text-orange-100 mt-3">
                    {latest.nome}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TvPage;
