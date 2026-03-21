import { supabase } from '../lib/supabase';

export const instagramService = {
  async getReports({ clientId = null, archived = false } = {}) {
    let query = supabase
      .from('instagram_reports')
      .select('*, client:clients(id, name, instagram_handle), created_by:profiles(id, full_name)')
      .eq('archived', archived)
      .order('period_start', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getReportByPublicLink(publicLinkId) {
    const { data, error } = await supabase
      .from('instagram_reports')
      .select('*, client:clients(id, name, instagram_handle, logo_url)')
      .eq('public_link_id', publicLinkId)
      .eq('is_public', true)
      .single();
    if (error) throw error;
    return data;
  },

  async createReport(report) {
    const { data, error } = await supabase
      .from('instagram_reports')
      .insert({ ...report, created_at: new Date().toISOString() })
      .select('*, client:clients(id, name)')
      .single();
    if (error) throw error;
    return data;
  },

  async updateReport(id, updates) {
    const { data, error } = await supabase
      .from('instagram_reports')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteReport(id) {
    const { error } = await supabase.from('instagram_reports').delete().eq('id', id);
    if (error) throw error;
  },

  async archiveReport(id) {
    return instagramService.updateReport(id, { archived: true });
  },

  async togglePublic(id, isPublic) {
    return instagramService.updateReport(id, { is_public: isPublic });
  },

  async getPublicLink(report) {
    return `${window.location.origin}/report/${report.public_link_id}`;
  },
};
