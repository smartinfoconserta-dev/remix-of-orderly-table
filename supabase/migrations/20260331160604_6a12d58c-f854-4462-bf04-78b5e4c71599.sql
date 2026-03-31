
-- Add plain PIN column for retrieval
ALTER TABLE public.module_pins ADD COLUMN IF NOT EXISTS pin_plain text;

-- Update the create_module_pin function to also store the plain PIN
CREATE OR REPLACE FUNCTION public.create_module_pin(_store_id uuid, _module text, _pin text, _label text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.module_pins (store_id, module, pin_hash, pin_plain, label, created_by)
  VALUES (_store_id, _module, crypt(_pin, gen_salt('bf')), _pin, _label, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;

-- Create a security definer function to read the plain PIN (requires auth)
CREATE OR REPLACE FUNCTION public.get_module_pin_plain(_pin_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pin_plain FROM public.module_pins WHERE id = _pin_id AND active = true;
$function$;
