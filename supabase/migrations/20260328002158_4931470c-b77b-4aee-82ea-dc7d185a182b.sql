-- Create a secure function to find store_id by CNPJ
CREATE OR REPLACE FUNCTION public.get_store_by_cnpj(_cnpj text)
RETURNS TABLE(store_id uuid, store_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT s.id, s.name
  FROM master_clientes mc
  JOIN stores s ON LOWER(TRIM(s.name)) = LOWER(TRIM(mc.nome_restaurante))
  WHERE mc.cnpj = _cnpj AND mc.ativo = true
  LIMIT 1;
$$;
