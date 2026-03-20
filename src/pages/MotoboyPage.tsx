import { useState } from "react";
import { Bike, LogOut, MapPin, Phone, DollarSign, Clock, Map, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSistemaConfig } from "@/lib/adminStorage";
import { useRestaurant } from "@/contexts/RestaurantContext";

const MOTOBOY_KEY = "orderly-motoboy-nome";
const sysConfig = getSistemaConfig();
const NOME_REST = sysConfig.nomeRestaurante || "Restaurante";
const LOGO = sysConfig.logoUrl || "";
const INITIALS = NOME_REST.slice(0, 2).toUpperCase();

export default function MotoboyPage() {
  const { pedidosBalcao, marcarBalcaoSaiu, marcarBalcaoEntregue } = useRestaurant();
  const [view, setView] = useState<"login" | "entregas">(
    () => localStorage.getItem(MOTOBOY_KEY) ? "entregas" : "login"
  );
  const [nome, setNome] = useState(() => localStorage.getItem(MOTOBOY_KEY) || "");
  const [inputNome, setInputNome] = useState("");

  const handleEntrar = () => {
    if (!inputNome.trim()) return;
    localStorage.setItem(MOTOBOY_KEY, inputNome.trim());
    setNome(inputNome.trim());
    setView("entregas");
  };

  const handleSair = () => {
    localStorage.removeItem(MOTOBOY_KEY);
    setNome("");
    setInputNome("");
    setView("login");
  };

  const deliveriesAtivos = pedidosBalcao.filter(
    (p) => p.origem === "delivery" && p.statusBalcao !== "pago"
  );

  const statusConfig = (s?: string) => {
    switch (s) {
      case "pronto":
        return { label: "PRONTO PARA RETIRAR", className: "bg-green-600 text-white animate-pulse" };
      case "saiu":
        return { label: "SAIU PARA ENTREGA", className: "bg-blue-600 text-white" };
      case "entregue":
        return { label: "ENTREGUE", className: "bg-muted text-muted-foreground" };
      default:
        return { label: "AGUARDANDO COZINHA", className: "bg-yellow-600 text-white" };
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

  if (view === "login") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="flex justify-center"><Logo /></div>
          <h1 className="text-xl font-bold">{NOME_REST}</h1>
          <p className="text-sm text-muted-foreground">Painel do Motoboy</p>
          <div className="space-y-3">
            <Input
              placeholder="Seu nome"
              value={inputNome}
              onChange={(e) => setInputNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEntrar()}
            />
            <Button className="w-full" onClick={handleEntrar} disabled={!inputNome.trim()}>
              <Bike className="w-4 h-4 mr-2" /> Entrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const entregasPendentes = deliveriesAtivos.filter((p) => p.statusBalcao !== "entregue");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-semibold text-sm">{nome}</p>
            <p className="text-xs text-muted-foreground">Motoboy</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSair}>
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
        ) : (
          deliveriesAtivos.map((p) => {
            const st = statusConfig(p.statusBalcao);
            const addr = buildEnderecoCompleto(p);
            return (
              <Card key={p.id} className={
                p.statusBalcao === "pronto" ? "border-green-600/50" :
                p.statusBalcao === "saiu" ? "border-blue-500/50" : ""
              }>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-bold">{p.clienteNome || "Cliente"}</p>
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

                  {/* Ver rota */}
                  {addr && p.statusBalcao !== "entregue" && (
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleVerRota(p)}>
                      <Map className="w-4 h-4" /> Ver rota no Maps
                    </Button>
                  )}

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-border flex gap-2">
                    {p.statusBalcao === "pronto" && (
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => marcarBalcaoSaiu(p.id, nome)}>
                        Confirmar retirada
                      </Button>
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
          })
        )}
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
