import { supabaseService } from './supabaseService';
import { __db as db } from '../lib/supabase';

// The Instagram Reports list fetched once on page load and then waited for a
// realtime event that instagram_reports never sends, so a report created (or
// edited, or archived) in this tab didn't show until the page was refreshed.
// Writes now refresh the open listeners directly — no realtime event here.

jest.mock('../lib/supabase', () => {
  const db = { rows: [], inserted: null };
  const query = () => {
    const chain = {
      select: () => chain,
      order: () => chain,
      eq: () => chain,
      or: () => chain,
      update: () => chain,
      insert: (rows) => { db.inserted = rows[0]; return chain; },
      single: () => Promise.resolve({ data: { id: 'new-id', ...db.inserted }, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: db.rows, error: null }).then(resolve, reject),
    };
    return chain;
  };
  // A realtime channel that never delivers an event.
  const channel = { on: () => channel, subscribe: () => channel, unsubscribe: () => {} };
  return {
    __db: db,
    supabase: {
      from: () => query(),
      channel: () => channel,
      removeChannel: () => {},
      rpc: () => Promise.resolve({ data: null, error: null }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'am@example.com' } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    },
  };
});

const row = (id, extra = {}) => ({ id, title: id, client_id: 'c1', archived: false, created_at: '2026-09-15T00:00:00Z', ...extra });
// Past the listener's 300ms debounce plus the refetch.
const settle = () => new Promise((resolve) => setTimeout(resolve, 450));

describe('Instagram report list', () => {
  let seen;
  let unsubscribe;
  const latest = () => seen[seen.length - 1];

  beforeEach(async () => {
    db.rows = [row('existing')];
    seen = [];
    unsubscribe = supabaseService.onInstagramReportsChange((reports) => {
      seen.push(reports.map((r) => `${r.id}:${r.title}`));
    }, { loadAll: true });
    await settle();
  });

  afterEach(() => unsubscribe());

  it('shows a newly created report without a page refresh', async () => {
    expect(latest()).toEqual(['existing:existing']);
    db.rows = [row('new-id', { title: 'September' }), row('existing')];
    await supabaseService.createInstagramReport({ clientId: 'c1', clientName: 'Client', title: 'September', startDate: '2026-09-01', endDate: '2026-09-30' });
    await settle();
    expect(latest()).toEqual(['new-id:September', 'existing:existing']);
  });

  it('shows an edit without a page refresh', async () => {
    db.rows = [row('existing', { title: 'Renamed' })];
    await supabaseService.updateInstagramReport('existing', { title: 'Renamed' });
    await settle();
    expect(latest()).toEqual(['existing:Renamed']);
  });

  it('drops an archived report without a page refresh', async () => {
    db.rows = [];
    await supabaseService.deleteInstagramReport('existing');
    await settle();
    expect(latest()).toEqual([]);
  });
});
