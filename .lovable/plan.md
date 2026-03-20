

## Plano

### Passo 1: Reverter via histórico
O usuário está visualizando o commit correto (antes do ProtectedRoute quebrar). Basta clicar "Restore" nessa versão.

### Passo 2: Reimplementar ProtectedRoute (simplificado)

O guard atual é agressivo demais — redireciona quando existe qualquer sessão em outro slot. A segurança real já está em 3 camadas:
- `loginWithPin` bloqueia login com role errado
- `sanitizeSessions` limpa sessões stale
- `getCurrentUser` valida role ao ler sessão

O novo ProtectedRoute será passivo — **nunca redireciona antes do login**. Só atua se detectar sessão ativa no slot com role incompatível (caso edge de manipulação de localStorage).

**`src/components/ProtectedRoute.tsx`** — reescrever:
```typescript
export const ProtectedRoute = ({ children, requiredSession }) => {
  // Sempre renderiza children (página com formulário de login)
  // A validação real acontece em loginWithPin + sanitizeSessions
  return <>{children}</>;
};
```

Na prática o componente vira um pass-through. Mantemos ele no App.tsx para documentação e caso futuro onde queiramos adicionar lógica (ex: redirect após logout forçado).

**`src/App.tsx`** — mantém as rotas envolvidas com ProtectedRoute como estão (não muda nada).

### Resultado

| Cenário | Comportamento |
|---------|--------------|
| Acessa /gerente sem login | Vê formulário de login da página |
| Caixa tenta logar em /gerente | `loginWithPin` retorna erro "Acesso negado" |
| Sessão stale de caixa em slot gerente | `sanitizeSessions` limpa automaticamente |
| Admin loga em qualquer lugar | Bypass funciona normalmente |

### Passo 1 — Restaure a versão anterior primeiro:

