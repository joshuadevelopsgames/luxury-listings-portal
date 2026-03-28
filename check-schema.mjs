import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qbhimpuzhvgltgplpoji.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGltcHV6aHZnbHRncGxwb2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzNDQzNywiZXhwIjoyMDg5NjEwNDM3fQ.J_ig4hkor-dVq_cQ87H9LCKG39iT3ihOtEd8yCRp8bw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in profiles table:');
    console.log(Object.keys(data[0]));
    console.log('\nSample row:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No profiles found');
  }
}

main();
