-- =========================================================================
-- BhashSMS WhatsApp & CRM Integration System Migration
-- Migration file: 0011_bhash_whatsapp_system.sql
-- =========================================================================

-- 1. Leads Table Upgrades for AI intelligence storage
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_intelligence JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_leads_ai_intelligence ON leads USING GIN (ai_intelligence);

-- 2. Messages Table Upgrades for source, provider and fingerprint idempotency
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'WEBHOOK';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'bhash';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS fingerprint TEXT UNIQUE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS api_response JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_fingerprint ON messages(fingerprint);

-- 3. Templates Table Upgrades for dynamic WhatsApp Utility Templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS variables TEXT[] DEFAULT '{}'::text[];
ALTER TABLE templates ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 4. Enable Realtime Replication for CRM updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bhash_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bhash_conversations;
  END IF;
END $$;
