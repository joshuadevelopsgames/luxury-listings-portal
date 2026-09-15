import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react';
import { buildReportData, buildVirtualTemplate, classicTemplate, getPostLinks, withLibraryBlocks } from './reportAdapter';
import { blockHasContent, growthOverall } from './reportBlocks';
import { ReportCanvas } from './reportCanvas';
import { BLOCK_LIBRARY } from './reportData';
import { getInstagramEmbedUrl, getInstagramPostUrl } from '../../utils/instagramEmbed';

// Top posts entered in the report editor (postLinks), a net-follower number
// extracted without its follows/unfollows breakdown, and engagement boxes like
// likes and saves all used to vanish from the rendered report. These lock the
// paths that now carry them onto the canvas.

// Render a report the way the public page and the wizard preview do.
function renderReport(report, template = classicTemplate()) {
  return render(
    <ReportCanvas template={buildVirtualTemplate(report, template)} data={buildReportData(report)} interactive={false} />
  );
}

// The report's visible text with thousands separators stripped ("4,321" -> "4321").
function renderedText(report, template) {
  const { container, unmount } = renderReport(report, template);
  const text = container.textContent.replace(/(\d),(?=\d{3})/g, '$1');
  unmount();
  return text;
}

describe('every box in the report editor lands on the report', () => {
  // Read the editor's own inputs, so a box added later without a home on the
  // report fails here instead of silently disappearing for clients.
  const editor = fs.readFileSync(path.join(__dirname, '..', 'InstagramReportsPage.jsx'), 'utf8');
  const keysFrom = (re) => [...editor.matchAll(re)].map((x) => x[1]);
  const boxes = [...new Set([
    ...keysFrom(/\bmf\('(\w+)'/g),
    ...keysFrom(/renderContentTypeSection\('(\w+)'/g),
    ...keysFrom(/addArrayItem\('(\w+)'/g),
    ...keysFrom(/metrics\?\.(gender|growth)\?\./g),
  ])];

  // A distinctive value per box, and the text it has to produce on the report.
  const SAMPLES = {
    gender: [{ men: 38.5, women: 61.5 }, '38.5%'],
    growth: [{ overall: 4321, follows: 4322, unfollows: 1 }, '4322'],
    contentBreakdown: [[{ type: 'Carousels', count: 432 }], 'Carousels'],
    interactionsByContent: [[{ type: 'Carousels', count: 432 }], 'Carousels'],
    topCities: [[{ name: 'Telluride', percentage: 4.2 }], 'Telluride'],
    topCountries: [[{ name: 'Portugal', percentage: 3.1 }], 'Portugal'],
    ageRanges: [[{ range: '35-44', percentage: 28.2 }], '35-44'],
  };
  const sampleFor = (key) => SAMPLES[key]
    || (/Change$/.test(key) ? ['+5.5%', '+5.5%'] : /Percent$/.test(key) ? [43.2, '43.2%'] : [4321, '4321']);

  it('reads the editor boxes', () => {
    expect(boxes).toEqual(expect.arrayContaining(['views', 'likes', 'comments', 'reposts', 'saves', 'shares', 'topCountries', 'gender', 'growth']));
  });

  it.each(boxes)('%s', (key) => {
    const [value, expected] = sampleFor(key);
    expect(renderedText({ metrics: { [key]: value } })).toContain(expected);
  });

  it('shows cities and countries together', () => {
    const text = renderedText({ metrics: { topCities: SAMPLES.topCities[0], topCountries: SAMPLES.topCountries[0] } });
    expect(text).toContain('Telluride');
    expect(text).toContain('Portugal');
  });

  it('adds sections missing from an older saved template, switched on and in order', () => {
    const old = { ...classicTemplate(), blocks: classicTemplate().blocks.filter((b) => b.type !== 'engagement') };
    const blocks = withLibraryBlocks(old.blocks);
    expect(blocks.map((b) => b.type)).toEqual(BLOCK_LIBRARY.map((m) => m.type));
    expect(blocks.find((b) => b.type === 'engagement').enabled).toBe(true);
    expect(renderedText({ metrics: { saves: 4321 } }, old)).toContain('4321');
  });
});

describe('comparison with another report', () => {
  const comparison = { reportId: 'july', label: 'July 2026', dateRange: 'Jul 1 - Jul 31, 2026', metrics: { views: 45139, profileVisits: 231, reposts: 7, likes: 934 } };
  const metrics = { views: 101274, profileVisits: 203, reposts: 7 };

  it('shows growth, decline and no change against the picked report', () => {
    const text = renderedText({ metrics, comparison });
    expect(text).toContain('Compared with July 2026');
    expect(text).toContain('45139');
    expect(text).toContain('101274');
    expect(text).toContain('+124%');
    expect(text).toContain('-12.1%');
    expect(text).toContain('No change');
    // Likes only exist in July, so there's nothing to compare.
    expect(text).not.toContain('Likes');
  });

  it('renders from a saved report, even when its template hides the section', () => {
    const hidden = classicTemplate();
    hidden.blocks.find((b) => b.type === 'comparison').enabled = false;
    const saved = { metrics, template: { ...hidden, comparison } };
    expect(renderedText(saved, saved.template)).toContain('Compared with July 2026');
  });

  it('is absent when the comparison is off', () => {
    expect(renderedText({ metrics })).not.toContain('Compared with');
    expect(renderedText({ metrics, template: { ...classicTemplate(), comparison: null } })).not.toContain('Compared with');
  });
});

describe('post links on the report canvas', () => {
  const report = {
    metrics: {},
    postLinks: [
      { url: 'https://www.instagram.com/p/DcMzT4aDxBa/', label: 'Listing', comment: '' },
      { url: '   ', label: '', comment: '' },
      { url: '', label: 'blank row', comment: '' },
    ],
  };
  const topContent = (r) => buildVirtualTemplate(r, classicTemplate()).blocks.find((b) => b.type === 'topContent');

  it('drops the blank rows the editor leaves behind', () => {
    expect(getPostLinks(report)).toHaveLength(1);
    expect(getPostLinks({})).toEqual([]);
    expect(getPostLinks(null)).toEqual([]);
  });

  it('passes the links to the canvas so Top Content renders', () => {
    expect(blockHasContent({ type: 'topContent' }, buildReportData(report))).toBe(true);
    expect(blockHasContent({ type: 'topContent' }, buildReportData({ metrics: {} }))).toBe(false);
  });

  it('widens Top Content to full width only when there are posts', () => {
    expect(topContent(report).span).toBe('full');
    expect(topContent({ metrics: {} }).span).toBe('half');
  });

  it('prints a clickable link for every post and reel', () => {
    const { container, unmount } = renderReport({
      metrics: {},
      postLinks: [
        { url: 'https://www.instagram.com/p/DcMzT4aDxBa/?utm_source=ig_web_copy_link&stkn=MzRlODBiNWFlZA==', label: '', comment: '' },
        { url: 'https://www.instagram.com/theagencysanantonio/reel/DcMgaBJyv/', label: 'Open house', comment: '' },
        { url: 'https://www.tiktok.com/@someone/video/1', label: 'TikTok cut', comment: '' },
      ],
    });
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining([
      'https://www.instagram.com/p/DcMzT4aDxBa/',
      'https://www.instagram.com/reel/DcMgaBJyv/',
      'https://www.tiktok.com/@someone/video/1',
    ]));
    expect(container.textContent).toContain('instagram.com/p/DcMzT4aDxBa');
    expect(container.textContent).toContain('instagram.com/reel/DcMgaBJyv');
    expect(container.textContent).toContain('https://www.tiktok.com/@someone/video/1');
    unmount();
  });
});

describe('Instagram post links', () => {
  it.each([
    ['https://www.instagram.com/p/DcMzT4aDxBa/?utm_source=ig_web_copy_link', 'p/DcMzT4aDxBa'],
    ['https://www.instagram.com/reel/DcoUP8JB5YR/', 'reel/DcoUP8JB5YR'],
    ['https://www.instagram.com/theagency.austin/p/DcmT0ZOian9/?hl=en', 'p/DcmT0ZOian9'],
    ['https://www.instagram.com/theagencysanantonio/reel/DcMgaBJyv/', 'reel/DcMgaBJyv'],
    ['https://www.instagram.com/reels/DcMgaBJyv', 'reel/DcMgaBJyv'],
  ])('embeds and links %s', (url, post) => {
    expect(getInstagramEmbedUrl(url)).toBe(`https://www.instagram.com/${post}/embed/`);
    expect(getInstagramPostUrl(url)).toBe(`https://www.instagram.com/${post}/`);
  });

  it('returns null for links it cannot embed', () => {
    expect(getInstagramEmbedUrl('https://www.instagram.com/theagency.austin/')).toBeNull();
    expect(getInstagramEmbedUrl('https://www.tiktok.com/@someone/video/1')).toBeNull();
    expect(getInstagramPostUrl('https://www.tiktok.com/@someone/video/1')).toBeNull();
  });
});

describe('Follower Growth', () => {
  it('falls back to the extracted net followers when there is no breakdown', () => {
    const data = { metrics: { followerChange: 29 } };
    expect(growthOverall(data.metrics)).toBe(29);
    expect(blockHasContent({ type: 'growth' }, data)).toBe(true);
  });

  it('prefers growth.overall, and keeps a real zero', () => {
    expect(growthOverall({ followerChange: 5, growth: { overall: 7 } })).toBe(7);
    expect(growthOverall({ followerChange: 5, growth: { overall: 0 } })).toBe(0);
  });

  it('still hides with no follower numbers at all', () => {
    expect(blockHasContent({ type: 'growth' }, { metrics: {} })).toBe(false);
    expect(blockHasContent({ type: 'growth' }, { metrics: { growth: {} } })).toBe(false);
  });
});
