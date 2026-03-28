
-- Add store_id validation to all SECURITY DEFINER RPCs

CREATE OR REPLACE FUNCTION public.rpc_insert_pedido(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (_data->>'store_id') IS NULL OR (_data->>'id') IS NULL THEN
    RAISE EXCEPTION 'store_id and id are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (_data->>'store_id')::uuid) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  INSERT INTO public.pedidos (
    id, store_id, numero_pedido, itens, total, criado_em, criado_em_iso, origem,
    mesa_id, garcom_id, garcom_nome, caixa_id, caixa_nome, pronto, para_viagem,
    cliente_nome, cliente_telefone, endereco_completo, bairro, referencia,
    forma_pagamento_delivery, troco_para_quanto, observacao_geral, status_balcao,
    motoboy_nome, cancelado, cancelado_em, cancelado_motivo, cancelado_por
  ) VALUES (
    _data->>'id', (_data->>'store_id')::uuid, (_data->>'numero_pedido')::int,
    COALESCE(_data->'itens', '[]'::jsonb), COALESCE((_data->>'total')::numeric, 0),
    _data->>'criado_em', COALESCE((_data->>'criado_em_iso')::timestamptz, now()),
    COALESCE(_data->>'origem', 'mesa'), _data->>'mesa_id',
    _data->>'garcom_id', _data->>'garcom_nome', _data->>'caixa_id', _data->>'caixa_nome',
    COALESCE((_data->>'pronto')::bool, false), COALESCE((_data->>'para_viagem')::bool, false),
    _data->>'cliente_nome', _data->>'cliente_telefone', _data->>'endereco_completo',
    _data->>'bairro', _data->>'referencia', _data->>'forma_pagamento_delivery',
    (_data->>'troco_para_quanto')::numeric, _data->>'observacao_geral',
    COALESCE(_data->>'status_balcao', 'aberto'), _data->>'motoboy_nome',
    COALESCE((_data->>'cancelado')::bool, false), _data->>'cancelado_em',
    _data->>'cancelado_motivo', _data->>'cancelado_por'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_insert_fechamento(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    criado_em, criado_em_iso
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
    _data->>'criado_em', COALESCE((_data->>'criado_em_iso')::timestamptz, now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_insert_evento(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (_data->>'store_id') IS NULL OR (_data->>'id') IS NULL THEN
    RAISE EXCEPTION 'store_id and id are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (_data->>'store_id')::uuid) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  INSERT INTO public.eventos_operacionais (
    id, store_id, tipo, descricao, mesa_id, usuario_id, usuario_nome,
    acao, valor, item_nome, motivo, pedido_numero, criado_em, criado_em_iso
  ) VALUES (
    _data->>'id', (_data->>'store_id')::uuid, _data->>'tipo', _data->>'descricao',
    _data->>'mesa_id', _data->>'usuario_id', _data->>'usuario_nome',
    _data->>'acao', (_data->>'valor')::numeric, _data->>'item_nome',
    _data->>'motivo', (_data->>'pedido_numero')::int, _data->>'criado_em',
    COALESCE((_data->>'criado_em_iso')::timestamptz, now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_insert_movimentacao(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (_data->>'store_id') IS NULL OR (_data->>'id') IS NULL THEN
    RAISE EXCEPTION 'store_id and id are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (_data->>'store_id')::uuid) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  INSERT INTO public.movimentacoes_caixa (
    id, store_id, tipo, descricao, valor, usuario_id, usuario_nome, criado_em, criado_em_iso
  ) VALUES (
    _data->>'id', (_data->>'store_id')::uuid, _data->>'tipo', _data->>'descricao',
    COALESCE((_data->>'valor')::numeric, 0), _data->>'usuario_id', _data->>'usuario_nome',
    _data->>'criado_em', COALESCE((_data->>'criado_em_iso')::timestamptz, now())
  );
END;
$$;

-- Also add validation to rpc_upsert_estado_caixa
CREATE OR REPLACE FUNCTION public.rpc_upsert_estado_caixa(_store_id uuid, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  SELECT id INTO _existing_id FROM public.estado_caixa WHERE store_id = _store_id LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    UPDATE public.estado_caixa SET
      aberto = CASE WHEN _data ? 'aberto' THEN (_data->>'aberto')::bool ELSE aberto END,
      fundo_troco = CASE WHEN _data ? 'fundo_troco' THEN (_data->>'fundo_troco')::numeric ELSE fundo_troco END,
      aberto_por = CASE WHEN _data ? 'aberto_por' THEN _data->>'aberto_por' ELSE aberto_por END,
      aberto_em = CASE WHEN _data ? 'aberto_em' THEN (_data->>'aberto_em')::timestamptz ELSE aberto_em END,
      fechado_por = CASE WHEN _data ? 'fechado_por' THEN _data->>'fechado_por' ELSE fechado_por END,
      fechado_em = CASE WHEN _data ? 'fechado_em' THEN (_data->>'fechado_em')::timestamptz ELSE fechado_em END,
      diferenca_dinheiro = CASE WHEN _data ? 'diferenca_dinheiro' THEN (_data->>'diferenca_dinheiro')::numeric ELSE diferenca_dinheiro END,
      diferenca_motivo = CASE WHEN _data ? 'diferenca_motivo' THEN _data->>'diferenca_motivo' ELSE diferenca_motivo END,
      fundo_proximo = CASE WHEN _data ? 'fundo_proximo' THEN (_data->>'fundo_proximo')::numeric ELSE fundo_proximo END,
      updated_at = now()
    WHERE id = _existing_id;
  ELSE
    INSERT INTO public.estado_caixa (store_id, aberto, fundo_troco, aberto_por, aberto_em)
    VALUES (
      _store_id,
      COALESCE((_data->>'aberto')::bool, false),
      COALESCE((_data->>'fundo_troco')::numeric, 0),
      _data->>'aberto_por',
      COALESCE((_data->>'aberto_em')::timestamptz, now())
    );
  END IF;
END;
$$;
