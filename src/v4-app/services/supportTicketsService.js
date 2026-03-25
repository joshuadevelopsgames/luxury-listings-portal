import { supabase } from '../lib/supabase';

export const supportTicketsService = {
  async listMine(userId) {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listAll() {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(row) {
    const { data, error } = await supabase.from('support_tickets').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.from('support_tickets').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
