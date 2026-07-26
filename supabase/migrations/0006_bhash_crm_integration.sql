-- =========================================================================
-- BhashSMS WhatsApp & CRM Integration Migration
-- Migration file: 0006_bhash_crm_integration.sql
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'WhatsApp User',
    service_interest TEXT,
    current_flow_node TEXT NOT NULL DEFAULT '6206',
    last_message TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'nurturing', 'Interested', 'hot', 'converted', 'lost')),
    source TEXT NOT NULL DEFAULT 'WhatsApp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS bhash_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    flow_node TEXT,
    button_clicked TEXT,
    meta_message_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TIMELINE EVENTS TABLE
CREATE TABLE IF NOT EXISTS bhash_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TASKS TABLE
CREATE TABLE IF NOT EXISTS bhash_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ NOT NULL,
    assigned_to TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. NOTES TABLE
CREATE TABLE IF NOT EXISTS bhash_lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Agent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. WEBHOOK LOGS TABLE
CREATE TABLE IF NOT EXISTS bhash_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL DEFAULT 'bhash',
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processed', 'failed', 'duplicate')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- TRIGGERS FOR TIMESTAMP UPDATES
-- =========================================================================

CREATE OR REPLACE FUNCTION update_bhash_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_leads_updated_at ON leads;
CREATE TRIGGER trg_update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW EXECUTE FUNCTION update_bhash_modified_column();

DROP TRIGGER IF EXISTS trg_update_bhash_tasks_updated_at ON bhash_tasks;
CREATE TRIGGER trg_update_bhash_tasks_updated_at 
    BEFORE UPDATE ON bhash_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_bhash_modified_column();

-- =========================================================================
-- INDEXES FOR 100,000+ USER SCALE PERFORMANCE
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_flow_node ON leads(current_flow_node);
CREATE INDEX IF NOT EXISTS idx_leads_last_msg_at ON leads(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_bhash_conversations_lead ON bhash_conversations(lead_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bhash_conversations_meta_id ON bhash_conversations(meta_message_id);

CREATE INDEX IF NOT EXISTS idx_bhash_timeline_lead ON bhash_timeline_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bhash_tasks_lead ON bhash_tasks(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_bhash_notes_lead ON bhash_lead_notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bhash_webhook_logs_key ON bhash_webhook_logs(idempotency_key);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhash_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhash_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhash_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhash_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhash_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow full access for service role and standard authenticated read/write
DROP POLICY IF EXISTS bhash_leads_all ON leads;
CREATE POLICY bhash_leads_all ON leads FOR ALL USING (true);
DROP POLICY IF EXISTS bhash_conv_all ON bhash_conversations;
CREATE POLICY bhash_conv_all ON bhash_conversations FOR ALL USING (true);
DROP POLICY IF EXISTS bhash_timeline_all ON bhash_timeline_events;
CREATE POLICY bhash_timeline_all ON bhash_timeline_events FOR ALL USING (true);
DROP POLICY IF EXISTS bhash_tasks_all ON bhash_tasks;
CREATE POLICY bhash_tasks_all ON bhash_tasks FOR ALL USING (true);
DROP POLICY IF EXISTS bhash_notes_all ON bhash_lead_notes;
CREATE POLICY bhash_notes_all ON bhash_lead_notes FOR ALL USING (true);
DROP POLICY IF EXISTS bhash_webhook_logs_all ON bhash_webhook_logs;
CREATE POLICY bhash_webhook_logs_all ON bhash_webhook_logs FOR ALL USING (true);

-- Enable Supabase Realtime publication for tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads, bhash_conversations, bhash_timeline_events, bhash_tasks, bhash_lead_notes;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Realtime pub might not exist locally or permissions differ
  NULL;
END $$;
