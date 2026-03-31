ALTER TABLE public.restaurant_categories
ADD COLUMN parent_id uuid REFERENCES public.restaurant_categories(id) ON DELETE SET NULL DEFAULT NULL;