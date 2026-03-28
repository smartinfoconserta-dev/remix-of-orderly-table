import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Download,
  KeyRound,
  LayoutDashboard,
  Upload,
  Grid3X3,
  ImagePlus,
  LogOut,
  Settings,
  Shield,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
  UtensilsCrossed,
  CreditCard,
  ChefHat,
  Truck,
  Bike,
  Monitor,
  Tv,
  ExternalLink,
  TabletSmartphone,
  TrendingUp,
  DollarSign,
  Receipt,
  Wallet,
  Printer,
  Clock,
  BarChart3,
  CalendarDays,
  FileText,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import TeamManager from "@/components/TeamManager";
import MesasManager from "@/components/MesasManager";
import DevicesManager from "@/components/DevicesManager";
import DevicePinsManager from "@/components/DevicePinsManager";
import { useStore } from "@/contexts/StoreContext";
import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { type GrupoPersonalizacao, type OpcaoGrupo, type Produto } from "@/data/menuData";
import {
  fetchAllProducts,
  upsertProduct,
  softDeleteProduct,
  toggleProductActive,
  toggleProductDelivery,
  reloadProducts,
  getCachedCategorias,
} from "@/hooks/useProducts";
import {
  getMesasConfig,
  getMesasConfigAsync,
  saveMesasConfig,
  getSistemaConfig,
  saveSistemaConfig,
  getLicencaConfig,
  saveLicencaConfig,
  applyCustomPrimaryColor,
  getCategoriasCustom,
  saveCategoriasCustom,
  getHorariosFuncionamento,
  saveHorariosFuncionamento,
  defaultHorariosSemana,
  getModulosDoPlano,
  saveSistemaConfigAsync,
  saveLicencaConfigAsync,
  getSistemaConfigAsync,
  getLicencaConfigAsync,
  getCategoriasCustomAsync,
  saveCategoriasCustomAsync,
  syncPendingChanges,
  type MesasConfig,
  type SistemaConfig,
  type LicencaConfig,
  type BannerConfig,
  type CategoriaCustom,
  type HorariosSemana,
  type HorarioFuncionamento,
  type PlanoModulos,
  getLicenseLevel,
} from "@/lib/adminStorage";
import { getBairrosAsync, saveBairros, type Bairro } from "@/lib/deliveryStorage";
import { toast } from "sonner";
import CaixasSection from "@/components/CaixasSection";
import LicenseBanner from "@/components/LicenseBanner";

type AdminTab = "dashboard" | "cardapio" | "mesas" | "tablets" | "equipe" | "caixas" | "configuracoes" | "licenca";

const PLANO_MODULOS: Record<string, string[]> = {
  basico: ["cozinha"],
  medio: ["cozinha", "delivery"],
  pro: ["cozinha", "delivery", "motoboy"],
  premium: ["cozinha", "delivery", "motoboy", "totem", "tvRetirada"],
};

const TODOS_MODULOS = [
  { id: "cozinha", label: "Cozinha", icon: "🍳", desc: "Tela de preparo de pedidos" },
  { id: "delivery", label: "Delivery", icon: "🛵", desc: "Pedidos para entrega" },
  { id: "motoboy", label: "Motoboy", icon: "🏍️", desc: "Gestão de entregadores" },
  { id: "totem", label: "Totem", icon: "📱", desc: "Autoatendimento para clientes" },
  { id: "tvRetirada", label: "TV de Retirada", icon: "📺", desc: "Painel de chamada de pedidos" },
];

const PLANO_LABELS: Record<string, string> = {
  basico: "Básico",
  medio: "Médio",
  pro: "Pro",
  premium: "Premium",
};

const sidebarSections = [
  { id: "dashboard" as const, label: "Início", icon: LayoutDashboard },
  { id: "cardapio" as const, label: "Cardápio", icon: ClipboardList },
  { id: "mesas" as const, label: "Mesas", icon: Grid3X3 },
  { id: "tablets" as const, label: "Dispositivos", icon: TabletSmartphone },
  { id: "equipe" as const, label: "Equipe", icon: Users },
  { id: "caixas" as const, label: "Caixas", icon: Wallet },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
  { id: "licenca" as const, label: "Meu Plano", icon: Shield },
];

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const AdminPage = () => {
  const { logout } = useAuth();
  const { storeId, storeName: ctxStoreName, stores } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [configSection, setConfigSection] = useState<"inicio" | "identidade" | "delivery" | "salao" | "operacao" | "modulos" | "sistema" | "impressoras">("inicio");
  const [modoOperacaoPendente, setModoOperacaoPendente] = useState<"restaurante" | "fast_food" | null>(null);

  // --- Impressoras form state ---
  const [impEditando, setImpEditando] = useState<import("@/lib/adminStorage").ImpressoraConfig | null>(null);
  const [impFormNome, setImpFormNome] = useState("");
  const [impFormSetor, setImpFormSetor] = useState<"caixa" | "cozinha" | "bar" | "delivery">("cozinha");
  const [impFormTipo, setImpFormTipo] = useState<"rede" | "usb" | "bluetooth">("rede");
  const [impFormIp, setImpFormIp] = useState("");
  const [impFormLargura, setImpFormLargura] = useState<"58mm" | "80mm">("80mm");
  const [impFormAtiva, setImpFormAtiva] = useState(true);
  const [impShowForm, setImpShowForm] = useState(false);

  // --- Dashboard "Hoje" data ---
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState(false);
  const [dashPedidosHoje, setDashPedidosHoje] = useState(0);
  const [dashFaturamento, setDashFaturamento] = useState(0);
  const [dashTotalFechamentos, setDashTotalFechamentos] = useState(0);
  const [dashCaixaAberto, setDashCaixaAberto] = useState<boolean | null>(null);
  const [dashUltimosFechamentos, setDashUltimosFechamentos] = useState<any[]>([]);
  const [dash7dias, setDash7dias] = useState<{ dia: string; total: number }[]>([]);
  const [dash7diasLoading, setDash7diasLoading] = useState(false);

  // --- Relatório por período ---
  type PeriodoOption = "hoje" | "7dias" | "30dias" | "custom";
  const [relPeriodo, setRelPeriodo] = useState<PeriodoOption>("hoje");
  const [relCustomInicio, setRelCustomInicio] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); });
  const [relCustomFim, setRelCustomFim] = useState(() => new Date().toISOString().slice(0,10));
  const [relLoading, setRelLoading] = useState(false);
  const [relData, setRelData] = useState<{
    faturamento: number;
    totalFechamentos: number;
    ticketMedio: number;
    porForma: Record<string, number>;
    topProdutos: { nome: string; qtd: number; valor: number }[];
    fechamentos: any[];
  } | null>(null);

  const getRelPeriodoDates = useCallback(() => {
    const agora = new Date();
    let inicio: Date;
    let fim = new Date(agora);
    fim.setHours(23, 59, 59, 999);
    switch (relPeriodo) {
      case "hoje":
        inicio = new Date(agora); inicio.setHours(0, 0, 0, 0); break;
      case "7dias":
        inicio = new Date(agora); inicio.setDate(inicio.getDate() - 6); inicio.setHours(0, 0, 0, 0); break;
      case "30dias":
        inicio = new Date(agora); inicio.setDate(inicio.getDate() - 29); inicio.setHours(0, 0, 0, 0); break;
      case "custom":
        inicio = new Date(relCustomInicio + "T00:00:00");
        fim = new Date(relCustomFim + "T23:59:59.999");
        break;
      default:
        inicio = new Date(agora); inicio.setHours(0, 0, 0, 0);
    }
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
  }, [relPeriodo, relCustomInicio, relCustomFim]);

  useEffect(() => {
    if (tab !== "dashboard" || !storeId) return;
    let cancelled = false;
    const loadRel = async () => {
      setRelLoading(true);
      try {
        const { inicio, fim } = getRelPeriodoDates();
        const { data: fechamentos, error } = await supabase
          .from("fechamentos")
          .select("total, origem, mesa_numero, forma_pagamento, criado_em, itens")
          .eq("store_id", storeId)
          .eq("cancelado", false)
          .gte("criado_em_iso", inicio)
          .lte("criado_em_iso", fim)
          .order("criado_em_iso", { ascending: false })
          .limit(1000);
        if (cancelled) return;
        if (error) { console.error("[AdminPage] erro relatório período:", error); setRelLoading(false); return; }
        const fech = fechamentos ?? [];
        const fat = fech.reduce((s, f) => s + (Number(f.total) || 0), 0);
        const porForma: Record<string, number> = {};
        const prodMap: Record<string, { qtd: number; valor: number }> = {};
        for (const f of fech) {
          const forma = (f.forma_pagamento || "outro").toLowerCase();
          porForma[forma] = (porForma[forma] || 0) + (Number(f.total) || 0);
          const itens = Array.isArray(f.itens) ? f.itens : [];
          for (const item of itens) {
            const nome = (item as any)?.nome || (item as any)?.name || "Desconhecido";
            const qtd = Number((item as any)?.quantidade || (item as any)?.qtd || 1);
            const val = Number((item as any)?.preco || (item as any)?.price || 0) * qtd;
            if (!prodMap[nome]) prodMap[nome] = { qtd: 0, valor: 0 };
            prodMap[nome].qtd += qtd;
            prodMap[nome].valor += val;
          }
        }
        const topProdutos = Object.entries(prodMap)
          .map(([nome, d]) => ({ nome, ...d }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5);
        setRelData({ faturamento: fat, totalFechamentos: fech.length, ticketMedio: fech.length > 0 ? fat / fech.length : 0, porForma, topProdutos, fechamentos: fech });
      } catch (err) {
        console.error("[AdminPage] erro relatório período:", err);
      } finally {
        if (!cancelled) setRelLoading(false);
      }
    };
    loadRel();
    return () => { cancelled = true; };
  }, [tab, storeId, relPeriodo, relCustomInicio, relCustomFim, getRelPeriodoDates]);

  useEffect(() => {
    if (tab !== "dashboard" || !storeId) return;
    let cancelled = false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeISO = hoje.toISOString();

    const load = async () => {
      setDashLoading(true);
      setDashError(false);
      try {
        const [pedidosRes, fechRes, caixaRes] = await Promise.all([
          supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("cancelado", false).gte("criado_em_iso", hojeISO),
          supabase.from("fechamentos").select("total, origem, mesa_numero, forma_pagamento, criado_em, criado_em_iso").eq("store_id", storeId).eq("cancelado", false).gte("criado_em_iso", hojeISO).order("criado_em_iso", { ascending: false }).limit(100),
          supabase.from("estado_caixa").select("aberto").eq("store_id", storeId).limit(1).maybeSingle(),
        ]);
        if (cancelled) return;
        setDashPedidosHoje(pedidosRes.count ?? 0);
        const fechamentos = fechRes.data ?? [];
        const fat = fechamentos.reduce((s, f) => s + (Number(f.total) || 0), 0);
        setDashFaturamento(fat);
        setDashTotalFechamentos(fechamentos.length);
        setDashCaixaAberto(caixaRes.data?.aberto ?? null);
        setDashUltimosFechamentos(fechamentos.slice(0, 10));
      } catch (err) {
        console.error("[AdminPage] erro ao carregar dashboard:", err);
        if (!cancelled) setDashError(true);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tab, storeId]);

  // --- Cardápio state (from Supabase produtos table) ---
  type AdminProduct = Produto & { ativo: boolean; removido: boolean; disponivelDelivery: boolean; imagemBase64?: string; controleEstoque?: boolean; quantidadeEstoque?: number; estoqueMinimo?: number };
  const [allProducts, setAllProducts] = useState<AdminProduct[]>([]);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", preco: "", categoria: "", imagem: "", imagemBase64: "", permiteLevar: true, controleEstoque: false, quantidadeEstoque: 0, estoqueMinimo: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [removeTarget, setRemoveTarget] = useState<AdminProduct | null>(null);
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustom[]>(getCategoriasCustom);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditando, setCatEditando] = useState<CategoriaCustom | null>(null);
  const [catNomeInput, setCatNomeInput] = useState("");
  const [catIconeInput, setCatIconeInput] = useState("tag");

  // Load products from DB
  const loadProducts = useCallback(async () => {
    if (!storeId) return;
    const prods = await fetchAllProducts(storeId);
    setAllProducts(prods as AdminProduct[]);
  }, [storeId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const dbCategorias = getCachedCategorias();
  const todasCategorias = useMemo(() => {
    const dbCats = dbCategorias.map((c, i) => ({ ...c, ordem: i, _isDefault: false as const }));
    const customCats = categoriasCustom
      .filter((c) => !dbCategorias.some((dc) => dc.id === c.id))
      .map((c) => ({ ...c, _isDefault: false as const }));
    return [...dbCats, ...customCats];
  }, [categoriasCustom, dbCategorias]);

  const filteredProducts = useMemo(() => {
    if (catFilter === "todas") return allProducts;
    return allProducts.filter((p) => p.categoria === catFilter);
  }, [allProducts, catFilter]);

  const toggleAtivo = useCallback(async (id: string) => {
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    const newAtivo = !product.ativo;
    try {
      await toggleProductActive(id, newAtivo);
      setAllProducts((prev) => prev.map((p) => p.id === id ? { ...p, ativo: newAtivo } : p));
      await reloadProducts(storeId);
    } catch { toast.error("Erro ao alterar status"); }
  }, [allProducts, storeId]);

  const toggleDelivery = useCallback(async (id: string) => {
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    const newVal = !product.disponivelDelivery;
    try {
      await toggleProductDelivery(id, newVal);
      setAllProducts((prev) => prev.map((p) => p.id === id ? { ...p, disponivelDelivery: newVal } : p));
    } catch { toast.error("Erro ao alterar delivery"); }
  }, [allProducts, storeId]);

  const openEdit = useCallback((product: AdminProduct) => {
    setEditProduct({ ...product });
    setIsNewProduct(false);
    setEditForm({
      nome: product.nome,
      descricao: product.descricao,
      preco: String(product.preco),
      categoria: product.categoria,
      imagem: product.imagem,
      imagemBase64: product.imagemBase64 || "",
      permiteLevar: product.permiteLevar !== false,
      controleEstoque: product.controleEstoque ?? false,
      quantidadeEstoque: product.quantidadeEstoque ?? 0,
      estoqueMinimo: product.estoqueMinimo ?? 0,
    });
  }, []);

  const openNewProduct = useCallback(() => {
    const newProduct: AdminProduct = {
      id: crypto.randomUUID(),
      nome: "",
      descricao: "",
      preco: 0,
      categoria: todasCategorias[0]?.id ?? "lanches",
      imagem: "",
      ativo: true,
      removido: false,
      disponivelDelivery: true,
    };
    setEditProduct(newProduct);
    setIsNewProduct(true);
    setEditForm({ nome: "", descricao: "", preco: "", categoria: newProduct.categoria, imagem: "", imagemBase64: "", permiteLevar: true, controleEstoque: false, quantidadeEstoque: 0, estoqueMinimo: 0 });
  }, [todasCategorias]);

  const saveEdit = useCallback(async () => {
    if (!editProduct || !storeId) return;
    const preco = parseFloat(editForm.preco);
    if (isNaN(preco) || preco < 0) {
      toast.error("Preço inválido");
      return;
    }
    if (!editForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      const productToSave: AdminProduct = {
        ...editProduct,
        nome: editForm.nome.trim(),
        descricao: editForm.descricao.trim(),
        preco,
        categoria: editForm.categoria,
        imagem: editForm.imagem.trim(),
        imagemBase64: editForm.imagemBase64 || undefined,
        permiteLevar: editForm.permiteLevar,
        setor: editProduct.setor ?? "cozinha",
        controleEstoque: editForm.controleEstoque,
        quantidadeEstoque: editForm.quantidadeEstoque,
        estoqueMinimo: editForm.estoqueMinimo,
      };
      await upsertProduct(productToSave, storeId);
      await loadProducts();
      await reloadProducts(storeId);
      setEditProduct(null);
      toast.success(isNewProduct ? "Produto criado" : "Produto atualizado");
    } catch {
      toast.error("Erro ao salvar produto");
    }
  }, [editProduct, editForm, isNewProduct, storeId, loadProducts]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setEditForm((f) => ({ ...f, imagemBase64: base64 }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const confirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    try {
      await softDeleteProduct(removeTarget.id);
      await loadProducts();
      await reloadProducts(storeId);
      setRemoveTarget(null);
      toast.success("Produto removido do cardápio");
    } catch {
      toast.error("Erro ao remover produto");
    }
  }, [removeTarget, storeId, loadProducts]);


  // Fetch 7-day revenue chart data
  useEffect(() => {
    if (tab !== "dashboard" || !storeId) return;
    let cancelled = false;
    const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const load7dias = async () => {
      setDash7diasLoading(true);
      try {
        const dias: { inicio: string; fim: string; label: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - i);
          const inicio = d.toISOString();
          const fim = new Date(d.getTime() + 86400000 - 1).toISOString();
          dias.push({ inicio, fim, label: DIAS_SEMANA[d.getDay()] });
        }
        const results = await Promise.all(
          dias.map(({ inicio, fim }) =>
            supabase
              .from("fechamentos")
              .select("total")
              .eq("store_id", storeId)
              .eq("cancelado", false)
              .gte("criado_em_iso", inicio)
              .lte("criado_em_iso", fim)
          )
        );
        if (cancelled) return;
        const chartData = dias.map((d, i) => ({
          dia: d.label,
          total: (results[i].data ?? []).reduce((s, f) => s + (Number(f.total) || 0), 0),
        }));
        setDash7dias(chartData);
      } catch (err) {
        console.error("[AdminPage] erro ao carregar gráfico 7 dias:", err);
      } finally {
        if (!cancelled) setDash7diasLoading(false);
      }
    };
    load7dias();
    return () => { cancelled = true; };
  }, [tab, storeId]);

  // --- Mesas state ---
  const [mesasConfig, setMesasConfig] = useState<MesasConfig>(getMesasConfig);
  const [mesasInput, setMesasInput] = useState(String(mesasConfig.totalMesas));

  useEffect(() => {
    getMesasConfigAsync(storeId).then((cfg) => {
      setMesasConfig(cfg);
      setMesasInput(String(cfg.totalMesas));
    });
  }, [storeId]);

  const handleMesasApply = useCallback(() => {
    const val = Math.max(1, Math.min(50, parseInt(mesasInput) || 1));
    const next = { totalMesas: val };
    saveMesasConfig(next, storeId);
    setMesasConfig(next);
    setMesasInput(String(val));
    toast.success(`Configurado para ${val} mesas. Aplica ao reabrir o caixa.`);
  }, [mesasInput]);

  // --- Configurações state ---
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);

  // --- Horários state ---
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<HorariosSemana>(getHorariosFuncionamento);

  // --- Bairros state ---
  const [bairros, setBairros] = useState<Bairro[]>([]);
  useEffect(() => { if (storeId) getBairrosAsync(storeId).then(setBairros); }, [storeId]);
  const [novoBairroNome, setNovoBairroNome] = useState("");
  const [novoBairroTaxa, setNovoBairroTaxa] = useState("");
  const [deliveryModo, setDeliveryModo] = useState<"todos" | "cadastrados">(() => {
    try {
      const v = localStorage.getItem("obsidian-delivery-modo-v1");
      return v === "cadastrados" ? "cadastrados" : "todos";
    } catch { return "todos"; }
  });

  // Load from Supabase on mount
  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then((c) => setSistemaConfig(c));
    getLicencaConfigAsync(storeId).then((l) => setLicencaConfig(l));
    getCategoriasCustomAsync(storeId).then((cats) => setCategoriasCustom(cats));
    syncPendingChanges();
  }, [storeId]);

  const saveSistema = useCallback(() => {
    saveSistemaConfig(sistemaConfig, storeId);
    saveSistemaConfigAsync(sistemaConfig, storeId);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig, storeId]);

  // --- Licença state ---
  const [licencaConfig, setLicencaConfig] = useState<LicencaConfig>(getLicencaConfig);

  const saveLicenca = useCallback(() => {
    saveLicencaConfig(licencaConfig, storeId);
    saveLicencaConfigAsync(licencaConfig, storeId);
    toast.success("Licença salva");
  }, [licencaConfig, storeId]);


  const nomeRestaurante = getSistemaConfig().nomeRestaurante || "Restaurante";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 py-2.5 shrink-0 bg-sidebar-background border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground leading-none">{nomeRestaurante}</h1>
            <p className="text-[10px] text-muted-foreground">Painel Administrativo</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary text-xs gap-1.5" onClick={() => logout()}>
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background">
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menu</p>
          {sidebarSections.map((s) => {
            const Icon = s.icon;
            const active = tab === s.id;
            const licLevel = getLicenseLevel();
            const reportsOnly = licLevel === "reports_only";
            const allowedInReportsOnly = ["dashboard", "caixas", "licenca"];
            const isDisabled = reportsOnly && !allowedInReportsOnly.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) { setTab(s.id); setConfigSection("inicio"); } }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed text-muted-foreground"
                    : active
                      ? "bg-primary/15 text-primary font-bold"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>

      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-background" key={tab}>
        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div className="space-y-8 fade-in">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-black text-foreground">
                Bem-vindo de volta 👋
              </h2>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Status cards — 4 columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produtos</p>
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-black text-foreground">{allProducts.length}</p>
                <p className="text-xs text-muted-foreground">itens no cardápio</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mesas</p>
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Grid3X3 className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-black text-foreground">{mesasConfig.totalMesas}</p>
                <p className="text-xs text-muted-foreground">configuradas</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery</p>
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Truck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sistemaConfig.deliveryAtivo !== false && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                  )}
                  <p className={`text-xl font-black ${sistemaConfig.deliveryAtivo !== false ? "text-emerald-400" : "text-destructive"}`}>
                    {sistemaConfig.deliveryAtivo !== false ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sistemaConfig.deliveryAtivo !== false ? "Aceitando pedidos" : "Pausado"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipe</p>
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-black text-foreground">—</p>
                <p className="text-xs text-muted-foreground">Gerenciado via PINs</p>
              </div>
            </div>

            {/* Plan banner */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-5 flex-wrap">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-red-500 flex items-center justify-center shrink-0">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="mr-auto">
                  <p className="text-lg font-black text-foreground">{PLANO_LABELS[licencaConfig.plano || "basico"] || "Básico"}</p>
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                    Plano atual
                  </span>
                </div>
                {[
                  { label: "Módulos ilimitados", show: licencaConfig.plano === "premium" },
                  { label: "Delivery integrado", show: ["medio", "pro", "premium"].includes(licencaConfig.plano || "") },
                  { label: "Suporte prioritário", show: ["pro", "premium"].includes(licencaConfig.plano || "") },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded flex items-center justify-center text-xs ${f.show ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {f.show ? "✓" : "—"}
                    </div>
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs ml-2" onClick={() => setTab("licenca")}>
                  Ver plano →
                </Button>
              </div>
            </div>

            {/* Módulos ao vivo — 4x2 grid */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Módulos ao vivo</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Garçom", icon: UtensilsCrossed, path: "/garcom" },
                  { label: "Caixa", icon: CreditCard, path: "/caixa" },
                  { label: "Cozinha", icon: ChefHat, path: "/cozinha" },
                  { label: "Delivery", icon: Truck, path: "/delivery" },
                  { label: "Motoboy", icon: Bike, path: "/motoboy" },
                  { label: "Totem", icon: Monitor, path: "/totem" },
                  { label: "TV Retirada", icon: Tv, path: "/tv" },
                  { label: "Gerente", icon: Users, path: "/gerente" },
                ].map((m) => (
                  <button
                    key={m.path}
                    type="button"
                    onClick={() => navigate(m.path)}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 group"
                  >
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{m.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-border my-6" />

            {/* ── Hoje ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Hoje
                </p>
                {!dashLoading && !dashError && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-bold text-xs gap-1.5"
                    onClick={() => {
                      // Build payment summary from fechamentos
                      const porForma: Record<string, number> = {};
                      for (const f of dashUltimosFechamentos) {
                        const forma = (f.forma_pagamento || "outro").toLowerCase();
                        porForma[forma] = (porForma[forma] || 0) + (Number(f.total) || 0);
                      }
                      // We need ALL fechamentos, not just 10. Re-fetch for report.
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const hojeISO = hoje.toISOString();
                      const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                      const dataFormatada = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

                      supabase
                        .from("fechamentos")
                        .select("total, origem, mesa_numero, forma_pagamento, criado_em")
                        .eq("store_id", storeId!)
                        .eq("cancelado", false)
                        .gte("criado_em_iso", hojeISO)
                        .order("criado_em_iso", { ascending: false })
                        .limit(500)
                        .then(({ data }) => {
                          const fechamentos = data ?? [];
                          const totalFat = fechamentos.reduce((s, f) => s + (Number(f.total) || 0), 0);
                          const formas: Record<string, number> = {};
                          for (const f of fechamentos) {
                            const k = (f.forma_pagamento || "outro").toLowerCase();
                            formas[k] = (formas[k] || 0) + (Number(f.total) || 0);
                          }
                          const ticketMedio = fechamentos.length > 0 ? totalFat / fechamentos.length : 0;

                          const formasRows = ["dinheiro", "crédito", "débito", "pix"]
                            .map((f) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${f.charAt(0).toUpperCase() + f.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(formas[f] || 0).toFixed(2).replace(".", ",")}</td></tr>`)
                            .join("");
                          // Add "outros" if any
                          const outrasFormas = Object.entries(formas).filter(([k]) => !["dinheiro", "crédito", "débito", "pix"].includes(k));
                          const outrasRows = outrasFormas.map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${k.charAt(0).toUpperCase() + k.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${v.toFixed(2).replace(".", ",")}</td></tr>`).join("");

                          const fechRows = fechamentos.map((f) => {
                            const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
                            const origem = f.origem === "mesa" ? `Mesa ${f.mesa_numero || "?"}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem || "—";
                            return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${hora}</td><td style="padding:6px 12px;border:1px solid #ddd;">${origem}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(Number(f.total) || 0).toFixed(2).replace(".", ",")}</td><td style="padding:6px 12px;border:1px solid #ddd;">${f.forma_pagamento || "—"}</td></tr>`;
                          }).join("");

                          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório do Dia - ${nomeRest}</title><style>
body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:24px;max-width:800px;margin:0 auto;}
h1{font-size:18px;margin-bottom:4px;}
h2{font-size:14px;margin-top:24px;margin-bottom:8px;border-bottom:2px solid #222;padding-bottom:4px;}
.subtitle{color:#666;font-size:12px;margin-bottom:20px;}
table{border-collapse:collapse;width:100%;margin-bottom:16px;}
th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-weight:bold;}
.summary{display:flex;gap:32px;flex-wrap:wrap;margin-bottom:8px;}
.summary-item{min-width:140px;}
.summary-item .label{color:#666;font-size:11px;text-transform:uppercase;}
.summary-item .value{font-size:20px;font-weight:bold;}
.print-btn{margin-bottom:20px;padding:8px 16px;background:#222;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;}
@media print{.print-btn{display:none !important;}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
<h1>${nomeRest}</h1>
<p class="subtitle">Relatório do dia — ${dataFormatada}</p>

<h2>Resumo financeiro</h2>
<div class="summary">
<div class="summary-item"><div class="label">Faturamento total</div><div class="value">R$ ${totalFat.toFixed(2).replace(".", ",")}</div></div>
<div class="summary-item"><div class="label">Pedidos</div><div class="value">${dashPedidosHoje}</div></div>
<div class="summary-item"><div class="label">Ticket médio</div><div class="value">R$ ${ticketMedio.toFixed(2).replace(".", ",")}</div></div>
<div class="summary-item"><div class="label">Fechamentos</div><div class="value">${fechamentos.length}</div></div>
</div>

<h2>Vendas por forma de pagamento</h2>
<table><thead><tr><th>Forma</th><th style="text-align:right;">Total</th></tr></thead><tbody>${formasRows}${outrasRows}</tbody></table>

<h2>Fechamentos do dia (${fechamentos.length})</h2>
<table><thead><tr><th>Horário</th><th>Origem</th><th style="text-align:right;">Total</th><th>Pagamento</th></tr></thead><tbody>${fechRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#999;">Nenhum fechamento</td></tr>'}</tbody></table>

<p style="color:#999;font-size:10px;margin-top:24px;text-align:center;">Gerado automaticamente em ${new Date().toLocaleString("pt-BR")}</p>
</body></html>`;

                          const w = window.open("", "_blank");
                          if (w) {
                            w.document.write(html);
                            w.document.close();
                          }
                        });
                    }}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Exportar PDF
                  </Button>
                )}
              </div>
              {dashLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Carregando...
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedidos hoje</p>
                      <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-foreground">{dashError ? "—" : dashPedidosHoje}</p>
                    <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : "registrados no dia"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</p>
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-primary">{dashError ? "—" : formatPrice(dashFaturamento)}</p>
                    <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : "em fechamentos"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket médio</p>
                      <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Receipt className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-primary">
                      {dashError ? "—" : dashTotalFechamentos > 0 ? formatPrice(dashFaturamento / dashTotalFechamentos) : formatPrice(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : `${dashTotalFechamentos} fechamentos`}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caixa agora</p>
                      <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Wallet className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!dashError && dashCaixaAberto === true && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                        </span>
                      )}
                      {!dashError && dashCaixaAberto === false && (
                        <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                      )}
                      <p className={`text-xl font-black ${dashError ? "text-muted-foreground" : dashCaixaAberto === true ? "text-emerald-400" : dashCaixaAberto === false ? "text-destructive" : "text-muted-foreground"}`}>
                        {dashError ? "—" : dashCaixaAberto === true ? "Aberto" : dashCaixaAberto === false ? "Fechado" : "—"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{dashError ? "Erro ao carregar" : "status do turno"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Gráfico 7 dias ── */}
            {!dashLoading && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Faturamento — últimos 7 dias
                </p>
                {dash7diasLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[220px] w-full rounded-lg" />
                  </div>
                ) : dash7dias.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dash7dias}>
                      <XAxis dataKey="dia" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={45} />
                      <Tooltip
                        formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "Faturamento"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                        labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">Sem dados de faturamento</p>
                )}
              </div>
            )}

            {/* ── Relatório por período ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Relatório por período
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["hoje", "7dias", "30dias", "custom"] as const).map((opt) => {
                    const labels: Record<PeriodoOption, string> = { hoje: "Hoje", "7dias": "7 dias", "30dias": "30 dias", custom: "Personalizado" };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRelPeriodo(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          relPeriodo === opt
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {relPeriodo === "custom" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs text-muted-foreground">De:</label>
                  <input type="date" value={relCustomInicio} onChange={(e) => setRelCustomInicio(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground" />
                  <label className="text-xs text-muted-foreground">Até:</label>
                  <input type="date" value={relCustomFim} onChange={(e) => setRelCustomFim(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground" />
                </div>
              )}
              {relLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
                </div>
              ) : relData ? (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</p>
                      <p className="text-2xl font-black text-primary">{formatPrice(relData.faturamento)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fechamentos</p>
                      <p className="text-2xl font-black text-foreground">{relData.totalFechamentos}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket médio</p>
                      <p className="text-2xl font-black text-primary">{formatPrice(relData.ticketMedio)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formas pgto</p>
                      <p className="text-2xl font-black text-foreground">{Object.keys(relData.porForma).length}</p>
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {["dinheiro", "crédito", "débito", "pix"].map((forma) => (
                      <div key={forma} className="rounded-xl border border-border bg-card p-4 space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{forma.charAt(0).toUpperCase() + forma.slice(1)}</p>
                        <p className="text-lg font-black text-foreground">{formatPrice(relData.porForma[forma] || 0)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Top 5 products */}
                  {relData.topProdutos.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top 5 produtos</p>
                      <div className="divide-y divide-border">
                        {relData.topProdutos.map((p, i) => (
                          <div key={p.nome} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-3">
                              <span className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-black text-primary">{i + 1}</span>
                              <span className="text-sm font-bold text-foreground">{p.nome}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground">{p.qtd}x</span>
                              <span className="text-sm font-black text-foreground">{formatPrice(p.valor)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export button */}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold text-xs gap-1.5"
                      onClick={() => {
                        const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                        const { inicio, fim } = getRelPeriodoDates();
                        const periodoLabel = relPeriodo === "hoje" ? "Hoje"
                          : relPeriodo === "7dias" ? "Últimos 7 dias"
                          : relPeriodo === "30dias" ? "Últimos 30 dias"
                          : `${relCustomInicio} a ${relCustomFim}`;

                        const formasRows = ["dinheiro", "crédito", "débito", "pix"]
                          .map((f) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${f.charAt(0).toUpperCase() + f.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(relData.porForma[f] || 0).toFixed(2).replace(".", ",")}</td></tr>`)
                          .join("");
                        const outrasFormas = Object.entries(relData.porForma).filter(([k]) => !["dinheiro", "crédito", "débito", "pix"].includes(k));
                        const outrasRows = outrasFormas.map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${k.charAt(0).toUpperCase() + k.slice(1)}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${v.toFixed(2).replace(".", ",")}</td></tr>`).join("");

                        const topRows = relData.topProdutos.map((p, i) =>
                          `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${i+1}</td><td style="padding:6px 12px;border:1px solid #ddd;">${p.nome}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">${p.qtd}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${p.valor.toFixed(2).replace(".", ",")}</td></tr>`
                        ).join("");

                        const fechRows = relData.fechamentos.map((f) => {
                          const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
                          const origem = f.origem === "mesa" ? `Mesa ${f.mesa_numero || "?"}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem || "—";
                          return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${hora}</td><td style="padding:6px 12px;border:1px solid #ddd;">${origem}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">R$ ${(Number(f.total) || 0).toFixed(2).replace(".", ",")}</td><td style="padding:6px 12px;border:1px solid #ddd;">${f.forma_pagamento || "—"}</td></tr>`;
                        }).join("");

                        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório - ${nomeRest}</title><style>
body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:24px;max-width:800px;margin:0 auto;}
h1{font-size:18px;margin-bottom:4px;}
h2{font-size:14px;margin-top:24px;margin-bottom:8px;border-bottom:2px solid #222;padding-bottom:4px;}
.subtitle{color:#666;font-size:12px;margin-bottom:20px;}
table{border-collapse:collapse;width:100%;margin-bottom:16px;}
th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-weight:bold;}
.summary{display:flex;gap:32px;flex-wrap:wrap;margin-bottom:8px;}
.summary-item{min-width:140px;}
.summary-item .label{color:#666;font-size:11px;text-transform:uppercase;}
.summary-item .value{font-size:20px;font-weight:bold;}
.print-btn{margin-bottom:20px;padding:8px 16px;background:#222;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;}
@media print{.print-btn{display:none !important;}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
<h1>${nomeRest}</h1>
<p class="subtitle">Relatório — ${periodoLabel}</p>
<h2>Resumo financeiro</h2>
<div class="summary">
<div class="summary-item"><div class="label">Faturamento total</div><div class="value">R$ ${relData.faturamento.toFixed(2).replace(".", ",")}</div></div>
<div class="summary-item"><div class="label">Fechamentos</div><div class="value">${relData.totalFechamentos}</div></div>
<div class="summary-item"><div class="label">Ticket médio</div><div class="value">R$ ${relData.ticketMedio.toFixed(2).replace(".", ",")}</div></div>
</div>
<h2>Vendas por forma de pagamento</h2>
<table><thead><tr><th>Forma</th><th style="text-align:right;">Total</th></tr></thead><tbody>${formasRows}${outrasRows}</tbody></table>
${topRows ? `<h2>Top 5 produtos</h2><table><thead><tr><th>#</th><th>Produto</th><th style="text-align:right;">Qtd</th><th style="text-align:right;">Total</th></tr></thead><tbody>${topRows}</tbody></table>` : ""}
<h2>Fechamentos (${relData.totalFechamentos})</h2>
<table><thead><tr><th>Horário</th><th>Origem</th><th style="text-align:right;">Total</th><th>Pagamento</th></tr></thead><tbody>${fechRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#999;">Nenhum</td></tr>'}</tbody></table>
<p style="color:#999;font-size:10px;margin-top:24px;text-align:center;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
</body></html>`;

                        const w = window.open("", "_blank");
                        if (w) { w.document.write(html); w.document.close(); }
                      }}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Últimos fechamentos ── */}
            {!dashLoading && dashUltimosFechamentos.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Últimos fechamentos</p>
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {dashUltimosFechamentos.map((f, i) => {
                    const hora = f.criado_em ? String(f.criado_em).split(" ").pop()?.slice(0, 5) || "" : "";
                    const origemLabel = f.origem === "mesa" ? `Mesa ${f.mesa_numero || "?"}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem || "—";
                    return (
                      <div key={i} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono text-muted-foreground w-12">{hora}</span>
                          <span className="text-sm font-bold text-foreground">{origemLabel}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{f.forma_pagamento || "—"}</span>
                          <span className="text-sm font-black text-foreground">{formatPrice(Number(f.total) || 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ CARDÁPIO ═══ */}
        {tab === "cardapio" && (
          <div className="space-y-5 fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-foreground">Cardápio</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{allProducts.length} produtos</span>
                  <span>·</span>
                  <span>{allProducts.filter(p => p.ativo !== false).length} disponíveis</span>
                  <span>·</span>
                  <span>{todasCategorias.length} categorias</span>
                </div>
              </div>
              <Button onClick={openNewProduct} className="rounded-xl font-bold gap-1.5">
                <Plus className="h-4 w-4" />
                Novo produto
              </Button>
            </div>

            {/* ── Category management ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground">Categorias</h3>
                <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1 text-xs" onClick={() => { setCatEditando(null); setCatNomeInput(""); setCatIconeInput("tag"); setCatDialogOpen(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Nova categoria
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {todasCategorias.map((c) => {
                  const count = allProducts.filter((p) => p.categoria === c.id).length;
                  return (
                    <div key={c.id} className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5">
                      <span className="text-xs font-bold text-foreground">{c.nome}</span>
                      <span className="text-[10px] text-muted-foreground">({count})</span>
                      {c._isDefault ? (
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">Padrão</span>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setCatEditando(c); setCatNomeInput(c.nome); setCatIconeInput(c.icone || "tag"); setCatDialogOpen(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                            const idx = categoriasCustom.findIndex((cc) => cc.id === c.id);
                            if (idx <= 0) return;
                            const next = [...categoriasCustom];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            next.forEach((cc, i) => cc.ordem = i);
                            saveCategoriasCustom(next, storeId);
                            setCategoriasCustom(next);
                          }}>
                            <span className="text-[10px]">▲</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                            const idx = categoriasCustom.findIndex((cc) => cc.id === c.id);
                            if (idx < 0 || idx >= categoriasCustom.length - 1) return;
                            const next = [...categoriasCustom];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            next.forEach((cc, i) => cc.ordem = i);
                            saveCategoriasCustom(next, storeId);
                            setCategoriasCustom(next);
                          }}>
                            <span className="text-[10px]">▼</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/10" onClick={() => {
                            if (count > 0) { toast.error("Remova os produtos desta categoria primeiro"); return; }
                            const next = categoriasCustom.filter((cc) => cc.id !== c.id);
                            saveCategoriasCustom(next, storeId);
                            setCategoriasCustom(next);
                            toast.success("Categoria removida");
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category filter bar */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCatFilter("todas");
                  document.querySelector("[data-admin-product-table]")?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                  catFilter === "todas"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                Todas
                <span className="text-xs bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-black">
                  {allProducts.length}
                </span>
              </button>
              {todasCategorias.map((c) => {
                const count = allProducts.filter((p) => p.categoria === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCatFilter(c.id);
                      document.querySelector("[data-admin-product-table]")?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                      catFilter === c.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    {c.nome}
                    <span className="text-xs bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-black">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Products table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card" data-admin-product-table>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground w-14">Foto</th>
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground">Produto</th>
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground">Categoria</th>
                    <th className="px-4 py-3 text-right font-bold text-muted-foreground">Preço</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground">Ativo</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground">Delivery</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const cat = todasCategorias.find((c) => c.id === p.categoria);
                      return (
                        <tr key={p.id} className={`slide-up border-b border-border/50 last:border-0 ${!p.ativo ? "opacity-40" : ""}`} style={{ animationDelay: `${Math.min(idx * 30, 300)}ms`, animationFillMode: 'both' }}>
                          <td className="px-4 py-2">
                            {(p.imagemBase64 || p.imagem) ? (
                              <img src={p.imagemBase64 || p.imagem} alt={p.nome} className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0"><span className="text-lg">🍽️</span></div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              {p.nome}
                              {p.controleEstoque && p.quantidadeEstoque !== undefined && p.quantidadeEstoque <= 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-destructive text-destructive-foreground">Esgotado</span>
                              )}
                              {p.controleEstoque && p.quantidadeEstoque !== undefined && p.estoqueMinimo !== undefined && p.quantidadeEstoque > 0 && p.quantidadeEstoque <= p.estoqueMinimo && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-destructive text-destructive-foreground">Estoque baixo</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{cat?.nome ?? p.categoria}</td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">{formatPrice(p.preco)}</td>
                          <td className="px-4 py-3 text-center">
                            <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p.id)} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Switch checked={p.disponivelDelivery !== false} onCheckedChange={() => toggleDelivery(p.id)} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="rounded-xl font-bold gap-1.5 text-xs">
                                <Pencil className="h-3 w-3" /> Editar
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setRemoveTarget(p)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Edit / New modal */}
            <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
              <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-visible flex flex-col">
                <DialogHeader>
                  <DialogTitle>{isNewProduct ? "Novo produto" : "Editar produto"}</DialogTitle>
                  <DialogDescription>{isNewProduct ? "Preencha os campos para adicionar um produto." : "Altere os campos desejados e salve."}</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-1 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Coluna esquerda */}
                  <div className="col-span-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Nome</label>
                    <Input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Descrição</label>
                    <Input value={editForm.descricao} onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Preço</label>
                    <Input type="number" step="0.01" value={editForm.preco} onChange={(e) => setEditForm((f) => ({ ...f, preco: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Categoria</label>
                    <Select value={editForm.categoria} onValueChange={(v) => setEditForm((f) => ({ ...f, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {todasCategorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Photo upload + URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Foto do produto</label>
                    {/* Preview */}
                    {(editForm.imagemBase64 || editForm.imagem) && (
                      <div className="flex items-center gap-3">
                        <img
                          src={editForm.imagemBase64 || editForm.imagem}
                          alt="Preview"
                          className="h-16 w-16 rounded-xl border border-border object-cover"
                        />
                        {editForm.imagemBase64 && (
                          <button
                            type="button"
                            onClick={() => setEditForm((f) => ({ ...f, imagemBase64: "" }))}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remover foto enviada
                          </button>
                        )}
                      </div>
                    )}
                    {/* File upload */}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <ImagePlus className="h-5 w-5" />
                      Clique para selecionar foto
                    </button>
                    {/* URL alternative */}
                    <p className="text-[10px] font-bold text-muted-foreground pt-1">Ou cole uma URL</p>
                    <Input value={editForm.imagem} onChange={(e) => setEditForm((f) => ({ ...f, imagem: e.target.value }))} placeholder="https://..." />
                  </div>
                  </div>{/* end left column */}

                  {/* Coluna direita */}
                  <div className="col-span-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground">Disponível no delivery</label>
                    <Switch
                      checked={editProduct?.disponivelDelivery !== false}
                      onCheckedChange={(v) => setEditProduct((prev) => prev ? { ...prev, disponivelDelivery: v } : prev)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">Permite "para levar"</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Desative para itens que não fazem sentido embalar
                        (ex: drinks em taça, açaí, sobremesas servidas na mesa).
                      </p>
                    </div>
                    <Switch
                      checked={editForm.permiteLevar}
                      onCheckedChange={(v) => setEditForm(prev => ({ ...prev, permiteLevar: v }))}
                    />
                  </div>

                  {/* Estoque */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">Controlar estoque</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Ative para monitorar a quantidade disponível deste produto.</p>
                      </div>
                      <Switch
                        checked={editForm.controleEstoque}
                        onCheckedChange={(v) => setEditForm(prev => ({ ...prev, controleEstoque: v }))}
                      />
                    </div>
                    {editForm.controleEstoque && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Quantidade atual</label>
                          <Input
                            type="number"
                            min={0}
                            value={editForm.quantidadeEstoque}
                            onChange={(e) => setEditForm(prev => ({ ...prev, quantidadeEstoque: parseInt(e.target.value) || 0 }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Estoque mínimo (alerta)</label>
                          <Input
                            type="number"
                            min={0}
                            value={editForm.estoqueMinimo}
                            onChange={(e) => setEditForm(prev => ({ ...prev, estoqueMinimo: parseInt(e.target.value) || 0 }))}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Setor de preparo */}
                  <div className="space-y-1.5 border-t border-border pt-4">
                    <label className="text-xs font-bold text-muted-foreground">Setor de preparo</label>
                    <div className="flex gap-2">
                      {([
                        { id: "cozinha", label: "🍳 Cozinha" },
                        { id: "bar", label: "🍹 Bar" },
                        { id: "ambos", label: "⚡ Ambos" },
                      ] as const).map((s) => {
                        const active = (editProduct?.setor ?? "cozinha") === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setEditProduct((prev) => prev ? { ...prev, setor: s.id } : prev)}
                            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Define em qual monitor este item aparece na cozinha</p>
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-muted-foreground">Personalização do produto</label>
                      <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => {
                        const novoGrupo: GrupoPersonalizacao = {
                          id: `grp-${Date.now()}`,
                          nome: "",
                          obrigatorio: false,
                          tipo: "adicional",
                          opcoes: [],
                        };
                        setEditProduct((prev) => prev ? { ...prev, grupos: [...(prev.grupos || []), novoGrupo] } : prev);
                      }}>
                        <Plus className="h-3 w-3" /> Criar grupo
                      </Button>
                    </div>
                    {(editProduct?.grupos || []).map((grupo, gi) => (
                      <div key={grupo.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={grupo.nome}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditProduct((prev) => {
                                if (!prev) return prev;
                                const g = [...(prev.grupos || [])];
                                g[gi] = { ...g[gi], nome: val };
                                return { ...prev, grupos: g };
                              });
                            }}
                            placeholder="Nome do grupo (ex: Ponto da carne)"
                            className="text-sm h-8 flex-1"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            setEditProduct((prev) => {
                              if (!prev) return prev;
                              const g = [...(prev.grupos || [])];
                              g.splice(gi, 1);
                              return { ...prev, grupos: g };
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {(["escolha", "adicional", "retirar"] as const).map((t) => {
                            const active = (grupo.tipo || "adicional") === t;
                            const labels = { escolha: "🔘 Escolha obrigatória", adicional: "➕ Adicional", retirar: "➖ Retirar" };
                            const colors = {
                              escolha: active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                              adicional: active ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground",
                              retirar: active ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground",
                            };
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setEditProduct((prev) => {
                                    if (!prev) return prev;
                                    const g = [...(prev.grupos || [])];
                                    g[gi] = { ...g[gi], tipo: t, obrigatorio: t === "escolha" };
                                    return { ...prev, grupos: g };
                                  });
                                }}
                                className={`rounded-lg px-2.5 py-1 font-bold transition-colors ${colors[t]}`}
                              >
                                {labels[t]}
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-1.5 pl-2">
                          {grupo.opcoes.map((op, oi) => (
                            <div key={op.id} className="flex items-center gap-2">
                              <Input
                                value={op.nome}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditProduct((prev) => {
                                    if (!prev) return prev;
                                    const g = [...(prev.grupos || [])];
                                    const ops = [...g[gi].opcoes];
                                    ops[oi] = { ...ops[oi], nome: val };
                                    g[gi] = { ...g[gi], opcoes: ops };
                                    return { ...prev, grupos: g };
                                  });
                                }}
                                placeholder="Nome da opção"
                                className="text-sm h-7 flex-1"
                              />
                              {(grupo.tipo || "adicional") !== "retirar" && (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={op.preco || ""}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setEditProduct((prev) => {
                                        if (!prev) return prev;
                                        const g = [...(prev.grupos || [])];
                                        const ops = [...g[gi].opcoes];
                                        ops[oi] = { ...ops[oi], preco: val };
                                        g[gi] = { ...g[gi], opcoes: ops };
                                        return { ...prev, grupos: g };
                                      });
                                    }}
                                    placeholder="R$"
                                    className="text-sm h-7 w-20"
                                  />
                                  {op.preco === 0 && <span className="text-[10px] text-muted-foreground whitespace-nowrap">Grátis</span>}
                                </div>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                                setEditProduct((prev) => {
                                  if (!prev) return prev;
                                  const g = [...(prev.grupos || [])];
                                  const ops = [...g[gi].opcoes];
                                  ops.splice(oi, 1);
                                  g[gi] = { ...g[gi], opcoes: ops };
                                  return { ...prev, grupos: g };
                                });
                              }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button size="sm" variant="ghost" className="text-xs h-6 gap-1 text-primary" onClick={() => {
                            const novaOp: OpcaoGrupo = { id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nome: "", preco: 0 };
                            setEditProduct((prev) => {
                              if (!prev) return prev;
                              const g = [...(prev.grupos || [])];
                              g[gi] = { ...g[gi], opcoes: [...g[gi].opcoes, novaOp] };
                              return { ...prev, grupos: g };
                            });
                          }}>
                            <Plus className="h-3 w-3" /> Adicionar opção
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>{/* end right column */}
                  </div>{/* end grid */}
                </div>{/* end scrollable */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setEditProduct(null)}>
                    Cancelar
                  </Button>
                  <Button className="rounded-xl font-black px-8" onClick={saveEdit}>
                    {isNewProduct ? "Criar produto" : "Salvar alterações"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Remove confirmation */}
            <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover produto</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remover <span className="font-bold text-foreground">{removeTarget?.nome}</span> do cardápio? Esta ação pode ser revertida reenviando o produto pelo painel admin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Category Dialog */}
            <Dialog open={catDialogOpen} onOpenChange={(open) => { if (!open) setCatDialogOpen(false); }}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>{catEditando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
                  <DialogDescription>{catEditando ? "Altere o nome da categoria." : "Informe o nome da nova categoria."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Nome da categoria</label>
                    <Input value={catNomeInput} onChange={(e) => setCatNomeInput(e.target.value)} placeholder="Ex.: Massas" maxLength={40} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Ícone</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["burger", "pizza", "coffee", "beer", "cake", "box", "flame", "star", "leaf", "tag", "beef", "popcorn", "cup-soda"].map((ic) => (
                        <button key={ic} type="button" onClick={() => setCatIconeInput(ic)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${catIconeInput === ic ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                          <CategoryIcon name={ic} className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
                    <Button className="flex-1" disabled={!catNomeInput.trim()} onClick={() => {
                      if (!catNomeInput.trim()) return;
                      if (catEditando) {
                        const next = categoriasCustom.map((c) => c.id === catEditando.id ? { ...c, nome: catNomeInput.trim(), icone: catIconeInput } : c);
                        saveCategoriasCustom(next, storeId);
                        setCategoriasCustom(next);
                        toast.success("Categoria atualizada");
                      } else {
                        const slug = catNomeInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                        const nova: CategoriaCustom = { id: `${slug}-${Date.now()}`, nome: catNomeInput.trim(), icone: catIconeInput, ordem: todasCategorias.length };
                        const next = [...categoriasCustom, nova];
                        saveCategoriasCustom(next, storeId);
                        setCategoriasCustom(next);
                        toast.success("Categoria criada");
                      }
                      setCatDialogOpen(false);
                    }}>
                      <Save className="mr-1 h-4 w-4" /> Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ═══ CAIXAS ═══ */}
        {tab === "caixas" && <CaixasSection storeId={storeId} formatPrice={formatPrice} />}

        {/* ═══ CONFIGURAÇÕES ═══ */}
        {tab === "configuracoes" && (
          <div className="space-y-5 fade-in">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              {configSection !== "inicio" && (
                <button onClick={() => setConfigSection("inicio")}
                  className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                  ← Voltar
                </button>
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
                {configSection === "inicio" && (
                  <p className="text-sm text-muted-foreground">Toque em um bloco para configurar</p>
                )}
              </div>
            </div>

            {/* Grade de cards */}
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
                    <div>
                      <p className="text-sm font-black text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* IDENTIDADE VISUAL */}
            {configSection === "identidade" && (
              <div className="space-y-4 max-w-lg">
                <div className="surface-card space-y-5 rounded-2xl p-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Nome do restaurante</label>
                    <Input
                      value={sistemaConfig.nomeRestaurante}
                      onChange={(e) => setSistemaConfig((c) => ({ ...c, nomeRestaurante: e.target.value }))}
                      placeholder="Nome do restaurante"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Logo do restaurante</label>
                    {(sistemaConfig.logoBase64 || sistemaConfig.logoUrl) && (
                      <div className="flex items-center gap-3">
                        <img src={sistemaConfig.logoBase64 || sistemaConfig.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl border border-border object-cover" />
                        {sistemaConfig.logoBase64 && (
                          <button type="button" onClick={() => setSistemaConfig((c) => ({ ...c, logoBase64: "" }))} className="text-xs text-destructive hover:underline">Remover foto</button>
                        )}
                      </div>
                    )}
                    <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                      <Upload className="h-5 w-5" />
                      Fazer upload da logo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                        const reader = new FileReader();
                        reader.onload = () => setSistemaConfig((c) => ({ ...c, logoBase64: reader.result as string }));
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }} />
                    </label>
                    <p className="text-[10px] font-bold text-muted-foreground pt-1">Ou cole uma URL</p>
                    <Input
                      value={sistemaConfig.logoUrl}
                      onChange={(e) => setSistemaConfig((c) => ({ ...c, logoUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  {/* Estilo da logo */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Formato da logo</label>
                    <div className="flex gap-2">
                      {([
                        { id: "quadrada" as const, label: "Quadrada", preview: "rounded-xl" },
                        { id: "circular" as const, label: "Circular", preview: "rounded-full" },
                      ]).map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSistemaConfig(c => ({ ...c, logoEstilo: opt.id }))}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors flex-1 ${
                            (sistemaConfig.logoEstilo || "quadrada") === opt.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <div className={`h-8 w-8 ${opt.preview} border border-border bg-card flex items-center justify-center shrink-0 overflow-hidden`}>
                            {(sistemaConfig.logoBase64 || sistemaConfig.logoUrl) ? (
                              <img src={sistemaConfig.logoBase64 || sistemaConfig.logoUrl} alt="" className={`h-full w-full ${opt.preview} object-cover`} />
                            ) : (
                              <span className="text-[8px] font-black text-muted-foreground">AB</span>
                            )}
                          </div>
                          <span className="text-sm font-bold">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Cor primária</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={sistemaConfig.corPrimaria || "#f97316"}
                        onChange={(e) => setSistemaConfig((c) => ({ ...c, corPrimaria: e.target.value }))}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                      />
                      <span className="text-sm text-muted-foreground font-mono">{sistemaConfig.corPrimaria || "#f97316"}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="surface-card space-y-5 rounded-2xl p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">📱 WhatsApp</p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Telefone WhatsApp do restaurante</label>
                    <Input
                      value={sistemaConfig.telefoneRestaurante || ""}
                      onChange={(e) => setSistemaConfig((c) => ({ ...c, telefoneRestaurante: e.target.value.replace(/\D/g, "") }))}
                      placeholder="11999999999 (só números com DDD)"
                      inputMode="tel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Mensagem de boas-vindas WhatsApp</label>
                    <Textarea
                      value={sistemaConfig.mensagemBoasVindas ?? `Olá! Bem-vindo ao ${sistemaConfig.nomeRestaurante}! 😊 Clique para fazer seu pedido:`}
                      onChange={(e) => setSistemaConfig((c) => ({ ...c, mensagemBoasVindas: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                {/* QR Codes Instagram / Wi-Fi */}
                <div className="surface-card space-y-5 rounded-2xl p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">📲 QR Codes</p>
                  {/* Instagram */}
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Instagram</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">URL do Instagram</label>
                      <Input
                        value={sistemaConfig.instagramUrl || ""}
                        onChange={(e) => setSistemaConfig((c) => ({ ...c, instagramUrl: e.target.value }))}
                        placeholder="https://instagram.com/seurestaurante"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Imagem de fundo</label>
                      <div className="flex items-center gap-3">
                        {sistemaConfig.instagramBg && (
                          <img src={sistemaConfig.instagramBg} alt="bg instagram" className="h-12 w-20 rounded-lg border border-border object-cover" />
                        )}
                        <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40">
                          {sistemaConfig.instagramBg ? "Trocar" : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setSistemaConfig((c) => ({ ...c, instagramBg: reader.result as string }));
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {sistemaConfig.instagramBg && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => setSistemaConfig((c) => ({ ...c, instagramBg: "" }))}>
                            <Trash2 className="mr-1 h-3 w-3" /> Remover
                          </Button>
                        )}
                      </div>
                    </div>
                    {sistemaConfig.instagramUrl && (
                      <div className="text-center space-y-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sistemaConfig.instagramUrl)}`}
                          alt="QR Instagram"
                          className="h-16 w-16 rounded-lg border border-border"
                        />
                      </div>
                    )}
                  </div>
                  {/* Wi-Fi */}
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Wi-Fi</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Senha do Wi-Fi</label>
                      <Input
                        value={sistemaConfig.senhaWifi || ""}
                        onChange={(e) => setSistemaConfig((c) => ({ ...c, senhaWifi: e.target.value }))}
                        placeholder="Senha da rede Wi-Fi"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Imagem de fundo</label>
                      <div className="flex items-center gap-3">
                        {sistemaConfig.wifiBg && (
                          <img src={sistemaConfig.wifiBg} alt="bg wifi" className="h-12 w-20 rounded-lg border border-border object-cover" />
                        )}
                        <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40">
                          {sistemaConfig.wifiBg ? "Trocar" : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setSistemaConfig((c) => ({ ...c, wifiBg: reader.result as string }));
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {sistemaConfig.wifiBg && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => setSistemaConfig((c) => ({ ...c, wifiBg: "" }))}>
                            <Trash2 className="mr-1 h-3 w-3" /> Remover
                          </Button>
                        )}
                      </div>
                    </div>
                    {sistemaConfig.senhaWifi && (
                      <div className="text-center space-y-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`WIFI:T:WPA;S:${sistemaConfig.nomeRestaurante};P:${sistemaConfig.senhaWifi};;`)}`}
                          alt="QR Wi-Fi"
                          className="h-16 w-16 rounded-lg border border-border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Banners */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">🖼️ Banners</p>
                  {(sistemaConfig.banners ?? []).map((banner, idx) => (
                    <div key={banner.id} className="surface-card rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-muted-foreground">Banner {idx + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).filter((b) => b.id !== banner.id) }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={banner.titulo}
                        onChange={(e) => setSistemaConfig((c) => ({
                          ...c,
                          banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, titulo: e.target.value } : b),
                        }))}
                        placeholder="Título"
                      />
                      <Input
                        value={banner.subtitulo}
                        onChange={(e) => setSistemaConfig((c) => ({
                          ...c,
                          banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, subtitulo: e.target.value } : b),
                        }))}
                        placeholder="Subtítulo"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={banner.preco}
                          onChange={(e) => setSistemaConfig((c) => ({
                            ...c,
                            banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, preco: e.target.value } : b),
                          }))}
                          placeholder="Preço (opcional)"
                          className="w-1/2"
                        />
                        <Input
                          value={banner.imagemUrl}
                          onChange={(e) => setSistemaConfig((c) => ({
                            ...c,
                            banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, imagemUrl: e.target.value } : b),
                          }))}
                          placeholder="URL da imagem"
                          className="flex-1"
                        />
                      </div>
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-3 py-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                        <Upload className="h-4 w-4" />
                        Upload imagem do banner
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                          const reader = new FileReader();
                          reader.onload = () => setSistemaConfig((c) => ({
                            ...c,
                            banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, imagemBase64: reader.result as string } : b),
                          }));
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }} />
                      </label>
                      {(banner.imagemBase64 || banner.imagemUrl) && (
                        <img src={banner.imagemBase64 || banner.imagemUrl} alt="Preview" className="h-20 w-full rounded-xl border border-border object-cover" />
                      )}
                    </div>
                  ))}
                  {(sistemaConfig.banners ?? []).length < 5 && (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => setSistemaConfig((c) => ({
                        ...c,
                        banners: [...(c.banners ?? []), { id: `banner-${Date.now()}`, titulo: "", subtitulo: "", preco: "", imagemUrl: "" }],
                      }))}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar banner
                    </Button>
                  )}
                </div>

                <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4">
                  <Save className="mr-1 h-4 w-4" /> Salvar
                </Button>
              </div>
            )}

            {/* DELIVERY */}
            {configSection === "delivery" && (
              <div className="space-y-4 max-w-lg">
                {/* Toggle delivery */}
                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{sistemaConfig.deliveryAtivo !== false ? "Delivery ativado" : "Delivery desativado"}</p>
                      <p className="text-xs text-muted-foreground">Controle se o link de delivery aceita pedidos</p>
                    </div>
                    <Switch
                      checked={sistemaConfig.deliveryAtivo !== false}
                      onCheckedChange={(v) => {
                        const next = { ...sistemaConfig, deliveryAtivo: v };
                        setSistemaConfig(next);
                        saveSistemaConfig(next, storeId);
                        toast.success(v ? "Delivery ativado" : "Delivery desativado");
                      }}
                    />
                  </div>
                  {sistemaConfig.deliveryAtivo === false && (
                    <p className="text-xs font-semibold text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                      ⚠ Clientes não conseguem fazer pedidos pelo link de delivery
                    </p>
                  )}
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
                      <div>
                        <p className="text-sm font-black text-foreground flex items-center gap-2">🔗 Link do Delivery</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Compartilhe este link no WhatsApp Business da sua empresa</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={deliveryLink}
                          readOnly
                          className="text-xs font-mono bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(deliveryLink);
                            toast.success("Link copiado!");
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => window.open(deliveryLink, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir link
                      </Button>
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
                      <div>
                        <p className="text-sm font-black text-foreground flex items-center gap-2">📖 Cardápio Digital</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Link público do cardápio — compartilhe via QR Code ou redes sociais</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={cardapioLink}
                          readOnly
                          className="text-xs font-mono bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(cardapioLink);
                            toast.success("Link copiado!");
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => window.open(cardapioLink, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir cardápio
                      </Button>
                    </div>
                  );
                })()}

                {/* Horário de funcionamento */}
                {(() => {
                  const DIAS: { key: keyof HorariosSemana; label: string }[] = [
                    { key: "seg", label: "Segunda" },
                    { key: "ter", label: "Terça" },
                    { key: "qua", label: "Quarta" },
                    { key: "qui", label: "Quinta" },
                    { key: "sex", label: "Sexta" },
                    { key: "sab", label: "Sábado" },
                    { key: "dom", label: "Domingo" },
                  ];
                  const horarios = horariosFuncionamento;
                  const updateDia = (dia: keyof HorariosSemana, patch: Partial<HorarioFuncionamento>) => {
                    const next = { ...horarios, [dia]: { ...horarios[dia], ...patch } };
                    saveHorariosFuncionamento(next, storeId);
                    setHorariosFuncionamento(next);
                  };
                  return (
                    <div className="surface-card rounded-2xl p-6 space-y-4">
                      <div>
                        <p className="text-sm font-black text-foreground flex items-center gap-2">🕐 Horário de funcionamento</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Define quando o delivery aceita pedidos</p>
                      </div>
                      <div className="space-y-2">
                        {DIAS.map(({ key, label }) => {
                          const dia = horarios[key];
                          return (
                            <div key={key} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${dia.ativo ? "border-border bg-card" : "border-border/50 bg-secondary/30 opacity-60"}`}>
                              <button
                                type="button"
                                onClick={() => { updateDia(key, { ativo: !dia.ativo }); }}
                                className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${dia.ativo ? "bg-primary" : "bg-border"}`}
                              >
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${dia.ativo ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                              <span className="text-sm font-bold text-foreground w-20 shrink-0">{label}</span>
                              {dia.ativo && (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    type="time"
                                    value={dia.abertura}
                                    onChange={(e) => updateDia(key, { abertura: e.target.value })}
                                    className="h-8 rounded-lg text-xs font-bold w-24"
                                  />
                                  <span className="text-xs text-muted-foreground">até</span>
                                  <Input
                                    type="time"
                                    value={dia.fechamento}
                                    onChange={(e) => updateDia(key, { fechamento: e.target.value })}
                                    className="h-8 rounded-lg text-xs font-bold w-24"
                                  />
                                </div>
                              )}
                              {!dia.ativo && <span className="text-xs text-muted-foreground italic">Fechado</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Mensagem quando fechado (opcional)</label>
                        <Input
                          value={sistemaConfig.mensagemFechado || ""}
                          onChange={(e) => setSistemaConfig(c => ({ ...c, mensagemFechado: e.target.value }))}
                          placeholder="Ex.: Voltamos amanhã!"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Modo de entrega */}
                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modo de entrega</p>
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => { setDeliveryModo("todos"); localStorage.setItem("obsidian-delivery-modo-v1", "todos"); }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${deliveryModo === "todos" ? "border-primary" : "border-muted-foreground/40"}`}>
                      {deliveryModo === "todos" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className={`text-sm font-semibold ${deliveryModo === "todos" ? "text-foreground" : "text-muted-foreground"}`}>Atender todos os bairros</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => { setDeliveryModo("cadastrados"); localStorage.setItem("obsidian-delivery-modo-v1", "cadastrados"); }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${deliveryModo === "cadastrados" ? "border-primary" : "border-muted-foreground/40"}`}>
                      {deliveryModo === "cadastrados" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className={`text-sm font-semibold ${deliveryModo === "cadastrados" ? "text-foreground" : "text-muted-foreground"}`}>Somente bairros cadastrados</span>
                  </label>
                </div>

                {/* Taxa padrão */}
                <div className="surface-card rounded-2xl p-6 space-y-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Taxa de entrega padrão (R$)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={sistemaConfig.taxaEntrega ?? ""}
                      onChange={(e) => setSistemaConfig((c) => ({ ...c, taxaEntrega: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-amber-400 font-semibold">⚠️ Taxa legada — usada quando nenhum bairro está cadastrado</p>
                  </div>
                </div>

                {/* Taxa por bairro */}
                <div className="surface-card space-y-4 rounded-2xl p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Taxas por bairro</p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Nome do bairro</label>
                      <Input value={novoBairroNome} onChange={(e) => setNovoBairroNome(e.target.value)} placeholder="Ex.: Centro" />
                    </div>
                    <div className="w-28 space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Taxa (R$)</label>
                      <Input type="number" min="0" step="0.5" value={novoBairroTaxa} onChange={(e) => setNovoBairroTaxa(e.target.value)} placeholder="5.00" />
                    </div>
                    <Button
                      className="rounded-xl font-bold gap-1 shrink-0"
                      disabled={!novoBairroNome.trim() || !novoBairroTaxa}
                      onClick={() => {
                        const taxa = parseFloat(novoBairroTaxa);
                        if (isNaN(taxa) || taxa < 0) { toast.error("Taxa inválida"); return; }
                        const novo: Bairro = { id: `bairro-${Date.now()}`, nome: novoBairroNome.trim(), taxa, ativo: true };
                        const next = [...bairros, novo];
                        saveBairros(next, storeId);
                        setBairros(next);
                        setNovoBairroNome("");
                        setNovoBairroTaxa("");
                        toast.success(`Bairro "${novo.nome}" adicionado`);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                  {bairros.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum bairro cadastrado. A taxa padrão será usada.</p>
                  ) : (
                    <div className="divide-y divide-border/50 rounded-xl border border-border overflow-hidden">
                      {bairros.map((b) => (
                        <div key={b.id} className="flex items-center justify-between px-4 py-3 bg-card">
                          <div className="flex items-center gap-3">
                            <Switch checked={b.ativo} onCheckedChange={(v) => {
                              const next = bairros.map((x) => x.id === b.id ? { ...x, ativo: v } : x);
                              saveBairros(next, storeId);
                              setBairros(next);
                            }} />
                            <span className={`text-sm font-semibold ${b.ativo ? "text-foreground" : "text-muted-foreground line-through"}`}>{b.nome}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground">R$ {b.taxa.toFixed(2).replace(".", ",")}</span>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => {
                              const next = bairros.filter((x) => x.id !== b.id);
                              saveBairros(next, storeId);
                              setBairros(next);
                              toast.success(`Bairro "${b.nome}" removido`);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4">
                  <Save className="mr-1 h-4 w-4" /> Salvar
                </Button>
              </div>
            )}

            {/* SALÃO (simplified — mesas moved to dedicated tab) */}
            {configSection === "salao" && (
              <div className="space-y-4 max-w-lg">
                <p className="text-sm text-muted-foreground">
                  A gestão de mesas e QR Codes agora fica na aba <strong>"Mesas"</strong> do menu lateral.
                </p>
                <Button variant="outline" className="rounded-xl font-bold gap-1.5" onClick={() => setTab("mesas")}>
                  <Grid3X3 className="h-4 w-4" /> Ir para Mesas
                </Button>
              </div>
            )}

            {/* OPERAÇÃO */}
            {configSection === "operacao" && (
              <div className="space-y-4 max-w-lg">
                {/* Modo de Operação */}
                <div className="surface-card rounded-2xl p-6 space-y-4">
                  <div>
                    <p className="text-sm font-black text-foreground">🏪 Modo de Operação</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Define como o sistema organiza os pedidos</p>
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => {
                      if (sistemaConfig.modoOperacao === "fast_food") {
                        setModoOperacaoPendente("restaurante");
                      }
                    }} className={`w-full text-left rounded-xl border p-4 transition-colors ${(sistemaConfig.modoOperacao || "restaurante") === "restaurante" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                      <p className="text-sm font-bold text-foreground">🍽️ Restaurante</p>
                      <p className="text-xs text-muted-foreground mt-1">Pedidos vinculados à mesa • Comanda imprime número da mesa • TV de retirada desativada por padrão</p>
                    </button>
                    <button type="button" onClick={() => {
                      if ((sistemaConfig.modoOperacao || "restaurante") === "restaurante") {
                        setModoOperacaoPendente("fast_food");
                      }
                    }} className={`w-full text-left rounded-xl border p-4 transition-colors ${sistemaConfig.modoOperacao === "fast_food" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                      <p className="text-sm font-bold text-foreground">🍔 Fast Food</p>
                      <p className="text-xs text-muted-foreground mt-1">Pedidos sem mesa • Código numérico ou nome do cliente na comanda • TV mostra balcão e totem quando fica pronto</p>
                    </button>
                  </div>

                  {/* Sub-opção Fast Food: identificação */}
                  {sistemaConfig.modoOperacao === "fast_food" && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Identificação do pedido</p>
                      <label className="flex items-center gap-3 cursor-pointer" onClick={() => {
                        const next = { ...sistemaConfig, identificacaoFastFood: "codigo" as const };
                        setSistemaConfig(next);
                        saveSistemaConfig(next, storeId);
                      }}>
                        <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </span>
                        <div>
                          <span className={`text-sm font-semibold ${(sistemaConfig.identificacaoFastFood || "codigo") === "codigo" ? "text-foreground" : "text-muted-foreground"}`}>Código numérico</span>
                          <p className="text-[10px] text-muted-foreground">Cada pedido recebe um número sequencial automático</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer" onClick={() => {
                        const next = { ...sistemaConfig, identificacaoFastFood: "nome_cliente" as const };
                        setSistemaConfig(next);
                        saveSistemaConfig(next, storeId);
                      }}>
                        <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${sistemaConfig.identificacaoFastFood === "nome_cliente" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {sistemaConfig.identificacaoFastFood === "nome_cliente" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </span>
                        <div>
                          <span className={`text-sm font-semibold ${sistemaConfig.identificacaoFastFood === "nome_cliente" ? "text-foreground" : "text-muted-foreground"}`}>Nome do cliente</span>
                          <p className="text-[10px] text-muted-foreground">Comanda exibe o nome informado pelo cliente</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Confirmation dialog for mode change */}
                <AlertDialog open={!!modoOperacaoPendente} onOpenChange={(open) => !open && setModoOperacaoPendente(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Trocar modo de operação?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        {modoOperacaoPendente === "fast_food" ? (
                          <>
                            <span className="block">Você está trocando para <strong>Fast Food</strong>. O que vai mudar:</span>
                            <span className="block">• Pedidos não serão mais vinculados a mesas</span>
                            <span className="block">• Cada pedido receberá um código ou nome do cliente</span>
                            <span className="block">• A TV de retirada será ativada por padrão</span>
                          </>
                        ) : (
                          <>
                            <span className="block">Você está trocando para <strong>Restaurante</strong>. O que vai mudar:</span>
                            <span className="block">• Pedidos voltarão a ser vinculados a mesas</span>
                            <span className="block">• Comanda imprimirá o número da mesa</span>
                            <span className="block">• A TV de retirada será desativada por padrão</span>
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        if (modoOperacaoPendente) {
                          const next = {
                            ...sistemaConfig,
                            modoOperacao: modoOperacaoPendente,
                          };
                          setSistemaConfig(next);
                          saveSistemaConfig(next, storeId);
                          saveSistemaConfigAsync(next, storeId);
                          toast.success(modoOperacaoPendente === "fast_food" ? "Modo Fast Food ativado" : "Modo Restaurante ativado");
                          setModoOperacaoPendente(null);
                        }
                      }}>
                        Confirmar troca
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* CPF na nota */}
                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-foreground">📄 Solicitar CPF na nota</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quando ativado, o sistema pergunta se o cliente deseja informar CPF. Necessário para emissão de nota fiscal.</p>
                    </div>
                    <Switch
                      checked={sistemaConfig.cpfNotaAtivo ?? false}
                      onCheckedChange={(v) => setSistemaConfig((prev) => ({ ...prev, cpfNotaAtivo: v }))}
                    />
                  </div>
                </div>


                      <p className="text-xs text-muted-foreground mt-0.5">Cobrado por pessoa ao fechar a conta</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSistemaConfig(c => ({ ...c, couvertAtivo: !c.couvertAtivo }))}
                      className={`relative h-6 w-11 rounded-full transition-colors ${sistemaConfig.couvertAtivo ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sistemaConfig.couvertAtivo ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {sistemaConfig.couvertAtivo && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Valor por pessoa (R$)</label>
                        <Input
                          value={sistemaConfig.couvertValor ? sistemaConfig.couvertValor.toFixed(2).replace(".", ",") : ""}
                          onChange={e => {
                            const val = parseFloat(e.target.value.replace(",", ".")) || 0;
                            setSistemaConfig(c => ({ ...c, couvertValor: Number.isFinite(val) ? val : 0 }));
                          }}
                          placeholder="Ex.: 5,00"
                          inputMode="decimal"
                          className="h-10 rounded-xl text-sm max-w-[160px]"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-foreground">Obrigatório</p>
                          <p className="text-xs text-muted-foreground">Se desligado, operador pode dispensar</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSistemaConfig(c => ({ ...c, couvertObrigatorio: !c.couvertObrigatorio }))}
                          className={`relative h-6 w-11 rounded-full transition-colors ${sistemaConfig.couvertObrigatorio ? "bg-primary" : "bg-border"}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sistemaConfig.couvertObrigatorio ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Impressão por setor */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-foreground">Impressão por setor</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Separa cozinha e bar em comandas distintas</p>
                    </div>
                    <Switch
                      checked={sistemaConfig.impressaoPorSetor ?? false}
                      onCheckedChange={(v) => setSistemaConfig((prev) => ({ ...prev, impressaoPorSetor: v }))}
                    />
                  </div>
                  {sistemaConfig.impressaoPorSetor && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Nome da impressora — Cozinha</label>
                        <Input
                          value={sistemaConfig.nomeImpressoraCozinha ?? ""}
                          onChange={(e) => setSistemaConfig((prev) => ({ ...prev, nomeImpressoraCozinha: e.target.value }))}
                          placeholder="Ex: EPSON-COZINHA"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Nome da impressora — Bar</label>
                        <Input
                          value={sistemaConfig.nomeImpressoraBar ?? ""}
                          onChange={(e) => setSistemaConfig((prev) => ({ ...prev, nomeImpressoraBar: e.target.value }))}
                          placeholder="Ex: EPSON-BAR"
                          className="h-9 text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Na demonstração abre janelas separadas. Na produção com servidor local, o nome é usado para rotear para a impressora correta.</p>
                    </div>
                  )}
                </div>

                {/* Modo identificação delivery */}
                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modo de identificação</p>
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => {
                    const next = { ...sistemaConfig, modoIdentificacaoDelivery: "visitante" as const };
                    setSistemaConfig(next);
                    saveSistemaConfig(next, storeId);
                  }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${(sistemaConfig.modoIdentificacaoDelivery || "visitante") === "visitante" ? "border-primary" : "border-muted-foreground/40"}`}>
                      {(sistemaConfig.modoIdentificacaoDelivery || "visitante") === "visitante" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <span className={`text-sm font-semibold ${(sistemaConfig.modoIdentificacaoDelivery || "visitante") === "visitante" ? "text-foreground" : "text-muted-foreground"}`}>Modo visitante</span>
                      <p className="text-[10px] text-muted-foreground">Cliente preenche dados ao finalizar o pedido</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => {
                    const next = { ...sistemaConfig, modoIdentificacaoDelivery: "cadastro" as const };
                    setSistemaConfig(next);
                    saveSistemaConfig(next, storeId);
                  }}>
                    <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${sistemaConfig.modoIdentificacaoDelivery === "cadastro" ? "border-primary" : "border-muted-foreground/40"}`}>
                      {sistemaConfig.modoIdentificacaoDelivery === "cadastro" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div>
                      <span className={`text-sm font-semibold ${sistemaConfig.modoIdentificacaoDelivery === "cadastro" ? "text-foreground" : "text-muted-foreground"}`}>Modo cadastro</span>
                      <p className="text-[10px] text-muted-foreground">Cliente cria conta com telefone e senha</p>
                    </div>
                  </label>
                </div>

                <Button onClick={saveSistema} className="rounded-xl font-black w-full mt-4">
                  <Save className="mr-1 h-4 w-4" /> Salvar
                </Button>
              </div>
            )}

            {/* MÓDULOS */}
            {configSection === "modulos" && (
              <div className="space-y-4 max-w-lg">
                {TODOS_MODULOS.map(mod => {
                  const plano = (licencaConfig.plano || sistemaConfig.plano || "basico") as PlanoModulos;
                  const modulosLiberados = getModulosDoPlano(plano);
                  const liberado = !!(modulosLiberados as any)[mod.id];
                  const ativo = !!(sistemaConfig.modulos as any)?.[mod.id];
                  return (
                    <div key={mod.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{mod.icon}</span>
                          <div>
                            <p className="text-sm font-black text-foreground">{mod.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                          </div>
                        </div>
                        {liberado ? (
                          <Switch
                            checked={ativo}
                            onCheckedChange={(v) => {
                              const next = { ...sistemaConfig, modulos: { ...sistemaConfig.modulos, [mod.id]: v } };
                              setSistemaConfig(next);
                              saveSistemaConfig(next, storeId);
                              toast.success(v ? `${mod.label} ativado` : `${mod.label} desativado`);
                            }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">🔒 Bloqueado</span>
                        )}
                      </div>
                      {!liberado && (
                        <p className="text-[10px] text-muted-foreground mt-2">Disponível no plano superior</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* IMPRESSORAS */}
            {configSection === "impressoras" && (() => {
              const impressoras: import("@/lib/adminStorage").ImpressoraConfig[] = (sistemaConfig as any).impressoras ?? [];

              const resetForm = () => { setImpFormNome(""); setImpFormSetor("cozinha"); setImpFormTipo("rede"); setImpFormIp(""); setImpFormLargura("80mm"); setImpFormAtiva(true); setImpEditando(null); };
              const openNew = () => { resetForm(); setImpShowForm(true); };
              const openEdit = (imp: import("@/lib/adminStorage").ImpressoraConfig) => {
                setImpEditando(imp); setImpFormNome(imp.nome); setImpFormSetor(imp.setor); setImpFormTipo(imp.tipo); setImpFormIp(imp.ip); setImpFormLargura(imp.largura); setImpFormAtiva(imp.ativa); setImpShowForm(true);
              };
              const salvar = async () => {
                if (!impFormNome.trim()) { toast.error("Informe o nome da impressora"); return; }
                const nova: import("@/lib/adminStorage").ImpressoraConfig = {
                  id: impEditando?.id ?? crypto.randomUUID(),
                  nome: impFormNome.trim(), setor: impFormSetor, tipo: impFormTipo, ip: impFormIp.trim(), largura: impFormLargura, ativa: impFormAtiva,
                };
                const novaLista = impEditando ? impressoras.map(i => i.id === impEditando.id ? nova : i) : [...impressoras, nova];
                const updated = { ...sistemaConfig, impressoras: novaLista };
                setSistemaConfig(updated);
                await saveSistemaConfig(updated, storeId);
                toast.success(impEditando ? "Impressora atualizada" : "Impressora adicionada");
                setImpShowForm(false); resetForm();
              };
              const excluir = async (id: string) => {
                const novaLista = impressoras.filter(i => i.id !== id);
                const updated = { ...sistemaConfig, impressoras: novaLista };
                setSistemaConfig(updated);
                await saveSistemaConfig(updated, storeId);
                toast.success("Impressora removida");
              };
              const testarImpressao = (imp: import("@/lib/adminStorage").ImpressoraConfig) => {
                const agora = new Date();
                const dataStr = agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR");
                const w = window.open("", "_blank", "width=400,height=600");
                if (!w) return;
                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Teste</title><style>@page{margin:0;size:${imp.largura === "58mm" ? "58mm" : "80mm"} auto}*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:11px;width:${imp.largura === "58mm" ? "200px" : "280px"};padding:8px}h1{font-size:18px;font-weight:bold;text-align:center;margin-bottom:8px}.sep{text-align:center;margin:6px 0}.center{text-align:center}</style></head><body>`);
                w.document.write(`<h1>TESTE DE IMPRESSÃO</h1><div class="sep">--------------------------------</div>`);
                w.document.write(`<p class="center" style="font-weight:bold">${imp.nome}</p>`);
                w.document.write(`<p class="center">Setor: ${imp.setor}</p>`);
                w.document.write(`<p class="center">Tipo: ${imp.tipo}${imp.tipo === "rede" ? ` (${imp.ip || "sem IP"})` : ""}</p>`);
                w.document.write(`<p class="center">Largura: ${imp.largura}</p>`);
                w.document.write(`<div class="sep">--------------------------------</div>`);
                w.document.write(`<p class="center">${dataStr}</p>`);
                w.document.write(`<div class="sep">--------------------------------</div>`);
                w.document.write(`<p class="center" style="margin-top:8px">✅ Impressora funcionando!</p>`);
                w.document.write(`<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
                w.document.close();
              };

              const setorLabels: Record<string, string> = { caixa: "Caixa", cozinha: "Cozinha", bar: "Bar", delivery: "Delivery" };
              const tipoLabels: Record<string, string> = { rede: "Rede (IP)", usb: "USB", bluetooth: "Bluetooth" };

              return (
                <div className="space-y-4 max-w-lg">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Configure suas impressoras térmicas. A impressão por rede (IP) estará disponível em breve. Por enquanto, o sistema usa a impressão do navegador.
                    </p>
                  </div>

                  {!impShowForm && (
                    <Button onClick={openNew} className="w-full rounded-xl font-bold gap-2">
                      <Plus className="h-4 w-4" /> Adicionar impressora
                    </Button>
                  )}

                  {impShowForm && (
                    <div className="surface-card space-y-4 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-foreground">{impEditando ? "Editar impressora" : "Nova impressora"}</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Nome</label>
                          <Input value={impFormNome} onChange={e => setImpFormNome(e.target.value)} placeholder='Ex: Cozinha Principal' className="rounded-xl mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Setor</label>
                          <Select value={impFormSetor} onValueChange={v => setImpFormSetor(v as any)}>
                            <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="caixa">Caixa</SelectItem>
                              <SelectItem value="cozinha">Cozinha</SelectItem>
                              <SelectItem value="bar">Bar</SelectItem>
                              <SelectItem value="delivery">Delivery</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Tipo de conexão</label>
                          <Select value={impFormTipo} onValueChange={v => setImpFormTipo(v as any)}>
                            <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rede">Rede (IP)</SelectItem>
                              <SelectItem value="usb">USB</SelectItem>
                              <SelectItem value="bluetooth">Bluetooth</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {impFormTipo === "rede" && (
                          <div>
                            <label className="text-xs font-bold text-muted-foreground">Endereço IP</label>
                            <Input value={impFormIp} onChange={e => setImpFormIp(e.target.value)} placeholder="192.168.1.100" className="rounded-xl mt-1" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-bold text-muted-foreground">Largura do papel</label>
                          <Select value={impFormLargura} onValueChange={v => setImpFormLargura(v as any)}>
                            <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="58mm">58mm</SelectItem>
                              <SelectItem value="80mm">80mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-muted-foreground">Ativa</label>
                          <Switch checked={impFormAtiva} onCheckedChange={setImpFormAtiva} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={salvar} className="flex-1 rounded-xl font-bold gap-2"><Save className="h-4 w-4" /> Salvar</Button>
                        <Button variant="outline" onClick={() => { setImpShowForm(false); resetForm(); }} className="rounded-xl"><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}

                  {impressoras.length === 0 && !impShowForm && (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhuma impressora cadastrada</p>
                  )}

                  {impressoras.map(imp => (
                    <div key={imp.id} className="surface-card rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Printer className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-bold text-foreground">{imp.nome}</p>
                            <p className="text-xs text-muted-foreground">{setorLabels[imp.setor]} · {tipoLabels[imp.tipo]}{imp.tipo === "rede" && imp.ip ? ` · ${imp.ip}` : ""} · {imp.largura}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${imp.ativa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {imp.ativa ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => openEdit(imp)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 flex-1" onClick={() => testarImpressao(imp)}>
                          <Printer className="h-3.5 w-3.5" /> Imprimir teste
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-destructive hover:text-destructive" onClick={() => excluir(imp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold gap-2"
                    onClick={() => {
                      const data: Record<string, unknown> = {};
                      for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.startsWith("obsidian-") || key.startsWith("orderly-"))) {
                          try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { data[key] = localStorage.getItem(key); }
                        }
                      }
                      const blob = new Blob([JSON.stringify({ _backupDate: new Date().toISOString(), _version: 1, data }, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `backup-orderly-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Backup exportado com sucesso!");
                    }}
                  >
                    <Download className="h-4 w-4" /> Exportar backup
                  </Button>

                  <div className="space-y-2">
                    <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                      <Upload className="h-5 w-5" />
                      Importar backup (.json)
                      <input type="file" accept=".json" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const parsed = JSON.parse(reader.result as string);
                            const backupData = parsed.data || parsed;
                            if (typeof backupData !== "object") throw new Error("Formato inválido");
                            if (!window.confirm("Isso vai substituir todos os dados atuais. Confirmar?")) return;
                            Object.entries(backupData).forEach(([key, value]) => {
                              if (key.startsWith("obsidian-") || key.startsWith("orderly-")) {
                                localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
                              }
                            });
                            toast.success("Backup restaurado! Recarregando...");
                            setTimeout(() => window.location.reload(), 800);
                          } catch {
                            toast.error("Arquivo de backup inválido");
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }} />
                    </label>
                    <p className="text-[10px] text-muted-foreground text-center">Selecione um arquivo .json exportado anteriormente</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ MEU PLANO ═══ */}
        {tab === "licenca" && (() => {
          const planoAtual = (licencaConfig.plano || sistemaConfig.plano || "basico") as PlanoModulos;
          const modulosMaster = getModulosDoPlano(planoAtual);
          const currentConfig = getSistemaConfig();
          const modulosAtivos = currentConfig.modulos ?? {};

          const planoNomeMap: Record<string, string> = {
            basico: "BÁSICO", medio: "MÉDIO", pro: "PROFISSIONAL", premium: "PREMIUM",
          };

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
            if (modId === "delivery" || modId === "cozinha") return "Médio";
            if (modId === "motoboy") return "Pro";
            if (modId === "totem" || modId === "tvRetirada") return "Profissional";
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
            const updated = { ...currentConfig, modulos: { ...currentConfig.modulos, [moduleKey]: value } };
            saveSistemaConfig(updated, storeId);
            setSistemaConfig(updated);
            toast.success(`Módulo ${value ? "ativado" : "desativado"}`);
          };

          const planos = [
            {
              id: "basico", nome: "BÁSICO", preco: "R$ 149", cor: "border-border",
              modulos: ["Tablet Cliente", "Garçom", "Caixa", "Cozinha"],
            },
            {
              id: "medio", nome: "MÉDIO", preco: "R$ 249", cor: "border-amber-500/50",
              modulos: ["Tudo do Básico", "Delivery", "Motoboy"],
            },
            {
              id: "pro", nome: "PROFISSIONAL", preco: "R$ 349", cor: "border-blue-500/50",
              modulos: ["Tudo do Médio", "Totem", "TV Retirada"],
            },
          ];

          const planoOrder = ["basico", "medio", "pro", "premium"];
          const currentIdx = planoOrder.indexOf(planoAtual);

          return (
          <div className="space-y-6 fade-in max-w-3xl mx-auto">
            <div>
              <h2 className="text-2xl font-black text-foreground">Meu Plano</h2>
              <p className="text-sm text-muted-foreground">Veja seu plano atual, módulos e opções de upgrade</p>
            </div>

            {/* ── BLOCO 1: PLANO ATUAL ── */}
            <div className="rounded-2xl border border-blue-800 bg-blue-950 p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Seu plano atual</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-black text-foreground">{planoNomeMap[planoAtual] || "BÁSICO"}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ATIVO
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                {liberadosList.map((mod) => (
                  <div key={mod} className="flex items-center gap-2 text-sm text-blue-100">
                    <span className="text-emerald-400">✔</span>
                    <span className="font-medium">{mod}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BLOCO 2: MÓDULOS ATIVOS ── */}
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
                          {blocked && (
                            <p className="text-[10px] font-bold text-amber-400 mt-0.5">
                              Disponível a partir do plano {requiredPlan(mod.id)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isChecked}
                        disabled={blocked || isAlwaysOn}
                        onCheckedChange={(v) => mod.masterKey && handleModuleToggle(mod.masterKey, v)}
                        className={blocked ? "cursor-not-allowed" : isAlwaysOn ? "cursor-default" : ""}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── BLOCO 3: UPGRADE DE PLANO ── */}
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
                    <div
                      key={p.id}
                      className={`rounded-2xl border-2 p-5 space-y-4 transition-colors ${
                        isCurrent ? "border-emerald-500 bg-emerald-500/5" : p.cor + " bg-secondary/20"
                      }`}
                    >
                      <div>
                        {isCurrent && (
                          <span className="inline-block mb-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                            Seu plano atual
                          </span>
                        )}
                        <p className="text-lg font-black text-foreground">{p.nome}</p>
                        <p className="text-2xl font-black text-primary tabular-nums">{p.preco}<span className="text-sm font-bold text-muted-foreground">/mês</span></p>
                      </div>
                      <div className="space-y-1.5">
                        {p.modulos.map((m) => (
                          <div key={m} className="flex items-center gap-2 text-sm">
                            <span className="text-emerald-400 text-xs">✔</span>
                            <span className="text-muted-foreground">{m}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        disabled={isCurrent}
                        variant={isUpgrade ? "default" : "outline"}
                        className={`w-full rounded-xl font-bold text-sm ${
                          isCurrent
                            ? "opacity-50 cursor-not-allowed"
                            : isUpgrade
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : ""
                        }`}
                        onClick={() => {
                          if (isCurrent) return;
                          const tel = sistemaConfig.telefoneRestaurante || "5511999999999";
                          const msg = encodeURIComponent(`Olá! Gostaria de ${isUpgrade ? "fazer upgrade" : "alterar"} meu plano para ${p.nome} (atual: ${planoNomeMap[planoAtual]})`);
                          window.open(`https://wa.me/${tel.replace(/\D/g, "")}?text=${msg}`, "_blank");
                        }}
                      >
                        {isCurrent ? "Plano atual" : isUpgrade ? "Quero esse plano" : "Fazer downgrade"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Licença (mantida) */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Licença</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Nome do cliente (restaurante)</label>
                  <Input
                    value={licencaConfig.nomeCliente}
                    onChange={(e) => setLicencaConfig((c) => ({ ...c, nomeCliente: e.target.value }))}
                    placeholder="Nome do restaurante"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Data de vencimento</label>
                  <Input
                    type="date"
                    value={licencaConfig.dataVencimento}
                    onChange={(e) => setLicencaConfig((c) => ({ ...c, dataVencimento: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">Status da licença</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${licencaConfig.ativo ? "text-emerald-400" : "text-destructive"}`}>
                    {licencaConfig.ativo ? "Ativo" : "Bloqueado"}
                  </span>
                  <Switch checked={licencaConfig.ativo} onCheckedChange={(v) => setLicencaConfig((c) => ({ ...c, ativo: v }))} />
                </div>
              </div>
              <Button onClick={saveLicenca} className="w-full rounded-xl font-bold gap-1.5">
                <Save className="mr-1 h-4 w-4" /> Salvar licença
              </Button>
            </div>
          </div>
          );
        })()}

        {/* ═══ MESAS ═══ */}
        {tab === "mesas" && (
          storeId ? (
            <MesasManager storeId={storeId} storeName={sistemaConfig.nomeRestaurante || "Restaurante"} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
          )
        )}

        {/* ═══ DISPOSITIVOS ═══ */}
        {tab === "tablets" && (
          <div className="space-y-6 fade-in">
            {storeId ? (
              <>
                <DevicePinsManager storeId={storeId} />
                <div className="border-t border-border pt-6">
                  <DevicesManager storeId={storeId} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
            )}
          </div>
        )}

        {/* ═══ EQUIPE ═══ */}
        {tab === "equipe" && (
          <div className="space-y-6 fade-in">
            {storeId ? (
              <TeamManager storeId={storeId} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
            )}
          </div>
        )}
      </main>
      </div>
      <LicenseBanner context="admin" />
    </div>
  );
};

export default AdminPage;
