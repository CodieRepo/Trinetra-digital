-- Fix: Infinite recursion in profiles RLS
-- Create SECURITY DEFINER helper function that bypasses RLS safely

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Drop old recursive policies on profiles
DROP POLICY IF EXISTS select_own_profile ON profiles;
DROP POLICY IF EXISTS update_own_profile ON profiles;
DROP POLICY IF EXISTS manage_profiles_as_admin ON profiles;
DROP POLICY IF EXISTS super_admin_all_profiles ON profiles;
DROP POLICY IF EXISTS tenant_isolation_profiles ON profiles;

-- Recreate without recursion
CREATE POLICY select_own_profile ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() = 'super_admin');
CREATE POLICY update_own_profile ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY manage_profiles_as_admin ON profiles
  FOR ALL USING (tenant_id = get_current_tenant_id() AND get_my_role() = 'client_admin');
CREATE POLICY super_admin_all_profiles ON profiles
  FOR ALL USING (get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_profiles ON profiles
  FOR SELECT USING (tenant_id = get_current_tenant_id());

-- Fix all other tables that had the same recursive pattern
DROP POLICY IF EXISTS tenant_isolation_contacts ON contacts;
DROP POLICY IF EXISTS tenant_isolation_conversations ON conversations;
DROP POLICY IF EXISTS tenant_isolation_messages ON messages;
DROP POLICY IF EXISTS tenant_isolation_bookings ON bookings;
DROP POLICY IF EXISTS tenant_isolation_handoff_alerts ON handoff_alerts;
DROP POLICY IF EXISTS tenant_isolation_notes ON notes;
DROP POLICY IF EXISTS tenant_isolation_templates ON templates;
DROP POLICY IF EXISTS tenant_isolation_automations ON automations;
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS tenant_isolation_automation_rules ON automation_rules;

CREATE POLICY tenant_isolation_contacts ON contacts FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_conversations ON conversations FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_messages ON messages FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_bookings ON bookings FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_handoff_alerts ON handoff_alerts FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_notes ON notes FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_templates ON templates FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_automations ON automations FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_notifications ON notifications FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_audit_logs ON audit_logs FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_automation_rules ON automation_rules FOR ALL USING (
  EXISTS (
    SELECT 1 FROM automations
    WHERE automations.id = automation_rules.automation_id
    AND (automations.tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin')
  )
);
