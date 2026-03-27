
-- Table to register activated devices (tablets, totems, TVs)
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  device_id text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('tablet', 'totem', 'tv')),
  label text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  mesa_id uuid REFERENCES public.mesas(id) ON DELETE SET NULL,
  activated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Public can read active devices (for validation)
CREATE POLICY "devices_public_read" ON public.devices
  FOR SELECT TO public USING (true);

-- Store members can manage devices
CREATE POLICY "devices_store_members" ON public.devices
  FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- Masters can manage all
CREATE POLICY "devices_master" ON public.devices
  FOR ALL TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

-- Public can insert (for activation flow without auth)
CREATE POLICY "devices_public_insert" ON public.devices
  FOR INSERT TO public WITH CHECK (true);

-- Public can update last_seen_at
CREATE POLICY "devices_public_update" ON public.devices
  FOR UPDATE TO public USING (true) WITH CHECK (true);
