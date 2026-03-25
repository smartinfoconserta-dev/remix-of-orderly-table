import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus, Pencil, Trash2, Phone, Mail, MapPin, DollarSign, Users, TrendingUp, TrendingDown, Receipt, Eye, AlertTriangle, ShieldOff, RefreshCw, Search, Send, Bell, KeyRound } from "lucide-react";
import StorePinsManager from "@/components/StorePinsManager";
import { supabase } from "@/integrations/supabase/client";
import type { Pagamento } from "@/lib/masterStorage";
import { toast } from "sonner";
import {
  type Cliente, type Despesa,
  getClientes, addCliente, updateCliente, removeCliente,
  getDespesas, addDespesa,
} from "@/lib/masterStorage";
import { getLicencaConfig, saveLicencaConfig, saveLicencaConfigAsync, getSistemaConfig, saveSistemaConfig, saveSistemaConfigAsync } from "@/lib/adminStorage";



const SEGMENTOS = ["hamburgeria", "pizzaria", "sushi", "pastel", "a-la-carte", "outro"];
const SEGMENTO_LABELS: Record<string, string> = {
  hamburgeria: "Hamburgeria", pizzaria: "Pizzaria", sushi: "Sushi",
  pastel: "Pastel", "a-la-carte": "À la carte", outro: "Outro",
};
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const DIAS_VENCIMENTO = [1, 5, 10, 15, 20, 25];

const CATEGORIAS_DESPESA = [
  { value: "gasolina", label: "Gasolina" },
  { value: "manutencao", label: "Manutenção" },
  { value: "visita", label: "Visita a cliente" },
  { value: "software", label: "Software/Assinatura" },
  { value: "outro", label: "Outro" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIAS_DESPESA.map((c) => [c.value, c.label]));

const METODOS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
];

const PLANOS = [
  { value: "teste", label: "Teste grátis (30 dias)" },
  { value: "semestral", label: "Semestral (6 meses)" },
  { value: "anual", label: "Anual (12 meses)" },
  { value: "dezoito_meses", label: "18 meses" },
];
const PLANO_LABELS: Record<string, string> = { teste: "Teste", semestral: "Semestral", anual: "Anual", dezoito_meses: "18 meses" };
const PLANO_BADGE_CLASS: Record<string, string> = {
  teste: "bg-muted text-muted-foreground",
  semestral: "bg-blue-600 hover:bg-blue-600 text-white",
  anual: "bg-emerald-600 hover:bg-emerald-600 text-white",
  dezoito_meses: "bg-purple-600 hover:bg-purple-600 text-white",
};

function calcDataTermino(plano: string, dataInicio: string): string {
  if (!dataInicio) return "";
  const d = new Date(dataInicio);
  if (plano === "teste") { d.setDate(d.getDate() + 30); }
  else if (plano === "semestral") { d.setMonth(d.getMonth() + 6); }
  else if (plano === "anual") { d.setMonth(d.getMonth() + 12); }
  else if (plano === "dezoito_meses") { d.setMonth(d.getMonth() + 18); }
  return d.toISOString().slice(0, 10);
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const PLANOS_MODULOS = [
  { value: "basico", label: "Básico" },
  { value: "medio", label: "Médio" },
  { value: "pro", label: "Pro" },
  { value: "premium", label: "Premium" },
];
const PLANO_MODULOS_LABELS: Record<string, string> = { basico: "Básico", medio: "Médio", pro: "Pro", premium: "Premium" };
const PLANO_MODULOS_BADGE: Record<string, string> = {
  basico: "bg-muted text-muted-foreground",
  medio: "bg-blue-600 hover:bg-blue-600 text-white",
  pro: "bg-emerald-600 hover:bg-emerald-600 text-white",
  premium: "bg-purple-600 hover:bg-purple-600 text-white",
};

const emptyForm = {
  nomeRestaurante: "", nomeContato: "", email: "", dataVencimento: "",
  ativo: true, avisoAtivo: false, avisoTexto: "",
  telefone: "", cnpj: "", cidade: "", estado: "", endereco: "",
  segmento: "hamburgeria", diaVencimento: 10, valorMensalidade: 0,
  observacoes: "", historicoPagamentos: [] as any[],
  plano: "anual", dataInicio: new Date().toISOString().slice(0, 10), dataTermino: "",
  planoModulos: "basico" as "basico" | "medio" | "pro" | "premium",
  criarContaAdmin: false, senhaAdmin: "", slugLoja: "",
};


function proximoVencimento(diaVencimento: number): string {
  const hoje = new Date();
  let mes = hoje.getMonth();
  let ano = hoje.getFullYear();
  if (hoje.getDate() > diaVencimento) { mes += 1; if (mes > 11) { mes = 0; ano += 1; } }
  const lastDay = new Date(ano, mes + 1, 0).getDate();
  const dia = Math.min(diaVencimento, lastDay);
  return `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
}

const MasterPage = () => {
  const { logout } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [novaDespesa, setNovaDespesa] = useState({ descricao: "", valor: 0, categoria: "gasolina", data: todayStr() });

  const [detailClient, setDetailClient] = useState<Cliente | null>(null);
  const [pagForm, setPagForm] = useState({ valor: 0, metodo: "pix", data: todayStr(), observacao: "" });

  // Filters
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "bloqueados" | "vencidos">("todos");
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [activeTab, setActiveTab] = useState("clientes");

  // Aviso state
  const [avisoMensagem, setAvisoMensagem] = useState("");
  const [avisoTipo, setAvisoTipo] = useState<"info" | "alerta" | "urgente">("info");

  // Stores for PINs tab
  const [stores, setStores] = useState<{ id: string; name: string; slug: string }[]>([]);
  useEffect(() => {
    supabase.from("stores").select("id, name, slug").then(({ data }) => {
      if (data) setStores(data);
    });
  }, []);

  const refresh = () => { setClientes(getClientes()); setDespesas(getDespesas()); };

  useEffect(() => { refresh(); }, []);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Cliente) => {
    setEditId(c.id);
    setForm({
      nomeRestaurante: c.nomeRestaurante, nomeContato: c.nomeContato, email: c.email,
      dataVencimento: c.dataVencimento, ativo: c.ativo, avisoAtivo: c.avisoAtivo, avisoTexto: c.avisoTexto,
      telefone: c.telefone || "", cnpj: c.cnpj || "", cidade: c.cidade || "",
      estado: c.estado || "", endereco: c.endereco || "", segmento: c.segmento || "hamburgeria",
      diaVencimento: c.diaVencimento || 10, valorMensalidade: c.valorMensalidade || 0,
      observacoes: c.observacoes || "", historicoPagamentos: c.historicoPagamentos || [],
      plano: c.plano || "anual", dataInicio: c.dataInicio || "", dataTermino: c.dataTermino || "",
      planoModulos: c.planoModulos || "basico",
      criarContaAdmin: false, senhaAdmin: "", slugLoja: "",
    });
    setDialogOpen(true);
  };

  const [savingAccount, setSavingAccount] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  // Edit account credentials state
  const [editNovoEmail, setEditNovoEmail] = useState("");
  const [editNovaSenha, setEditNovaSenha] = useState("");
  const [editLinkedUserId, setEditLinkedUserId] = useState<string | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);

  // When editing, try to find linked Supabase user via store slug
  useEffect(() => {
    setEditNovoEmail("");
    setEditNovaSenha("");
    setEditLinkedUserId(null);
    if (!editId || !dialogOpen) return;
    const cliente = clientes.find((c) => c.id === editId);
    if (!cliente) return;
    // Try to find store by name match
    const matchedStore = stores.find(
      (s) => s.name.toLowerCase() === cliente.nomeRestaurante.toLowerCase()
    );
    if (!matchedStore) return;
    supabase
      .from("store_members")
      .select("user_id")
      .eq("store_id", matchedStore.id)
      .eq("role_in_store", "owner")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.user_id) setEditLinkedUserId(data.user_id);
      });
  }, [editId, dialogOpen, clientes, stores]);

  const handleUpdateCredentials = async () => {
    if (!editLinkedUserId) { toast.error("Usuário Supabase não encontrado para este cliente."); return; }
    if (!editNovoEmail && !editNovaSenha) { toast.error("Preencha o novo email ou a nova senha."); return; }
    if (editNovaSenha && editNovaSenha.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres."); return; }
    setSavingCredentials(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-admin-account", {
        body: {
          userId: editLinkedUserId,
          newEmail: editNovoEmail.trim() || undefined,
          newPassword: editNovaSenha || undefined,
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao atualizar credenciais");
      } else {
        toast.success("Credenciais atualizadas com sucesso!");
        if (editNovoEmail.trim()) {
          ff("email", editNovoEmail.trim());
        }
        setEditNovoEmail("");
        setEditNovaSenha("");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar credenciais");
    }
    setSavingCredentials(false);
  };

  const buscarCnpj = async (cnpjRaw: string) => {
    const cnpjClean = cnpjRaw.replace(/\D/g, "");
    if (cnpjClean.length !== 14) return;
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
      if (!res.ok) { toast.error("CNPJ não encontrado."); setBuscandoCnpj(false); return; }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        nomeRestaurante: prev.nomeRestaurante || data.nome_fantasia || data.razao_social || "",
        nomeContato: prev.nomeContato || (data.qsa?.[0]?.nome_socio || ""),
        telefone: prev.telefone || (data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : ""),
        email: prev.email || data.email || "",
        endereco: prev.endereco || [data.descricao_tipo_de_logradouro, data.logradouro, data.numero, data.complemento].filter(Boolean).join(", "),
        cidade: prev.cidade || data.municipio || "",
        estado: prev.estado || data.uf || "",
      }));
      toast.success("Dados do CNPJ preenchidos!");
    } catch {
      toast.error("Erro ao buscar CNPJ.");
    }
    setBuscandoCnpj(false);
  };

  const handleSave = async () => {
    if (!form.nomeRestaurante.trim() || !form.nomeContato.trim()) { toast.error("Preencha nome do restaurante e contato."); return; }

    // Create admin account if requested
    if (form.criarContaAdmin && !editId) {
      if (!form.email.trim()) { toast.error("Email é obrigatório para criar conta admin."); return; }
      if (!form.senhaAdmin || form.senhaAdmin.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres."); return; }
      if (!form.slugLoja.trim()) { toast.error("Slug da loja é obrigatório."); return; }

      setSavingAccount(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("create-admin-account", {
          body: {
            email: form.email.trim(),
            password: form.senhaAdmin,
            storeName: form.nomeRestaurante.trim(),
            storeSlug: form.slugLoja.trim(),
          },
        });

        if (error || data?.error) {
          toast.error(data?.error || error?.message || "Erro ao criar conta admin");
          setSavingAccount(false);
          return;
        }

        toast.success("Conta admin criada com sucesso!");
        // Refresh stores list
        const { data: newStores } = await supabase.from("stores").select("id, name, slug");
        if (newStores) setStores(newStores);
      } catch (err: any) {
        toast.error(err.message || "Erro ao criar conta admin");
        setSavingAccount(false);
        return;
      }
      setSavingAccount(false);
    }

    if (editId) { updateCliente(editId, form); toast.success("Cliente atualizado."); }
    else { addCliente(form); toast.success("Cliente criado."); }
    // Sync planoModulos to licença config AND restaurant_config
    if (form.planoModulos) {
      const lic = getLicencaConfig();
      lic.plano = form.planoModulos;
      saveLicencaConfig(lic);
      saveLicencaConfigAsync(lic);

      const cfg = getSistemaConfig();
      cfg.plano = form.planoModulos;
      saveSistemaConfig(cfg);
      saveSistemaConfigAsync(cfg);
    }
    setDialogOpen(false); refresh();
  };

  const handleRemove = () => { if (removeId) { removeCliente(removeId); toast.success("Cliente removido."); setRemoveId(null); refresh(); } };
  const toggleAtivo = (c: Cliente) => {
    updateCliente(c.id, { ativo: !c.ativo });
    if (c.planoModulos) {
      const lic = getLicencaConfig();
      lic.plano = c.planoModulos;
      saveLicencaConfig(lic);
    }
    refresh();
  };
  const isVencido = (d: string) => d && new Date(d) < new Date(todayStr());
  const toSlug = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const ff = (key: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "plano" || key === "dataInicio") {
        const plano = key === "plano" ? value : prev.plano;
        const dataInicio = key === "dataInicio" ? value : prev.dataInicio;
        if (plano && dataInicio) {
          const dt = calcDataTermino(plano, dataInicio);
          next.dataTermino = dt;
          next.dataVencimento = dt;
        }
      }
      if (key === "nomeRestaurante") {
        next.slugLoja = toSlug(value);
      }
      return next;
    });
  };

  const openDetail = (c: Cliente) => {
    setDetailClient(c);
    setPagForm({ valor: c.valorMensalidade || 0, metodo: "pix", data: todayStr(), observacao: "" });
  };

  const handleRegistrarPagamento = () => {
    if (!detailClient) return;
    if (!pagForm.valor || pagForm.valor <= 0) { toast.error("Informe um valor válido."); return; }
    const novoPag: Pagamento = { id: crypto.randomUUID(), data: pagForm.data, valor: pagForm.valor, metodo: pagForm.metodo, observacao: pagForm.observacao };
    const hist = [...(detailClient.historicoPagamentos || []), novoPag];
    updateCliente(detailClient.id, { historicoPagamentos: hist });
    toast.success("Pagamento registrado.");
    refresh();
    const updated = getClientes().find((c) => c.id === detailClient.id);
    if (updated) { setDetailClient(updated); }
    setPagForm({ valor: detailClient.valorMensalidade || 0, metodo: "pix", data: todayStr(), observacao: "" });
  };

  // Financeiro
  const mesAtual = todayStr().slice(0, 7);
  const despesasMes = despesas.filter((d) => d.data.startsWith(mesAtual)).sort((a, b) => b.data.localeCompare(a.data));
  const totalDespesasMes = despesasMes.reduce((s, d) => s + d.valor, 0);
  const receitaPrevista = clientes.filter((c) => c.ativo).reduce((s, c) => s + (c.valorMensalidade || 0), 0);
  const clientesAtivos = clientes.filter((c) => c.ativo).length;

  // Filtered clients
  const filteredClientes = useMemo(() => {
    const hoje = new Date(todayStr());
    return clientes.filter((c) => {
      // Search
      if (busca) {
        const q = busca.toLowerCase();
        if (!(c.nomeRestaurante.toLowerCase().includes(q) || (c.cidade || "").toLowerCase().includes(q) || c.nomeContato.toLowerCase().includes(q))) return false;
      }
      // Status
      if (filtroStatus === "ativos" && !c.ativo) return false;
      if (filtroStatus === "bloqueados" && c.ativo) return false;
      if (filtroStatus === "vencidos" && !(c.dataVencimento && new Date(c.dataVencimento) < hoje)) return false;
      // Plano
      if (filtroPlano !== "todos" && c.plano !== filtroPlano) return false;
      return true;
    });
  }, [clientes, busca, filtroStatus, filtroPlano]);

  // Alert: clients expiring in 3 days or already expired
  const clientesCriticos = useMemo(() => {
    const hoje = new Date(todayStr());
    const em3dias = new Date(hoje);
    em3dias.setDate(em3dias.getDate() + 3);
    return clientes.filter((c) => c.dataVencimento && new Date(c.dataVencimento) <= em3dias);
  }, [clientes]);

  // Vencimento helpers for cards
  const getVencAlert = (c: { dataVencimento: string }) => {
    if (!c.dataVencimento) return null;
    const hoje = new Date(todayStr());
    const d = new Date(c.dataVencimento);
    if (d < hoje) return "vencido";
    const em7 = new Date(hoje);
    em7.setDate(em7.getDate() + 7);
    if (d <= em7) return "vence_breve";
    return null;
  };

  // Chart data: last 6 months
  const chartData = useMemo(() => {
    const meses: { label: string; key: string; receita: number; despesa: number }[] = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
      const receita = clientes.filter((c) => c.ativo).reduce((s, c) => s + (c.valorMensalidade || 0), 0);
      const despesa = despesas.filter((dp) => dp.data.startsWith(key)).reduce((s, dp) => s + dp.valor, 0);
      meses.push({ label, key, receita, despesa });
    }
    return meses;
  }, [clientes, despesas]);
  const chartMax = Math.max(...chartData.flatMap((m) => [m.receita, m.despesa]), 1);

  const handleRegistrarDespesa = () => {
    if (!novaDespesa.descricao.trim()) { toast.error("Preencha a descrição."); return; }
    if (!novaDespesa.valor || novaDespesa.valor <= 0) { toast.error("Informe um valor válido."); return; }
    addDespesa(novaDespesa);
    toast.success("Despesa registrada.");
    setNovaDespesa({ descricao: "", valor: 0, categoria: "gasolina", data: todayStr() });
    refresh();
  };


  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Painel Master</h1>
          <Button variant="outline" size="sm" onClick={() => logout()}><LogOut className="w-4 h-4 mr-1" /> Sair</Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="clientes"><Users className="w-4 h-4 mr-1" />Clientes</TabsTrigger>
            <TabsTrigger value="pins"><KeyRound className="w-4 h-4 mr-1" />PINs</TabsTrigger>
            <TabsTrigger value="financeiro"><DollarSign className="w-4 h-4 mr-1" />Financeiro</TabsTrigger>
            <TabsTrigger value="cobrancas"><AlertTriangle className="w-4 h-4 mr-1" />Cobranças</TabsTrigger>
            <TabsTrigger value="avisos"><Bell className="w-4 h-4 mr-1" />Avisos</TabsTrigger>
          </TabsList>

          {/* Alert banner */}
          {clientesCriticos.length > 0 && (
            <div className="mt-3 rounded-xl bg-orange-500/15 border border-orange-500/30 p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-semibold text-orange-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{clientesCriticos.length} cliente(s) precisam de atenção — veja a aba Cobranças</p>
              <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20" onClick={() => setActiveTab("cobrancas")}>Ver cobranças</Button>
            </div>
          )}

          {/* ========== ABA PINS ========== */}
          <TabsContent value="pins" className="mt-4">
            {stores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma loja cadastrada.</p>
            ) : (
              <StorePinsManager stores={stores} />
            )}
          </TabsContent>

          {/* ========== ABA CLIENTES ========== */}
          <TabsContent value="clientes" className="space-y-4 mt-4">
            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome, cidade ou contato..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["todos", "ativos", "bloqueados", "vencidos"] as const).map((s) => (
                  <Button key={s} size="sm" variant={filtroStatus === s ? "default" : "outline"} onClick={() => setFiltroStatus(s)} className="capitalize">{s}</Button>
                ))}
                <Select value={filtroPlano} onValueChange={setFiltroPlano}>
                  <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Plano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os planos</SelectItem>
                    {PLANOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-auto">{filteredClientes.length} de {clientes.length} clientes</span>
              </div>
            </div>
            <div className="grid gap-4">
              {filteredClientes.map((c) => {
                const vencAlert = getVencAlert(c);
                return (
                <div key={c.id} className="rounded-2xl border bg-card p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start gap-2 justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-lg text-foreground cursor-pointer hover:underline" onClick={() => openDetail(c)}>{c.nomeRestaurante}</p>
                        {c.plano && <Badge className={PLANO_BADGE_CLASS[c.plano] || "bg-muted text-muted-foreground"}>{PLANO_LABELS[c.plano] || c.plano}</Badge>}
                        {c.planoModulos && <Badge className={PLANO_MODULOS_BADGE[c.planoModulos] || "bg-muted text-muted-foreground"}>{PLANO_MODULOS_LABELS[c.planoModulos] || c.planoModulos}</Badge>}
                        <Badge className={c.ativo ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-destructive hover:bg-destructive text-destructive-foreground"}>{c.ativo ? "Ativo" : "Bloqueado"}</Badge>
                        {vencAlert === "vencido" && <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">Vencido</Badge>}
                        {vencAlert === "vence_breve" && <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white">Vence em breve</Badge>}
                      </div>
                      {c.segmento && <p className="text-xs text-muted-foreground">{SEGMENTO_LABELS[c.segmento] || c.segmento}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap shrink-0">
                      <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRemoveId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.cidade && c.estado ? `${c.cidade} - ${c.estado}` : "—"}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.telefone || "—"}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email || "—"}</span>
                    <span className="flex items-center gap-1 font-semibold text-foreground"><DollarSign className="w-3.5 h-3.5" />R$ {(c.valorMensalidade || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{c.nomeContato}</span>
                    <span>Próximo venc.: {c.diaVencimento ? proximoVencimento(c.diaVencimento) : "—"}</span>
                    <span>Licença: {c.dataVencimento || "—"}</span>
                  </div>
                </div>
              );
              })}
              {filteredClientes.length === 0 && <p className="text-center text-muted-foreground py-8">{clientes.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado com os filtros atuais."}</p>}
            </div>
          </TabsContent>

          {/* ========== ABA FINANCEIRO ========== */}
          <TabsContent value="financeiro" className="space-y-6 mt-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border bg-card p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="w-4 h-4" />Receita prevista</div>
                <p className="text-xl font-black text-emerald-500">R$ {receitaPrevista.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="w-4 h-4" />Despesas do mês</div>
                <p className="text-xl font-black text-destructive">R$ {totalDespesasMes.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="w-4 h-4" />Lucro líquido</div>
                <p className={`text-xl font-black ${receitaPrevista - totalDespesasMes >= 0 ? "text-emerald-500" : "text-destructive"}`}>R$ {(receitaPrevista - totalDespesasMes).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="w-4 h-4" />Clientes ativos</div>
                <p className="text-xl font-black text-foreground">{clientesAtivos}</p>
              </div>
            </div>

            {/* Gráfico de barras CSS */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h2 className="text-lg font-black text-foreground">Receita vs Despesas — últimos 6 meses</h2>
              <div className="flex items-end gap-3 h-48 overflow-x-auto">
                {chartData.map((m) => (
                  <div key={m.key} className="flex flex-col items-center gap-1 flex-1 min-w-[60px]">
                    <div className="flex items-end gap-1 h-36 w-full justify-center">
                      <div className="flex flex-col items-center gap-0.5 w-1/2">
                        <span className="text-[10px] text-emerald-500 font-bold">{m.receita > 0 ? `R$${(m.receita / 1000).toFixed(1)}k` : ""}</span>
                        <div className="w-full rounded-t bg-emerald-500/80" style={{ height: `${Math.max((m.receita / chartMax) * 128, m.receita > 0 ? 4 : 0)}px` }} />
                      </div>
                      <div className="flex flex-col items-center gap-0.5 w-1/2">
                        <span className="text-[10px] text-destructive font-bold">{m.despesa > 0 ? `R$${(m.despesa / 1000).toFixed(1)}k` : ""}</span>
                        <div className="w-full rounded-t bg-destructive/80" style={{ height: `${Math.max((m.despesa / chartMax) * 128, m.despesa > 0 ? 4 : 0)}px` }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/80" /> Receita</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/80" /> Despesas</span>
              </div>
            </div>

            {/* Registrar despesa */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2"><Receipt className="w-5 h-5" />Registrar despesa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div><Label>Descrição</Label><Input placeholder="Ex: Gasolina visita" value={novaDespesa.descricao} onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })} /></div>
                <div>
                  <Label>Valor</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input type="number" className="pl-10" value={novaDespesa.valor || ""} onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={novaDespesa.categoria} onValueChange={(v) => setNovaDespesa({ ...novaDespesa, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS_DESPESA.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={novaDespesa.data} onChange={(e) => setNovaDespesa({ ...novaDespesa, data: e.target.value })} /></div>
                <Button onClick={handleRegistrarDespesa} className="h-10">Registrar</Button>
              </div>
            </div>

            {/* Histórico */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h2 className="text-lg font-black text-foreground">Histórico de despesas do mês</h2>
              {despesasMes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa registrada neste mês.</p>}
              <div className="space-y-2">
                {despesasMes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{d.descricao}</p>
                      <p className="text-xs text-muted-foreground">{CAT_LABEL[d.categoria] || d.categoria} · {d.data}</p>
                    </div>
                    <p className="text-sm font-black text-destructive">- R$ {d.valor.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ========== ABA COBRANÇAS ========== */}
          <TabsContent value="cobrancas" className="space-y-6 mt-4">
            {(() => {
              const hoje = todayStr();
              const hojeDate = new Date(hoje);
              const em7dias = new Date(hojeDate);
              em7dias.setDate(em7dias.getDate() + 7);

              type StatusVenc = "vencido" | "vence_hoje" | "vence_em_breve" | "em_dia";
              const classify = (c: Cliente): StatusVenc => {
                if (!c.dataVencimento) return "em_dia";
                const d = new Date(c.dataVencimento);
                if (d < hojeDate) return "vencido";
                if (c.dataVencimento === hoje) return "vence_hoje";
                if (d <= em7dias) return "vence_em_breve";
                return "em_dia";
              };

              const classified = clientes.map((c) => ({ ...c, statusVenc: classify(c) }));
              const vencidos = classified.filter((c) => c.statusVenc === "vencido");
              const venceHoje = classified.filter((c) => c.statusVenc === "vence_hoje");
              const vencemBreve = classified.filter((c) => c.statusVenc === "vence_em_breve");
              const emDia = classified.filter((c) => c.statusVenc === "em_dia");
              const atencao = [...vencidos, ...venceHoje, ...vencemBreve];
              const todosOrdenados = [...classified].sort((a, b) => (a.dataVencimento || "9999").localeCompare(b.dataVencimento || "9999"));

              const diffDays = (d: string) => {
                const diff = Math.ceil((new Date(d).getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
                return diff;
              };

              const statusBadge = (s: StatusVenc, dataVenc: string) => {
                if (s === "vencido") return <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">Vencido</Badge>;
                if (s === "vence_hoje") return <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white">Vence hoje</Badge>;
                if (s === "vence_em_breve") return <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white">Vence em {diffDays(dataVenc)} dias</Badge>;
                return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Em dia</Badge>;
              };

              const handleBloquear = (c: Cliente) => {
                const ontem = new Date();
                ontem.setDate(ontem.getDate() - 1);
                updateCliente(c.id, { ativo: false, dataVencimento: ontem.toISOString().slice(0, 10) });
                toast.success(`${c.nomeRestaurante} bloqueado imediatamente.`);
                refresh();
              };

              return (
                <>
                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border bg-card p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4" />Vencidos</div>
                      <p className="text-xl font-black text-destructive">{vencidos.length}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4" />Vencem em 7 dias</div>
                      <p className="text-xl font-black text-yellow-500">{venceHoje.length + vencemBreve.length}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="w-4 h-4" />Em dia</div>
                      <p className="text-xl font-black text-emerald-500">{emDia.length}</p>
                    </div>
                  </div>

                  {/* Atenção necessária */}
                  <div className="rounded-2xl border bg-card p-5 space-y-4">
                    <h2 className="text-lg font-black text-foreground flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Atenção necessária</h2>
                    {atencao.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Todos os clientes estão em dia ✓</p>}
                    <div className="space-y-3">
                      {atencao.map((c) => (
                        <div key={c.id} className="rounded-xl border bg-background p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-foreground">{c.nomeRestaurante}</p>
                              {statusBadge(c.statusVenc, c.dataVencimento)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefone || "—"}</span>
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email || "—"}</span>
                              <span>Venc.: {c.dataVencimento}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.ativo && (
                              <Button variant="destructive" size="sm" onClick={() => handleBloquear(c)}>
                                <ShieldOff className="w-3.5 h-3.5 mr-1" />Bloquear
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                              <RefreshCw className="w-3.5 h-3.5 mr-1" />Renovar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Todos os clientes - tabela */}
                  <div className="rounded-2xl border bg-card p-5 space-y-4">
                    <h2 className="text-lg font-black text-foreground">Todos os clientes</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground text-left">
                            <th className="pb-2 font-semibold">Nome</th>
                            <th className="pb-2 font-semibold">Vencimento</th>
                            <th className="pb-2 font-semibold">Status</th>
                            <th className="pb-2 font-semibold text-right">Mensalidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todosOrdenados.map((c) => (
                            <tr key={c.id} className="border-b border-border/50">
                              <td className="py-2 font-semibold text-foreground">{c.nomeRestaurante}</td>
                              <td className="py-2 text-muted-foreground">{c.dataVencimento || "—"}</td>
                              <td className="py-2">{statusBadge(c.statusVenc, c.dataVencimento)}</td>
                              <td className="py-2 text-right text-foreground">R$ {(c.valorMensalidade || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </TabsContent>

          {/* ========== ABA AVISOS ========== */}
          <TabsContent value="avisos" className="space-y-6 mt-4">
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2"><Send className="w-5 h-5" />Enviar aviso ao caixa</h2>
              <div className="space-y-3">
                <div>
                  <Label>Mensagem</Label>
                  <Textarea placeholder="Escreva o aviso..." value={avisoMensagem} onChange={(e) => setAvisoMensagem(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <div className="flex gap-2 mt-1">
                    {([
                      { value: "info" as const, label: "Info", color: "bg-blue-600 text-white" },
                      { value: "alerta" as const, label: "Alerta", color: "bg-yellow-600 text-white" },
                      { value: "urgente" as const, label: "Urgente", color: "bg-destructive text-destructive-foreground" },
                    ]).map((t) => (
                      <Button
                        key={t.value}
                        size="sm"
                        variant={avisoTipo === t.value ? "default" : "outline"}
                        className={avisoTipo === t.value ? t.color : ""}
                        onClick={() => setAvisoTipo(t.value)}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={!avisoMensagem.trim()}
                  onClick={() => {
                    const aviso = { mensagem: avisoMensagem.trim(), tipo: avisoTipo, enviadoEm: new Date().toISOString(), lido: false };
                    localStorage.setItem("obsidian-master-aviso-v1", JSON.stringify(aviso));
                    // Save to history
                    try {
                      const histRaw = localStorage.getItem("obsidian-master-avisos-historico-v1");
                      const hist = histRaw ? JSON.parse(histRaw) : [];
                      hist.unshift({ ...aviso });
                      if (hist.length > 50) hist.length = 50;
                      localStorage.setItem("obsidian-master-avisos-historico-v1", JSON.stringify(hist));
                    } catch {}
                    toast.success("Aviso enviado ao caixa!");
                    setAvisoMensagem("");
                  }}
                >
                  <Send className="w-4 h-4 mr-1" /> Enviar aviso
                </Button>
              </div>
            </div>

            {/* Histórico de avisos */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h2 className="text-lg font-black text-foreground">Histórico de avisos</h2>
              {(() => {
                try {
                  const histRaw = localStorage.getItem("obsidian-master-avisos-historico-v1");
                  const hist: Array<{ mensagem: string; tipo: string; enviadoEm: string; lido?: boolean }> = histRaw ? JSON.parse(histRaw) : [];
                  if (hist.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum aviso enviado ainda.</p>;
                  const tipoCores: Record<string, string> = { info: "border-blue-500/50 bg-blue-500/10", alerta: "border-yellow-500/50 bg-yellow-500/10", urgente: "border-destructive/50 bg-destructive/10" };
                  const tipoLabels: Record<string, string> = { info: "Info", alerta: "Alerta", urgente: "Urgente" };
                  // Check current active aviso to show lido status
                  let currentAviso: { mensagem: string; lido?: boolean } | null = null;
                  try { const raw = localStorage.getItem("obsidian-master-aviso-v1"); if (raw) currentAviso = JSON.parse(raw); } catch {}
                  return (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {hist.map((a, i) => {
                        const isActive = currentAviso && currentAviso.mensagem === a.mensagem;
                        const lido = isActive ? currentAviso?.lido : undefined;
                        return (
                          <div key={i} className={`rounded-xl border p-3 ${tipoCores[a.tipo] || "border-border"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tipoLabels[a.tipo] || a.tipo}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(a.enviadoEm).toLocaleString("pt-BR")}
                                {isActive && lido !== undefined && (lido ? " · ✓ Lido" : " · Não lido")}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{a.mensagem}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editId ? "Editar cliente" : "Novo cliente"}</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Identificação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Nome do restaurante</Label><Input value={form.nomeRestaurante} onChange={(e) => ff("nomeRestaurante", e.target.value)} /></div>
                <div><Label>Segmento</Label><Select value={form.segmento} onValueChange={(v) => ff("segmento", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent container={document.body} position="popper" className="z-[80]">{SEGMENTOS.map((s) => <SelectItem key={s} value={s}>{SEGMENTO_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>CNPJ</Label><div className="flex gap-2"><Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => ff("cnpj", e.target.value)} onBlur={() => buscarCnpj(form.cnpj)} className="flex-1" /><Button type="button" variant="outline" size="sm" className="shrink-0 h-10" disabled={buscandoCnpj || form.cnpj.replace(/\D/g, "").length !== 14} onClick={() => buscarCnpj(form.cnpj)}>{buscandoCnpj ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</Button></div></div>
                <div><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => ff("telefone", e.target.value)} /></div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Contato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Nome do contato</Label><Input value={form.nomeContato} onChange={(e) => ff("nomeContato", e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => ff("email", e.target.value)} /></div>
              </div>
            </div>
            {!editId && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Conta Admin (Supabase)</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={form.criarContaAdmin} onCheckedChange={(v) => ff("criarContaAdmin", v)} />
                  <Label>Criar conta de acesso admin para este cliente</Label>
                </div>
                {form.criarContaAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border bg-background p-4">
                    <div><Label>Email (login)</Label><Input type="email" value={form.email} onChange={(e) => ff("email", e.target.value)} placeholder="admin@restaurante.com" /></div>
                    <div><Label>Senha</Label><Input type="password" value={form.senhaAdmin} onChange={(e) => ff("senhaAdmin", e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
                    {form.slugLoja && <div className="sm:col-span-2"><Label>Slug da loja</Label><p className="text-sm text-muted-foreground mt-1 font-mono bg-background rounded-md px-3 py-2 border">{form.slugLoja}</p></div>}
                  </div>
                )}
              </div>
            )}
            {editId && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Alterar credenciais de acesso</h3>
                {editLinkedUserId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border bg-background p-4">
                    <div>
                      <Label>Novo email de login</Label>
                      <Input type="email" value={editNovoEmail} onChange={(e) => setEditNovoEmail(e.target.value)} placeholder="Deixe vazio para manter" />
                    </div>
                    <div>
                      <Label>Nova senha</Label>
                      <Input type="password" value={editNovaSenha} onChange={(e) => setEditNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        variant="outline"
                        onClick={handleUpdateCredentials}
                        disabled={savingCredentials || (!editNovoEmail.trim() && !editNovaSenha)}
                        className="w-full"
                      >
                        {savingCredentials ? "Atualizando…" : "Atualizar credenciais"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-xl border bg-background p-4">Nenhuma conta Supabase vinculada a este cliente. Vincule pela correspondência do nome do restaurante com uma loja cadastrada.</p>
                )}
              </div>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Localização</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3"><Label>Endereço</Label><Input placeholder="Rua, número" value={form.endereco} onChange={(e) => ff("endereco", e.target.value)} /></div>
                <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => ff("cidade", e.target.value)} /></div>
                <div><Label>Estado</Label><Select value={form.estado} onValueChange={(v) => ff("estado", v)}><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger><SelectContent container={document.body} position="popper" className="z-[80]">{ESTADOS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Contrato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Plano contratual</Label><Select value={form.plano} onValueChange={(v) => ff("plano", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent container={document.body} position="popper" className="z-[80]">{PLANOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Plano de módulos</Label><Select value={form.planoModulos} onValueChange={(v) => ff("planoModulos", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent container={document.body} position="popper" className="z-[80]">{PLANOS_MODULOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Data de início do contrato</Label><Input type="date" value={form.dataInicio} onChange={(e) => ff("dataInicio", e.target.value)} /></div>
                <div><Label>Valor da mensalidade</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span><Input type="number" className="pl-10" value={form.valorMensalidade || ""} onChange={(e) => ff("valorMensalidade", parseFloat(e.target.value) || 0)} /></div></div>
                <div><Label>Dia de vencimento</Label><Select value={String(form.diaVencimento)} onValueChange={(v) => ff("diaVencimento", Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent container={document.body} position="popper" className="z-[80]">{DIAS_VENCIMENTO.map((d) => <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Data de vencimento da licença</Label><Input type="date" value={form.dataVencimento} onChange={(e) => ff("dataVencimento", e.target.value)} /></div>
                <div className="flex items-center gap-2 pt-5"><Switch checked={form.ativo} onCheckedChange={(v) => ff("ativo", v)} /><Label>{form.ativo ? "Ativo" : "Bloqueado"}</Label></div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Observações</h3>
              <Textarea placeholder="Observações livres sobre o cliente..." value={form.observacoes} onChange={(e) => ff("observacoes", e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={savingAccount}>
              {savingAccount ? "Criando conta..." : "Salvar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Dialog */}
      <Dialog open={!!detailClient} onOpenChange={(o) => !o && setDetailClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailClient?.nomeRestaurante}</DialogTitle></DialogHeader>
          {detailClient && (
            <Tabs defaultValue="detalhes" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="detalhes"><Eye className="w-4 h-4 mr-1" />Detalhes</TabsTrigger>
                <TabsTrigger value="pagamentos"><DollarSign className="w-4 h-4 mr-1" />Pagamentos</TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Segmento:</span> <span className="font-semibold text-foreground">{SEGMENTO_LABELS[detailClient.segmento] || detailClient.segmento || "—"}</span></div>
                  <div><span className="text-muted-foreground">CNPJ:</span> <span className="font-semibold text-foreground">{detailClient.cnpj || "—"}</span></div>
                  <div><span className="text-muted-foreground">Telefone:</span> <span className="font-semibold text-foreground">{detailClient.telefone || "—"}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-semibold text-foreground">{detailClient.email || "—"}</span></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Endereço:</span> <span className="font-semibold text-foreground">{[detailClient.endereco, detailClient.cidade, detailClient.estado].filter(Boolean).join(", ") || "—"}</span></div>
                  <div><span className="text-muted-foreground">Mensalidade:</span> <span className="font-semibold text-foreground">R$ {(detailClient.valorMensalidade || 0).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Plano contratual:</span> <Badge className={PLANO_BADGE_CLASS[detailClient.plano] || "bg-muted text-muted-foreground"}>{PLANO_LABELS[detailClient.plano] || detailClient.plano || "—"}</Badge></div>
                  <div><span className="text-muted-foreground">Plano módulos:</span> <Badge className={PLANO_MODULOS_BADGE[detailClient.planoModulos || "basico"]}>{PLANO_MODULOS_LABELS[detailClient.planoModulos || "basico"]}</Badge></div>
                  <div><span className="text-muted-foreground">Início contrato:</span> <span className="font-semibold text-foreground">{detailClient.dataInicio || "—"}</span></div>
                  <div><span className="text-muted-foreground">Dia vencimento:</span> <span className="font-semibold text-foreground">{detailClient.diaVencimento || "—"}</span></div>
                  <div><span className="text-muted-foreground">Licença:</span> <span className="font-semibold text-foreground">{detailClient.dataVencimento || "—"}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={detailClient.ativo ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-destructive hover:bg-destructive text-destructive-foreground"}>{detailClient.ativo ? "Ativo" : "Bloqueado"}</Badge></div>
                </div>
                {detailClient.observacoes && (
                  <div className="text-sm"><span className="text-muted-foreground">Observações:</span><p className="mt-1 text-foreground bg-background rounded-xl p-3">{detailClient.observacoes}</p></div>
                )}
                <Button variant="outline" onClick={() => { const c = detailClient; setDetailClient(null); openEdit(c); }}><Pencil className="w-4 h-4 mr-1" />Editar</Button>
              </TabsContent>

              <TabsContent value="pagamentos" className="space-y-4 mt-4">
                {(() => {
                  const anoAtual = String(new Date().getFullYear());
                  const pagsAno = (detailClient.historicoPagamentos || []).filter((p) => p.data.startsWith(anoAtual));
                  const totalAno = pagsAno.reduce((s, p) => s + p.valor, 0);
                  return (
                    <div className="flex gap-4">
                      <div className="rounded-xl border bg-background p-3 flex-1 text-center">
                        <p className="text-xs text-muted-foreground">Total pago {anoAtual}</p>
                        <p className="text-lg font-black text-emerald-500">R$ {totalAno.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl border bg-background p-3 flex-1 text-center">
                        <p className="text-xs text-muted-foreground">Pagamentos</p>
                        <p className="text-lg font-black text-foreground">{pagsAno.length}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-xl border bg-background p-4 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Registrar pagamento</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Valor</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input type="number" className="pl-10" value={pagForm.valor || ""} onChange={(e) => setPagForm({ ...pagForm, valor: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div>
                      <Label>Método</Label>
                      <Select value={pagForm.metodo} onValueChange={(v) => setPagForm({ ...pagForm, metodo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent container={document.body}>{METODOS_PAGAMENTO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data</Label><Input type="date" value={pagForm.data} onChange={(e) => setPagForm({ ...pagForm, data: e.target.value })} /></div>
                    <div><Label>Observação</Label><Input placeholder="Opcional" value={pagForm.observacao} onChange={(e) => setPagForm({ ...pagForm, observacao: e.target.value })} /></div>
                  </div>
                  <Button onClick={handleRegistrarPagamento} className="w-full">Registrar pagamento</Button>
                </div>

                <div className="space-y-2">
                  {(detailClient.historicoPagamentos || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento registrado.</p>}
                  {[...(detailClient.historicoPagamentos || [])].sort((a, b) => b.data.localeCompare(a.data)).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{p.data}</p>
                        <p className="text-xs text-muted-foreground">{METODOS_PAGAMENTO.find((m) => m.value === p.metodo)?.label || p.metodo}{p.observacao ? ` · ${p.observacao}` : ""}</p>
                      </div>
                      <p className="text-sm font-black text-emerald-500">R$ {p.valor.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove AlertDialog */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover cliente?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleRemove}>Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterPage;
