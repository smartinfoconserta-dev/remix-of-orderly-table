
-- =============================================
-- STEP 1: Drop overly-permissive public ALL policies
-- =============================================
DROP POLICY IF EXISTS "estado_mesas_public_all" ON public.estado_mesas;
DROP POLICY IF EXISTS "bairros_delivery_public_all" ON public.bairros_delivery;
DROP POLICY IF EXISTS "clientes_delivery_public_all" ON public.clientes_delivery;
DROP POLICY IF EXISTS "master_clientes_public_all" ON public.master_clientes;
DROP POLICY IF EXISTS "master_despesas_public_all" ON public.master_despesas;
DROP POLICY IF EXISTS "motoboys_public_all" ON public.motoboys;
DROP POLICY IF EXISTS "motoboy_fechamentos_public_all" ON public.motoboy_fechamentos;

-- =============================================
-- STEP 2: Create proper policies for tables that had public ALL
-- =============================================

-- estado_mesas
CREATE POLICY "estado_mesas_auth_master" ON public.estado_mesas FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));
CREATE POLICY "estado_mesas_auth_members" ON public.estado_mesas FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));
CREATE POLICY "estado_mesas_anon_read" ON public.estado_mesas FOR SELECT TO anon
  USING (true);

-- bairros_delivery
CREATE POLICY "bairros_public_read" ON public.bairros_delivery FOR SELECT USING (true);
CREATE POLICY "bairros_auth_master" ON public.bairros_delivery FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));
CREATE POLICY "bairros_auth_members" ON public.bairros_delivery FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- clientes_delivery
CREATE POLICY "clientes_delivery_public_read" ON public.clientes_delivery FOR SELECT USING (true);
CREATE POLICY "clientes_delivery_auth_master" ON public.clientes_delivery FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));
CREATE POLICY "clientes_delivery_auth_members" ON public.clientes_delivery FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- master_clientes (only master users)
CREATE POLICY "master_clientes_master" ON public.master_clientes FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));

-- master_despesas (only master users)
CREATE POLICY "master_despesas_master" ON public.master_despesas FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));

-- motoboys
CREATE POLICY "motoboys_public_read" ON public.motoboys FOR SELECT USING (true);
CREATE POLICY "motoboys_auth_master" ON public.motoboys FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));
CREATE POLICY "motoboys_auth_members" ON public.motoboys FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- motoboy_fechamentos
CREATE POLICY "motoboy_fechamentos_public_read" ON public.motoboy_fechamentos FOR SELECT USING (true);
CREATE POLICY "motoboy_fechamentos_auth_master" ON public.motoboy_fechamentos FOR ALL TO authenticated
  USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));
CREATE POLICY "motoboy_fechamentos_auth_members" ON public.motoboy_fechamentos FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- =============================================
-- STEP 3: RPC for estado_mesas (anon devices use this)
-- =============================================
CREATE OR REPLACE FUNCTION public.rpc_upsert_estado_mesa(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (_data->>'store_id') IS NULL OR (_data->>'id') IS NULL THEN
    RAISE EXCEPTION 'store_id and id are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (_data->>'store_id')::uuid) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  INSERT INTO public.estado_mesas (id, mesa_id, numero, status, total, carrinho, pedidos, chamar_garcom, chamado_em, store_id, updated_at)
  VALUES (
    _data->>'id', _data->>'mesa_id', COALESCE((_data->>'numero')::int, 0),
    COALESCE(_data->>'status', 'livre'), COALESCE((_data->>'total')::numeric, 0),
    COALESCE(_data->'carrinho', '[]'::jsonb), COALESCE(_data->'pedidos', '[]'::jsonb),
    COALESCE((_data->>'chamar_garcom')::bool, false), (_data->>'chamado_em')::bigint,
    (_data->>'store_id')::uuid, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, total = EXCLUDED.total, carrinho = EXCLUDED.carrinho,
    pedidos = EXCLUDED.pedidos, chamar_garcom = EXCLUDED.chamar_garcom,
    chamado_em = EXCLUDED.chamado_em, updated_at = now();
END;
$$;
