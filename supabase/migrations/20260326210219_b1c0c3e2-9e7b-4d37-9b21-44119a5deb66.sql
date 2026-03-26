
-- Tabela de tablets cadastrados
CREATE TABLE public.tablets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  mesa_id uuid REFERENCES public.mesas(id) ON DELETE SET NULL,
  pin_id uuid REFERENCES public.module_pins(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.tablets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tablets_public_read" ON public.tablets
  FOR SELECT TO public USING (true);

CREATE POLICY "tablets_store_members" ON public.tablets
  FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

CREATE POLICY "tablets_master" ON public.tablets
  FOR ALL TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));
