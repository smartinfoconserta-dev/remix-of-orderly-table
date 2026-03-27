

# Plano: Migrar dados operacionais para Supabase (persistência real)

## Problema atual

Toda a lógica operacional (pedidos, mesas, fechamentos, eventos, movimentações de caixa) vive **apenas em memória** no `RestaurantContext`. Ao recarregar a página, tudo se perde. As tabelas `pedidos` e `estado_mesas` existem no Supabase mas nunca são usadas pelo código. Não há comunicação real entre Cozinha, Caixa e Cliente.

## Fluxo desejado

```text
Cliente/Garçom → Pedido (DB) → Cozinha (lê do DB, muda status)
                                    ↓
                              "preparando" → "pronto"
                                    ↓
                              Caixa (lê do DB, faz cobrança)
                                    ↓
                              "pago" → fechamento registrado
```

## O que será feito

### 1. Novas tabelas no Supabase (migrations)

- **`fechamentos`** — registros de fechamento de conta (mesaId, total, pagamentos, operador, origem, etc.)
- **`eventos_operacionais`** — log de auditoria (tipo, descricao, mesa, usuario, acao)
- **`movimentacoes_caixa`** — entradas e saídas de caixa (tipo, valor, descricao, usuario)
- **`estado_caixa`** — turno do caixa (aberto/fechado, fundo_troco, store_id)

Todas com `store_id` + RLS por `store_members` e `is_master`.

### 2. Ativar uso das tabelas existentes

- **`pedidos`** — já existe com todos os campos necessários. O código passará a INSERT ao criar pedidos e UPDATE ao mudar status (preparando, pronto, pago, cancelado).
- **`estado_mesas`** — já existe. Sincronizar carrinho e pedidos da mesa com esta tabela.

### 3. Refatorar RestaurantContext

Substituir o estado in-memory por operações no Supabase:

- **`confirmarPedido`** → `INSERT INTO pedidos` + `UPDATE estado_mesas`
- **`criarPedidoBalcao`** → `INSERT INTO pedidos`
- **`marcarBalcaoPreparando`** → `UPDATE pedidos SET status_balcao = 'preparando'`
- **`marcarPedidoBalcaoPronto`** → `UPDATE pedidos SET status_balcao = 'pronto'`
- **`fecharConta`** → `INSERT INTO fechamentos` + `UPDATE estado_mesas` (zerar)
- **`abrirCaixa/fecharCaixaDoDia`** → `INSERT/UPDATE estado_caixa`
- **Leitura** → queries com filtros por `store_id` + Supabase Realtime subscriptions

### 4. Realtime (comunicação entre telas)

Usar `supabase.channel()` com Realtime para que:

- Cozinha receba pedidos novos automaticamente (subscribe na tabela `pedidos`)
- Caixa veja quando pedido está "pronto"
- TV de retirada atualize ao vivo
- Mesas sincronizem entre dispositivos

### 5. Criar hook `useSupabaseOrders`

Hook centralizado que:
- Carrega pedidos do turno atual do banco
- Escuta mudanças via Realtime
- Expõe funções de mutação (criar, atualizar status)
- Filtra por `store_id` do contexto

### 6. Atualizar páginas consumidoras

- **CozinhaPage** — ler pedidos do DB em vez do context; botões "Preparando"/"Pronto" fazem UPDATE direto
- **CaixaPage** — ler pedidos e fechamentos do DB; fechar conta faz INSERT em fechamentos
- **GarcomPage/TabletPage** — confirmar pedido faz INSERT no DB
- **TvPage** — subscribe Realtime nos pedidos com status "pronto"
- **MotoboyPage** — migrar motoboys de localStorage para tabela (ou manter local por enquanto, fase 2)

## Detalhes técnicos

### Migration SQL (tabelas novas)

```sql
-- fechamentos
CREATE TABLE public.fechamentos (
  id text PRIMARY KEY,
  store_id uuid NOT NULL,
  mesa_id text,
  mesa_numero integer DEFAULT 0,
  origem text DEFAULT 'mesa',
  total numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  couvert numeric DEFAULT 0,
  numero_pessoas integer DEFAULT 0,
  forma_pagamento text,
  pagamentos jsonb DEFAULT '[]',
  itens jsonb DEFAULT '[]',
  caixa_id text,
  caixa_nome text,
  troco numeric DEFAULT 0,
  numero_comanda integer,
  cancelado boolean DEFAULT false,
  cancelado_em text,
  cancelado_motivo text,
  cancelado_por text,
  criado_em text,
  criado_em_iso timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- eventos_operacionais
CREATE TABLE public.eventos_operacionais (
  id text PRIMARY KEY,
  store_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text,
  mesa_id text,
  usuario_id text,
  usuario_nome text,
  acao text,
  valor numeric,
  item_nome text,
  motivo text,
  pedido_numero integer,
  criado_em text,
  criado_em_iso timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- movimentacoes_caixa
CREATE TABLE public.movimentacoes_caixa (
  id text PRIMARY KEY,
  store_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text,
  valor numeric DEFAULT 0,
  usuario_id text,
  usuario_nome text,
  criado_em text,
  criado_em_iso timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- estado_caixa (turno)
CREATE TABLE public.estado_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  aberto boolean DEFAULT false,
  fundo_troco numeric DEFAULT 0,
  aberto_por text,
  aberto_em timestamptz,
  fechado_por text,
  fechado_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Com RLS policies públicas para leitura (operacional precisa ler sem auth) e write via `store_members`/`is_master`.

### Ordem de implementação

1. Criar migrations (tabelas + RLS)
2. Criar `src/hooks/useSupabaseOrders.ts` (CRUD + Realtime)
3. Criar `src/hooks/useSupabaseCaixa.ts` (fechamentos + movimentações)
4. Refatorar `RestaurantContext` para delegar ao Supabase
5. Atualizar CozinhaPage, CaixaPage, GarcomPage, TvPage
6. Testar fluxo completo: pedido → cozinha → caixa

## Escopo desta fase

- Pedidos, fechamentos, eventos e movimentações persistidos no Supabase
- Comunicação em tempo real entre Cozinha ↔ Caixa ↔ TV
- Estado das mesas sincronizado via `estado_mesas`
- Motoboys permanece em localStorage (fase 2)

