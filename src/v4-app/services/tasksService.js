import { supabase } from '../lib/supabase';
import { normalizeTaskPriorityToInt } from '../../utils/taskPriority';

/**
 * Unified task service — aggregates tasks from all sources:
 * content calendar due dates, CRM follow-ups, client health alerts,
 * graphic project deadlines, and manual tasks.
 */
export const tasksService = {
  async getMyTasks(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, client:clients(id, name), assigned_to:profiles(id, full_name)')
      .or(`assigned_to_id.eq.${userId},created_by_id.eq.${userId}`)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data;
  },

  async getAllMyTasks(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, client:clients(id, name), assigned_to:profiles(id, full_name)')
      .or(`assigned_to_id.eq.${userId},created_by_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getTodaysPriorities(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tasks')
      .select('*, client:clients(id, name)')
      .or(`assigned_to_id.eq.${userId}`)
      .lte('due_date', today)
      .neq('status', 'done')
      .order('priority', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  },

  async create(task) {
    const row = { ...task };
    if (row.priority !== undefined) row.priority = normalizeTaskPriorityToInt(row.priority, 2);
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...row, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async complete(id) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const patch = { ...updates };
    if (patch.priority !== undefined) patch.priority = normalizeTaskPriorityToInt(patch.priority, 2);
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
