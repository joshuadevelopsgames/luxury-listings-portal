import { supabase } from '../lib/supabase';

export const crmService = {
  // ── Leads ──────────────────────────────────────────────────────────────────
  async getLeads({ status = null, assignedTo = null } = {}) {
    let query = supabase
      .from('leads')
      .select('*, owner:profiles(id, full_name), converted_client:clients(id, name)')
      .order('score', { ascending: false });

    if (status) query = query.eq('status', status);
    if (assignedTo) query = query.eq('owner_id', assignedTo);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createLead(lead) {
    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateLead(id, updates) {
    const { data, error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async convertToClient(leadId, clientData) {
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    if (clientErr) throw clientErr;

    const { error: leadErr } = await supabase
      .from('leads')
      .update({ status: 'converted', converted_client_id: client.id, converted_at: new Date().toISOString() })
      .eq('id', leadId);
    if (leadErr) throw leadErr;

    return client;
  },

  // ── Pipeline ────────────────────────────────────────────────────────────────
  async getDeals({ stage = null } = {}) {
    let query = supabase
      .from('deals')
      .select('*, lead:leads(id, name, email), owner:profiles(id, full_name)')
      .order('value', { ascending: false });

    if (stage) query = query.eq('stage', stage);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createDeal(deal) {
    const { data, error } = await supabase
      .from('deals')
      .insert(deal)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDeal(id, updates) {
    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPipelineSummary() {
    const { data, error } = await supabase
      .from('deals')
      .select('stage, value, probability')
      .neq('stage', 'closed_lost');
    if (error) throw error;

    return data.reduce((acc, deal) => {
      acc[deal.stage] = acc[deal.stage] || { count: 0, value: 0, weighted: 0 };
      acc[deal.stage].count += 1;
      acc[deal.stage].value += deal.value || 0;
      acc[deal.stage].weighted += (deal.value || 0) * ((deal.probability || 0) / 100);
      return acc;
    }, {});
  },
};

// Stub named exports for legacy / cross-module imports
export const CLIENT_TYPE = { LEAD: 'lead', CLIENT: 'client', PROSPECT: 'prospect' };
export const CLIENT_TYPE_OPTIONS = Object.values(CLIENT_TYPE);
export const CRM_LOCATIONS = [];
export const addContactToCRM = async () => {};
export const getContactTypes = () => Object.values(CLIENT_TYPE);
export const getCrmLeadsForCurrentUser = async () => [];
export const normalizeLocation = (loc) => loc;
export const removeLeadFromCRM = async () => {};
