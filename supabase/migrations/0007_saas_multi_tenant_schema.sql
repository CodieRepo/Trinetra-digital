-- =========================================================================
-- Trinetra CRM - SaaS Multi-Tenant Platform Schema Migration
-- Migration file: 0007_saas_multi_tenant_schema.sql
-- Description: Generic, provider-agnostic, multi-tenant database tables with RLS & Production Safeguards
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. TENANTS (Organizations)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'pro',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default system tenant for backwards compatibility / local dev
INSERT INTO tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default-org')
ON CONFLICT (id) DO NOTHING;

-- 2. USER ROLES (RBAC)
CREATE TABLE IF NOT EXISTS users_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'support', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_tenant_role UNIQUE (user_id, tenant_id)
);

-- 3. LEADS (Single Entity with is_customer flag, soft delete, versioning & FTS)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Lead User',
    email TEXT,
    company TEXT,
    service_interest TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'quotation', 'negotiation', 'won', 'lost')),
    is_customer BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'WhatsApp',
    score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
    lead_temperature TEXT NOT NULL DEFAULT 'warm' CHECK (lead_temperature IN ('hot', 'warm', 'cold')),
    ai_summary TEXT,
    ai_intent TEXT,
    ai_suggested_action TEXT,
    assigned_to TEXT,
    version INTEGER NOT NULL DEFAULT 1, -- Optimistic Concurrency Control
    fts TSVECTOR GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(company, '') || ' ' || coalesce(last_message, ''))
    ) STORED,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CONVERSATIONS (Generic & Provider Agnostic)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    provider TEXT NOT NULL DEFAULT 'bhash',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MESSAGES (Generic & Provider Agnostic)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body TEXT NOT NULL,
    provider_message_id TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TIMELINE EVENTS (Heart of CRM Customer History)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TASKS (First-Class Task System)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'call' CHECK (task_type IN ('call', 'quotation', 'meeting', 'documents', 'payment_followup', 'support_followup')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ NOT NULL,
    assigned_to TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. LEAD NOTES (Private Internal Team Notes)
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Agent',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. WEBHOOK IDEMPOTENCY LOGS (Duplicate Prevention)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'bhash',
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processed', 'failed', 'duplicate')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. BACKGROUND JOBS QUEUE (Durable & Retryable AI Jobs)
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key TEXT UNIQUE NOT NULL,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AUDIT LOGS (System History)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor TEXT NOT NULL DEFAULT 'System',
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. NOTIFICATIONS (Generic Alert Engine)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    channel TEXT NOT NULL DEFAULT 'in_app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. PROVIDER CONFIGS (Cost Control & Feature Flags)
CREATE TABLE IF NOT EXISTS provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    provider_key TEXT NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{"ai_enabled": true, "ai_sampling_rate": 1.0}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider_key)
);

-- 14. AI PROMPTS (Database Managed System Prompts)
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    prompt_key TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    model_name TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.2,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_tenant_prompt UNIQUE (tenant_id, prompt_key)
);

-- 15. SYSTEM ERROR LOGS (Central Observability Logger)
CREATE TABLE IF NOT EXISTS system_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    exception TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- INDEXES FOR HIGH PERFORMANCE (< 50ms Queries & FTS)
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_leads_fts ON leads USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_name ON leads USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_phone ON leads(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_score ON leads(tenant_id, score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(tenant_id, conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_lead_created ON timeline_events(tenant_id, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_due ON tasks(tenant_id, lead_id, due_date ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_key ON webhook_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status, retry_count);

-- Enable RLS across all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_error_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for service role & default tenant access
CREATE POLICY tenants_all ON tenants FOR ALL USING (true);
CREATE POLICY users_roles_all ON users_roles FOR ALL USING (true);
CREATE POLICY leads_all ON leads FOR ALL USING (true);
CREATE POLICY conversations_all ON conversations FOR ALL USING (true);
CREATE POLICY messages_all ON messages FOR ALL USING (true);
CREATE POLICY timeline_all ON timeline_events FOR ALL USING (true);
CREATE POLICY tasks_all ON tasks FOR ALL USING (true);
CREATE POLICY lead_notes_all ON lead_notes FOR ALL USING (true);
CREATE POLICY webhook_logs_all ON webhook_logs FOR ALL USING (true);
CREATE POLICY background_jobs_all ON background_jobs FOR ALL USING (true);
CREATE POLICY audit_logs_all ON audit_logs FOR ALL USING (true);
CREATE POLICY notifications_all ON notifications FOR ALL USING (true);
CREATE POLICY provider_configs_all ON provider_configs FOR ALL USING (true);
CREATE POLICY ai_prompts_all ON ai_prompts FOR ALL USING (true);
CREATE POLICY system_error_logs_all ON system_error_logs FOR ALL USING (true);
