import {
  COMPARISON_METRICS,
  buildComparisonSnapshot,
  comparisonLabel,
  comparisonRows,
  findPreviousMonthReport,
  isFullMonthReport,
  listComparableReports,
} from './reportComparison';

// "Compare to another report" must only offer the same client's like-for-like
// reports, suggest last month's, and compare numbers both reports actually have.

const report = (overrides) => ({
  id: 'r',
  clientId: 'c1',
  reportType: null,
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  dateRange: 'Jul 1 - Jul 31, 2026',
  updatedAt: '2026-08-11T18:05:00Z',
  metrics: {},
  ...overrides,
});

const august = { clientId: 'c1', startDate: '2026-08-01', endDate: '2026-08-31', dateRange: 'Aug 1 - Aug 31, 2026' };

describe('isFullMonthReport', () => {
  it('counts a 28–31 day period as a month', () => {
    expect(isFullMonthReport(report())).toBe(true);
    expect(isFullMonthReport(report({ startDate: '2026-02-01', endDate: '2026-02-28' }))).toBe(true);
  });

  it('rejects weekly, part-month and quarterly periods, and missing dates', () => {
    expect(isFullMonthReport(report({ startDate: '2026-08-31', endDate: '2026-09-06' }))).toBe(false);
    expect(isFullMonthReport(report({ startDate: '2026-09-15', endDate: '2026-09-30' }))).toBe(false);
    expect(isFullMonthReport(report({ startDate: '2026-04-01', endDate: '2026-07-01' }))).toBe(false);
    expect(isFullMonthReport(report({ startDate: null }))).toBe(false);
  });
});

describe('listComparableReports', () => {
  it("offers the client's other monthly and weekly reports, newest period first", () => {
    const reports = [
      report({ id: 'june', startDate: '2026-06-01', endDate: '2026-06-30' }),
      report({ id: 'other-client', clientId: 'c2' }),
      report({ id: 'quarterly', reportType: 'quarterly' }),
      report({ id: 'yearly', reportType: 'yearly' }),
      report({ id: 'week', reportType: 'weekly', startDate: '2026-07-20', endDate: '2026-07-26' }),
      report({ id: 'self', startDate: '2026-08-01', endDate: '2026-08-31' }),
      report({ id: 'july' }),
    ];
    expect(listComparableReports(reports, { ...august, id: 'self' }).map((r) => r.id)).toEqual(['week', 'july', 'june']);
  });

  it('matches a client known by more than one id, and needs a client', () => {
    const july = report({ id: 'july', clientId: 'firebase-doc-1' });
    expect(listComparableReports([july], { clientId: 'c1', clientIds: ['firebase-doc-1'] }).map((r) => r.id)).toEqual(['july']);
    expect(listComparableReports([july], { clientId: '' })).toEqual([]);
  });
});

describe('findPreviousMonthReport', () => {
  it("suggests the same client's full-month report for the month before", () => {
    const reports = [
      report({ id: 'weekly-july', startDate: '2026-07-06', endDate: '2026-07-12' }),
      report({ id: 'june', startDate: '2026-06-01', endDate: '2026-06-30' }),
      report({ id: 'july' }),
    ];
    expect(findPreviousMonthReport(reports, august)?.id).toBe('july');
  });

  it('prefers the most recently updated report when a month has duplicates', () => {
    const reports = [
      report({ id: 'older', updatedAt: '2026-08-01T00:00:00Z' }),
      report({ id: 'newer', updatedAt: '2026-08-13T00:00:00Z' }),
    ];
    expect(findPreviousMonthReport(reports, august)?.id).toBe('newer');
  });

  it('wraps January back to December of the year before', () => {
    const december = report({ id: 'dec', startDate: '2025-12-01', endDate: '2025-12-31' });
    expect(findPreviousMonthReport([december], { clientId: 'c1', startDate: '2026-01-01', endDate: '2026-01-31' })?.id).toBe('dec');
  });

  it('suggests nothing for a weekly report or a missing month', () => {
    expect(findPreviousMonthReport([report()], { ...august, startDate: '2026-08-31', endDate: '2026-09-06' })).toBeNull();
    expect(findPreviousMonthReport([report({ startDate: '2026-06-01', endDate: '2026-06-30' })], august)).toBeNull();
  });
});

describe('comparisonLabel', () => {
  it('names a full month, and falls back to the date range for anything else', () => {
    expect(comparisonLabel(report())).toBe('July 2026');
    expect(comparisonLabel(report({ startDate: '2026-08-24', endDate: '2026-08-30', dateRange: 'Aug 24 - Aug 30, 2026' }))).toBe('Aug 24 - Aug 30, 2026');
  });
});

describe('buildComparisonSnapshot', () => {
  it("freezes the other report's compared numbers and names it", () => {
    const july = report({ id: 'july', metrics: { views: 45139, likes: '934', comments: null, followerChange: 13, gender: { men: 51.8 } } });
    expect(buildComparisonSnapshot(july)).toEqual({
      reportId: 'july',
      label: 'July 2026',
      dateRange: 'Jul 1 - Jul 31, 2026',
      metrics: { views: 45139, likes: 934 },
    });
  });

  it('is null without a report', () => {
    expect(buildComparisonSnapshot(null)).toBeNull();
  });
});

describe('comparisonRows', () => {
  it('compares only metrics with a number in both reports, in report order', () => {
    const rows = comparisonRows({ likes: 2456, views: 101274, saves: 534 }, { views: 45139, likes: 934, comments: 44 });
    expect(rows.map((r) => r.key)).toEqual(['views', 'likes']);
    expect(rows[0]).toMatchObject({ label: 'Views', prev: 45139, curr: 101274, diff: 56135 });
    expect(rows[0].pct).toBeCloseTo(124.36, 1);
  });

  it('shows decline as negative, and no percentage without a base', () => {
    const [visits, reposts] = comparisonRows({ profileVisits: 203, reposts: 5 }, { profileVisits: 231, reposts: 0 });
    expect(visits.pct).toBeCloseTo(-12.12, 1);
    expect(reposts).toMatchObject({ diff: 5, pct: null });
  });

  it('is empty without a compared report', () => {
    expect(comparisonRows({ views: 1 }, null)).toEqual([]);
  });

  it('never compares net follower change', () => {
    expect(COMPARISON_METRICS.map((m) => m.key)).not.toContain('followerChange');
  });
});
