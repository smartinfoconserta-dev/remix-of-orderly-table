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
import { Plus, ShieldOff, ShieldCheck, Trash2, Users, Search } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "garcom", label: "Garçom" },
  { value: "caixa", label: "Caixa" },
  { value: "cozinha", label: "Cozinha" },
  { value: "gerente", label: "Gerente" },
  { value: "motoboy", label: "Motoboy" },
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
};

interface MemberRow {
  id: string;
  user_id: string;
  role_in_store: string;
  created_at: string | null;
  user_email?: string;
  user_name?: string;
  active?: boolean;
}

interface Props {
  storeId: string;
}

const TeamManager = ({ storeId }: Props) => {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("garcom");
  const [formPin, setFormPin] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    // Fetch store_members for this store (excluding owner role which is the admin)
    const { data } = await supabase
      .from("store_members")
      .select("id, user_id, role_in_store, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (data) {
      // Also fetch module_pins for labels/active status
      const { data: pins } = await supabase
        .from("module_pins")
        .select("label, active, module, created_by")
        .eq("store_id", storeId);

      const enriched: MemberRow[] = data
        .filter((m) => m.role_in_store !== "owner")
        .map((m) => {
          // Try to find matching pin by matching user_id to created_by or by role
          const pin = pins?.find(
            (p) => p.created_by === m.user_id || (p.module === m.role_in_store && p.label)
          );
          return {
            ...m,
            user_name: pin?.label ?? undefined,
            active: pin?.active ?? true,
          };
        });
      setMembers(enriched);
    }
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
    const emailTrimmed = formEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      toast.error("Informe o email do membro");
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailTrimmed)) {
      toast.error("Email inválido. Use apenas letras sem acento (ex: garcom@teste.com)");
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (formPin && !/^\d{4,6}$/.test(formPin)) {
      toast.error("O PIN deve ter entre 4 e 6 dígitos");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          name: formName.trim(),
          role: formRole,
          storeId,
          pin: formPin || undefined,
        },
      });

      if (error) {
        toast.error(error.message || "Erro ao criar membro");
        setSaving(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setSaving(false);
        return;
      }

      toast.success(`${formName.trim()} adicionado como ${ROLE_LABELS[formRole]}`);
      setDialogOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormPin("");
      setFormRole("garcom");
      fetchMembers();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar membro");
    }
    setSaving(false);
  };

  const handleDelete = async (member: MemberRow) => {
    // Remove from store_members (we can't delete auth user from client)
    const { error } = await supabase
      .from("store_members")
      .delete()
      .eq("id", member.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${member.user_name || "Membro"} removido da equipe`);
    fetchMembers();
  };

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
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">
            Nenhum membro cadastrado
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Adicione membros da equipe com email, senha e função para acesso seguro ao sistema.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="mt-4 rounded-xl font-bold gap-1.5"
          >
            <Plus className="h-4 w-4" /> Adicionar primeiro membro
          </Button>
        </div>
      ) : (() => {
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const filtered = members.filter((m) => {
          if (filterRole !== "all" && m.role_in_store !== filterRole) return false;
          if (searchQuery.trim()) {
            const q = normalize(searchQuery);
            const name = normalize(m.user_name || m.role_in_store || "");
            if (!name.includes(q)) return false;
          }
          return true;
        });
        const roleCounts: Record<string, number> = { all: members.length };
        members.forEach((m) => {
          roleCounts[m.role_in_store] = (roleCounts[m.role_in_store] || 0) + 1;
        });

        return (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar membro..."
              className="pl-9"
            />
          </div>

          {/* Role filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterRole("all")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${
                filterRole === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
              <span className="rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-black min-w-[18px] text-center">
                {roleCounts.all}
              </span>
            </button>
            {ROLES.filter((r) => roleCounts[r.value]).map((r) => (
              <button
                key={r.value}
                onClick={() => setFilterRole(r.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${
                  filterRole === r.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
                <span className="rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-black min-w-[18px] text-center">
                  {roleCounts[r.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Count */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {filterRole === "all" ? "Membros" : ROLE_LABELS[filterRole]} ({filtered.length})
          </p>

          {/* List */}
          <div className="grid gap-2">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(m.user_name || m.role_in_store || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {m.user_name || m.role_in_store}
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
                    className={`text-xs border ${ROLE_COLORS[m.role_in_store] || "bg-muted/50 text-muted-foreground"}`}
                  >
                    {ROLE_LABELS[m.role_in_store] ?? m.role_in_store}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                    onClick={() => handleDelete(m)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}

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
              <label className="text-sm font-bold text-foreground">Email</label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="joao@restaurante.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Senha</label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
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
                PIN de acesso <span className="text-muted-foreground font-normal">(opcional)</span>
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
                O PIN é usado para autorização de ações internas (opcional)
              </p>
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="h-11 rounded-xl font-bold mt-2"
            >
              {saving ? "Criando conta…" : "Adicionar membro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManager;
