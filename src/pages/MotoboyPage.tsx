import { useState, useEffect } from "react";
import { Bike, LogOut, MapPin, Phone, DollarSign, Clock } from "lucide-react";
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
        return { label: "PRONTO PARA ENTREGA", className: "bg-green-600 text-white animate-pulse" };
      default:
        return { label: "AGUARDANDO COZINHA", className: "bg-yellow-600 text-white" };
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
            return (
              <Card key={p.id} className={p.statusBalcao === "pronto" ? "border-green-600/50" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-bold">{p.clienteNome || "Cliente"}</p>
                    <Badge className={st.className}>{st.label}</Badge>
                  </div>

                  {(p.enderecoCompleto || p.bairro) && (
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{[p.enderecoCompleto, p.bairro, p.referencia].filter(Boolean).join(" — ")}</span>
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
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
