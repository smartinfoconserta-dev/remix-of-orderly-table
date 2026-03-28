
-- Prompt 2: Remove anon SELECT policies that expose all store data
DROP POLICY IF EXISTS "pedidos_anon_select" ON public.pedidos;
DROP POLICY IF EXISTS "fechamentos_anon_select" ON public.fechamentos;
DROP POLICY IF EXISTS "movimentacoes_anon_select" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "eventos_anon_select" ON public.eventos_operacionais;
DROP POLICY IF EXISTS "estado_caixa_anon_select" ON public.estado_caixa;

-- Prompt 5: Create preferencias_operacionais table
CREATE TABLE IF NOT EXISTS public.preferencias_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  chave text NOT NULL,
  valor text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, modulo, chave)
);

ALTER TABLE public.preferencias_operacionais ENABLE ROW LEVEL SECURITY;

-- RLS: only store members and masters can access
CREATE POLICY "prefs_auth_master" ON public.preferencias_operacionais
  FOR ALL TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

CREATE POLICY "prefs_auth_members" ON public.preferencias_operacionais
  FOR ALL TO authenticated
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- RPC for devices to read preferences (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.rpc_get_preferencias(_store_id uuid, _modulo text)
RETURNS TABLE(chave text, valor text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT chave, valor FROM public.preferencias_operacionais
  WHERE store_id = _store_id AND modulo = _modulo;
$$;

-- RPC for devices to upsert preferences (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.rpc_upsert_preferencia(_store_id uuid, _modulo text, _chave text, _valor text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.preferencias_operacionais (store_id, modulo, chave, valor, updated_at)
  VALUES (_store_id, _modulo, _chave, _valor, now())
  ON CONFLICT (store_id, modulo, chave)
  DO UPDATE SET valor = _valor, updated_at = now();
END;
$$;
