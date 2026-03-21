import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const contentService = {
  // ── Posts ──────────────────────────────────────────────────────────────────
  async getPostsForMonth(date, { clientId = null } = {}) {
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end   = format(endOfMonth(date),   'yyyy-MM-dd');

    let query = supabase
      .from('content_posts')
      .select('*, client:clients(id, name, instagram_handle), created_by:profiles(id, full_name), approved_by:profiles(id, full_name)')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date')
      .order('scheduled_time', { nullsFirst: false });

    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPost(post) {
    const { data, error } = await supabase
      .from('content_posts')
      .insert({ ...post, created_at: new Date().toISOString() })
      .select('*, client:clients(id, name), created_by:profiles(id, full_name)')
      .single();
    if (error) throw error;
    return data;
  },

  async updatePost(id, updates) {
    const { data, error } = await supabase
      .from('content_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, client:clients(id, name), created_by:profiles(id, full_name)')
      .single();
    if (error) throw error;
    return data;
  },

  async deletePost(id) {
    const { error } = await supabase.from('content_posts').delete().eq('id', id);
    if (error) throw error;
  },

  async approvePost(id, userId) {
    const { data, error } = await supabase
      .from('content_posts')
      .update({ status: 'approved', approved_by_id: userId, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Upload media to Supabase Storage ──────────────────────────────────────
  async uploadMedia(file, clientId) {
    const ext  = file.name.split('.').pop();
    const path = `content/${clientId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  },
};
