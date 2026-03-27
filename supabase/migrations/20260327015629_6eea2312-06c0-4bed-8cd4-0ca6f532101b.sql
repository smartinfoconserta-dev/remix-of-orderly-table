
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

-- RLS fechamentos
CREATE POLICY "fechamentos_public_read" ON public.fechamentos FOR SELECT TO public USING (true);
CREATE POLICY "fechamentos_public_insert" ON public.fechamentos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "fechamentos_public_update" ON public.fechamentos FOR UPDATE TO public USING (true) WITH CHECK (true);

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

-- RLS eventos_operacionais
CREATE POLICY "eventos_public_read" ON public.eventos_operacionais FOR SELECT TO public USING (true);
CREATE POLICY "eventos_public_insert" ON public.eventos_operacionais FOR INSERT TO public WITH CHECK (true);

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

-- RLS movimentacoes_caixa
CREATE POLICY "movimentacoes_public_read" ON public.movimentacoes_caixa FOR SELECT TO public USING (true);
CREATE POLICY "movimentacoes_public_insert" ON public.movimentacoes_caixa FOR INSERT TO public WITH CHECK (true);

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

-- RLS estado_caixa
CREATE POLICY "estado_caixa_public_read" ON public.estado_caixa FOR SELECT TO public USING (true);
CREATE POLICY "estado_caixa_public_insert" ON public.estado_caixa FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "estado_caixa_public_update" ON public.estado_caixa FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.estado_mesas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fechamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.estado_caixa;
