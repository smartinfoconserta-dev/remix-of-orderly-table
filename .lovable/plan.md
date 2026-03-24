

# Arquitetura Multi-Tenant: Master vs Admin (Multi-Lojas)

## Resumo

Transformar o sistema em multi-tenant onde:
- **Master** = super admin, vê e gerencia TODAS as lojas (restaurantes)
- **Admin** = dono de UMA loja, vê apenas os dados da sua loja
- Cada loja tem seu próprio cardápio, equipe, pedidos, configurações

## Modelo de Dados

### Novas tabelas no Supabase

```text
┌──────────────────────────┐
│  auth.users (Supabase)   │  ← Master e Admins logam aqui
│  id, email, password     │
└──────────┬───────────────┘
           │
┌──────────▼───────────────┐
│  user_roles              │  ← Define se é 'master' ou 'admin'
│  id, user_id, role       │
└──────────────────────────┘
           │
┌──────────▼───────────────┐
│  stores (lojas)          │  ← Cada restaurante = 1 registro
│  id, name, slug,         │
│  owner_id (→ auth.users) │
│  created_at              │
└──────────┬───────────────┘
           │
┌──────────▼───────────────┐
│  store_members           │  ← Vínculo user ↔ loja
│  id, store_id, user_id,  │
│  role_in_store           │  ← 'owner', 'gerente', etc.
└──────────────────────────┘
```

### Tabelas existentes ganham coluna `store_id`

- `restaurant_config` → adiciona `store_id UUID REFERENCES stores(id)`
- `restaurant_license` → adiciona `store_id UUID REFERENCES stores(id)`
- `restaurant_categories` → adiciona `store_id UUID REFERENCES stores(id)`
- Futuras tabelas (pedidos, cardápio, equipe) seguem o mesmo padrão

### RLS por loja

- **Admin/membros**: só acessam dados onde `store_id` pertence ao seu vínculo em `store_members`
- **Master**: função `is_master(auth.uid())` retorna true → acesso total (bypassa filtro de loja)

```sql
-- Exemplo de policy para restaurant_config
CREATE POLICY "Users see own store config"
ON public.restaurant_config FOR SELECT USING (
  public.is_master(auth.uid())
  OR store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
);
```

## Etapas de Implementação

### Etapa 1 — Tabelas base e Auth

1. Criar tabela `user_roles` com enum `app_role` ('master', 'admin')
2. Criar tabela `stores` (id, name, slug, owner_id, created_at)
3. Criar tabela `store_members` (id, store_id, user_id, role_in_store)
4. Criar funções `is_master()` e `get_user_store_ids()`
5. Adicionar `store_id` nas tabelas `restaurant_config`, `restaurant_license`, `restaurant_categories`
6. Aplicar RLS em todas as tabelas com filtro por store_id + bypass master

### Etapa 2 — Login com Supabase Auth

1. **MasterPage**: login via `supabase.auth.signInWithPassword()` — verifica role 'master' no `user_roles`
2. **AdminPage**: login via `supabase.auth.signInWithPassword()` — verifica role 'admin', carrega `store_id` do `store_members`
3. Criar contexto `StoreContext` que armazena o `store_id` ativo (admin vê só 1, master pode alternar)
4. Todas as queries passam o `store_id` do contexto

### Etapa 3 — Master gerencia lojas

1. No MasterPage, ao cadastrar "Cliente" (restaurante), criar:
   - Registro em `stores`
   - Conta em `auth.users` para o dono da loja
   - Vínculo em `store_members` (owner)
   - Role 'admin' em `user_roles`
   - Config inicial em `restaurant_config` e `restaurant_license`
2. Master pode "entrar" em qualquer loja (selecionar store_id) para ver/editar como se fosse admin

### Etapa 4 — Admin isolado

1. AdminPage carrega dados filtrados por `store_id` do usuário logado
2. Equipe operacional (garçom, caixa, gerente) é vinculada à loja
3. Pedidos, fechamentos, cardápio — tudo filtrado por `store_id`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar `user_roles`, `stores`, `store_members`, alterar tabelas existentes |
| `src/contexts/StoreContext.tsx` | **Novo** — contexto de loja ativa |
| `src/pages/MasterPage.tsx` | Login Supabase Auth + gestão multi-loja |
| `src/pages/AdminPage.tsx` | Login Supabase Auth + filtro por store_id |
| `src/lib/configService.ts` | Adicionar store_id em todas as queries |
| `src/lib/adminStorage.ts` | Wrappers passam store_id |

## O que NÃO muda nesta etapa

- Páginas operacionais (garçom, caixa, cozinha, totem, TV) continuam funcionando com localStorage
- A migração de pedidos/cardápio para Supabase fica para etapas futuras
- O fluxo do cliente final não é alterado

## Ordem sugerida (fazer por partes)

1. **Parte 1**: Criar tabelas + funções RLS (migração SQL)
2. **Parte 2**: Login Master com Supabase Auth
3. **Parte 3**: Login Admin com Supabase Auth + StoreContext
4. **Parte 4**: CRUD de lojas no Master
5. **Parte 5**: Vincular config/licença ao store_id

