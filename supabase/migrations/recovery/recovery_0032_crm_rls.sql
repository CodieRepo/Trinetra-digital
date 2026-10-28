-- ============================================================================
-- RECOVERY SCRIPT: recovery_0032_crm_rls.sql
-- PURPOSE: Emergency post-deployment reversal of 0032 hardening policies
-- PRESERVATION: Restores baseline tenant-isolated RLS policies per operation.
-- SECURITY RULE: NEVER restores generic FOR ALL or permissive USING (true) policies.
-- FORWARD FIX: Retains core immutability & role integrity triggers to prevent
--              catastrophic tenant reassignment or privilege escalation during rollback.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PRE-RECOVERY DRIFT DETECTION: ABORT ON UNEXPECTED POLICIES
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- ------------------------------------------------------------------------
    -- Preflight Policy Drift Detection across all 29 CRM tables
    -- Validates table, policy name, command, target roles, permissive/restrictive status,
    -- and EXACT expressions against an explicit approved catalog baseline. Aborts on any unapproved difference.
    -- ------------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION pg_temp.crm_normalize_policy_expr(p_expr text)
    RETURNS text
    LANGUAGE plpgsql
    IMMUTABLE
    AS $norm$
    DECLARE
        v_s text;
        v_len int;
        v_depth int;
        v_in_str boolean;
        v_in_ident boolean;
        v_i int;
        v_ch text;
        v_encloses_all boolean;
        v_out text := '';
        v_raw text := '';
    BEGIN
        IF p_expr IS NULL THEN
            RETURN NULL;
        END IF;

        v_s := trim(p_expr);

        -- Phase 1: Safe unwrapping of outer parentheses ONLY if they enclose the entire expression
        LOOP
            v_len := length(v_s);
            IF v_len < 2 OR left(v_s, 1) != '(' OR right(v_s, 1) != ')' THEN
                EXIT;
            END IF;

            v_depth := 0;
            v_in_str := false;
            v_in_ident := false;
            v_encloses_all := true;
            v_i := 1;

            WHILE v_i <= v_len LOOP
                v_ch := substring(v_s from v_i for 1);
                IF v_in_str THEN
                    IF v_ch = '''' THEN
                        IF v_i < v_len AND substring(v_s from v_i + 1 for 1) = '''' THEN
                            v_i := v_i + 1; -- skip escaped quote
                        ELSE
                            v_in_str := false;
                        END IF;
                    END IF;
                ELSIF v_in_ident THEN
                    IF v_ch = '"' THEN
                        IF v_i < v_len AND substring(v_s from v_i + 1 for 1) = '"' THEN
                            v_i := v_i + 1; -- skip escaped quote
                        ELSE
                            v_in_ident := false;
                        END IF;
                    END IF;
                ELSE
                    IF v_ch = '''' THEN
                        v_in_str := true;
                    ELSIF v_ch = '"' THEN
                        v_in_ident := true;
                    ELSIF v_ch = '(' THEN
                        v_depth := v_depth + 1;
                    ELSIF v_ch = ')' THEN
                        v_depth := v_depth - 1;
                        IF v_depth = 0 AND v_i < v_len THEN
                            v_encloses_all := false;
                            EXIT;
                        END IF;
                    END IF;
                END IF;
                v_i := v_i + 1;
            END LOOP;

            IF v_encloses_all AND v_depth = 0 THEN
                v_s := trim(substring(v_s from 2 for v_len - 2));
            ELSE
                EXIT;
            END IF;
        END LOOP;

        -- Phase 2: Token-aware scanner preserving string literals and quoted identifiers
        v_len := length(v_s);
        v_in_str := false;
        v_in_ident := false;
        v_i := 1;

        WHILE v_i <= v_len LOOP
            v_ch := substring(v_s from v_i for 1);
            IF v_in_str THEN
                v_out := v_out || v_ch;
                IF v_ch = '''' THEN
                    IF v_i < v_len AND substring(v_s from v_i + 1 for 1) = '''' THEN
                        v_out := v_out || '''';
                        v_i := v_i + 1;
                    ELSE
                        v_in_str := false;
                    END IF;
                END IF;
            ELSIF v_in_ident THEN
                v_out := v_out || v_ch;
                IF v_ch = '"' THEN
                    IF v_i < v_len AND substring(v_s from v_i + 1 for 1) = '"' THEN
                        v_out := v_out || '"';
                        v_i := v_i + 1;
                    ELSE
                        v_in_ident := false;
                    END IF;
                END IF;
            ELSE
                IF v_ch = '''' THEN
                    IF length(v_raw) > 0 THEN
                        v_out := v_out || regexp_replace(regexp_replace(lower(v_raw), '\s+', ' ', 'g'), '\s*([(),=<>!+*/-])\s*', '\1', 'g');
                        v_raw := '';
                    END IF;
                    v_out := v_out || '''';
                    v_in_str := true;
                ELSIF v_ch = '"' THEN
                    IF length(v_raw) > 0 THEN
                        v_out := v_out || regexp_replace(regexp_replace(lower(v_raw), '\s+', ' ', 'g'), '\s*([(),=<>!+*/-])\s*', '\1', 'g');
                        v_raw := '';
                    END IF;
                    v_out := v_out || '"';
                    v_in_ident := true;
                ELSE
                    v_raw := v_raw || v_ch;
                END IF;
            END IF;
            v_i := v_i + 1;
        END LOOP;

        IF length(v_raw) > 0 THEN
            v_out := v_out || regexp_replace(regexp_replace(lower(v_raw), '\s+', ' ', 'g'), '\s*([(),=<>!+*/-])\s*', '\1', 'g');
        END IF;

        RETURN trim(v_out);
    END;
    $norm$;

    CREATE TEMP TABLE _approved_crm_policies (
        tablename text NOT NULL,
        policyname text NOT NULL,
        cmd text NOT NULL,
        permissive text NOT NULL DEFAULT 'PERMISSIVE',
        roles name[] NOT NULL,
        qual_exact text,
        with_check_exact text,
        is_legacy_exempt boolean NOT NULL DEFAULT false,
        PRIMARY KEY (tablename, policyname, cmd)
    ) ON COMMIT DROP;

    INSERT INTO _approved_crm_policies (tablename, policyname, cmd, permissive, roles, qual_exact, with_check_exact, is_legacy_exempt) VALUES
        ('ai_prompts', 'ai_prompts_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('audit_logs', 'audit_logs_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('audit_logs', 'tenant_isolation_audit_logs', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('automation_rules', 'automation_rules_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND public.crm_user_is_tenant_admin(a.tenant_id) )', NULL, false),
        ('automation_rules', 'automation_rules_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND public.crm_user_is_tenant_admin(a.tenant_id) )', false),
        ('automation_rules', 'automation_rules_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND public.crm_user_has_tenant_access(a.tenant_id) )', NULL, false),
        ('automation_rules', 'automation_rules_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND public.crm_user_is_tenant_admin(a.tenant_id) )', 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND public.crm_user_is_tenant_admin(a.tenant_id) )', false),
        ('automation_rules', 'recovery_automation_rules_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'')) )', NULL, false),
        ('automation_rules', 'recovery_automation_rules_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'')) )', false),
        ('automation_rules', 'recovery_automation_rules_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid()) )', NULL, false),
        ('automation_rules', 'recovery_automation_rules_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'')) )', 'EXISTS ( SELECT 1 FROM public.automations a WHERE a.id = automation_rules.automation_id AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'')) )', false),
        ('automation_rules', 'tenant_isolation_automation_rules', 'ALL', 'PERMISSIVE', ARRAY['public'], '(EXISTS ( SELECT 1
   FROM automations
  WHERE ((automations.id = automation_rules.automation_id) AND ((automations.tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text)))))', NULL, true),
        ('automations', 'automations_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('automations', 'automations_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('automations', 'automations_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('automations', 'automations_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('automations', 'recovery_automations_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('automations', 'recovery_automations_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('automations', 'recovery_automations_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('automations', 'recovery_automations_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('automations', 'tenant_isolation_automations', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('background_jobs', 'background_jobs_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('bookings', 'bookings_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('bookings', 'bookings_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('bookings', 'bookings_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('bookings', 'bookings_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', 'public.crm_user_can_write(tenant_id)', false),
        ('bookings', 'recovery_bookings_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('bookings', 'recovery_bookings_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('bookings', 'recovery_bookings_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('bookings', 'recovery_bookings_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('bookings', 'tenant_isolation_bookings', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('contacts', 'contacts_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('contacts', 'contacts_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('contacts', 'contacts_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('contacts', 'contacts_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', 'public.crm_user_can_write(tenant_id)', false),
        ('contacts', 'recovery_contacts_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('contacts', 'recovery_contacts_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('contacts', 'recovery_contacts_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('contacts', 'recovery_contacts_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('contacts', 'tenant_isolation_contacts', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('conversations', 'conversations_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('conversations', 'conversations_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('conversations', 'conversations_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('conversations', 'conversations_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('conversations', 'conversations_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', 'public.crm_user_can_write(tenant_id)', false),
        ('conversations', 'recovery_conversations_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('conversations', 'recovery_conversations_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('conversations', 'recovery_conversations_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('conversations', 'recovery_conversations_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('conversations', 'tenant_isolation_conversations', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('faqs', 'faqs_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('faqs', 'faqs_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('faqs', 'faqs_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('faqs', 'faqs_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('faqs', 'recovery_faqs_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('faqs', 'recovery_faqs_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('faqs', 'recovery_faqs_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('faqs', 'recovery_faqs_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('faqs', 'tenant_isolation_faqs', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('flow_analytics', 'flow_analytics_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('flow_analytics', 'recovery_flow_analytics_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('flow_analytics', 'tenant_isolation_flow_analytics', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('handoff_alerts', 'handoff_alerts_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('handoff_alerts', 'handoff_alerts_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('handoff_alerts', 'handoff_alerts_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('handoff_alerts', 'handoff_alerts_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', 'public.crm_user_can_write(tenant_id)', false),
        ('handoff_alerts', 'recovery_handoff_alerts_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('handoff_alerts', 'recovery_handoff_alerts_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('handoff_alerts', 'recovery_handoff_alerts_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('handoff_alerts', 'recovery_handoff_alerts_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('handoff_alerts', 'tenant_isolation_handoff_alerts', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('job_queue', 'tenant_isolation_job_queue', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('lead_notes', 'lead_notes_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('lead_notes', 'lead_notes_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', NULL, false),
        ('lead_notes', 'lead_notes_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id) AND EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id )', false),
        ('lead_notes', 'lead_notes_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('lead_notes', 'lead_notes_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id) AND EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id )', 'public.crm_user_can_write(tenant_id) AND EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id )', false),
        ('lead_notes', 'recovery_lead_notes_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', NULL, false),
        ('lead_notes', 'recovery_lead_notes_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id )', false),
        ('lead_notes', 'recovery_lead_notes_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('lead_notes', 'recovery_lead_notes_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id )', false),
        ('leads', 'bhash_leads_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('leads', 'leads_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('leads', 'leads_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('leads', 'leads_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('leads', 'leads_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('leads', 'leads_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', 'public.crm_user_can_write(tenant_id)', false),
        ('leads', 'recovery_leads_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('leads', 'recovery_leads_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('leads', 'recovery_leads_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('leads', 'recovery_leads_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('message_events', 'message_events_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.messages m WHERE m.meta_message_id = message_events.meta_message_id AND public.crm_user_has_tenant_access(m.tenant_id) )', NULL, false),
        ('message_events', 'recovery_message_events_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'EXISTS ( SELECT 1 FROM public.messages m WHERE m.meta_message_id = message_events.meta_message_id AND m.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid()) )', NULL, false),
        ('message_events', 'tenant_isolation_message_events', 'ALL', 'PERMISSIVE', ARRAY['public'], '(EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.meta_message_id = message_events.meta_message_id) AND ((messages.tenant_id = get_current_tenant_id()) OR (( SELECT profiles.role
           FROM profiles
          WHERE (profiles.id = auth.uid())) = ''super_admin''::text)))))', NULL, true),
        ('messages', 'messages_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('messages', 'messages_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('messages', 'messages_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id) AND EXISTS ( SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id )', false),
        ('messages', 'messages_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('messages', 'messages_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id) AND EXISTS ( SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id )', 'public.crm_user_can_write(tenant_id) AND EXISTS ( SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id )', false),
        ('messages', 'recovery_messages_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('messages', 'recovery_messages_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND EXISTS ( SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id )', false),
        ('messages', 'recovery_messages_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('messages', 'recovery_messages_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND EXISTS ( SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND EXISTS ( SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id )', false),
        ('messages', 'tenant_isolation_messages', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('notes', 'notes_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', NULL, false),
        ('notes', 'notes_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('notes', 'notes_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('notes', 'notes_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', 'public.crm_user_can_write(tenant_id)', false),
        ('notes', 'recovery_notes_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', NULL, false),
        ('notes', 'recovery_notes_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('notes', 'recovery_notes_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('notes', 'recovery_notes_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('notes', 'tenant_isolation_notes', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('notifications', 'notifications_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('notifications', 'notifications_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('notifications', 'notifications_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('notifications', 'notifications_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', 'public.crm_user_has_tenant_access(tenant_id)', false),
        ('notifications', 'recovery_notifications_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('notifications', 'recovery_notifications_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('notifications', 'recovery_notifications_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('notifications', 'tenant_isolation_notifications', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('profiles', 'manage_profiles_as_admin', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) AND (get_my_role() = ''client_admin''::text))', NULL, true),
        ('profiles', 'profiles_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'id = auth.uid() AND (role IS NULL OR role NOT IN (''super_admin'', ''client_admin'')) AND public.crm_can_onboard_profile(auth.uid(), tenant_id)', false),
        ('profiles', 'profiles_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'id = auth.uid() OR tenant_id IN ( SELECT ur.tenant_id FROM public.users_roles ur WHERE ur.user_id = auth.uid() )', NULL, false),
        ('profiles', 'profiles_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'id = auth.uid()', 'id = auth.uid()', false),
        ('profiles', 'recovery_profiles_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'id = auth.uid() AND (role IS NULL OR role NOT IN (''super_admin'', ''client_admin'')) AND public.crm_can_onboard_profile(auth.uid(), tenant_id)', false),
        ('profiles', 'recovery_profiles_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'id = auth.uid()', NULL, false),
        ('profiles', 'recovery_profiles_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'id = auth.uid()', 'id = auth.uid()', false),
        ('profiles', 'select_own_profile', 'SELECT', 'PERMISSIVE', ARRAY['public'], '((id = auth.uid()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('profiles', 'super_admin_all_profiles', 'ALL', 'PERMISSIVE', ARRAY['public'], '(get_my_role() = ''super_admin''::text)', NULL, true),
        ('profiles', 'tenant_isolation_profiles', 'SELECT', 'PERMISSIVE', ARRAY['public'], '(tenant_id = get_current_tenant_id())', NULL, true),
        ('profiles', 'update_own_profile', 'UPDATE', 'PERMISSIVE', ARRAY['public'], '(id = auth.uid())', NULL, true),
        ('profiles', 'users_can_read_own_profile', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'id = auth.uid()', NULL, true),
        ('provider_configs', 'provider_configs_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('service_configs', 'recovery_service_configs_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('service_configs', 'recovery_service_configs_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('service_configs', 'recovery_service_configs_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('service_configs', 'recovery_service_configs_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('service_configs', 'service_configs_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('service_configs', 'service_configs_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('service_configs', 'service_configs_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('service_configs', 'service_configs_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('service_configs', 'tenant_isolation_service_configs', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('system_error_logs', 'system_error_logs_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('tasks', 'recovery_tasks_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', NULL, false),
        ('tasks', 'recovery_tasks_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND ( lead_id IS NULL OR EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id ) )', false),
        ('tasks', 'recovery_tasks_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('tasks', 'recovery_tasks_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND ( lead_id IS NULL OR EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id ) )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') ) AND ( lead_id IS NULL OR EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id ) )', false),
        ('tasks', 'tasks_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('tasks', 'tasks_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id)', NULL, false),
        ('tasks', 'tasks_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id) AND ( lead_id IS NULL OR EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id ) )', false),
        ('tasks', 'tasks_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('tasks', 'tasks_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_can_write(tenant_id) AND ( lead_id IS NULL OR EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id ) )', 'public.crm_user_can_write(tenant_id) AND ( lead_id IS NULL OR EXISTS ( SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id ) )', false),
        ('templates', 'recovery_templates_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', NULL, false),
        ('templates', 'recovery_templates_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('templates', 'recovery_templates_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('templates', 'recovery_templates_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('templates', 'templates_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('templates', 'templates_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('templates', 'templates_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('templates', 'templates_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('templates', 'tenant_isolation_templates', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('tenant_settings', 'recovery_tenant_settings_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('tenant_settings', 'recovery_tenant_settings_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'') )', false),
        ('tenant_settings', 'tenant_isolation_tenant_settings', 'ALL', 'PERMISSIVE', ARRAY['public'], '((tenant_id = get_current_tenant_id()) OR (get_my_role() = ''super_admin''::text))', NULL, true),
        ('tenant_settings', 'tenant_settings_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('tenant_settings', 'tenant_settings_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('tenants', 'recovery_tenants_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('tenants', 'tenants_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('tenants', 'tenants_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(id)', NULL, false),
        ('tenants', 'tenants_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(id)', 'public.crm_user_is_tenant_admin(id)', false),
        ('timeline_events', 'recovery_timeline_events_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'tenant_id IN ( SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''manager'', ''sales'', ''support'') )', false),
        ('timeline_events', 'recovery_timeline_events_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())', NULL, false),
        ('timeline_events', 'timeline_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('timeline_events', 'timeline_events_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_can_write(tenant_id)', false),
        ('timeline_events', 'timeline_events_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('users_roles', 'recovery_users_roles_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'user_id = auth.uid()', NULL, false),
        ('users_roles', 'users_can_read_own_role', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'user_id = auth.uid()', NULL, true),
        ('users_roles', 'users_roles_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true),
        ('users_roles', 'users_roles_delete', 'DELETE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', NULL, false),
        ('users_roles', 'users_roles_insert', 'INSERT', 'PERMISSIVE', ARRAY['authenticated'], NULL, 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('users_roles', 'users_roles_select', 'SELECT', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_has_tenant_access(tenant_id)', NULL, false),
        ('users_roles', 'users_roles_update', 'UPDATE', 'PERMISSIVE', ARRAY['authenticated'], 'public.crm_user_is_tenant_admin(tenant_id)', 'public.crm_user_is_tenant_admin(tenant_id)', false),
        ('webhook_logs', 'webhook_logs_all', 'ALL', 'PERMISSIVE', ARRAY['public'], 'true', NULL, true);

    DECLARE
        v_pol RECORD;
        v_matched RECORD;
    BEGIN
        -- Check every active policy on the 29 CRM tables against the approved catalog
        FOR v_pol IN
            SELECT p.schemaname, p.tablename, p.policyname, p.roles, p.cmd, p.permissive, p.qual, p.with_check
            FROM pg_policies p
            WHERE p.schemaname = 'public'
              AND p.tablename IN (
                'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
                'conversations', 'messages', 'timeline_events', 'tasks', 
                'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
                'templates', 'automations', 'automation_rules', 'notifications', 
                'message_events', 'tenant_settings', 'service_configs', 'faqs', 
                'flow_analytics', 'provider_configs', 'webhook_logs', 
                'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
                'ai_prompts'
              )
        LOOP
            -- 1. Exact Tuple Check: (tablename, policyname, cmd) MUST exist in the approved catalog
            SELECT * INTO v_matched
            FROM _approved_crm_policies
            WHERE tablename = v_pol.tablename 
              AND policyname = v_pol.policyname 
              AND cmd = v_pol.cmd;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Recovery Aborted: Exact policy-definition drift detected. Policy "%" on table "public.%" with cmd "%" is not in the approved CRM catalog baseline. Aborting recovery.',
                    v_pol.policyname, v_pol.tablename, v_pol.cmd;
            END IF;

            -- 2. Permissive Status Conformance
            IF v_pol.permissive != v_matched.permissive THEN
                RAISE EXCEPTION 'Recovery Aborted: Policy "%" on table "public.%" has permissive status "%" (expected "%"). Aborting recovery.',
                    v_pol.policyname, v_pol.tablename, v_pol.permissive, v_matched.permissive;
            END IF;

            -- 3. Target Roles Conformance
            IF NOT (v_pol.roles = v_matched.roles) THEN
                RAISE EXCEPTION 'Recovery Aborted: Policy "%" on table "public.%" grants access to unapproved roles "%" (expected "%"). Aborting recovery.',
                    v_pol.policyname, v_pol.tablename, v_pol.roles, v_matched.roles;
            END IF;

            -- 4. USING (qual) Expression Exact Conformance Check
            IF v_matched.qual_exact IS NULL THEN
                IF v_pol.qual IS NOT NULL THEN
                    RAISE EXCEPTION 'Recovery Aborted: Policy "%" on table "public.%" has unexpected USING expression "%" (expected NULL). Aborting recovery.',
                        v_pol.policyname, v_pol.tablename, v_pol.qual;
                END IF;
            ELSE
                IF v_pol.qual IS NULL OR 
                   pg_temp.crm_normalize_policy_expr(v_pol.qual) != pg_temp.crm_normalize_policy_expr(v_matched.qual_exact) THEN
                    RAISE EXCEPTION 'Recovery Aborted: Exact policy-expression drift detected on policy "%" on table "public.%". Actual USING: "%" (normalized: "%"), Expected: "%" (normalized: "%"). Aborting recovery.',
                        v_pol.policyname, v_pol.tablename, v_pol.qual, pg_temp.crm_normalize_policy_expr(v_pol.qual),
                        v_matched.qual_exact, pg_temp.crm_normalize_policy_expr(v_matched.qual_exact);
                END IF;
            END IF;

            -- 5. WITH CHECK Expression Exact Conformance Check
            IF v_matched.with_check_exact IS NULL THEN
                IF v_pol.with_check IS NOT NULL THEN
                    RAISE EXCEPTION 'Recovery Aborted: Policy "%" on table "public.%" has unexpected WITH CHECK expression "%" (expected NULL). Aborting recovery.',
                        v_pol.policyname, v_pol.tablename, v_pol.with_check;
                END IF;
            ELSE
                IF v_pol.with_check IS NULL OR 
                   pg_temp.crm_normalize_policy_expr(v_pol.with_check) != pg_temp.crm_normalize_policy_expr(v_matched.with_check_exact) THEN
                    RAISE EXCEPTION 'Recovery Aborted: Exact policy-expression drift detected on policy "%" on table "public.%". Actual WITH CHECK: "%" (normalized: "%"), Expected: "%" (normalized: "%"). Aborting recovery.',
                        v_pol.policyname, v_pol.tablename, v_pol.with_check, pg_temp.crm_normalize_policy_expr(v_pol.with_check),
                        v_matched.with_check_exact, pg_temp.crm_normalize_policy_expr(v_matched.with_check_exact);
                END IF;
            END IF;

            -- 6. Append-Only Integrity Check on timeline_events
            IF v_pol.tablename = 'timeline_events' AND v_pol.cmd IN ('UPDATE', 'DELETE') THEN
                RAISE EXCEPTION 'Recovery Aborted: Unapproved mutation policy "%" (cmd: %) detected on append-only table timeline_events. Aborting.',
                    v_pol.policyname, v_pol.cmd;
            END IF;
            IF v_pol.tablename = 'timeline_events' AND v_pol.cmd = 'ALL' AND v_pol.policyname != 'timeline_all' THEN
                RAISE EXCEPTION 'Recovery Aborted: Unapproved ALL policy "%" detected on append-only table timeline_events. Aborting.',
                    v_pol.policyname;
            END IF;
        END LOOP;
    END;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ENUMERATED REMOVAL OF EXACT MIGRATION 0032 POLICIES
-- ----------------------------------------------------------------------------

-- Drop legacy open policies on secret tables to achieve complete isolation
DROP POLICY IF EXISTS "provider_configs_all" ON public.provider_configs;
DROP POLICY IF EXISTS "webhook_logs_all" ON public.webhook_logs;
DROP POLICY IF EXISTS "background_jobs_all" ON public.background_jobs;
DROP POLICY IF EXISTS "job_queue_all" ON public.job_queue;
DROP POLICY IF EXISTS "tenant_isolation_job_queue" ON public.job_queue;
DROP POLICY IF EXISTS "audit_logs_all" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "system_error_logs_all" ON public.system_error_logs;
DROP POLICY IF EXISTS "ai_prompts_all" ON public.ai_prompts;


-- Drop legacy open policies across operational tables to enforce secure baseline
DROP POLICY IF EXISTS "tenants_all" ON public.tenants;
DROP POLICY IF EXISTS "users_roles_all" ON public.users_roles;
DROP POLICY IF EXISTS "leads_all" ON public.leads;
DROP POLICY IF EXISTS "bhash_leads_all" ON public.leads;
DROP POLICY IF EXISTS "conversations_all" ON public.conversations;
DROP POLICY IF EXISTS "messages_all" ON public.messages;
DROP POLICY IF EXISTS "timeline_all" ON public.timeline_events;
DROP POLICY IF EXISTS "tasks_all" ON public.tasks;
DROP POLICY IF EXISTS "lead_notes_all" ON public.lead_notes;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

DROP POLICY IF EXISTS "users_roles_select" ON public.users_roles;
DROP POLICY IF EXISTS "users_roles_insert" ON public.users_roles;
DROP POLICY IF EXISTS "users_roles_update" ON public.users_roles;
DROP POLICY IF EXISTS "users_roles_delete" ON public.users_roles;

DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;

DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;

DROP POLICY IF EXISTS "timeline_events_select" ON public.timeline_events;
DROP POLICY IF EXISTS "timeline_events_insert" ON public.timeline_events;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

DROP POLICY IF EXISTS "lead_notes_select" ON public.lead_notes;
DROP POLICY IF EXISTS "lead_notes_insert" ON public.lead_notes;
DROP POLICY IF EXISTS "lead_notes_update" ON public.lead_notes;
DROP POLICY IF EXISTS "lead_notes_delete" ON public.lead_notes;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

DROP POLICY IF EXISTS "handoff_alerts_select" ON public.handoff_alerts;
DROP POLICY IF EXISTS "handoff_alerts_insert" ON public.handoff_alerts;
DROP POLICY IF EXISTS "handoff_alerts_update" ON public.handoff_alerts;
DROP POLICY IF EXISTS "handoff_alerts_delete" ON public.handoff_alerts;

DROP POLICY IF EXISTS "notes_select" ON public.notes;
DROP POLICY IF EXISTS "notes_insert" ON public.notes;
DROP POLICY IF EXISTS "notes_update" ON public.notes;
DROP POLICY IF EXISTS "notes_delete" ON public.notes;

DROP POLICY IF EXISTS "templates_select" ON public.templates;
DROP POLICY IF EXISTS "templates_insert" ON public.templates;
DROP POLICY IF EXISTS "templates_update" ON public.templates;
DROP POLICY IF EXISTS "templates_delete" ON public.templates;

DROP POLICY IF EXISTS "automations_select" ON public.automations;
DROP POLICY IF EXISTS "automations_insert" ON public.automations;
DROP POLICY IF EXISTS "automations_update" ON public.automations;
DROP POLICY IF EXISTS "automations_delete" ON public.automations;

DROP POLICY IF EXISTS "automation_rules_select" ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules_insert" ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules_update" ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules_delete" ON public.automation_rules;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

DROP POLICY IF EXISTS "message_events_select" ON public.message_events;

DROP POLICY IF EXISTS "tenant_settings_select" ON public.tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_update" ON public.tenant_settings;

DROP POLICY IF EXISTS "service_configs_select" ON public.service_configs;
DROP POLICY IF EXISTS "service_configs_insert" ON public.service_configs;
DROP POLICY IF EXISTS "service_configs_update" ON public.service_configs;
DROP POLICY IF EXISTS "service_configs_delete" ON public.service_configs;

DROP POLICY IF EXISTS "faqs_select" ON public.faqs;
DROP POLICY IF EXISTS "faqs_insert" ON public.faqs;
DROP POLICY IF EXISTS "faqs_update" ON public.faqs;
DROP POLICY IF EXISTS "faqs_delete" ON public.faqs;

DROP POLICY IF EXISTS "flow_analytics_select" ON public.flow_analytics;

-- Drops for recovery policies (ensures second execution succeeds idempotently)
DROP POLICY IF EXISTS "recovery_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "recovery_profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "recovery_profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "recovery_users_roles_select" ON public.users_roles;
DROP POLICY IF EXISTS "recovery_tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "recovery_leads_select" ON public.leads;
DROP POLICY IF EXISTS "recovery_leads_insert" ON public.leads;
DROP POLICY IF EXISTS "recovery_leads_update" ON public.leads;
DROP POLICY IF EXISTS "recovery_leads_delete" ON public.leads;
DROP POLICY IF EXISTS "recovery_contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "recovery_contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "recovery_contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "recovery_contacts_delete" ON public.contacts;
DROP POLICY IF EXISTS "recovery_conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "recovery_conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "recovery_conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "recovery_conversations_delete" ON public.conversations;
DROP POLICY IF EXISTS "recovery_messages_select" ON public.messages;
DROP POLICY IF EXISTS "recovery_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "recovery_messages_update" ON public.messages;
DROP POLICY IF EXISTS "recovery_messages_delete" ON public.messages;
DROP POLICY IF EXISTS "recovery_tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "recovery_tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "recovery_tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "recovery_tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "recovery_lead_notes_select" ON public.lead_notes;
DROP POLICY IF EXISTS "recovery_lead_notes_insert" ON public.lead_notes;
DROP POLICY IF EXISTS "recovery_lead_notes_update" ON public.lead_notes;
DROP POLICY IF EXISTS "recovery_lead_notes_delete" ON public.lead_notes;
DROP POLICY IF EXISTS "recovery_timeline_events_select" ON public.timeline_events;
DROP POLICY IF EXISTS "recovery_timeline_events_insert" ON public.timeline_events;
DROP POLICY IF EXISTS "recovery_automation_rules_select" ON public.automation_rules;
DROP POLICY IF EXISTS "recovery_automation_rules_insert" ON public.automation_rules;
DROP POLICY IF EXISTS "recovery_automation_rules_update" ON public.automation_rules;
DROP POLICY IF EXISTS "recovery_automation_rules_delete" ON public.automation_rules;
DROP POLICY IF EXISTS "recovery_message_events_select" ON public.message_events;
DROP POLICY IF EXISTS "recovery_bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "recovery_bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "recovery_bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "recovery_bookings_delete" ON public.bookings;
DROP POLICY IF EXISTS "recovery_handoff_alerts_select" ON public.handoff_alerts;
DROP POLICY IF EXISTS "recovery_handoff_alerts_insert" ON public.handoff_alerts;
DROP POLICY IF EXISTS "recovery_handoff_alerts_update" ON public.handoff_alerts;
DROP POLICY IF EXISTS "recovery_handoff_alerts_delete" ON public.handoff_alerts;
DROP POLICY IF EXISTS "recovery_notes_select" ON public.notes;
DROP POLICY IF EXISTS "recovery_notes_insert" ON public.notes;
DROP POLICY IF EXISTS "recovery_notes_update" ON public.notes;
DROP POLICY IF EXISTS "recovery_notes_delete" ON public.notes;
DROP POLICY IF EXISTS "recovery_templates_select" ON public.templates;
DROP POLICY IF EXISTS "recovery_templates_insert" ON public.templates;
DROP POLICY IF EXISTS "recovery_templates_update" ON public.templates;
DROP POLICY IF EXISTS "recovery_templates_delete" ON public.templates;
DROP POLICY IF EXISTS "recovery_automations_select" ON public.automations;
DROP POLICY IF EXISTS "recovery_automations_insert" ON public.automations;
DROP POLICY IF EXISTS "recovery_automations_update" ON public.automations;
DROP POLICY IF EXISTS "recovery_automations_delete" ON public.automations;
DROP POLICY IF EXISTS "recovery_notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "recovery_notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "recovery_notifications_delete" ON public.notifications;
DROP POLICY IF EXISTS "recovery_tenant_settings_select" ON public.tenant_settings;
DROP POLICY IF EXISTS "recovery_tenant_settings_update" ON public.tenant_settings;
DROP POLICY IF EXISTS "recovery_service_configs_select" ON public.service_configs;
DROP POLICY IF EXISTS "recovery_service_configs_insert" ON public.service_configs;
DROP POLICY IF EXISTS "recovery_service_configs_update" ON public.service_configs;
DROP POLICY IF EXISTS "recovery_service_configs_delete" ON public.service_configs;
DROP POLICY IF EXISTS "recovery_faqs_select" ON public.faqs;
DROP POLICY IF EXISTS "recovery_faqs_insert" ON public.faqs;
DROP POLICY IF EXISTS "recovery_faqs_update" ON public.faqs;
DROP POLICY IF EXISTS "recovery_faqs_delete" ON public.faqs;
DROP POLICY IF EXISTS "recovery_flow_analytics_select" ON public.flow_analytics;

-- ----------------------------------------------------------------------------
-- 3. RESTORE TABLE-SPECIFIC BASELINE ISOLATION POLICIES (NO GENERIC FOR ALL)
-- ----------------------------------------------------------------------------

-- Ensure helper function exists for onboarding validation without RLS recursion
CREATE OR REPLACE FUNCTION public.crm_can_onboard_profile(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND status = 'active') THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.users_roles 
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id
    ) THEN
        RETURN true;
    END IF;

    -- Fail-closed: Arbitrary self-assignment to ANY tenant by ordinary authenticated users is strictly prohibited
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_can_onboard_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_can_onboard_profile(uuid, uuid) TO authenticated, service_role;

-- A. Profiles Baseline: Own profile only
CREATE POLICY "recovery_profiles_select" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "recovery_profiles_insert" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid()
        AND (role IS NULL OR role NOT IN ('super_admin', 'client_admin'))
        AND public.crm_can_onboard_profile(auth.uid(), tenant_id)
    );

CREATE POLICY "recovery_profiles_update" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- B. Roles Baseline: Own role only
CREATE POLICY "recovery_users_roles_select" ON public.users_roles
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- C. Tenants Baseline: Membership tenants only
CREATE POLICY "recovery_tenants_select" ON public.tenants
    FOR SELECT TO authenticated USING (
        id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );

-- D. Primary Operational Entities (Strict RBAC: Writable roles only; viewer cannot mutate)

-- 1. Leads
CREATE POLICY "recovery_leads_select" ON public.leads
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_leads_insert" ON public.leads
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_leads_update" ON public.leads
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_leads_delete" ON public.leads
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 2. Contacts
CREATE POLICY "recovery_contacts_select" ON public.contacts
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_contacts_insert" ON public.contacts
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_contacts_update" ON public.contacts
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_contacts_delete" ON public.contacts
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 3. Conversations
CREATE POLICY "recovery_conversations_select" ON public.conversations
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_conversations_insert" ON public.conversations
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_conversations_update" ON public.conversations
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_conversations_delete" ON public.conversations
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 4. Messages (With Parent Conversation Validation)
CREATE POLICY "recovery_messages_select" ON public.messages
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_messages_insert" ON public.messages
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id
        )
    );
CREATE POLICY "recovery_messages_update" ON public.messages
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id
        )
    );
CREATE POLICY "recovery_messages_delete" ON public.messages
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 5. Tasks (With Parent Lead Validation)
CREATE POLICY "recovery_tasks_select" ON public.tasks
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_tasks_insert" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND (
            lead_id IS NULL OR EXISTS (
                SELECT 1 FROM public.leads l 
                WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id
            )
        )
    );
CREATE POLICY "recovery_tasks_update" ON public.tasks
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND (
            lead_id IS NULL OR EXISTS (
                SELECT 1 FROM public.leads l 
                WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id
            )
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND (
            lead_id IS NULL OR EXISTS (
                SELECT 1 FROM public.leads l 
                WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id
            )
        )
    );
CREATE POLICY "recovery_tasks_delete" ON public.tasks
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );

-- 6. Lead Notes (With Parent Lead Validation)
CREATE POLICY "recovery_lead_notes_select" ON public.lead_notes
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_lead_notes_insert" ON public.lead_notes
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id
        )
    );
CREATE POLICY "recovery_lead_notes_update" ON public.lead_notes
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
        AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id
        )
    );
CREATE POLICY "recovery_lead_notes_delete" ON public.lead_notes
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );

-- 7. Timeline Events (Strict Append-Only: SELECT & INSERT only)
CREATE POLICY "recovery_timeline_events_select" ON public.timeline_events
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_timeline_events_insert" ON public.timeline_events
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );

-- 8. Automation Rules (With Parent Automation Validation)
CREATE POLICY "recovery_automation_rules_select" ON public.automation_rules
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "recovery_automation_rules_insert" ON public.automation_rules
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
        )
    );
CREATE POLICY "recovery_automation_rules_update" ON public.automation_rules
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
        )
    );
CREATE POLICY "recovery_automation_rules_delete" ON public.automation_rules
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND a.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
        )
    );

-- 9. Message Events (With Parent Message Validation)
CREATE POLICY "recovery_message_events_select" ON public.message_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.messages m 
            WHERE m.meta_message_id = message_events.meta_message_id 
              AND m.tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
        )
    );

-- 10. Bookings
CREATE POLICY "recovery_bookings_select" ON public.bookings
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_bookings_insert" ON public.bookings
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_bookings_update" ON public.bookings
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_bookings_delete" ON public.bookings
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 11. Handoff Alerts
CREATE POLICY "recovery_handoff_alerts_select" ON public.handoff_alerts
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_handoff_alerts_insert" ON public.handoff_alerts
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_handoff_alerts_update" ON public.handoff_alerts
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_handoff_alerts_delete" ON public.handoff_alerts
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 12. Notes
CREATE POLICY "recovery_notes_select" ON public.notes
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_notes_insert" ON public.notes
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_notes_update" ON public.notes
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );
CREATE POLICY "recovery_notes_delete" ON public.notes
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
        )
    );

-- 13. Templates
CREATE POLICY "recovery_templates_select" ON public.templates
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_templates_insert" ON public.templates
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_templates_update" ON public.templates
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_templates_delete" ON public.templates
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 14. Automations
CREATE POLICY "recovery_automations_select" ON public.automations
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_automations_insert" ON public.automations
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_automations_update" ON public.automations
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_automations_delete" ON public.automations
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 15. Notifications
CREATE POLICY "recovery_notifications_select" ON public.notifications
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_notifications_update" ON public.notifications
    FOR UPDATE TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    ) WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_notifications_delete" ON public.notifications
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 16. Tenant Settings
CREATE POLICY "recovery_tenant_settings_select" ON public.tenant_settings
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_tenant_settings_update" ON public.tenant_settings
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 17. Service Configs
CREATE POLICY "recovery_service_configs_select" ON public.service_configs
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_service_configs_insert" ON public.service_configs
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_service_configs_update" ON public.service_configs
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_service_configs_delete" ON public.service_configs
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 18. FAQs
CREATE POLICY "recovery_faqs_select" ON public.faqs
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );
CREATE POLICY "recovery_faqs_insert" ON public.faqs
    FOR INSERT TO authenticated WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_faqs_update" ON public.faqs
    FOR UPDATE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ) WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY "recovery_faqs_delete" ON public.faqs
    FOR DELETE TO authenticated USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users_roles 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 19. Flow Analytics
CREATE POLICY "recovery_flow_analytics_select" ON public.flow_analytics
    FOR SELECT TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM public.users_roles WHERE user_id = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- 4. PRESERVE INTEGRITY TRIGGERS AND SECRET-TABLE LOCKDOWN (FORWARD FIX)
-- ----------------------------------------------------------------------------
-- Core triggers (trg_immutability_*, trg_guard_profiles, trg_guard_user_roles,
-- trg_guard_timeline_append_only) remain attached to prevent vulnerability regression.


-- Ensure required integrity trigger helper functions exist in recovery
CREATE OR REPLACE FUNCTION public.crm_is_service_role_caller()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session_user text := session_user;
    v_active_role text;
    v_jwt_role text;
BEGIN
    -- 1. Direct superuser / DBA maintenance sessions (psql, migrations, direct admin pooler)
    -- Must have NO PostgREST JWT role claim attached (guaranteeing it is not an HTTP client request)
    IF v_session_user IN ('postgres', 'supabase_admin') 
       AND NULLIF(current_setting('request.jwt.claim.role', true), '') IS NULL THEN
        RETURN true;
    END IF;

    -- 2. Direct database connection authenticated directly as service_role
    IF v_session_user = 'service_role' THEN
        RETURN true;
    END IF;

    -- 3. PostgREST authentic service_role API requests:
    -- In Supabase PostgREST:
    -- - Initial connection user is always 'authenticator' (session_user = 'authenticator').
    -- - PostgREST validates the signed JWT signature using the project JWT secret.
    -- - PostgREST executes: SET LOCAL ROLE service_role;
    -- - PostgREST sets: SET LOCAL "request.jwt.claim.role" = 'service_role';
    -- Both the active GUC role AND the verified JWT claim must be 'service_role'.
    -- Ordinary users connecting via SQL cannot have session_user = 'authenticator'.
    -- Ordinary users connecting via HTTP have jwt.claim.role = 'authenticated' and active role = 'authenticated'.
    BEGIN
        v_active_role := current_setting('role', true);
        v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');
    EXCEPTION WHEN OTHERS THEN
        v_active_role := NULL;
        v_jwt_role := NULL;
    END;

    IF v_session_user = 'authenticator' 
       AND v_active_role = 'service_role' 
       AND v_jwt_role = 'service_role' THEN
        RETURN true;
    END IF;

    -- Default: fail closed
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_is_service_role_caller() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_is_service_role_caller() TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.crm_guard_tenant_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
        RAISE EXCEPTION 'Security Violation: tenant_id reassignment is permanently prohibited on table %', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_guard_tenant_immutability() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_guard_tenant_immutability() TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.crm_guard_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- Trusted server-side provisioning flows bypass
    IF public.crm_is_service_role_caller() THEN
        RETURN NEW;
    END IF;

    -- 1. INSERT Validation
    IF TG_OP = 'INSERT' THEN
        -- Identity Binding: User can only create profile for their own authenticated UID
        IF NEW.id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Security Violation: Cannot create profile for another user ID (caller: %, target: %)', auth.uid(), NEW.id;
        END IF;

        -- Role Escalation Shield: Cannot self-assign administrative roles on profile creation
        IF NEW.role IS NOT NULL AND NEW.role IN ('super_admin', 'client_admin') THEN
            RAISE EXCEPTION 'Security Violation: Privilege escalation prohibited. Cannot self-assign administrative roles on profile creation';
        END IF;

        -- Default to client_staff if role is NULL
        IF NEW.role IS NULL THEN
            NEW.role := 'client_staff';
        END IF;

        -- Tenant Integrity & Anti-Hijacking Shield
        IF NEW.tenant_id IS NULL OR NOT public.crm_can_onboard_profile(auth.uid(), NEW.tenant_id) THEN
            RAISE EXCEPTION 'Security Violation: Profile must reference an active, authorized tenant';
        END IF;

        RETURN NEW;
    END IF;

    -- 2. UPDATE Validation
    IF TG_OP = 'UPDATE' THEN
        IF OLD.id IS DISTINCT FROM NEW.id THEN
            RAISE EXCEPTION 'Security Violation: Cannot alter profile identity id';
        END IF;
        IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
            RAISE EXCEPTION 'Security Violation: Cannot alter profile tenant_id directly';
        END IF;
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            RAISE EXCEPTION 'Security Violation: Cannot alter profile role directly. Tenant roles are managed via users_roles';
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_guard_profile_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_guard_profile_columns() TO postgres, service_role;

DROP TRIGGER IF EXISTS trg_guard_profiles ON public.profiles;
CREATE TRIGGER trg_guard_profiles
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.crm_guard_profile_columns();

DO $$
DECLARE
    sec_tbls text[] := ARRAY[
        'provider_configs', 'webhook_logs', 'background_jobs', 
        'job_queue', 'audit_logs', 'system_error_logs', 'ai_prompts'
    ];
    crm_all_tbls text[] := ARRAY[
        'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
        'conversations', 'messages', 'timeline_events', 'tasks', 
        'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
        'templates', 'automations', 'automation_rules', 'notifications', 
        'message_events', 'tenant_settings', 'service_configs', 'faqs', 
        'flow_analytics', 'provider_configs', 'webhook_logs', 
        'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
        'ai_prompts'
    ];
    tbl text;
BEGIN
    -- Clean baseline reset on ALL 29 CRM tables before restoring recovery grants
    -- Scoped strictly to crm_all_tbls, preserving Restaurant OS and shared public schema objects
    FOREACH tbl IN ARRAY crm_all_tbls LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role;', tbl);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_compliance_worker') THEN
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM crm_compliance_worker;', tbl);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_compliance_user') THEN
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM crm_compliance_user;', tbl);
        END IF;
    END LOOP;

    -- Explicitly revoke TRUNCATE, REFERENCES, TRIGGER from service_role across ALL 29 CRM tables
    FOREACH tbl IN ARRAY crm_all_tbls LOOP
        EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM service_role;', tbl);
    END LOOP;
END $$;

-- Regrant explicit, tailored server-role privileges on secret tables
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;
GRANT SELECT, INSERT ON TABLE public.system_error_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.webhook_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.background_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_prompts TO service_role;

REVOKE ALL ON TABLE public.timeline_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.timeline_events TO authenticated, service_role;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_compliance_worker') THEN
        REVOKE ALL ON FUNCTION public.crm_purge_timeline_events(uuid, timestamptz, text) FROM crm_compliance_worker;
        REVOKE ALL ON FUNCTION public.crm_legal_purge_timeline_events(uuid, uuid, text) FROM crm_compliance_worker;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. POST-RECOVERY VERIFICATION ASSERTIONS (ALL 29 CRM TABLES)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_open_policies int;
    v_sec_tbl text;
    v_op text;
    crm_operational_tables text[] := ARRAY[
        'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
        'conversations', 'messages', 'timeline_events', 'tasks', 
        'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
        'templates', 'automations', 'automation_rules', 'notifications', 
        'message_events', 'tenant_settings', 'service_configs', 'faqs', 
        'flow_analytics'
    ];
    sec_tables text[] := ARRAY[
        'provider_configs', 'webhook_logs', 'background_jobs', 
        'job_queue', 'audit_logs', 'system_error_logs', 'ai_prompts'
    ];
    table_ops text[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
    v_tbl text;
    v_pol_count int;
BEGIN
    -- Assertion 1: All 22 operational tables must have RLS enabled and at least 1 recovery policy
    FOREACH v_tbl IN ARRAY crm_operational_tables LOOP
        SELECT count(*) INTO v_pol_count 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = v_tbl;

        IF v_pol_count = 0 THEN
            RAISE EXCEPTION 'Recovery Assertion Failed: Operational table public.% has zero active recovery policies', v_tbl;
        END IF;
    END LOOP;

    -- Assertion 1b: Verify recovery_profiles_insert policy exists specifically
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'recovery_profiles_insert'
    ) THEN
        RAISE EXCEPTION 'Recovery Assertion Failed: public.profiles is missing recovery_profiles_insert policy';
    END IF;

    -- Assertion 2: All 7 secret tables must have zero client policies (locked down)
    FOREACH v_sec_tbl IN ARRAY sec_tables LOOP
        SELECT count(*) INTO v_pol_count 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = v_sec_tbl;

        IF v_pol_count > 0 THEN
            RAISE EXCEPTION 'Recovery Assertion Failed: Secret table public.% has % active policies (expected 0)', v_sec_tbl, v_pol_count;
        END IF;

        FOREACH v_op IN ARRAY table_ops LOOP
            IF has_table_privilege('anon', 'public.' || v_sec_tbl, v_op) THEN
                RAISE EXCEPTION 'Recovery Assertion Failed: anon holds % on %', v_op, v_sec_tbl;
            END IF;
            IF has_table_privilege('authenticated', 'public.' || v_sec_tbl, v_op) THEN
                RAISE EXCEPTION 'Recovery Assertion Failed: authenticated holds % on %', v_op, v_sec_tbl;
            END IF;
        END LOOP;
    END LOOP;

    -- Assertion 3: Zero open USING (true) or WITH CHECK (true) policies across all tables
    SELECT count(*) INTO v_open_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(crm_operational_tables)
      AND (qual = 'true' OR with_check = 'true');

    IF v_open_policies > 0 THEN
        RAISE EXCEPTION 'Recovery Assertion Failed: Detected % open USING (true) policies', v_open_policies;
    END IF;

    -- Assertion 4: Strict append-only on timeline_events: zero DELETE privilege
    IF has_table_privilege('service_role', 'public.timeline_events', 'DELETE') OR
       has_table_privilege('authenticated', 'public.timeline_events', 'DELETE') OR
       has_table_privilege('anon', 'public.timeline_events', 'DELETE') THEN
        RAISE EXCEPTION 'Recovery Assertion Failed: Direct DELETE privilege exists on timeline_events';
    END IF;

    -- Assertion 5: service_role holds ZERO TRUNCATE, REFERENCES, TRIGGER on ALL 29 CRM tables
    DECLARE
        v_crm_t text;
        v_unwanted_op text;
        crm_all_tables text[] := ARRAY[
            'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
            'conversations', 'messages', 'timeline_events', 'tasks', 
            'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
            'templates', 'automations', 'automation_rules', 'notifications', 
            'message_events', 'tenant_settings', 'service_configs', 'faqs', 
            'flow_analytics', 'provider_configs', 'webhook_logs', 
            'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
            'ai_prompts'
        ];
    BEGIN
        FOREACH v_crm_t IN ARRAY crm_all_tables LOOP
            FOREACH v_unwanted_op IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('service_role', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Recovery Assertion Failed: service_role holds unintended % privilege on CRM table public.%', v_unwanted_op, v_crm_t;
                END IF;
            END LOOP;
        END LOOP;
    END;

    -- Assertion 6: anon and authenticated hold ZERO TRUNCATE, REFERENCES, TRIGGER on ALL 29 CRM tables
    DECLARE
        v_crm_t text;
        v_unwanted_op text;
        crm_all_tables text[] := ARRAY[
            'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
            'conversations', 'messages', 'timeline_events', 'tasks', 
            'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
            'templates', 'automations', 'automation_rules', 'notifications', 
            'message_events', 'tenant_settings', 'service_configs', 'faqs', 
            'flow_analytics', 'provider_configs', 'webhook_logs', 
            'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
            'ai_prompts'
        ];
    BEGIN
        FOREACH v_crm_t IN ARRAY crm_all_tables LOOP
            FOREACH v_unwanted_op IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('anon', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Recovery Assertion Failed: anon holds unintended % privilege on CRM table public.%', v_unwanted_op, v_crm_t;
                END IF;
                IF has_table_privilege('authenticated', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Recovery Assertion Failed: authenticated holds unintended % privilege on CRM table public.%', v_unwanted_op, v_crm_t;
                END IF;
            END LOOP;
        END LOOP;
    END;

    -- Assertion 7: Verify crm_can_onboard_profile fail-closed behavior (non-destructive)
    -- Verifies that arbitrary non-existent or unauthorized identities fail closed unconditionally
    IF public.crm_can_onboard_profile('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        RAISE EXCEPTION 'Recovery Assertion 7 Failed: crm_can_onboard_profile returned true for non-existent identity';
    END IF;

    -- Assertion 8: Exhaustive audit of service_role and authenticated effective privileges post-recovery
    DECLARE
        v_crm_t text;
        v_unwanted_op text;
        crm_all_tables text[] := ARRAY[
            'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
            'conversations', 'messages', 'timeline_events', 'tasks', 
            'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
            'templates', 'automations', 'automation_rules', 'notifications', 
            'message_events', 'tenant_settings', 'service_configs', 'faqs', 
            'flow_analytics', 'provider_configs', 'webhook_logs', 
            'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
            'ai_prompts'
        ];
    BEGIN
        -- 1. All 29 tables: service_role must hold ZERO TRUNCATE, REFERENCES, TRIGGER
        FOREACH v_crm_t IN ARRAY crm_all_tables LOOP
            FOREACH v_unwanted_op IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('service_role', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Recovery Assertion 8 Failed: service_role holds % on table public.%', v_unwanted_op, v_crm_t;
                END IF;
            END LOOP;
        END LOOP;

        -- 2. timeline_events: service_role and authenticated hold ZERO UPDATE and ZERO DELETE
        IF has_table_privilege('service_role', 'public.timeline_events', 'UPDATE') OR
           has_table_privilege('service_role', 'public.timeline_events', 'DELETE') THEN
            RAISE EXCEPTION 'Recovery Assertion 8 Failed: service_role holds UPDATE or DELETE on timeline_events';
        END IF;
        IF has_table_privilege('authenticated', 'public.timeline_events', 'UPDATE') OR
           has_table_privilege('authenticated', 'public.timeline_events', 'DELETE') THEN
            RAISE EXCEPTION 'Recovery Assertion 8 Failed: authenticated holds UPDATE or DELETE on timeline_events';
        END IF;
    END;
END $$;

COMMIT;
