import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribe to a Supabase real-time channel.
 * Automatically cleans up on unmount.
 *
 * @param {string} table - DB table name
 * @param {function} onchange - Callback({ eventType, new: row, old: row })
 * @param {object} filter - Optional filter e.g. { column: 'user_id', value: userId }
 */
export function useRealtime(table, onchange, filter = null) {
  const callbackRef = useRef(onchange);
  callbackRef.current = onchange;

  useEffect(() => {
    if (!table) return;

    let channel = supabase.channel(`realtime:${table}:${JSON.stringify(filter)}`);

    const config = { event: '*', schema: 'public', table };
    if (filter) config.filter = `${filter.column}=eq.${filter.value}`;

    channel = channel
      .on('postgres_changes', config, (payload) => callbackRef.current(payload))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [table, filter?.column, filter?.value]);
}
