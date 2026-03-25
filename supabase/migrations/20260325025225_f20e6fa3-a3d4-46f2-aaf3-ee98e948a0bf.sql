CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.module_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  label TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, module, pin_hash)
);

ALTER TABLE public.module_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_pins_master" ON public.module_pins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "module_pins_admin" ON public.module_pins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE user_id = auth.uid() AND store_id = module_pins.store_id
    )
  );

CREATE POLICY "module_pins_public_read" ON public.module_pins
  FOR SELECT USING (active = true);