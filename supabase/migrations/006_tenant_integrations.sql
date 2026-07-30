-- ============================================================================
-- MIGRATION: 006_tenant_integrations.sql
-- DESCRIPTION: Per-tenant Telegram, WhatsApp, and Thermal Printer Configuration
-- ============================================================================

BEGIN;

-- Add Telegram, WhatsApp, and Printer columns to admin_settings table if not present
ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS printer_ip TEXT DEFAULT '192.168.1.200',
  ADD COLUMN IF NOT EXISTS printer_paper_width INT DEFAULT 80,
  ADD COLUMN IF NOT EXISTS printer_auto_print BOOLEAN DEFAULT true;

COMMIT;
