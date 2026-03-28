
-- Atomic per-store order number generator
-- Uses advisory lock on store_id hash to prevent race conditions
CREATE OR REPLACE FUNCTION public.next_order_number(_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _next integer;
BEGIN
  -- Advisory lock scoped to this store to serialize concurrent calls
  PERFORM pg_advisory_xact_lock(hashtext(_store_id::text));
  
  SELECT COALESCE(MAX(numero_pedido), 0) + 1
    INTO _next
    FROM public.pedidos
   WHERE store_id = _store_id;
  
  RETURN _next;
END;
$$;
