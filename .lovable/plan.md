

## Tela de Login Unificada

Substituir a página inicial (`/`) — que hoje mostra um grid de cards de módulos — por uma tela de login limpa com duas abas:

```text
┌─────────────────────────────────┐
│        Orderly Table            │
│   "Acesse o sistema"            │
│                                 │
│  ┌───────────┬────────────────┐ │
│  │ Admin     │ Operacional    │ │
│  └───────────┴────────────────┘ │
│                                 │
│  [Tab Admin]                    │
│    Email: ___________           │
│    Senha: ___________           │
│    [ Entrar ]                   │
│    → master/admin auto-detect   │
│                                 │
│  [Tab Operacional]              │
│    Empresa: _________ (busca)   │
│    PIN: ____                    │
│    [ Entrar ]                   │
│    → redireciona pro módulo     │
│                                 │
│  📲 Instalar como app           │
└─────────────────────────────────┘
```

Sem link de cardápio (multi-tenant, não faz sentido sem contexto de loja).

---

## Alterações

### 1. Migration SQL -- RPC `search_stores`

Criar função `SECURITY DEFINER` para permitir busca pública de lojas por nome/slug (anon key não tem acesso direto à tabela `stores`):

```sql
CREATE OR REPLACE FUNCTION public.search_stores(query text)
RETURNS TABLE(name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT s.name, s.slug FROM stores s
  WHERE s.name ILIKE '%' || query || '%'
     OR s.slug ILIKE '%' || query || '%'
  LIMIT 8;
$$;
```

### 2. Atualizar `AuthContext.tsx` -- novo `loginByPin`

Adicionar função que recebe apenas `storeSlug + pin` (sem módulo):
- Busca store pelo slug
- Busca todos `module_pins` ativos da store
- Verifica PIN contra cada hash via RPC `verify_pin`
- Ao encontrar match, usa o `module` daquele registro
- Salva sessão operacional e retorna `{ ok, module }`

### 3. Reescrever `src/pages/Index.tsx`

Substituir todo o conteúdo por:

**Tab "Administração":**
- Campos email + senha
- Login unificado: chama `signInWithPassword`, depois `resolveSupabaseLevel`
  - `master` -> navega `/master`
  - `admin` -> navega `/admin`
  - outro -> erro

**Tab "Acesso Operacional":**
- Campo "Empresa" com autocomplete (chama RPC `search_stores` ao digitar, mostra sugestões como dropdown)
- Campo PIN (4-6 dígitos)
- Ao entrar, chama `loginByPin(slug, pin)` -> navega para `/${module}`

**Extras:**
- Mantém banner PWA install
- Remove todos os ModeCards, AdminLoginDialog, e link de cardápio
- Auto-redirect: se já logado (master/admin/operational), redireciona automaticamente

### 4. Remover `OperationalAccessCard.tsx`

Não será mais necessário -- o login operacional é feito na tela inicial.

### 5. Atualizar rotas em `App.tsx`

- Remover rota `/cliente` e `/pedido` do acesso direto (cardápio público será tratado futuramente com rota por slug tipo `/:slug`)
- Manter as rotas protegidas como estão

---

## Resumo de arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar RPC `search_stores` |
| `src/contexts/AuthContext.tsx` | Adicionar `loginByPin(slug, pin)` |
| `src/pages/Index.tsx` | Reescrever com tela de login (2 tabs) |
| `src/components/OperationalAccessCard.tsx` | Remover |
| `src/App.tsx` | Remover rotas `/cliente` e `/pedido` |

