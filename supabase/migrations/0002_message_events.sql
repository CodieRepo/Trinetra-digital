-- Migration 0002: Message status expansion and message events logging table

-- 1. Alter check constraint on messages table status column
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed'));
ALTER TABLE messages ALTER COLUMN status SET DEFAULT 'queued';

-- 2. Create message_events table
CREATE TABLE IF NOT EXISTS message_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_message_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('send_attempt', 'delivered', 'read', 'failed')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;

-- 4. Enable Tenant isolation policy for message_events
CREATE POLICY tenant_isolation_message_events ON message_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM messages
        WHERE messages.meta_message_id = message_events.meta_message_id
        AND (messages.tenant_id = get_current_tenant_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
    )
);

-- Index for optimizing lookup by meta_message_id
CREATE INDEX IF NOT EXISTS idx_message_events_meta_id ON message_events(meta_message_id);
