/**
 * CaixaDeliveryPanel — extracted from CaixaPage lines ~1808-2131.
 * NO logic changes from original.
 */
import { Bell, Clock, MapPin, MessageCircle, Plus, Search, ShoppingBag, Truck, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, normStr, parseCurrencyInput } from "./caixaHelpers";
import type { Bairro } from "@/lib/deliveryStorage";
import { sendWhatsAppMessage, buildDeliveryStatusMessage } from "@/lib/whatsappNotify";

interface PedidoBalcao {
  id: string;
  numeroPedido: number;
  clienteNome?: string;
  clienteTelefone?: string;
  enderecoCompleto?: string;
  bairro?: string;
  referencia?: string;
  statusBalcao?: string;
  canceladoMotivo?: string;
  total: number;
  motoboyNome?: string;
  formaPagamentoDelivery?: string;
  origem: string;
  criadoEmIso: string;
  itens: Array<{ uid: string; nome: string; quantidade: number; precoUnitario: number }>;
  [key: string]: any;
}

interface MotoboyAtivo {
  nome: string;
  emRota: number;
  entregues: number;
}

interface CaixaDeliveryPanelProps {
  pedidosDeliveryAtivos: PedidoBalcao[];
  pedidosAguardandoConfirmacao: PedidoBalcao[];
  pedidosParaRetirar: PedidoBalcao[];
  pedidosEmRota: PedidoBalcao[];
  pedidosEntregues: PedidoBalcao[];
  pedidosDevolvidos: PedidoBalcao[];
  motoboyAtivos: MotoboyAtivo[];
  fechamentosPendentes: any[];
  setFechamentoSelecionado: (v: any) => void;
  setPinConferencia: (v: string) => void;
  setPinConferenciaErro: (v: string) => void;
  filtroMotoboy: string | null;
  setFiltroMotoboy: (v: string | null) => void;
  mostrarEntregues: boolean;
  setMostrarEntregues: (v: boolean | ((prev: boolean) => boolean)) => void;
  buscaDelivery: string;
  setBuscaDelivery: (v: string) => void;
  bairrosCache: Bairro[];
  confirmTempoId: string | null;
  setConfirmTempoId: (v: string | null) => void;
  confirmTempo: string;
  setConfirmTempo: (v: string) => void;
  confirmTempoCustom: string;
  setConfirmTempoCustom: (v: string) => void;
  confirmTaxaEntrega: string;
  setConfirmTaxaEntrega: (v: string) => void;
  sistemaConfig: any;
  confirmarPedidoBalcao: (id: string, taxa?: number) => void;
  marcarBalcaoPronto: (id: string) => void;
  rejeitarPedidoBalcao: (id: string, motivo: string) => void;
  handleSelecionarBalcao: (id: string) => void;
  setRejectDialogOpen: (v: boolean) => void;
  setRejectPedidoId: (v: string | null) => void;
  setRejectMotivo: (v: string) => void;
  setBalcaoTipo: (v: "balcao" | "delivery") => void;
  setBalcaoOpen: (v: boolean) => void;
}

const CaixaDeliveryPanel = ({
  pedidosDeliveryAtivos, pedidosAguardandoConfirmacao,
  pedidosParaRetirar, pedidosEmRota, pedidosEntregues, pedidosDevolvidos,
  motoboyAtivos, fechamentosPendentes,
  setFechamentoSelecionado, setPinConferencia, setPinConferenciaErro,
  filtroMotoboy, setFiltroMotoboy, mostrarEntregues, setMostrarEntregues,
  buscaDelivery, setBuscaDelivery, bairrosCache,
  confirmTempoId, setConfirmTempoId, confirmTempo, setConfirmTempo,
  confirmTempoCustom, setConfirmTempoCustom, confirmTaxaEntrega, setConfirmTaxaEntrega,
  sistemaConfig,
  confirmarPedidoBalcao, marcarBalcaoPronto, rejeitarPedidoBalcao,
  handleSelecionarBalcao, setRejectDialogOpen, setRejectPedidoId, setRejectMotivo,
  setBalcaoTipo, setBalcaoOpen,
}: CaixaDeliveryPanelProps) => {

  const filtrarPedidos = (lista: PedidoBalcao[]) => {
    let resultado = lista;
    if (filtroMotoboy) {
      resultado = resultado.filter(p => p.motoboyNome === filtroMotoboy);
    }
    if (buscaDelivery.trim()) {
      const q = buscaDelivery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      resultado = resultado.filter(p => {
        const nome = (p.clienteNome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const tel = (p.clienteTelefone || "").replace(/\D/g, "");
        return nome.includes(q) || tel.includes(q) || String(p.numeroPedido).includes(q);
      });
    }
    return resultado;
  };

  const renderCardDelivery = (pb: PedidoBalcao) => {
    const isPronto = pb.statusBalcao === "pronto";
    const isSaiu = pb.statusBalcao === "saiu";
    const isEntregue = pb.statusBalcao === "entregue";
    const isPago = pb.statusBalcao === "pago";
    const isDevolvido = pb.statusBalcao === "devolvido";
    const borderClass = isDevolvido
      ? "border-orange-500/60 bg-orange-500/8 ring-1 ring-orange-500/30 animate-pulse"
      : isPronto
      ? "border-emerald-500/60 bg-emerald-500/8 animate-pulse"
      : isSaiu
      ? "border-blue-500/50 bg-blue-500/8"
      : isEntregue || isPago
      ? "border-border/30 bg-card/40"
      : "border-amber-500/30 bg-amber-500/5";
    const badgeLabel = isDevolvido ? "⚠ Devolvido"
      : isPronto ? "Pronto p/ retirar"
      : isSaiu ? `Em rota — ${pb.motoboyNome || ""}`
      : isEntregue ? "Entregue"
      : isPago ? "Pago"
      : "Aguardando cozinha";
    const badgeClass = isDevolvido
      ? "border-orange-500/40 bg-orange-500/15 text-orange-400 font-black"
      : isPronto
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-black"
      : isSaiu
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold"
      : isEntregue || isPago
      ? "border-border bg-secondary/50 text-muted-foreground"
      : "border-amber-500/25 bg-amber-500/10 text-amber-400";
    return (
      <div key={pb.id} className={`rounded-2xl border p-4 space-y-3 transition-colors ${borderClass}`}>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-foreground truncate">{pb.clienteNome || "—"}</p>
            {pb.enderecoCompleto && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{pb.enderecoCompleto}{pb.bairro ? ` — ${pb.bairro}` : ""}</span>
              </p>
            )}
            {pb.clienteTelefone && (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-xs text-muted-foreground">{pb.clienteTelefone}</p>
                <a href={`https://wa.me/55${pb.clienteTelefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-secondary transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            {pb.motoboyNome && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm">🏍️</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  isSaiu ? "bg-blue-500/15 text-blue-400 border-blue-500/25" : "bg-secondary text-muted-foreground border-border"
                }`}>{pb.motoboyNome}</span>
              </div>
            )}
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {pb.itens.slice(0, 3).map((it, idx) => (
            <p key={idx} className="truncate">{it.quantidade}× {it.nome}</p>
          ))}
          {pb.itens.length > 3 && <p className="text-muted-foreground/60">+{pb.itens.length - 3} itens...</p>}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-lg font-black tabular-nums text-foreground">{formatPrice(pb.total)}</span>
          <Button size="sm" variant="outline" onClick={() => handleSelecionarBalcao(pb.id)}
            className="rounded-xl font-bold gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" /> Ver comanda / Receber
          </Button>
        </div>
        {isDevolvido && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
            <p className="text-xs font-black text-orange-400">⚠ Motoboy não conseguiu entregar</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { marcarBalcaoPronto(pb.id); toast.success("Pedido voltou para fila"); }}>
                🔄 Reenviar
              </Button>
              <Button size="sm" variant="destructive" className="flex-1 rounded-xl text-xs font-bold"
                onClick={() => { rejeitarPedidoBalcao(pb.id, "Cancelado após devolução"); toast.error(`Pedido #${pb.numeroPedido} cancelado`); }}>
                ✕ Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <Truck className="h-5 w-5 text-purple-400" />
        <h2 className="text-base font-black text-foreground flex-1">Pedidos Delivery</h2>
        <Button
          size="sm"
          onClick={() => { setBalcaoTipo("delivery"); setBalcaoOpen(true); }}
          className="rounded-xl font-black gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo delivery
        </Button>
      </div>

      {/* Fechamentos pendentes de motoboys */}
      {fechamentosPendentes.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/8 p-4 space-y-3">
          <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            {fechamentosPendentes.length} motoboy(s) solicitando fechamento
          </h3>
          <div className="space-y-2">
            {fechamentosPendentes.map((f: any) => (
              <button key={f.id} onClick={() => { setFechamentoSelecionado(f); setPinConferencia(""); setPinConferenciaErro(""); }}
                className="w-full text-left rounded-xl border border-amber-500/25 bg-card p-3 hover:border-amber-500/60 transition-colors active:scale-[0.99]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-foreground">🏍️ {f.motoboy_nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.resumo?.totalEntregas ?? 0} entregas · {new Date(f.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total a prestar</p>
                    <p className="text-xl font-black text-amber-400">R$ {(f.resumo?.totalAPrestar ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Campo de busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou nº do pedido..."
          value={buscaDelivery}
          onChange={e => setBuscaDelivery(e.target.value)}
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {buscaDelivery && (
          <button onClick={() => setBuscaDelivery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Painel de motoboys ativos */}
      {motoboyAtivos.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mr-1">🏍️ Motoboys:</span>
          {filtroMotoboy && (
            <button onClick={() => setFiltroMotoboy(null)}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> Todos
            </button>
          )}
          {motoboyAtivos.map(m => (
            <button
              key={m.nome}
              onClick={() => setFiltroMotoboy(filtroMotoboy === m.nome ? null : m.nome)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                filtroMotoboy === m.nome
                  ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                  : "border-border bg-card text-foreground hover:border-blue-500/30"
              }`}
            >
              <span>{m.nome}</span>
              {m.emRota > 0 && (
                <span className="rounded-full bg-blue-500/20 text-blue-400 px-1.5 text-[10px] font-black">{m.emRota} rota</span>
              )}
              {m.entregues > 0 && (
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 text-[10px] font-black">{m.entregues} ✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* SEÇÃO 1: Devolvidos — ação urgente */}
      {filtrarPedidos(pedidosDevolvidos).length > 0 && (
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse inline-block" />
            ⚠ Devolvidos — resolver agora ({filtrarPedidos(pedidosDevolvidos).length})
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtrarPedidos(pedidosDevolvidos).map(pb => renderCardDelivery(pb))}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: Aguardando confirmação */}
      {pedidosAguardandoConfirmacao.length > 0 && (
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            Aguardando confirmação ({pedidosAguardandoConfirmacao.length})
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {pedidosAguardandoConfirmacao.map((pb) => (
              <div
                key={pb.id}
                className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/8 p-4 space-y-3 animate-pulse"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{pb.clienteNome || "—"}</p>
                  {pb.enderecoCompleto && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{pb.enderecoCompleto}{pb.bairro ? ` — ${pb.bairro}` : ""}</span>
                    </p>
                  )}
                  {pb.clienteTelefone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-muted-foreground">{pb.clienteTelefone}</p>
                      <a href={`https://wa.me/55${pb.clienteTelefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-secondary transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                  {(() => {
                    const mins = Math.floor((Date.now() - new Date(pb.criadoEmIso).getTime()) / 60000);
                    const cor = mins >= 15 ? "text-red-500 font-black animate-pulse" : mins >= 8 ? "text-amber-400 font-bold" : "text-muted-foreground";
                    return (
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${cor}`}>
                        <Clock className="h-3 w-3 shrink-0" />
                        Aguardando há {mins < 1 ? "menos de 1 min" : `${mins} min`}
                      </p>
                    );
                  })()}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {pb.itens.slice(0, 4).map((it, idx) => (
                    <p key={idx} className="truncate">{it.quantidade}× {it.nome}</p>
                  ))}
                  {pb.itens.length > 4 && <p className="text-muted-foreground/60">+{pb.itens.length - 4} itens...</p>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                  <span className="text-lg font-black tabular-nums text-foreground">{formatPrice(pb.total)}</span>
                </div>
                {confirmTempoId === pb.id ? (
                  <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-foreground">Taxa de entrega (R$)</p>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={confirmTaxaEntrega}
                        onChange={(e) => setConfirmTaxaEntrega(e.target.value)}
                        className="h-8 text-xs rounded-lg"
                      />
                      {(() => {
                        const bairros = bairrosCache.filter((b) => b.ativo);
                        const bairroPedido = pb.bairro || "";
                        const match = bairroPedido ? bairros.find((b) => normStr(b.nome) === normStr(bairroPedido)) : null;
                        if (match && parseCurrencyInput(confirmTaxaEntrega) > 0) {
                          return <p className="text-[10px] text-emerald-400 font-bold">Taxa automática — {match.nome}: {formatPrice(parseCurrencyInput(confirmTaxaEntrega))}</p>;
                        }
                        if (parseCurrencyInput(confirmTaxaEntrega) > 0) {
                          return <p className="text-[10px] text-emerald-400 font-bold">Taxa: {formatPrice(parseCurrencyInput(confirmTaxaEntrega))}</p>;
                        }
                        if (!match && bairroPedido) {
                          return <p className="text-[10px] text-amber-400 font-bold">Bairro "{bairroPedido}" sem taxa cadastrada</p>;
                        }
                        return null;
                      })()}
                    </div>
                    <p className="text-xs font-black text-foreground">Tempo estimado de entrega</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["20 min", "30 min", "45 min", "60 min"].map((t) => (
                        <Button
                          key={t}
                          size="sm"
                          variant={confirmTempo === t ? "default" : "outline"}
                          className="rounded-lg text-xs h-7 px-2.5"
                          onClick={() => { setConfirmTempo(t); setConfirmTempoCustom(""); }}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                    <Input
                      placeholder="Ou digite manualmente (ex: 50 min)"
                      value={confirmTempoCustom}
                      onChange={(e) => { setConfirmTempoCustom(e.target.value); setConfirmTempo(""); }}
                      className="h-8 text-xs rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const taxaVal = parseCurrencyInput(confirmTaxaEntrega);
                          const taxaFinal = Number.isFinite(taxaVal) && taxaVal > 0 ? taxaVal : 0;
                          confirmarPedidoBalcao(pb.id, taxaFinal > 0 ? taxaFinal : undefined);
                          toast.success(`Pedido #${pb.numeroPedido} confirmado!`, { duration: 1600, icon: "✅" });
                          const tel = (pb.clienteTelefone || "").replace(/\D/g, "");
                          if (tel) {
                            const itensStr = pb.itens.map((it) => `${it.quantidade}x ${it.nome}`).join(", ");
                            const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                            const tempoFinal = confirmTempoCustom.trim() || confirmTempo;
                            let msg = `✅ Pedido %23${pb.numeroPedido} confirmado! — ${nomeRest}\n\n${itensStr}\n\nTotal: ${formatPrice(pb.total)}`;
                            if (tempoFinal) msg += `\nPrevisão: ${tempoFinal}`;
                            msg += `\n\nObrigado! 🍔`;
                            window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
                          }
                          setConfirmTempoId(null);
                          setConfirmTempo("");
                          setConfirmTempoCustom("");
                          setConfirmTaxaEntrega("");
                        }}
                        className="flex-1 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Confirmar com este tempo
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setConfirmTempoId(null); setConfirmTaxaEntrega(""); }} className="rounded-xl text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setConfirmTempoId(pb.id);
                        setConfirmTempo("");
                        setConfirmTempoCustom("");
                        const bairros = bairrosCache.filter((b) => b.ativo);
                        const bairroPedido = pb.bairro || "";
                        const match = bairroPedido ? bairros.find((b) => normStr(b.nome) === normStr(bairroPedido)) : null;
                        setConfirmTaxaEntrega(match ? match.taxa.toFixed(2).replace(".", ",") : "");
                      }}
                      className="flex-1 rounded-xl font-black gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      ✅ Confirmar e avisar cliente
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { setRejectPedidoId(pb.id); setRejectMotivo(""); setRejectDialogOpen(true); }}
                      className="rounded-xl font-black gap-1.5"
                    >
                      ❌ Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO 3: Prontos para retirar */}
      {filtrarPedidos(pedidosParaRetirar).length > 0 && (
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Prontos p/ retirar ({filtrarPedidos(pedidosParaRetirar).length})
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtrarPedidos(pedidosParaRetirar).map(pb => renderCardDelivery(pb))}
          </div>
        </div>
      )}

      {/* SEÇÃO 4: Em rota */}
      {filtrarPedidos(pedidosEmRota).length > 0 && (
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
            Em rota ({filtrarPedidos(pedidosEmRota).length})
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtrarPedidos(pedidosEmRota).map(pb => renderCardDelivery(pb))}
          </div>
        </div>
      )}

      {/* SEÇÃO 5: Entregues — colapsável */}
      {pedidosEntregues.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setMostrarEntregues(prev => !prev)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />
              Entregues hoje ({pedidosEntregues.length})
            </span>
            <span>{mostrarEntregues ? "▲ Ocultar" : "▼ Ver histórico"}</span>
          </button>
          {mostrarEntregues && (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 opacity-60">
              {filtrarPedidos(pedidosEntregues).map(pb => renderCardDelivery(pb))}
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {pedidosDeliveryAtivos.length === 0 && pedidosAguardandoConfirmacao.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Truck className="h-12 w-12 opacity-20" />
          <p className="text-sm font-semibold">Nenhum delivery ativo no momento</p>
        </div>
      )}
    </div>
  );
};

export default CaixaDeliveryPanel;
