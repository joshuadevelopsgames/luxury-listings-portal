import { supabase } from '../lib/supabase';

export const resourcesService = {
  async list() {
    const { data, error } = await supabase.from('resources').select('*').order('sort_order', { ascending: true }).order('title');
    if (error) throw error;
    return data || [];
  },

  async create(row) {
    const { data, error } = await supabase.from('resources').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.from('resources').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw error;
  },
};
