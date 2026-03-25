CREATE OR REPLACE FUNCTION public.get_store_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT s.id, s.name, s.slug FROM stores s
  WHERE s.slug = _slug
  LIMIT 1;
$$;