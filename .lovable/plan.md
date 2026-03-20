

## Problema Real (por que nunca funcionou)

Há **dois mapas de permissão** que precisam trabalhar juntos, e ambos estão errados:

### 1. `loginWithPin` — quem pode LOGAR em qual rota

Atual:
```
garcom: ["garcom"]           ← errado, caixa e gerente também deveriam entrar
caixa: ["caixa", "gerente"]  ← OK
gerente: ["gerente"]         ← OK
```

Correto (conforme tabela):
```
garcom: ["garcom", "caixa", "gerente"]
caixa: ["caixa", "gerente"]
gerente: ["gerente"]
```

### 2. `ProtectedRoute` — quem pode NAVEGAR para qual rota (já logado)

Hoje o ProtectedRoute só verifica se existe sessão no slot exato. Ex: caixa logado no slot "caixa" tenta ir para `/garcom` → não tem sessão no slot "garcom" → redireciona para `/`.

Precisa verificar: "o usuário tem sessão em ALGUM slot que dá acesso a esta rota?"

```
// Quais slots de sessão dão acesso a cada rota
garcom: ["garcom", "caixa", "gerente"]  ← quem está logado como caixa ou gerente pode acessar /garcom
caixa: ["caixa", "gerente"]
gerente: ["gerente"]
```

### 3. `SESSION_ALLOWED_ROLES` e `getCurrentUser` — mesma atualização

Para que `sanitizeSessions` não limpe sessões válidas de hierarquia.

## Alterações

### Arquivo 1: `src/contexts/AuthContext.tsx`

Alterar o mapa `SESSION_ALLOWED_ROLES` (linha 82) e o mapa `allowedRoles` dentro de `loginWithPin` (linha 270):

```typescript
// Linha 82 — quem pode ter sessão em qual slot
const SESSION_ALLOWED_ROLES: Record<UserRole, UserRole[]> = {
  garcom: ["garcom", "caixa", "gerente"],
  caixa: ["caixa", "gerente"],
  gerente: ["gerente"],
};
```

E dentro de `loginWithPin` (linha 270):
```typescript
const allowedRoles: Record<UserRole, UserRole[]> = {
  garcom: ["garcom", "caixa", "gerente"],
  caixa: ["caixa", "gerente"],
  gerente: ["gerente"],
};
```

### Arquivo 2: `src/components/ProtectedRoute.tsx`

Reescrever para verificar se o usuário tem sessão em **qualquer slot que dê acesso** à rota:

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

// Quais slots de sessão concedem acesso a cada rota
const ROUTE_GRANTED_BY: Record<UserRole, UserRole[]> = {
  garcom: ["garcom", "caixa", "gerente"],
  caixa: ["caixa", "gerente"],
  gerente: ["gerente"],
};

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

  const grantedBy = ROUTE_GRANTED_BY[requiredSession] ?? [requiredSession];

  // Tem sessão em algum slot que dá acesso a esta rota → OK
  if (grantedBy.some((slot) => !!sessionMap[slot])) return <>{children}</>;

  // Sem nenhuma sessão → mostra formulário de login
  const hasAnySession = !!(currentGarcom || currentCaixa || currentGerente);
  if (!hasAnySession) return <>{children}</>;

  // Tem sessão, mas em slot sem acesso a esta rota → bloqueia
  return <Navigate to="/" replace />;
};
```

## Resultado conforme a tabela

| Perfil | /garcom | /mesa | /caixa | /gerente | /admin | /master |
|--------|---------|-------|--------|----------|--------|---------|
| Garçom | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Caixa | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Gerente | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

- /admin e /master têm seus próprios sistemas de auth separados (não usam ProtectedRoute)
- /pedido, /cozinha, /motoboy são públicos (sem login)
- Seed admin (id="seed-admin-001") mantém bypass total em loginWithPin e getCurrentUser

