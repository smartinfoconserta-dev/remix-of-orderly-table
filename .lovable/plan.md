

## Problema

O `ProtectedRoute` atual é pass-through (não faz nada). Um garçom logado em `/garcom` pode digitar `/caixa` na URL e ver a página do caixa (formulário de login). O usuário quer bloquear isso.

## Solução

Reimplementar o `ProtectedRoute` com lógica inteligente:

- **Sem nenhuma sessão ativa** → mostra a página (formulário de login) ✓
- **Sessão ativa no slot correto** → mostra a página (já autenticado) ✓  
- **Sessão ativa em OUTRO slot, mas NÃO no slot requerido** → redireciona para `/` ✗

### Arquivo: `src/components/ProtectedRoute.tsx`

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  const { currentGarcom, currentCaixa, currentGerente } = useAuth();

  const sessionMap: Record<UserRole, unknown> = {
    garcom: currentGarcom,
    caixa: currentCaixa,
    gerente: currentGerente,
  };

  // Se tem sessão no slot requerido → acesso OK
  if (sessionMap[requiredSession]) return <>{children}</>;

  // Se NÃO tem nenhuma sessão → mostra login da página
  const hasAnySession = !!(currentGarcom || currentCaixa || currentGerente);
  if (!hasAnySession) return <>{children}</>;

  // Tem sessão em outro slot → bloqueia
  return <Navigate to="/" replace />;
};
```

### Comportamento

| Situação | Resultado |
|----------|-----------|
| Ninguém logado, acessa /caixa | Vê formulário de login do caixa ✓ |
| Caixa logado, acessa /caixa | Entra normalmente ✓ |
| Garçom logado, acessa /caixa | Redireciona para / ✓ |
| Garçom logado, acessa /gerente | Redireciona para / ✓ |
| Gerente logado, acessa /caixa | Entra (gerente tem sessão no slot caixa via loginWithPin) ✓ |
| Admin logado em /gerente, acessa /caixa | Depende se logou no slot caixa também |

O `App.tsx` já tem as rotas envolvidas com `ProtectedRoute` — não precisa alterar.

