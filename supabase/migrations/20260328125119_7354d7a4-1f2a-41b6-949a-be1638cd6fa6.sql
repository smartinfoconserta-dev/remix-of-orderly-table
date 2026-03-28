CREATE OR REPLACE FUNCTION public.rpc_insert_fechamento(_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (_data->>'store_id') IS NULL OR (_data->>'id') IS NULL THEN
    RAISE EXCEPTION 'store_id and id are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (_data->>'store_id')::uuid) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  INSERT INTO public.fechamentos (
    id, store_id, mesa_id, mesa_numero, origem, total, subtotal, desconto, couvert,
    numero_pessoas, forma_pagamento, pagamentos, itens, caixa_id, caixa_nome,
    troco, numero_comanda, cancelado, cancelado_em, cancelado_motivo, cancelado_por,
    criado_em, criado_em_iso, cpf_nota
  ) VALUES (
    _data->>'id', (_data->>'store_id')::uuid, _data->>'mesa_id',
    COALESCE((_data->>'mesa_numero')::int, 0), COALESCE(_data->>'origem', 'mesa'),
    COALESCE((_data->>'total')::numeric, 0), COALESCE((_data->>'subtotal')::numeric, 0),
    COALESCE((_data->>'desconto')::numeric, 0), COALESCE((_data->>'couvert')::numeric, 0),
    COALESCE((_data->>'numero_pessoas')::int, 0), _data->>'forma_pagamento',
    COALESCE(_data->'pagamentos', '[]'::jsonb), COALESCE(_data->'itens', '[]'::jsonb),
    _data->>'caixa_id', _data->>'caixa_nome', COALESCE((_data->>'troco')::numeric, 0),
    (_data->>'numero_comanda')::int, COALESCE((_data->>'cancelado')::bool, false),
    _data->>'cancelado_em', _data->>'cancelado_motivo', _data->>'cancelado_por',
    _data->>'criado_em', COALESCE((_data->>'criado_em_iso')::timestamptz, now()),
    _data->>'cpf_nota'
  );
END;
$function$;