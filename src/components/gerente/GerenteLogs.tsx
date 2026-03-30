import { useMemo, useState } from "react";

interface EventoOperacional {
  id: string;
  descricao: string;
  criadoEm: string;
  criadoEmIso: string;
  acao?: string;
  motivo?: string;
}

interface GerenteLogsProps {
  eventos: EventoOperacional[];
}

const actionLabels: Record<string, string> = {
  cancelar_item: "Exclusão de item",
  cancelar_pedido: "Cancelamento de pedido",
  editar_pedido: "Ajuste de pedido",
  fechar_conta: "Fechamento de conta",
  zerar_mesa: "Zeragem de mesa",
  entrada_manual: "Entrada manual",
  saida_manual: "Saída manual",
  chamar_garcom: "Chamada de garçom",
  lancar_pedido: "Lançamento de pedido",
  pedido_cliente: "Pedido do cliente",
  pedido_garcom: "Pedido do garçom",
  pedido_caixa: "Pedido do caixa",
  pedido_pronto: "Pedido pronto",
  abertura_caixa: "Abertura de caixa",
  abrir_caixa: "Abertura de caixa",
  fechar_turno: "Fechamento de turno",
  fechamento_dia: "Fechamento do dia",
  confirmar_delivery: "Delivery confirmado",
  rejeitar_delivery: "Delivery rejeitado",
  delivery_entregue: "Delivery entregue",
  sangria: "Sangria",
  suprimento: "Suprimento",
};

const RELEVANT_LOG_ACTIONS = new Set([
  "pedido_cliente", "pedido_garcom", "pedido_caixa",
  "fechar_conta",
  "confirmar_delivery", "rejeitar_delivery", "delivery_entregue",
  "chamar_garcom",
  "abrir_caixa", "abertura_caixa", "fechar_turno", "fechamento_dia",
  "sangria", "suprimento",
]);

type LogCategory = "all" | "pedidos" | "caixa" | "delivery";
const LOG_CATEGORY_ACTIONS: Record<LogCategory, Set<string> | null> = {
  all: null,
  pedidos: new Set(["pedido_cliente", "pedido_garcom", "pedido_caixa", "fechar_conta", "chamar_garcom"]),
  caixa: new Set(["abrir_caixa", "abertura_caixa", "fechar_turno", "fechamento_dia", "sangria", "suprimento"]),
  delivery: new Set(["confirmar_delivery", "rejeitar_delivery", "delivery_entregue"]),
};

const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === yesterday.getTime()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
};

const getEventDotColor = (acao?: string) => {
  if (!acao) return "bg-muted-foreground";
  if (["pedido_cliente", "pedido_garcom", "pedido_caixa", "chamar_garcom"].includes(acao)) return "bg-emerald-500";
  if (["fechar_conta", "fechar_turno", "fechamento_dia", "abrir_caixa", "abertura_caixa"].includes(acao)) return "bg-blue-500";
  if (["confirmar_delivery", "delivery_entregue"].includes(acao)) return "bg-purple-500";
  if (["rejeitar_delivery"].includes(acao)) return "bg-destructive";
  if (["sangria", "suprimento"].includes(acao)) return "bg-amber-500";
  return "bg-muted-foreground";
};

const GerenteLogs = ({ eventos }: GerenteLogsProps) => {
  const [logFilter, setLogFilter] = useState<LogCategory>("all");

  const relevantEvents = useMemo(
    () => eventos.filter((e) => e.acao && RELEVANT_LOG_ACTIONS.has(e.acao)),
    [eventos]
  );

  const filteredEvents = useMemo(() => {
    const categorySet = LOG_CATEGORY_ACTIONS[logFilter];
    if (!categorySet) return relevantEvents;
    return relevantEvents.filter((e) => e.acao && categorySet.has(e.acao));
  }, [relevantEvents, logFilter]);

  const groupedEvents = useMemo(() => {
    const groups: { date: string; label: string; events: typeof filteredEvents }[] = [];
    const map = new Map<string, typeof filteredEvents>();

    filteredEvents.forEach((e) => {
      const dateKey = e.criadoEmIso.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    });

    const sortedDates = [...map.keys()].sort().reverse();
    sortedDates.forEach((date) => {
      groups.push({ date, label: formatDateHeader(date), events: map.get(date)! });
    });

    return groups;
  }, [filteredEvents]);

  return (
    <>
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-border">
        {([
          { key: "all" as LogCategory, label: "Todos" },
          { key: "pedidos" as LogCategory, label: "Pedidos" },
          { key: "caixa" as LogCategory, label: "Caixa" },
          { key: "delivery" as LogCategory, label: "Delivery" },
        ]).map((pill) => (
          <button
            key={pill.key}
            type="button"
            onClick={() => setLogFilter(pill.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              logFilter === pill.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {pill.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Event list */}
      <div className="pt-4">
        {groupedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum evento registrado.</p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {groupedEvents.map((group) => (
              <div key={group.date} className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground pb-1">{group.label}</h3>
                {group.events.map((evento) => (
                  <div key={evento.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getEventDotColor(evento.acao)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-snug">{evento.descricao}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-xs text-muted-foreground">{evento.criadoEm}</span>
                        {evento.acao && (
                          <span className="text-xs font-bold text-muted-foreground">
                            {actionLabels[evento.acao] ?? evento.acao}
                          </span>
                        )}
                        {evento.motivo && (
                          <span className="text-xs text-destructive italic">Motivo: {evento.motivo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default GerenteLogs;
