

## Problema Identificado

Há **dois bugs** trabalhando juntos:

1. **Sessão stale no localStorage**: Antes das correções de permissão, alguém logou como "caixa" na rota /gerente. Essa sessão ficou salva em `sessions.gerente = { userId: "id-do-caixa" }`.

2. **`getCurrentUser` não valida role**: A função `getCurrentUser("gerente")` apenas busca o userId salvo em `sessions.gerente` — **não verifica se o usuário encontrado realmente tem role "gerente"**. Então mesmo com um caixa salvo por engano nessa sessão, o sistema mostra "Operador: caixa" no Painel do Gerente.

O `loginWithPin` agora bloqueia corretamente novos logins indevidos, mas **sessões antigas persistem** e não são validadas ao carregar.

## Correção

**Arquivo: `src/contexts/AuthContext.tsx`**

Alterar `getCurrentUser` para validar que o usuário na sessão tem role permitido para aquela área:

```typescript
const getCurrentUser = useCallback(
  (role: UserRole): OperationalUser | null => {
    const session = state.sessions[role];
    if (!session) return null;

    const user = state.users.find((item) => item.id === session.userId);
    if (!user) return null;

    // Seed admin pode estar em qualquer sessão
    if (user.id === "seed-admin-001") return toPublicUser(user);

    // Validar que o role do usuário é permitido para esta sessão
    const allowedRoles: Record<UserRole, UserRole[]> = {
      garcom: ["garcom"],
      caixa: ["caixa", "gerente"],
      gerente: ["gerente"],
    };
    const allowed = allowedRoles[role] ?? [role];
    if (!allowed.includes(user.role)) return null; // Sessão inválida

    return toPublicUser(user);
  },
  [state.sessions, state.users],
);
```

Isso faz com que sessões stale de caixa em `sessions.gerente` retornem `null`, forçando o login novamente. Sem quebrar nada — admin continua com bypass, gerente continua podendo logar em /caixa.

## Resumo

| O que | Onde |
|-------|------|
| Validar role na leitura da sessão | `getCurrentUser` em AuthContext.tsx |
| Seed admin mantém bypass | Checagem por `id === "seed-admin-001"` |
| Resultado | Sessões stale com role errado são ignoradas |

