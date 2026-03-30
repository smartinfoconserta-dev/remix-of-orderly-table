import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Save, Trash2, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import CategoryIcon from "@/components/CategoryIcon";
import { type GrupoPersonalizacao, type OpcaoGrupo, type Produto } from "@/data/menuData";
import {
  fetchAllProducts, upsertProduct, softDeleteProduct, toggleProductActive,
  toggleProductDelivery, reloadProducts, getCachedCategorias,
} from "@/hooks/useProducts";
import {
  getCategoriasCustom, saveCategoriasCustom,
  getCategoriasCustomAsync, type CategoriaCustom,
} from "@/lib/adminStorage";
import { formatPrice } from "@/components/caixa/caixaHelpers";
import { toast } from "sonner";

type AdminProduct = Produto & { ativo: boolean; removido: boolean; disponivelDelivery: boolean; imagemBase64?: string; controleEstoque?: boolean; quantidadeEstoque?: number; estoqueMinimo?: number };

interface Props {
  storeId: string | null;
}

const AdminCardapio = ({ storeId }: Props) => {
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

  const loadProducts = useCallback(async () => {
    if (!storeId) return;
    const prods = await fetchAllProducts(storeId);
    setAllProducts(prods as AdminProduct[]);
  }, [storeId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (storeId) getCategoriasCustomAsync(storeId).then(setCategoriasCustom); }, [storeId]);

  const dbCategorias = getCachedCategorias();
  const todasCategorias = useMemo(() => {
    const dbCats = dbCategorias.map((c, i) => ({ ...c, ordem: i, _isDefault: false as const }));
    const customCats = categoriasCustom.filter((c) => !dbCategorias.some((dc) => dc.id === c.id)).map((c) => ({ ...c, _isDefault: false as const }));
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
      nome: product.nome, descricao: product.descricao, preco: String(product.preco),
      categoria: product.categoria, imagem: product.imagem, imagemBase64: product.imagemBase64 || "",
      permiteLevar: product.permiteLevar !== false,
      controleEstoque: product.controleEstoque ?? false,
      quantidadeEstoque: product.quantidadeEstoque ?? 0,
      estoqueMinimo: product.estoqueMinimo ?? 0,
    });
  }, []);

  const openNewProduct = useCallback(() => {
    const newProduct: AdminProduct = {
      id: crypto.randomUUID(), nome: "", descricao: "", preco: 0,
      categoria: todasCategorias[0]?.id ?? "lanches", imagem: "",
      ativo: true, removido: false, disponivelDelivery: true,
    };
    setEditProduct(newProduct);
    setIsNewProduct(true);
    setEditForm({ nome: "", descricao: "", preco: "", categoria: newProduct.categoria, imagem: "", imagemBase64: "", permiteLevar: true, controleEstoque: false, quantidadeEstoque: 0, estoqueMinimo: 0 });
  }, [todasCategorias]);

  const saveEdit = useCallback(async () => {
    if (!editProduct || !storeId) return;
    const preco = parseFloat(editForm.preco);
    if (isNaN(preco) || preco < 0) { toast.error("Preço inválido"); return; }
    if (!editForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      const productToSave: AdminProduct = {
        ...editProduct, nome: editForm.nome.trim(), descricao: editForm.descricao.trim(),
        preco, categoria: editForm.categoria, imagem: editForm.imagem.trim(),
        imagemBase64: editForm.imagemBase64 || undefined, permiteLevar: editForm.permiteLevar,
        setor: editProduct.setor ?? "cozinha",
        controleEstoque: editForm.controleEstoque, quantidadeEstoque: editForm.quantidadeEstoque,
        estoqueMinimo: editForm.estoqueMinimo,
      };
      await upsertProduct(productToSave, storeId);
      await loadProducts();
      await reloadProducts(storeId);
      setEditProduct(null);
      toast.success(isNewProduct ? "Produto criado" : "Produto atualizado");
    } catch { toast.error("Erro ao salvar produto"); }
  }, [editProduct, editForm, isNewProduct, storeId, loadProducts]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setEditForm((f) => ({ ...f, imagemBase64: reader.result as string }));
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
    } catch { toast.error("Erro ao remover produto"); }
  }, [removeTarget, storeId, loadProducts]);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Cardápio</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{allProducts.length} produtos</span><span>·</span>
            <span>{allProducts.filter(p => p.ativo !== false).length} disponíveis</span><span>·</span>
            <span>{todasCategorias.length} categorias</span>
          </div>
        </div>
        <Button onClick={openNewProduct} className="rounded-xl font-bold gap-1.5"><Plus className="h-4 w-4" />Novo produto</Button>
      </div>

      {/* Category management */}
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
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setCatEditando(c); setCatNomeInput(c.nome); setCatIconeInput(c.icone || "tag"); setCatDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                      const idx = categoriasCustom.findIndex((cc) => cc.id === c.id);
                      if (idx <= 0) return;
                      const next = [...categoriasCustom]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      next.forEach((cc, i) => cc.ordem = i); saveCategoriasCustom(next, storeId); setCategoriasCustom(next);
                    }}><span className="text-[10px]">▲</span></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                      const idx = categoriasCustom.findIndex((cc) => cc.id === c.id);
                      if (idx < 0 || idx >= categoriasCustom.length - 1) return;
                      const next = [...categoriasCustom]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      next.forEach((cc, i) => cc.ordem = i); saveCategoriasCustom(next, storeId); setCategoriasCustom(next);
                    }}><span className="text-[10px]">▼</span></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/10" onClick={() => {
                      if (count > 0) { toast.error("Remova os produtos desta categoria primeiro"); return; }
                      const next = categoriasCustom.filter((cc) => cc.id !== c.id);
                      saveCategoriasCustom(next, storeId); setCategoriasCustom(next); toast.success("Categoria removida");
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCatFilter("todas")}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${catFilter === "todas" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
          Todas<span className="text-xs bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-black">{allProducts.length}</span>
        </button>
        {todasCategorias.map((c) => {
          const count = allProducts.filter((p) => p.categoria === c.id).length;
          return (
            <button key={c.id} type="button" onClick={() => setCatFilter(c.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${catFilter === c.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
              {c.nome}<span className="text-xs bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-black">{count}</span>
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
                        {p.controleEstoque && p.quantidadeEstoque !== undefined && p.quantidadeEstoque <= 0 && (<span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-destructive text-destructive-foreground">Esgotado</span>)}
                        {p.controleEstoque && p.quantidadeEstoque !== undefined && p.estoqueMinimo !== undefined && p.quantidadeEstoque > 0 && p.quantidadeEstoque <= p.estoqueMinimo && (<span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-destructive text-destructive-foreground">Estoque baixo</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cat?.nome ?? p.categoria}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{formatPrice(p.preco)}</td>
                    <td className="px-4 py-3 text-center"><Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p.id)} /></td>
                    <td className="px-4 py-3 text-center"><Switch checked={p.disponivelDelivery !== false} onCheckedChange={() => toggleDelivery(p.id)} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="rounded-xl font-bold gap-1.5 text-xs"><Pencil className="h-3 w-3" /> Editar</Button>
                        <Button variant="ghost" size="icon" onClick={() => setRemoveTarget(p)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
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
              {/* Left column */}
              <div className="col-span-1 space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Nome</label><Input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Descrição</label><Input value={editForm.descricao} onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Preço</label><Input type="number" step="0.01" value={editForm.preco} onChange={(e) => setEditForm((f) => ({ ...f, preco: e.target.value }))} /></div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Categoria</label>
                  <Select value={editForm.categoria} onValueChange={(v) => setEditForm((f) => ({ ...f, categoria: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {todasCategorias.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Foto do produto</label>
                  {(editForm.imagemBase64 || editForm.imagem) && (
                    <div className="flex items-center gap-3">
                      <img src={editForm.imagemBase64 || editForm.imagem} alt="Preview" className="h-16 w-16 rounded-xl border border-border object-cover" />
                      {editForm.imagemBase64 && (<button type="button" onClick={() => setEditForm((f) => ({ ...f, imagemBase64: "" }))} className="text-xs text-destructive hover:underline">Remover foto enviada</button>)}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <ImagePlus className="h-5 w-5" />Clique para selecionar foto
                  </button>
                  <p className="text-[10px] font-bold text-muted-foreground pt-1">Ou cole uma URL</p>
                  <Input value={editForm.imagem} onChange={(e) => setEditForm((f) => ({ ...f, imagem: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              {/* Right column */}
              <div className="col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground">Disponível no delivery</label>
                  <Switch checked={editProduct?.disponivelDelivery !== false} onCheckedChange={(v) => setEditProduct((prev) => prev ? { ...prev, disponivelDelivery: v } : prev)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-bold text-muted-foreground">Permite "para levar"</p><p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Desative para itens que não fazem sentido embalar.</p></div>
                  <Switch checked={editForm.permiteLevar} onCheckedChange={(v) => setEditForm(prev => ({ ...prev, permiteLevar: v }))} />
                </div>
                {/* Estoque */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs font-bold text-muted-foreground">Controlar estoque</p><p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Ative para monitorar a quantidade disponível deste produto.</p></div>
                    <Switch checked={editForm.controleEstoque} onCheckedChange={(v) => setEditForm(prev => ({ ...prev, controleEstoque: v }))} />
                  </div>
                  {editForm.controleEstoque && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground">Quantidade atual</label><Input type="number" min={0} value={editForm.quantidadeEstoque} onChange={(e) => setEditForm(prev => ({ ...prev, quantidadeEstoque: parseInt(e.target.value) || 0 }))} className="rounded-xl" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground">Estoque mínimo (alerta)</label><Input type="number" min={0} value={editForm.estoqueMinimo} onChange={(e) => setEditForm(prev => ({ ...prev, estoqueMinimo: parseInt(e.target.value) || 0 }))} className="rounded-xl" /></div>
                    </div>
                  )}
                </div>
                {/* Setor */}
                <div className="space-y-1.5 border-t border-border pt-4">
                  <label className="text-xs font-bold text-muted-foreground">Setor de preparo</label>
                  <div className="flex gap-2">
                    {([{ id: "cozinha", label: "🍳 Cozinha" }, { id: "bar", label: "🍹 Bar" }, { id: "ambos", label: "⚡ Ambos" }] as const).map((s) => {
                      const active = (editProduct?.setor ?? "cozinha") === s.id;
                      return (<button key={s.id} type="button" onClick={() => setEditProduct((prev) => prev ? { ...prev, setor: s.id } : prev)}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{s.label}</button>);
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Define em qual monitor este item aparece na cozinha</p>
                </div>
                {/* Personalização */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground">Personalização do produto</label>
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => {
                      const novoGrupo: GrupoPersonalizacao = { id: `grp-${Date.now()}`, nome: "", obrigatorio: true, tipo: "escolha", opcoes: [] };
                      setEditProduct((prev) => prev ? { ...prev, grupos: [...(prev.grupos || []), novoGrupo] } : prev);
                    }}><Plus className="h-3 w-3" /> Criar grupo</Button>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p><strong>Escolha obrigatória</strong> = cliente tem que escolher 1 opção</p>
                    <p><strong>Adicional</strong> = cliente pode adicionar itens com preço extra</p>
                    <p><strong>Retirar</strong> = cliente marca o que não quer</p>
                  </div>
                  {(editProduct?.grupos || []).map((grupo, gi) => (
                    <div key={grupo.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input value={grupo.nome} onChange={(e) => {
                          const val = e.target.value;
                          setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; g[gi] = { ...g[gi], nome: val }; return { ...prev, grupos: g }; });
                        }} placeholder={grupo.tipo === "escolha" ? "Ex: Tamanho, Sabor..." : grupo.tipo === "retirar" ? "Ex: Tirar ingredientes..." : "Ex: Adicionais, Extras..."} className="text-sm h-8 flex-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; g.splice(gi, 1); return { ...prev, grupos: g }; });
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {(["escolha", "adicional", "retirar"] as const).map((t) => {
                          const active = (grupo.tipo || "adicional") === t;
                          const labels = { escolha: "🔘 Escolha obrigatória", adicional: "➕ Adicional", retirar: "➖ Retirar" };
                          const colors = { escolha: active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground", adicional: active ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground", retirar: active ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground" };
                          return (<button key={t} type="button" onClick={() => {
                            setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; g[gi] = { ...g[gi], tipo: t, obrigatorio: t === "escolha" }; return { ...prev, grupos: g }; });
                          }} className={`rounded-lg px-2.5 py-1 font-bold transition-colors ${colors[t]}`}>{labels[t]}</button>);
                        })}
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {grupo.opcoes.map((op, oi) => (
                          <div key={op.id} className="flex items-center gap-2">
                            <Input value={op.nome} onChange={(e) => {
                              const val = e.target.value;
                              setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; const ops = [...g[gi].opcoes]; ops[oi] = { ...ops[oi], nome: val }; g[gi] = { ...g[gi], opcoes: ops }; return { ...prev, grupos: g }; });
                            }} placeholder="Nome da opção" className="text-sm h-7 flex-1" />
                            {(grupo.tipo || "adicional") !== "retirar" && (
                              <div className="flex items-center gap-1">
                                <Input type="number" step="0.01" value={op.preco || ""} onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; const ops = [...g[gi].opcoes]; ops[oi] = { ...ops[oi], preco: val }; g[gi] = { ...g[gi], opcoes: ops }; return { ...prev, grupos: g }; });
                                }} placeholder="R$" className="text-sm h-7 w-20" />
                                {op.preco === 0 && <span className="text-[10px] text-muted-foreground whitespace-nowrap">Grátis</span>}
                              </div>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                              setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; const ops = [...g[gi].opcoes]; ops.splice(oi, 1); g[gi] = { ...g[gi], opcoes: ops }; return { ...prev, grupos: g }; });
                            }}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" className="text-xs h-6 gap-1 text-primary" onClick={() => {
                          const novaOp: OpcaoGrupo = { id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nome: "", preco: 0 };
                          setEditProduct((prev) => { if (!prev) return prev; const g = [...(prev.grupos || [])]; g[gi] = { ...g[gi], opcoes: [...g[gi].opcoes, novaOp] }; return { ...prev, grupos: g }; });
                        }}><Plus className="h-3 w-3" /> Adicionar opção</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditProduct(null)}>Cancelar</Button>
            <Button className="rounded-xl font-black px-8" onClick={saveEdit}>{isNewProduct ? "Criar produto" : "Salvar alterações"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto</AlertDialogTitle>
            <AlertDialogDescription>Remover <span className="font-bold text-foreground">{removeTarget?.nome}</span> do cardápio?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Nome da categoria</label><Input value={catNomeInput} onChange={(e) => setCatNomeInput(e.target.value)} placeholder="Ex.: Massas" maxLength={40} /></div>
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
                  saveCategoriasCustom(next, storeId); setCategoriasCustom(next); toast.success("Categoria atualizada");
                } else {
                  const slug = catNomeInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  const nova: CategoriaCustom = { id: `${slug}-${Date.now()}`, nome: catNomeInput.trim(), icone: catIconeInput, ordem: todasCategorias.length };
                  const next = [...categoriasCustom, nova];
                  saveCategoriasCustom(next, storeId); setCategoriasCustom(next); toast.success("Categoria criada");
                }
                setCatDialogOpen(false);
              }}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCardapio;
