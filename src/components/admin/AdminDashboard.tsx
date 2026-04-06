import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Users, Package,
  Activity, Truck, ShoppingBag, ArrowRight, AlertTriangle,
  BarChart3, Shield, Wallet, User, Smartphone, ChefHat,
  BarChart2, Bike, Monitor, Tv, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import { getLicencaConfigAsync, getSistemaConfigAsync, type LicencaConfig, type SistemaConfig } from "@/lib/adminStorage";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

interface Props {
  storeId: string | null;
  /** If provided, shows a store selector (Master mode) */
  stores?: { id: string; name: string }[];
  onSelectStore?: (id: string | null) => void;
}

export default function AdminDashboard({ storeId, stores, onSelectStore }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Data states
  const [pedidosHoje, setPedidosHoje] = useState(0);
  const [pedidosOntem, setPedidosOntem] = useState(0);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [fat7dias, setFat7dias] = useState<{ dia: string; total: number }[]>([]);
  const [fatPeriodo, setFatPeriodo] = useState<"hoje" | "semana" | "mes">("hoje");
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [clientesTotal, setClientesTotal] = useState(0);
  const [clientesMesAnterior, setClientesMesAnterior] = useState(0);
  const [licenca, setLicenca] = useState<LicencaConfig | null>(null);
  const [config, setConfig] = useState<SistemaConfig | null>(null);
  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);
  const [ultimasAtividades, setUltimasAtividades] = useState<any[]>([]);
  const [deliveryResumo, setDeliveryResumo] = useState<{ andamento: number; entregues: number; faturamento: number } | null>(null);
  const [vendasRecentes, setVendasRecentes] = useState<any[]>([]);
  const [topProdutos, setTopProdutos] = useState<{ nome: string; qtd: number; valor: number }[]>([]);

  const loadDashboard = useCallback(async (sid: string) => {
    setLoading(true);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeISO = hoje.toISOString();

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const ontemISO = ontem.toISOString();

    const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const mesAnteriorInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesAnteriorFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999);

    try {
      const [
        pedidosHojeRes,
        pedidosOntemRes,
        fechHojeRes,
        clientesMesRes,
        clientesMesAntRes,
        estoqueBaixoRes,
        eventosRes,
        vendasRes,
      ] = await Promise.all([
        supabase.from("pedidos").select("id", { count: "exact", head: true })
          .eq("store_id", sid).eq("cancelado", false).gte("criado_em_iso", hojeISO),
        supabase.from("pedidos").select("id", { count: "exact", head: true })
          .eq("store_id", sid).eq("cancelado", false).gte("criado_em_iso", ontemISO).lt("criado_em_iso", hojeISO),
        supabase.from("fechamentos").select("total, origem, mesa_numero, forma_pagamento, criado_em, criado_em_iso, itens, numero_comanda")
          .eq("store_id", sid).eq("cancelado", false).gte("criado_em_iso", hojeISO)
          .order("criado_em_iso", { ascending: false }).limit(500),
        supabase.from("pedidos").select("cliente_nome", { count: "exact", head: true })
          .eq("store_id", sid).not("cliente_nome", "is", null).gte("criado_em_iso", mesInicio.toISOString()),
        supabase.from("pedidos").select("cliente_nome", { count: "exact", head: true })
          .eq("store_id", sid).not("cliente_nome", "is", null)
          .gte("criado_em_iso", mesAnteriorInicio.toISOString()).lte("criado_em_iso", mesAnteriorFim.toISOString()),
        supabase.from("produtos").select("id, nome, imagem, quantidade_estoque, estoque_minimo")
          .eq("store_id", sid).eq("ativo", true).eq("removido", false).eq("controle_estoque", true)
          .limit(50),
        supabase.from("eventos_operacionais").select("tipo, descricao, usuario_nome, valor, pedido_numero, criado_em_iso, acao")
          .eq("store_id", sid).order("criado_em_iso", { ascending: false }).limit(5),
        supabase.from("fechamentos").select("total, origem, mesa_numero, forma_pagamento, criado_em, numero_comanda, itens")
          .eq("store_id", sid).eq("cancelado", false)
          .order("criado_em_iso", { ascending: false }).limit(10),
      ]);

      setPedidosHoje(pedidosHojeRes.count ?? 0);
      setPedidosOntem(pedidosOntemRes.count ?? 0);

      const fechamentos = fechHojeRes.data ?? [];
      setFaturamentoHoje(fechamentos.reduce((s, f) => s + (Number(f.total) || 0), 0));

      setClientesTotal(clientesMesRes.count ?? 0);
      setClientesMesAnterior(clientesMesAntRes.count ?? 0);

      // Stock alerts
      const lowStock = (estoqueBaixoRes.data ?? []).filter(
        (p: any) => (p.quantidade_estoque ?? 0) <= (p.estoque_minimo ?? 0)
      );
      setEstoqueBaixo(lowStock);

      setUltimasAtividades(eventosRes.data ?? []);
      setVendasRecentes(vendasRes.data ?? []);

      // Top products from fechamentos
      const prodMap: Record<string, { qtd: number; valor: number }> = {};
      for (const f of fechamentos) {
        const itens = Array.isArray(f.itens) ? f.itens : [];
        for (const item of itens) {
          const nome = (item as any)?.nome || "Desconhecido";
          const qtd = Number((item as any)?.quantidade || 1);
          const val = Number((item as any)?.preco || 0) * qtd;
          if (!prodMap[nome]) prodMap[nome] = { qtd: 0, valor: 0 };
          prodMap[nome].qtd += qtd;
          prodMap[nome].valor += val;
        }
      }
      setTopProdutos(
        Object.entries(prodMap).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
      );

      // Heatmap: 7 days x 24 hours
      const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      const pedidosWeekRes = await supabase.from("pedidos").select("criado_em_iso")
        .eq("store_id", sid).eq("cancelado", false)
        .gte("criado_em_iso", new Date(Date.now() - 7 * 86400000).toISOString())
        .limit(1000);
      for (const p of pedidosWeekRes.data ?? []) {
        const d = new Date(p.criado_em_iso);
        const dayIndex = d.getDay();
        const hour = d.getHours();
        heatmap[dayIndex][hour]++;
      }
      setHeatmapData(heatmap);

      // 7-day revenue chart
      const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dias: { inicio: string; fim: string; label: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        dias.push({
          inicio: d.toISOString(),
          fim: new Date(d.getTime() + 86400000 - 1).toISOString(),
          label: DIAS_SEMANA[d.getDay()],
        });
      }
      const chartResults = await Promise.all(
        dias.map(({ inicio, fim }) =>
          supabase.from("fechamentos").select("total")
            .eq("store_id", sid).eq("cancelado", false)
            .gte("criado_em_iso", inicio).lte("criado_em_iso", fim)
        )
      );
      setFat7dias(dias.map((d, i) => ({
        dia: d.label,
        total: (chartResults[i].data ?? []).reduce((s, f) => s + (Number(f.total) || 0), 0),
      })));

      // Delivery summary
      const cfgData = await getSistemaConfigAsync(sid);
      setConfig(cfgData);
      const licData = await getLicencaConfigAsync(sid);
      setLicenca(licData);

      if (cfgData.modulos?.delivery) {
        const deliveryPedidos = await supabase.from("pedidos").select("total, status_balcao")
          .eq("store_id", sid).eq("origem", "delivery").eq("cancelado", false)
          .gte("criado_em_iso", hojeISO);
        const dp = deliveryPedidos.data ?? [];
        setDeliveryResumo({
          andamento: dp.filter(p => p.status_balcao !== "entregue" && p.status_balcao !== "finalizado").length,
          entregues: dp.filter(p => p.status_balcao === "entregue" || p.status_balcao === "finalizado").length,
          faturamento: dp.reduce((s, p) => s + (Number(p.total) || 0), 0),
        });
      } else {
        setDeliveryResumo(null);
      }
    } catch (err) {
      console.error("[AdminDashboard] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (storeId) loadDashboard(storeId);
    else setLoading(false);
  }, [storeId, loadDashboard]);

  const pedidoVariacao = pedidosOntem > 0
    ? Math.round(((pedidosHoje - pedidosOntem) / pedidosOntem) * 100)
    : pedidosHoje > 0 ? 100 : 0;

  const clienteVariacao = clientesMesAnterior > 0
    ? Math.round(((clientesTotal - clientesMesAnterior) / clientesMesAnterior) * 100)
    : clientesTotal > 0 ? 100 : 0;

  const heatmapMax = useMemo(() => Math.max(1, ...heatmapData.flat()), [heatmapData]);

  const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (!storeId && !stores) {
    return <p className="text-sm text-muted-foreground py-12 text-center">Loja não identificada.</p>;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Store selector for Master */}
      {stores && onSelectStore && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-bold text-muted-foreground">Loja:</label>
          <select
            value={storeId ?? ""}
            onChange={(e) => onSelectStore(e.target.value || null)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground"
          >
            <option value="">Todas as lojas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ROW 1 — Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pedidos */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Pedidos</CardTitle>
              <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-24" /> : (
              <>
                <p className="text-4xl font-black text-foreground">{pedidosHoje}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`text-[10px] font-bold ${pedidoVariacao >= 0 ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15" : "bg-destructive/15 text-destructive hover:bg-destructive/15"} border-0`}>
                    {pedidoVariacao >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {pedidoVariacao >= 0 ? "+" : ""}{pedidoVariacao}%
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {pedidosHoje - pedidosOntem >= 0 ? "+" : ""}{pedidosHoje - pedidosOntem} vs ontem
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Faturamento */}
        <Card className="rounded-2xl shadow-sm md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</CardTitle>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-32" /> : (
              <>
                <p className="text-4xl font-black text-primary">{formatPrice(faturamentoHoje)}</p>
                <div className="mt-3 h-[60px]">
                  {fat7dias.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={fat7dias}>
                        <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pedidos por Horário — Heatmap */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedidos por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[100px] w-full" /> : (
              <div className="space-y-1">
                {heatmapData.map((row, dayIdx) => (
                  <div key={dayIdx} className="flex items-center gap-0.5">
                    <span className="text-[9px] text-muted-foreground w-6 shrink-0">{DIAS_LABEL[dayIdx]}</span>
                    <div className="flex gap-px flex-1">
                      {row.slice(6, 24).map((val, hIdx) => {
                        const intensity = val / heatmapMax;
                        return (
                          <div
                            key={hIdx}
                            className="flex-1 h-3 rounded-[2px] transition-colors"
                            style={{
                              backgroundColor: intensity > 0
                                ? `hsl(var(--primary) / ${Math.max(0.1, intensity)})`
                                : "hsl(var(--muted) / 0.3)",
                            }}
                            title={`${DIAS_LABEL[dayIdx]} ${hIdx + 6}h: ${val} pedidos`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-0.5 mt-1">
                  <span className="w-6" />
                  <div className="flex gap-px flex-1">
                    {Array.from({ length: 18 }, (_, i) => i + 6).filter(h => h % 3 === 0).map(h => (
                      <span key={h} className="text-[8px] text-muted-foreground" style={{ flex: 3, textAlign: "center" }}>{h}h</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 2 — Secondary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Clientes */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes no Mês</CardTitle>
              <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-20" /> : (
              <>
                <p className="text-4xl font-black text-foreground">{clientesTotal}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`text-[10px] font-bold ${clienteVariacao >= 0 ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15" : "bg-destructive/15 text-destructive hover:bg-destructive/15"} border-0`}>
                    {clienteVariacao >= 0 ? "+" : ""}{clienteVariacao}%
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">vs mês anterior</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plano */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meu Plano</CardTitle>
              <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-32" /> : licenca ? (
              <div>
                <p className="text-2xl font-black text-foreground capitalize">{licenca.plano || "Básico"}</p>
                {licenca.dataVencimento && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vence em {new Date(licenca.dataVencimento).toLocaleDateString("pt-BR")}
                  </p>
                )}
                <Badge className={`mt-2 text-[10px] font-bold border-0 ${licenca.ativo !== false ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15" : "bg-destructive/15 text-destructive hover:bg-destructive/15"}`}>
                  {licenca.ativo !== false ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem licença configurada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3 — Operational */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estoque Baixo */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estoque Baixo</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-20 w-full" /> : estoqueBaixo.length === 0 ? (
              <div className="flex items-center gap-2 py-4">
                <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Package className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-sm font-bold text-emerald-500">Tudo abastecido!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {estoqueBaixo.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    {p.imagem ? (
                      <img src={p.imagem} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{p.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{p.quantidade_estoque} restantes</p>
                    </div>
                    {(p.quantidade_estoque ?? 0) === 0 && (
                      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 border-0 text-[9px]">Esgotado</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Última Atividade */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Última Atividade</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-20 w-full" /> : ultimasAtividades.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-2.5 max-h-40 overflow-y-auto">
                {ultimasAtividades.map((ev, i) => {
                  const isCancelamento = ev.tipo === "cancelamento" || ev.acao === "cancelar";
                  const isPagamento = ev.tipo === "fechamento" || ev.tipo === "pagamento";
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCancelamento ? "bg-destructive/15" : isPagamento ? "bg-emerald-500/15" : "bg-primary/15"}`}>
                        <Activity className={`h-2.5 w-2.5 ${isCancelamento ? "text-destructive" : isPagamento ? "text-emerald-500" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-foreground truncate">
                          {ev.usuario_nome || "Sistema"} — {ev.descricao || ev.tipo}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {ev.pedido_numero ? `Pedido #${ev.pedido_numero}` : ""}
                          {ev.valor ? ` • ${formatPrice(ev.valor)}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery */}
        {deliveryResumo !== null && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Hoje</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-20 w-full" /> : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Em andamento</span>
                    <span className="text-sm font-black text-foreground">{deliveryResumo.andamento}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Entregues</span>
                    <span className="text-sm font-black text-emerald-500">{deliveryResumo.entregues}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs font-bold text-muted-foreground">Faturamento</span>
                    <span className="text-sm font-black text-primary">{formatPrice(deliveryResumo.faturamento)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Placeholder if no delivery */}
        {deliveryResumo === null && !loading && (
          <Card className="rounded-2xl shadow-sm opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground py-4">Delivery não está ativo</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ROW 4 — Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendas Recentes */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? <Skeleton className="h-[200px] w-full mx-6 mb-6" /> : vendasRecentes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma venda registrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Comanda</TableHead>
                    <TableHead className="text-[10px]">Origem</TableHead>
                    <TableHead className="text-[10px] text-right">Valor</TableHead>
                    <TableHead className="text-[10px]">Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasRecentes.map((v, i) => {
                    const origem = v.origem === "mesa" ? `Mesa ${v.mesa_numero || "?"}` : v.origem === "balcao" ? "Balcão" : v.origem === "totem" ? "Totem" : v.origem === "delivery" ? "Delivery" : v.origem || "—";
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-bold">#{v.numero_comanda || "—"}</TableCell>
                        <TableCell className="text-xs">{origem}</TableCell>
                        <TableCell className="text-xs font-bold text-right">{formatPrice(Number(v.total) || 0)}</TableCell>
                        <TableCell className="text-xs capitalize">{v.forma_pagamento || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Produtos — Donut */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[200px] w-full" /> : topProdutos.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Sem dados suficientes</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topProdutos}
                        dataKey="qtd"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={2}
                      >
                        {topProdutos.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: "11px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {topProdutos.map((p, i) => {
                    const totalQtd = topProdutos.reduce((s, x) => s + x.qtd, 0);
                    const pct = totalQtd > 0 ? Math.round((p.qtd / totalQtd) * 100) : 0;
                    return (
                      <div key={p.nome} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[11px] font-bold text-foreground truncate flex-1">{p.nome}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7-day chart */}
      {!loading && fat7dias.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />Faturamento — Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fat7dias}>
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={45} />
                <ReTooltip
                  formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "Faturamento"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Access — Módulos Operacionais */}
      {!loading && config && (
        <QuickAccessGrid config={config} />
      )}
    </div>
  );
}

const ALL_MODULES = [
  { key: "caixa", label: "Caixa", route: "/caixa", icon: Wallet },
  { key: "garcom", label: "Garçom", route: "/garcom", icon: User },
  { key: "garcomPdv", label: "Garçom PDV", route: "/garcom-pdv", icon: Smartphone },
  { key: "cozinha", label: "Cozinha", route: "/cozinha", icon: ChefHat },
  { key: "gerente", label: "Gerente", route: "/gerente", icon: BarChart2 },
  { key: "motoboy", label: "Motoboy", route: "/motoboy", icon: Bike },
  { key: "totem", label: "Totem", route: "/totem", icon: Monitor },
  { key: "tv", label: "TV Retirada", route: "/tv", icon: Tv },
  { key: "delivery", label: "Delivery", route: "/delivery", icon: Truck },
];

function QuickAccessGrid({ config }: { config: SistemaConfig }) {
  const modulos = config.modulos || {};
  // caixa and gerente are always available
  const active = ALL_MODULES.filter((m) => {
    if (m.key === "caixa" || m.key === "gerente") return true;
    if (m.key === "garcom" || m.key === "garcomPdv") return modulos.garcomPdv;
    if (m.key === "cozinha") return modulos.cozinha;
    if (m.key === "motoboy") return modulos.motoboy;
    if (m.key === "totem") return modulos.totem;
    if (m.key === "tv") return modulos.tvRetirada;
    if (m.key === "delivery") return modulos.delivery;
    return false;
  });

  if (active.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {active.map((m) => {
          const Icon = m.icon;
          return (
            <a
              key={m.key}
              href={m.route}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{m.label}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
