CREATE OR REPLACE FUNCTION public.rpc_get_operational_pedidos(_store_id uuid)
RETURNS TABLE (
  id text,
  numero_pedido integer,
  itens jsonb,
  total numeric,
  criado_em text,
  criado_em_iso timestamptz,
  origem text,
  mesa_id text,
  garcom_id text,
  garcom_nome text,
  caixa_id text,
  caixa_nome text,
  pronto boolean,
  para_viagem boolean,
  cliente_nome text,
  observacao_geral text,
  status_balcao text,
  motoboy_nome text,
  cancelado boolean,
  cancelado_em text,
  cancelado_motivo text,
  cancelado_por text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.numero_pedido,
    p.itens,
    p.total,
    p.criado_em,
    p.criado_em_iso,
    p.origem,
    p.mesa_id,
    p.garcom_id,
    p.garcom_nome,
    p.caixa_id,
    p.caixa_nome,
    COALESCE(p.pronto, false) AS pronto,
    COALESCE(p.para_viagem, false) AS para_viagem,
    p.cliente_nome,
    p.observacao_geral,
    p.status_balcao,
    p.motoboy_nome,
    COALESCE(p.cancelado, false) AS cancelado,
    p.cancelado_em,
    p.cancelado_motivo,
    p.cancelado_por
  FROM public.pedidos p
  WHERE p.store_id = _store_id
    AND p.criado_em_iso >= date_trunc('day', now())
  ORDER BY p.criado_em_iso ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_get_operational_pedidos(uuid) TO anon, authenticated;