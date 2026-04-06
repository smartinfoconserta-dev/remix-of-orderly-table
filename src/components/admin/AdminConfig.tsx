import { useCallback, useEffect, useState } from "react";
import {
  Plus, Save, Trash2, X, Upload, Pencil, Printer, Store, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getSistemaConfig, saveSistemaConfig, saveSistemaConfigAsync, getSistemaConfigAsync,
  applyCustomPrimaryColor, getModulosDoPlano,
  type SistemaConfig, type PlanoModulos, type ImpressoraConfig,
} from "@/lib/adminStorage";
import { toast } from "sonner";

type ConfigSection = "inicio" | "restaurante" | "impressoras" | "sistema";

interface Props {
  storeId: string | null;
  storeName: string;
  onOpenWizard?: () => void;
}

const sections = [
  { id: "restaurante" as const, icon: Store, label: "Tipo de restaurante", desc: "Modo de operação e módulos ativos" },
  { id: "impressoras" as const, icon: Printer, label: "Impressoras", desc: "Impressoras térmicas" },
  { id: "sistema" as const, icon: Database, label: "Sistema", desc: "Backup e restauração" },
];

const AdminConfig = ({ storeId, storeName, onOpenWizard }: Props) => {
  const [configSection, setConfigSection] = useState<ConfigSection>("inicio");
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);

  const [impEditando, setImpEditando] = useState<ImpressoraConfig | null>(null);
  const [impFormNome, setImpFormNome] = useState("");
  const [impFormSetor, setImpFormSetor] = useState<"caixa" | "cozinha" | "bar" | "delivery">("cozinha");
  const [impFormTipo, setImpFormTipo] = useState<"rede" | "usb" | "bluetooth">("rede");
  const [impFormIp, setImpFormIp] = useState("");
  const [impFormLargura, setImpFormLargura] = useState<"58mm" | "80mm">("80mm");
  const [impFormAtiva, setImpFormAtiva] = useState(true);
  const [impShowForm, setImpShowForm] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then(setSistemaConfig);
  }, [storeId]);

  const saveSistema = useCallback((configOverride?: SistemaConfig | unknown) => {
    const toSave = (configOverride && typeof configOverride === "object" && "nomeRestaurante" in (configOverride as any)) ? configOverride as SistemaConfig : sistemaConfig;
    saveSistemaConfig(toSave, storeId);
    saveSistemaConfigAsync(toSave, storeId);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig, storeId]);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center gap-3">
        {configSection !== "inicio" && (
          <button onClick={() => setConfigSection("inicio")} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
        )}
        <h2 className="text-2xl font-black text-foreground">
          {configSection === "inicio" ? "Configurações" : sections.find(s => s.id === configSection)?.label}
        </h2>
      </div>
      {configSection === "inicio" && <p className="text-sm text-muted-foreground">Configurações técnicas do sistema</p>}

      {/* Grid */}
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

      {/* RESTAURANTE — tipo + módulos + opções gerais */}
      {configSection === "restaurante" && (() => {
        const tipoAtual = sistemaConfig.tipoRestaurante || "restaurante";
        const modulos = sistemaConfig.modulos ?? {};

        const activeModules = [
          { key: "mesas", label: "Mesas" }, { key: "balcao", label: "Balcão" },
          { key: "cozinha", label: "Cozinha" }, { key: "totem", label: "Totem" },
          { key: "tvRetirada", label: "TV Retirada" }, { key: "garcomPdv", label: "Garçom PDV" },
          { key: "delivery", label: "Delivery" }, { key: "motoboy", label: "Motoboy" },
        ].filter(m => !!(modulos as any)[m.key]);

        const toggleModule = (key: string) => {
          const next = { ...sistemaConfig, modulos: { ...modulos, [key]: !(modulos as any)[key] } };
          setSistemaConfig(next);
          saveSistemaConfig(next, storeId);
          saveSistemaConfigAsync(next, storeId);
        };

        return (
          <div className="space-y-5 max-w-lg">
            {/* Mode indicator */}
            <div className="surface-card rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modo atual</p>
                <p className="text-base font-black text-foreground mt-0.5">
                  {tipoAtual === "fastfood" ? "Fast Food" : tipoAtual === "completo" ? "Completo" : "Restaurante com Mesas"}
                </p>
              </div>
              {onOpenWizard && (
                <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs" onClick={onOpenWizard}>Reconfigurar</Button>
              )}
            </div>

            {/* Módulos */}
            <div className="surface-card rounded-2xl p-5 space-y-3">
              <p className="text-base font-bold text-muted-foreground">Módulos ativos (ajuste fino)</p>
              <p className="text-xs text-muted-foreground">Ative ou desative módulos individuais sem precisar repassar pelo wizard</p>
              <div className="space-y-2 pt-2">
                {[
                  { key: "mesas", label: "Mesas" }, { key: "balcao", label: "Balcão / Garçom PDV" },
                  { key: "cozinha", label: "Cozinha KDS" }, { key: "totem", label: "Totem" },
                  { key: "tvRetirada", label: "TV de Retirada" }, { key: "garcomPdv", label: "Garçom PDV" },
                  { key: "delivery", label: "Delivery" }, { key: "motoboy", label: "Motoboy / Entregador" },
                ].map(m => (
                  <div key={m.key} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-semibold text-foreground">{m.label}</span>
                    <Switch checked={!!(modulos as any)[m.key]} onCheckedChange={() => toggleModule(m.key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* CPF na nota */}
            <div className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-black text-foreground">Solicitar CPF na nota</p><p className="text-xs text-muted-foreground mt-0.5">Para emissão de nota fiscal</p></div>
                <Switch checked={sistemaConfig.cpfNotaAtivo ?? false} onCheckedChange={(v) => setSistemaConfig((prev) => ({ ...prev, cpfNotaAtivo: v }))} />
              </div>
            </div>

            {/* Couvert */}
            {(tipoAtual === "restaurante" || tipoAtual === "completo") && (
              <div className="surface-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-black text-foreground">Couvert / Taxa de serviço</p><p className="text-xs text-muted-foreground mt-0.5">Cobrado por pessoa ao fechar a conta</p></div>
                  <Switch checked={sistemaConfig.couvertAtivo ?? false} onCheckedChange={(v) => setSistemaConfig(c => ({ ...c, couvertAtivo: v }))} />
                </div>
                {sistemaConfig.couvertAtivo && (
                  <>
                    <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">Valor por pessoa (R$)</label><Input value={sistemaConfig.couvertValor ? sistemaConfig.couvertValor.toFixed(2).replace(".", ",") : ""} onChange={e => { const val = parseFloat(e.target.value.replace(",", ".")) || 0; setSistemaConfig(c => ({ ...c, couvertValor: Number.isFinite(val) ? val : 0 })); }} placeholder="Ex.: 5,00" inputMode="decimal" className="h-11 rounded-xl text-sm max-w-[160px]" /></div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-bold text-foreground">Obrigatório</p><p className="text-xs text-muted-foreground">Se desligado, operador pode dispensar</p></div>
                      <Switch checked={sistemaConfig.couvertObrigatorio ?? false} onCheckedChange={(v) => setSistemaConfig(c => ({ ...c, couvertObrigatorio: v }))} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Identificação Fast Food */}
            {(tipoAtual === "fastfood" || tipoAtual === "completo") && (
              <div className="surface-card rounded-2xl p-5 space-y-3">
                <p className="text-sm font-bold text-muted-foreground">Identificação do pedido (Totem/Balcão)</p>
                {([{ id: "codigo" as const, label: "Código numérico", desc: "Número sequencial automático" }, { id: "nome_cliente" as const, label: "Nome do cliente", desc: "Comanda exibe o nome informado" }]).map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer" onClick={() => { const next = { ...sistemaConfig, identificacaoFastFood: opt.id }; setSistemaConfig(next); saveSistemaConfig(next, storeId); saveSistemaConfigAsync(next, storeId); }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${(sistemaConfig.identificacaoFastFood || "codigo") === opt.id ? "border-primary" : "border-muted-foreground/40"}`}>
                      {(sistemaConfig.identificacaoFastFood || "codigo") === opt.id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <span className={`text-sm font-semibold ${(sistemaConfig.identificacaoFastFood || "codigo") === opt.id ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <Button onClick={saveSistema} className="rounded-xl font-black w-full"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
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
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4"><p className="text-sm text-blue-700 dark:text-blue-300">Configure suas impressoras térmicas.</p></div>
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
                  <div className="flex items-center gap-3"><Printer className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-bold text-foreground">{imp.nome}</p><p className="text-xs text-muted-foreground">{setorLabels[imp.setor]} · {tipoLabels[imp.tipo]}{imp.tipo === "rede" && imp.ip ? ` · ${imp.ip}` : ""} · {imp.largura}</p></div></div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${imp.ativa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{imp.ativa ? "Ativa" : "Inativa"}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => openEditImp(imp)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => testarImpressao(imp)}><Printer className="h-3.5 w-3.5" /> Teste</Button>
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
            }}>Exportar backup</Button>
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
              <p className="text-xs text-muted-foreground text-center">Selecione um arquivo .json exportado anteriormente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
