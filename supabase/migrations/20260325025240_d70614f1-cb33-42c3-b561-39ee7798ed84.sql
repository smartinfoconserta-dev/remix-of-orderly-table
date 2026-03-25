CREATE OR REPLACE FUNCTION public.verify_pin(input_pin TEXT, stored_hash TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT stored_hash = crypt(input_pin, stored_hash);
$$;