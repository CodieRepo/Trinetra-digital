-- Migration: 0015_fix_rls_auth_lookup.sql
-- Grant explicit SELECT policies for authenticated users on users_roles, profiles, and restaurants tables.

DO $$ 
BEGIN
    -- 1. Enable RLS on users_roles if not already enabled and add read policy
    ALTER TABLE public.users_roles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users_roles' AND policyname = 'users_can_read_own_role'
    ) THEN
        CREATE POLICY "users_can_read_own_role" ON public.users_roles
            FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;

    -- 2. Enable RLS on profiles if not already enabled and add read policy
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_can_read_own_profile'
    ) THEN
        CREATE POLICY "users_can_read_own_profile" ON public.profiles
            FOR SELECT TO authenticated USING (id = auth.uid());
    END IF;

    -- 3. Enable RLS on restaurants if not already enabled and add read policy
    ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'users_can_read_own_restaurant'
    ) THEN
        CREATE POLICY "users_can_read_own_restaurant" ON public.restaurants
            FOR SELECT TO authenticated USING (
                tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
                OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
            );
    END IF;
END $$;
