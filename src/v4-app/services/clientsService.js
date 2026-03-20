import { supabase } from '../lib/supabase';

export const clientsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, account_manager:profiles(id, full_name, avatar_url)')
      .order('name');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*, account_manager:profiles(id, full_name, avatar_url), instagram_reports(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(client) {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  async getHealthSummary() {
    const { data, error } = await supabase
      .from('client_health_snapshots')
      .select('*, client:clients(id, name, logo_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};
