
-- Allow admins/owners to manage store_members (INSERT, UPDATE, DELETE)
CREATE POLICY "Store admins can manage members"
  ON public.store_members
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT sm.store_id FROM public.store_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.role_in_store IN ('owner', 'admin', 'gerente')
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT sm.store_id FROM public.store_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.role_in_store IN ('owner', 'admin', 'gerente')
    )
  );
