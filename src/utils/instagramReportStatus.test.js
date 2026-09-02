import {
  getReportStatusPeriod,
  getReportYear,
  getReportMonth,
  getReportCompletionStatus,
  getMissingKeyFields,
  getFollowerChange,
  computeMonthlyReportStatus,
  collectClientReportLinkIds,
} from './instagramReportStatus';

// The dashboard's "who still needs a report" card and the Instagram Reports
// page must agree exactly. These lock the shared rules both now read from.

const FULL_METRICS = { followers: 100, accountsReached: 200, interactions: 50, followerChange: 5 };

describe('getReportStatusPeriod', () => {
  it('reports on the PREVIOUS month up to and including the 15th', () => {
    expect(getReportStatusPeriod(new Date(2026, 7, 15))).toEqual({ year: 2026, month: 7, label: 'Jul 2026' });
  });

  it('rolls over to the current month from the 16th', () => {
    expect(getReportStatusPeriod(new Date(2026, 7, 16))).toEqual({ year: 2026, month: 8, label: 'Aug 2026' });
  });

  it('wraps the year backwards in early January', () => {
    expect(getReportStatusPeriod(new Date(2026, 0, 5))).toEqual({ year: 2025, month: 12, label: 'Dec 2025' });
  });
});

describe('getReportYear / getReportMonth', () => {
  it('prefers the stored year/month', () => {
    const r = { year: 2026, month: 3, dateRange: 'Jan 1 - Jan 7, 2020' };
    expect(getReportYear(r)).toBe(2026);
    expect(getReportMonth(r)).toBe(3);
  });

  it('falls back to parsing the dateRange', () => {
    const r = { dateRange: 'Feb 24 - Mar 2, 2025' };
    expect(getReportYear(r)).toBe(2025);
    expect(getReportMonth(r)).toBe(2);
  });

  it('falls back to startDate when there is no dateRange', () => {
    const r = { startDate: '2026-07-01' };
    expect(getReportYear(r)).toBe(2026);
    expect(getReportMonth(r)).toBe(7);
  });
});

describe('getReportCompletionStatus', () => {
  it('is complete when every key metric is filled', () => {
    expect(getReportCompletionStatus(FULL_METRICS)).toBe('complete');
  });

  it('is partial with two of four key metrics', () => {
    expect(getReportCompletionStatus({ followers: 100, interactions: 50 })).toBe('partial');
  });

  it('is incomplete with one metric or none', () => {
    expect(getReportCompletionStatus({ followers: 100 })).toBe('incomplete');
    expect(getReportCompletionStatus(null)).toBe('incomplete');
  });

  it('ignores fields the report marked as not applicable', () => {
    const metrics = { followers: 100, accountsReached: 200, _ignoredFields: ['interactions', 'followerChange'] };
    expect(getReportCompletionStatus(metrics)).toBe('complete');
  });

  // The editor's "Net Change" box writes growth.overall, not followerChange.
  // Reports filled in that way were wrongly reading as 'partial'.
  it('accepts growth.overall in place of followerChange', () => {
    const metrics = { followers: 100, accountsReached: 200, interactions: 50, growth: { overall: 21 } };
    expect(getReportCompletionStatus(metrics)).toBe('complete');
  });

  it('still counts a report with neither follower-change box as partial', () => {
    const metrics = { followers: 100, accountsReached: 200, interactions: 50, growth: { follows: 29 } };
    expect(getReportCompletionStatus(metrics)).toBe('partial');
  });

  it('treats a net change of exactly 0 as filled in', () => {
    expect(getReportCompletionStatus({ ...FULL_METRICS, followerChange: 0 })).toBe('complete');
    const viaGrowth = { followers: 100, accountsReached: 200, interactions: 50, growth: { overall: 0 } };
    expect(getReportCompletionStatus(viaGrowth)).toBe('complete');
  });
});

// The editor highlights exactly these fields, so they must be the same ones
// that decided the Partial badge in the first place.
describe('getMissingKeyFields', () => {
  it('is empty for a complete report', () => {
    expect(getMissingKeyFields(FULL_METRICS)).toEqual([]);
  });

  it('names the fields that made a report partial', () => {
    const missing = getMissingKeyFields({ followers: 100, interactions: 50 });
    expect(missing).toEqual(['accountsReached', 'followerChange']);
    expect(getReportCompletionStatus({ followers: 100, interactions: 50 })).toBe('partial');
  });

  it('skips fields marked as not applicable', () => {
    const metrics = { followers: 100, _ignoredFields: ['interactions', 'followerChange'] };
    expect(getMissingKeyFields(metrics)).toEqual(['accountsReached']);
  });

  it('counts follower change entered in either box as filled', () => {
    expect(getMissingKeyFields({ ...FULL_METRICS, followerChange: null, growth: { overall: 21 } })).toEqual([]);
  });

  it('treats a zero as filled in, not missing', () => {
    expect(getMissingKeyFields({ ...FULL_METRICS, followers: 0 })).toEqual([]);
  });

  it('lists every key metric when there are no metrics at all', () => {
    expect(getMissingKeyFields(null)).toEqual(['followers', 'accountsReached', 'interactions', 'followerChange']);
  });
});

describe('getFollowerChange', () => {
  it('prefers followerChange, falls back to growth.overall', () => {
    expect(getFollowerChange({ followerChange: 5, growth: { overall: 9 } })).toBe(5);
    expect(getFollowerChange({ growth: { overall: 9 } })).toBe(9);
  });

  it('keeps a negative net change', () => {
    expect(getFollowerChange({ growth: { overall: -63 } })).toBe(-63);
  });

  it('is null when neither box is filled', () => {
    expect(getFollowerChange({ growth: { follows: 29, unfollows: 8 } })).toBe(null);
    expect(getFollowerChange({})).toBe(null);
    expect(getFollowerChange(null)).toBe(null);
  });
});

describe('collectClientReportLinkIds', () => {
  it('collects the UUID plus migrated Firestore ids from meta', () => {
    const ids = collectClientReportLinkIds({ id: 'uuid-1', meta: { firebaseId: 'fb-1', id: 'fb-1' } });
    expect(ids).toEqual(expect.arrayContaining(['uuid-1', 'fb-1']));
    expect(ids).toHaveLength(2);
  });
});

describe('computeMonthlyReportStatus', () => {
  const now = new Date(2026, 7, 20); // Aug 20 2026 -> reporting on Aug 2026
  const clients = [
    { id: 'c1', clientName: 'Zed Realty' },
    { id: 'c2', clientName: 'Acme Homes' },
    { id: 'c3', clientName: 'Beta Estates' },
    { id: 'c4', clientName: 'Delta Group', meta: { firebaseId: 'legacy-4' } },
  ];
  const reports = [
    { id: 'r1', clientId: 'c1', year: 2026, month: 8, metrics: FULL_METRICS },
    { id: 'r2', clientId: 'c2', year: 2026, month: 8, metrics: { followers: 1, interactions: 2 } },
    // c3 only has last month's report — still counts as missing for August
    { id: 'r3', clientId: 'c3', year: 2026, month: 7, metrics: FULL_METRICS },
    // c4's report is linked by its legacy Firestore id
    { id: 'r4', clientId: 'legacy-4', year: 2026, month: 8, metrics: FULL_METRICS },
  ];

  it('counts complete / partial / missing for the reporting month', () => {
    const s = computeMonthlyReportStatus(clients, reports, now);
    expect(s.period.label).toBe('Aug 2026');
    expect(s.total).toBe(4);
    expect(s.complete).toBe(2); // c1 + c4 (matched via legacy id)
    expect(s.partial).toBe(1);  // c2
    expect(s.missing).toBe(1);  // c3
    expect(s.percentComplete).toBe(50);
  });

  it('lists outstanding clients missing-first, then alphabetically', () => {
    const s = computeMonthlyReportStatus(clients, reports, now);
    expect(s.outstanding.map((r) => [r.client.clientName, r.status])).toEqual([
      ['Beta Estates', 'missing'],
      ['Acme Homes', 'partial'],
    ]);
  });

  it('treats an all-but-empty report as missing, not partial', () => {
    const s = computeMonthlyReportStatus(
      [{ id: 'c1', clientName: 'Solo' }],
      [{ id: 'r1', clientId: 'c1', year: 2026, month: 8, metrics: { followers: 10 } }],
      now
    );
    expect(s.missing).toBe(1);
    expect(s.partial).toBe(0);
  });

  it('handles a user with no clients', () => {
    const s = computeMonthlyReportStatus([], [], now);
    expect(s).toMatchObject({ total: 0, complete: 0, missing: 0, percentComplete: 0 });
    expect(s.outstanding).toEqual([]);
  });
});
