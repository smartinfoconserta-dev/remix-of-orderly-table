ALTER TABLE public.restaurant_config
  ADD COLUMN IF NOT EXISTS modo_operacao text NOT NULL DEFAULT 'restaurante',
  ADD COLUMN IF NOT EXISTS identificacao_fast_food text NOT NULL DEFAULT 'codigo';