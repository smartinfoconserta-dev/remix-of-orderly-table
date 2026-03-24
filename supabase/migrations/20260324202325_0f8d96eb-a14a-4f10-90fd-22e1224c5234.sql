-- 1. Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('master', 'admin');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Tabela stores (lojas/restaurantes)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela store_members (vínculo user ↔ loja)
CREATE TABLE public.store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_in_store TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (store_id, user_id)
);

-- 5. Função has_role (security definer, evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Função is_master (atalho)
CREATE OR REPLACE FUNCTION public.is_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'master')
$$;

-- 7. Função get_user_store_ids
CREATE OR REPLACE FUNCTION public.get_user_store_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.store_members WHERE user_id = _user_id
$$;

-- 8. Adicionar store_id nas tabelas existentes
ALTER TABLE public.restaurant_config
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_license
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_categories
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- 9. RLS em user_roles
CREATE POLICY "Masters can do everything on user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 10. RLS em stores
CREATE POLICY "Masters can do everything on stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Members can read own stores"
  ON public.stores FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.get_user_store_ids(auth.uid())));

-- 11. RLS em store_members
CREATE POLICY "Masters can do everything on store_members"
  ON public.store_members FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Users can read own memberships"
  ON public.store_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 12. Atualizar RLS das tabelas existentes
DROP POLICY IF EXISTS "Allow public read config" ON public.restaurant_config;
DROP POLICY IF EXISTS "Allow public write config" ON public.restaurant_config;

CREATE POLICY "Public can read config"
  ON public.restaurant_config FOR SELECT
  USING (true);

CREATE POLICY "Masters can manage all config"
  ON public.restaurant_config FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Store members can manage own config"
  ON public.restaurant_config FOR ALL
  TO authenticated
  USING (store_id IN (SELECT public.get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT public.get_user_store_ids(auth.uid())));

DROP POLICY IF EXISTS "Allow public read license" ON public.restaurant_license;
DROP POLICY IF EXISTS "Allow public write license" ON public.restaurant_license;

CREATE POLICY "Public can read license"
  ON public.restaurant_license FOR SELECT
  USING (true);

CREATE POLICY "Masters can manage all licenses"
  ON public.restaurant_license FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Store members can read own license"
  ON public.restaurant_license FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT public.get_user_store_ids(auth.uid())));

DROP POLICY IF EXISTS "Allow public read categories" ON public.restaurant_categories;
DROP POLICY IF EXISTS "Allow public write categories" ON public.restaurant_categories;

CREATE POLICY "Public can read categories"
  ON public.restaurant_categories FOR SELECT
  USING (true);

CREATE POLICY "Masters can manage all categories"
  ON public.restaurant_categories FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Store members can manage own categories"
  ON public.restaurant_categories FOR ALL
  TO authenticated
  USING (store_id IN (SELECT public.get_user_store_ids(auth.uid())))
  WITH CHECK (store_id IN (SELECT public.get_user_store_ids(auth.uid())));
