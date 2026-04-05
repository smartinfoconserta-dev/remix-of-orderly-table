/**
 * SetupWizard — Full-screen first-access wizard for configuring the establishment mode.
 */
import { useState, useEffect } from "react";
import {
  Store, Zap, ChefHat, Printer, Check, ArrowRight, ArrowLeft,
  Monitor, UtensilsCrossed, Users, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveSistemaConfig, saveSistemaConfigAsync, getModulosDoPlano,
  type SistemaConfig, type PlanoModulos,
} from "@/lib/adminStorage";
import { toast } from "sonner";

type EstablishmentType = "fastfood" | "restaurante";

interface SetupWizardProps {
  storeId: string | null;
  currentConfig: SistemaConfig;
  onComplete: (config: SistemaConfig) => void;
}

const TOTAL_STEPS = 5;

const SetupWizard = ({ storeId, currentConfig, onComplete }: SetupWizardProps) => {
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<EstablishmentType | null>(null);
  const [doisSetores, setDoisSetores] = useState(false);
  const [nomeSetor1, setNomeSetor1] = useState("Cozinha");
  const [nomeSetor2, setNomeSetor2] = useState("Bar");
  const [identificacao, setIdentificacao] = useState<"nome" | "codigo">("codigo");
  const [totalMesas, setTotalMesas] = useState(20);
  const [impressoras, setImpressoras] = useState<"nenhuma" | "uma" | "duas">("nenhuma");

  // Determine which steps are relevant
  const getVisibleSteps = () => {
    const steps: number[] = [1]; // tipo
    if (tipo === "fastfood") {
      steps.push(2); // setores
      steps.push(3); // identificacao
    } else if (tipo === "restaurante") {
      steps.push(3); // mesas (reused step number)
    }
    steps.push(4); // impressoras
    steps.push(5); // resumo
    return steps;
  };

  const visibleSteps = getVisibleSteps();
  const currentStepIndex = visibleSteps.indexOf(step);
  const progress = visibleSteps.length > 1 ? ((currentStepIndex) / (visibleSteps.length - 1)) * 100 : 0;

  const canNext = () => {
    if (step === 1) return !!tipo;
    return true;
  };

  const goNext = () => {
    const idx = visibleSteps.indexOf(step);
    if (idx < visibleSteps.length - 1) {
      setStep(visibleSteps[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = visibleSteps.indexOf(step);
    if (idx > 0) {
      setStep(visibleSteps[idx - 1]);
    }
  };

  const handleComplete = async () => {
    if (!tipo) return;

    const plano: PlanoModulos = tipo === "fastfood" ? "fastfood" : "restaurante";
    const modulos = getModulosDoPlano(plano);

    const nextConfig: SistemaConfig = {
      ...currentConfig,
      tipoRestaurante: tipo,
      modoOperacao: tipo === "fastfood" ? "fast_food" : "restaurante",
      modulos: {
        ...modulos,
        delivery: tipo === "fastfood",
        motoboy: tipo === "fastfood",
      },
      identificacaoFastFood: tipo === "fastfood" ? identificacao : (currentConfig.identificacaoFastFood ?? "codigo"),
      impressaoPorSetor: doisSetores && tipo === "fastfood",
      nomeImpressoraCozinha: doisSetores ? nomeSetor1 : undefined,
      nomeImpressoraBar: doisSetores ? nomeSetor2 : undefined,
      setupCompleto: true,
    };

    await saveSistemaConfig(nextConfig, storeId);
    await saveSistemaConfigAsync(nextConfig, storeId);
    toast.success("Configuração concluída!");
    onComplete(nextConfig);
  };

  const getActiveModulesList = () => {
    if (!tipo) return [];
    if (tipo === "fastfood") {
      return [
        { icon: Monitor, label: "Totem de Autoatendimento" },
        { icon: Zap, label: "Garçom PDV" },
        { icon: ChefHat, label: "Cozinha KDS" },
        { icon: Monitor, label: "TV de Retirada" },
        { icon: Truck, label: "Delivery" },
        { icon: Users, label: "Entregador" },
      ];
    }
    return [
      { icon: UtensilsCrossed, label: "Mesas com Tablet" },
      { icon: Users, label: "Garçom" },
      { icon: ChefHat, label: "Cozinha KDS" },
    ];
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted-foreground">
            Etapa {currentStepIndex + 1} de {visibleSteps.length}
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content card */}
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6 min-h-[400px] flex flex-col">
        {/* Step 1: Tipo */}
        {step === 1 && (
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-foreground">Qual o tipo do seu estabelecimento?</h2>
              <p className="text-sm text-muted-foreground mt-2">Isso define quais módulos serão ativados automaticamente</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTipo("fastfood")}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                  tipo === "fastfood"
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Zap className={`h-10 w-10 ${tipo === "fastfood" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-base font-black text-foreground">Fast Food / Lanchonete</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atendimento rápido, pedidos no totem ou balcão, retirada no caixa ou na TV.
                    Ideal pra lanchonetes, hamburguerias, pizzarias rápidas, açaí.
                  </p>
                </div>
                {tipo === "fastfood" && <Check className="h-5 w-5 text-primary" />}
              </button>
              <button
                type="button"
                onClick={() => setTipo("restaurante")}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                  tipo === "restaurante"
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Store className={`h-10 w-10 ${tipo === "restaurante" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-base font-black text-foreground">Restaurante com Mesas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clientes sentam nas mesas, fazem pedido pelo tablet ou garçom, pagam no caixa.
                    Ideal pra restaurantes, bares, pizzarias com salão.
                  </p>
                </div>
                {tipo === "restaurante" && <Check className="h-5 w-5 text-primary" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Setores (Fast Food only) */}
        {step === 2 && tipo === "fastfood" && (
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-foreground">Tem dois setores de preparo separados?</h2>
              <p className="text-sm text-muted-foreground mt-2">Ex: cozinha e bar, lanches e sorvetes</p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setDoisSetores(false)}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  !doisSetores ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <ChefHat className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">Não, tudo sai do mesmo lugar</p>
                  <p className="text-xs text-muted-foreground">Todos os pedidos vão para uma única cozinha</p>
                </div>
                {!doisSetores && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => setDoisSetores(true)}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  doisSetores ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <UtensilsCrossed className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">Sim, tenho dois setores separados</p>
                  <p className="text-xs text-muted-foreground">Ex: cozinha e bar, lanches e sorvetes</p>
                </div>
                {doisSetores && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>
            </div>
            {doisSetores && (
              <div className="flex gap-3 max-w-md mx-auto">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Setor 1</label>
                  <Input className="h-11 rounded-xl" value={nomeSetor1} onChange={e => setNomeSetor1(e.target.value)} placeholder="Ex: Cozinha" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Setor 2</label>
                  <Input className="h-11 rounded-xl" value={nomeSetor2} onChange={e => setNomeSetor2(e.target.value)} placeholder="Ex: Bar" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Identification (Fast Food) or Mesas (Restaurante) */}
        {step === 3 && tipo === "fastfood" && (
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-foreground">Como identificar o cliente no totem?</h2>
              <p className="text-sm text-muted-foreground mt-2">Escolha como o pedido será chamado</p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setIdentificacao("nome")}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  identificacao === "nome" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Users className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">Por nome</p>
                  <p className="text-xs text-muted-foreground">O cliente digita o nome. Aparece no painel e nas comandas.</p>
                </div>
                {identificacao === "nome" && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => setIdentificacao("codigo")}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  identificacao === "codigo" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Zap className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">Por senha numérica</p>
                  <p className="text-xs text-muted-foreground">O sistema gera um número automático. Mais rápido.</p>
                </div>
                {identificacao === "codigo" && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>
            </div>
          </div>
        )}

        {step === 3 && tipo === "restaurante" && (
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-foreground">Quantas mesas tem o salão?</h2>
              <p className="text-sm text-muted-foreground mt-2">Você pode alterar depois nas configurações</p>
            </div>
            <div className="max-w-xs mx-auto space-y-4">
              <Input
                type="number"
                min={1}
                max={200}
                className="h-14 rounded-xl text-center text-2xl font-black"
                value={totalMesas}
                onChange={e => setTotalMesas(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <div className="flex gap-2 justify-center">
                {[10, 15, 20, 30, 50].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTotalMesas(n)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      totalMesas === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Impressoras */}
        {step === 4 && (
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-foreground">Quantas impressoras de preparo?</h2>
              <p className="text-sm text-muted-foreground mt-2">Impressoras que ficam na cozinha/bar para receber os pedidos</p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setImpressoras("nenhuma")}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  impressoras === "nenhuma" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Monitor className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">Nenhuma, tudo na tela</p>
                  <p className="text-xs text-muted-foreground">Pedidos aparecem só no KDS digital</p>
                </div>
                {impressoras === "nenhuma" && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => setImpressoras("uma")}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  impressoras === "uma" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Printer className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">Uma impressora de preparo</p>
                  <p className="text-xs text-muted-foreground">Todos os pedidos saem na mesma impressora</p>
                </div>
                {impressoras === "uma" && <Check className="h-5 w-5 text-primary ml-auto" />}
              </button>
              {doisSetores && tipo === "fastfood" && (
                <button
                  type="button"
                  onClick={() => setImpressoras("duas")}
                  className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                    impressoras === "duas" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <Printer className="h-6 w-6 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-black text-foreground">Duas, uma em cada setor</p>
                    <p className="text-xs text-muted-foreground">{nomeSetor1} e {nomeSetor2} com impressoras separadas</p>
                  </div>
                  {impressoras === "duas" && <Check className="h-5 w-5 text-primary ml-auto" />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Resumo */}
        {step === 5 && (
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-foreground">Resumo da configuração</h2>
              <p className="text-sm text-muted-foreground mt-2">Confira e clique em concluir</p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {tipo === "fastfood" ? <Zap className="h-5 w-5 text-primary" /> : <Store className="h-5 w-5 text-primary" />}
                  <p className="text-sm font-black text-foreground">
                    {tipo === "fastfood" ? "Fast Food / Lanchonete" : "Restaurante com Mesas"}
                  </p>
                </div>
                {tipo === "fastfood" && doisSetores && (
                  <p className="text-xs text-muted-foreground pl-8">
                    Setores: {nomeSetor1} e {nomeSetor2}
                  </p>
                )}
                {tipo === "fastfood" && (
                  <p className="text-xs text-muted-foreground pl-8">
                    Identificação: {identificacao === "nome" ? "Nome do cliente" : "Senha numérica"}
                  </p>
                )}
                {tipo === "restaurante" && (
                  <p className="text-xs text-muted-foreground pl-8">
                    {totalMesas} mesas
                  </p>
                )}
                <p className="text-xs text-muted-foreground pl-8">
                  Impressoras: {impressoras === "nenhuma" ? "Nenhuma (só tela)" : impressoras === "uma" ? "1 impressora" : "2 impressoras"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Módulos que serão ativados</p>
                <div className="flex flex-wrap gap-2">
                  {getActiveModulesList().map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">
                      <m.icon className="h-3.5 w-3.5" />
                      {m.label}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">
                    Caixa
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {currentStepIndex > 0 ? (
            <Button variant="ghost" onClick={goBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          ) : (
            <div />
          )}
          {step === 5 ? (
            <Button onClick={handleComplete} className="gap-2 font-black rounded-xl px-8">
              <Check className="h-4 w-4" /> Concluir Configuração
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canNext()} className="gap-2 font-black rounded-xl px-8">
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
