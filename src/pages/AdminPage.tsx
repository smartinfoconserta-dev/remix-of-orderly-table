import { useCallback, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Download,
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
} from "lucide-react";
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
  type ProdutoOverride,
  type MesasConfig,
  type SistemaConfig,
  type LicencaConfig,
  type BannerConfig,
  type CategoriaCustom,
  type HorariosSemana,
  type HorarioFuncionamento,
} from "@/lib/adminStorage";
import { getBairros, saveBairros, type Bairro } from "@/lib/deliveryStorage";
import { toast } from "sonner";

type AdminTab = "dashboard" | "cardapio" | "equipe" | "configuracoes" | "licenca";

const sidebarSections = [
  { id: "dashboard" as const, label: "Início", icon: LayoutDashboard },
  { id: "cardapio" as const, label: "Cardápio", icon: ClipboardList },
  { id: "equipe" as const, label: "Equipe", icon: Users },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
  { id: "licenca" as const, label: "Meu Plano", icon: Shield },
];

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const AdminPage = () => {
  const { verifyManagerAccess, verifyEmployeeAccess, getProfilesByRole, getActiveProfilesByRole, createUser, removeUser } = useAuth();

  // Auth gate state
  const [authenticated, setAuthenticated] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [configSection, setConfigSection] = useState<"inicio" | "identidade" | "delivery" | "salao" | "operacao" | "sistema">("inicio");

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

  const saveSistema = useCallback(() => {
    saveSistemaConfig(sistemaConfig);
    applyCustomPrimaryColor();
    toast.success("Configurações salvas");
  }, [sistemaConfig]);

  // --- Licença state ---
  const [licencaConfig, setLicencaConfig] = useState<LicencaConfig>(getLicencaConfig);

  const saveLicenca = useCallback(() => {
    saveLicencaConfig(licencaConfig);
    toast.success("Licença salva");
  }, [licencaConfig]);

  // --- Usuários (gerentes) state ---
  const gerentes = useMemo(() => getProfilesByRole("gerente"), [getProfilesByRole]);
  const garcons = useMemo(() => getActiveProfilesByRole("garcom"), [getActiveProfilesByRole]);
  const caixas = useMemo(() => getActiveProfilesByRole("caixa"), [getActiveProfilesByRole]);
  const [newGerenteName, setNewGerenteName] = useState("");
  const [newGerentePin, setNewGerentePin] = useState("");
  const [userError, setUserError] = useState<string | null>(null);

  const handleCreateGerente = () => {
    setUserError(null);
    const result = createUser("gerente", newGerenteName, newGerentePin);
    if (!result.ok) {
      setUserError(result.error ?? "Erro ao criar gerente");
      return;
    }
    toast.success(`Gerente "${result.user?.nome}" criado com sucesso`);
    setNewGerenteName("");
    setNewGerentePin("");
  };

  const handleRemoveGerente = (id: string, nome: string) => {
    const result = removeUser(id);
    if (!result.ok) {
      toast.error(result.error ?? "Erro ao remover");
      return;
    }
    toast.success(`Gerente "${nome}" removido`);
  };

  // --- Auth gate ---
  const handleAuth = async () => {
    if (!authName.trim()) { setAuthError("Informe o nome do administrador"); return; }
    if (!/^\d{4,6}$/.test(authPin)) { setAuthError("PIN inválido (4-6 dígitos)"); return; }
    setAuthLoading(true);
    setAuthError(null);
    const result = await verifyEmployeeAccess(authName, authPin);
    if (!result.ok) { setAuthError(result.error ?? "Não autorizado"); setAuthLoading(false); return; }
    if (result.user?.role !== "gerente") {
      setAuthError("Acesso restrito ao gerente/administrador do sistema");
      setAuthLoading(false);
      return;
    }
    setAuthenticated(true);
    setAuthLoading(false);
  };

  if (!authenticated) {
    // Welcome wizard when no gerente exists
    if (gerentes.length === 0) {
      return (
        <div className="min-h-svh flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Settings className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-foreground">Configuração inicial do sistema</h2>
              <p className="text-sm text-muted-foreground">Siga os passos para configurar seu restaurante</p>
            </div>
            <div className="surface-card rounded-2xl p-6 space-y-4">
              {[
                { n: 1, t: "Criar primeiro gerente" },
                { n: 2, t: "Configurar nome e logo" },
                { n: 3, t: "Ajustar cardápio" },
                { n: 4, t: "Configurar mesas e QR Codes" },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-black">{s.n}</span>
                  <span className="text-sm text-foreground font-semibold">{s.t}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground text-center">Crie o primeiro gerente para começar:</p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Nome do gerente</label>
                <Input value={newGerenteName} onChange={(e) => setNewGerenteName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">PIN (4-6 dígitos)</label>
                <Input
                  value={newGerentePin}
                  onChange={(e) => setNewGerentePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4 a 6 dígitos"
                  inputMode="numeric"
                />
              </div>
              {userError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{userError}</p>}
              <Button
                onClick={() => {
                  handleCreateGerente();
                  if (newGerenteName.trim() && /^\d{4,6}$/.test(newGerentePin)) {
                    setAuthenticated(true);
                    setTab("equipe");
                  }
                }}
                disabled={!newGerenteName.trim() || !/^\d{4,6}$/.test(newGerentePin)}
                className="w-full h-12 rounded-xl text-base font-black"
              >
                Começar configuração
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-svh flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Painel Admin</h2>
            <p className="text-sm text-muted-foreground">Acesso restrito ao administrador do sistema.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Nome do administrador</label>
              <Input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Ex.: admin" maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">PIN</label>
              <Input
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
            </div>
            {authError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{authError}</p>}
          </div>
          <Button onClick={handleAuth} disabled={authLoading} className="w-full h-12 rounded-xl text-base font-black">
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  const nomeRestaurante = getSistemaConfig().nomeRestaurante || "Restaurante";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Title bar — Windows style */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
        <h1 className="text-sm font-bold text-white">Admin — {nomeRestaurante}</h1>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10 text-xs gap-1" onClick={() => { setAuthenticated(false); setAuthName(""); setAuthPin(""); setAuthError(null); }}>
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-border bg-card">
        <nav className="flex-1 py-2">
          {sidebarSections.map((s) => {
            const Icon = s.icon;
            const active = tab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setTab(s.id); setConfigSection("inicio"); }}
                className={`flex w-full items-center gap-3 px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background" key={tab}>
        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-2xl font-black text-foreground">
                Olá! Bem-vindo ao painel 👋
              </h2>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            {/* Cards de status */}
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <div className="surface-card rounded-2xl p-5 space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Produtos</p>
                <p className="text-3xl font-black text-foreground">{allProducts.length}</p>
                <p className="text-xs text-muted-foreground">no cardápio</p>
              </div>
              <div className="surface-card rounded-2xl p-5 space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mesas</p>
                <p className="text-3xl font-black text-foreground">{mesasConfig.totalMesas}</p>
                <p className="text-xs text-muted-foreground">configuradas</p>
              </div>
              <div className="surface-card rounded-2xl p-5 space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Delivery</p>
                <p className={`text-xl font-black ${sistemaConfig.deliveryAtivo !== false ? "text-emerald-400" : "text-destructive"}`}>
                  {sistemaConfig.deliveryAtivo !== false ? "✓ Ativo" : "✗ Inativo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sistemaConfig.deliveryAtivo !== false ? "Aceitando pedidos" : "Pausado"}
                </p>
              </div>
              <div className="surface-card rounded-2xl p-5 space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Equipe</p>
                <p className="text-3xl font-black text-foreground">{garcons.length + caixas.length}</p>
                <p className="text-xs text-muted-foreground">{garcons.length} garçon(s) · {caixas.length} caixa(s)</p>
              </div>
            </div>

            {/* Ações rápidas */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Ações rápidas</p>
              <div className="grid grid-cols-1 gap-2 max-w-sm">
                <button onClick={() => { setTab("cardapio"); openNewProduct(); }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <span className="text-2xl">➕</span>
                  <div>
                    <p className="text-sm font-black text-foreground">Adicionar produto</p>
                    <p className="text-xs text-muted-foreground">Cadastrar novo item no cardápio</p>
                  </div>
                </button>
                <button onClick={() => setTab("configuracoes")}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <p className="text-sm font-black text-foreground">Configurar sistema</p>
                    <p className="text-xs text-muted-foreground">Delivery, horários, aparência</p>
                  </div>
                </button>
                <button onClick={() => setTab("equipe")}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-sm font-black text-foreground">Ver equipe</p>
                    <p className="text-xs text-muted-foreground">Garçons, caixas e gerentes</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Alerta de licença */}
            {(() => {
              try {
                const raw = localStorage.getItem("orderly-licenca-v1");
                if (!raw) return null;
                const lic = JSON.parse(raw);
                if (!lic.dataVencimento) return null;
                const dias = Math.ceil((new Date(lic.dataVencimento).getTime() - Date.now()) / 86400000);
                if (dias > 14) return null;
                return (
                  <div className={`max-w-2xl rounded-2xl border px-5 py-4 flex items-center gap-3 ${dias <= 3 ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                    <span className="text-2xl">{dias <= 3 ? "🚨" : "⚠️"}</span>
                    <div>
                      <p className={`text-sm font-black ${dias <= 3 ? "text-destructive" : "text-amber-400"}`}>
                        {dias <= 0 ? "Licença vencida!" : `Licença vence em ${dias} dia(s)`}
                      </p>
                      <p className="text-xs text-muted-foreground">Entre em contato para renovar</p>
                    </div>
                  </div>
                );
              } catch { return null; }
            })()}
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
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-visible">
                <DialogHeader>
                  <DialogTitle>{isNewProduct ? "Novo produto" : "Editar produto"}</DialogTitle>
                  <DialogDescription>{isNewProduct ? "Preencha os campos para adicionar um produto." : "Altere os campos desejados e salve."}</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] pr-1 space-y-4 pt-2">
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

                  {/* Personalização do produto */}
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

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditProduct(null)}>
                      <X className="mr-1 h-4 w-4" /> Cancelar
                    </Button>
                    <Button className="flex-1" onClick={saveEdit}>
                      <Save className="mr-1 h-4 w-4" /> Salvar
                    </Button>
                  </div>
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
                  {configSection === "salao" && "🍽️ Salão & Mesas"}
                  {configSection === "operacao" && "⚙️ Operação"}
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
                  { id: "salao", icon: "🍽️", label: "Salão & Mesas", desc: "Número de mesas, QR Codes" },
                  { id: "operacao", icon: "⚙️", label: "Operação", desc: "Cozinha, couvert, modos" },
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
                  const horarios = getHorariosFuncionamento();
                  const setHorarios = (h: HorariosSemana) => saveHorariosFuncionamento(h);
                  const updateDia = (dia: keyof HorariosSemana, patch: Partial<HorarioFuncionamento>) => {
                    const next = { ...horarios, [dia]: { ...horarios[dia], ...patch } };
                    setHorarios(next);
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

            {/* SALÃO & MESAS */}
            {configSection === "salao" && (
              <div className="space-y-4 max-w-lg">
                <div className="surface-card inline-flex items-center gap-6 rounded-2xl p-6">
                  <span className="text-sm font-bold text-muted-foreground">Número de mesas</span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={mesasInput}
                    onChange={(e) => setMesasInput(e.target.value)}
                    className="w-24 text-center text-xl font-black"
                  />
                  <Button onClick={handleMesasApply} className="rounded-xl font-bold">
                    Aplicar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  As alterações serão aplicadas ao reabrir o caixa do dia. Mínimo 1, máximo 50.
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-foreground">QR Codes das mesas</h3>
                    <p className="text-xs text-muted-foreground">Cada QR Code direciona para a mesa correspondente.</p>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                    {Array.from({ length: parseInt(mesasInput) || mesasConfig.totalMesas }, (_, i) => {
                      const num = i + 1;
                      const url = `${window.location.origin}/mesa/${num}`;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
                      const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                      return (
                        <div key={num} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
                          <img src={qrUrl} alt={`Mesa ${String(num).padStart(2, "0")}`} className="w-full aspect-square rounded-lg" loading="lazy" />
                          <span className="text-xs font-black text-foreground">Mesa {String(num).padStart(2, "0")}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-[10px] h-7 rounded-lg font-bold gap-1"
                            onClick={() => {
                              const printWindow = window.open("", "_blank", "width=400,height=600");
                              if (!printWindow) return;
                              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Mesa ${String(num).padStart(2, "0")}</title><style>
                                body{margin:0;padding:40px 20px;font-family:Arial,sans-serif;text-align:center;background:#fff;color:#000}
                                img{width:260px;height:260px;margin:20px auto}
                                .nome{font-size:18px;font-weight:700;margin-bottom:10px}
                                .mesa{font-size:32px;font-weight:900;margin-top:16px}
                                .url{font-size:10px;color:#888;margin-top:8px;word-break:break-all}
                                @media print{body{padding:20mm 10mm}@page{margin:10mm}}
                              </style></head><body>
                                <div class="nome">${nomeRest}</div>
                                <img src="${qrUrl}" alt="QR Code Mesa ${String(num).padStart(2, "0")}" />
                                <div class="mesa">Mesa ${String(num).padStart(2, "0")}</div>
                                <div class="url">${url}</div>
                              </body></html>`;
                              printWindow.document.write(html);
                              printWindow.document.close();
                              setTimeout(() => printWindow.print(), 800);
                            }}
                          >
                            Imprimir QR
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
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

                {/* Couvert */}
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

        {/* ═══ LICENÇA ═══ */}
        {tab === "licenca" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-foreground">Licença</h2>
              <p className="text-sm text-muted-foreground">Gerencie a licença de uso do sistema</p>
            </div>
            <div className="surface-card max-w-lg space-y-5 rounded-2xl p-6">
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">Status da licença</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${licencaConfig.ativo ? "text-emerald-400" : "text-destructive"}`}>
                    {licencaConfig.ativo ? "Ativo" : "Bloqueado"}
                  </span>
                  <Switch checked={licencaConfig.ativo} onCheckedChange={(v) => setLicencaConfig((c) => ({ ...c, ativo: v }))} />
                </div>
              </div>
              <Button onClick={saveLicenca} className="w-full">
                <Save className="mr-1 h-4 w-4" /> Salvar licença
              </Button>
            </div>
          </div>
        )}

        {/* ═══ EQUIPE ═══ */}
        {tab === "equipe" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-2xl font-black text-foreground">Equipe</h2>
              <p className="text-sm text-muted-foreground">Gerencie garçons, caixas, motoboys e gerentes</p>
            </div>

            {/* Gerentes — Create form */}
            <div className="surface-card max-w-lg space-y-4 rounded-2xl p-6">
              <p className="text-sm font-black text-foreground">Novo gerente</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Nome</label>
                  <Input
                    value={newGerenteName}
                    onChange={(e) => setNewGerenteName(e.target.value)}
                    placeholder="Nome do gerente"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">PIN (4-6 dígitos)</label>
                  <Input
                    value={newGerentePin}
                    onChange={(e) => setNewGerentePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="1234"
                    inputMode="numeric"
                  />
                </div>
                {userError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{userError}</p>}
                <Button onClick={handleCreateGerente} disabled={!newGerenteName.trim() || newGerentePin.length < 4} className="w-full rounded-xl font-bold gap-1.5">
                  <Plus className="h-4 w-4" /> Criar gerente
                </Button>
              </div>
            </div>

            {/* Gerentes — List */}
            <div className="surface-card max-w-lg rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/50">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gerentes cadastrados ({gerentes.length})</p>
              </div>
              {gerentes.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">Nenhum gerente cadastrado.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {gerentes.map((g) => (
                    <div key={g.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{g.nome}</p>
                        <p className="text-xs text-muted-foreground">Criado em {new Date(g.criadoEm).toLocaleDateString("pt-BR")}</p>
                      </div>
                      {!g.id.startsWith("seed-") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveGerente(g.id, g.nome)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Garçons */}
            <div className="surface-card max-w-lg rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/50 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Garçons ({garcons.length})
                </p>
              </div>
              {garcons.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                  Nenhum garçom cadastrado. Acesse /gerente para cadastrar.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {garcons.map((g) => (
                    <div key={g.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{g.nome}</p>
                        <p className="text-xs text-muted-foreground">Garçom</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5">Ativo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Caixas */}
            <div className="surface-card max-w-lg rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/50">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Caixas ({caixas.length})
                </p>
              </div>
              {caixas.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                  Nenhum caixa cadastrado. Acesse /gerente para cadastrar.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {caixas.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">Caixa</p>
                      </div>
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-0.5">Ativo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default AdminPage;
