-- =============================================================================
-- Tighten restaurant_orders RLS: remove broad anon SELECT
-- =============================================================================
-- The original "anon can select restaurant_orders" policy used USING (true),
-- allowing any unauthenticated client to read ALL orders across every
-- restaurant. This was used for Supabase Realtime postgres_changes in
-- StaffOrdersPanel, but Realtime is supplementary — the panel already
-- polls every 15 seconds via authenticated staff API routes.
--
-- Dropping this policy:
--   - Blocks direct anon queries against restaurant_orders.
--   - Disables Realtime push for the anon channel (graceful degradation to
--     polling; no data loss, no functional breakage).
--   - All legitimate reads continue through service-role API routes.
-- =============================================================================

DROP POLICY IF EXISTS "anon can select restaurant_orders" ON public.restaurant_orders;
