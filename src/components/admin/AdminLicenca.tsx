import { useCallback, useEffect, useState } from "react";
import { Shield, Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getSistemaConfig, saveSistemaConfig, getSistemaConfigAsync, saveSistemaConfigAsync,
  getLicencaConfig, saveLicencaConfig, getLicencaConfigAsync, saveLicencaConfigAsync,
  getModulosDoPlano,
  type SistemaConfig, type LicencaConfig, type PlanoModulos,
} from "@/lib/adminStorage";
import { toast } from "sonner";

interface Props {
  storeId: string | null;
}

const AdminLicenca = ({ storeId }: Props) => {
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);
  const [licencaConfig, setLicencaConfig] = useState<LicencaConfig>(getLicencaConfig);

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then(setSistemaConfig);
    getLicencaConfigAsync(storeId).then(setLicencaConfig);
  }, [storeId]);

  const saveLicenca = useCallback(() => {
    saveLicencaConfig(licencaConfig, storeId);
    saveLicencaConfigAsync(licencaConfig, storeId);
    toast.success("Licença salva");
  }, [licencaConfig, storeId]);

  const rawPlano = licencaConfig.plano || sistemaConfig.plano || "restaurante";
  const planoAtual = (["restaurante", "fastfood", "completo"].includes(rawPlano) ? rawPlano : "restaurante") as PlanoModulos;
  const modulosMaster = getModulosDoPlano(planoAtual) ?? { cozinha: false, delivery: false, motoboy: false, totem: false, tvRetirada: false, mesas: true };
  const modulosAtivos = sistemaConfig.modulos ?? {};

  const planoNomeMap: Record<string, string> = { restaurante: "RESTAURANTE", fastfood: "FAST FOOD", completo: "COMPLETO" };

  const allModules = [
    { id: "tabletCliente", label: "Tablet Cliente", desc: "Cardápio digital na mesa", icon: "📱", alwaysOn: true, alwaysEnabled: true },
    { id: "garcom", label: "Garçom", desc: "App do garçom no celular", icon: "🧑‍🍳", alwaysOn: false, alwaysEnabled: true },
    { id: "caixa", label: "Caixa", desc: "Frente de caixa desktop", icon: "💰", alwaysOn: true, alwaysEnabled: true },
    { id: "cozinha", label: "Cozinha", desc: "Tela da cozinha", icon: "🍳", alwaysOn: false, alwaysEnabled: false, masterKey: "cozinha" as const },
    { id: "delivery", label: "Delivery", desc: "Pedidos de entrega", icon: "🛵", alwaysOn: false, alwaysEnabled: false, masterKey: "delivery" as const },
    { id: "motoboy", label: "Motoboy", desc: "Gestão de entregadores", icon: "🏍️", alwaysOn: false, alwaysEnabled: false, masterKey: "motoboy" as const },
    { id: "totem", label: "Totem", desc: "Autoatendimento", icon: "🖥️", alwaysOn: false, alwaysEnabled: false, masterKey: "totem" as const },
    { id: "tvRetirada", label: "TV Retirada", desc: "Painel de pedidos prontos", icon: "📺", alwaysOn: false, alwaysEnabled: false, masterKey: "tvRetirada" as const },
  ];

  const requiredPlan = (modId: string) => {
    if (modId === "delivery" || modId === "motoboy") return "Addon Delivery";
    if (modId === "totem" || modId === "tvRetirada" || modId === "garcomPdv") return "Fast Food / Completo";
    if (modId === "cozinha") return "";
    return "";
  };

  const liberadosList = [
    "Tablet Cliente", "Garçom", "Caixa",
    ...(modulosMaster.cozinha ? ["Cozinha"] : []),
    ...(modulosMaster.delivery ? ["Delivery"] : []),
    ...(modulosMaster.motoboy ? ["Motoboy"] : []),
    ...(modulosMaster.totem ? ["Totem"] : []),
    ...(modulosMaster.tvRetirada ? ["TV Retirada"] : []),
  ];

  const handleModuleToggle = (moduleKey: string, value: boolean) => {
    const updated = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, [moduleKey]: value } };
    saveSistemaConfig(updated, storeId); setSistemaConfig(updated);
    toast.success(`Módulo ${value ? "ativado" : "desativado"}`);
  };

  const planos = [
    { id: "restaurante", nome: "RESTAURANTE", preco: "R$ 149", cor: "border-border", modulos: ["Mesas", "Balcão", "Caixa", "Cozinha"] },
    { id: "fastfood", nome: "FAST FOOD", preco: "R$ 249", cor: "border-amber-500/50", modulos: ["Balcão", "Totem", "TV Retirada", "Garçom PDV"] },
    { id: "completo", nome: "COMPLETO", preco: "R$ 399", cor: "border-primary/50", modulos: ["Tudo incluso"] },
  ];

  const planoOrder = ["restaurante", "fastfood", "completo"];
  const currentIdx = planoOrder.indexOf(planoAtual);

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      {/* BLOCO 1: PLANO ATUAL */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Seu plano</p>
            <p className="text-3xl font-black mt-1">{planoNomeMap[planoAtual] || "BÁSICO"}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />ATIVO
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {liberadosList.map((mod) => (
            <div key={mod} className="flex items-center gap-2 text-sm text-blue-100">
              <span className="text-emerald-400">✔</span><span className="font-medium">{mod}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BLOCO 2: MÓDULOS ATIVOS */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-secondary/30">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Módulos ativos</p>
        </div>
        <div className="divide-y divide-border/50">
          {allModules.map((mod) => {
            const isLiberado = mod.alwaysEnabled || (mod.masterKey ? modulosMaster[mod.masterKey] : false);
            const isAlwaysOn = mod.alwaysOn;
            const isChecked = isAlwaysOn || (mod.masterKey ? !!(modulosAtivos as any)[mod.masterKey] : true);
            const blocked = !isLiberado;
            return (
              <div key={mod.id} className={`flex items-center justify-between px-6 py-4 ${blocked ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{blocked ? "🔒" : mod.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.desc}</p>
                    {blocked && (<p className="text-[10px] font-bold text-amber-400 mt-0.5">Disponível a partir do plano {requiredPlan(mod.id)}</p>)}
                  </div>
                </div>
                <Switch checked={isChecked} disabled={blocked || isAlwaysOn} onCheckedChange={(v) => mod.masterKey && handleModuleToggle(mod.masterKey, v)} className={blocked ? "cursor-not-allowed" : isAlwaysOn ? "cursor-default" : ""} />
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOCO 3: UPGRADE DE PLANO */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-secondary/30">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Planos disponíveis</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {planos.map((p) => {
            const isCurrent = p.id === planoAtual;
            const pIdx = planoOrder.indexOf(p.id);
            const isUpgrade = pIdx > currentIdx;
            return (
              <div key={p.id} className={`rounded-2xl border-2 p-5 space-y-4 transition-colors ${isCurrent ? "border-emerald-500 bg-emerald-500/5" : p.cor + " bg-secondary/20"}`}>
                <div>
                  {isCurrent && (<span className="inline-block mb-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">Seu plano atual</span>)}
                  <p className="text-lg font-black text-foreground">{p.nome}</p>
                  <p className="text-2xl font-black text-primary tabular-nums">{p.preco}<span className="text-sm font-bold text-muted-foreground">/mês</span></p>
                </div>
                <div className="space-y-1.5">
                  {p.modulos.map((m) => (<div key={m} className="flex items-center gap-2 text-sm"><span className="text-emerald-400 text-xs">✔</span><span className="text-muted-foreground">{m}</span></div>))}
                </div>
                <Button disabled={isCurrent} variant={isUpgrade ? "default" : "outline"}
                  className={`w-full rounded-xl font-bold text-sm ${isCurrent ? "opacity-50 cursor-not-allowed" : isUpgrade ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => {
                    if (isCurrent) return;
                    const tel = sistemaConfig.telefoneRestaurante || "5511999999999";
                    const msg = encodeURIComponent(`Olá! Gostaria de ${isUpgrade ? "fazer upgrade" : "alterar"} meu plano para ${p.nome} (atual: ${planoNomeMap[planoAtual]})`);
                    window.open(`https://wa.me/${tel.replace(/\D/g, "")}?text=${msg}`, "_blank");
                  }}>
                  {isCurrent ? "Plano atual" : isUpgrade ? "Quero esse plano" : "Fazer downgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Licença */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Licença</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Nome do cliente (restaurante)</label><Input value={licencaConfig.nomeCliente} onChange={(e) => setLicencaConfig((c) => ({ ...c, nomeCliente: e.target.value }))} placeholder="Nome do restaurante" /></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Data de vencimento</label><Input type="date" value={licencaConfig.dataVencimento} onChange={(e) => setLicencaConfig((c) => ({ ...c, dataVencimento: e.target.value }))} /></div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-foreground">Status da licença</label>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${licencaConfig.ativo ? "text-emerald-400" : "text-destructive"}`}>{licencaConfig.ativo ? "Ativo" : "Bloqueado"}</span>
            <Switch checked={licencaConfig.ativo} onCheckedChange={(v) => setLicencaConfig((c) => ({ ...c, ativo: v }))} />
          </div>
        </div>
        <Button onClick={saveLicenca} className="w-full rounded-xl font-bold gap-1.5"><Save className="mr-1 h-4 w-4" /> Salvar licença</Button>
      </div>
    </div>
  );
};

export default AdminLicenca;
