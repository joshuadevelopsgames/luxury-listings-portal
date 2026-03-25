import { supabase } from '../lib/supabase';

export const canvasesService = {
  async listMine(userId) {
    const { data, error } = await supabase
      .from('canvases')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(userId, title = 'Untitled') {
    const { data, error } = await supabase
      .from('canvases')
      .insert({ owner_id: userId, title, content: [] })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.from('canvases').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
