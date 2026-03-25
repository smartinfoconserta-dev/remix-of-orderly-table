CREATE OR REPLACE FUNCTION public.search_stores(query text)
RETURNS TABLE(name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT s.name, s.slug FROM stores s
  WHERE s.name ILIKE '%' || query || '%'
     OR s.slug ILIKE '%' || query || '%'
  LIMIT 8;
$$;