-- Third CRM pipeline list: leads marked "not interested" (distinct from cold outreach).
ALTER TABLE crm_data ADD COLUMN IF NOT EXISTS not_interested_leads JSONB DEFAULT '[]'::jsonb;
