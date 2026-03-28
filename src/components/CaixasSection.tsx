import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";

interface CaixasSectionProps {
  storeId: string | null;
  formatPrice: (v: number) => string;
}

interface Turno {
  id: string;
  aberto: boolean;
  aberto_em: string | null;
  aberto_por: string | null;
  fechado_em: string | null;
  fechado_por: string | null;
  fundo_troco: number | null;
  diferenca_dinheiro: number | null;
  diferenca_motivo: string | null;
}

interface TurnoFechamento {
  total: number;
  origem: string;
  mesa_numero: number | null;
  forma_pagamento: string | null;
  criado_em: string | null;
}

const formatDt = (iso: string | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${mi}`;
  } catch {
    return "—";
  }
};

const CaixasSection = ({ storeId, formatPrice }: CaixasSectionProps) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    fechamentos: TurnoFechamento[];
    porForma: Record<string, number>;
    total: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("estado_caixa")
          .select("id, aberto, aberto_em, aberto_por, fechado_em, fechado_por, fundo_troco, diferenca_dinheiro, diferenca_motivo")
          .eq("store_id", storeId)
          .order("updated_at", { ascending: false })
          .limit(30);
        if (!cancelled) setTurnos((data as Turno[]) ?? []);
      } catch (err) {
        console.error("[CaixasSection] erro ao carregar turnos:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [storeId]);

  const toggleExpand = useCallback(async (turno: Turno) => {
    if (expandedId === turno.id) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    if (turno.aberto) return; // turno atual não tem detalhes de fechamento

    setExpandedId(turno.id);
    setDetailLoading(true);
    setDetailData(null);

    try {
      let query = supabase
        .from("fechamentos")
        .select("total, origem, mesa_numero, forma_pagamento, criado_em")
        .eq("store_id", storeId!)
        .eq("cancelado", false)
        .order("criado_em_iso", { ascending: false });

      if (turno.aberto_em) query = query.gte("criado_em_iso", turno.aberto_em);
      if (turno.fechado_em) query = query.lte("criado_em_iso", turno.fechado_em);

      const { data } = await query.limit(500);
      const fechamentos = (data ?? []) as TurnoFechamento[];

      const porForma: Record<string, number> = {};
      let total = 0;
      for (const f of fechamentos) {
        const v = Number(f.total) || 0;
        total += v;
        const forma = (f.forma_pagamento || "outro").toLowerCase();
        porForma[forma] = (porForma[forma] || 0) + v;
      }

      setDetailData({ fechamentos, porForma, total, count: fechamentos.length });
    } catch (err) {
      console.error("[CaixasSection] erro ao carregar detalhes:", err);
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId, storeId]);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-black text-foreground">Caixas</h2>
        <p className="text-sm text-muted-foreground mt-1">Histórico de turnos de caixa</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-8">
          <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Carregando turnos...
        </div>
      ) : turnos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum turno registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {turnos.map((t) => {
            const isExpanded = expandedId === t.id;
            const isAtual = t.aberto === true;
            return (
              <div key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleExpand(t)}
                  className={`w-full text-left rounded-xl border bg-card p-5 transition-all hover:border-primary/30 ${
                    isAtual ? "border-emerald-500/60 ring-1 ring-emerald-500/20" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {isAtual && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            Turno atual
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDt(t.aberto_em)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">Aberto por: </span>
                          <span className="font-bold text-foreground">{t.aberto_por || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fechamento: </span>
                          <span className="font-bold text-foreground">
                            {isAtual ? "Em andamento" : formatDt(t.fechado_em)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fechado por: </span>
                          <span className="font-bold text-foreground">{isAtual ? "—" : t.fechado_por || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fundo: </span>
                          <span className="font-bold text-foreground">{formatPrice(Number(t.fundo_troco) || 0)}</span>
                        </div>
                      </div>

                      {t.diferenca_dinheiro != null && t.diferenca_dinheiro !== 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Diferença:</span>
                          <span className={`font-black ${t.diferenca_dinheiro < 0 ? "text-destructive" : "text-emerald-400"}`}>
                            {t.diferenca_dinheiro > 0 ? "+" : ""}{formatPrice(t.diferenca_dinheiro)}
                          </span>
                          {t.diferenca_motivo && (
                            <span className="text-muted-foreground/70 italic">— {t.diferenca_motivo}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {!isAtual && (
                      <div className="shrink-0 pt-1">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Detail panel */}
                {isExpanded && !isAtual && (
                  <div className="ml-4 mt-1 rounded-xl border border-border bg-card p-5 space-y-4">
                    {detailLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                        <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Carregando fechamentos...
                      </div>
                    ) : detailData ? (
                      <>
                        <div className="flex items-center gap-6 flex-wrap">
                          <div>
                            <p className="text-xs text-muted-foreground">Total fechamentos</p>
                            <p className="text-xl font-black text-foreground">{detailData.count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Faturamento</p>
                            <p className="text-xl font-black text-emerald-400">{formatPrice(detailData.total)}</p>
                          </div>
                        </div>

                        {Object.keys(detailData.porForma).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Por forma de pagamento</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {Object.entries(detailData.porForma).sort((a, b) => b[1] - a[1]).map(([forma, valor]) => (
                                <div key={forma} className="rounded-lg border border-border bg-background p-3">
                                  <p className="text-xs text-muted-foreground capitalize">{forma}</p>
                                  <p className="text-sm font-black text-foreground">{formatPrice(valor)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detailData.fechamentos.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fechamentos</p>
                            <div className="rounded-xl border border-border bg-background divide-y divide-border max-h-[300px] overflow-y-auto">
                              {detailData.fechamentos.map((f, i) => {
                                const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
                                const origemLabel = f.origem === "mesa"
                                  ? `Mesa ${f.mesa_numero || "?"}`
                                  : f.origem === "balcao" ? "Balcão"
                                  : f.origem === "totem" ? "Totem"
                                  : f.origem === "delivery" ? "Delivery"
                                  : f.origem || "—";
                                return (
                                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-4">
                                      <span className="text-xs font-mono text-muted-foreground w-12">{hora}</span>
                                      <span className="text-sm font-bold text-foreground">{origemLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-xs text-muted-foreground">{f.forma_pagamento || "—"}</span>
                                      <span className="text-sm font-black text-foreground">{formatPrice(Number(f.total) || 0)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {detailData.count === 0 && (
                          <p className="text-xs text-muted-foreground py-2">Nenhum fechamento neste turno.</p>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CaixasSection;
