-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "produtos_master" ON public.produtos;
DROP POLICY IF EXISTS "produtos_public_read" ON public.produtos;
DROP POLICY IF EXISTS "produtos_store_members" ON public.produtos;
DROP POLICY IF EXISTS "produtos_auth_master" ON public.produtos;
DROP POLICY IF EXISTS "produtos_auth_members" ON public.produtos;

CREATE POLICY "produtos_public_read" ON public.produtos
  FOR SELECT USING (ativo = true AND removido = false);

CREATE POLICY "produtos_auth_master" ON public.produtos
  FOR ALL TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

CREATE POLICY "produtos_auth_members" ON public.produtos
  FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));