import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import StorePinsManager from "@/components/StorePinsManager";
import MesasManager from "@/components/MesasManager";
import TabletsManager from "@/components/TabletsManager";
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
import { produtos as baseProdutos, categorias, type GrupoPersonalizacao, type OpcaoGrupo } from "@/data/menuData";
import {
  getCardapioOverrides,
  saveCardapioOverrides,
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
  type ProdutoOverride,
  type MesasConfig,
  type SistemaConfig,
  type LicencaConfig,
  type BannerConfig,
  type CategoriaCustom,
  type HorariosSemana,
  type HorarioFuncionamento,
  type PlanoModulos,
} from "@/lib/adminStorage";
import { getBairros, saveBairros, type Bairro } from "@/lib/deliveryStorage";
import { toast } from "sonner";

type AdminTab = "dashboard" | "cardapio" | "mesas" | "tablets" | "equipe" | "configuracoes" | "licenca" | "pins";

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
  { id: "tablets" as const, label: "Tablets", icon: TabletSmartphone },
  { id: "pins" as const, label: "PINs", icon: KeyRound },
  { id: "equipe" as const, label: "Equipe", icon: Users },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
  { id: "licenca" as const, label: "Meu Plano", icon: Shield },
];

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const AdminPage = () => {
  const { logout } = useAuth();
  const { storeId, storeName: ctxStoreName } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [configSection, setConfigSection] = useState<"inicio" | "identidade" | "delivery" | "salao" | "operacao" | "modulos" | "sistema">("inicio");

  // --- Cardápio state ---
  const [overrides, setOverrides] = useState<Record<string, ProdutoOverride>>(getCardapioOverrides);
  const [editProduct, setEditProduct] = useState<ProdutoOverride | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", preco: "", categoria: "", imagem: "", imagemBase64: "", permiteLevar: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [removeTarget, setRemoveTarget] = useState<ProdutoOverride | null>(null);
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustom[]>(getCategoriasCustom);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditando, setCatEditando] = useState<CategoriaCustom | null>(null);
  const [catNomeInput, setCatNomeInput] = useState("");
  const [catIconeInput, setCatIconeInput] = useState("tag");

  const todasCategorias = useMemo(() => {
    const baseCats = categorias.map((c, i) => ({ ...c, ordem: i, _isDefault: true as const }));
    const customCats = categoriasCustom.map((c) => ({ ...c, _isDefault: false as const }));
    return [...baseCats, ...customCats];
  }, [categoriasCustom]);

  const allProducts: ProdutoOverride[] = useMemo(() => {
    // Base products with overrides
    const base = baseProdutos.map((p) => {
      const ov = overrides[p.id];
      if (ov) return { ...p, ...ov };
      return { ...p, ativo: true };
    });
    // Custom products (added via admin)
    const customIds = Object.keys(overrides).filter((id) => !baseProdutos.some((p) => p.id === id));
    const custom = customIds.map((id) => overrides[id]);
    return [...base, ...custom].filter((p) => !p.removido);
  }, [overrides]);

  const filteredProducts = useMemo(() => {
    if (catFilter === "todas") return allProducts;
    return allProducts.filter((p) => p.categoria === catFilter);
  }, [allProducts, catFilter]);

  const toggleAtivo = useCallback((id: string) => {
    setOverrides((prev) => {
      const product = baseProdutos.find((p) => p.id === id) || prev[id];
      if (!product) return prev;
      const existing = prev[id] || { ...product, ativo: true };
      const next = { ...prev, [id]: { ...existing, ativo: !existing.ativo } };
      saveCardapioOverrides(next);
      return next;
    });
  }, []);

  const toggleDelivery = useCallback((id: string) => {
    setOverrides((prev) => {
      const product = baseProdutos.find((p) => p.id === id) || prev[id];
      if (!product) return prev;
      const existing = prev[id] || { ...product, ativo: true };
      const current = existing.disponivelDelivery !== false;
      const next = { ...prev, [id]: { ...existing, disponivelDelivery: !current } };
      saveCardapioOverrides(next);
      return next;
    });
  }, []);

  const openEdit = useCallback((product: ProdutoOverride) => {
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
    });
  }, []);

  const openNewProduct = useCallback(() => {
    const newId = `produto-${Date.now()}`;
    const newProduct: ProdutoOverride = {
      id: newId,
      nome: "",
      descricao: "",
      preco: 0,
      categoria: todasCategorias[0]?.id ?? categorias[0]?.id ?? "lanches",
      imagem: "",
      ativo: true,
    };
    setEditProduct(newProduct);
    setIsNewProduct(true);
    setEditForm({ nome: "", descricao: "", preco: "", categoria: newProduct.categoria, imagem: "", imagemBase64: "", permiteLevar: true });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editProduct) return;
    const preco = parseFloat(editForm.preco);
    if (isNaN(preco) || preco < 0) {
      toast.error("Preço inválido");
      return;
    }
    if (!editForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setOverrides((prev) => {
      const base = baseProdutos.find((p) => p.id === editProduct.id) || editProduct;
      const existing = prev[editProduct.id] || { ...base, ativo: true };
      const updated: Record<string, ProdutoOverride> = {
        ...prev,
        [editProduct.id]: {
          ...existing,
          id: editProduct.id,
          nome: editForm.nome.trim(),
          descricao: editForm.descricao.trim(),
          preco,
          categoria: editForm.categoria,
          imagem: editForm.imagem.trim(),
          imagemBase64: editForm.imagemBase64 || undefined,
          ativo: existing.ativo ?? true,
          disponivelDelivery: editProduct.disponivelDelivery,
          grupos: editProduct.grupos,
          permiteLevar: editForm.permiteLevar,
          setor: editProduct.setor ?? "cozinha",
        },
      };
      saveCardapioOverrides(updated);
      return updated;
    });
    setEditProduct(null);
    toast.success(isNewProduct ? "Produto criado" : "Produto atualizado");
  }, [editProduct, editForm, isNewProduct]);

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

  const confirmRemove = useCallback(() => {
    if (!removeTarget) return;
    setOverrides((prev) => {
      const existing = prev[removeTarget.id] || { ...removeTarget };
      const next = { ...prev, [removeTarget.id]: { ...existing, removido: true } };
      saveCardapioOverrides(next);
      return next;
    });
    setRemoveTarget(null);
    toast.success("Produto removido do cardápio");
  }, [removeTarget]);

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
    saveMesasConfig(next);
    setMesasConfig(next);
    setMesasInput(String(val));
    toast.success(`Configurado para ${val} mesas. Aplica ao reabrir o caixa.`);
  }, [mesasInput]);

  // --- Configurações state ---
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);

  // --- Horários state ---
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<HorariosSemana>(getHorariosFuncionamento);

  // --- Bairros state ---
  const [bairros, setBairros] = useState<Bairro[]>(getBairros);
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
    getSistemaConfigAsync().then((c) => setSistemaConfig(c));
    getLicencaConfigAsync().then((l) => setLicencaConfig(l));
    getCategoriasCustomAsync().then((cats) => setCategoriasCustom(cats));
    syncPendingChanges();
  }, []);

  const saveSistema = useCallback(() => {
    saveSistemaConfig(sistemaConfig);
    saveSistemaConfigAsync(sistemaConfig);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig]);

  // --- Licença state ---
  const [licencaConfig, setLicencaConfig] = useState<LicencaConfig>(getLicencaConfig);

  const saveLicenca = useCallback(() => {
    saveLicencaConfig(licencaConfig);
    saveLicencaConfigAsync(licencaConfig);
    toast.success("Licença salva");
  }, [licencaConfig]);



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
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setTab(s.id); setConfigSection("inicio"); }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  active
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
                            saveCategoriasCustom(next);
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
                            saveCategoriasCustom(next);
                            setCategoriasCustom(next);
                          }}>
                            <span className="text-[10px]">▼</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/10" onClick={() => {
                            if (count > 0) { toast.error("Remova os produtos desta categoria primeiro"); return; }
                            const next = categoriasCustom.filter((cc) => cc.id !== c.id);
                            saveCategoriasCustom(next);
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
                          <td className="px-4 py-3 font-semibold text-foreground">{p.nome}</td>
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
                        saveCategoriasCustom(next);
                        setCategoriasCustom(next);
                        toast.success("Categoria atualizada");
                      } else {
                        const slug = catNomeInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                        const nova: CategoriaCustom = { id: `${slug}-${Date.now()}`, nome: catNomeInput.trim(), icone: catIconeInput, ordem: todasCategorias.length };
                        const next = [...categoriasCustom, nova];
                        saveCategoriasCustom(next);
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
                        saveSistemaConfig(next);
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
                    saveHorariosFuncionamento(next);
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
                        saveBairros(next);
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
                              saveBairros(next);
                              setBairros(next);
                            }} />
                            <span className={`text-sm font-semibold ${b.ativo ? "text-foreground" : "text-muted-foreground line-through"}`}>{b.nome}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground">R$ {b.taxa.toFixed(2).replace(".", ",")}</span>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => {
                              const next = bairros.filter((x) => x.id !== b.id);
                              saveBairros(next);
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
                {/* Toggle cozinha */}
                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{sistemaConfig.cozinhaAtiva !== false ? "Tela da cozinha ativa" : "Tela da cozinha desativada"}</p>
                      <p className="text-xs text-muted-foreground">Quando desativada, pedidos vão direto para "pronto"</p>
                    </div>
                    <Switch
                      checked={sistemaConfig.cozinhaAtiva !== false}
                      onCheckedChange={(v) => {
                        const next = { ...sistemaConfig, cozinhaAtiva: v };
                        setSistemaConfig(next);
                        saveSistemaConfig(next);
                        toast.success(v ? "Cozinha ativada" : "Cozinha desativada — pedidos vão direto para pronto");
                      }}
                    />
                  </div>
                </div>

                {/* TV de Retirada — Modo */}
                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <div>
                    <p className="text-sm font-black text-foreground">TV de Retirada — Modo de exibição</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Controla quais pedidos aparecem na TV</p>
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => {
                      const next = { ...sistemaConfig, modoTV: "padrao" as const };
                      setSistemaConfig(next);
                      saveSistemaConfig(next);
                      toast.success("TV em modo Padrão");
                    }} className={`w-full text-left rounded-xl border p-3 transition-colors ${(sistemaConfig.modoTV || "padrao") === "padrao" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                      <p className="text-sm font-bold text-foreground">Padrão</p>
                      <p className="text-xs text-muted-foreground">Exibe Balcão e Totem</p>
                    </button>
                    <button type="button" onClick={() => {
                      const next = { ...sistemaConfig, modoTV: "completo" as const };
                      setSistemaConfig(next);
                      saveSistemaConfig(next);
                      toast.success("TV em modo Completo");
                    }} className={`w-full text-left rounded-xl border p-3 transition-colors ${sistemaConfig.modoTV === "completo" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                      <p className="text-sm font-bold text-foreground">Completo</p>
                      <p className="text-xs text-muted-foreground">Exibe também Mesas (para eventos)</p>
                    </button>
                  </div>
                </div>

                <div className="surface-card rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-foreground">Couvert / Taxa de serviço</p>
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
                    saveSistemaConfig(next);
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
                    saveSistemaConfig(next);
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
                              saveSistemaConfig(next);
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
            saveSistemaConfig(updated);
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

        {/* ═══ TABLETS ═══ */}
        {tab === "tablets" && (
          <div className="space-y-6 fade-in">
            {storeId ? (
              <TabletsManager storeId={storeId} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
            )}
          </div>
        )}

        {/* ═══ PINS ═══ */}
        {tab === "pins" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-xl font-black text-foreground">Gerenciamento de PINs</h2>
              <p className="text-sm text-muted-foreground mt-1">Crie e gerencie PINs de acesso para cada módulo operacional.</p>
            </div>
            {storeId ? (
              <StorePinsManager stores={[{ id: storeId, name: ctxStoreName || "Minha Loja", slug: "" }]} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
            )}
          </div>
        )}

        {/* ═══ EQUIPE ═══ */}
        {tab === "equipe" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-2xl font-black text-foreground">Equipe</h2>
              <p className="text-sm text-muted-foreground">Gerencie os gerentes do restaurante</p>
            </div>

            <div className="surface-card max-w-lg rounded-2xl p-6">
              <p className="text-sm text-muted-foreground">A equipe operacional agora é gerenciada via PINs na aba "PINs".</p>
              <Button variant="outline" className="mt-4" onClick={() => setTab("pins")}>
                <KeyRound className="h-4 w-4 mr-2" /> Ir para PINs
              </Button>
            </div>

          </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default AdminPage;
