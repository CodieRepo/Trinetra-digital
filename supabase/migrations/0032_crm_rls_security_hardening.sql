-- ============================================================================
-- MIGRATION: 0032_crm_rls_security_hardening.sql
-- DESCRIPTION: Trinetra CRM Strict RLS, Immutability & Role Integrity Hardening
-- TRANSACTION: Single atomic transaction
-- ============================================================================

BEGIN;

    -- Ensure 0007 audit_logs columns exist if 0001 initial table preceded 0007
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id uuid;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor text DEFAULT 'System';
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value jsonb;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value jsonb;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address text;

-- ----------------------------------------------------------------------------
-- 1. PREFLIGHT STRUCTURAL VERIFICATION ACROSS ALL 29 CRM TABLES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_missing text;
BEGIN
    SELECT string_agg(expected_tbl, ', ') INTO v_missing
    FROM (
        VALUES 
            ('tenants'), ('profiles'), ('users_roles'), ('contacts'), ('leads'), 
            ('conversations'), ('messages'), ('timeline_events'), ('tasks'), 
            ('lead_notes'), ('bookings'), ('handoff_alerts'), ('notes'), 
            ('templates'), ('automations'), ('automation_rules'), ('notifications'), 
            ('message_events'), ('tenant_settings'), ('service_configs'), ('faqs'), 
            ('flow_analytics'), ('provider_configs'), ('webhook_logs'), 
            ('background_jobs'), ('job_queue'), ('audit_logs'), ('system_error_logs'), 
            ('ai_prompts')
    ) AS t(expected_tbl)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.expected_tbl
    );

    IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION 'Preflight Failure: Missing expected CRM tables: %', v_missing;
    END IF;

    -- Verify critical columns for timeline retention and audit integrity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'timeline_events' AND column_name = 'lead_id'
    ) THEN
        RAISE EXCEPTION 'Preflight Failure: public.timeline_events.lead_id missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'timeline_events' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'Preflight Failure: public.timeline_events.tenant_id missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'new_value'
    ) THEN
        RAISE EXCEPTION 'Preflight Failure: public.audit_logs.new_value missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'Preflight Failure: public.leads.tenant_id missing';
    END IF;

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
                RAISE EXCEPTION 'Preflight Failure: Exact policy-definition drift detected. Policy "%" on table "public.%" with cmd "%" is not in the approved CRM catalog baseline. Aborting migration.',
                    v_pol.policyname, v_pol.tablename, v_pol.cmd;
            END IF;

            -- 2. Permissive Status Conformance
            IF v_pol.permissive != v_matched.permissive THEN
                RAISE EXCEPTION 'Preflight Failure: Policy "%" on table "public.%" has permissive status "%" (expected "%"). Aborting migration.',
                    v_pol.policyname, v_pol.tablename, v_pol.permissive, v_matched.permissive;
            END IF;

            -- 3. Target Roles Conformance
            IF NOT (v_pol.roles = v_matched.roles) THEN
                RAISE EXCEPTION 'Preflight Failure: Policy "%" on table "public.%" grants access to unapproved roles "%" (expected "%"). Aborting migration.',
                    v_pol.policyname, v_pol.tablename, v_pol.roles, v_matched.roles;
            END IF;

            -- 4. USING (qual) Expression Exact Conformance Check
            IF v_matched.qual_exact IS NULL THEN
                IF v_pol.qual IS NOT NULL THEN
                    RAISE EXCEPTION 'Preflight Failure: Policy "%" on table "public.%" has unexpected USING expression "%" (expected NULL). Aborting migration.',
                        v_pol.policyname, v_pol.tablename, v_pol.qual;
                END IF;
            ELSE
                IF v_pol.qual IS NULL OR 
                   pg_temp.crm_normalize_policy_expr(v_pol.qual) != pg_temp.crm_normalize_policy_expr(v_matched.qual_exact) THEN
                    RAISE EXCEPTION 'Preflight Failure: Exact policy-expression drift detected on policy "%" on table "public.%". Actual USING: "%" (normalized: "%"), Expected: "%" (normalized: "%"). Aborting migration.',
                        v_pol.policyname, v_pol.tablename, v_pol.qual, pg_temp.crm_normalize_policy_expr(v_pol.qual),
                        v_matched.qual_exact, pg_temp.crm_normalize_policy_expr(v_matched.qual_exact);
                END IF;
            END IF;

            -- 5. WITH CHECK Expression Exact Conformance Check
            IF v_matched.with_check_exact IS NULL THEN
                IF v_pol.with_check IS NOT NULL THEN
                    RAISE EXCEPTION 'Preflight Failure: Policy "%" on table "public.%" has unexpected WITH CHECK expression "%" (expected NULL). Aborting migration.',
                        v_pol.policyname, v_pol.tablename, v_pol.with_check;
                END IF;
            ELSE
                IF v_pol.with_check IS NULL OR 
                   pg_temp.crm_normalize_policy_expr(v_pol.with_check) != pg_temp.crm_normalize_policy_expr(v_matched.with_check_exact) THEN
                    RAISE EXCEPTION 'Preflight Failure: Exact policy-expression drift detected on policy "%" on table "public.%". Actual WITH CHECK: "%" (normalized: "%"), Expected: "%" (normalized: "%"). Aborting migration.',
                        v_pol.policyname, v_pol.tablename, v_pol.with_check, pg_temp.crm_normalize_policy_expr(v_pol.with_check),
                        v_matched.with_check_exact, pg_temp.crm_normalize_policy_expr(v_matched.with_check_exact);
                END IF;
            END IF;

            -- 6. Append-Only Integrity Check on timeline_events
            IF v_pol.tablename = 'timeline_events' AND v_pol.cmd IN ('UPDATE', 'DELETE') THEN
                RAISE EXCEPTION 'Preflight Failure: Unapproved mutation policy "%" (cmd: %) detected on append-only table timeline_events. Aborting.',
                    v_pol.policyname, v_pol.cmd;
            END IF;
            IF v_pol.tablename = 'timeline_events' AND v_pol.cmd = 'ALL' AND v_pol.policyname != 'timeline_all' THEN
                RAISE EXCEPTION 'Preflight Failure: Unapproved ALL policy "%" detected on append-only table timeline_events. Aborting.',
                    v_pol.policyname;
            END IF;
        END LOOP;
    END;
END $$;

-- ----------------------------------------------------------------------------
-- 2. SECURE CALLER IDENTITY & TRUSTED CONTEXT RESOLUTION (FAIL-CLOSED)
-- Function 1 of 10: crm_is_service_role_caller
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. CORE TENANT ACCESS AND ROLE EVALUATION FUNCTIONS
-- Function 2 of 10: crm_user_has_tenant_access
-- Function 3 of 10: crm_user_can_write
-- Function 4 of 10: crm_user_is_tenant_admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_user_has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.users_roles 
        WHERE user_id = auth.uid() 
          AND tenant_id = p_tenant_id
    );
$$;

CREATE OR REPLACE FUNCTION public.crm_user_can_write(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.users_roles 
        WHERE user_id = auth.uid() 
          AND tenant_id = p_tenant_id
          AND role IN ('owner', 'admin', 'manager', 'sales', 'support')
    );
$$;

CREATE OR REPLACE FUNCTION public.crm_user_is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.users_roles 
        WHERE user_id = auth.uid() 
          AND tenant_id = p_tenant_id
          AND role IN ('owner', 'admin')
    );
$$;

-- Function 4b: crm_can_onboard_profile (Secure tenant validation & anti-hijacking onboarding guard)
-- ARCHITECTURAL SPECIFICATION:
-- First-owner creation for a new tenant is strictly established atomically server-side
-- via service_role credentials (e.g., during CRM Super Admin / provisioning API flows).
-- Ordinary authenticated clients can NEVER self-claim arbitrary tenants, whether unpopulated or populated.
-- For ordinary authenticated users, profile creation is permitted IF AND ONLY IF
-- an authorized membership has ALREADY been established in public.users_roles (e.g. pre-provisioned owner or admin invite).
CREATE OR REPLACE FUNCTION public.crm_can_onboard_profile(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- 1. Target tenant must exist and be active (evaluated via table owner privileges to avoid RLS circular filtering)
    IF NOT EXISTS (
        SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND status = 'active'
    ) THEN
        RETURN false;
    END IF;

    -- 2. Anti-Hijacking Tenant Authorization Shield:
    -- User is authorized to create a profile under this tenant IF AND ONLY IF:
    -- They already have an authorized role row in users_roles (e.g., pre-provisioned owner or invited member):
    IF EXISTS (
        SELECT 1 FROM public.users_roles 
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id
    ) THEN
        RETURN true;
    END IF;

    -- Fail-closed: Arbitrary self-assignment to ANY tenant (whether unpopulated or populated)
    -- by ordinary authenticated users is strictly prohibited.
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_user_has_tenant_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_user_has_tenant_access(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crm_user_can_write(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_user_can_write(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crm_user_is_tenant_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_user_is_tenant_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crm_can_onboard_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_can_onboard_profile(uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. INTEGRITY TRIGGER FUNCTIONS: IMMUTABILITY, PROFILES, RBAC, APPEND-ONLY
-- Function 5 of 10: crm_guard_tenant_immutability
-- Function 6 of 10: crm_guard_profile_columns
-- Function 7 of 10: crm_guard_user_roles_integrity
-- Function 8 of 10: crm_guard_timeline_events_append_only
-- Function 9 of 10: crm_purge_timeline_events
-- Function 10 of 10: crm_legal_purge_timeline_events
-- ----------------------------------------------------------------------------

-- A. Tenant Immutability Trigger Function
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

-- B. Profile Shield Trigger Function (INSERT & UPDATE Protection)
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

-- C. User Roles Integrity Trigger Function
CREATE OR REPLACE FUNCTION public.crm_guard_user_roles_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_role text;
    v_owner_count int;
    v_target_tenant uuid;
BEGIN
    IF public.crm_is_service_role_caller() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_target_tenant := CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.role IS NULL OR NEW.role NOT IN ('owner', 'admin', 'manager', 'sales', 'support', 'viewer') THEN
            RAISE EXCEPTION 'Security Violation: Invalid or unknown role %', NEW.role;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
            RAISE EXCEPTION 'Security Violation: Cannot reassign user_id on users_roles';
        END IF;
        IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
            RAISE EXCEPTION 'Security Violation: Cannot reassign tenant_id on users_roles';
        END IF;
    END IF;

    SELECT role INTO v_caller_role
    FROM public.users_roles
    WHERE user_id = auth.uid() AND tenant_id = v_target_tenant;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'Security Violation: Caller has no active membership in tenant %', v_target_tenant;
    END IF;

    IF (TG_OP IN ('INSERT', 'UPDATE') AND NEW.user_id = auth.uid()) OR (TG_OP = 'DELETE' AND OLD.user_id = auth.uid()) THEN
        IF NOT (TG_OP = 'DELETE' AND v_caller_role = 'owner') THEN
            RAISE EXCEPTION 'Security Violation: Self-elevation or role self-mutation prohibited';
        END IF;
    END IF;

    IF v_caller_role = 'admin' THEN
        IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.role IN ('owner', 'admin') THEN
            RAISE EXCEPTION 'Permission Denied: Admins cannot grant Owner or Admin roles';
        END IF;
        IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.role IN ('owner', 'admin') THEN
            RAISE EXCEPTION 'Permission Denied: Admins cannot modify or revoke Owner or Admin roles';
        END IF;
    ELSIF v_caller_role != 'owner' THEN
        RAISE EXCEPTION 'Permission Denied: Only tenant Owners and Admins may manage roles';
    END IF;

    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN
        PERFORM 1 FROM public.tenants WHERE id = v_target_tenant FOR UPDATE;

        SELECT count(*) INTO v_owner_count
        FROM public.users_roles
        WHERE tenant_id = v_target_tenant AND role = 'owner';

        IF v_owner_count <= 1 THEN
            RAISE EXCEPTION 'Integrity Error: Cannot remove or demote the last remaining Owner for tenant %', v_target_tenant;
        END IF;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_guard_user_roles_integrity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_guard_user_roles_integrity() TO postgres, service_role;

-- D. Append-Only Trigger Function for timeline_events (Defense-in-depth trigger)
CREATE OR REPLACE FUNCTION public.crm_guard_timeline_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token text;
    v_active_audit boolean;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Security Violation: timeline_events records are strictly immutable and cannot be updated';
    END IF;

    IF TG_OP = 'DELETE' THEN
        BEGIN
            v_token := current_setting('crm.purge_authorization_token', true);
        EXCEPTION WHEN OTHERS THEN
            v_token := NULL;
        END;

        IF v_token IS NULL OR length(v_token) < 32 THEN
            RAISE EXCEPTION 'Security Violation: Direct DELETE on timeline_events is prohibited. Deletion requires audited execution of crm_purge_timeline_events() or crm_legal_purge_timeline_events()';
        END IF;

        -- Verify that an audit record with this exact token was registered within this transaction
        SELECT EXISTS (
            SELECT 1 FROM public.audit_logs 
            WHERE action IN ('retention_purge_intent', 'legal_gdpr_purge_intent')
              AND tenant_id = OLD.tenant_id
              AND (new_value->>'purge_token') = v_token
              AND created_at >= (now() - interval '10 seconds')
        ) INTO v_active_audit;

        IF NOT v_active_audit THEN
            RAISE EXCEPTION 'Security Violation: Attempted timeline deletion without verifiable transaction audit record';
        END IF;
    END IF;

    RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_guard_timeline_events_append_only() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_guard_timeline_events_append_only() TO postgres, service_role;

-- Ensure dedicated compliance capability role and worker login user exist with strict NOBYPASSRLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_compliance_worker') THEN
        CREATE ROLE crm_compliance_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    ELSE
        ALTER ROLE crm_compliance_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_compliance_user') THEN
        CREATE ROLE crm_compliance_user LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    ELSE
        ALTER ROLE crm_compliance_user LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
END $$;

-- Explicit CRM-Scoped Privilege Reset: Revoke privileges from compliance roles on exact 29 CRM tables & functions
DO $$
DECLARE
    tbl text;
    crm_tables text[] := ARRAY[
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
    FOREACH tbl IN ARRAY crm_tables LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM crm_compliance_worker, crm_compliance_user;', tbl);
    END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.crm_is_service_role_caller() FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_user_has_tenant_access(uuid) FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_user_can_write(uuid) FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_user_is_tenant_admin(uuid) FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_guard_tenant_immutability() FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_guard_profile_columns() FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_guard_user_roles_integrity() FROM crm_compliance_worker, crm_compliance_user;
REVOKE ALL ON FUNCTION public.crm_guard_timeline_events_append_only() FROM crm_compliance_worker, crm_compliance_user;

GRANT USAGE ON SCHEMA public TO crm_compliance_worker, crm_compliance_user;

GRANT crm_compliance_worker TO crm_compliance_user;

-- E. Audited Ordinary Retention Purge Stored Procedure
CREATE OR REPLACE FUNCTION public.crm_purge_timeline_events(
    p_tenant_id uuid,
    p_older_than timestamptz,
    p_audit_reason text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token text;
    v_intent_audit_id uuid := gen_random_uuid();
    v_deleted_count integer;
    v_actor text;
BEGIN
    -- 1. HTTP PostgREST calls are unconditionally prohibited (must have no JWT role claim)
    IF NULLIF(current_setting('request.jwt.claim.role', true), '') IS NOT NULL THEN
        RAISE EXCEPTION 'Permission Denied: HTTP/API invocation of timeline retention purge is strictly prohibited';
    END IF;

    -- 2. Differentiate and authorize caller identity (DBA vs Dedicated Worker)
    IF session_user = 'postgres' THEN
        v_actor := 'DBA:postgres';
    ELSIF session_user = 'crm_compliance_user' AND pg_has_role('crm_compliance_user', 'crm_compliance_worker', 'MEMBER') THEN
        v_actor := 'ComplianceWorker:' || session_user;
    ELSE
        RAISE EXCEPTION 'Permission Denied: Session user "%" is not authorized to execute timeline retention purges', session_user;
    END IF;

    -- Validate tenant existence
    IF p_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Invalid Parameter: Target tenant ID cannot be NULL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Invalid Parameter: Target tenant % does not exist', p_tenant_id;
    END IF;

    -- Validate cutoff: Cannot be future, must be at least 30 days old for ordinary retention
    IF p_older_than IS NULL THEN
        RAISE EXCEPTION 'Invalid Parameter: Cutoff timestamp is required';
    END IF;
    IF p_older_than > now() THEN
        RAISE EXCEPTION 'Invalid Parameter: Retention cutoff timestamp cannot be in the future';
    END IF;
    IF p_older_than > (now() - interval '30 days') THEN
        RAISE EXCEPTION 'Invalid Parameter: Ordinary retention cutoff must be at least 30 days old. For targeted compliance deletion, use crm_legal_purge_timeline_events()';
    END IF;

    -- Validate meaningful audit reason
    IF p_audit_reason IS NULL OR length(trim(p_audit_reason)) < 15 THEN
        RAISE EXCEPTION 'Invalid Parameter: A meaningful audit reason of at least 15 characters is mandatory';
    END IF;

    -- Generate transaction-scoped cryptographic authorization token
    v_token := encode(gen_random_bytes(32), 'hex');
    PERFORM set_config('crm.purge_authorization_token', v_token, true);

    -- 1. Intent Event (Append-only)
    INSERT INTO public.audit_logs (
        id, tenant_id, entity_type, entity_id, actor, action, ip_address, new_value
    ) VALUES (
        v_intent_audit_id, p_tenant_id, 'timeline_events', v_intent_audit_id, v_actor,
        'retention_purge_intent', 'internal_rpc',
        jsonb_build_object(
            'older_than', p_older_than,
            'reason', p_audit_reason,
            'purge_token', v_token
        )
    );

    -- 2. Execute deletion (procedure runs with table owner privileges)
    DELETE FROM public.timeline_events
    WHERE tenant_id = p_tenant_id AND created_at < p_older_than;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- 3. Completion Event (Append-only: preserves strict immutable audit history without UPDATE)
    INSERT INTO public.audit_logs (
        id, tenant_id, entity_type, entity_id, actor, action, ip_address, new_value
    ) VALUES (
        gen_random_uuid(), p_tenant_id, 'timeline_events', v_intent_audit_id, v_actor,
        'retention_purge_completed', 'internal_rpc',
        jsonb_build_object(
            'intent_audit_id', v_intent_audit_id,
            'older_than', p_older_than,
            'affected_rows', v_deleted_count
        )
    );

    -- Clear transaction token immediately
    PERFORM set_config('crm.purge_authorization_token', '', true);

    RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_purge_timeline_events(uuid, timestamptz, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_purge_timeline_events(uuid, timestamptz, text) TO crm_compliance_worker, postgres;

-- F. Audited Targeted Legal / GDPR Purge Stored Procedure
CREATE OR REPLACE FUNCTION public.crm_legal_purge_timeline_events(
    p_tenant_id uuid,
    p_lead_id uuid,
    p_legal_ticket_ref text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token text;
    v_intent_audit_id uuid := gen_random_uuid();
    v_deleted_count integer;
    v_actor text;
BEGIN
    -- 1. HTTP PostgREST calls are unconditionally prohibited (must have no JWT role claim)
    IF NULLIF(current_setting('request.jwt.claim.role', true), '') IS NOT NULL THEN
        RAISE EXCEPTION 'Permission Denied: HTTP/API invocation of legal purge is strictly prohibited';
    END IF;

    -- 2. Differentiate and authorize caller identity (DBA vs Dedicated Worker)
    IF session_user = 'postgres' THEN
        v_actor := 'DBA:postgres';
    ELSIF session_user = 'crm_compliance_user' AND pg_has_role('crm_compliance_user', 'crm_compliance_worker', 'MEMBER') THEN
        v_actor := 'ComplianceWorker:' || session_user;
    ELSE
        RAISE EXCEPTION 'Permission Denied: Session user "%" is not authorized to execute legal purges', session_user;
    END IF;

    IF p_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Invalid Parameter: Target tenant ID cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Invalid Parameter: Target tenant % does not exist', p_tenant_id;
    END IF;

    IF p_lead_id IS NULL THEN
        RAISE EXCEPTION 'Invalid Parameter: Target lead_id is mandatory for legal/GDPR purge';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Invalid Parameter: Target lead % does not exist in tenant %', p_lead_id, p_tenant_id;
    END IF;

    IF p_legal_ticket_ref IS NULL OR length(trim(p_legal_ticket_ref)) < 8 THEN
        RAISE EXCEPTION 'Invalid Parameter: A verifiable legal ticket reference (min 8 chars) is mandatory';
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');
    PERFORM set_config('crm.purge_authorization_token', v_token, true);

    -- 1. Intent Event (Append-only)
    INSERT INTO public.audit_logs (
        id, tenant_id, entity_type, entity_id, actor, action, ip_address, new_value
    ) VALUES (
        v_intent_audit_id, p_tenant_id, 'timeline_events', p_lead_id, v_actor,
        'legal_gdpr_purge_intent', 'internal_rpc',
        jsonb_build_object(
            'lead_id', p_lead_id,
            'ticket_ref', p_legal_ticket_ref,
            'purge_token', v_token
        )
    );

    -- 2. Execute deletion
    DELETE FROM public.timeline_events
    WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- 3. Completion Event (Append-only: preserves strict immutable audit history without UPDATE)
    INSERT INTO public.audit_logs (
        id, tenant_id, entity_type, entity_id, actor, action, ip_address, new_value
    ) VALUES (
        gen_random_uuid(), p_tenant_id, 'timeline_events', p_lead_id, v_actor,
        'legal_gdpr_purge_completed', 'internal_rpc',
        jsonb_build_object(
            'intent_audit_id', v_intent_audit_id,
            'lead_id', p_lead_id,
            'ticket_ref', p_legal_ticket_ref,
            'affected_rows', v_deleted_count
        )
    );

    PERFORM set_config('crm.purge_authorization_token', '', true);

    RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_legal_purge_timeline_events(uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_legal_purge_timeline_events(uuid, uuid, text) TO crm_compliance_worker, postgres;

-- ----------------------------------------------------------------------------
-- 5. ATTACH TRIGGERS (27 TRIGGERS TOTAL)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_guard_profiles ON public.profiles;
CREATE TRIGGER trg_guard_profiles
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.crm_guard_profile_columns();

DROP TRIGGER IF EXISTS trg_guard_user_roles ON public.users_roles;
CREATE TRIGGER trg_guard_user_roles
    BEFORE INSERT OR UPDATE OR DELETE ON public.users_roles
    FOR EACH ROW EXECUTE FUNCTION public.crm_guard_user_roles_integrity();

DROP TRIGGER IF EXISTS trg_guard_timeline_append_only ON public.timeline_events;
CREATE TRIGGER trg_guard_timeline_append_only
    BEFORE UPDATE OR DELETE ON public.timeline_events
    FOR EACH ROW EXECUTE FUNCTION public.crm_guard_timeline_events_append_only();

DO $$
DECLARE
    tbl text;
    crm_tables text[] := ARRAY[
        'contacts', 'leads', 'conversations', 'messages', 'timeline_events', 
        'tasks', 'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
        'templates', 'automations', 'notifications', 'tenant_settings', 
        'service_configs', 'faqs', 'flow_analytics', 'provider_configs', 
        'webhook_logs', 'background_jobs', 'job_queue', 'audit_logs', 
        'system_error_logs', 'ai_prompts'
    ];
BEGIN
    FOREACH tbl IN ARRAY crm_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'trg_immutability_' || tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE OF tenant_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.crm_guard_tenant_immutability();',
            'trg_immutability_' || tbl, tbl
        );
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 6. PRE-EMPTIVE PRIVILEGE CLEANUP & POLICY RESET ON ALL 29 CRM TABLES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    crm_tables text[] := ARRAY[
        'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
        'conversations', 'messages', 'timeline_events', 'tasks', 
        'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
        'templates', 'automations', 'automation_rules', 'notifications', 
        'message_events', 'tenant_settings', 'service_configs', 'faqs', 
        'flow_analytics', 'provider_configs', 'webhook_logs', 
        'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
        'ai_prompts'
    ];
    t text;
BEGIN
    -- Clean baseline reset: REVOKE ALL on all 29 CRM tables from PUBLIC, anon, authenticated, service_role, and compliance roles
    -- Scoped strictly to the CRM allowlist (crm_tables), preserving Restaurant OS and other public schema objects
    FOREACH t IN ARRAY crm_tables LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role, crm_compliance_worker, crm_compliance_user;', t);
    END LOOP;

    -- Explicitly revoke sequence privileges on verified CRM-owned sequences only (preserving non-CRM sequences)
    FOR r IN (
        SELECT s.relname AS sequence_name, n.nspname AS sequence_schema
        FROM pg_class s
        JOIN pg_namespace n ON n.oid = s.relnamespace
        JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
        JOIN pg_class t ON t.oid = d.refobjid
        WHERE s.relkind = 'S'
          AND n.nspname = 'public'
          AND t.relname = ANY(crm_tables)
    ) LOOP
        EXECUTE format('REVOKE ALL ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated, crm_compliance_worker, crm_compliance_user;', r.sequence_schema, r.sequence_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO service_role;', r.sequence_schema, r.sequence_name);
    END LOOP;

    -- Drop existing policies on CRM tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ANY(crm_tables)
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
    END LOOP;

    FOREACH t IN ARRAY crm_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 7. DEFINE EXPLICIT PER-OPERATION ROW LEVEL SECURITY POLICIES
-- ----------------------------------------------------------------------------

-- --- A. CORE IDENTITY & ACCESS ---

-- 1. tenants
GRANT SELECT, UPDATE ON public.tenants TO authenticated, service_role;
CREATE POLICY "tenants_select" ON public.tenants
    FOR SELECT TO authenticated
    USING (public.crm_user_has_tenant_access(id));

CREATE POLICY "tenants_update" ON public.tenants
    FOR UPDATE TO authenticated
    USING (public.crm_user_is_tenant_admin(id))
    WITH CHECK (public.crm_user_is_tenant_admin(id));

-- 2. profiles (Least-privilege: own profile OR colleagues in same tenant)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, service_role;
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR tenant_id IN (
            SELECT ur.tenant_id 
            FROM public.users_roles ur 
            WHERE ur.user_id = auth.uid()
        )
    );

CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid()
        AND (role IS NULL OR role NOT IN ('super_admin', 'client_admin'))
        AND public.crm_can_onboard_profile(auth.uid(), tenant_id)
    );

CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 3. users_roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users_roles TO authenticated, service_role;
CREATE POLICY "users_roles_select" ON public.users_roles
    FOR SELECT TO authenticated
    USING (public.crm_user_has_tenant_access(tenant_id));

CREATE POLICY "users_roles_insert" ON public.users_roles
    FOR INSERT TO authenticated
    WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));

CREATE POLICY "users_roles_update" ON public.users_roles
    FOR UPDATE TO authenticated
    USING (public.crm_user_is_tenant_admin(tenant_id))
    WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));

CREATE POLICY "users_roles_delete" ON public.users_roles
    FOR DELETE TO authenticated
    USING (public.crm_user_is_tenant_admin(tenant_id));

-- --- B. PRIMARY OPERATIONAL CRM TABLES ---

-- 4. contacts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated, service_role;
CREATE POLICY "contacts_select" ON public.contacts
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "contacts_insert" ON public.contacts
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "contacts_update" ON public.contacts
    FOR UPDATE TO authenticated USING (public.crm_user_can_write(tenant_id)) WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "contacts_delete" ON public.contacts
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 5. leads
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated, service_role;
CREATE POLICY "leads_select" ON public.leads
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "leads_insert" ON public.leads
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "leads_update" ON public.leads
    FOR UPDATE TO authenticated USING (public.crm_user_can_write(tenant_id)) WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "leads_delete" ON public.leads
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 6. conversations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated, service_role;
CREATE POLICY "conversations_select" ON public.conversations
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "conversations_insert" ON public.conversations
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "conversations_update" ON public.conversations
    FOR UPDATE TO authenticated USING (public.crm_user_can_write(tenant_id)) WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "conversations_delete" ON public.conversations
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 7. messages (Parent conversation in same tenant on INSERT and UPDATE)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated, service_role;
CREATE POLICY "messages_select" ON public.messages
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "messages_insert" ON public.messages
    FOR INSERT TO authenticated WITH CHECK (
        public.crm_user_can_write(tenant_id)
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id
        )
    );
CREATE POLICY "messages_update" ON public.messages
    FOR UPDATE TO authenticated
    USING (
        public.crm_user_can_write(tenant_id)
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id
        )
    )
    WITH CHECK (
        public.crm_user_can_write(tenant_id)
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.tenant_id = messages.tenant_id
        )
    );
CREATE POLICY "messages_delete" ON public.messages
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 8. timeline_events (STRICT APPEND-ONLY: zero DELETE privilege for service_role or authenticated)
REVOKE ALL ON TABLE public.timeline_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.timeline_events TO authenticated, service_role;
CREATE POLICY "timeline_events_select" ON public.timeline_events
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "timeline_events_insert" ON public.timeline_events
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));

-- 9. tasks (Parent lead in same tenant on INSERT and UPDATE)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated, service_role;
CREATE POLICY "tasks_select" ON public.tasks
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "tasks_insert" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (
        public.crm_user_can_write(tenant_id)
        AND (
            lead_id IS NULL OR EXISTS (
                SELECT 1 FROM public.leads l 
                WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id
            )
        )
    );
CREATE POLICY "tasks_update" ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        public.crm_user_can_write(tenant_id)
        AND (
            lead_id IS NULL OR EXISTS (
                SELECT 1 FROM public.leads l 
                WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id
            )
        )
    )
    WITH CHECK (
        public.crm_user_can_write(tenant_id)
        AND (
            lead_id IS NULL OR EXISTS (
                SELECT 1 FROM public.leads l 
                WHERE l.id = lead_id AND l.tenant_id = tasks.tenant_id
            )
        )
    );
CREATE POLICY "tasks_delete" ON public.tasks
    FOR DELETE TO authenticated USING (public.crm_user_can_write(tenant_id));

-- 10. lead_notes (Parent lead in same tenant on INSERT and UPDATE)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated, service_role;
CREATE POLICY "lead_notes_select" ON public.lead_notes
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "lead_notes_insert" ON public.lead_notes
    FOR INSERT TO authenticated WITH CHECK (
        public.crm_user_can_write(tenant_id)
        AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id
        )
    );
CREATE POLICY "lead_notes_update" ON public.lead_notes
    FOR UPDATE TO authenticated
    USING (
        public.crm_user_can_write(tenant_id)
        AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id
        )
    )
    WITH CHECK (
        public.crm_user_can_write(tenant_id)
        AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = lead_id AND l.tenant_id = lead_notes.tenant_id
        )
    );
CREATE POLICY "lead_notes_delete" ON public.lead_notes
    FOR DELETE TO authenticated USING (public.crm_user_can_write(tenant_id));

-- 11. bookings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated, service_role;
CREATE POLICY "bookings_select" ON public.bookings
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "bookings_insert" ON public.bookings
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "bookings_update" ON public.bookings
    FOR UPDATE TO authenticated USING (public.crm_user_can_write(tenant_id)) WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "bookings_delete" ON public.bookings
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 12. handoff_alerts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handoff_alerts TO authenticated, service_role;
CREATE POLICY "handoff_alerts_select" ON public.handoff_alerts
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "handoff_alerts_insert" ON public.handoff_alerts
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "handoff_alerts_update" ON public.handoff_alerts
    FOR UPDATE TO authenticated USING (public.crm_user_can_write(tenant_id)) WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "handoff_alerts_delete" ON public.handoff_alerts
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 13. notes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated, service_role;
CREATE POLICY "notes_select" ON public.notes
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "notes_insert" ON public.notes
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "notes_update" ON public.notes
    FOR UPDATE TO authenticated USING (public.crm_user_can_write(tenant_id)) WITH CHECK (public.crm_user_can_write(tenant_id));
CREATE POLICY "notes_delete" ON public.notes
    FOR DELETE TO authenticated USING (public.crm_user_can_write(tenant_id));

-- 14. templates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated, service_role;
CREATE POLICY "templates_select" ON public.templates
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "templates_insert" ON public.templates
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "templates_update" ON public.templates
    FOR UPDATE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id)) WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "templates_delete" ON public.templates
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 15. automations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated, service_role;
CREATE POLICY "automations_select" ON public.automations
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "automations_insert" ON public.automations
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "automations_update" ON public.automations
    FOR UPDATE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id)) WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "automations_delete" ON public.automations
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 16. automation_rules (Checked via parent automation relation)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated, service_role;
CREATE POLICY "automation_rules_select" ON public.automation_rules
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND public.crm_user_has_tenant_access(a.tenant_id)
        )
    );
CREATE POLICY "automation_rules_insert" ON public.automation_rules
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND public.crm_user_is_tenant_admin(a.tenant_id)
        )
    );
CREATE POLICY "automation_rules_update" ON public.automation_rules
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND public.crm_user_is_tenant_admin(a.tenant_id)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND public.crm_user_is_tenant_admin(a.tenant_id)
        )
    );
CREATE POLICY "automation_rules_delete" ON public.automation_rules
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.automations a 
            WHERE a.id = automation_rules.automation_id 
              AND public.crm_user_is_tenant_admin(a.tenant_id)
        )
    );

-- 17. notifications (Scoped to authenticated tenant members with admin delete authority)
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated, service_role;
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT TO authenticated
    USING (public.crm_user_has_tenant_access(tenant_id));

CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (public.crm_user_has_tenant_access(tenant_id))
    WITH CHECK (public.crm_user_has_tenant_access(tenant_id));

CREATE POLICY "notifications_delete" ON public.notifications
    FOR DELETE TO authenticated
    USING (public.crm_user_is_tenant_admin(tenant_id));

-- 18. message_events (Checked via parent message)
GRANT SELECT ON public.message_events TO authenticated, service_role;
CREATE POLICY "message_events_select" ON public.message_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.messages m 
            WHERE m.meta_message_id = message_events.meta_message_id 
              AND public.crm_user_has_tenant_access(m.tenant_id)
        )
    );

-- 19. tenant_settings
GRANT SELECT, UPDATE ON public.tenant_settings TO authenticated, service_role;
CREATE POLICY "tenant_settings_select" ON public.tenant_settings
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "tenant_settings_update" ON public.tenant_settings
    FOR UPDATE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id)) WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));

-- 20. service_configs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_configs TO authenticated, service_role;
CREATE POLICY "service_configs_select" ON public.service_configs
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "service_configs_insert" ON public.service_configs
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "service_configs_update" ON public.service_configs
    FOR UPDATE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id)) WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "service_configs_delete" ON public.service_configs
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 21. faqs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated, service_role;
CREATE POLICY "faqs_select" ON public.faqs
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));
CREATE POLICY "faqs_insert" ON public.faqs
    FOR INSERT TO authenticated WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "faqs_update" ON public.faqs
    FOR UPDATE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id)) WITH CHECK (public.crm_user_is_tenant_admin(tenant_id));
CREATE POLICY "faqs_delete" ON public.faqs
    FOR DELETE TO authenticated USING (public.crm_user_is_tenant_admin(tenant_id));

-- 22. flow_analytics
GRANT SELECT ON public.flow_analytics TO authenticated, service_role;
CREATE POLICY "flow_analytics_select" ON public.flow_analytics
    FOR SELECT TO authenticated USING (public.crm_user_has_tenant_access(tenant_id));

-- --- C. BACKEND INFRASTRUCTURE & SECRET TABLES (LOCKED DOWN) ---
-- Tailored, least-privilege server grants only (no client grants)
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;
GRANT SELECT, INSERT ON TABLE public.system_error_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.webhook_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.background_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_prompts TO service_role;

-- ----------------------------------------------------------------------------
-- 8. COMPREHENSIVE POST-MIGRATION VERIFICATION ASSERTIONS (ALL 29 TABLES)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_open_policies int;
    v_rls_missing int;
    v_sec_tbl text;
    v_op text;
    crm_tables text[] := ARRAY[
        'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
        'conversations', 'messages', 'timeline_events', 'tasks', 
        'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
        'templates', 'automations', 'automation_rules', 'notifications', 
        'message_events', 'tenant_settings', 'service_configs', 'faqs', 
        'flow_analytics', 'provider_configs', 'webhook_logs', 
        'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
        'ai_prompts'
    ];
    sec_tables text[] := ARRAY[
        'provider_configs', 'webhook_logs', 'background_jobs', 
        'job_queue', 'audit_logs', 'system_error_logs', 'ai_prompts'
    ];
    table_ops text[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
BEGIN
    -- Assertion 1: All 29 CRM tables must have RLS enabled
    SELECT count(*) INTO v_rls_missing
    FROM pg_tables
    WHERE schemaname = 'public' 
      AND tablename = ANY(crm_tables)
      AND rowsecurity = false;

    IF v_rls_missing > 0 THEN
        RAISE EXCEPTION 'Assertion failed: % CRM tables lack RLS', v_rls_missing;
    END IF;

    -- Assertion 2: Zero open USING (true) or WITH CHECK (true) policies
    SELECT count(*) INTO v_open_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(crm_tables)
      AND (qual = 'true' OR with_check = 'true');

    IF v_open_policies > 0 THEN
        RAISE EXCEPTION 'Assertion failed: Detected % open USING (true) policies', v_open_policies;
    END IF;

    -- Assertion 3: Comprehensive effective privilege audit on all 7 secret tables
    FOREACH v_sec_tbl IN ARRAY sec_tables LOOP
        FOREACH v_op IN ARRAY table_ops LOOP
            IF has_table_privilege('anon', 'public.' || v_sec_tbl, v_op) THEN
                RAISE EXCEPTION 'Assertion failed: anon holds % on %', v_op, v_sec_tbl;
            END IF;
            IF has_table_privilege('authenticated', 'public.' || v_sec_tbl, v_op) THEN
                RAISE EXCEPTION 'Assertion failed: authenticated holds % on %', v_op, v_sec_tbl;
            END IF;
        END LOOP;
    END LOOP;

    -- Assertion 3b: Verify zero column-level privileges on sensitive columns
    IF has_column_privilege('anon', 'public.provider_configs', 'config_json', 'SELECT') OR
       has_column_privilege('authenticated', 'public.provider_configs', 'config_json', 'SELECT') OR
       has_column_privilege('anon', 'public.webhook_logs', 'payload', 'SELECT') OR
       has_column_privilege('authenticated', 'public.webhook_logs', 'payload', 'SELECT') OR
       has_column_privilege('anon', 'public.audit_logs', 'new_value', 'SELECT') OR
       has_column_privilege('authenticated', 'public.audit_logs', 'new_value', 'SELECT') THEN
        RAISE EXCEPTION 'Assertion failed: Column-level privilege leak detected on secret tables';
    END IF;

    -- Assertion 4: Verify internal functions cannot be executed by anon or authenticated
    IF has_function_privilege('anon', 'public.crm_is_service_role_caller()', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_is_service_role_caller()', 'EXECUTE') OR
       has_function_privilege('anon', 'public.crm_guard_tenant_immutability()', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_guard_tenant_immutability()', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_guard_profile_columns()', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_guard_user_roles_integrity()', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_guard_timeline_events_append_only()', 'EXECUTE') OR
       has_function_privilege('anon', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       has_function_privilege('anon', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Assertion failed: Effective privilege leak detected on internal functions';
    END IF;

    -- Assertion 5: Verify intended RLS helpers ARE executable by authenticated
    IF NOT has_function_privilege('authenticated', 'public.crm_user_has_tenant_access(uuid)', 'EXECUTE') OR
       NOT has_function_privilege('authenticated', 'public.crm_user_can_write(uuid)', 'EXECUTE') OR
       NOT has_function_privilege('authenticated', 'public.crm_user_is_tenant_admin(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Assertion failed: Intended RLS helpers are not executable by authenticated';
    END IF;

    -- Assertion 6: ELIMINATE DIRECT TIMELINE DELETION (service_role, anon, authenticated, worker hold zero DELETE)
    IF has_table_privilege('service_role', 'public.timeline_events', 'DELETE') OR
       has_table_privilege('authenticated', 'public.timeline_events', 'DELETE') OR
       has_table_privilege('anon', 'public.timeline_events', 'DELETE') OR
       has_table_privilege('crm_compliance_worker', 'public.timeline_events', 'DELETE') OR
       has_table_privilege('crm_compliance_user', 'public.timeline_events', 'DELETE') THEN
        RAISE EXCEPTION 'Assertion failed: Direct DELETE privilege exists on timeline_events';
    END IF;

    -- Assertion 7: timeline_events holds zero UPDATE for anyone except table owner
    IF has_table_privilege('service_role', 'public.timeline_events', 'UPDATE') OR
       has_table_privilege('authenticated', 'public.timeline_events', 'UPDATE') OR
       has_table_privilege('anon', 'public.timeline_events', 'UPDATE') OR
       has_table_privilege('crm_compliance_worker', 'public.timeline_events', 'UPDATE') OR
       has_table_privilege('crm_compliance_user', 'public.timeline_events', 'UPDATE') THEN
        RAISE EXCEPTION 'Assertion failed: UPDATE privilege exists on timeline_events';
    END IF;

    -- Assertion 8: Purge procedures are strictly revoked from service_role, anon, and authenticated
    IF has_function_privilege('service_role', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       has_function_privilege('service_role', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') OR
       has_function_privilege('anon', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       has_function_privilege('anon', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Assertion failed: Purge procedures exposed to unauthorized roles (service_role, anon, or authenticated)';
    END IF;

    -- Assertion 9: Purge procedures ARE executable by authorized offline compliance roles (postgres, crm_compliance_worker, crm_compliance_user)
    IF NOT has_function_privilege('postgres', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       NOT has_function_privilege('postgres', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') OR
       NOT has_function_privilege('crm_compliance_worker', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       NOT has_function_privilege('crm_compliance_worker', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') OR
       NOT has_function_privilege('crm_compliance_user', 'public.crm_purge_timeline_events(uuid,timestamptz,text)', 'EXECUTE') OR
       NOT has_function_privilege('crm_compliance_user', 'public.crm_legal_purge_timeline_events(uuid,uuid,text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Assertion failed: Purge procedures not executable by authorized compliance roles';
    END IF;

    -- Assertion 10: Strict compliance worker role membership verification
    IF NOT pg_has_role('crm_compliance_user', 'crm_compliance_worker', 'MEMBER') THEN
        RAISE EXCEPTION 'Assertion failed: crm_compliance_user lacks membership in crm_compliance_worker';
    END IF;
    IF pg_has_role('service_role', 'crm_compliance_worker', 'MEMBER') OR
       pg_has_role('authenticated', 'crm_compliance_worker', 'MEMBER') OR
       pg_has_role('anon', 'crm_compliance_worker', 'MEMBER') THEN
        RAISE EXCEPTION 'Assertion failed: Unauthorized client role has membership in crm_compliance_worker';
    END IF;

    -- Assertion 11: Verify NOBYPASSRLS on compliance roles
    IF EXISTS (
        SELECT 1 FROM pg_roles 
        WHERE rolname IN ('crm_compliance_worker', 'crm_compliance_user') 
          AND rolbypassrls = true
    ) THEN
        RAISE EXCEPTION 'Assertion failed: Compliance role has rolbypassrls enabled';
    END IF;

    -- Assertion 12: Verify compliance worker holds zero ambient table privileges on all 29 CRM tables
    DECLARE
        v_crm_tbl text;
    BEGIN
        FOREACH v_crm_tbl IN ARRAY crm_tables LOOP
            FOREACH v_op IN ARRAY table_ops LOOP
                IF has_table_privilege('crm_compliance_worker', 'public.' || v_crm_tbl, v_op) THEN
                    RAISE EXCEPTION 'Assertion failed: crm_compliance_worker holds % on %', v_op, v_crm_tbl;
                END IF;
                IF has_table_privilege('crm_compliance_user', 'public.' || v_crm_tbl, v_op) THEN
                    RAISE EXCEPTION 'Assertion failed: crm_compliance_user holds % on %', v_op, v_crm_tbl;
                END IF;
            END LOOP;
        END LOOP;
    END;

    -- Assertion 13: Exhaustive audit of service_role least-privilege boundaries on secret tables
    IF has_table_privilege('service_role', 'public.audit_logs', 'DELETE') OR
       has_table_privilege('service_role', 'public.audit_logs', 'UPDATE') OR
       has_table_privilege('service_role', 'public.audit_logs', 'TRUNCATE') OR
       has_table_privilege('service_role', 'public.system_error_logs', 'DELETE') OR
       has_table_privilege('service_role', 'public.system_error_logs', 'UPDATE') OR
       has_table_privilege('service_role', 'public.system_error_logs', 'TRUNCATE') OR
       has_table_privilege('service_role', 'public.webhook_logs', 'DELETE') OR
       has_table_privilege('service_role', 'public.webhook_logs', 'TRUNCATE') THEN
        RAISE EXCEPTION 'Assertion failed: service_role holds unauthorized mutation privileges on audit/error/webhook logs';
    END IF;

    FOREACH v_sec_tbl IN ARRAY sec_tables LOOP
        IF has_table_privilege('service_role', 'public.' || v_sec_tbl, 'TRUNCATE') THEN
            RAISE EXCEPTION 'Assertion failed: service_role holds TRUNCATE on secret table %', v_sec_tbl;
        END IF;
    END LOOP;

    -- Assertion 14: Verify zero sequence privileges for anon, authenticated, and compliance roles on CRM sequences
    DECLARE
        v_seq RECORD;
    BEGIN
        FOR v_seq IN (
            SELECT s.relname AS sequence_name, n.nspname AS sequence_schema
            FROM pg_class s
            JOIN pg_namespace n ON n.oid = s.relnamespace
            JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
            JOIN pg_class t ON t.oid = d.refobjid
            WHERE s.relkind = 'S'
              AND n.nspname = 'public'
              AND t.relname = ANY(ARRAY[
                  'tenants', 'profiles', 'users_roles', 'contacts', 'leads', 
                  'conversations', 'messages', 'timeline_events', 'tasks', 
                  'lead_notes', 'bookings', 'handoff_alerts', 'notes', 
                  'templates', 'automations', 'automation_rules', 'notifications', 
                  'message_events', 'tenant_settings', 'service_configs', 'faqs', 
                  'flow_analytics', 'provider_configs', 'webhook_logs', 
                  'background_jobs', 'job_queue', 'audit_logs', 'system_error_logs', 
                  'ai_prompts'
              ])
        ) LOOP
            IF has_sequence_privilege('anon', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'USAGE') OR
               has_sequence_privilege('anon', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'SELECT') OR
               has_sequence_privilege('anon', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'UPDATE') OR
               has_sequence_privilege('authenticated', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'USAGE') OR
               has_sequence_privilege('authenticated', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'SELECT') OR
               has_sequence_privilege('authenticated', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'UPDATE') OR
               has_sequence_privilege('crm_compliance_worker', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'USAGE') OR
               has_sequence_privilege('crm_compliance_user', v_seq.sequence_schema || '.' || v_seq.sequence_name, 'USAGE') THEN
                RAISE EXCEPTION 'Assertion failed: CRM sequence privilege leak detected on %.%', v_seq.sequence_schema, v_seq.sequence_name;
            END IF;
        END LOOP;
    END;

    -- Assertion 15: service_role holds ZERO TRUNCATE, REFERENCES, TRIGGER on ALL 29 CRM tables
    DECLARE
        v_crm_t text;
        v_unwanted_op text;
    BEGIN
        FOREACH v_crm_t IN ARRAY crm_tables LOOP
            FOREACH v_unwanted_op IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('service_role', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Assertion failed: service_role holds unintended % privilege on CRM table public.%', v_unwanted_op, v_crm_t;
                END IF;
            END LOOP;
        END LOOP;
    END;

    -- Assertion 16: anon and authenticated hold ZERO TRUNCATE, REFERENCES, TRIGGER on ALL 29 CRM tables
    DECLARE
        v_crm_t text;
        v_unwanted_op text;
    BEGIN
        FOREACH v_crm_t IN ARRAY crm_tables LOOP
            FOREACH v_unwanted_op IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('anon', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Assertion failed: anon holds unintended % privilege on CRM table public.%', v_unwanted_op, v_crm_t;
                END IF;
                IF has_table_privilege('authenticated', 'public.' || v_crm_t, v_unwanted_op) THEN
                    RAISE EXCEPTION 'Assertion failed: authenticated holds unintended % privilege on CRM table public.%', v_unwanted_op, v_crm_t;
                END IF;
            END LOOP;
        END LOOP;
    END;

    -- Assertion 17: Verify crm_can_onboard_profile fail-closed behavior (non-destructive)
    -- Verifies that arbitrary non-existent or unauthorized identities fail closed unconditionally.
    -- Full six-scenario lifecycle testing is executed in isolated staging to prevent production fixture pollution.
    IF public.crm_can_onboard_profile('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        RAISE EXCEPTION 'Assertion 17 Failed: crm_can_onboard_profile returned true for non-existent identity';
    END IF;

    -- Assertion 18: Exhaustive audit of service_role effective privileges across all 29 CRM tables
    DECLARE
        v_t text;
        v_unwanted text;
    BEGIN
        -- 1. All 29 tables: service_role must hold ZERO TRUNCATE, REFERENCES, TRIGGER
        FOREACH v_t IN ARRAY crm_tables LOOP
            FOREACH v_unwanted IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('service_role', 'public.' || v_t, v_unwanted) THEN
                    RAISE EXCEPTION 'Assertion 18 Failed: service_role holds % on table public.%', v_unwanted, v_t;
                END IF;
            END LOOP;
        END LOOP;

        -- 2. timeline_events: service_role must hold ZERO UPDATE and ZERO DELETE
        IF has_table_privilege('service_role', 'public.timeline_events', 'UPDATE') THEN
            RAISE EXCEPTION 'Assertion 18 Failed: service_role holds UPDATE on append-only table timeline_events';
        END IF;
        IF has_table_privilege('service_role', 'public.timeline_events', 'DELETE') THEN
            RAISE EXCEPTION 'Assertion 18 Failed: service_role holds DELETE on append-only table timeline_events';
        END IF;

        -- 3. audit_logs & system_error_logs: service_role must hold ZERO UPDATE and ZERO DELETE
        FOREACH v_t IN ARRAY ARRAY['audit_logs', 'system_error_logs'] LOOP
            IF has_table_privilege('service_role', 'public.' || v_t, 'UPDATE') OR
               has_table_privilege('service_role', 'public.' || v_t, 'DELETE') THEN
                RAISE EXCEPTION 'Assertion 18 Failed: service_role holds UPDATE or DELETE on immutable log table public.%', v_t;
            END IF;
        END LOOP;

        -- 4. webhook_logs: service_role must hold ZERO DELETE
        IF has_table_privilege('service_role', 'public.webhook_logs', 'DELETE') THEN
            RAISE EXCEPTION 'Assertion 18 Failed: service_role holds DELETE on webhook_logs';
        END IF;
    END;

    -- Assertion 19: Exhaustive audit of authenticated and anon effective privileges across all 29 CRM tables
    DECLARE
        v_t text;
        v_op text;
        sec_tbls text[] := ARRAY[
            'provider_configs', 'webhook_logs', 'background_jobs', 
            'job_queue', 'audit_logs', 'system_error_logs', 'ai_prompts'
        ];
    BEGIN
        -- 1. anon holds ZERO privileges on all 29 CRM tables
        FOREACH v_t IN ARRAY crm_tables LOOP
            FOREACH v_op IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('anon', 'public.' || v_t, v_op) THEN
                    RAISE EXCEPTION 'Assertion 19 Failed: anon holds % on table public.%', v_op, v_t;
                END IF;
            END LOOP;
        END LOOP;

        -- 2. authenticated holds ZERO privileges on all 7 secret tables
        FOREACH v_t IN ARRAY sec_tbls LOOP
            FOREACH v_op IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
                IF has_table_privilege('authenticated', 'public.' || v_t, v_op) THEN
                    RAISE EXCEPTION 'Assertion 19 Failed: authenticated holds % on secret table public.%', v_op, v_t;
                END IF;
            END LOOP;
        END LOOP;

        -- 3. authenticated holds ZERO DELETE on timeline_events
        IF has_table_privilege('authenticated', 'public.timeline_events', 'DELETE') THEN
            RAISE EXCEPTION 'Assertion 19 Failed: authenticated holds DELETE on timeline_events';
        END IF;

        -- 4. authenticated holds ZERO INSERT, UPDATE, DELETE on read-only views/tables (message_events, flow_analytics)
        FOREACH v_t IN ARRAY ARRAY['message_events', 'flow_analytics'] LOOP
            FOREACH v_op IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
                IF has_table_privilege('authenticated', 'public.' || v_t, v_op) THEN
                    RAISE EXCEPTION 'Assertion 19 Failed: authenticated holds % on read-only table public.%', v_op, v_t;
                END IF;
            END LOOP;
        END LOOP;
    END;
END $$;

COMMIT;
