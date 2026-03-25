
CREATE OR REPLACE FUNCTION public.create_module_pin(
  _store_id UUID,
  _module TEXT,
  _pin TEXT,
  _label TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.module_pins (store_id, module, pin_hash, label, created_by)
  VALUES (_store_id, _module, crypt(_pin, gen_salt('bf')), _label, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
