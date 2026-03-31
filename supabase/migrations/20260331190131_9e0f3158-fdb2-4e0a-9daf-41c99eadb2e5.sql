ALTER TABLE public.restaurant_config
  ADD COLUMN IF NOT EXISTS sidebar_estilo text DEFAULT 'icone-texto',
  ADD COLUMN IF NOT EXISTS totem_tema text,
  ADD COLUMN IF NOT EXISTS totem_cor_primaria text,
  ADD COLUMN IF NOT EXISTS totem_tema_personalizado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS totem_fundo_tipo text,
  ADD COLUMN IF NOT EXISTS totem_fundo_cor text,
  ADD COLUMN IF NOT EXISTS totem_fundo_gradiente jsonb,
  ADD COLUMN IF NOT EXISTS totem_letra_cor text,
  ADD COLUMN IF NOT EXISTS totem_sidebar_cor text,
  ADD COLUMN IF NOT EXISTS totem_cards_cor text;