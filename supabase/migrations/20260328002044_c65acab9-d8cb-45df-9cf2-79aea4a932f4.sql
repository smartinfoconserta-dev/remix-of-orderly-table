-- Allow public read on stores for device activation (only id and name needed, controlled by view)
CREATE POLICY "devices_public_store_lookup"
  ON public.stores
  FOR SELECT
  TO public
  USING (true);
