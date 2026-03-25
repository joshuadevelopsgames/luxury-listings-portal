import { supabase } from '../lib/supabase';

export const dashboardPreferencesService = {
  async get(userId) {
    const { data, error } = await supabase
      .from('user_dashboard_preferences')
      .select('widget_order, layout')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { widgetOrder: null, mainContentOrder: null };
    return {
      widgetOrder: data.widget_order?.length ? data.widget_order : null,
      mainContentOrder: data.layout?.mainContentOrder?.length ? data.layout.mainContentOrder : null,
    };
  },

  async upsert(userId, { widgetOrder, mainContentOrder }) {
    const { data: existing } = await supabase
      .from('user_dashboard_preferences')
      .select('widget_order, layout')
      .eq('user_id', userId)
      .maybeSingle();

    const layout = {
      ...(existing?.layout && typeof existing.layout === 'object' ? existing.layout : {}),
    };
    if (mainContentOrder !== undefined) {
      layout.mainContentOrder = mainContentOrder;
    }

    const row = {
      user_id: userId,
      layout,
      widget_order:
        widgetOrder !== undefined ? widgetOrder : existing?.widget_order ?? [],
    };

    const { error } = await supabase.from('user_dashboard_preferences').upsert(row, {
      onConflict: 'user_id',
    });
    if (error) throw error;
  },
};
