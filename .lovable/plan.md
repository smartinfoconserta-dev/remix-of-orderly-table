

## Problema

O `AdminPage` ainda contém o auth gate legado (linhas 389-450+) que verifica `gerentes.length === 0` e mostra o wizard de configuração inicial. Como `getProfilesByRole` é um stub que sempre retorna `[]`, o wizard é exibido toda vez, mesmo com o admin já autenticado via Supabase Auth.

## Solução

Remover todo o bloco do auth gate legado do `AdminPage` (o `if (!authenticated)` e o wizard de setup), já que a autenticação agora é feita pelo `ProtectedRoute` + Supabase Auth.

### Alterações em `src/pages/AdminPage.tsx`

1. **Remover estados legados**: `authenticated`, `authName`, `authPin`, `authError`, `authLoading`, `newUserName`, `newUserPin`, `userError`
2. **Remover funções legadas**: `handleAuth`, `handleCreateGerente`, `handleRemoveUser`
3. **Remover variáveis legadas**: `gerentes` (useMemo de `getProfilesByRole`)
4. **Remover imports legados não usados**: `verifyManagerAccess`, `verifyEmployeeAccess`, `getProfilesByRole`, `getActiveProfilesByRole`, `createUser`, `removeUser` do `useAuth()`
5. **Remover todo o bloco `if (!authenticated)`** (linhas ~389-450) — que inclui o wizard de setup e o formulário de login por PIN
6. O componente retornará diretamente o layout principal do painel admin

Nenhuma funcionalidade real é perdida — tudo que esse bloco fazia já é coberto pelo `ProtectedRoute` que guarda a rota `/admin`.

