import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bike, LogOut, MapPin, Phone, DollarSign, Clock, Map, Navigation, QrCode, GripVertical, CheckCircle2, Package, XCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSistemaConfig } from "@/lib/adminStorage";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import jsQR from "jsqr";

const SESSAO_KEY = "obsidian-motoboy-sessao-v1";
const MOTOBOY_LIST_KEY = "obsidian-motoboys-v1";
const ORDEM_KEY = "obsidian-motoboy-ordem-v1";

type Motoboy = { id: string; nome: string; pinHash: string; ativo: boolean };

const getMotoboys = (): Motoboy[] => {
  try { const raw = localStorage.getItem(MOTOBOY_LIST_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const getSessao = (): { id: string; nome: string } | null => {
  try { const raw = localStorage.getItem(SESSAO_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

const getOrdem = (): string[] => {
  try { const raw = localStorage.getItem(ORDEM_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveOrdem = (ids: string[]) => localStorage.setItem(ORDEM_KEY, JSON.stringify(ids));

export default function MotoboyPage() {
  const sysConfig = getSistemaConfig();
  const NOME_REST = sysConfig.nomeRestaurante || "Restaurante";
  const LOGO = sysConfig.logoBase64 || sysConfig.logoUrl || "";
  const INITIALS = NOME_REST.slice(0, 2).toUpperCase();

  const { pedidosBalcao, marcarBalcaoSaiu, marcarBalcaoEntregue, cancelarEntregaMotoboy } = useRestaurant();
  const [sessao, setSessao] = useState<{ id: string; nome: string } | null>(() => getSessao());
  const [nomeInput, setNomeInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [scanningPedidoId, setScanningPedidoId] = useState<string | null>(null);
  const [generalScan, setGeneralScan] = useState(false);
  const [activeTab, setActiveTab] = useState<"rota" | "entregues">("rota");
  const [ordem, setOrdem] = useState<string[]>(() => getOrdem());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const dragOverId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const motoboys = getMotoboys().filter((m) => m.ativo);

  // ── Login ──
  const handleLogin = useCallback(() => {
    setLoginError("");
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const motoboy = motoboys.find((m) => norm(m.nome) === norm(nomeInput));
    if (!motoboy) { setLoginError("Nome ou PIN incorreto"); return; }
    if (pinInput.length < 4) { setLoginError("Nome ou PIN incorreto"); return; }
    const expectedHash = btoa("pin:" + pinInput);
    if (motoboy.pinHash !== expectedHash) { setLoginError("Nome ou PIN incorreto"); return; }
    const s = { id: motoboy.id, nome: motoboy.nome };
    localStorage.setItem(SESSAO_KEY, JSON.stringify(s));
    setSessao(s);
    toast.success(`Bem-vindo, ${motoboy.nome}!`);
  }, [nomeInput, pinInput, motoboys]);

  const handleLogout = () => {
    localStorage.removeItem(SESSAO_KEY);
    setSessao(null);
    setNomeInput("");
    setPinInput("");
  };

  // ── QR scan ──
  const handleScanQR = (pedidoId?: string) => {
    if (pedidoId) {
      setScanningPedidoId(pedidoId);
      setGeneralScan(false);
    } else {
      setScanningPedidoId(null);
      setGeneralScan(true);
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      await new Promise((resolve) => { img.onload = resolve; });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data?.startsWith("RETIRADA:")) {
        const pedidoId = code.data.replace("RETIRADA:", "");
        if (generalScan) {
          // General scan: find any delivery pedido with this id that is "pronto"
          const found = pedidosBalcao.find((p) => p.id === pedidoId && p.origem === "delivery" && p.statusBalcao === "pronto");
          if (found) {
            marcarBalcaoSaiu(pedidoId, sessao?.nome || "Motoboy");
            toast.success(`Pedido #${found.numeroPedido} retirado! Boa entrega. 🏍️`);
          } else {
            toast.error("Pedido não encontrado ou já retirado");
          }
        } else if (scanningPedidoId) {
          if (pedidoId === scanningPedidoId) {
            marcarBalcaoSaiu(pedidoId, sessao?.nome || "Motoboy");
            toast.success("Retirada confirmada! Boa entrega. 🏍️");
          } else {
            toast.error("QR Code não corresponde a este pedido");
          }
        }
      } else {
        toast.error("QR Code não reconhecido");
      }
    } catch {
      toast.error("Erro ao ler QR Code");
    }
    setScanningPedidoId(null);
    setGeneralScan(false);
    e.target.value = "";
  }, [scanningPedidoId, generalScan, marcarBalcaoSaiu, sessao, pedidosBalcao]);

  // ── Data — only show pedidos scanned by this motoboy ──
  const emRota = useMemo(() => {
    const pending = pedidosBalcao.filter(
      (p) => p.origem === "delivery" &&
        p.motoboyNome === sessao?.nome &&
        (p.statusBalcao === "saiu")
    );
    const ordemObj: Record<string, number> = {};
    ordem.forEach((id, i) => { ordemObj[id] = i; });
    return [...pending].sort((a, b) => {
      const ia = ordemObj[a.id] ?? 9999;
      const ib = ordemObj[b.id] ?? 9999;
      if (ia !== ib) return ia - ib;
      return new Date(a.criadoEmIso).getTime() - new Date(b.criadoEmIso).getTime();
    });
  }, [pedidosBalcao, ordem, sessao]);

  const entregues = useMemo(() =>
    pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao === "entregue" && p.motoboyNome === sessao?.nome),
    [pedidosBalcao, sessao]
  );

  // Keep ordem in sync
  useEffect(() => {
    const ids = emRota.map((p) => p.id);
    const cleaned = ordem.filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !cleaned.includes(id));
    const merged = [...cleaned, ...missing];
    if (JSON.stringify(merged) !== JSON.stringify(ordem)) {
      setOrdem(merged);
      saveOrdem(merged);
    }
  }, [emRota]);

  const buildEnderecoCompleto = (p: typeof pedidosBalcao[0]) =>
    [p.enderecoCompleto, p.bairro, p.referencia].filter(Boolean).join(", ");

  const handleVerRota = (p: typeof pedidosBalcao[0]) => {
    const addr = buildEnderecoCompleto(p);
    if (!addr) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
  };

  const handleVerTodasRotas = () => {
    const enderecos = emRota
      .filter((p) => p.statusBalcao !== "entregue")
      .map(buildEnderecoCompleto)
      .filter(Boolean);
    if (enderecos.length === 0) return;
    window.open(`https://www.google.com/maps/dir/${enderecos.map(encodeURIComponent).join("/")}`, "_blank");
  };

  const handleEntregue = (pedidoId: string) => {
    marcarBalcaoEntregue(pedidoId);
    toast.success("Entrega confirmada! ✓");
  };

  const handleCancelar = (pedidoId: string) => {
    cancelarEntregaMotoboy(pedidoId, cancelMotivo || undefined);
    toast.info("Entrega devolvida ao caixa");
    setCancelingId(null);
    setCancelMotivo("");
  };

  // ── Drag and drop (native, touch-friendly) ──
  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverId.current = id;
  };
  const handleDrop = () => {
    if (!draggingId || !dragOverId.current || draggingId === dragOverId.current) {
      setDraggingId(null);
      return;
    }
    const newOrdem = [...ordem];
    const fromIdx = newOrdem.indexOf(draggingId);
    const toIdx = newOrdem.indexOf(dragOverId.current);
    if (fromIdx === -1 || toIdx === -1) { setDraggingId(null); return; }
    newOrdem.splice(fromIdx, 1);
    newOrdem.splice(toIdx, 0, draggingId);
    setOrdem(newOrdem);
    saveOrdem(newOrdem);
    setDraggingId(null);
    dragOverId.current = null;
  };

  // ── Touch drag ──
  const touchStartY = useRef(0);
  const touchItemId = useRef<string | null>(null);
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchItemId.current = id;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchItemId.current) return;
    const endY = e.changedTouches[0].clientY;
    const diff = endY - touchStartY.current;
    const currentIdx = ordem.indexOf(touchItemId.current);
    if (currentIdx === -1) return;
    const newOrdem = [...ordem];
    if (diff > 40 && currentIdx < newOrdem.length - 1) {
      // Move down
      [newOrdem[currentIdx], newOrdem[currentIdx + 1]] = [newOrdem[currentIdx + 1], newOrdem[currentIdx]];
    } else if (diff < -40 && currentIdx > 0) {
      // Move up
      [newOrdem[currentIdx], newOrdem[currentIdx - 1]] = [newOrdem[currentIdx - 1], newOrdem[currentIdx]];
    } else {
      touchItemId.current = null;
      return;
    }
    setOrdem(newOrdem);
    saveOrdem(newOrdem);
    touchItemId.current = null;
  };

  // ── Summary for entregues tab ──
  const resumo = useMemo(() => {
    let dinheiroRecebido = 0, trocoTotal = 0, pix = 0, credito = 0, debito = 0;
    for (const p of entregues) {
      const forma = (p.formaPagamentoDelivery || "").toLowerCase();
      if (forma === "dinheiro") {
        dinheiroRecebido += p.trocoParaQuanto || p.total;
        trocoTotal += (p.trocoParaQuanto || p.total) - p.total;
      } else if (forma === "pix") {
        pix += p.total;
      } else if (forma.includes("créd") || forma === "credito") {
        credito += p.total;
      } else if (forma.includes("déb") || forma === "debito") {
        debito += p.total;
      } else {
        pix += p.total; // fallback
      }
    }
    return {
      dinheiroRecebido,
      trocoTotal,
      liquidoDinheiro: dinheiroRecebido - trocoTotal,
      pix,
      credito,
      debito,
      total: entregues.reduce((s, p) => s + p.total, 0),
      count: entregues.length,
    };
  }, [entregues]);

  const Logo = () =>
    LOGO ? (
      <img src={LOGO} alt={NOME_REST} className="w-10 h-10 rounded-full object-cover" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
        {INITIALS}
      </div>
    );

  /* ── Login screen ── */
  if (!sessao) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="flex justify-center"><Logo /></div>
          <h1 className="text-xl font-bold">{NOME_REST}</h1>
          <p className="text-sm text-muted-foreground">Painel do Motoboy</p>
          {motoboys.length === 0 ? (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Nenhum motoboy cadastrado.</p>
              <p className="text-xs text-muted-foreground">Peça ao gerente para cadastrar motoboys na aba Equipe.</p>
            </div>
          ) : (
            <div className="space-y-3 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Seu nome</label>
                <Input
                  type="text"
                  placeholder="Digite seu nome"
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">PIN</label>
                <Input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
              {loginError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{loginError}</p>
              )}
              <Button className="w-full rounded-xl" onClick={handleLogin} disabled={!nomeInput.trim() || pinInput.length < 4}>
                <Bike className="w-4 h-4 mr-2" /> Entrar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Main content ── */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hidden file input for QR scanning */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-semibold text-sm">{sessao.nome}</p>
            <p className="text-xs text-muted-foreground">Motoboy</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-1" /> Sair
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === "rota" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("rota")}
        >
          <Package className="w-4 h-4 inline mr-1.5" />
          Em rota ({emRota.length})
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === "entregues" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("entregues")}
        >
          <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
          Entregues ({entregues.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "rota" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {emRota.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bike className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma entrega no momento</p>
            </div>
          ) : (
            emRota.map((p, idx) => {
              const addr = buildEnderecoCompleto(p);
              const isDragging = draggingId === p.id;
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(p.id)}
                  onDragOver={(e) => handleDragOver(e, p.id)}
                  onDrop={handleDrop}
                  onDragEnd={() => setDraggingId(null)}
                  onTouchStart={(e) => handleTouchStart(p.id, e)}
                  onTouchEnd={handleTouchEnd}
                  className={`transition-all duration-200 ${isDragging ? "opacity-40 scale-95" : ""}`}
                >
                  <Card className={
                    p.statusBalcao === "pronto" ? "border-green-600/50" :
                    p.statusBalcao === "saiu" ? "border-blue-500/50" : "border-border"
                  }>
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Drag handle */}
                        <div className="flex items-center justify-center w-10 shrink-0 bg-muted/30 cursor-grab active:cursor-grabbing border-r border-border rounded-l-xl">
                          <GripVertical className="w-5 h-5 text-muted-foreground" />
                        </div>

                        <div className="flex-1 p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                <p className="font-bold">{p.clienteNome || "Cliente"}</p>
                              </div>
                              {p.bairro && <Badge className="bg-orange-600 text-white text-[10px] mt-1">{p.bairro}</Badge>}
                            </div>
                            <span className="text-4xl font-black text-amber-500 leading-none">#{p.numeroPedido}</span>
                          </div>

                          {addr && (
                            <div className="flex gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{addr}</span>
                            </div>
                          )}

                          {p.clienteTelefone && (
                            <div className="flex gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{p.clienteTelefone}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-border">
                            <div className="flex items-center gap-1 text-sm">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-semibold">R$ {p.total.toFixed(2)}</span>
                              {p.formaPagamentoDelivery && (
                                <Badge variant="outline" className="text-[10px] ml-1">{p.formaPagamentoDelivery}</Badge>
                              )}
                            </div>
                            {p.formaPagamentoDelivery === "dinheiro" && p.trocoParaQuanto && (
                              <span className="text-sm font-bold text-amber-500">
                                Troco: R$ {(p.trocoParaQuanto - p.total).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            {addr && (
                              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => handleVerRota(p)}>
                                <Map className="w-3.5 h-3.5" /> Rota
                              </Button>
                            )}
                            {p.statusBalcao === "pronto" && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleScanQR(p.id)}>
                                📷 Escanear retirada
                              </Button>
                            )}
                            {p.statusBalcao === "pronto" && (
                              <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => marcarBalcaoSaiu(p.id, sessao.nome)}>
                                Retirar
                              </Button>
                            )}
                            {(p.statusBalcao === "pronto" || p.statusBalcao === "saiu") && (
                              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" onClick={() => handleEntregue(p.id)}>
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Entregue
                              </Button>
                            )}
                            {(!p.statusBalcao || p.statusBalcao === "aberto") && (
                              <p className="text-xs text-muted-foreground italic">Aguardando preparo…</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}

          {/* Floating route button */}
          {emRota.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t border-border">
              <Button className="w-full h-12 gap-2 font-bold" onClick={handleVerTodasRotas}>
                <Navigation className="w-5 h-5" /> Ver todas as rotas ({emRota.length})
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ── Entregues tab ── */
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-80">
          {entregues.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma entrega concluída ainda</p>
            </div>
          ) : (
            entregues.map((p) => (
              <Card key={p.id} className="border-border opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm">{p.clienteNome || "Cliente"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{p.formaPagamentoDelivery || "—"}</Badge>
                        <span className="text-sm font-semibold">R$ {p.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-muted-foreground">#{p.numeroPedido}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{p.criadoEm}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Summary footer */}
          {entregues.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border shadow-lg">
              <div className="p-4 space-y-2 max-w-lg mx-auto">
                <h3 className="font-black text-sm text-center mb-2">Resumo — {resumo.count} entrega(s)</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Dinheiro recebido</span>
                  <span className="text-right font-semibold">R$ {resumo.dinheiroRecebido.toFixed(2)}</span>
                  <span className="text-muted-foreground">Troco dado</span>
                  <span className="text-right font-semibold text-destructive">- R$ {resumo.trocoTotal.toFixed(2)}</span>
                  <span className="text-muted-foreground font-bold">Líquido dinheiro</span>
                  <span className="text-right font-bold text-amber-500">R$ {resumo.liquidoDinheiro.toFixed(2)}</span>
                  <span className="text-muted-foreground">PIX</span>
                  <span className="text-right font-semibold">R$ {resumo.pix.toFixed(2)}</span>
                  <span className="text-muted-foreground">Crédito</span>
                  <span className="text-right font-semibold">R$ {resumo.credito.toFixed(2)}</span>
                  <span className="text-muted-foreground">Débito</span>
                  <span className="text-right font-semibold">R$ {resumo.debito.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="font-black">Total geral</span>
                  <span className="font-black text-lg">R$ {resumo.total.toFixed(2)}</span>
                </div>
                <Button className="w-full mt-2 font-bold" variant="outline" onClick={() => {
                  toast.success("Caixa fechado! Entregue o valor ao responsável.");
                }}>
                  Fechar meu caixa
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
