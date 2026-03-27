DROP POLICY IF EXISTS "Store admins can manage members" ON public.store_members;

CREATE OR REPLACE FUNCTION public.can_manage_store_members(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(auth.uid()) OR EXISTS (
    SELECT 1
    FROM public.store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.store_id = _store_id
      AND sm.role_in_store IN ('owner', 'admin', 'gerente')
  )
$$;

CREATE POLICY "Store admins can manage members"
  ON public.store_members
  FOR ALL
  TO authenticated
  USING (public.can_manage_store_members(store_id))
  WITH CHECK (public.can_manage_store_members(store_id));