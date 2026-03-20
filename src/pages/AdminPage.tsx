import { useCallback, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
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
import { produtos as baseProdutos, categorias } from "@/data/menuData";
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
  type ProdutoOverride,
  type MesasConfig,
  type SistemaConfig,
  type LicencaConfig,
  type BannerConfig,
  type CategoriaCustom,
} from "@/lib/adminStorage";
import { toast } from "sonner";

type AdminTab = "cardapio" | "mesas" | "configuracoes" | "licenca" | "usuarios";

const sidebarSections = [
  { id: "cardapio" as const, label: "Cardápio", icon: ClipboardList },
  { id: "mesas" as const, label: "Mesas", icon: Grid3X3 },
  { id: "usuarios" as const, label: "Usuários", icon: Users },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
  { id: "licenca" as const, label: "Licença", icon: Shield },
];

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const AdminPage = () => {
  const { verifyManagerAccess, verifyEmployeeAccess, getProfilesByRole, createUser, removeUser } = useAuth();

  // Auth gate state
  const [authenticated, setAuthenticated] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>("cardapio");

  // --- Cardápio state ---
  const [overrides, setOverrides] = useState<Record<string, ProdutoOverride>>(getCardapioOverrides);
  const [editProduct, setEditProduct] = useState<ProdutoOverride | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", preco: "", categoria: "", imagem: "", imagemBase64: "", tipoOptionsStr: "", embalagemOptionsStr: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [removeTarget, setRemoveTarget] = useState<ProdutoOverride | null>(null);
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustom[]>(getCategoriasCustom);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditando, setCatEditando] = useState<CategoriaCustom | null>(null);
  const [catNomeInput, setCatNomeInput] = useState("");

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
    setEditProduct(product);
    setIsNewProduct(false);
    setEditForm({
      nome: product.nome,
      descricao: product.descricao,
      preco: String(product.preco),
      categoria: product.categoria,
      imagem: product.imagem,
      imagemBase64: product.imagemBase64 || "",
      tipoOptionsStr: product.tipoOptions?.join(", ") ?? "",
      embalagemOptionsStr: product.embalagemOptions?.join(", ") ?? "",
    });
  }, []);

  const openNewProduct = useCallback(() => {
    const newId = `produto-${Date.now()}`;
    const newProduct: ProdutoOverride = {
      id: newId,
      nome: "",
      descricao: "",
      preco: 0,
      categoria: categorias[0]?.id ?? "lanches",
      imagem: "",
      ativo: true,
    };
    setEditProduct(newProduct);
    setIsNewProduct(true);
    setEditForm({ nome: "", descricao: "", preco: "", categoria: newProduct.categoria, imagem: "", imagemBase64: "", tipoOptionsStr: "", embalagemOptionsStr: "" });
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
          tipoOptions: editForm.tipoOptionsStr.trim() ? editForm.tipoOptionsStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          embalagemOptions: editForm.embalagemOptionsStr.trim() ? editForm.embalagemOptionsStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
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
                    setTab("usuarios");
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <h1 className="text-lg font-black text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">Painel de controle</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setAuthenticated(false); setAuthName(""); setAuthPin(""); setAuthError(null); }} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {sidebarSections.map((s) => {
            const Icon = s.icon;
            const active = tab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8" key={tab}>
        {/* ═══ CARDÁPIO ═══ */}
        {tab === "cardapio" && (
          <div className="space-y-5 fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-foreground">Cardápio</h2>
                <p className="text-sm text-muted-foreground">Gerencie os produtos do cardápio</p>
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
                <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1 text-xs" onClick={() => { setCatEditando(null); setCatNomeInput(""); setCatDialogOpen(true); }}>
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
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setCatEditando(c); setCatNomeInput(c.nome); setCatDialogOpen(true); }}>
                            <Pencil className="h-3 w-3" />
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
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  catFilter === "todas"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas ({allProducts.length})
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
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                      catFilter === c.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.nome} ({count})
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
                              <img src={p.imagemBase64 || p.imagem} alt={p.nome} className="h-10 w-10 rounded-lg object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-[10px]">?</div>
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
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                <Pencil className="h-4 w-4" />
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
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{isNewProduct ? "Novo produto" : "Editar produto"}</DialogTitle>
                  <DialogDescription>{isNewProduct ? "Preencha os campos para adicionar um produto." : "Altere os campos desejados e salve."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
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
                      <SelectContent>
                        {todasCategorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Opções de tipo de preparo</label>
                    <Input
                      value={editForm.tipoOptionsStr}
                      onChange={(e) => setEditForm((f) => ({ ...f, tipoOptionsStr: e.target.value }))}
                      placeholder="Tradicional, Artesanal, No ponto da casa"
                    />
                    <p className="text-[10px] text-muted-foreground">Separadas por vírgula. Se vazio, etapa não aparece.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Opções de embalagem</label>
                    <Input
                      value={editForm.embalagemOptionsStr}
                      onChange={(e) => setEditForm((f) => ({ ...f, embalagemOptionsStr: e.target.value }))}
                      placeholder="Consumir na mesa, Para viagem"
                    />
                    <p className="text-[10px] text-muted-foreground">Separadas por vírgula. Se vazio, usa padrão para lanches/combos.</p>
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
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
                    <Button className="flex-1" disabled={!catNomeInput.trim()} onClick={() => {
                      if (!catNomeInput.trim()) return;
                      if (catEditando) {
                        const next = categoriasCustom.map((c) => c.id === catEditando.id ? { ...c, nome: catNomeInput.trim() } : c);
                        saveCategoriasCustom(next);
                        setCategoriasCustom(next);
                        toast.success("Categoria atualizada");
                      } else {
                        const slug = catNomeInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                        const nova: CategoriaCustom = { id: `${slug}-${Date.now()}`, nome: catNomeInput.trim(), icone: "tag", ordem: todasCategorias.length };
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

        {/* ═══ MESAS ═══ */}
        {tab === "mesas" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-foreground">Mesas</h2>
              <p className="text-sm text-muted-foreground">Configure a quantidade de mesas do restaurante (1-50)</p>
            </div>
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

            {/* ── QR Codes das mesas ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground">QR Codes das mesas</h3>
                  <p className="text-xs text-muted-foreground">Cada QR Code direciona para a mesa correspondente</p>
                </div>
                <Button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (!printWindow) return;
                    const total = parseInt(mesasInput) || mesasConfig.totalMesas;
                    const baseUrl = window.location.origin;
                    let html = `<html><head><title>QR Codes - Mesas</title><style>
                      body { margin: 0; padding: 20px; font-family: sans-serif; }
                      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                      .item { text-align: center; page-break-inside: avoid; }
                      .item img { width: 200px; height: 200px; }
                      .item p { margin: 8px 0 0; font-size: 18px; font-weight: bold; }
                      @media print { body { padding: 10mm; } }
                    </style></head><body><div class="grid">`;
                    for (let i = 1; i <= total; i++) {
                      const url = `${baseUrl}/mesa/${i}`;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
                      html += `<div class="item"><img src="${qrUrl}" alt="Mesa ${String(i).padStart(2, "0")}" /><p>Mesa ${String(i).padStart(2, "0")}</p></div>`;
                    }
                    html += `</div></body></html>`;
                    printWindow.document.write(html);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 1000);
                  }}
                  className="rounded-xl font-bold gap-1.5"
                >
                  Imprimir todos os QR Codes
                </Button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: parseInt(mesasInput) || mesasConfig.totalMesas }, (_, i) => {
                  const num = i + 1;
                  const url = `${window.location.origin}/mesa/${num}`;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
                  return (
                    <div key={num} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
                      <img src={qrUrl} alt={`Mesa ${String(num).padStart(2, "0")}`} className="w-full aspect-square rounded-lg" loading="lazy" />
                      <span className="text-xs font-black text-foreground">Mesa {String(num).padStart(2, "0")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CONFIGURAÇÕES ═══ */}
        {tab === "configuracoes" && (
          <div className="space-y-8 fade-in">
            {/* Identity */}
            <div>
              <h2 className="text-2xl font-black text-foreground">Configurações</h2>
              <p className="text-sm text-muted-foreground">Personalize o visual do restaurante</p>
            </div>
            <div className="surface-card max-w-lg space-y-5 rounded-2xl p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Nome do restaurante</label>
                <Input
                  value={sistemaConfig.nomeRestaurante}
                  onChange={(e) => setSistemaConfig((c) => ({ ...c, nomeRestaurante: e.target.value }))}
                  placeholder="Nome do restaurante"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">URL da logo</label>
                <Input
                  value={sistemaConfig.logoUrl}
                  onChange={(e) => setSistemaConfig((c) => ({ ...c, logoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              {sistemaConfig.logoUrl && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <img src={sistemaConfig.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl border border-border object-cover" />
                </div>
              )}
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
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Taxa de entrega (R$)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={sistemaConfig.taxaEntrega ?? ""}
                  onChange={(e) => setSistemaConfig((c) => ({ ...c, taxaEntrega: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Valor adicionado automaticamente aos pedidos delivery</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Telefone WhatsApp do restaurante</label>
                <Input
                  value={sistemaConfig.telefoneRestaurante || ""}
                  onChange={(e) => setSistemaConfig((c) => ({ ...c, telefoneRestaurante: e.target.value.replace(/\D/g, "") }))}
                  placeholder="11999999999 (só números com DDD)"
                  inputMode="tel"
                />
              </div>
              {/* Tempo estimado removido — agora é selecionado pelo caixa ao confirmar cada pedido */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Mensagem de boas-vindas WhatsApp</label>
                <Textarea
                  value={sistemaConfig.mensagemBoasVindas ?? `Olá! Bem-vindo ao ${sistemaConfig.nomeRestaurante}! 😊 Clique para fazer seu pedido:`}
                  onChange={(e) => setSistemaConfig((c) => ({ ...c, mensagemBoasVindas: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* Instagram & Wi-Fi */}
            <div>
              <h3 className="text-lg font-black text-foreground">QR Codes</h3>
              <p className="text-xs text-muted-foreground">Instagram e Wi-Fi exibidos na tela inicial do cliente</p>
            </div>
            <div className="surface-card max-w-lg space-y-5 rounded-2xl p-6">
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
                    placeholder="Ex.: MinhaSenha123"
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
            <div>
              <h3 className="text-lg font-black text-foreground">Banners do carrossel</h3>
              <p className="text-xs text-muted-foreground">Até 5 banners exibidos na tela inicial do cliente</p>
            </div>
            <div className="space-y-3 max-w-lg">
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
                  {banner.imagemUrl && (
                    <img src={banner.imagemUrl} alt="Preview" className="h-20 w-full rounded-xl border border-border object-cover" />
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

            <Button onClick={saveSistema} className="w-full max-w-lg">
              <Save className="mr-1 h-4 w-4" /> Salvar configurações
            </Button>
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

        {/* ═══ USUÁRIOS ═══ */}
        {tab === "usuarios" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-2xl font-black text-foreground">Gerentes</h2>
              <p className="text-sm text-muted-foreground">Crie e gerencie contas de gerentes do sistema</p>
            </div>

            {/* Create form */}
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

            {/* List */}
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
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
