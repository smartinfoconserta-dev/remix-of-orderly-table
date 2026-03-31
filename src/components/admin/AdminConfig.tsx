import { useCallback, useEffect, useState } from "react";
import {
  Plus, Save, Trash2, X, Upload, ImagePlus, Pencil, Printer, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const TODOS_MODULOS = [
  { id: "cozinha", label: "Cozinha", icon: "🍳", desc: "Tela de preparo de pedidos" },
  { id: "delivery", label: "Delivery", icon: "🛵", desc: "Pedidos para entrega" },
  { id: "motoboy", label: "Motoboy", icon: "🏍️", desc: "Gestão de entregadores" },
  { id: "totem", label: "Totem", icon: "📱", desc: "Autoatendimento para clientes" },
  { id: "tvRetirada", label: "TV de Retirada", icon: "📺", desc: "Painel de chamada de pedidos" },
];

interface Props {
  storeId: string | null;
  storeName: string;
}

const AdminConfig = ({ storeId, storeName }: Props) => {
  const { stores } = useStore();
  const [configSection, setConfigSection] = useState<"inicio" | "identidade" | "delivery" | "salao" | "operacao" | "modulos" | "sistema" | "impressoras">("inicio");
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

  const saveSistema = useCallback(() => {
    saveSistemaConfig(sistemaConfig, storeId);
    saveSistemaConfigAsync(sistemaConfig, storeId);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig, storeId]);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        {configSection !== "inicio" && (
          <button onClick={() => setConfigSection("inicio")} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
        )}
        <div>
          <h2 className="text-2xl font-black text-foreground">
            {configSection === "inicio" && "Configurações"}
            {configSection === "identidade" && "🎨 Identidade Visual"}
            {configSection === "delivery" && "🛵 Delivery"}
            {configSection === "salao" && "🍽️ Salão"}
            {configSection === "operacao" && "⚙️ Operação"}
            {configSection === "modulos" && "🧩 Módulos"}
            {configSection === "sistema" && "💾 Sistema"}
            {configSection === "impressoras" && "🖨️ Impressoras"}
          </h2>
          {configSection === "inicio" && <p className="text-sm text-muted-foreground">Toque em um bloco para configurar</p>}
        </div>
      </div>

      {/* Grid de cards */}
      {configSection === "inicio" && (
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          {[
            { id: "identidade", icon: "🎨", label: "Identidade Visual", desc: "Logo, nome, cor, banners" },
            { id: "delivery", icon: "🛵", label: "Delivery", desc: "Horários, bairros, taxas" },
            { id: "salao", icon: "🍽️", label: "Salão", desc: "Boas-vindas, Wi-Fi, Instagram" },
            { id: "operacao", icon: "⚙️", label: "Operação", desc: "Cozinha, couvert, modos" },
            { id: "modulos", icon: "🧩", label: "Módulos", desc: "Ativar e desativar funcionalidades" },
            { id: "impressoras", icon: "🖨️", label: "Impressoras", desc: "Impressoras térmicas" },
            { id: "sistema", icon: "💾", label: "Sistema", desc: "Backup e restauração" },
          ].map(card => (
            <button key={card.id} onClick={() => setConfigSection(card.id as any)}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <span className="text-3xl">{card.icon}</span>
              <div><p className="text-sm font-black text-foreground">{card.label}</p><p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p></div>
            </button>
          ))}
        </div>
      )}

      {/* IDENTIDADE VISUAL */}
      {configSection === "identidade" && (
        <div className="space-y-4 max-w-lg">
          <div className="surface-card space-y-5 rounded-2xl p-6">
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Nome do restaurante</label><Input value={sistemaConfig.nomeRestaurante} onChange={(e) => setSistemaConfig((c) => ({ ...c, nomeRestaurante: e.target.value }))} placeholder="Nome do restaurante" /></div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Logo do restaurante</label>
              {(sistemaConfig.logoBase64 || sistemaConfig.logoUrl) && (
                <div className="flex items-center gap-3">
                  <img src={sistemaConfig.logoBase64 || sistemaConfig.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl border border-border object-cover" />
                  {sistemaConfig.logoBase64 && (<button type="button" onClick={() => setSistemaConfig((c) => ({ ...c, logoBase64: "" }))} className="text-xs text-destructive hover:underline">Remover foto</button>)}
                </div>
              )}
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                <Upload className="h-5 w-5" />Fazer upload da logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                  const reader = new FileReader();
                  reader.onload = () => setSistemaConfig((c) => ({ ...c, logoBase64: reader.result as string }));
                  reader.readAsDataURL(file); e.target.value = "";
                }} />
              </label>
              <p className="text-[10px] font-bold text-muted-foreground pt-1">Ou cole uma URL</p>
              <Input value={sistemaConfig.logoUrl} onChange={(e) => setSistemaConfig((c) => ({ ...c, logoUrl: e.target.value }))} placeholder="https://..." />
            </div>
            {/* Logo style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Formato da logo</label>
              <div className="flex gap-2">
                {([{ id: "quadrada" as const, label: "Quadrada", preview: "rounded-xl" }, { id: "circular" as const, label: "Circular", preview: "rounded-full" }]).map(opt => (
                  <button key={opt.id} type="button" onClick={() => setSistemaConfig(c => ({ ...c, logoEstilo: opt.id }))}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors flex-1 ${(sistemaConfig.logoEstilo || "quadrada") === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30"}`}>
                    <div className={`h-8 w-8 ${opt.preview} border border-border bg-card flex items-center justify-center shrink-0 overflow-hidden`}>
                      {(sistemaConfig.logoBase64 || sistemaConfig.logoUrl) ? (<img src={sistemaConfig.logoBase64 || sistemaConfig.logoUrl} alt="" className={`h-full w-full ${opt.preview} object-cover`} />) : (<span className="text-[8px] font-black text-muted-foreground">AB</span>)}
                    </div>
                    <span className="text-sm font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Cardápio header style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Topo do cardápio (tablet/totem)</label>
              <p className="text-[10px] text-muted-foreground">Como aparece o cabeçalho do cardápio digital</p>
              <div className="flex gap-2">
                {([{ id: "padrao" as const, label: "Padrão", icon: "🔤" }, { id: "banner" as const, label: "Banner personalizado", icon: "🖼️" }]).map(opt => (
                  <button key={opt.id} type="button" onClick={() => setSistemaConfig(c => ({ ...c, cardapioHeaderEstilo: opt.id }))}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors flex-1 ${(sistemaConfig.cardapioHeaderEstilo || "padrao") === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30"}`}>
                    <span className="text-xl">{opt.icon}</span><span className="text-sm font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
              {sistemaConfig.cardapioHeaderEstilo === "banner" && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-muted-foreground">Imagem de fundo do topo</label>
                  {sistemaConfig.cardapioBannerBase64 && (
                    <div className="flex items-center gap-3">
                      <img src={sistemaConfig.cardapioBannerBase64} alt="Banner" className="h-14 w-full max-w-xs rounded-xl border border-border object-cover" />
                      <button type="button" onClick={() => setSistemaConfig(c => ({ ...c, cardapioBannerBase64: "" }))} className="text-xs text-destructive hover:underline"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <ImagePlus className="h-5 w-5" />{sistemaConfig.cardapioBannerBase64 ? "Trocar imagem" : "Fazer upload do banner"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                      const reader = new FileReader();
                      reader.onload = () => setSistemaConfig(c => ({ ...c, cardapioBannerBase64: reader.result as string }));
                      reader.readAsDataURL(file); e.target.value = "";
                    }} />
                  </label>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Cor primária</label>
              <div className="flex items-center gap-3">
                <input type="color" value={sistemaConfig.corPrimaria || "#f97316"} onChange={(e) => setSistemaConfig((c) => ({ ...c, corPrimaria: e.target.value }))} className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent" />
                <span className="text-sm text-muted-foreground font-mono">{sistemaConfig.corPrimaria || "#f97316"}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="surface-card space-y-5 rounded-2xl p-6">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">📱 WhatsApp</p>
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Telefone WhatsApp do restaurante</label><Input value={sistemaConfig.telefoneRestaurante || ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, telefoneRestaurante: e.target.value.replace(/\D/g, "") }))} placeholder="11999999999 (só números com DDD)" inputMode="tel" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Mensagem de boas-vindas WhatsApp</label><Textarea value={sistemaConfig.mensagemBoasVindas ?? `Olá! Bem-vindo ao ${sistemaConfig.nomeRestaurante}! 😊 Clique para fazer seu pedido:`} onChange={(e) => setSistemaConfig((c) => ({ ...c, mensagemBoasVindas: e.target.value }))} rows={3} /></div>
          </div>

          {/* QR Codes */}
          <div className="surface-card space-y-5 rounded-2xl p-6">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">📲 QR Codes</p>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Instagram</p>
              <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">URL do Instagram</label><Input value={sistemaConfig.instagramUrl || ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, instagramUrl: e.target.value }))} placeholder="https://instagram.com/seurestaurante" /></div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Imagem de fundo</label>
                <div className="flex items-center gap-3">
                  {sistemaConfig.instagramBg && (<img src={sistemaConfig.instagramBg} alt="bg instagram" className="h-12 w-20 rounded-lg border border-border object-cover" />)}
                  <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40">
                    {sistemaConfig.instagramBg ? "Trocar" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setSistemaConfig((c) => ({ ...c, instagramBg: reader.result as string })); reader.readAsDataURL(file); }} />
                  </label>
                  {sistemaConfig.instagramBg && (<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => setSistemaConfig((c) => ({ ...c, instagramBg: "" }))}><Trash2 className="mr-1 h-3 w-3" /> Remover</Button>)}
                </div>
              </div>
              {sistemaConfig.instagramUrl && (<div className="text-center space-y-1"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sistemaConfig.instagramUrl)}`} alt="QR Instagram" className="h-16 w-16 rounded-lg border border-border" /></div>)}
            </div>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Wi-Fi</p>
              <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Senha do Wi-Fi</label><Input value={sistemaConfig.senhaWifi || ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, senhaWifi: e.target.value }))} placeholder="Senha da rede Wi-Fi" /></div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Imagem de fundo</label>
                <div className="flex items-center gap-3">
                  {sistemaConfig.wifiBg && (<img src={sistemaConfig.wifiBg} alt="bg wifi" className="h-12 w-20 rounded-lg border border-border object-cover" />)}
                  <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40">
                    {sistemaConfig.wifiBg ? "Trocar" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setSistemaConfig((c) => ({ ...c, wifiBg: reader.result as string })); reader.readAsDataURL(file); }} />
                  </label>
                  {sistemaConfig.wifiBg && (<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => setSistemaConfig((c) => ({ ...c, wifiBg: "" }))}><Trash2 className="mr-1 h-3 w-3" /> Remover</Button>)}
                </div>
              </div>
              {sistemaConfig.senhaWifi && (<div className="text-center space-y-1"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`WIFI:T:WPA;S:${sistemaConfig.nomeRestaurante};P:${sistemaConfig.senhaWifi};;`)}`} alt="QR Wi-Fi" className="h-16 w-16 rounded-lg border border-border" /></div>)}
            </div>
          </div>

          {/* Banners */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">🖼️ Banners</p>
            {(sistemaConfig.banners ?? []).map((banner, idx) => (
              <div key={banner.id} className="surface-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-muted-foreground">Banner {idx + 1}</span>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).filter((b) => b.id !== banner.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Input value={banner.titulo} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, titulo: e.target.value } : b) }))} placeholder="Título" />
                <Input value={banner.subtitulo} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, subtitulo: e.target.value } : b) }))} placeholder="Subtítulo" />
                <div className="flex gap-2">
                  <Input value={banner.preco} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, preco: e.target.value } : b) }))} placeholder="Preço (opcional)" className="w-1/2" />
                  <Input value={banner.imagemUrl} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, imagemUrl: e.target.value } : b) }))} placeholder="URL da imagem" className="flex-1" />
                </div>
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-3 py-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                  <Upload className="h-4 w-4" />Upload imagem do banner
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                    const reader = new FileReader();
                    reader.onload = () => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, imagemBase64: reader.result as string } : b) }));
                    reader.readAsDataURL(file); e.target.value = "";
                  }} />
                </label>
                {(banner.imagemBase64 || banner.imagemUrl) && (<img src={banner.imagemBase64 || banner.imagemUrl} alt="Preview" className="h-20 w-full rounded-xl border border-border object-cover" />)}
              </div>
            ))}
            {(sistemaConfig.banners ?? []).length < 5 && (
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setSistemaConfig((c) => ({ ...c, banners: [...(c.banners ?? []), { id: `banner-${Date.now()}`, titulo: "", subtitulo: "", preco: "", imagemUrl: "" }] }))}><Plus className="h-4 w-4 mr-1" /> Adicionar banner</Button>
            )}
          </div>
          <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </div>
      )}

      {/* DELIVERY */}
      {configSection === "delivery" && (
        <div className="space-y-4 max-w-lg">
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-bold text-foreground">{sistemaConfig.deliveryAtivo !== false ? "Delivery ativado" : "Delivery desativado"}</p><p className="text-xs text-muted-foreground">Controle se o link de delivery aceita pedidos</p></div>
              <Switch checked={sistemaConfig.deliveryAtivo !== false} onCheckedChange={(v) => { const next = { ...sistemaConfig, deliveryAtivo: v }; setSistemaConfig(next); saveSistemaConfig(next, storeId); toast.success(v ? "Delivery ativado" : "Delivery desativado"); }} />
            </div>
            {sistemaConfig.deliveryAtivo === false && (<p className="text-xs font-semibold text-destructive rounded-lg bg-destructive/10 px-3 py-2">⚠ Clientes não conseguem fazer pedidos pelo link de delivery</p>)}
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
                <div><p className="text-sm font-black text-foreground flex items-center gap-2">🔗 Link do Delivery</p><p className="text-xs text-muted-foreground mt-0.5">Compartilhe este link no WhatsApp Business</p></div>
                <div className="flex items-center gap-2">
                  <Input value={deliveryLink} readOnly className="text-xs font-mono bg-muted" />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => { navigator.clipboard.writeText(deliveryLink); toast.success("Link copiado!"); }}>Copiar</Button>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => window.open(deliveryLink, "_blank")}><ExternalLink className="h-3.5 w-3.5" />Abrir link</Button>
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
                <div><p className="text-sm font-black text-foreground flex items-center gap-2">📖 Cardápio Digital</p><p className="text-xs text-muted-foreground mt-0.5">Link público do cardápio</p></div>
                <div className="flex items-center gap-2">
                  <Input value={cardapioLink} readOnly className="text-xs font-mono bg-muted" />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => { navigator.clipboard.writeText(cardapioLink); toast.success("Link copiado!"); }}>Copiar</Button>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => window.open(cardapioLink, "_blank")}><ExternalLink className="h-3.5 w-3.5" />Abrir cardápio</Button>
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
                <div><p className="text-sm font-black text-foreground flex items-center gap-2">🕐 Horário de funcionamento</p><p className="text-xs text-muted-foreground mt-0.5">Define quando o delivery aceita pedidos</p></div>
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
                            <Input type="time" value={dia.abertura} onChange={(e) => updateDia(key, { abertura: e.target.value })} className="h-8 rounded-lg text-xs font-bold w-24" />
                            <span className="text-xs text-muted-foreground">até</span>
                            <Input type="time" value={dia.fechamento} onChange={(e) => updateDia(key, { fechamento: e.target.value })} className="h-8 rounded-lg text-xs font-bold w-24" />
                          </div>
                        )}
                        {!dia.ativo && <span className="text-xs text-muted-foreground italic">Fechado</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Mensagem quando fechado (opcional)</label><Input value={sistemaConfig.mensagemFechado || ""} onChange={(e) => setSistemaConfig(c => ({ ...c, mensagemFechado: e.target.value }))} placeholder="Ex.: Voltamos amanhã!" /></div>
              </div>
            );
          })()}

          {/* Modo de entrega */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modo de entrega</p>
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Taxa de entrega padrão (R$)</label>
              <Input type="number" min="0" step="0.5" value={sistemaConfig.taxaEntrega ?? ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, taxaEntrega: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="0.00" />
              <p className="text-[10px] text-amber-400 font-semibold">⚠️ Taxa legada — usada quando nenhum bairro está cadastrado</p>
            </div>
          </div>

          {/* Bairros */}
          <div className="surface-card space-y-4 rounded-2xl p-6">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Taxas por bairro</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Nome do bairro</label><Input value={novoBairroNome} onChange={(e) => setNovoBairroNome(e.target.value)} placeholder="Ex.: Centro" /></div>
              <div className="w-28 space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Taxa (R$)</label><Input type="number" min="0" step="0.5" value={novoBairroTaxa} onChange={(e) => setNovoBairroTaxa(e.target.value)} placeholder="5.00" /></div>
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
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Tempo estimado de entrega</label><Input value={sistemaConfig.tempoEntrega || ""} onChange={(e) => setSistemaConfig(c => ({ ...c, tempoEntrega: e.target.value }))} placeholder="Ex.: 30-50 min" /></div>
          </div>
          <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </div>
      )}

      {/* OPERAÇÃO */}
      {configSection === "operacao" && (
        <div className="space-y-4 max-w-lg">
          {/* Mesas toggle */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="text-xl">🍽️</span><div><p className="text-sm font-bold text-foreground">Mesas</p><p className="text-[10px] text-muted-foreground">Garçom + tablets nas mesas</p></div></div>
              <Switch checked={sistemaConfig.modulos?.mesas !== false} onCheckedChange={(v) => {
                const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, mesas: v } };
                setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                toast.success(v ? "Módulo Mesas ativado" : "Módulo Mesas desativado");
              }} />
            </div>
          </div>
          {/* Garçom PDV */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="text-xl">💳</span><div><p className="text-sm font-bold text-foreground">Garçom PDV</p><p className="text-[10px] text-muted-foreground">Garçom tira pedido e cobra digitalmente na hora</p></div></div>
              <Switch checked={sistemaConfig.modulos?.garcomPdv === true} onCheckedChange={(v) => {
                const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, garcomPdv: v } };
                setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                toast.success(v ? "Garçom PDV ativado" : "Garçom PDV desativado");
              }} />
            </div>
          </div>
          {/* Balcão */}
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3"><span className="text-xl">🏪</span><div><p className="text-sm font-bold text-foreground">Balcão</p><p className="text-[10px] text-muted-foreground">Pedidos sem mesa</p></div></div>
            <Switch checked={sistemaConfig.modulos?.balcao === true} onCheckedChange={(v) => {
              const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, balcao: v } };
              setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
              toast.success(v ? "Módulo Balcão ativado" : "Módulo Balcão desativado");
            }} />
          </div>
          {/* Totem */}
          {(() => {
            const plano = (licencaConfig.plano || sistemaConfig.plano || "restaurante") as PlanoModulos;
            const liberado = getModulosDoPlano(plano).totem;
            return (
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3"><span className="text-xl">🖥️</span><div><p className="text-sm font-bold text-foreground">Totem</p><p className="text-[10px] text-muted-foreground">Autoatendimento</p></div></div>
                {liberado ? (<Switch checked={sistemaConfig.modulos?.totem === true} onCheckedChange={(v) => {
                  const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, totem: v } };
                  setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                  toast.success(v ? "Módulo Totem ativado" : "Módulo Totem desativado");
                }} />) : (<span className="text-xs text-muted-foreground flex items-center gap-1">🔒 Bloqueado</span>)}
              </div>
            );
          })()}
          {/* Delivery */}
          {(() => {
            const plano = (licencaConfig.plano || sistemaConfig.plano || "restaurante") as PlanoModulos;
            const liberado = getModulosDoPlano(plano).delivery;
            return (
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3"><span className="text-xl">🛵</span><div><p className="text-sm font-bold text-foreground">Delivery</p><p className="text-[10px] text-muted-foreground">Pedidos para entrega</p></div></div>
                {liberado ? (<Switch checked={sistemaConfig.modulos?.delivery !== false && sistemaConfig.deliveryAtivo !== false} onCheckedChange={(v) => {
                  const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, delivery: v }, deliveryAtivo: v };
                  setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                  toast.success(v ? "Módulo Delivery ativado" : "Módulo Delivery desativado");
                }} />) : (<span className="text-xs text-muted-foreground flex items-center gap-1">🔒 Bloqueado</span>)}
              </div>
            );
          })()}

          {/* Identificação do pedido */}
          {(sistemaConfig.modulos?.totem === true || sistemaConfig.modulos?.balcao === true) && (
            <div className="surface-card rounded-2xl p-6 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Identificação do pedido (Totem/Balcão)</p>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, identificacaoFastFood: "codigo" as const }; setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId); }}>
                <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" ? "border-primary" : "border-muted-foreground/40"}`}>{(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                <div><span className={`text-sm font-semibold ${(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" ? "text-foreground" : "text-muted-foreground"}`}>Código numérico</span><p className="text-[10px] text-muted-foreground">Número sequencial automático</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, identificacaoFastFood: "nome_cliente" as const }; setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId); }}>
                <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${sistemaConfig.identificacaoFastFood === "nome_cliente" ? "border-primary" : "border-muted-foreground/40"}`}>{sistemaConfig.identificacaoFastFood === "nome_cliente" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                <div><span className={`text-sm font-semibold ${sistemaConfig.identificacaoFastFood === "nome_cliente" ? "text-foreground" : "text-muted-foreground"}`}>Nome do cliente</span><p className="text-[10px] text-muted-foreground">Comanda exibe o nome informado</p></div>
              </label>
            </div>
          )}

          {/* CPF na nota */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-black text-foreground">📄 Solicitar CPF na nota</p><p className="text-xs text-muted-foreground mt-0.5">Necessário para emissão de nota fiscal.</p></div>
              <Switch checked={sistemaConfig.cpfNotaAtivo ?? false} onCheckedChange={(v) => setSistemaConfig((prev) => ({ ...prev, cpfNotaAtivo: v }))} />
            </div>
          </div>

          {/* Couvert */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-black text-foreground">Couvert / Taxa de serviço</p><p className="text-xs text-muted-foreground mt-0.5">Cobrado por pessoa ao fechar a conta</p></div>
              <button type="button" onClick={() => setSistemaConfig(c => ({ ...c, couvertAtivo: !c.couvertAtivo }))} className={`relative h-6 w-11 rounded-full transition-colors ${sistemaConfig.couvertAtivo ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sistemaConfig.couvertAtivo ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {sistemaConfig.couvertAtivo && (
              <>
                <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">Valor por pessoa (R$)</label><Input value={sistemaConfig.couvertValor ? sistemaConfig.couvertValor.toFixed(2).replace(".", ",") : ""} onChange={e => { const val = parseFloat(e.target.value.replace(",", ".")) || 0; setSistemaConfig(c => ({ ...c, couvertValor: Number.isFinite(val) ? val : 0 })); }} placeholder="Ex.: 5,00" inputMode="decimal" className="h-10 rounded-xl text-sm max-w-[160px]" /></div>
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-bold text-foreground">Obrigatório</p><p className="text-xs text-muted-foreground">Se desligado, operador pode dispensar</p></div>
                  <button type="button" onClick={() => setSistemaConfig(c => ({ ...c, couvertObrigatorio: !c.couvertObrigatorio }))} className={`relative h-6 w-11 rounded-full transition-colors ${sistemaConfig.couvertObrigatorio ? "bg-primary" : "bg-border"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sistemaConfig.couvertObrigatorio ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Impressão por setor */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-black text-foreground">Impressão por setor</p><p className="text-xs text-muted-foreground mt-0.5">Separa cozinha e bar em comandas distintas</p></div>
              <Switch checked={sistemaConfig.impressaoPorSetor ?? false} onCheckedChange={(v) => setSistemaConfig((prev) => ({ ...prev, impressaoPorSetor: v }))} />
            </div>
            {sistemaConfig.impressaoPorSetor && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">Nome da impressora — Cozinha</label><Input value={sistemaConfig.nomeImpressoraCozinha ?? ""} onChange={(e) => setSistemaConfig((prev) => ({ ...prev, nomeImpressoraCozinha: e.target.value }))} placeholder="Ex: EPSON-COZINHA" className="h-9 text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">Nome da impressora — Bar</label><Input value={sistemaConfig.nomeImpressoraBar ?? ""} onChange={(e) => setSistemaConfig((prev) => ({ ...prev, nomeImpressoraBar: e.target.value }))} placeholder="Ex: EPSON-BAR" className="h-9 text-sm" /></div>
                <p className="text-[10px] text-muted-foreground">Na demonstração abre janelas separadas. Na produção, o nome é usado para rotear para a impressora correta.</p>
              </div>
            )}
          </div>

          {/* Modo identificação delivery */}
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modo de identificação</p>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, modoIdentificacaoDelivery: "visitante" as const }; setSistemaConfig(next); saveSistemaConfig(next, storeId); }}>
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${(sistemaConfig.modoIdentificacaoDelivery || "visitante") === "visitante" ? "border-primary" : "border-muted-foreground/40"}`}>{(sistemaConfig.modoIdentificacaoDelivery || "visitante") === "visitante" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
              <div><span className={`text-sm font-semibold ${(sistemaConfig.modoIdentificacaoDelivery || "visitante") === "visitante" ? "text-foreground" : "text-muted-foreground"}`}>Modo visitante</span><p className="text-[10px] text-muted-foreground">Cliente preenche dados ao finalizar o pedido</p></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, modoIdentificacaoDelivery: "cadastro" as const }; setSistemaConfig(next); saveSistemaConfig(next, storeId); }}>
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${sistemaConfig.modoIdentificacaoDelivery === "cadastro" ? "border-primary" : "border-muted-foreground/40"}`}>{sistemaConfig.modoIdentificacaoDelivery === "cadastro" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
              <div><span className={`text-sm font-semibold ${sistemaConfig.modoIdentificacaoDelivery === "cadastro" ? "text-foreground" : "text-muted-foreground"}`}>Modo cadastro</span><p className="text-[10px] text-muted-foreground">Cliente cria conta com telefone e senha</p></div>
            </label>
          </div>
          <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </div>
      )}

      {/* MÓDULOS */}
      {configSection === "modulos" && (
        <div className="space-y-4 max-w-lg">
          {TODOS_MODULOS.map(mod => {
            const plano = (licencaConfig.plano || sistemaConfig.plano || "restaurante") as PlanoModulos;
            const modulosLiberados = getModulosDoPlano(plano);
            const liberado = !!(modulosLiberados as any)[mod.id];
            const ativo = !!(sistemaConfig.modulos as any)?.[mod.id];
            return (
              <div key={mod.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mod.icon}</span>
                    <div><p className="text-sm font-black text-foreground">{mod.label}</p><p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p></div>
                  </div>
                  {liberado ? (
                    <Switch checked={ativo} onCheckedChange={(v) => {
                      const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, [mod.id]: v } };
                      setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId);
                      toast.success(v ? `${mod.label} ativado` : `${mod.label} desativado`);
                    }} />
                  ) : (<span className="text-xs text-muted-foreground flex items-center gap-1">🔒 Bloqueado — upgrade</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                  <div><label className="text-xs font-bold text-muted-foreground">Nome</label><Input value={impFormNome} onChange={e => setImpFormNome(e.target.value)} placeholder="Ex: Cozinha Principal" className="rounded-xl mt-1" /></div>
                  <div><label className="text-xs font-bold text-muted-foreground">Setor</label><Select value={impFormSetor} onValueChange={v => setImpFormSetor(v as any)}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="caixa">Caixa</SelectItem><SelectItem value="cozinha">Cozinha</SelectItem><SelectItem value="bar">Bar</SelectItem><SelectItem value="delivery">Delivery</SelectItem></SelectContent></Select></div>
                  <div><label className="text-xs font-bold text-muted-foreground">Tipo de conexão</label><Select value={impFormTipo} onValueChange={v => setImpFormTipo(v as any)}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rede">Rede (IP)</SelectItem><SelectItem value="usb">USB</SelectItem><SelectItem value="bluetooth">Bluetooth</SelectItem></SelectContent></Select></div>
                  {impFormTipo === "rede" && (<div><label className="text-xs font-bold text-muted-foreground">Endereço IP</label><Input value={impFormIp} onChange={e => setImpFormIp(e.target.value)} placeholder="192.168.1.100" className="rounded-xl mt-1" /></div>)}
                  <div><label className="text-xs font-bold text-muted-foreground">Largura do papel</label><Select value={impFormLargura} onValueChange={v => setImpFormLargura(v as any)}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="58mm">58mm</SelectItem><SelectItem value="80mm">80mm</SelectItem></SelectContent></Select></div>
                  <div className="flex items-center justify-between"><label className="text-xs font-bold text-muted-foreground">Ativa</label><Switch checked={impFormAtiva} onCheckedChange={setImpFormAtiva} /></div>
                </div>
                <div className="flex gap-2"><Button onClick={salvar} className="flex-1 rounded-xl font-bold gap-2"><Save className="h-4 w-4" /> Salvar</Button><Button variant="outline" onClick={() => { setImpShowForm(false); resetForm(); }} className="rounded-xl"><X className="h-4 w-4" /></Button></div>
              </div>
            )}
            {impressoras.length === 0 && !impShowForm && (<p className="text-center text-sm text-muted-foreground py-8">Nenhuma impressora cadastrada</p>)}
            {impressoras.map(imp => (
              <div key={imp.id} className="surface-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Printer className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-bold text-foreground">{imp.nome}</p><p className="text-xs text-muted-foreground">{setorLabels[imp.setor]} · {tipoLabels[imp.tipo]}{imp.tipo === "rede" && imp.ip ? ` · ${imp.ip}` : ""} · {imp.largura}</p></div></div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${imp.ativa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{imp.ativa ? "Ativa" : "Inativa"}</span>
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
              <span className="mr-1">📥</span> Exportar backup
            </Button>
            <div className="space-y-2">
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
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
              <p className="text-[10px] text-muted-foreground text-center">Selecione um arquivo .json exportado anteriormente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
