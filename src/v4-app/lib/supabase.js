// Single shared Supabase client for the entire app.
// The root client (src/lib/supabase.js) has the navigator-lock bypass which
// prevents the "sign-in in progress" auth deadlock. Re-exporting from here
// ensures v4-app code shares the same instance as supabaseFirestoreService.
export { supabase } from '../../lib/supabase';
