import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase environment variables.\n' +
    'Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Bypass the Navigator LockManager API. The default navigatorLock
    // implementation can get permanently stuck after page reloads (the
    // AbortController times out after ~10s, blocking ALL auth operations
    // including getSession/setSession/onAuthStateChange). Since this app
    // doesn't need cross-tab session coordination, a no-op lock that just
    // runs the callback immediately is safe and eliminates the issue.
    lock: (name, acquireTimeout, fn) => fn(),
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
