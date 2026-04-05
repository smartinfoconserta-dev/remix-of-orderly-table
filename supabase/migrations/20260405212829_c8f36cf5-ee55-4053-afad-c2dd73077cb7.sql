
-- Atomic comanda number generator (similar to next_order_number)
CREATE OR REPLACE FUNCTION public.next_comanda_number(_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _next integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('comanda-' || _store_id::text));
  
  SELECT COALESCE(MAX(numero_comanda), 0) + 1
    INTO _next
    FROM public.fechamentos
   WHERE store_id = _store_id;
  
  RETURN _next;
END;
$$;
