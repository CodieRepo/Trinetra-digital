-- Initial database schema for Trinetra CRM
-- Enable pgcrypto extension for UUID generation and encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    whatsapp_phone_number_id TEXT UNIQUE,
    whatsapp_business_account_id TEXT,
    whatsapp_access_token_encrypted TEXT,
    webhook_verify_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'client_admin', 'client_staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. contacts
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    company TEXT,
    city TEXT,
    service TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ai_qualifying', 'qualified', 'nurturing', 'won', 'lost')),
    ai_enabled BOOLEAN NOT NULL DEFAULT true,
    ai_score INTEGER NOT NULL DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
    ai_summary TEXT,
    intent_level TEXT CHECK (intent_level IN ('HOT', 'WARM', 'COLD', 'QUOTATION_REQUIRED')),
    deal_setup_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deal_mrr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deal_annual_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deal_probability INTEGER NOT NULL DEFAULT 100 CHECK (deal_probability >= 0 AND deal_probability <= 100),
    stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    pipeline_notes TEXT,
    assigned_owner UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_phone_per_tenant UNIQUE (tenant_id, phone)
);

-- 4. conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body TEXT,
    media_url TEXT,
    media_type TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    meta_message_id TEXT UNIQUE,
    error_message TEXT,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    call_type TEXT NOT NULL DEFAULT 'call' CHECK (call_type IN ('call', 'video', 'in_person')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    meeting_link TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. handoff_alerts
CREATE TABLE IF NOT EXISTS handoff_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. automations
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. automation_rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    trigger_event TEXT NOT NULL,
    action_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_lead', 'new_booking', 'handoff_request', 'automation_failed')),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- =========================================================================

-- Automatically update deal_annual_value on insert or update of contacts
CREATE OR REPLACE FUNCTION calculate_deal_annual_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deal_annual_value := NEW.deal_setup_value + (NEW.deal_mrr * 12);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_deal_annual_value
    BEFORE INSERT OR UPDATE OF deal_setup_value, deal_mrr ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_deal_annual_value();

-- Automatically update timestamps functions
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to relevant tables
CREATE TRIGGER trg_update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_handoff_alerts_updated_at BEFORE UPDATE ON handoff_alerts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_update_automations_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) & SECURITY RESOLVER
-- =========================================================================

-- Security helper function to get current user's tenant ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Select the tenant_id mapped to the current authenticated user's ID
    RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY select_own_profile ON profiles FOR SELECT USING (id = auth.uid() OR role = 'super_admin');
CREATE POLICY update_own_profile ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY manage_profiles_as_admin ON profiles FOR ALL USING (tenant_id = get_current_tenant_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'client_admin');
CREATE POLICY super_admin_all_profiles ON profiles FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- Tenant specific tables standard RLS isolation
CREATE POLICY tenant_isolation_profiles ON profiles FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY tenant_isolation_contacts ON contacts FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_conversations ON conversations FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_messages ON messages FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_bookings ON bookings FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_handoff_alerts ON handoff_alerts FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_notes ON notes FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_templates ON templates FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_automations ON automations FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_notifications ON notifications FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY tenant_isolation_audit_logs ON audit_logs FOR ALL USING (tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- Automation Rules isolation (via parent automation relation)
CREATE POLICY tenant_isolation_automation_rules ON automation_rules FOR ALL USING (
    EXISTS (
        SELECT 1 FROM automations 
        WHERE automations.id = automation_rules.automation_id 
        AND (automations.tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
    )
);

-- =========================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone ON contacts(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date ON bookings(tenant_id, preferred_date);
CREATE INDEX IF NOT EXISTS idx_handoff_alerts_tenant_status ON handoff_alerts(tenant_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_read ON notifications(tenant_id, is_read) WHERE is_read = false;
