

# Migrar Configurações do Restaurante para Supabase (com fallback offline)

## Resumo

Criar tabelas no Supabase para armazenar as configurações do restaurante (nome, logo, cores, horários, módulos, licença) e manter localStorage como cache/fallback offline. O sistema lê primeiro do banco, salva localmente, e em caso de falha de rede usa o cache local.

---

## Etapa 1 — Criar tabelas no Supabase

### Tabela `restaurant_config`
Armazena todas as configurações do sistema (hoje em `orderly-config-v1`).

```sql
CREATE TABLE public.restaurant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_restaurante TEXT NOT NULL DEFAULT 'Obsidian',
  logo_url TEXT DEFAULT '',
  logo_base64 TEXT DEFAULT '',
  cor_primaria TEXT DEFAULT '',
  banners JSONB DEFAULT '[]',
  instagram_url TEXT DEFAULT '',
  senha_wifi TEXT DEFAULT '',
  instagram_bg TEXT,
  wifi_bg TEXT,
  taxa_entrega NUMERIC DEFAULT 0,
  telefone TEXT DEFAULT '',
  tempo_entrega TEXT DEFAULT '',
  mensagem_boas_vindas TEXT DEFAULT '',
  delivery_ativo BOOLEAN DEFAULT true,
  modo_identificacao_delivery TEXT DEFAULT 'visitante',
  cozinha_ativa BOOLEAN DEFAULT false,
  couvert_ativo BOOLEAN DEFAULT false,
  couvert_valor NUMERIC DEFAULT 0,
  couvert_obrigatorio BOOLEAN DEFAULT false,
  horario_funcionamento JSONB,
  mensagem_fechado TEXT,
  logo_estilo TEXT DEFAULT 'quadrada',
  impressao_por_setor BOOLEAN DEFAULT false,
  nome_impressora_cozinha TEXT,
  nome_impressora_bar TEXT,
  modulos JSONB DEFAULT '{}',
  plano TEXT DEFAULT 'basico',
  modo_tv TEXT DEFAULT 'padrao',
  total_mesas INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabela `restaurant_license`
Armazena a licença (hoje em `orderly-licenca-v1`).

```sql
CREATE TABLE public.restaurant_license (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente TEXT NOT NULL DEFAULT '',
  data_vencimento DATE,
  ativo BOOLEAN DEFAULT true,
  plano TEXT DEFAULT 'basico',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabela `restaurant_categories`
Categorias customizadas (hoje em `orderly-categorias-v1`).

```sql
CREATE TABLE public.restaurant_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT '🍽️',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies
Por enquanto, políticas permissivas para leitura pública (o sistema não tem auth Supabase ainda). Escrita liberada temporariamente.

```sql
-- restaurant_config
CREATE POLICY "Allow public read" ON public.restaurant_config FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON public.restaurant_config FOR ALL USING (true);

-- restaurant_license
CREATE POLICY "Allow public read" ON public.restaurant_license FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON public.restaurant_license FOR ALL USING (true);

-- restaurant_categories
CREATE POLICY "Allow public read" ON public.restaurant_categories FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON public.restaurant_categories FOR ALL USING (true);
```

---

## Etapa 2 — Criar camada de serviço

### Novo arquivo: `src/lib/configService.ts`

Responsabilidades:
- **Ler config**: busca do Supabase → salva no localStorage como cache → retorna dados
- **Salvar config**: salva no Supabase → atualiza cache local → se offline, salva só local e marca como "pendente de sync"
- **Fallback**: se Supabase falhar na leitura, usa localStorage
- Mesma lógica para licença e categorias

Funções principais:
```
fetchConfig() → SistemaConfig           // Supabase → cache → fallback
saveConfig(config) → void               // Supabase + cache
fetchLicenca() → LicencaConfig          // Supabase → cache → fallback
saveLicenca(config) → void              // Supabase + cache
fetchCategorias() → CategoriaCustom[]   // Supabase → cache → fallback
saveCategorias(cats) → void             // Supabase + cache
```

---

## Etapa 3 — Adaptar `adminStorage.ts`

Manter as funções existentes (`getSistemaConfig`, `saveSistemaConfig`, etc.) como wrappers que:
1. Continuam lendo/escrevendo no localStorage (para compatibilidade imediata)
2. Exportam novas versões async (`getSistemaConfigAsync`, `saveSistemaConfigAsync`) que usam o `configService`

Isso garante que **nenhuma página quebra** — o código existente continua funcionando, e gradualmente substituímos as chamadas síncronas pelas async.

---

## Etapa 4 — Adaptar páginas Admin e Master

### `AdminPage.tsx`
- Na aba de configurações, ao salvar: chamar `saveSistemaConfigAsync` ao invés de `saveSistemaConfig`
- Ao carregar: buscar com `fetchConfig()` do service

### `MasterPage.tsx`
- Ao salvar licença: chamar `saveLicencaAsync`
- Ao carregar: buscar com `fetchLicenca()`

### Outras páginas (Totem, Cozinha, TV, etc.)
- Continuam usando `getSistemaConfig()` síncrono do localStorage (que já estará populado pelo cache)
- Sem alteração necessária nesta etapa

---

## O que NÃO muda nesta etapa

- AuthContext (usuários/PINs) — fica no localStorage por enquanto
- RestaurantContext (pedidos, mesas, fechamentos) — fica no localStorage
- menuData.ts (produtos) — fica hardcoded
- deliveryStorage.ts (clientes delivery, bairros) — fica no localStorage

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar 3 tabelas + RLS |
| `src/lib/configService.ts` | **Novo** — camada Supabase |
| `src/lib/adminStorage.ts` | Adicionar wrappers async |
| `src/pages/AdminPage.tsx` | Usar service async para salvar/carregar |
| `src/pages/MasterPage.tsx` | Usar service async para licença |
| `src/integrations/supabase/types.ts` | Auto-atualizado |

