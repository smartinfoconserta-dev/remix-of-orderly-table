import { useMemo, useState } from "react";
import { BriefcaseBusiness, HandPlatter, KeyRound, Wallet } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";
import { toast } from "sonner";

interface OperationalAccessCardProps {
  role: UserRole;
}

const accessSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(40, "Máximo de 40 caracteres"),
  pin: z.string().regex(/^\d{4,6}$/, "Use um PIN de 4 a 6 dígitos"),
});

const roleCopy = {
  garcom: {
    title: "Acesso do Garçom",
    description: "Identifique este aparelho para registrar quem lançou cada pedido.",
    submit: "Entrar como garçom",
    icon: HandPlatter,
  },
  caixa: {
    title: "Acesso do Caixa",
    description: "Identifique o operador para registrar fechamentos, ajustes e movimentações.",
    submit: "Entrar no caixa",
    icon: Wallet,
  },
  gerente: {
    title: "Validação do Gerente",
    description: "Use este acesso para autorizar relatórios completos e ações críticas.",
    submit: "Validar gerente",
    icon: BriefcaseBusiness,
  },
} satisfies Record<UserRole, { title: string; description: string; submit: string; icon: typeof HandPlatter }>;

const OperationalAccessCard = ({ role }: OperationalAccessCardProps) => {
  const { getProfilesByRole, loginWithPin, resetPin } = useAuth();
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetNome, setResetNome] = useState("");

  const knownUsers = useMemo(() => getProfilesByRole(role), [getProfilesByRole, role]);
  const copy = roleCopy[role];
  const Icon = copy.icon;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = accessSchema.safeParse({ nome, pin });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os dados informados");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await loginWithPin(role, parsed.data.nome, parsed.data.pin);

    if (!result.ok) {
      setError(result.error ?? "Não foi possível entrar agora");
      setIsSubmitting(false);
      return;
    }

    setPin("");
    toast.success(`${result.user?.nome ?? "Usuário"} identificado com sucesso`, {
      duration: 1200,
      icon: role === "garcom" ? "🍽️" : role === "gerente" ? "🛡️" : "💰",
    });
    setIsSubmitting(false);
  };

  const handleResetPin = () => {
    const result = resetPin(role, resetNome);
    if (result.ok) {
      toast.success("PIN redefinido para 1234", { duration: 3000, icon: "🔑" });
      setShowReset(false);
      setResetNome("");
      setNome(resetNome.trim());
      setPin("");
    } else {
      toast.error(result.error ?? "Não foi possível redefinir");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="surface-card flex flex-col gap-5 p-6 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Nome do operador</label>
            <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: João" maxLength={40} />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <KeyRound className="h-4 w-4" />
              PIN numérico
            </label>
            <Input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4 a 6 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" className="h-12 rounded-xl text-base font-black" disabled={isSubmitting}>
            {copy.submit}
          </Button>
        </form>

        {!showReset ? (
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="mx-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Esqueci meu PIN
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-3">
            <p className="text-xs font-semibold text-foreground">Redefinir PIN</p>
            <Input
              value={resetNome}
              onChange={(e) => setResetNome(e.target.value)}
              placeholder="Digite seu nome"
              maxLength={40}
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReset(false); setResetNome(""); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleResetPin} disabled={resetNome.trim().length < 2}>
                Redefinir para 1234
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Uso local neste dispositivo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Este protótipo salva usuários e sessões no próprio navegador para simular a operação real.
        </p>
        {knownUsers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {knownUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setNome(user.nome)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/80"
              >
                {user.nome}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationalAccessCard;
