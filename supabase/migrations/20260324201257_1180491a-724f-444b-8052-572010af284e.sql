
-- Tabela de configurações do restaurante
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

-- Tabela de licença
CREATE TABLE public.restaurant_license (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente TEXT NOT NULL DEFAULT '',
  data_vencimento DATE,
  ativo BOOLEAN DEFAULT true,
  plano TEXT DEFAULT 'basico',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de categorias customizadas
CREATE TABLE public.restaurant_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT '🍽️',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS permissivo (sem auth Supabase ainda)
CREATE POLICY "Allow public read config" ON public.restaurant_config FOR SELECT USING (true);
CREATE POLICY "Allow public write config" ON public.restaurant_config FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read license" ON public.restaurant_license FOR SELECT USING (true);
CREATE POLICY "Allow public write license" ON public.restaurant_license FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read categories" ON public.restaurant_categories FOR SELECT USING (true);
CREATE POLICY "Allow public write categories" ON public.restaurant_categories FOR ALL USING (true) WITH CHECK (true);
