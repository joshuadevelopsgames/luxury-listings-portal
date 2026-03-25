import { supabase } from '../lib/supabase';

export const feedbackService = {
  async listMine(userId) {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listAll() {
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(row) {
    const { data, error } = await supabase.from('feedback').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.from('feedback').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
