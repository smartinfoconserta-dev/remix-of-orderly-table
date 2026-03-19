import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Grid3X3,
  Settings,
  Pencil,
  Power,
  PowerOff,
  Plus,
  Minus,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import OperationalAccessCard from "@/components/OperationalAccessCard";
import { produtos as baseProdutos, categorias } from "@/data/menuData";
import {
  getCardapioOverrides,
  saveCardapioOverrides,
  getMesasConfig,
  saveMesasConfig,
  getSistemaConfig,
  saveSistemaConfig,
  type ProdutoOverride,
  type MesasConfig,
  type SistemaConfig,
} from "@/lib/adminStorage";
import { toast } from "sonner";

type AdminTab = "cardapio" | "mesas" | "sistema";

const sidebarSections = [
  { id: "cardapio" as const, label: "Cardápio", icon: ClipboardList },
  { id: "mesas" as const, label: "Mesas", icon: Grid3X3 },
  { id: "sistema" as const, label: "Sistema", icon: Settings },
];

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const AdminPage = () => {
  const { currentGerente } = useAuth();
  const [tab, setTab] = useState<AdminTab>("cardapio");

  // --- Cardápio state ---
  const [overrides, setOverrides] = useState<Record<string, ProdutoOverride>>(getCardapioOverrides);
  const [editProduct, setEditProduct] = useState<ProdutoOverride | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", preco: "", categoria: "", imagem: "" });

  const allProducts: ProdutoOverride[] = useMemo(() => {
    return baseProdutos.map((p) => {
      const ov = overrides[p.id];
      if (ov) return { ...p, ...ov };
      return { ...p, ativo: true };
    });
  }, [overrides]);

  const toggleAtivo = useCallback((id: string) => {
    setOverrides((prev) => {
      const product = baseProdutos.find((p) => p.id === id);
      if (!product) return prev;
      const existing = prev[id] || { ...product, ativo: true };
      const next = { ...prev, [id]: { ...existing, ativo: !existing.ativo } };
      saveCardapioOverrides(next);
      return next;
    });
  }, []);

  const openEdit = useCallback((product: ProdutoOverride) => {
    setEditProduct(product);
    setEditForm({
      nome: product.nome,
      descricao: product.descricao,
      preco: String(product.preco),
      categoria: product.categoria,
      imagem: product.imagem,
    });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editProduct) return;
    const preco = parseFloat(editForm.preco);
    if (isNaN(preco) || preco < 0) {
      toast.error("Preço inválido");
      return;
    }
    setOverrides((prev) => {
      const base = baseProdutos.find((p) => p.id === editProduct.id) || editProduct;
      const existing = prev[editProduct.id] || { ...base, ativo: true };
      const next = {
        ...prev,
        [editProduct.id]: {
          ...existing,
          nome: editForm.nome.trim() || existing.nome,
          descricao: editForm.descricao.trim(),
          preco,
          categoria: editForm.categoria,
          imagem: editForm.imagem.trim(),
        },
      };
      saveCardapioOverrides(next);
      return next;
    });
    setEditProduct(null);
    toast.success("Produto atualizado");
  }, [editProduct, editForm]);

  // --- Mesas state ---
  const [mesasConfig, setMesasConfig] = useState<MesasConfig>(getMesasConfig);

  const handleMesasChange = useCallback((delta: number) => {
    setMesasConfig((prev) => {
      const total = Math.max(1, Math.min(100, prev.totalMesas + delta));
      const next = { totalMesas: total };
      saveMesasConfig(next);
      return next;
    });
  }, []);

  // --- Sistema state ---
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);

  const saveSistema = useCallback(() => {
    saveSistemaConfig(sistemaConfig);
    toast.success("Configurações salvas");
  }, [sistemaConfig]);

  if (!currentGerente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <OperationalAccessCard role="gerente" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar-background">
        <div className="border-b border-border px-5 py-5">
          <h1 className="text-lg font-black text-foreground">Admin</h1>
          <p className="text-xs text-muted-foreground">Painel de controle</p>
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {tab === "cardapio" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-foreground">Cardápio</h2>
              <p className="text-sm text-muted-foreground">Gerencie os produtos do cardápio</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground">Produto</th>
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground">Categoria</th>
                    <th className="px-4 py-3 text-right font-bold text-muted-foreground">Preço</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground">Ativo</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((p) => {
                    const cat = categorias.find((c) => c.id === p.categoria);
                    return (
                      <tr key={p.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-semibold text-foreground">{p.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cat?.nome ?? p.categoria}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatPrice(p.preco)}</td>
                        <td className="px-4 py-3 text-center">
                          <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p.id)} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Edit modal */}
            <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar produto</DialogTitle>
                  <DialogDescription>Altere os campos desejados e salve.</DialogDescription>
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
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">URL da foto</label>
                    <Input value={editForm.imagem} onChange={(e) => setEditForm((f) => ({ ...f, imagem: e.target.value }))} />
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
          </div>
        )}

        {tab === "mesas" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-foreground">Mesas</h2>
              <p className="text-sm text-muted-foreground">Configure a quantidade de mesas do restaurante</p>
            </div>
            <div className="surface-card inline-flex items-center gap-6 rounded-2xl p-6">
              <span className="text-sm font-bold text-muted-foreground">Total de mesas</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => handleMesasChange(-1)} disabled={mesasConfig.totalMesas <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-3xl font-black text-foreground">{mesasConfig.totalMesas}</span>
                <Button variant="outline" size="icon" onClick={() => handleMesasChange(1)} disabled={mesasConfig.totalMesas >= 100}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              As alterações serão aplicadas ao reabrir o caixa do dia. Mínimo 1, máximo 100.
            </p>
          </div>
        )}

        {tab === "sistema" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-foreground">Sistema</h2>
              <p className="text-sm text-muted-foreground">Configurações gerais do restaurante</p>
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
              <Button onClick={saveSistema} className="w-full">
                <Save className="mr-1 h-4 w-4" /> Salvar configurações
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
