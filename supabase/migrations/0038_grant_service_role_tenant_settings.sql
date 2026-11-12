-- =========================================================================
-- Migration: 0038_grant_service_role_tenant_settings.sql
-- Purpose: Restore INSERT (and ALL) privileges to service_role on
--          public.tenant_settings (and related CRM tables) where 0032
--          granted only SELECT/UPDATE, causing 42501 permission denied
--          on upsert() in /api/client/restaurant/settings.
-- =========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.flow_analytics TO service_role;
