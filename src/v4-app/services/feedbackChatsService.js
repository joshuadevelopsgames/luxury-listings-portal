import { supabase } from '../lib/supabase';

const CHAT_TITLE_PREFIX = 'CHAT:';

export const feedbackChatsService = {
  CHAT_TITLE_PREFIX,

  isChatThread(row) {
    return row?.type === 'feedback' && typeof row?.title === 'string' && row.title.startsWith(CHAT_TITLE_PREFIX);
  },

  async listThreads(userId) {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'feedback')
      .like('title', `${CHAT_TITLE_PREFIX}%`)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listAllThreads() {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('type', 'feedback')
      .like('title', `${CHAT_TITLE_PREFIX}%`)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createThread(userId, initialMessage) {
    const title = `${CHAT_TITLE_PREFIX}${crypto.randomUUID()}`;
    const { data: fb, error: e1 } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        type: 'feedback',
        title,
        description: initialMessage.trim(),
        status: 'open',
        priority: 'medium',
      })
      .select()
      .single();
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('feedback_chats').insert({
      feedback_id: fb.id,
      user_id: userId,
      message: initialMessage.trim(),
    });
    if (e2) throw e2;
    return fb;
  },

  async getMessages(feedbackId) {
    const { data, error } = await supabase
      .from('feedback_chats')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addMessage(feedbackId, userId, message) {
    const { error } = await supabase.from('feedback_chats').insert({
      feedback_id: feedbackId,
      user_id: userId,
      message: message.trim(),
    });
    if (error) throw error;
    await supabase.from('feedback').update({ updated_at: new Date().toISOString() }).eq('id', feedbackId);
  },

  async closeThread(feedbackId) {
    const { error } = await supabase.from('feedback').update({ status: 'closed' }).eq('id', feedbackId);
    if (error) throw error;
  },

  async loadThreadWithMessages(feedbackId) {
    const { data: fb, error: e1 } = await supabase.from('feedback').select('*').eq('id', feedbackId).single();
    if (e1) throw e1;
    const messages = await this.getMessages(feedbackId);
    return { ...fb, messages };
  },
};
