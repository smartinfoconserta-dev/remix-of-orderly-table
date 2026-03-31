import { useCallback, useEffect, useState } from "react";
import {
  Plus, Save, Trash2, X, Upload, Pencil, Printer, ExternalLink,
  Palette, Image, Megaphone, MessageCircle, Truck, Store, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getSistemaConfig, saveSistemaConfig, applyCustomPrimaryColor,
  getSistemaConfigAsync, saveSistemaConfigAsync, getLicencaConfig,
  getHorariosFuncionamento, saveHorariosFuncionamento, defaultHorariosSemana,
  getModulosDoPlano,
  type SistemaConfig, type LicencaConfig, type HorariosSemana, type HorarioFuncionamento,
  type PlanoModulos, type ImpressoraConfig,
} from "@/lib/adminStorage";
import { getBairrosAsync, saveBairros, type Bairro } from "@/lib/deliveryStorage";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import AdminAparencia from "./AdminAparencia";
import AdminBanners from "./AdminBanners";
import AdminRedes from "./AdminRedes";
import AdminTemas from "./AdminTemas";

type ConfigSection = "inicio" | "aparencia" | "temas" | "banners" | "redes" | "delivery" | "restaurante" | "impressoras" | "sistema";

interface Props {
  storeId: string | null;
  storeName: string;
}

const sectionMeta: Record<Exclude<ConfigSection, "inicio">, { icon: React.ElementType; label: string }> = {
  restaurante: { icon: Store, label: "Meu Restaurante" },
  aparencia: { icon: Palette, label: "Aparência" },
  temas: { icon: Image, label: "Temas" },
  banners: { icon: Megaphone, label: "Banners" },
  redes: { icon: MessageCircle, label: "WhatsApp e Redes" },
  delivery: { icon: Truck, label: "Delivery" },
  impressoras: { icon: Printer, label: "Impressoras" },
  sistema: { icon: Database, label: "Sistema" },
};

const sections = [
  { id: "restaurante" as const, icon: Store, label: "Meu Restaurante", desc: "Tipo de atendimento e delivery" },
  { id: "aparencia" as const, icon: Palette, label: "Aparência", desc: "Logo, nome e formato" },
  { id: "temas" as const, icon: Image, label: "Temas", desc: "Visual do cardápio e cores" },
  { id: "banners" as const, icon: Megaphone, label: "Banners", desc: "Promoções e destaques" },
  { id: "redes" as const, icon: MessageCircle, label: "WhatsApp e Redes", desc: "Comunicação e QR codes" },
  { id: "delivery" as const, icon: Truck, label: "Delivery", desc: "Bairros, taxas e horários" },
  { id: "impressoras" as const, icon: Printer, label: "Impressoras", desc: "Impressoras térmicas" },
  { id: "sistema" as const, icon: Database, label: "Sistema", desc: "Backup e restauração" },
];

const AdminConfig = ({ storeId, storeName }: Props) => {
  const { stores } = useStore();
  const [configSection, setConfigSection] = useState<ConfigSection>("inicio");
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);
  const [licencaConfig, setLicencaConfig] = useState<LicencaConfig>(getLicencaConfig);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<HorariosSemana>(getHorariosFuncionamento);

  // Impressoras form state
  const [impEditando, setImpEditando] = useState<ImpressoraConfig | null>(null);
  const [impFormNome, setImpFormNome] = useState("");
  const [impFormSetor, setImpFormSetor] = useState<"caixa" | "cozinha" | "bar" | "delivery">("cozinha");
  const [impFormTipo, setImpFormTipo] = useState<"rede" | "usb" | "bluetooth">("rede");
  const [impFormIp, setImpFormIp] = useState("");
  const [impFormLargura, setImpFormLargura] = useState<"58mm" | "80mm">("80mm");
  const [impFormAtiva, setImpFormAtiva] = useState(true);
  const [impShowForm, setImpShowForm] = useState(false);

  // Bairros state
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [novoBairroNome, setNovoBairroNome] = useState("");
  const [novoBairroTaxa, setNovoBairroTaxa] = useState("");
  const [deliveryModo, setDeliveryModo] = useState<"todos" | "cadastrados">(() => {
    try { const v = localStorage.getItem("obsidian-delivery-modo-v1"); return v === "cadastrados" ? "cadastrados" : "todos"; } catch { return "todos"; }
  });

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then((c) => {
      setSistemaConfig(c);
      if (c.horarioFuncionamento) setHorariosFuncionamento(c.horarioFuncionamento);
    });
    getBairrosAsync(storeId).then(setBairros);
  }, [storeId]);

  const saveSistema = useCallback((configOverride?: SistemaConfig | unknown) => {
    const toSave = (configOverride && typeof configOverride === "object" && "nomeRestaurante" in (configOverride as any)) ? configOverride as SistemaConfig : sistemaConfig;
    saveSistemaConfig(toSave, storeId);
    saveSistemaConfigAsync(toSave, storeId);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig, storeId]);

  const currentMeta = configSection !== "inicio" ? sectionMeta[configSection] : null;

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        {configSection !== "inicio" && (
          <button onClick={() => setConfigSection("inicio")} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
        )}
        <div className="flex items-center gap-2">
          {currentMeta && <currentMeta.icon className="h-5 w-5 text-muted-foreground" />}
          <h2 className="text-2xl font-black text-foreground">
            {configSection === "inicio" ? "Configurações" : currentMeta?.label}
          </h2>
        </div>
      </div>
      {configSection === "inicio" && <p className="text-sm text-muted-foreground">Toque em um bloco para configurar</p>}

      {/* Grid de cards */}
      {configSection === "inicio" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {sections.map(card => {
            const Icon = card.icon;
            return (
              <button key={card.id} onClick={() => setConfigSection(card.id)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 text-left hover:border-primary/30 hover:bg-accent/50 transition-all">
                <Icon className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-base font-bold text-foreground">{card.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{card.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Extracted components */}
      {configSection === "aparencia" && <AdminAparencia sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} onSave={saveSistema} />}
      {configSection === "banners" && <AdminBanners sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} onSave={saveSistema} />}
      {configSection === "redes" && <AdminRedes sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} onSave={saveSistema} />}
      {configSection === "temas" && <AdminTemas sistemaConfig={sistemaConfig} setSistemaConfig={setSistemaConfig} storeId={storeId} onSave={saveSistema} />}

      {/* DELIVERY */}
      {configSection === "delivery" && (
        <div className="space-y-4 max-w-lg">
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-bold text-foreground">{sistemaConfig.deliveryAtivo !== false ? "Delivery ativado" : "Delivery desativado"}</p><p className="text-sm text-muted-foreground">Controle se o link de delivery aceita pedidos</p></div>
              <Switch checked={sistemaConfig.deliveryAtivo !== false} onCheckedChange={(v) => { const next = { ...sistemaConfig, deliveryAtivo: v }; setSistemaConfig(next); saveSistemaConfig(next, storeId); toast.success(v ? "Delivery ativado" : "Delivery desativado"); }} />
            </div>
            {sistemaConfig.deliveryAtivo === false && (<p className="text-sm font-semibold text-destructive rounded-lg bg-destructive/10 px-3 py-2">⚠ Clientes não conseguem fazer pedidos pelo link de delivery</p>)}
          </div>

          {/* Link do delivery */}
          {(() => {
            const currentStore = stores.find((s) => s.id === storeId);
            const storeSlug = currentStore?.slug;
            const baseUrl = window.location.origin;
            const deliveryLink = storeSlug ? `${baseUrl}/pedido/${storeSlug}` : null;
            if (!deliveryLink) return null;
            return (
              <div className="surface-card rounded-2xl p-6 space-y-3">
                <div><p className="text-sm font-black text-foreground flex items-center gap-2">Link do Delivery</p><p className="text-sm text-muted-foreground mt-0.5">Compartilhe este link no WhatsApp Business</p></div>
                <div className="flex items-center gap-2">
                  <Input value={deliveryLink} readOnly className="text-sm font-mono bg-muted h-11 rounded-xl" />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => { navigator.clipboard.writeText(deliveryLink); toast.success("Link copiado!"); }}>Copiar</Button>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-sm" onClick={() => window.open(deliveryLink, "_blank")}><ExternalLink className="h-3.5 w-3.5" />Abrir link</Button>
              </div>
            );
          })()}

          {/* Cardápio Digital público */}
          {(() => {
            const currentStore = stores.find((s) => s.id === storeId);
            const storeSlug = currentStore?.slug;
            const baseUrl = window.location.origin;
            const cardapioLink = storeSlug ? `${baseUrl}/cardapio/${storeSlug}` : null;
            if (!cardapioLink) return null;
            return (
              <div className="surface-card rounded-2xl p-6 space-y-3">
                <div><p className="text-sm font-black text-foreground flex items-center gap-2">Cardápio Digital</p><p className="text-sm text-muted-foreground mt-0.5">Link público do cardápio</p></div>
                <div className="flex items-center gap-2">
                  <Input value={cardapioLink} readOnly className="text-sm font-mono bg-muted h-11 rounded-xl" />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => { navigator.clipboard.writeText(cardapioLink); toast.success("Link copiado!"); }}>Copiar</Button>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-sm" onClick={() => window.open(cardapioLink, "_blank")}><ExternalLink className="h-3.5 w-3.5" />Abrir cardápio</Button>
              </div>
            );
          })()}

          {/* Horário de funcionamento */}
          {(() => {
            const DIAS: { key: keyof HorariosSemana; label: string }[] = [
              { key: "seg", label: "Segunda" }, { key: "ter", label: "Terça" }, { key: "qua", label: "Quarta" },
              { key: "qui", label: "Quinta" }, { key: "sex", label: "Sexta" }, { key: "sab", label: "Sábado" }, { key: "dom", label: "Domingo" },
            ];
            const horarios = horariosFuncionamento;
            const updateDia = (dia: keyof HorariosSemana, patch: Partial<HorarioFuncionamento>) => {
              const next = { ...horarios, [dia]: { ...horarios[dia], ...patch } };
              setHorariosFuncionamento(next);
              setSistemaConfig((prev) => ({ ...prev, horarioFuncionamento: next }));
              saveHorariosFuncionamento(next, storeId);
            };
            return (
              <div className="surface-card rounded-2xl p-6 space-y-4">
                <div><p className="text-sm font-black text-foreground flex items-center gap-2">Horário de funcionamento</p><p className="text-sm text-muted-foreground mt-0.5">Define quando o delivery aceita pedidos</p></div>
                <div className="space-y-2">
                  {DIAS.map(({ key, label }) => {
                    const dia = horarios[key];
                    return (
                      <div key={key} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${dia.ativo ? "border-border bg-card" : "border-border/50 bg-secondary/30 opacity-60"}`}>
                        <button type="button" onClick={() => updateDia(key, { ativo: !dia.ativo })} className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${dia.ativo ? "bg-primary" : "bg-border"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${dia.ativo ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span className="text-sm font-bold text-foreground w-20 shrink-0">{label}</span>
                        {dia.ativo && (
                          <div className="flex items-center gap-2 flex-1">
                            <Input type="time" value={dia.abertura} onChange={(e) => updateDia(key, { abertura: e.target.value })} className="h-9 rounded-lg text-sm font-bold w-24" />
                            <span className="text-sm text-muted-foreground">até</span>
                            <Input type="time" value={dia.fechamento} onChange={(e) => updateDia(key, { fechamento: e.target.value })} className="h-9 rounded-lg text-sm font-bold w-24" />
                          </div>
                        )}
                        {!dia.ativo && <span className="text-sm text-muted-foreground italic">Fechado</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2"><label className="text-sm font-bold text-muted-foreground">Mensagem quando fechado (opcional)</label><Input className="h-11 rounded-xl" value={sistemaConfig.mensagemFechado || ""} onChange={(e) => setSistemaConfig(c => ({ ...c, mensagemFechado: e.target.value }))} placeholder="Ex.: Voltamos amanhã!" /></div>
              </div>
            );
          })()}

          {/* Modo de entrega */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <p className="text-base font-bold text-muted-foreground">Modo de entrega</p>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => { setDeliveryModo("todos"); localStorage.setItem("obsidian-delivery-modo-v1", "todos"); }}>
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${deliveryModo === "todos" ? "border-primary" : "border-muted-foreground/40"}`}>{deliveryModo === "todos" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
              <span className={`text-sm font-semibold ${deliveryModo === "todos" ? "text-foreground" : "text-muted-foreground"}`}>Atender todos os bairros</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => { setDeliveryModo("cadastrados"); localStorage.setItem("obsidian-delivery-modo-v1", "cadastrados"); }}>
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${deliveryModo === "cadastrados" ? "border-primary" : "border-muted-foreground/40"}`}>{deliveryModo === "cadastrados" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
              <span className={`text-sm font-semibold ${deliveryModo === "cadastrados" ? "text-foreground" : "text-muted-foreground"}`}>Somente bairros cadastrados</span>
            </label>
          </div>

          {/* Taxa padrão */}
          <div className="surface-card rounded-2xl p-6 space-y-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Taxa de entrega padrão (R$)</label>
              <Input className="h-11 rounded-xl" type="number" min="0" step="0.5" value={sistemaConfig.taxaEntrega ?? ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, taxaEntrega: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="0.00" />
              <p className="text-sm text-amber-400 font-semibold">⚠️ Taxa legada — usada quando nenhum bairro está cadastrado</p>
            </div>
          </div>

          {/* Bairros */}
          <div className="surface-card space-y-4 rounded-2xl p-6">
            <p className="text-base font-bold text-muted-foreground">Taxas por bairro</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2"><label className="text-sm font-bold text-muted-foreground">Nome do bairro</label><Input className="h-11 rounded-xl" value={novoBairroNome} onChange={(e) => setNovoBairroNome(e.target.value)} placeholder="Ex.: Centro" /></div>
              <div className="w-28 space-y-2"><label className="text-sm font-bold text-muted-foreground">Taxa (R$)</label><Input className="h-11 rounded-xl" type="number" min="0" step="0.5" value={novoBairroTaxa} onChange={(e) => setNovoBairroTaxa(e.target.value)} placeholder="5.00" /></div>
              <Button className="rounded-xl font-bold gap-1 shrink-0" disabled={!novoBairroNome.trim() || !novoBairroTaxa} onClick={() => {
                const taxa = parseFloat(novoBairroTaxa);
                if (isNaN(taxa) || taxa < 0) return;
                const novo: Bairro = { id: crypto.randomUUID(), nome: novoBairroNome.trim(), taxa, ativo: true };
                const next = [...bairros, novo];
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

          {/* Tempo de entrega */}
          <div className="surface-card rounded-2xl p-6 space-y-2">
            <div className="space-y-2"><label className="text-sm font-bold text-muted-foreground">Tempo estimado de entrega</label><Input className="h-11 rounded-xl" value={sistemaConfig.tempoEntrega || ""} onChange={(e) => setSistemaConfig(c => ({ ...c, tempoEntrega: e.target.value }))} placeholder="Ex.: 30-50 min" /></div>
          </div>
          <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </div>
      )}

      {/* MEU RESTAURANTE */}
      {configSection === "restaurante" && (() => {
        const tipoAtual = sistemaConfig.tipoRestaurante || "restaurante";
        const modulos = sistemaConfig.modulos ?? {};

        const handleTipoChange = (tipo: "restaurante" | "fastfood" | "completo") => {
          const planoModulos = getModulosDoPlano(tipo as PlanoModulos);
          const next: SistemaConfig = {
            ...sistemaConfig,
            tipoRestaurante: tipo,
            modoOperacao: tipo === "fastfood" ? "fast_food" : tipo,
            modulos: {
              ...planoModulos,
              delivery: sistemaConfig.deliveryAtivo === true,
              motoboy: sistemaConfig.deliveryAtivo === true,
            },
          };
          setSistemaConfig(next);
          saveSistemaConfig(next, storeId);
          saveSistemaConfigAsync(next, storeId);
          toast.success("Tipo de restaurante atualizado");
        };

        const handleDeliveryToggle = (v: boolean) => {
          const next: SistemaConfig = {
            ...sistemaConfig,
            deliveryAtivo: v,
            modulos: { ...sistemaConfig.modulos, delivery: v, motoboy: v },
          };
          setSistemaConfig(next);
          saveSistemaConfig(next, storeId);
          saveSistemaConfigAsync(next, storeId);
          toast.success(v ? "Delivery ativado" : "Delivery desativado");
        };

        const tipos = [
          { id: "restaurante" as const, icon: Store, nome: "RESTAURANTE", desc: "Garçom anota pedido, cozinha prepara, garçom leva na mesa" },
          { id: "fastfood" as const, icon: Truck, nome: "FAST FOOD", desc: "Cliente pede no totem ou balcão, retira quando aparece na TV" },
          { id: "completo" as const, icon: Database, nome: "COMPLETO", desc: "Usa todos os modos de atendimento" },
        ];

        const activeModules = [
          { key: "mesas", label: "Mesas" },
          { key: "balcao", label: "Balcão" },
          { key: "cozinha", label: "Cozinha" },
          { key: "totem", label: "Totem" },
          { key: "tvRetirada", label: "TV Retirada" },
          { key: "garcomPdv", label: "Garçom PDV" },
          { key: "delivery", label: "Delivery" },
          { key: "motoboy", label: "Motoboy" },
        ].filter(m => !!(modulos as any)[m.key]);

        return (
          <div className="space-y-5 max-w-lg">
            {/* A) Tipo do restaurante */}
            <div className="space-y-3">
              <p className="text-base font-bold text-muted-foreground">Tipo de atendimento</p>
              {tipos.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} type="button" onClick={() => handleTipoChange(t.id)}
                    className={`w-full flex items-start gap-4 rounded-2xl border p-5 text-left transition-colors ${
                      tipoAtual === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <Icon className="h-6 w-6 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className={`text-sm font-black ${tipoAtual === t.id ? "text-primary" : "text-foreground"}`}>{t.nome}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                    {tipoAtual === t.id && (
                      <span className="ml-auto mt-1 text-primary text-lg">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* B) Delivery addon */}
            <div className="surface-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Delivery (entrega em casa)</p>
                    <p className="text-sm text-muted-foreground">Addon independente do tipo de restaurante</p>
                  </div>
                </div>
                <Switch checked={sistemaConfig.deliveryAtivo === true} onCheckedChange={handleDeliveryToggle} />
              </div>
              {sistemaConfig.deliveryAtivo === true && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <p className="text-sm font-bold text-muted-foreground">Modo do caixa delivery</p>
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => {
                    const next = { ...sistemaConfig, deliverySeparado: false };
                    setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                  }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${!sistemaConfig.deliverySeparado ? "border-primary" : "border-muted-foreground/40"}`}>
                      {!sistemaConfig.deliverySeparado && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <span className={`text-sm font-semibold ${!sistemaConfig.deliverySeparado ? "text-foreground" : "text-muted-foreground"}`}>Caixa único</span>
                      <p className="text-sm text-muted-foreground">Delivery junto com presencial</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => {
                    const next = { ...sistemaConfig, deliverySeparado: true };
                    setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                  }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${sistemaConfig.deliverySeparado ? "border-primary" : "border-muted-foreground/40"}`}>
                      {sistemaConfig.deliverySeparado && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <span className={`text-sm font-semibold ${sistemaConfig.deliverySeparado ? "text-foreground" : "text-muted-foreground"}`}>Caixa separado</span>
                      <p className="text-sm text-muted-foreground">Operador exclusivo para delivery</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* C) Configurações extras */}
            {(tipoAtual === "fastfood" || tipoAtual === "completo") && (
              <div className="surface-card rounded-2xl p-6 space-y-3">
                <p className="text-base font-bold text-muted-foreground">Identificação do pedido (Totem/Balcão)</p>
                <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, identificacaoFastFood: "codigo" as const }; setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId); }}>
                  <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" ? "border-primary" : "border-muted-foreground/40"}`}>{(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                  <div><span className={`text-sm font-semibold ${(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" ? "text-foreground" : "text-muted-foreground"}`}>Código numérico</span><p className="text-sm text-muted-foreground">Número sequencial automático</p></div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, identificacaoFastFood: "nome_cliente" as const }; setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId); }}>
                  <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${sistemaConfig.identificacaoFastFood === "nome_cliente" ? "border-primary" : "border-muted-foreground/40"}`}>{sistemaConfig.identificacaoFastFood === "nome_cliente" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                  <div><span className={`text-sm font-semibold ${sistemaConfig.identificacaoFastFood === "nome_cliente" ? "text-foreground" : "text-muted-foreground"}`}>Nome do cliente</span><p className="text-sm text-muted-foreground">Comanda exibe o nome informado</p></div>
                </label>
              </div>
            )}

            {/* CPF na nota */}
            <div className="surface-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-black text-foreground">Solicitar CPF na nota</p><p className="text-sm text-muted-foreground mt-0.5">Necessário para emissão de nota fiscal.</p></div>
                <Switch checked={sistemaConfig.cpfNotaAtivo ?? false} onCheckedChange={(v) => setSistemaConfig((prev) => ({ ...prev, cpfNotaAtivo: v }))} />
              </div>
            </div>

            {/* Couvert */}
            {(tipoAtual === "restaurante" || tipoAtual === "completo") && (
              <div className="surface-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-black text-foreground">Couvert / Taxa de serviço</p><p className="text-sm text-muted-foreground mt-0.5">Cobrado por pessoa ao fechar a conta</p></div>
                  <Switch checked={sistemaConfig.couvertAtivo ?? false} onCheckedChange={(v) => setSistemaConfig(c => ({ ...c, couvertAtivo: v }))} />
                </div>
                {sistemaConfig.couvertAtivo && (
                  <>
                    <div className="space-y-2"><label className="text-sm font-bold text-muted-foreground">Valor por pessoa (R$)</label><Input value={sistemaConfig.couvertValor ? sistemaConfig.couvertValor.toFixed(2).replace(".", ",") : ""} onChange={e => { const val = parseFloat(e.target.value.replace(",", ".")) || 0; setSistemaConfig(c => ({ ...c, couvertValor: Number.isFinite(val) ? val : 0 })); }} placeholder="Ex.: 5,00" inputMode="decimal" className="h-11 rounded-xl text-sm max-w-[160px]" /></div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-bold text-foreground">Obrigatório</p><p className="text-sm text-muted-foreground">Se desligado, operador pode dispensar</p></div>
                      <Switch checked={sistemaConfig.couvertObrigatorio ?? false} onCheckedChange={(v) => setSistemaConfig(c => ({ ...c, couvertObrigatorio: v }))} />
                    </div>
                  </>
                )}
              </div>
            )}


            {/* D) Resumo visual */}
            {activeModules.length > 0 && (
              <div className="surface-card rounded-2xl p-5 space-y-3">
                <p className="text-base font-bold text-muted-foreground">Seu restaurante usa</p>
                <div className="flex flex-wrap gap-2">
                  {activeModules.map(m => (
                    <span key={m.key} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-bold text-primary">
                      ✓ {m.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
          </div>
        );
      })()}

      {/* IMPRESSORAS */}
      {configSection === "impressoras" && (() => {
        const impressoras: ImpressoraConfig[] = (sistemaConfig as any).impressoras ?? [];
        const resetForm = () => { setImpFormNome(""); setImpFormSetor("cozinha"); setImpFormTipo("rede"); setImpFormIp(""); setImpFormLargura("80mm"); setImpFormAtiva(true); setImpEditando(null); };
        const openNew = () => { resetForm(); setImpShowForm(true); };
        const openEditImp = (imp: ImpressoraConfig) => {
          setImpEditando(imp); setImpFormNome(imp.nome); setImpFormSetor(imp.setor); setImpFormTipo(imp.tipo); setImpFormIp(imp.ip); setImpFormLargura(imp.largura); setImpFormAtiva(imp.ativa); setImpShowForm(true);
        };
        const salvar = async () => {
          if (!impFormNome.trim()) { toast.error("Informe o nome da impressora"); return; }
          const nova: ImpressoraConfig = { id: impEditando?.id ?? crypto.randomUUID(), nome: impFormNome.trim(), setor: impFormSetor, tipo: impFormTipo, ip: impFormIp.trim(), largura: impFormLargura, ativa: impFormAtiva };
          const novaLista = impEditando ? impressoras.map(i => i.id === impEditando.id ? nova : i) : [...impressoras, nova];
          const updated = { ...sistemaConfig, impressoras: novaLista };
          setSistemaConfig(updated); await saveSistemaConfig(updated, storeId);
          toast.success(impEditando ? "Impressora atualizada" : "Impressora adicionada");
          setImpShowForm(false); resetForm();
        };
        const excluir = async (id: string) => {
          const novaLista = impressoras.filter(i => i.id !== id);
          const updated = { ...sistemaConfig, impressoras: novaLista };
          setSistemaConfig(updated); await saveSistemaConfig(updated, storeId); toast.success("Impressora removida");
        };
        const testarImpressao = (imp: ImpressoraConfig) => {
          const agora = new Date(); const dataStr = agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR");
          const w = window.open("", "_blank", "width=400,height=600"); if (!w) return;
          w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Teste</title><style>@page{margin:0;size:${imp.largura === "58mm" ? "58mm" : "80mm"} auto}*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:11px;width:${imp.largura === "58mm" ? "200px" : "280px"};padding:8px}h1{font-size:18px;font-weight:bold;text-align:center;margin-bottom:8px}.sep{text-align:center;margin:6px 0}.center{text-align:center}</style></head><body>`);
          w.document.write(`<h1>TESTE DE IMPRESSÃO</h1><div class="sep">--------------------------------</div><p class="center" style="font-weight:bold">${imp.nome}</p><p class="center">Setor: ${imp.setor}</p><p class="center">Tipo: ${imp.tipo}${imp.tipo === "rede" ? ` (${imp.ip || "sem IP"})` : ""}</p><p class="center">Largura: ${imp.largura}</p><div class="sep">--------------------------------</div><p class="center">${dataStr}</p><div class="sep">--------------------------------</div><p class="center" style="margin-top:8px">✅ Impressora funcionando!</p><script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
          w.document.close();
        };
        const setorLabels: Record<string, string> = { caixa: "Caixa", cozinha: "Cozinha", bar: "Bar", delivery: "Delivery" };
        const tipoLabels: Record<string, string> = { rede: "Rede (IP)", usb: "USB", bluetooth: "Bluetooth" };
        return (
          <div className="space-y-4 max-w-lg">
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4"><p className="text-sm text-blue-700 dark:text-blue-300">Configure suas impressoras térmicas. A impressão por rede (IP) estará disponível em breve.</p></div>
            {!impShowForm && (<Button onClick={openNew} className="w-full rounded-xl font-bold gap-2"><Plus className="h-4 w-4" /> Adicionar impressora</Button>)}
            {impShowForm && (
              <div className="surface-card space-y-4 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-foreground">{impEditando ? "Editar impressora" : "Nova impressora"}</h3>
                <div className="space-y-3">
                  <div><label className="text-sm font-bold text-muted-foreground">Nome</label><Input value={impFormNome} onChange={e => setImpFormNome(e.target.value)} placeholder="Ex: Cozinha Principal" className="rounded-xl mt-1 h-11" /></div>
                  <div><label className="text-sm font-bold text-muted-foreground">Setor</label><Select value={impFormSetor} onValueChange={v => setImpFormSetor(v as any)}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="caixa">Caixa</SelectItem><SelectItem value="cozinha">Cozinha</SelectItem><SelectItem value="bar">Bar</SelectItem><SelectItem value="delivery">Delivery</SelectItem></SelectContent></Select></div>
                  <div><label className="text-sm font-bold text-muted-foreground">Tipo de conexão</label><Select value={impFormTipo} onValueChange={v => setImpFormTipo(v as any)}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rede">Rede (IP)</SelectItem><SelectItem value="usb">USB</SelectItem><SelectItem value="bluetooth">Bluetooth</SelectItem></SelectContent></Select></div>
                  {impFormTipo === "rede" && (<div><label className="text-sm font-bold text-muted-foreground">Endereço IP</label><Input value={impFormIp} onChange={e => setImpFormIp(e.target.value)} placeholder="192.168.1.100" className="rounded-xl mt-1 h-11" /></div>)}
                  <div><label className="text-sm font-bold text-muted-foreground">Largura do papel</label><Select value={impFormLargura} onValueChange={v => setImpFormLargura(v as any)}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="58mm">58mm</SelectItem><SelectItem value="80mm">80mm</SelectItem></SelectContent></Select></div>
                  <div className="flex items-center justify-between"><label className="text-sm font-bold text-muted-foreground">Ativa</label><Switch checked={impFormAtiva} onCheckedChange={setImpFormAtiva} /></div>
                </div>
                <div className="flex gap-2"><Button onClick={salvar} className="flex-1 rounded-xl font-bold gap-2"><Save className="h-4 w-4" /> Salvar</Button><Button variant="outline" onClick={() => { setImpShowForm(false); resetForm(); }} className="rounded-xl"><X className="h-4 w-4" /></Button></div>
              </div>
            )}
            {impressoras.length === 0 && !impShowForm && (<p className="text-center text-sm text-muted-foreground py-8">Nenhuma impressora cadastrada</p>)}
            {impressoras.map(imp => (
              <div key={imp.id} className="surface-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Printer className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-bold text-foreground">{imp.nome}</p><p className="text-sm text-muted-foreground">{setorLabels[imp.setor]} · {tipoLabels[imp.tipo]}{imp.tipo === "rede" && imp.ip ? ` · ${imp.ip}` : ""} · {imp.largura}</p></div></div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${imp.ativa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{imp.ativa ? "Ativa" : "Inativa"}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => openEditImp(imp)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => testarImpressao(imp)}><Printer className="h-3.5 w-3.5" /> Imprimir teste</Button>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-destructive hover:text-destructive" onClick={() => excluir(imp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* SISTEMA */}
      {configSection === "sistema" && (
        <div className="space-y-4 max-w-lg">
          <div className="surface-card space-y-4 rounded-2xl p-6">
            <Button variant="outline" className="w-full rounded-xl font-bold gap-2" onClick={() => {
              const data: Record<string, unknown> = {};
              for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && (key.startsWith("obsidian-") || key.startsWith("orderly-"))) { try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { data[key] = localStorage.getItem(key); } } }
              const blob = new Blob([JSON.stringify({ _backupDate: new Date().toISOString(), _version: 1, data }, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `backup-orderly-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
              toast.success("Backup exportado com sucesso!");
            }}>
              Exportar backup
            </Button>
            <div className="space-y-2">
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                <Upload className="h-5 w-5" />Importar backup (.json)
                <input type="file" accept=".json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const parsed = JSON.parse(reader.result as string); const backupData = parsed.data || parsed;
                      if (typeof backupData !== "object") throw new Error("Formato inválido");
                      if (!window.confirm("Isso vai substituir todos os dados atuais. Confirmar?")) return;
                      Object.entries(backupData).forEach(([key, value]) => { if (key.startsWith("obsidian-") || key.startsWith("orderly-")) localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); });
                      toast.success("Backup restaurado! Recarregando..."); setTimeout(() => window.location.reload(), 800);
                    } catch { toast.error("Arquivo de backup inválido"); }
                  };
                  reader.readAsText(file); e.target.value = "";
                }} />
              </label>
              <p className="text-sm text-muted-foreground text-center">Selecione um arquivo .json exportado anteriormente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
