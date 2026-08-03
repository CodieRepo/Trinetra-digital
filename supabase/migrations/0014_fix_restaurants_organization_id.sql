-- Migration: 0014_fix_restaurants_organization_id.sql
-- Fixes schema divergence where organization_id was added with NOT NULL constraint on restaurants table.

DO $$ 
BEGIN
    -- 1. Drop NOT NULL constraint on organization_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'restaurants' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.restaurants ALTER COLUMN organization_id DROP NOT NULL;
        ALTER TABLE public.restaurants ALTER COLUMN organization_id SET DEFAULT tenant_id;
        UPDATE public.restaurants SET organization_id = tenant_id WHERE organization_id IS NULL;
    END IF;
END $$;
