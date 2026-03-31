-- RPC: upsert cliente delivery (anon-safe)
CREATE OR REPLACE FUNCTION public.rpc_upsert_cliente_delivery(_store_id uuid, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  
  UPDATE public.clientes_delivery SET
    nome = COALESCE(_data->>'nome', nome),
    telefone = COALESCE(_data->>'telefone', telefone),
    cpf = COALESCE(_data->>'cpf', cpf),
    endereco = COALESCE(_data->>'endereco', endereco),
    numero = COALESCE(_data->>'numero', numero),
    bairro = COALESCE(_data->>'bairro', bairro),
    complemento = COALESCE(_data->>'complemento', complemento),
    referencia = COALESCE(_data->>'referencia', referencia),
    ultimo_pedido = now()
  WHERE store_id = _store_id AND (
    cpf = _data->>'cpf' OR telefone = _data->>'telefone'
  );
  
  IF NOT FOUND THEN
    INSERT INTO public.clientes_delivery (id, store_id, nome, telefone, cpf, endereco, numero, bairro, complemento, referencia)
    VALUES (
      'cli-' || extract(epoch from now())::bigint || '-' || substr(gen_random_uuid()::text, 1, 5),
      _store_id,
      _data->>'nome', _data->>'telefone', _data->>'cpf',
      _data->>'endereco', _data->>'numero', _data->>'bairro',
      _data->>'complemento', _data->>'referencia'
    );
  END IF;
END;
$$;

-- RPC: insert motoboy fechamento (anon-safe)
CREATE OR REPLACE FUNCTION public.rpc_insert_motoboy_fechamento(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (_data->>'store_id') IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = (_data->>'store_id')::uuid) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  INSERT INTO public.motoboy_fechamentos (id, store_id, motoboy_id, motoboy_nome, status, resumo, pedidos_ids)
  VALUES (
    COALESCE(_data->>'id', gen_random_uuid()::text),
    (_data->>'store_id')::uuid,
    _data->>'motoboy_id',
    _data->>'motoboy_nome',
    COALESCE(_data->>'status', 'aguardando'),
    COALESCE(_data->'resumo', '{}'::jsonb),
    COALESCE(_data->'pedidos_ids', '[]'::jsonb)
  );
END;
$$;

-- RPC: sync bairros delivery (anon-safe)
CREATE OR REPLACE FUNCTION public.rpc_sync_bairros_delivery(_store_id uuid, _bairros jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id) THEN
    RAISE EXCEPTION 'store_id inválido';
  END IF;
  DELETE FROM public.bairros_delivery WHERE store_id = _store_id;
  INSERT INTO public.bairros_delivery (id, store_id, nome, taxa, ativo)
  SELECT
    'bairro-' || extract(epoch from now())::bigint || '-' || row_number() over(),
    _store_id, b->>'nome', COALESCE((b->>'taxa')::numeric, 0), COALESCE((b->>'ativo')::bool, true)
  FROM jsonb_array_elements(_bairros) AS b;
END;
$$;