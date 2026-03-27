import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ShieldOff, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "garcom", label: "Garçom" },
  { value: "caixa", label: "Caixa" },
  { value: "cozinha", label: "Cozinha" },
  { value: "gerente", label: "Gerente" },
  { value: "motoboy", label: "Motoboy" },
  { value: "delivery", label: "Delivery" },
  { value: "totem", label: "Totem" },
  { value: "tv_retirada", label: "TV Retirada" },
  { value: "administrador", label: "Administrador" },
  { value: "cardapio", label: "Cardápio" },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
);

const ROLE_COLORS: Record<string, string> = {
  garcom: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  caixa: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cozinha: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  gerente: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  motoboy: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  delivery: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  administrador: "bg-primary/15 text-primary border-primary/30",
};

interface MemberRow {
  id: string;
  module: string;
  label: string | null;
  active: boolean | null;
  created_at: string | null;
}

interface Props {
  storeId: string;
}

const TeamManager = ({ storeId }: Props) => {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("garcom");
  const [formPin, setFormPin] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_pins")
      .select("id, module, label, active, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setMembers(data ?? []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async () => {
    if (!formName.trim()) {
      toast.error("Informe o nome do membro");
      return;
    }
    if (!/^\d{4,6}$/.test(formPin)) {
      toast.error("O PIN deve ter entre 4 e 6 dígitos");
      return;
    }
    setSaving(true);

    const { error } = await supabase.rpc("create_module_pin", {
      _store_id: storeId,
      _module: formRole,
      _pin: formPin,
      _label: formName.trim(),
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success(`${formName.trim()} adicionado como ${ROLE_LABELS[formRole]}`);
    setDialogOpen(false);
    setFormName("");
    setFormPin("");
    setFormRole("garcom");
    setSaving(false);
    fetchMembers();
  };

  const handleToggleActive = async (member: MemberRow) => {
    const newActive = !member.active;
    const { error } = await supabase
      .from("module_pins")
      .update({ active: newActive })
      .eq("id", member.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      newActive
        ? `${member.label || "Membro"} reativado`
        : `${member.label || "Membro"} desativado`
    );
    fetchMembers();
  };

  const activeMembers = members.filter((m) => m.active);
  const inactiveMembers = members.filter((m) => !m.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os membros da equipe do restaurante
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="rounded-xl font-bold gap-1.5"
        >
          <Plus className="h-4 w-4" /> Adicionar membro
        </Button>
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : activeMembers.length === 0 && inactiveMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">
            Nenhum membro cadastrado
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Adicione membros da equipe com nome, função e PIN para login rápido.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="mt-4 rounded-xl font-bold gap-1.5"
          >
            <Plus className="h-4 w-4" /> Adicionar primeiro membro
          </Button>
        </div>
      ) : (
        <>
          {/* Active members */}
          {activeMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Ativos ({activeMembers.length})
              </p>
              <div className="grid gap-2">
                {activeMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(m.label || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {m.label || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.created_at
                            ? `Desde ${new Date(m.created_at).toLocaleDateString("pt-BR")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${ROLE_COLORS[m.module] || "bg-muted/50 text-muted-foreground"}`}
                      >
                        {ROLE_LABELS[m.module] ?? m.module}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Ativo
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() => handleToggleActive(m)}
                      >
                        <ShieldOff className="h-3.5 w-3.5 mr-1" /> Desativar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive members */}
          {inactiveMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Inativos ({inactiveMembers.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
                  onClick={handleDeleteAllInactive}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover todos inativos
                </Button>
              </div>
              <div className="grid gap-2">
                {inactiveMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 px-4 py-3 opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted/30 flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {(m.label || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          {m.label || "Sem nome"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        {ROLE_LABELS[m.module] ?? m.module}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                        Inativo
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs"
                        onClick={() => handleToggleActive(m)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Reativar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              Novo membro da equipe
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Nome</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex.: João Silva"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Função
              </label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                PIN de acesso
              </label>
              <Input
                value={formPin}
                onChange={(e) =>
                  setFormPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                O PIN será usado para login rápido no sistema
              </p>
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="h-11 rounded-xl font-bold mt-2"
            >
              {saving ? "Salvando…" : "Adicionar membro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManager;
