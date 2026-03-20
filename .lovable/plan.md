

## Diagnóstico

Auditei todos os arquivos envolvidos. O cenário completo:

1. **`ProtectedRoute`** — é pass-through (não faz nada), então qualquer pessoa navega para qualquer rota.
2. **`loginWithPin`** — bloqueia login com role errado (garçom não consegue LOGAR em /caixa). Isso está correto.
3. **Cada página** (GarcomPage, CaixaPage, GerentePage) — tem guard interno que mostra formulário se não há sessão no slot.

**O problema**: garçom logado navega para `/caixa`, não tem sessão no slot caixa, então vê o formulário de login do caixa. Ele não consegue logar (loginWithPin bloqueia), mas consegue **ver** a página. O mesmo para /gerente.

**Conforme a tabela**: garçom NÃO deve nem ver /caixa.

## Solução: ProtectedRoute com hierarquia numérica

A lógica é simples:
- Cada role tem um nível: garcom=1, caixa=2, gerente=3
- Cada rota tem um nível mínimo: /garcom=1, /caixa=2, /gerente=3
- Busca o maior nível entre todas as sessões ativas
- Se nível máximo >= nível da rota → permite (mostra página ou form)
- Se nível máximo < nível da rota → redireciona para `/`
- Se nenhuma sessão ativa → mostra o formulário (ninguém logou ainda)
- Admin (seed-admin-001) → bypass total

### Validação de todos os cenários

| Situação | Sessões ativas | Max nível | Rota | Req nível | Resultado |
|----------|---------------|-----------|------|-----------|-----------|
| Ninguém logado → /gerente | 0 | 0 | gerente | 3 | Mostra form ✓ |
| Ninguém logado → /caixa | 0 | 0 | caixa | 2 | Mostra form ✓ |
| Garçom logado → /caixa | garcom(1) | 1 | caixa | 2 | Redireciona ✓ |
| Garçom logado → /gerente | garcom(1) | 1 | gerente | 3 | Redireciona ✓ |
| Caixa logado → /garcom | caixa(2) | 2 | garcom | 1 | Permite ✓ |
| Caixa logado → /gerente | caixa(2) | 2 | gerente | 3 | Redireciona ✓ |
| Gerente logado → /caixa | gerente(3) | 3 | caixa | 2 | Permite ✓ |
| Gerente logado → /garcom | gerente(3) | 3 | garcom | 1 | Permite ✓ |
| Admin logado → qualquer | admin | ∞ | * | * | Permite ✓ |
| Garçom + Gerente logados → /caixa | garcom(1)+gerente(3) | 3 | caixa | 2 | Permite ✓ |

### Caso especial: gerente quer logar em /gerente mas garçom está logado

Neste caso max=1 < 3, então redireciona. O gerente precisa fazer logout do garçom primeiro. Isso é aceitável porque o mesmo dispositivo normalmente é usado por um tipo de operador.

## Arquivo a alterar

**`src/components/ProtectedRoute.tsx`** — reescrever com hierarquia numérica:

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

const ROLE_LEVEL: Record<string, number> = {
  garcom: 1,
  caixa: 2,
  gerente: 3,
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  const { currentGarcom, currentCaixa, currentGerente } = useAuth();

  const activeUsers = [currentGarcom, currentCaixa, currentGerente].filter(Boolean);

  // Ninguém logado → mostra formulário de login
  if (activeUsers.length === 0) return <>{children}</>;

  // Admin seed → bypass total
  if (activeUsers.some((u) => u!.id === "seed-admin-001")) return <>{children}</>;

  // Maior nível entre sessões ativas
  const maxLevel = Math.max(...activeUsers.map((u) => ROLE_LEVEL[u!.role] ?? 0));
  const requiredLevel = ROLE_LEVEL[requiredSession] ?? 0;

  if (maxLevel >= requiredLevel) return <>{children}</>;

  // Sessão ativa com nível insuficiente → redireciona
  return <Navigate to="/" replace />;
};
```

Nenhum outro arquivo precisa ser alterado. O `loginWithPin`, `getCurrentUser`, `sanitizeSessions`, as pages internas — tudo continua igual.

