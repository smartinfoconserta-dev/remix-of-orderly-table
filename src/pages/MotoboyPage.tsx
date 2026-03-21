import { useCallback, useRef, useState } from "react";
import { Bike, LogOut, MapPin, Phone, DollarSign, Clock, Map, Navigation, QrCode, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSistemaConfig } from "@/lib/adminStorage";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import jsQR from "jsqr";

const SESSAO_KEY = "obsidian-motoboy-sessao-v1";
const MOTOBOY_LIST_KEY = "obsidian-motoboys-v1";

type Motoboy = { id: string; nome: string; pinHash: string; ativo: boolean };

const getMotoboys = (): Motoboy[] => {
  try { const raw = localStorage.getItem(MOTOBOY_LIST_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const getSessao = (): { id: string; nome: string } | null => {
  try { const raw = localStorage.getItem(SESSAO_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export default function MotoboyPage() {
  const sysConfig = getSistemaConfig();
  const NOME_REST = sysConfig.nomeRestaurante || "Restaurante";
  const LOGO = sysConfig.logoBase64 || sysConfig.logoUrl || "";
  const INITIALS = NOME_REST.slice(0, 2).toUpperCase();

  const { pedidosBalcao, marcarBalcaoSaiu, marcarBalcaoEntregue } = useRestaurant();
  const [sessao, setSessao] = useState<{ id: string; nome: string } | null>(() => getSessao());
  const [selectedMotoboyId, setSelectedMotoboyId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [scanningPedidoId, setScanningPedidoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const motoboys = getMotoboys().filter((m) => m.ativo);

  const handleLogin = useCallback(() => {
    setLoginError("");
    const motoboy = motoboys.find((m) => m.id === selectedMotoboyId);
    if (!motoboy) { setLoginError("Selecione um motoboy"); return; }
    if (pinInput.length < 4) { setLoginError("PIN deve ter 4 dígitos"); return; }
    const expectedHash = btoa("pin:" + pinInput);
    if (motoboy.pinHash !== expectedHash) { setLoginError("PIN incorreto"); return; }
    const s = { id: motoboy.id, nome: motoboy.nome };
    localStorage.setItem(SESSAO_KEY, JSON.stringify(s));
    setSessao(s);
    toast.success(`Bem-vindo, ${motoboy.nome}!`);
  }, [selectedMotoboyId, pinInput, motoboys]);

  const handleLogout = () => {
    localStorage.removeItem(SESSAO_KEY);
    setSessao(null);
    setSelectedMotoboyId("");
    setPinInput("");
  };

  const handleScanQR = (pedidoId: string) => {
    setScanningPedidoId(pedidoId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scanningPedidoId) return;

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
        if (pedidoId === scanningPedidoId) {
          marcarBalcaoSaiu(pedidoId, sessao?.nome || "Motoboy");
          toast.success("Retirada confirmada! Boa entrega. 🏍️");
        } else {
          toast.error("QR Code não corresponde a este pedido");
        }
      } else {
        toast.error("QR Code não reconhecido");
      }
    } catch {
      toast.error("Erro ao ler QR Code");
    }

    setScanningPedidoId(null);
    e.target.value = "";
  }, [scanningPedidoId, marcarBalcaoSaiu, sessao]);

  const deliveriesAtivos = pedidosBalcao.filter(
    (p) => p.origem === "delivery" && p.statusBalcao !== "pago"
  );

  const statusConfig = (s?: string) => {
    switch (s) {
      case "pronto": return { label: "PRONTO PARA RETIRAR", className: "bg-green-600 text-white animate-pulse" };
      case "saiu": return { label: "SAIU PARA ENTREGA", className: "bg-blue-600 text-white" };
      case "entregue": return { label: "ENTREGUE", className: "bg-muted text-muted-foreground" };
      default: return { label: "AGUARDANDO COZINHA", className: "bg-yellow-600 text-white" };
    }
  };

  const buildEnderecoCompleto = (p: typeof deliveriesAtivos[0]) =>
    [p.enderecoCompleto, p.bairro, p.referencia].filter(Boolean).join(", ");

  const handleVerRota = (p: typeof deliveriesAtivos[0]) => {
    const addr = buildEnderecoCompleto(p);
    if (!addr) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
  };

  const handleVerTodasRotas = () => {
    const enderecos = deliveriesAtivos
      .filter((p) => p.statusBalcao !== "entregue")
      .map(buildEnderecoCompleto)
      .filter(Boolean);
    if (enderecos.length === 0) return;
    const url = `https://www.google.com/maps/dir/${enderecos.map(encodeURIComponent).join("/")}`;
    window.open(url, "_blank");
  };

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
                <label className="text-xs font-bold text-muted-foreground">Motoboy</label>
                <Select value={selectedMotoboyId} onValueChange={setSelectedMotoboyId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione seu nome" />
                  </SelectTrigger>
                  <SelectContent>
                    {motoboys.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              {loginError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{loginError}</p>
              )}
              <Button className="w-full rounded-xl" onClick={handleLogin} disabled={!selectedMotoboyId || pinInput.length < 4}>
                <Bike className="w-4 h-4 mr-2" /> Entrar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Main content ── */
  const entregasPendentes = deliveriesAtivos.filter((p) => p.statusBalcao !== "entregue");

  const renderCard = (p: typeof deliveriesAtivos[0]) => {
    const st = statusConfig(p.statusBalcao);
    const addr = buildEnderecoCompleto(p);
    return (
      <Card key={p.id} className={
        p.statusBalcao === "pronto" ? "border-green-600/50" :
        p.statusBalcao === "saiu" ? "border-blue-500/50" : ""
      }>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{p.clienteNome || "Cliente"}</p>
              {p.bairro && <Badge className="bg-orange-600 text-white text-[10px] mt-1">{p.bairro}</Badge>}
            </div>
            <Badge className={st.className}>{st.label}</Badge>
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

          <p className="text-sm">
            {p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div className="flex items-center gap-1 text-sm">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold">R$ {p.total.toFixed(2)}</span>
              {p.formaPagamentoDelivery && (
                <span className="text-muted-foreground ml-1">({p.formaPagamentoDelivery})</span>
              )}
            </div>
            {p.formaPagamentoDelivery === "dinheiro" && p.trocoParaQuanto && (
              <span className="text-xs text-muted-foreground">
                Troco p/ R$ {p.trocoParaQuanto.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{p.criadoEm}</span>
          </div>

          {addr && p.statusBalcao !== "entregue" && (
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleVerRota(p)}>
              <Map className="w-4 h-4" /> Ver rota no Maps
            </Button>
          )}

          <div className="pt-2 border-t border-border flex gap-2">
            {p.statusBalcao === "pronto" && (
              <>
                <Button size="sm" className="flex-1 gap-1.5" variant="outline" onClick={() => handleScanQR(p.id)}>
                  <QrCode className="w-4 h-4" /> Escanear QR
                </Button>
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => marcarBalcaoSaiu(p.id, sessao.nome)}>
                  Confirmar retirada
                </Button>
              </>
            )}
            {p.statusBalcao === "saiu" && (
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => marcarBalcaoEntregue(p.id)}>
                Marcar como entregue
              </Button>
            )}
            {p.statusBalcao === "aberto" && (
              <p className="text-xs text-muted-foreground italic">Aguardando preparo na cozinha…</p>
            )}
            {p.statusBalcao === "entregue" && (
              <p className="text-xs text-muted-foreground italic">Entrega concluída ✓</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      {/* Hidden file input for QR scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Entregas</h2>
          <Badge variant="outline">{deliveriesAtivos.length} ativo(s)</Badge>
        </div>

        {deliveriesAtivos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bike className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma entrega no momento</p>
          </div>
        ) : (() => {
          const grupos: Record<string, typeof deliveriesAtivos> = {};
          for (const p of deliveriesAtivos) {
            const bairro = p.bairro?.trim() || "Sem bairro";
            if (!grupos[bairro]) grupos[bairro] = [];
            grupos[bairro].push(p);
          }
          const bairros = Object.keys(grupos);
          const usarGrupos = deliveriesAtivos.length >= 2 && bairros.length > 0;

          const handleVerRotaBairro = (pedidos: typeof deliveriesAtivos) => {
            const ends = pedidos
              .filter((p) => p.statusBalcao !== "entregue")
              .map(buildEnderecoCompleto)
              .filter(Boolean);
            if (ends.length === 0) return;
            window.open(`https://www.google.com/maps/dir/${ends.map(encodeURIComponent).join("/")}`, "_blank");
          };

          if (usarGrupos) {
            return bairros.map((bairro) => (
              <div key={bairro} className="space-y-2">
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm uppercase tracking-wider">{bairro}</h3>
                    <Badge variant="outline" className="text-[10px]">{grupos[bairro].length} entrega(s)</Badge>
                  </div>
                  {grupos[bairro].some((p) => p.statusBalcao !== "entregue") && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleVerRotaBairro(grupos[bairro])}>
                      <Navigation className="w-3 h-3" /> Rota do bairro
                    </Button>
                  )}
                </div>
                {grupos[bairro].map(renderCard)}
              </div>
            ));
          }

          return deliveriesAtivos.map(renderCard);
        })()}

        {/* ── Prestação de contas ── */}
        {(() => {
          const entregues = pedidosBalcao.filter(
            (p) => p.origem === "delivery" && p.statusBalcao === "entregue" && p.motoboyNome
          );
          if (entregues.length === 0) return null;

          const PRESTACAO_KEY = "orderly-motoboy-prestacao-v1";
          const getPrestados = (): string[] => {
            try { const raw = localStorage.getItem(PRESTACAO_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
          };
          const marcarPrestado = (motoboyNome: string) => {
            const ids = entregues.filter((p) => p.motoboyNome === motoboyNome).map((p) => p.id);
            const current = getPrestados();
            localStorage.setItem(PRESTACAO_KEY, JSON.stringify([...current, ...ids]));
          };
          const prestados = getPrestados();

          const porMotoboy: Record<string, typeof entregues> = {};
          for (const p of entregues) {
            const key = p.motoboyNome!;
            if (!porMotoboy[key]) porMotoboy[key] = [];
            porMotoboy[key].push(p);
          }

          const motoboyNames = Object.keys(porMotoboy);
          if (motoboyNames.length === 0) return null;

          return (
            <div className="mt-6 space-y-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" /> Prestação de contas
              </h2>
              {motoboyNames.map((mNome) => {
                const pedidos = porMotoboy[mNome];
                const todosPrestados = pedidos.every((p) => prestados.includes(p.id));
                const totalDinheiro = pedidos.filter((p) => p.formaPagamentoDelivery === "dinheiro").reduce((s, p) => s + p.total, 0);
                const totalOutros = pedidos.filter((p) => p.formaPagamentoDelivery !== "dinheiro").reduce((s, p) => s + p.total, 0);

                return (
                  <Card key={mNome} className={todosPrestados ? "opacity-50" : ""}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold">{mNome}</p>
                        <Badge variant="outline">{pedidos.length} entrega(s)</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dinheiro (a prestar contas)</span>
                          <span className="font-bold text-amber-500">R$ {totalDinheiro.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PIX/Cartão (já liquidado)</span>
                          <span className="font-bold text-emerald-500">R$ {totalOutros.toFixed(2)}</span>
                        </div>
                      </div>
                      {!todosPrestados && totalDinheiro > 0 && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            marcarPrestado(mNome);
                            window.location.reload();
                          }}
                        >
                          Confirmar prestação — R$ {totalDinheiro.toFixed(2)}
                        </Button>
                      )}
                      {todosPrestados && (
                        <p className="text-xs text-muted-foreground italic text-center">Prestação confirmada ✓</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Floating button */}
      {entregasPendentes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t border-border">
          <Button className="w-full h-12 gap-2 font-bold" onClick={handleVerTodasRotas}>
            <Navigation className="w-5 h-5" /> Ver todas as rotas ({entregasPendentes.length})
          </Button>
        </div>
      )}
    </div>
  );
}
