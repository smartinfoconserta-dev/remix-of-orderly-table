

## Problema

O `ProtectedRoute` redireciona para `/` quando existe sessão de garçom (nível 1) e o usuário tenta acessar `/caixa` (nível 2). Isso impede que o caixa faça login no mesmo dispositivo.

## Correção

Tornar o `ProtectedRoute` pass-through — sempre renderiza os children. A proteção de hierarquia fica exclusivamente no `loginWithPin` (garçom não consegue LOGAR no slot caixa porque o allowedRoles bloqueia).

### Arquivo: `src/components/ProtectedRoute.tsx`

```typescript
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  // Proteção de hierarquia é feita pelo loginWithPin
  // ProtectedRoute apenas marca a rota como protegida para documentação
  return <>{children}</>;
};
```

Isso resolve: qualquer pessoa pode acessar `/caixa`, `/garcom`, `/gerente` pela URL e ver o formulário de login. O `loginWithPin` impede que um garçom logue no slot do caixa (retorna "Acesso negado").

### Resultado

| Cenário | Resultado |
|---------|-----------|
| Garçom logado, acessa /caixa | Vê formulário de login do caixa |
| Garçom tenta LOGAR em /caixa | loginWithPin bloqueia: "Acesso negado" |
| Caixa digita credenciais em /caixa | Loga normalmente |
| Ninguém logado, acessa /gerente | Vê formulário de login |

