import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChefHat, Clock, ShoppingBag, User } from "lucide-react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import type { PedidoRealizado } from "@/contexts/RestaurantContext";
import { getSistemaConfig } from "@/lib/adminStorage";

const minutesAgo = (isoDate: string) => {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / 60_000));
};
const MAX_ELAPSED_MINUTES = 120;
const formatElapsed = (mins: number) => {
  if (mins > MAX_ELAPSED_MINUTES) return "tempo indisponível";
  if (mins >= 40) return "Tempo crítico";
  if (mins < 1) return "agora";
  if (mins === 1) return "há 1 min";
  return `há ${mins} min`;
};
const formatTime = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const origemLabel = (origem: string) =>
  origem === "garcom" ? "Garçom" : origem === "caixa" ? "Caixa" : origem === "balcao" ? "Balcão" : origem === "delivery" ? "Delivery" : "Cliente";

type SomOrigem = "mesa" | "delivery" | "balcao";

function tocarSom(tipo: "novo_pedido" | "alerta", ctxRef: React.MutableRefObject<AudioContext | null>, origem?: SomOrigem) {
  try {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    if (tipo === "novo_pedido") {
      if (origem === "delivery") {
        // Delivery: three higher-pitched notes
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 1046;
          osc.type = "sine";
          gain.gain.value = 0.3;
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.2);
          osc.stop(ctx.currentTime + i * 0.2 + 0.15);
        }
      } else if (origem === "balcao") {
        // Balcão: two lower-pitched notes
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 523;
          osc.type = "sine";
          gain.gain.value = 0.3;
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.3);
          osc.stop(ctx.currentTime + i * 0.3 + 0.2);
        }
      } else {
        // Mesa (cliente/garcom): two standard notes
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.value = 0.3;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 660;
        osc.type = "sine";
        gain.gain.value = 0.3;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.15);
      }
    }
  } catch {}
}

const CozinhaPage = () => {
  const { mesas, pedidosBalcao, marcarPedidoPronto, marcarPedidoBalcaoPronto } = useRestaurant();
  const [, setTick] = useState(0);
  const [clock, setClock] = useState(() => formatTime(new Date()));
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevIdsRef = useRef<Set<string> | null>(null);
  const printedIdsRef = useRef<Set<string> | null>(null);
  const initialLoadRef = useRef(true);
  const [filtroOrigem, setFiltroOrigem] = useState<"todos" | "mesa" | "delivery" | "balcao">("todos");
  

  useEffect(() => {
    const id = setInterval(() => { setTick((t) => t + 1); setClock(formatTime(new Date())); }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Build active pedidos for rendering
  const activePedidos = useMemo(() => {
    const all: (PedidoRealizado & { mesaNumero: number; isBalcao?: boolean })[] = [];
    for (const mesa of mesas) {
      if (mesa.status === "livre") continue;
      for (const pedido of mesa.pedidos) {
        if (!pedido.pronto) all.push({ ...pedido, mesaNumero: mesa.numero });
      }
    }
    for (const pedido of pedidosBalcao) {
      if (!pedido.pronto && pedido.statusBalcao !== "pago" && pedido.statusBalcao !== "aguardando_confirmacao") all.push({ ...pedido, mesaNumero: 0, isBalcao: true });
    }
    all.sort((a, b) => new Date(a.criadoEmIso).getTime() - new Date(b.criadoEmIso).getTime());
    return all;
  }, [mesas, pedidosBalcao]);


  const pedidosFiltrados = useMemo(() => {
    if (filtroOrigem === "todos") return activePedidos;
    if (filtroOrigem === "delivery") return activePedidos.filter(p => p.origem === "delivery");
    if (filtroOrigem === "balcao") return activePedidos.filter(p => p.origem === "balcao" || p.isBalcao);
    return activePedidos.filter(p => p.origem !== "delivery" && !p.isBalcao);
  }, [activePedidos, filtroOrigem]);

  // Sound notification when new orders arrive — detect by origin
  useEffect(() => {
    const currentIds = new Set(activePedidos.map((p) => p.id));
    if (prevIdsRef.current !== null) {
      const newPedidos = activePedidos.filter((p) => !prevIdsRef.current!.has(p.id));
      if (newPedidos.length > 0) {
        // Play sound based on the first new order's origin
        const firstNew = newPedidos[0];
        let somOrigem: SomOrigem = "mesa";
        if (firstNew.origem === "delivery") somOrigem = "delivery";
        else if (firstNew.origem === "balcao") somOrigem = "balcao";
        tocarSom("novo_pedido", audioCtxRef, somOrigem);
        document.title = "🔴 NOVO PEDIDO — Cozinha";
        const timer = setTimeout(() => { document.title = "Cozinha — Orderly Table"; }, 5000);
        return () => clearTimeout(timer);
      }
    }
    prevIdsRef.current = currentIds;
  }, [activePedidos]);

  // Auto-print new orders
  useEffect(() => {
    if (printedIdsRef.current === null) {
      // First load — populate set without printing
      printedIdsRef.current = new Set(activePedidos.map((p) => p.id));
      initialLoadRef.current = false;
      return;
    }
    const nomeRest = getSistemaConfig().nomeRestaurante || "Restaurante";
    const newPedidos = activePedidos.filter((p) => !printedIdsRef.current!.has(p.id));
    for (const pedido of newPedidos) {
      printedIdsRef.current.add(pedido.id);
      // Detect if ADIÇÃO: another active order from same mesa exists
      const isBalcaoOrder = pedido.origem === "balcao";
      const isDeliveryOrder = pedido.origem === "delivery";
      const isParaViagem = pedido.paraViagem === true;
      const isAdicao = !isBalcaoOrder && !isDeliveryOrder && pedido.mesaId &&
        activePedidos.some((p) => p.id !== pedido.id && p.mesaId === pedido.mesaId);

      const tipoLabel = isBalcaoOrder
        ? `Balcão — ${pedido.clienteNome || "Cliente"}`
        : isDeliveryOrder
          ? `Delivery — ${pedido.clienteNome || "Cliente"}`
          : `Mesa ${String(pedido.mesaNumero).padStart(2, "0")}`;

      const hora = new Date(pedido.criadoEmIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      let specialBlock = "";
      if (isAdicao) {
        specialBlock += `<div class="c-special">*** ADIÇÃO DE PEDIDO ***</div><div class="c-note">Item(ns) anteriores já em preparo</div>`;
      }
      if (isParaViagem) {
        specialBlock += `<div class="c-special c-viagem">*** PARA LEVAR — EMBALAR ***</div>`;
      }

      const itensHtml = pedido.itens.map((it) => {
        let line = `<div class="c-item"><span class="c-qty">${it.quantidade}x</span> ${it.nome}</div>`;
        if (it.adicionais.length > 0) line += `<div class="c-add">+ ${it.adicionais.map((a) => a.nome).join(", ")}</div>`;
        if (it.removidos.length > 0) line += `<div class="c-rem">- Sem ${it.removidos.join(", ")}</div>`;
        if (it.gruposEscolhidos?.length) {
          for (const g of it.gruposEscolhidos) {
            const t = (g as any).tipo || "adicional";
            if (t === "retirar") {
              line += `<div class="c-rem">SEM ${g.opcoes.map(o => o.nome).join(" • SEM ")}</div>`;
            } else if (t === "adicional") {
              const opcNomes = g.opcoes.map(o => `+ ${o.nome}${o.preco > 0 ? ` (R$ ${o.preco.toFixed(2).replace(".", ",")})` : ""}`);
              line += `<div class="c-add">${opcNomes.join(" • ")}</div>`;
            } else {
              line += `<div class="c-add">${g.grupoNome}: ${g.opcoes.map(o => o.nome).join(", ")}</div>`;
            }
          }
        }
        if (it.observacoes) line += `<div class="c-obs">${it.observacoes}</div>`;
        return line;
      }).join("");

      // Delivery: big number header + QR + client info
      let deliveryHeaderBlock = "";
      if (isDeliveryOrder) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=RETIRADA:${pedido.id}`;
        const clienteNome = pedido.clienteNome || "Cliente";
        const clienteTel = (pedido as any).clienteTelefone || "";
        const endereco = (pedido as any).enderecoCompleto || (pedido as any).endereco || "";
        const bairro = (pedido as any).bairro || "";
        const endFull = [endereco, bairro].filter(Boolean).join(" — ");
        deliveryHeaderBlock = `
          <div class="c-entrega-num">ENTREGA #${pedido.numeroPedido}</div>
          <div class="c-qr"><img src="${qrUrl}" width="150" height="150" alt="QR"/></div>
          <div class="c-cliente-info">
            <div><strong>Nome:</strong> ${clienteNome}</div>
            ${endFull ? `<div><strong>End:</strong> ${endFull}</div>` : ""}
            ${clienteTel ? `<div><strong>Tel:</strong> ${clienteTel}</div>` : ""}
          </div>
          <div class="c-divider"></div>`;
      }

      const deliveryInfo = !isDeliveryOrder && (pedido as any).endereco
        ? `<div class="c-note">${(pedido as any).endereco}</div>` : "";

      // Total for delivery
      const totalBlock = isDeliveryOrder
        ? `<div class="c-total">TOTAL: R$ ${pedido.total.toFixed(2)}</div>${(pedido as any).formaPagamentoDelivery ? `<div class="c-pagamento">${(pedido as any).formaPagamentoDelivery.toUpperCase()}</div>` : ""}`
        : "";

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda #${pedido.numeroPedido}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;width:80mm;padding:4mm;color:#000;background:#fff}
.c-header{text-align:center;font-size:16px;font-weight:900;margin-bottom:4px}
.c-entrega-num{text-align:center;font-size:48px;font-weight:900;margin:8px 0;letter-spacing:2px}
.c-qr{text-align:center;margin:8px 0}
.c-cliente-info{font-size:12px;margin:6px 0;line-height:1.6}
.c-tipo{text-align:center;font-size:14px;font-weight:700;margin-bottom:2px}
.c-num{text-align:center;font-size:12px;margin-bottom:6px}
.c-divider{border-top:1px dashed #000;margin:6px 0}
.c-special{text-align:center;font-size:16px;font-weight:900;padding:6px 0;border-top:2px solid #000;border-bottom:2px solid #000;margin:6px 0;letter-spacing:1px}
.c-viagem{background:#f59e0b;color:#000}
.c-note{text-align:center;font-size:11px;margin-bottom:4px}
.c-item{font-size:13px;font-weight:700;margin:4px 0 1px}
.c-qty{font-weight:900}
.c-add{font-size:11px;color:#333;margin-left:16px}
.c-rem{font-size:11px;color:#900;margin-left:16px}
.c-obs{font-size:11px;font-style:italic;margin-left:16px;color:#555}
.c-total{text-align:center;font-size:16px;font-weight:900;margin:6px 0}
.c-pagamento{text-align:center;font-size:13px;font-weight:700;margin-bottom:4px}
</style></head><body>
<div class="c-header">${nomeRest}</div>
${deliveryHeaderBlock}
<div class="c-tipo">${tipoLabel}</div>
<div class="c-num">Pedido #${pedido.numeroPedido} — ${hora}</div>
${deliveryInfo}
${specialBlock}
<div class="c-divider"></div>
${itensHtml}
<div class="c-divider"></div>
${totalBlock}
${pedido.observacaoGeral ? `<div class="c-obs">Obs: ${pedido.observacaoGeral}</div>` : ""}
</body></html>`;

      try {
        const w = window.open("", "_blank", "width=350,height=600");
        if (w) {
          w.document.write(html);
          w.document.close();
        }
      } catch {}
    }
  }, [activePedidos]);

  useEffect(() => {
    return () => { document.title = "Orderly Table"; };
  }, []);

  const handlePronto = useCallback(
    (mesaId: string, pedidoId: string, isBalcao?: boolean) => {
      setFadingOut((prev) => new Set(prev).add(pedidoId));
      setTimeout(() => {
        if (isBalcao) marcarPedidoBalcaoPronto(pedidoId);
        else marcarPedidoPronto(mesaId, pedidoId);
        setFadingOut((prev) => { const next = new Set(prev); next.delete(pedidoId); return next; });
      }, 200);
    },
    [marcarPedidoPronto, marcarPedidoBalcaoPronto],
  );

  return (
    <div className="min-h-svh bg-background p-4 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ChefHat className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-black text-foreground">Cozinha</h1>
          <p className="text-xs text-muted-foreground">
            {activePedidos.length === 0 ? "Nenhum pedido pendente" : `${pedidosFiltrados.length} pedido${pedidosFiltrados.length > 1 ? "s" : ""} ativo${pedidosFiltrados.length > 1 ? "s" : ""}${filtroOrigem !== "todos" ? " (filtrado)" : ""}`}
          </p>
        </div>
        <span className="text-xl font-black tabular-nums text-foreground">{clock}</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-status-consumo ml-2">
          <span className="h-1.5 w-1.5 rounded-full bg-status-consumo animate-pulse" />
          Ao vivo
        </span>
      </div>

      <div className="flex gap-2 px-4 pb-3 flex-wrap">
        {([
          { id: "todos", label: "Todos" },
          { id: "mesa", label: "🍽️ Mesas" },
          { id: "delivery", label: "🛵 Delivery" },
          { id: "balcao", label: "🏪 Balcão" },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFiltroOrigem(f.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold border transition-colors ${
              filtroOrigem === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {pedidosFiltrados.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-muted-foreground">
          <ChefHat className="h-16 w-16 opacity-15" />
          <p className="text-base font-bold">Nenhum pedido na fila</p>
          <p className="text-sm">Os pedidos aparecerão aqui automaticamente.</p>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {pedidosFiltrados.map((pedido, i) => {
          const mins = minutesAgo(pedido.criadoEmIso);
          const isLate = mins >= 15 && mins <= MAX_ELAPSED_MINUTES;
          const isCritical = mins >= 40 && mins <= MAX_ELAPSED_MINUTES;
          const isWarning = mins >= 20 && mins <= MAX_ELAPSED_MINUTES;
          const isBalcaoOrder = pedido.origem === "balcao";
          const isDeliveryOrder = pedido.origem === "delivery";
          const isParaViagem = pedido.paraViagem === true;

          return (
            <div
              key={pedido.id}
              className={`slide-up flex flex-col rounded-2xl border bg-card transition-all ${fadingOut.has(pedido.id) ? "fade-out-remove" : ""} ${
                isLate
                  ? "border-destructive/60 animate-pulse shadow-[0_0_20px_hsl(var(--destructive)/0.2)]"
                  : isParaViagem
                    ? "border-amber-500/60"
                    : "border-border"
              }`}
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: 'both' }}
            >
              {isParaViagem && (
                <div style={{background:'#f59e0b', color:'#000', fontWeight:900, textAlign:'center', padding:'8px', fontSize:'14px', letterSpacing:'0.05em', borderRadius:'1rem 1rem 0 0'}}>
                  🛍 EMBALAR PARA LEVAR
                </div>
              )}
              {/* Origin / viagem badges */}
              {(isBalcaoOrder || isDeliveryOrder || isParaViagem) && (
                <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                  {isBalcaoOrder && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-black text-amber-400">
                      {isParaViagem && <ShoppingBag className="h-3 w-3" />}
                      BALCÃO{pedido.clienteNome ? ` — ${pedido.clienteNome}` : ""}
                    </span>
                  )}
                  {isDeliveryOrder && (
                    <span className="inline-block rounded-lg bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 text-xs font-black text-purple-400">
                      DELIVERY — {pedido.clienteNome || "Cliente"}
                    </span>
                  )}
                  {isParaViagem && !isDeliveryOrder && !isBalcaoOrder && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/30 border border-amber-500/60 px-2.5 py-1 text-xs font-black text-amber-400">
                      <ShoppingBag className="h-3 w-3" />
                      PARA VIAGEM
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-2xl font-black text-foreground leading-none">
                    {isBalcaoOrder || isDeliveryOrder
                      ? (isBalcaoOrder ? "Balcão" : "Delivery")
                      : `Mesa ${String(pedido.mesaNumero).padStart(2, "0")}${isParaViagem ? " — Para levar" : ""}`}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">#{pedido.numeroPedido}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-2.5 w-2.5" />
                      {origemLabel(pedido.origem)}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold ${
                  isCritical ? "bg-destructive/20 text-destructive animate-pulse" : isWarning ? "bg-destructive/15 text-destructive animate-pulse" : isLate ? "bg-destructive/10 text-destructive" : mins >= 8 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  <Clock className="h-3 w-3" />
                  {formatElapsed(mins)}
                </div>
              </div>

              <div className="flex-1 space-y-1.5 p-4">
                {pedido.itens.map((item) => (
                  <div key={item.uid} className="flex items-start gap-2">
                    <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-black tabular-nums text-foreground">{item.quantidade}×</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground leading-snug">{item.nome}</p>
                      {item.adicionais.length > 0 && <p className="text-xs text-primary mt-0.5">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>}
                      {item.gruposEscolhidos?.map((g, gi) => {
                        const t = (g as any).tipo || "adicional";
                        if (t === "retirar") {
                          return <p key={gi} className="text-xs text-destructive mt-0.5 font-bold">SEM {g.opcoes.map(o => o.nome).join(" • SEM ")}</p>;
                        }
                        if (t === "adicional") {
                          return <p key={gi} className="text-xs mt-0.5" style={{ color: "#16a34a" }}>+ {g.opcoes.map(o => o.nome).join(", ")}</p>;
                        }
                        return <p key={gi} className="text-xs text-foreground mt-0.5">{g.grupoNome}: {g.opcoes.map(o => o.nome).join(", ")}</p>;
                      })}
                      {item.removidos.length > 0 && <p className="text-xs text-destructive mt-0.5">Sem {item.removidos.join(", ")}</p>}
                      {item.observacoes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.observacoes}</p>}
                    </div>
                  </div>
                ))}
                {pedido.observacaoGeral && (
                  <p className="text-xs text-muted-foreground italic border-t border-border pt-1.5 mt-2">Obs: {pedido.observacaoGeral}</p>
                )}
              </div>

              <div className="p-3 pt-0">
                <button
                  type="button"
                  onClick={() => handlePronto(pedido.mesaId, pedido.id, (pedido as any).isBalcao)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-status-consumo py-3.5 text-sm font-black text-white transition-all hover:bg-status-consumo/90 active:scale-[0.98]"
                >
                  <Check className="h-4 w-4" />
                  Marcar como pronto
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CozinhaPage;
