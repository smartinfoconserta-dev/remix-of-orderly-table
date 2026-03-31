import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList, Grid3X3, Truck, KeyRound, UtensilsCrossed, CreditCard,
  ChefHat, Bike, Monitor, Tv, Users, ExternalLink, Shield, TrendingUp,
  DollarSign, Receipt, Wallet, Printer, Clock, BarChart3, CalendarDays,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import {
  getSistemaConfig, getLicencaConfig, getMesasConfigAsync,
  getSistemaConfigAsync, getLicencaConfigAsync,
  type SistemaConfig, type LicencaConfig, type MesasConfig,
  type PlanoModulos, getModulosDoPlano,
} from "@/lib/adminStorage";

const PLANO_LABELS: Record<string, string> = {
  basico: "Básico", medio: "Médio", pro: "Pro", premium: "Premium",
};

interface Props {
  storeId: string | null;
}

const AdminRelatorios = ({ storeId }: Props) => {
  const navigate = useNavigate();

  // Local copies from cache
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);
  const [licencaConfig, setLicencaConfig] = useState<LicencaConfig>(getLicencaConfig);
  const [mesasCount, setMesasCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  // Dashboard "Hoje" data
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState(false);
  const [dashPedidosHoje, setDashPedidosHoje] = useState(0);
  const [dashFaturamento, setDashFaturamento] = useState(0);
  const [dashTotalFechamentos, setDashTotalFechamentos] = useState(0);
  const [dashCaixaAberto, setDashCaixaAberto] = useState<boolean | null>(null);
  const [dashUltimosFechamentos, setDashUltimosFechamentos] = useState<any[]>([]);
  const [dash7dias, setDash7dias] = useState<{ dia: string; total: number }[]>([]);
  const [dash7diasLoading, setDash7diasLoading] = useState(false);

  // Relatório por período
  type PeriodoOption = "hoje" | "7dias" | "30dias" | "custom";
  const [relPeriodo, setRelPeriodo] = useState<PeriodoOption>("hoje");
  const [relCustomInicio, setRelCustomInicio] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); });
  const [relCustomFim, setRelCustomFim] = useState(() => new Date().toISOString().slice(0,10));
  const [relLoading, setRelLoading] = useState(false);
  const [relData, setRelData] = useState<{
    faturamento: number;
    totalFechamentos: number;
    ticketMedio: number;
    porForma: Record<string, number>;
    topProdutos: { nome: string; qtd: number; valor: number }[];
    fechamentos: any[];
  } | null>(null);

  // Load counts on mount
  useEffect(() => {
    if (!storeId) {
      setSistemaConfig(getSistemaConfig());
      setLicencaConfig(getLicencaConfig());
      return;
    }
    getSistemaConfigAsync(storeId).then(setSistemaConfig);
    getLicencaConfigAsync(storeId).then(setLicencaConfig);
    getMesasConfigAsync(storeId).then(c => setMesasCount(c.totalMesas));
    supabase.from("produtos").select("id", { count: "exact", head: true })
      .eq("store_id", storeId).eq("ativo", true).eq("removido", false)
      .then(({ count }) => setProductsCount(count ?? 0));
  }, [storeId]);

  const getRelPeriodoDates = useCallback(() => {
    const agora = new Date();
    let inicio: Date;
    let fim = new Date(agora);
    fim.setHours(23, 59, 59, 999);
    switch (relPeriodo) {
      case "hoje": inicio = new Date(agora); inicio.setHours(0, 0, 0, 0); break;
      case "7dias": inicio = new Date(agora); inicio.setDate(inicio.getDate() - 6); inicio.setHours(0, 0, 0, 0); break;
      case "30dias": inicio = new Date(agora); inicio.setDate(inicio.getDate() - 29); inicio.setHours(0, 0, 0, 0); break;
      case "custom":
        inicio = new Date(relCustomInicio + "T00:00:00");
        fim = new Date(relCustomFim + "T23:59:59.999");
        break;
      default: inicio = new Date(agora); inicio.setHours(0, 0, 0, 0);
    }
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
  }, [relPeriodo, relCustomInicio, relCustomFim]);

  // Load relatório por período
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const loadRel = async () => {
      setRelLoading(true);
      try {
        const { inicio, fim } = getRelPeriodoDates();
        const { data: fechamentos, error } = await supabase
          .from("fechamentos")
          .select("total, origem, mesa_numero, forma_pagamento, criado_em, itens")
          .eq("store_id", storeId)
          .eq("cancelado", false)
          .gte("criado_em_iso", inicio)
          .lte("criado_em_iso", fim)
          .order("criado_em_iso", { ascending: false })
          .limit(1000);
        if (cancelled) return;
        if (error) { console.error("[AdminRelatorios] erro relatório período:", error); setRelLoading(false); return; }
        const fech = fechamentos ?? [];
        const fat = fech.reduce((s, f) => s + (Number(f.total) || 0), 0);
        const porForma: Record<string, number> = {};
        const prodMap: Record<string, { qtd: number; valor: number }> = {};
        for (const f of fech) {
          const forma = (f.forma_pagamento || "outro").toLowerCase();
          porForma[forma] = (porForma[forma] || 0) + (Number(f.total) || 0);
          const itens = Array.isArray(f.itens) ? f.itens : [];
          for (const item of itens) {
            const nome = (item as any)?.nome || (item as any)?.name || "Desconhecido";
            const qtd = Number((item as any)?.quantidade || (item as any)?.qtd || 1);
            const val = Number((item as any)?.preco || (item as any)?.price || 0) * qtd;
            if (!prodMap[nome]) prodMap[nome] = { qtd: 0, valor: 0 };
            prodMap[nome].qtd += qtd;
            prodMap[nome].valor += val;
          }
        }
        const topProdutos = Object.entries(prodMap)
          .map(([nome, d]) => ({ nome, ...d }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5);
        setRelData({ faturamento: fat, totalFechamentos: fech.length, ticketMedio: fech.length > 0 ? fat / fech.length : 0, porForma, topProdutos, fechamentos: fech });
      } catch (err) {
        console.error("[AdminRelatorios] erro relatório período:", err);
      } finally {
        if (!cancelled) setRelLoading(false);
      }
    };
    loadRel();
    return () => { cancelled = true; };
  }, [storeId, relPeriodo, relCustomInicio, relCustomFim, getRelPeriodoDates]);

  // Load dashboard "hoje"
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeISO = hoje.toISOString();
    const load = async () => {
      setDashLoading(true);
      setDashError(false);
      try {
        const [pedidosRes, fechRes, caixaRes] = await Promise.all([
          supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("cancelado", false).gte("criado_em_iso", hojeISO),
          supabase.from("fechamentos").select("total, origem, mesa_numero, forma_pagamento, criado_em, criado_em_iso").eq("store_id", storeId).eq("cancelado", false).gte("criado_em_iso", hojeISO).order("criado_em_iso", { ascending: false }).limit(100),
          supabase.from("estado_caixa").select("aberto").eq("store_id", storeId).limit(1).maybeSingle(),
        ]);
        if (cancelled) return;
        setDashPedidosHoje(pedidosRes.count ?? 0);
        const fechamentos = fechRes.data ?? [];
        const fat = fechamentos.reduce((s, f) => s + (Number(f.total) || 0), 0);
        setDashFaturamento(fat);
        setDashTotalFechamentos(fechamentos.length);
        setDashCaixaAberto(caixaRes.data?.aberto ?? null);
        setDashUltimosFechamentos(fechamentos.slice(0, 10));
      } catch (err) {
        console.error("[AdminRelatorios] erro ao carregar dashboard:", err);
        if (!cancelled) setDashError(true);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [storeId]);

  // Load 7-day chart
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const load7dias = async () => {
      setDash7diasLoading(true);
      try {
        const dias: { inicio: string; fim: string; label: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
          const inicio = d.toISOString();
          const fim = new Date(d.getTime() + 86400000 - 1).toISOString();
          dias.push({ inicio, fim, label: DIAS_SEMANA[d.getDay()] });
        }
        const results = await Promise.all(
          dias.map(({ inicio, fim }) =>
            supabase.from("fechamentos").select("total").eq("store_id", storeId).eq("cancelado", false).gte("criado_em_iso", inicio).lte("criado_em_iso", fim)
          )
        );
        if (cancelled) return;
        const chartData = dias.map((d, i) => ({
          dia: d.label,
          total: (results[i].data ?? []).reduce((s, f) => s + (Number(f.total) || 0), 0),
        }));
        setDash7dias(chartData);
      } catch (err) {
        console.error("[AdminRelatorios] erro gráfico 7 dias:", err);
      } finally {
        if (!cancelled) setDash7diasLoading(false);
      }
    };
    load7dias();
    return () => { cancelled = true; };
  }, [storeId]);

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-foreground">Bem-vindo de volta 👋</h2>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produtos</p>
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center"><ClipboardList className="h-3.5 w-3.5 text-primary" /></div>
          </div>
          <p className="text-3xl font-black text-foreground">{productsCount}</p>
          <p className="text-xs text-muted-foreground">itens no cardápio</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mesas</p>
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center"><Grid3X3 className="h-3.5 w-3.5 text-primary" /></div>
          </div>
          <p className="text-3xl font-black text-foreground">{mesasCount}</p>
          <p className="text-xs text-muted-foreground">configuradas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery</p>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Truck className="h-3.5 w-3.5 text-emerald-400" /></div>
          </div>
          <div className="flex items-center gap-2">
            {sistemaConfig.deliveryAtivo !== false && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
            )}
            <p className={`text-xl font-black ${sistemaConfig.deliveryAtivo !== false ? "text-emerald-400" : "text-destructive"}`}>
              {sistemaConfig.deliveryAtivo !== false ? "Ativo" : "Inativo"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{sistemaConfig.deliveryAtivo !== false ? "Aceitando pedidos" : "Pausado"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipe</p>
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center"><KeyRound className="h-3.5 w-3.5 text-primary" /></div>
          </div>
          <p className="text-3xl font-black text-foreground">—</p>
          <p className="text-xs text-muted-foreground">Gerenciado via PINs</p>
        </div>
      </div>

      {/* Plan banner */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-red-500 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="mr-auto">
            <p className="text-lg font-black text-foreground">{PLANO_LABELS[licencaConfig.plano || "basico"] || "Básico"}</p>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Plano atual</span>
          </div>
          {[
            { label: "Módulos ilimitados", show: licencaConfig.plano === "premium" },
            { label: "Delivery integrado", show: ["medio", "pro", "premium"].includes(licencaConfig.plano || "") },
            { label: "Suporte prioritário", show: ["pro", "premium"].includes(licencaConfig.plano || "") },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded flex items-center justify-center text-xs ${f.show ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{f.show ? "✓" : "—"}</div>
              <span className="text-xs text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Módulos ao vivo */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Módulos ao vivo</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Garçom", icon: UtensilsCrossed, path: "/garcom" },
            { label: "Caixa", icon: CreditCard, path: "/caixa" },
            { label: "Cozinha", icon: ChefHat, path: "/cozinha" },
            { label: "Delivery", icon: Truck, path: "/delivery" },
            { label: "Motoboy", icon: Bike, path: "/motoboy" },
            { label: "Totem", icon: Monitor, path: "/totem" },
            { label: "TV Retirada", icon: Tv, path: "/tv" },
            { label: "Gerente", icon: Users, path: "/gerente" },
          ].map((m) => (
            <button key={m.path} type="button" onClick={() => navigate(m.path)}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 group">
              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{m.label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border my-6" />

      {/* Hoje */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Hoje</p>
          {!dashLoading && !dashError && (
            <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs gap-1.5"
              onClick={() => {
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const hojeISO = hoje.toISOString();
                const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                const dataFormatada = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                supabase.from("fechamentos").select("total, origem, mesa_numero, forma_pagamento, criado_em").eq("store_id", storeId!).eq("cancelado", false).gte("criado_em_iso", hojeISO).order("criado_em_iso", { ascending: false }).limit(500)
                  .then(({ data }) => {
                    const fechamentos = data ?? [];
                    const totalFat = fechamentos.reduce((s, f) => s + (Number(f.total) || 0), 0);
                    const formas: Record<string, number> = {};
                    for (const f of fechamentos) { const k = (f.forma_pagamento || "outro").toLowerCase(); formas[k] = (formas[k] || 0) + (Number(f.total) || 0); }
                    const ticketMedio = fechamentos.length > 0 ? totalFat / fechamentos.length : 0;
                    const formasRows = ["dinheiro", "crédito", "débito", "pix"].map((f) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${f.charAt(0).toUpperCase() + f.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(formas[f] || 0).toFixed(2).replace(".", ",")}</td></tr>`).join("");
                    const outrasFormas = Object.entries(formas).filter(([k]) => !["dinheiro", "crédito", "débito", "pix"].includes(k));
                    const outrasRows = outrasFormas.map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${k.charAt(0).toUpperCase() + k.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${v.toFixed(2).replace(".", ",")}</td></tr>`).join("");
                    const fechRows = fechamentos.map((f) => {
                      const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
                      const origem = f.origem === "mesa" ? `Mesa ${f.mesa_numero || "?"}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem || "—";
                      return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${hora}</td><td style="padding:6px 12px;border:1px solid #ddd;">${origem}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(Number(f.total) || 0).toFixed(2).replace(".", ",")}</td><td style="padding:6px 12px;border:1px solid #ddd;">${f.forma_pagamento || "—"}</td></tr>`;
                    }).join("");
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório do Dia - ${nomeRest}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:24px;max-width:800px;margin:0 auto;}h1{font-size:18px;margin-bottom:4px;}h2{font-size:14px;margin-top:24px;margin-bottom:8px;border-bottom:2px solid #222;padding-bottom:4px;}.subtitle{color:#666;font-size:12px;margin-bottom:20px;}table{border-collapse:collapse;width:100%;margin-bottom:16px;}th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-weight:bold;}.summary{display:flex;gap:32px;flex-wrap:wrap;margin-bottom:8px;}.summary-item{min-width:140px;}.summary-item .label{color:#666;font-size:11px;text-transform:uppercase;}.summary-item .value{font-size:20px;font-weight:bold;}.print-btn{margin-bottom:20px;padding:8px 16px;background:#222;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;}@media print{.print-btn{display:none !important;}}</style></head><body><button class="print-btn" onclick="window.print()">🖨️ Imprimir</button><h1>${nomeRest}</h1><p class="subtitle">Relatório do dia — ${dataFormatada}</p><h2>Resumo financeiro</h2><div class="summary"><div class="summary-item"><div class="label">Faturamento total</div><div class="value">R$ ${totalFat.toFixed(2).replace(".", ",")}</div></div><div class="summary-item"><div class="label">Pedidos</div><div class="value">${dashPedidosHoje}</div></div><div class="summary-item"><div class="label">Ticket médio</div><div class="value">R$ ${ticketMedio.toFixed(2).replace(".", ",")}</div></div><div class="summary-item"><div class="label">Fechamentos</div><div class="value">${fechamentos.length}</div></div></div><h2>Vendas por forma de pagamento</h2><table><thead><tr><th>Forma</th><th style="text-align:right;">Total</th></tr></thead><tbody>${formasRows}${outrasRows}</tbody></table><h2>Fechamentos do dia (${fechamentos.length})</h2><table><thead><tr><th>Horário</th><th>Origem</th><th style="text-align:right;">Total</th><th>Pagamento</th></tr></thead><tbody>${fechRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#999;">Nenhum fechamento</td></tr>'}</tbody></table><p style="color:#999;font-size:10px;margin-top:24px;text-align:center;">Gerado automaticamente em ${new Date().toLocaleString("pt-BR")}</p></body></html>`;
                    const w = window.open("", "_blank");
                    if (w) { w.document.write(html); w.document.close(); }
                  });
              }}>
              <Printer className="h-3.5 w-3.5" />Exportar PDF
            </Button>
          )}
        </div>
        {dashLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedidos hoje</p><div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-primary" /></div></div>
              <p className="text-3xl font-black text-foreground">{dashError ? "—" : dashPedidosHoje}</p>
              <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : "registrados no dia"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</p><div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><DollarSign className="h-3.5 w-3.5 text-emerald-400" /></div></div>
              <p className="text-3xl font-black text-primary">{dashError ? "—" : formatPrice(dashFaturamento)}</p>
              <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : "em fechamentos"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket médio</p><div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center"><Receipt className="h-3.5 w-3.5 text-primary" /></div></div>
              <p className="text-3xl font-black text-primary">{dashError ? "—" : dashTotalFechamentos > 0 ? formatPrice(dashFaturamento / dashTotalFechamentos) : formatPrice(0)}</p>
              <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : `${dashTotalFechamentos} fechamentos`}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caixa agora</p><div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center"><Wallet className="h-3.5 w-3.5 text-primary" /></div></div>
              <div className="flex items-center gap-2">
                {!dashError && dashCaixaAberto === true && (<span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" /></span>)}
                {!dashError && dashCaixaAberto === false && (<span className="h-2 w-2 rounded-full bg-destructive inline-block" />)}
                <p className={`text-xl font-black ${dashError ? "text-muted-foreground" : dashCaixaAberto === true ? "text-emerald-400" : dashCaixaAberto === false ? "text-destructive" : "text-muted-foreground"}`}>
                  {dashError ? "—" : dashCaixaAberto === true ? "Aberto" : dashCaixaAberto === false ? "Fechado" : "—"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : "status do turno"}</p>
            </div>
          </div>
        )}
      </div>

      {/* 7-day chart */}
      {!dashLoading && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Faturamento — últimos 7 dias</p>
          {dash7diasLoading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : dash7dias.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dash7dias}>
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={45} />
                <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "Faturamento"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} labelStyle={{ fontWeight: "bold", marginBottom: "4px" }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados de faturamento</p>
          )}
        </div>
      )}

      {/* Relatório por período */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Relatório por período</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(["hoje", "7dias", "30dias", "custom"] as const).map((opt) => {
              const labels: Record<PeriodoOption, string> = { hoje: "Hoje", "7dias": "7 dias", "30dias": "30 dias", custom: "Personalizado" };
              return (
                <button key={opt} type="button" onClick={() => setRelPeriodo(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${relPeriodo === opt ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {labels[opt]}
                </button>
              );
            })}
          </div>
        </div>
        {relPeriodo === "custom" && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs text-muted-foreground">De:</label>
            <input type="date" value={relCustomInicio} onChange={(e) => setRelCustomInicio(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground" />
            <label className="text-xs text-muted-foreground">Até:</label>
            <input type="date" value={relCustomFim} onChange={(e) => setRelCustomFim(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground" />
          </div>
        )}
        {relLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
        ) : relData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</p><p className="text-2xl font-black text-primary">{formatPrice(relData.faturamento)}</p></div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fechamentos</p><p className="text-2xl font-black text-foreground">{relData.totalFechamentos}</p></div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket médio</p><p className="text-2xl font-black text-primary">{formatPrice(relData.ticketMedio)}</p></div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formas pgto</p><p className="text-2xl font-black text-foreground">{Object.keys(relData.porForma).length}</p></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {["dinheiro", "crédito", "débito", "pix"].map((forma) => (
                <div key={forma} className="rounded-xl border border-border bg-card p-4 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{forma.charAt(0).toUpperCase() + forma.slice(1)}</p>
                  <p className="text-lg font-black text-foreground">{formatPrice(relData.porForma[forma] || 0)}</p>
                </div>
              ))}
            </div>
            {relData.topProdutos.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top 5 produtos</p>
                <div className="divide-y divide-border">
                  {relData.topProdutos.map((p, i) => (
                    <div key={p.nome} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-black text-primary">{i + 1}</span>
                        <span className="text-sm font-bold text-foreground">{p.nome}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{p.qtd}x</span>
                        <span className="text-sm font-black text-foreground">{formatPrice(p.valor)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs gap-1.5"
                onClick={() => {
                  const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                  const { inicio, fim } = getRelPeriodoDates();
                  const periodoLabel = relPeriodo === "hoje" ? "Hoje" : relPeriodo === "7dias" ? "Últimos 7 dias" : relPeriodo === "30dias" ? "Últimos 30 dias" : `${relCustomInicio} a ${relCustomFim}`;
                  const formasRows = ["dinheiro", "crédito", "débito", "pix"].map((f) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${f.charAt(0).toUpperCase() + f.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(relData.porForma[f] || 0).toFixed(2).replace(".", ",")}</td></tr>`).join("");
                  const outrasFormas = Object.entries(relData.porForma).filter(([k]) => !["dinheiro", "crédito", "débito", "pix"].includes(k));
                  const outrasRows = outrasFormas.map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${k.charAt(0).toUpperCase() + k.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${v.toFixed(2).replace(".", ",")}</td></tr>`).join("");
                  const topRows = relData.topProdutos.map((p, i) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${i+1}</td><td style="padding:6px 12px;border:1px solid #ddd;">${p.nome}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">${p.qtd}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${p.valor.toFixed(2).replace(".", ",")}</td></tr>`).join("");
                  const fechRows = relData.fechamentos.map((f) => {
                    const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
                    const origem = f.origem === "mesa" ? `Mesa ${f.mesa_numero || "?"}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem || "—";
                    return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${hora}</td><td style="padding:6px 12px;border:1px solid #ddd;">${origem}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(Number(f.total) || 0).toFixed(2).replace(".", ",")}</td><td style="padding:6px 12px;border:1px solid #ddd;">${f.forma_pagamento || "—"}</td></tr>`;
                  }).join("");
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório - ${nomeRest}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:24px;max-width:800px;margin:0 auto;}h1{font-size:18px;margin-bottom:4px;}h2{font-size:14px;margin-top:24px;margin-bottom:8px;border-bottom:2px solid #222;padding-bottom:4px;}.subtitle{color:#666;font-size:12px;margin-bottom:20px;}table{border-collapse:collapse;width:100%;margin-bottom:16px;}th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-weight:bold;}.summary{display:flex;gap:32px;flex-wrap:wrap;margin-bottom:8px;}.summary-item{min-width:140px;}.summary-item .label{color:#666;font-size:11px;text-transform:uppercase;}.summary-item .value{font-size:20px;font-weight:bold;}.print-btn{margin-bottom:20px;padding:8px 16px;background:#222;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;}@media print{.print-btn{display:none !important;}}</style></head><body><button class="print-btn" onclick="window.print()">🖨️ Imprimir</button><h1>${nomeRest}</h1><p class="subtitle">Relatório — ${periodoLabel}</p><h2>Resumo financeiro</h2><div class="summary"><div class="summary-item"><div class="label">Faturamento total</div><div class="value">R$ ${relData.faturamento.toFixed(2).replace(".", ",")}</div></div><div class="summary-item"><div class="label">Fechamentos</div><div class="value">${relData.totalFechamentos}</div></div><div class="summary-item"><div class="label">Ticket médio</div><div class="value">R$ ${relData.ticketMedio.toFixed(2).replace(".", ",")}</div></div></div><h2>Vendas por forma de pagamento</h2><table><thead><tr><th>Forma</th><th style="text-align:right;">Total</th></tr></thead><tbody>${formasRows}${outrasRows}</tbody></table>${topRows ? `<h2>Top 5 produtos</h2><table><thead><tr><th>#</th><th>Produto</th><th style="text-align:right;">Qtd</th><th style="text-align:right;">Total</th></tr></thead><tbody>${topRows}</tbody></table>` : ""}<h2>Fechamentos (${relData.totalFechamentos})</h2><table><thead><tr><th>Horário</th><th>Origem</th><th style="text-align:right;">Total</th><th>Pagamento</th></tr></thead><tbody>${fechRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#999;">Nenhum</td></tr>'}</tbody></table><p style="color:#999;font-size:10px;margin-top:24px;text-align:center;">Gerado em ${new Date().toLocaleString("pt-BR")}</p></body></html>`;
                  const w = window.open("", "_blank");
                  if (w) { w.document.write(html); w.document.close(); }
                }}>
                <Printer className="h-3.5 w-3.5" />Exportar PDF
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Últimos fechamentos */}
      {!dashLoading && dashUltimosFechamentos.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Últimos fechamentos</p>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {dashUltimosFechamentos.map((f, i) => {
              const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
              const origemLabel = f.origem === "mesa" ? `Mesa ${f.mesa_numero || "?"}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem || "—";
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3">
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
    </div>
  );
};

export default AdminRelatorios;
