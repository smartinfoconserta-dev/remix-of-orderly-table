-- Create mesas table
CREATE TABLE public.mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  nome text,
  status text NOT NULL DEFAULT 'livre',
  capacidade integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, numero)
);

-- RLS
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "mesas_public_read" ON public.mesas
  FOR SELECT TO public USING (true);

-- Store members can manage
CREATE POLICY "mesas_store_members" ON public.mesas
  FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- Masters can manage all
CREATE POLICY "mesas_master" ON public.mesas
  FOR ALL TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));