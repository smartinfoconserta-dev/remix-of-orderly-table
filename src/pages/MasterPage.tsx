import { useState } from "react";
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
import { LogOut, Plus, Pencil, Trash2, Phone, Mail, MapPin, DollarSign, Users, TrendingUp, TrendingDown, Receipt, Eye, AlertTriangle, ShieldOff, RefreshCw } from "lucide-react";
import type { Pagamento } from "@/lib/masterStorage";
import { toast } from "sonner";
import {
  type Cliente, type Despesa,
  getClientes, addCliente, updateCliente, removeCliente,
  getDespesas, addDespesa,
} from "@/lib/masterStorage";

const MASTER_PASS = "master2025";

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

const emptyForm = {
  nomeRestaurante: "", nomeContato: "", email: "", dataVencimento: "",
  ativo: true, avisoAtivo: false, avisoTexto: "",
  telefone: "", cnpj: "", cidade: "", estado: "", endereco: "",
  segmento: "hamburgeria", diaVencimento: 10, valorMensalidade: 0,
  observacoes: "", historicoPagamentos: [] as any[],
  plano: "anual", dataInicio: new Date().toISOString().slice(0, 10), dataTermino: "",
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
  const [authed, setAuthed] = useState(false);
  const [senha, setSenha] = useState("");
  const [senhaErro, setSenhaErro] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [novaDespesa, setNovaDespesa] = useState({ descricao: "", valor: 0, categoria: "gasolina", data: todayStr() });

  const [detailClient, setDetailClient] = useState<Cliente | null>(null);
  const [pagForm, setPagForm] = useState({ valor: 0, metodo: "pix", data: todayStr(), observacao: "" });
  

  const refresh = () => { setClientes(getClientes()); setDespesas(getDespesas()); };

  const handleLogin = () => {
    if (senha === MASTER_PASS) { setAuthed(true); setSenhaErro(false); refresh(); }
    else setSenhaErro(true);
  };

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
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nomeRestaurante.trim() || !form.nomeContato.trim()) { toast.error("Preencha nome do restaurante e contato."); return; }
    if (editId) { updateCliente(editId, form); toast.success("Cliente atualizado."); }
    else { addCliente(form); toast.success("Cliente criado."); }
    setDialogOpen(false); refresh();
  };

  const handleRemove = () => { if (removeId) { removeCliente(removeId); toast.success("Cliente removido."); setRemoveId(null); refresh(); } };
  const toggleAtivo = (c: Cliente) => { updateCliente(c.id, { ativo: !c.ativo }); refresh(); };
  const isVencido = (d: string) => d && new Date(d) < new Date(todayStr());
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

  const handleRegistrarDespesa = () => {
    if (!novaDespesa.descricao.trim()) { toast.error("Preencha a descrição."); return; }
    if (!novaDespesa.valor || novaDespesa.valor <= 0) { toast.error("Informe um valor válido."); return; }
    addDespesa(novaDespesa);
    toast.success("Despesa registrada.");
    setNovaDespesa({ descricao: "", valor: 0, categoria: "gasolina", data: todayStr() });
    refresh();
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow">
          <h1 className="text-2xl font-black text-center text-foreground">Painel Master</h1>
          <Input type="password" placeholder="Senha master" value={senha} onChange={(e) => { setSenha(e.target.value); setSenhaErro(false); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          {senhaErro && <p className="text-sm text-destructive text-center">Senha incorreta.</p>}
          <Button className="w-full" onClick={handleLogin}>Entrar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Painel Master</h1>
          <Button variant="outline" size="sm" onClick={() => setAuthed(false)}><LogOut className="w-4 h-4 mr-1" /> Sair</Button>
        </div>

        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="clientes"><Users className="w-4 h-4 mr-1" />Clientes</TabsTrigger>
            <TabsTrigger value="financeiro"><DollarSign className="w-4 h-4 mr-1" />Financeiro</TabsTrigger>
            <TabsTrigger value="cobrancas"><AlertTriangle className="w-4 h-4 mr-1" />Cobranças</TabsTrigger>
          </TabsList>

          {/* ========== ABA CLIENTES ========== */}
          <TabsContent value="clientes" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
            </div>
            <div className="grid gap-4">
              {clientes.map((c) => (
                <div key={c.id} className="rounded-2xl border bg-card p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-lg text-foreground cursor-pointer hover:underline" onClick={() => openDetail(c)}>{c.nomeRestaurante}</p>
                      {c.segmento && <Badge variant="secondary">{SEGMENTO_LABELS[c.segmento] || c.segmento}</Badge>}
                      {c.plano && <Badge className={PLANO_BADGE_CLASS[c.plano] || "bg-muted text-muted-foreground"}>{PLANO_LABELS[c.plano] || c.plano}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={c.ativo ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-destructive hover:bg-destructive text-destructive-foreground"}>{c.ativo ? "Ativo" : "Bloqueado"}</Badge>
                      {isVencido(c.dataVencimento) && <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">Vencido</Badge>}
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
              ))}
              {clientes.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado.</p>}
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
                updateCliente(c.id, { ativo: false });
                toast.success(`${c.nomeRestaurante} bloqueado.`);
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
                <div><Label>CNPJ</Label><Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => ff("cnpj", e.target.value)} /></div>
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
                <div><Label>Plano</Label><Select value={form.plano} onValueChange={(v) => ff("plano", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent container={document.body} position="popper" className="z-[80]">{PLANOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
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
            <Button onClick={handleSave} className="w-full">Salvar</Button>
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
                  <div><span className="text-muted-foreground">Plano:</span> <Badge className={PLANO_BADGE_CLASS[detailClient.plano] || "bg-muted text-muted-foreground"}>{PLANO_LABELS[detailClient.plano] || detailClient.plano || "—"}</Badge></div>
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
