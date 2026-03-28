#!/usr/bin/env node
/**
 * Verify canvas-to-user mappings in Supabase
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qbhimpuzhvgltgplpoji.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGltcHV6aHZnbHRncGxwb2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzNDQzNywiZXhwIjoyMDg5NjEwNDM3fQ.J_ig4hkor-dVq_cQ87H9LCKG39iT3ihOtEd8yCRp8bw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('\n🔍 Verifying Canvas-to-User Mappings in Supabase\n');

  try {
    // 1. Fetch all canvases
    console.log('📋 Fetching canvases...');
    const { data: canvases, error: canvasError } = await supabase
      .from('canvases')
      .select('id, title, owner_id, user_id_legacy');

    if (canvasError) {
      console.error('❌ Error fetching canvases:', canvasError);
      process.exit(1);
    }

    console.log(`Found ${canvases.length} canvases\n`);

    // 2. Fetch all profiles
    console.log('👤 Fetching profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      process.exit(1);
    }

    console.log(`Found ${profiles.length} profiles\n`);

    // 3. Create lookup maps
    const profileById = {};
    profiles.forEach(p => {
      profileById[p.id] = p;
    });

    // 4. Cross-reference and analyze
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('CANVAS OWNERSHIP DETAILS:\n');

    const ownershipMap = {}; // email -> count
    const orphanedCanvases = [];
    const invalidOwners = [];

    canvases.forEach(canvas => {
      const owner = profileById[canvas.owner_id];

      if (!owner) {
        invalidOwners.push({
          id: canvas.id,
          title: canvas.title,
          owner_id: canvas.owner_id,
          user_id_legacy: canvas.user_id_legacy,
        });
      } else {
        const email = owner.email;
        ownershipMap[email] = (ownershipMap[email] || 0) + 1;

        console.log(`✓ "${canvas.title}"`);
        console.log(`  ID: ${canvas.id}`);
        console.log(`  Owner: ${email} (${owner.full_name || 'no name'})`);
        console.log(`  Owner ID: ${canvas.owner_id}`);
        if (canvas.user_id_legacy) {
          console.log(`  Legacy ID: ${canvas.user_id_legacy}`);
        }
        console.log('');
      }
    });

    // 5. Summary by user
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('SUMMARY BY USER:\n');

    const sortedOwners = Object.entries(ownershipMap).sort(([, a], [, b]) => b - a);
    let totalCanvases = 0;

    sortedOwners.forEach(([email, count]) => {
      console.log(`${email}: ${count} canvas${count !== 1 ? 'es' : ''}`);
      totalCanvases += count;
    });

    console.log(`\nTotal mapped canvases: ${totalCanvases}`);

    // 6. Report issues
    if (invalidOwners.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════\n');
      console.log(`⚠️  ${invalidOwners.length} ORPHANED/INVALID CANVASES:\n`);
      invalidOwners.forEach(canvas => {
        console.log(`✗ "${canvas.title}"`);
        console.log(`  Canvas ID: ${canvas.id}`);
        console.log(`  Owner ID (NOT FOUND): ${canvas.owner_id}`);
        console.log(`  Legacy ID: ${canvas.user_id_legacy}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ Verification complete!\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

main();
