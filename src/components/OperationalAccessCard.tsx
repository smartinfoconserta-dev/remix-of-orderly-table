import { useState } from "react";
import { BriefcaseBusiness, HandPlatter, KeyRound, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";
import { toast } from "sonner";

interface OperationalAccessCardProps {
  role: UserRole;
}

const roleCopy: Record<string, { title: string; description: string; submit: string; icon: typeof HandPlatter }> = {
  garcom: {
    title: "Acesso do Garçom",
    description: "Identifique-se para registrar pedidos.",
    submit: "Entrar como garçom",
    icon: HandPlatter,
  },
  caixa: {
    title: "Acesso do Caixa",
    description: "Identifique o operador para registrar movimentações.",
    submit: "Entrar no caixa",
    icon: Wallet,
  },
  gerente: {
    title: "Validação do Gerente",
    description: "Acesso para relatórios e ações críticas.",
    submit: "Validar gerente",
    icon: BriefcaseBusiness,
  },
};

const OperationalAccessCard = ({ role }: OperationalAccessCardProps) => {
  const { loginAsOperational } = useAuth();
  const [storeSlug, setStoreSlug] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = roleCopy[role] ?? roleCopy.garcom;
  const Icon = copy.icon;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!storeSlug.trim()) {
      setError("Informe o código da loja");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("O PIN deve ter entre 4 e 6 números");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await loginAsOperational(storeSlug.trim(), role, pin);

    if (!result.ok) {
      setError(result.error ?? "Não foi possível entrar agora");
      setIsSubmitting(false);
      return;
    }

    setPin("");
    toast.success("Acesso autorizado", {
      duration: 1200,
      icon: role === "garcom" ? "🍽️" : role === "gerente" ? "🛡️" : "💰",
    });
    setIsSubmitting(false);
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
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Store className="h-4 w-4" />
              Código da loja
            </label>
            <Input value={storeSlug} onChange={(event) => setStoreSlug(event.target.value)} placeholder="Ex.: restaurante-01" maxLength={60} />
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
      </div>
    </div>
  );
};

export default OperationalAccessCard;
