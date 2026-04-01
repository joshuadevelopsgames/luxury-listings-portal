#!/usr/bin/env node
/**
 * Dump all CRM pipeline leads from Supabase `crm_data` (warm, contacted, cold) as JSON.
 *
 * Requires: SUPABASE_URL (or REACT_APP_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   source .env.local && node scripts/dump-crm-leads.mjs
 *   node scripts/dump-crm-leads.mjs --out=crm-leads-dump.json
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const outArg = process.argv.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.slice('--out='.length) : null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set REACT_APP_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await supabase.from('crm_data').select('*').limit(1).maybeSingle();

if (error) {
  console.error('crm_data query failed:', error.message);
  process.exit(1);
}

const payload = {
  warm_leads: data?.warm_leads ?? [],
  contacted_clients: data?.contacted_clients ?? [],
  cold_leads: data?.cold_leads ?? [],
  crm_row_id: data?.id ?? null,
  exported_at: new Date().toISOString(),
  counts: {
    warm: (data?.warm_leads ?? []).length,
    contacted: (data?.contacted_clients ?? []).length,
    cold: (data?.cold_leads ?? []).length,
  },
};

const json = JSON.stringify(payload, null, 2);

if (outPath) {
  writeFileSync(outPath, json, 'utf8');
  console.error(`Wrote ${outPath} (${payload.counts.warm + payload.counts.contacted + payload.counts.cold} total lead records)`);
} else {
  console.log(json);
}
