import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, ExternalLink, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getSistemaConfig, saveSistemaConfig, saveSistemaConfigAsync, getSistemaConfigAsync,
  getHorariosFuncionamento, saveHorariosFuncionamento,
  type SistemaConfig, type HorariosSemana, type HorarioFuncionamento,
} from "@/lib/adminStorage";
import { getBairrosAsync, saveBairros, type Bairro } from "@/lib/deliveryStorage";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import IfoodPainel from "@/components/IfoodPainel";

interface Props {
  storeId: string | null;
}

const DIAS: { key: keyof HorariosSemana; label: string }[] = [
  { key: "seg", label: "Segunda" }, { key: "ter", label: "Terça" }, { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" }, { key: "sex", label: "Sexta" }, { key: "sab", label: "Sábado" }, { key: "dom", label: "Domingo" },
];

const AdminDelivery = ({ storeId }: Props) => {
  const { stores } = useStore();
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);
  const [horarios, setHorarios] = useState<HorariosSemana>(getHorariosFuncionamento);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [novoBairroNome, setNovoBairroNome] = useState("");
  const [novoBairroTaxa, setNovoBairroTaxa] = useState("");
  const [deliveryModo, setDeliveryModo] = useState<"todos" | "cadastrados">(() => {
    try { const v = localStorage.getItem("obsidian-delivery-modo-v1"); return v === "cadastrados" ? "cadastrados" : "todos"; } catch { return "todos"; }
  });
  const [showIfood, setShowIfood] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then((c) => {
      setSistemaConfig(c);
      if (c.horarioFuncionamento) setHorarios(c.horarioFuncionamento);
    });
    getBairrosAsync(storeId).then(setBairros);
  }, [storeId]);

  const saveSistema = useCallback((cfg?: SistemaConfig) => {
    const toSave = cfg || sistemaConfig;
    saveSistemaConfig(toSave, storeId);
    saveSistemaConfigAsync(toSave, storeId);
    toast.success("Configurações salvas");
  }, [sistemaConfig, storeId]);

  const updateDia = (dia: keyof HorariosSemana, patch: Partial<HorarioFuncionamento>) => {
    const next = { ...horarios, [dia]: { ...horarios[dia], ...patch } };
    setHorarios(next);
    setSistemaConfig((prev) => ({ ...prev, horarioFuncionamento: next }));
    saveHorariosFuncionamento(next, storeId);
  };

  const currentStore = stores.find((s) => s.id === storeId);
  const storeSlug = currentStore?.slug;
  const baseUrl = window.location.origin;
  const deliveryLink = storeSlug ? `${baseUrl}/pedido/${storeSlug}` : null;
  const cardapioLink = storeSlug ? `${baseUrl}/cardapio/${storeSlug}` : null;

  if (showIfood) {
    return (
      <div className="space-y-4 fade-in">
        <button onClick={() => setShowIfood(false)} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
        <IfoodPainel />
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h2 className="text-2xl font-black text-foreground">Delivery</h2>
        <p className="text-sm text-muted-foreground">Gerencie entregas, links e horários</p>
      </div>

      {/* Toggle delivery */}
      <div className="surface-card rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{sistemaConfig.deliveryAtivo !== false ? "Delivery ativado" : "Delivery desativado"}</p>
            <p className="text-sm text-muted-foreground">Controle se o link de delivery aceita pedidos</p>
          </div>
          <Switch checked={sistemaConfig.deliveryAtivo !== false} onCheckedChange={(v) => {
            const next = { ...sistemaConfig, deliveryAtivo: v };
            setSistemaConfig(next);
            saveSistemaConfig(next, storeId);
            toast.success(v ? "Delivery ativado" : "Delivery desativado");
          }} />
        </div>
        {sistemaConfig.deliveryAtivo === false && (
          <p className="text-sm font-semibold text-destructive rounded-lg bg-destructive/10 px-3 py-2">Clientes não conseguem fazer pedidos pelo link de delivery</p>
        )}
      </div>

      {/* Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {deliveryLink && (
          <div className="surface-card rounded-2xl p-5 space-y-3">
            <p className="text-sm font-black text-foreground">Link do Delivery</p>
            <p className="text-xs text-muted-foreground">Compartilhe no WhatsApp Business</p>
            <div className="flex items-center gap-2">
              <Input value={deliveryLink} readOnly className="text-xs font-mono bg-muted h-9 rounded-xl" />
              <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => { navigator.clipboard.writeText(deliveryLink); toast.success("Copiado!"); }}>Copiar</Button>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(deliveryLink, "_blank")}><ExternalLink className="h-3 w-3" />Abrir</Button>
          </div>
        )}
        {cardapioLink && (
          <div className="surface-card rounded-2xl p-5 space-y-3">
            <p className="text-sm font-black text-foreground">Cardápio Digital</p>
            <p className="text-xs text-muted-foreground">Link público do cardápio</p>
            <div className="flex items-center gap-2">
              <Input value={cardapioLink} readOnly className="text-xs font-mono bg-muted h-9 rounded-xl" />
              <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => { navigator.clipboard.writeText(cardapioLink); toast.success("Copiado!"); }}>Copiar</Button>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(cardapioLink, "_blank")}><ExternalLink className="h-3 w-3" />Abrir</Button>
          </div>
        )}
      </div>

      {/* iFood */}
      <button onClick={() => setShowIfood(true)} className="w-full surface-card rounded-2xl p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all border border-border">
        <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0"><Truck className="h-5 w-5 text-red-500" /></div>
        <div>
          <p className="text-sm font-bold text-foreground">Integração iFood</p>
          <p className="text-xs text-muted-foreground">Receba pedidos do iFood direto no sistema</p>
        </div>
      </button>

      {/* Horários */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm font-black text-foreground">Horário de funcionamento</p>
          <p className="text-xs text-muted-foreground mt-0.5">Define quando o delivery aceita pedidos</p>
        </div>
        <div className="space-y-2">
          {DIAS.map(({ key, label }) => {
            const dia = horarios[key];
            return (
              <div key={key} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${dia.ativo ? "border-border bg-card" : "border-border/50 bg-secondary/30 opacity-60"}`}>
                <button type="button" onClick={() => updateDia(key, { ativo: !dia.ativo })} className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${dia.ativo ? "bg-primary" : "bg-border"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${dia.ativo ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm font-bold text-foreground w-20 shrink-0">{label}</span>
                {dia.ativo ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input type="time" value={dia.abertura} onChange={(e) => updateDia(key, { abertura: e.target.value })} className="h-9 rounded-lg text-sm font-bold w-24" />
                    <span className="text-sm text-muted-foreground">até</span>
                    <Input type="time" value={dia.fechamento} onChange={(e) => updateDia(key, { fechamento: e.target.value })} className="h-9 rounded-lg text-sm font-bold w-24" />
                  </div>
                ) : <span className="text-sm text-muted-foreground italic">Fechado</span>}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Mensagem quando fechado (opcional)</label>
          <Input className="h-11 rounded-xl" value={sistemaConfig.mensagemFechado || ""} onChange={(e) => setSistemaConfig(c => ({ ...c, mensagemFechado: e.target.value }))} placeholder="Ex.: Voltamos amanhã!" />
        </div>
      </div>

      {/* Modo de entrega */}
      <div className="surface-card rounded-2xl p-6 space-y-3">
        <p className="text-sm font-bold text-muted-foreground">Modo de entrega</p>
        {(["todos", "cadastrados"] as const).map((m) => (
          <label key={m} className="flex items-center gap-3 cursor-pointer" onClick={() => { setDeliveryModo(m); localStorage.setItem("obsidian-delivery-modo-v1", m); }}>
            <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${deliveryModo === m ? "border-primary" : "border-muted-foreground/40"}`}>
              {deliveryModo === m && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
            <span className={`text-sm font-semibold ${deliveryModo === m ? "text-foreground" : "text-muted-foreground"}`}>
              {m === "todos" ? "Atender todos os bairros" : "Somente bairros cadastrados"}
            </span>
          </label>
        ))}
      </div>

      {/* Taxa padrão */}
      <div className="surface-card rounded-2xl p-6 space-y-2">
        <label className="text-sm font-bold text-muted-foreground">Taxa de entrega padrão (R$)</label>
        <Input className="h-11 rounded-xl" type="number" min="0" step="0.5" value={sistemaConfig.taxaEntrega ?? ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, taxaEntrega: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="0.00" />
      </div>

      {/* Bairros */}
      <div className="surface-card space-y-4 rounded-2xl p-6">
        <p className="text-sm font-bold text-muted-foreground">Taxas por bairro</p>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1"><label className="text-xs font-bold text-muted-foreground">Bairro</label><Input className="h-10 rounded-xl" value={novoBairroNome} onChange={(e) => setNovoBairroNome(e.target.value)} placeholder="Ex.: Centro" /></div>
          <div className="w-24 space-y-1"><label className="text-xs font-bold text-muted-foreground">Taxa</label><Input className="h-10 rounded-xl" type="number" min="0" step="0.5" value={novoBairroTaxa} onChange={(e) => setNovoBairroTaxa(e.target.value)} placeholder="5.00" /></div>
          <Button className="rounded-xl font-bold gap-1 shrink-0 h-10" disabled={!novoBairroNome.trim() || !novoBairroTaxa} onClick={() => {
            const taxa = parseFloat(novoBairroTaxa);
            if (isNaN(taxa) || taxa < 0) return;
            const next = [...bairros, { id: crypto.randomUUID(), nome: novoBairroNome.trim(), taxa, ativo: true }];
            setBairros(next); saveBairros(next, storeId);
            setNovoBairroNome(""); setNovoBairroTaxa("");
            toast.success("Bairro adicionado");
          }}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
        {bairros.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border">
            {bairros.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-bold text-foreground">{b.nome}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">R$ {b.taxa.toFixed(2).replace(".", ",")}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                    const next = bairros.filter((bb) => bb.id !== b.id);
                    setBairros(next); saveBairros(next, storeId); toast.success("Bairro removido");
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tempo */}
      <div className="surface-card rounded-2xl p-6 space-y-2">
        <label className="text-sm font-bold text-muted-foreground">Tempo estimado de entrega</label>
        <Input className="h-11 rounded-xl" value={sistemaConfig.tempoEntrega || ""} onChange={(e) => setSistemaConfig(c => ({ ...c, tempoEntrega: e.target.value }))} placeholder="Ex.: 30-50 min" />
      </div>

      <Button onClick={() => saveSistema()} className="rounded-xl font-black w-full"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
    </div>
  );
};

export default AdminDelivery;
