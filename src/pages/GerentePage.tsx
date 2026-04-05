import { useEffect, useState, useCallback } from "react";
import LicenseBanner from "@/components/LicenseBanner";
import {
  BarChart3,
  LockKeyhole,
  LogOut,
  ScrollText,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import { getSistemaConfig } from "@/lib/adminStorage";
import StorePinsManager from "@/components/StorePinsManager";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import IfoodPainel from "@/components/IfoodPainel";
import GerenteFechamento from "@/components/gerente/GerenteFechamento";
import GerenteRelatorio from "@/components/gerente/GerenteRelatorio";
import GerenteLogs from "@/components/gerente/GerenteLogs";



const GerentePage = () => {
  const {
    eventos,
    fechamentos,
    movimentacoesCaixa,
    mesas,
    fundoTroco,
    caixaAberto,
    fecharCaixaDoDia,
    allFechamentos,
    allEventos,
    allMovimentacoesCaixa,
    pedidosBalcao,
  } = useRestaurant();
  const { currentGerente, logout, verifyManagerAccess, authLevel, operationalSession, supabaseUser } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";
  // Users who logged in via email/password (supabaseUser exists) should bypass PIN
  const isAuthenticatedByPassword = !!supabaseUser;
  const effectiveGerente = currentGerente ?? (isAdminAccess || isAuthenticatedByPassword ? { id: "admin", nome: "Administrador", role: "gerente" as const, criadoEm: "" } : null);
  useRouteLock("/gerente");
  
  const [pinVerificado, setPinVerificado] = useState(isAdminAccess || isAuthenticatedByPassword);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isClosingDia, setIsClosingDia] = useState(false);


  // Store ID for PIN management  
  const { storeId: ctxStoreId } = useStore();
  const equipeStoreId = operationalSession?.storeId ?? ctxStoreId;

  // Fechamentos motoboy (from Supabase)
  const [fechamentosMotoboy, setFechamentosMotoboy] = useState<any[]>([]);
  const [diferencasCaixa, setDiferencasCaixa] = useState<any[]>([]);

  useEffect(() => {
    if (!equipeStoreId) return;
    // Load motoboy fechamentos from DB
    supabase.from("motoboy_fechamentos").select("*").eq("store_id", equipeStoreId)
      .order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => {
        setFechamentosMotoboy((data ?? []).map((f: any) => ({
          motoboyId: f.motoboy_id,
          motoboyNome: f.motoboy_nome,
          status: f.status,
          resumo: f.resumo ?? {},
          timestamp: f.created_at,
          pedidosIds: f.pedidos_ids ?? [],
        })));
      });
    // Load diferenças de caixa from estado_caixa history (closed shifts with diferença)
    supabase.from("estado_caixa").select("*").eq("store_id", equipeStoreId)
      .not("diferenca_dinheiro", "is", null)
      .order("fechado_em", { ascending: false }).limit(100)
      .then(({ data }) => {
        setDiferencasCaixa((data ?? []).filter((d: any) => d.diferenca_dinheiro !== 0 && d.diferenca_dinheiro !== null).map((d: any) => ({
          id: d.id,
          data: d.fechado_em ?? d.updated_at,
          dataFormatada: new Date(d.fechado_em ?? d.updated_at ?? Date.now()).toLocaleDateString("pt-BR"),
          diferenca: Number(d.diferenca_dinheiro ?? 0),
          tipo: Number(d.diferenca_dinheiro ?? 0) > 0 ? "sobra" : "quebra",
          motivo: d.diferenca_motivo ?? "",
          operador: d.fechado_por ?? "",
          gerente: d.conferido_por ?? d.fechado_por ?? "",
          esperado: Number(d.esperado_dinheiro ?? 0),
          contado: Number(d.contado_dinheiro ?? 0),
        })));
      });
  }, [equipeStoreId]);

  const handleVerificarPin = useCallback(async () => {
    if (!effectiveGerente || isAdminAccess) {
      setPinVerificado(true);
      return;
    }
    setPinError("");
    const result = await verifyManagerAccess(effectiveGerente.nome, pinInput);
    if (result.ok) {
      setPinVerificado(true);
      setPinInput("");
    } else {
      setPinError(result.error ?? "PIN inválido");
    }
  }, [effectiveGerente, isAdminAccess, pinInput, verifyManagerAccess]);



  /* ── auth guard ── */
  if (!effectiveGerente) {
    return (
      <div className="min-h-svh flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
            Gerente
          </h1>
        </header>
          <p className="text-center text-muted-foreground py-12">Acesso não autorizado. Faça login na tela inicial.</p>
      </div>
    );
  }

  const handleFecharDia = async () => {
    if (isClosingDia) return;
    if (isClosingDia) return;
    setIsClosingDia(true);
    await fecharCaixaDoDia(effectiveGerente);
    setIsClosingDia(false);
    toast.success("Caixa do dia fechado com sucesso. Estado resetado.", { duration: 2000, icon: "🔒" });
  };

  const pinGateUI = (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-black text-foreground">Verificação de segurança</h2>
        <p className="text-sm text-muted-foreground">Digite seu PIN para acessar os dados financeiros.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleVerificarPin()}
          placeholder="PIN"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {pinError && <p className="text-sm font-bold text-destructive">{pinError}</p>}
        <Button onClick={handleVerificarPin} disabled={pinInput.length < 4} className="w-full rounded-xl font-black h-11">
          Verificar PIN
        </Button>
      </div>
    </div>
  );

  const nomeRestaurante = getSistemaConfig().nomeRestaurante || "Restaurante";
  const now = new Date();
  const horaAtual = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Title bar — Windows style */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-border bg-card">
        <span className="text-sm font-bold text-foreground">Gerente — {nomeRestaurante}</span>
        <span className="text-xs text-muted-foreground">Operador: {effectiveGerente.nome} • {horaAtual}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary text-xs gap-1" onClick={() => logout("gerente")}>
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>

      {/* Tabs — Windows classic style */}
      <Tabs defaultValue="fechamento" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="shrink-0 border-b border-border bg-card px-4 md:px-6 flex h-auto rounded-none p-0">
          {[
            { value: "fechamento", icon: LockKeyhole, label: "Fechamento" },
            { value: "relatorio", icon: BarChart3, label: "Relatório" },
            { value: "logs", icon: ScrollText, label: "Logs" },
            { value: "equipe", icon: Users, label: "Equipe" },
            { value: "ifood", icon: Truck, label: "iFood" },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative px-5 py-2.5 text-sm font-bold text-muted-foreground border border-border border-b-0 -mb-px bg-background data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:border-t-2 data-[state=active]:border-t-primary data-[state=active]:border-b-card rounded-t-sm gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ═══ TAB 1: Fechamento do Turno ═══ */}
        <TabsContent value="fechamento" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <GerenteFechamento
            pinVerificado={pinVerificado}
            pinGateUI={pinGateUI}
            fechamentos={fechamentos}
            movimentacoesCaixa={movimentacoesCaixa}
            fundoTroco={fundoTroco}
            caixaAberto={caixaAberto}
            onFecharDia={handleFecharDia}
          />
        </TabsContent>

        {/* ═══ TAB 2: Relatórios ═══ */}
        <TabsContent value="relatorio" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <GerenteRelatorio
            pinVerificado={pinVerificado}
            pinGateUI={pinGateUI}
            allFechamentos={allFechamentos}
            allEventos={allEventos}
            allMovimentacoesCaixa={allMovimentacoesCaixa}
            pedidosBalcao={pedidosBalcao}
            mesas={mesas}
            fechamentosMotoboy={fechamentosMotoboy}
            diferencasCaixa={diferencasCaixa}
            effectiveGerente={effectiveGerente}
          />
        </TabsContent>

        {/* ═══ TAB 3: Logs de Auditoria ═══ */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <GerenteLogs eventos={eventos} />
        </TabsContent>

        {/* ═══ TAB 4: Equipe ═══ */}
        <TabsContent value="equipe" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          {!pinVerificado ? pinGateUI : (
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-foreground">Gerenciar equipe</h2>
              <p className="text-sm text-muted-foreground">Crie e gerencie PINs de acesso para cada módulo operacional.</p>
            </div>
            {equipeStoreId ? (
              <StorePinsManager stores={[{ id: equipeStoreId, name: effectiveGerente.nome, slug: "" }]} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
            )}
          </div>
          )}
        </TabsContent>

        {/* ═══ TAB 5: iFood ═══ */}
        <TabsContent value="ifood" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <div className="mx-auto max-w-2xl">
            <IfoodPainel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Status bar — Windows style */}
      <div className="shrink-0 flex items-center gap-0 border-t border-border bg-card text-[10px] text-muted-foreground">
        <span className="px-3 py-1 border-r border-border">● Online</span>
        <span className="px-3 py-1 border-r border-border">Operador: {effectiveGerente.nome}</span>
        <span className="px-3 py-1 border-r border-border">Fechamentos: {fechamentos.length}</span>
        <span className="px-3 py-1">Mesas ativas: {mesas.filter(m => m.status === "consumo").length}</span>
      </div>
      <LicenseBanner context="gerente" />
    </div>
  );
};

export default GerentePage;
