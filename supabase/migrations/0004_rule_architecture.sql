-- Migration 0004: Rule and Flow Engine Tables

-- 1. Create tenant_settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    default_language TEXT NOT NULL DEFAULT 'en',
    fallback_provider TEXT NOT NULL DEFAULT 'bhashsms',
    meta_booking_flow_id TEXT,
    n8n_booking_webhook_url TEXT,
    feature_flags JSONB NOT NULL DEFAULT '{"ai_fallback": true, "automated_booking": true, "n8n_notifications": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_tenant_settings UNIQUE(tenant_id)
);

-- 2. Create service_configs table
CREATE TABLE IF NOT EXISTS service_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing_reference TEXT,
    brochure_url TEXT,
    cta_button_text TEXT NOT NULL DEFAULT 'Learn More',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_service_slug_per_tenant UNIQUE(tenant_id, slug)
);

-- 3. Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    keywords TEXT[] NOT NULL,
    answer_template_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create flow_analytics table
CREATE TABLE IF NOT EXISTS flow_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    flow_version TEXT NOT NULL DEFAULT 'A',
    lead_source TEXT,
    step_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create job_queue table
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    error_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Add conversational state columns to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS active_flow TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS flow_state JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS flow_version TEXT NOT NULL DEFAULT 'A';

-- 7. Enable RLS on new tables
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- 8. Create Tenant Isolation Policies (using non-recursive get_my_role helper)
CREATE POLICY tenant_isolation_tenant_settings ON tenant_settings FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_service_configs ON service_configs FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_faqs ON faqs FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_flow_analytics ON flow_analytics FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');
CREATE POLICY tenant_isolation_job_queue ON job_queue FOR ALL USING (tenant_id = get_current_tenant_id() OR get_my_role() = 'super_admin');

-- 9. Create update triggers for modified columns
CREATE TRIGGER trg_update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_service_configs_updated_at BEFORE UPDATE ON service_configs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_job_queue_updated_at BEFORE UPDATE ON job_queue FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 10. Indexes for optimizing Rule Engine lookups and queue runners
CREATE INDEX IF NOT EXISTS idx_service_configs_tenant_slug ON service_configs(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_faqs_tenant_lang ON faqs(tenant_id, language);
CREATE INDEX IF NOT EXISTS idx_job_queue_run_status ON job_queue(status, run_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_flow_analytics_tenant_step ON flow_analytics(tenant_id, step_name);
