import { supabase } from '../lib/supabase';

export const notificationsService = {
  async getForUser(userId, { limit = 30, unreadOnly = false } = {}) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('read', false);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async markRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  async create({ userId, type, title, body, link = null, clientId = null }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, type, title, body, link, client_id: clientId, read: false })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
