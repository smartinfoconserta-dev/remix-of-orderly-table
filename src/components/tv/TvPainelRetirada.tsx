/**
 * TvPainelRetirada — Estilo painel de lanchonete com cores vivas e números enormes.
 */
import { Bell } from "lucide-react";

type PedidoTV = {
  id: string; numero: number; nome: string; origem: string; timestamp: string;
};

interface Props {
  pedidosPreparando: PedidoTV[];
  pedidosProntos: PedidoTV[];
  nomeRestaurante: string;
  logoUrl: string;
  clock: Date;
  usaNome: boolean;
  handleExitStart: () => void;
  handleExitEnd: () => void;
}

const formatSenha = (n: number) => String(n).padStart(3, "0");

const TvPainelRetirada = ({
  pedidosPreparando, pedidosProntos,
  nomeRestaurante, logoUrl, clock, usaNome,
  handleExitStart, handleExitEnd,
}: Props) => {
  const latestPronto = pedidosProntos[0] ?? null;
  const restProntos = pedidosProntos.slice(1);

  const getLabel = (p: PedidoTV) => usaNome && p.nome && p.nome !== "Totem" && p.nome !== "Balcão" ? p.nome : formatSenha(p.numero);

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: "#111", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* ═══ TOP BAR — Verde escuro ═══ */}
      <div className="flex items-center justify-between px-6 py-3" style={{ background: "#0d5c2e" }}>
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl} alt=""
              className="h-10 w-10 rounded-lg object-cover cursor-default"
              onMouseDown={handleExitStart} onMouseUp={handleExitEnd} onMouseLeave={handleExitEnd}
              onTouchStart={handleExitStart} onTouchEnd={handleExitEnd} onTouchCancel={handleExitEnd}
            />
          )}
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-yellow-300" />
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
              Retire seu pedido
            </h1>
          </div>
        </div>

        {/* Card "CHAMANDO SENHA" */}
        {latestPronto && (
          <div className="rounded-xl px-5 py-2 flex items-center gap-4" style={{ background: "#1a1a1a", border: "2px solid #333" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Chamando {usaNome ? "" : "senha:"}</p>
            </div>
            <span
              className="font-black tabular-nums animate-pulse"
              style={{ fontSize: usaNome ? "28px" : "40px", color: "#fbbf24", lineHeight: 1 }}
            >
              {getLabel(latestPronto)}
            </span>
          </div>
        )}

        <p className="text-lg font-black tabular-nums text-white/70">
          {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* ═══ MAIN COLUMNS ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT — SENHAS CHAMADAS (Prontos) */}
        <div className="flex-1 flex flex-col" style={{ background: "#0d5c2e" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <h2 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" />
              Senhas chamadas
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {pedidosProntos.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-lg font-medium text-white/30">Nenhuma senha chamada</p>
              </div>
            ) : (
              <>
                {/* Latest — GRANDE */}
                {latestPronto && (
                  <div className="text-center py-4 mb-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Último chamado</p>
                    <span
                      className="font-black tabular-nums block animate-pulse"
                      style={{ fontSize: usaNome ? "4rem" : "6rem", color: "#fbbf24", lineHeight: 1.1 }}
                    >
                      {getLabel(latestPronto)}
                    </span>
                  </div>
                )}

                {/* Rest */}
                {restProntos.length > 0 && (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                    {restProntos.map((p) => (
                      <div key={p.id} className="rounded-xl py-3 px-4 text-center" style={{ background: "rgba(0,0,0,0.2)" }}>
                        <span className="font-black tabular-nums text-white" style={{ fontSize: usaNome ? "1.2rem" : "2rem" }}>
                          {getLabel(p)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-center text-sm font-bold uppercase tracking-wider text-white/40 mt-auto pt-4">
                  Retirar no balcão
                </p>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — PRÓXIMAS SENHAS (Preparando) */}
        <div className="flex-1 flex flex-col" style={{ background: "#1a1a1a" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#333" }}>
            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2" style={{ color: "#f97316" }}>
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#f97316" }} />
              Próximas senhas
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {pedidosPreparando.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-lg font-medium text-white/20">Nenhum pedido em preparo</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {pedidosPreparando.map((p) => (
                  <div key={p.id} className="rounded-xl py-4 px-3 text-center" style={{ background: "#252525", border: "1px solid #333" }}>
                    <span className="font-black tabular-nums text-white" style={{ fontSize: usaNome ? "1.3rem" : "2.5rem" }}>
                      {getLabel(p)}
                    </span>
                    {usaNome && (
                      <p className="text-xs text-white/40 mt-1 tabular-nums">#{formatSenha(p.numero)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FOOTER — Vermelho ═══ */}
      <div className="px-6 py-2.5 text-center" style={{ background: "#b91c1c" }}>
        <p className="text-sm md:text-base font-black uppercase tracking-widest text-white">
          Por favor aguarde sua senha no painel!
        </p>
      </div>
    </div>
  );
};

export default TvPainelRetirada;
