import { useEffect, useState, useMemo } from "react";
import { Shield, Settings, Info, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSistemaConfig, getSistemaConfigAsync,
  getLicencaConfig, getLicencaConfigAsync,
  getModulosDoPlano,
  type SistemaConfig, type LicencaConfig, type PlanoModulos,
} from "@/lib/adminStorage";

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

  const rawPlano = licencaConfig.plano || sistemaConfig.plano || "restaurante";
  const planoAtual = (["restaurante", "fastfood", "completo"].includes(rawPlano) ? rawPlano : "restaurante") as PlanoModulos;
  const modulosMaster = getModulosDoPlano(planoAtual) ?? { cozinha: false, delivery: false, motoboy: false, totem: false, tvRetirada: false, mesas: true };
  const modulosAtivos = sistemaConfig.modulos ?? {};

  const planoNomeMap: Record<string, string> = { restaurante: "RESTAURANTE", fastfood: "FAST FOOD", completo: "COMPLETO" };

  const dataFormatada = useMemo(() => {
    const d = licencaConfig.dataVencimento;
    if (!d) return "—";
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  }, [licencaConfig.dataVencimento]);

  const allModules = [
    { id: "tabletCliente", label: "Tablet Cliente", desc: "Cardápio digital na mesa", icon: "📱", alwaysEnabled: true, masterKey: undefined },
    { id: "garcom", label: "Garçom", desc: "App do garçom no celular", icon: "🧑‍🍳", alwaysEnabled: true, masterKey: undefined },
    { id: "caixa", label: "Caixa", desc: "Frente de caixa desktop", icon: "💰", alwaysEnabled: true, masterKey: undefined },
    { id: "cozinha", label: "Cozinha", desc: "Tela da cozinha", icon: "🍳", alwaysEnabled: false, masterKey: "cozinha" as const },
    { id: "delivery", label: "Delivery", desc: "Pedidos de entrega", icon: "🛵", alwaysEnabled: false, masterKey: "delivery" as const },
    { id: "motoboy", label: "Motoboy", desc: "Gestão de entregadores", icon: "🏍️", alwaysEnabled: false, masterKey: "motoboy" as const },
    { id: "totem", label: "Totem", desc: "Autoatendimento", icon: "🖥️", alwaysEnabled: false, masterKey: "totem" as const },
    { id: "tvRetirada", label: "TV Retirada", desc: "Painel de pedidos prontos", icon: "📺", alwaysEnabled: false, masterKey: "tvRetirada" as const },
  ];

  const liberadosList = [
    "Tablet Cliente", "Garçom", "Caixa",
    ...(modulosMaster.cozinha ? ["Cozinha"] : []),
    ...(modulosMaster.delivery ? ["Delivery"] : []),
    ...(modulosMaster.motoboy ? ["Motoboy"] : []),
    ...(modulosMaster.totem ? ["Totem"] : []),
    ...(modulosMaster.tvRetirada ? ["TV Retirada"] : []),
  ];

  const planos = [
    { id: "restaurante", nome: "RESTAURANTE", preco: "R$ 149", cor: "border-border", modulos: ["Mesas", "Balcão", "Caixa", "Cozinha"] },
    { id: "fastfood", nome: "FAST FOOD", preco: "R$ 249", cor: "border-amber-500/50", modulos: ["Balcão", "Totem", "TV Retirada", "Garçom PDV"] },
    { id: "completo", nome: "COMPLETO", preco: "R$ 399", cor: "border-primary/50", modulos: ["Mesas", "Balcão", "Caixa", "Cozinha", "Totem", "TV Retirada", "Garçom PDV", "Delivery", "Motoboy"] },
  ];

  const getModuleActive = (mod: typeof allModules[0]) => {
    if (mod.alwaysEnabled) return true;
    const isDeliveryAddon = mod.id === "delivery" || mod.id === "motoboy";
    if (isDeliveryAddon) return sistemaConfig.deliveryAtivo === true || (modulosMaster[mod.masterKey!] ?? false);
    return mod.masterKey ? (modulosMaster[mod.masterKey] || !!(modulosAtivos as any)[mod.masterKey]) : false;
  };

  const whatsappSuporte = () => {
    const tel = sistemaConfig.telefoneRestaurante || "5511999999999";
    const msg = encodeURIComponent("Olá! Gostaria de informações sobre meu plano.");
    window.open(`https://wa.me/${tel.replace(/\D/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      {/* AVISO SOMENTE LEITURA */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-5 py-4">
        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seu plano e licença são gerenciados pelo administrador do sistema. Para alterações, entre em contato.
        </p>
      </div>

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

      {/* BLOCO 2: MÓDULOS (somente leitura) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-secondary/30">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Módulos do plano</p>
        </div>
        <div className="divide-y divide-border/50">
          {allModules.map((mod) => {
            const active = getModuleActive(mod);
            return (
              <div key={mod.id} className={`flex items-center justify-between px-6 py-4 ${!active ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{active ? mod.icon : "🔒"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.desc}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${active ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {active ? "✔ Ativo" : "Bloqueado"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOCO 3: PLANOS (somente visualização) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-secondary/30">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Planos disponíveis</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {planos.map((p) => {
            const isCurrent = p.id === planoAtual;
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
              </div>
            );
          })}
        </div>
        <div className="px-6 pb-6 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">Para alterar seu plano, entre em contato com o suporte</p>
          <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2" onClick={whatsappSuporte}>
            <MessageCircle className="h-4 w-4" /> Falar com suporte
          </Button>
        </div>
      </div>

      {/* LICENÇA (somente leitura) */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Licença</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Nome do cliente</label>
            <p className="text-sm font-semibold text-foreground">{licencaConfig.nomeCliente || "—"}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Data de vencimento</label>
            <p className="text-sm font-semibold text-foreground">{dataFormatada}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-foreground">Status da licença</label>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${licencaConfig.ativo ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-destructive/15 border border-destructive/30 text-destructive"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${licencaConfig.ativo ? "bg-emerald-400" : "bg-destructive"}`} />
            {licencaConfig.ativo ? "Ativo" : "Bloqueado"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminLicenca;
