// ============================================================
// Analytics Report Template Builder — data & token source of truth.
// Ported from the design handoff prototype (was window.* globals).
// The report content below is Instagram-only SAMPLE data; swap for
// real per-client metrics when wiring to a live report.
// ============================================================

export const REPORT_DATA = {
  metrics: {
    views: 24807,
    viewsFollowerPercent: 16.7,
    followers: 6649,
    followerChange: 64,
    followerChangePercent: 1.0,
    interactions: 1221,
    interactionsFollowerPercent: 17.9,
    profileVisits: 203,
    accountsReached: 5626,
    externalLinkTaps: 15,
    contentShared: 31,
    contentBreakdown: [
      { type: 'Posts', count: 18000 },
      { type: 'Reels', count: 6300 },
      { type: 'Stories', count: 479 },
      { type: 'Live videos', count: 0 },
    ],
    interactionsByContent: [
      { type: 'Posts', count: 928 },
      { type: 'Reels', count: 258 },
      { type: 'Stories', count: 35 },
      { type: 'Live videos', count: 0 },
    ],
    topCountries: [
      { name: 'United States', percentage: 73.5 },
      { name: 'Canada', percentage: 7.2 },
      { name: 'Portugal', percentage: 3.1 },
      { name: 'Mexico', percentage: 2.5 },
      { name: 'Spain', percentage: 2.0 },
    ],
    ageRanges: [
      { range: '13-17', percentage: 0.1 },
      { range: '18-24', percentage: 2.4 },
      { range: '25-34', percentage: 14.9 },
      { range: '35-44', percentage: 30.7 },
      { range: '45-54', percentage: 29.9 },
      { range: '55-64', percentage: 17.2 },
      { range: '65+', percentage: 4.7 },
    ],
    gender: { men: 38.7, women: 61.3 },
    growth: { overall: 64, follows: 73, unfollows: 9 },
    activeTimes: [
      { hour: '12a', activity: 30 }, { hour: '3a', activity: 25 },
      { hour: '6a', activity: 55 }, { hour: '9a', activity: 85 },
      { hour: '12p', activity: 90 }, { hour: '3p', activity: 80 },
      { hour: '6p', activity: 75 }, { hour: '9p', activity: 50 },
    ],
    topContent: [
      { date: 'Jan 27', views: 518, icon: 'image' },
      { date: 'Jan 5', views: 425, icon: 'monitor' },
      { date: 'Jan 1', views: 369, icon: 'sparkles' },
    ],
  },
};

// Block registry — the library of report sections.
// span: 'full' (2 cols) or 'half' (1 col)
export const BLOCK_LIBRARY = [
  { type: 'hero', name: 'Hero Header', desc: 'Client name, date range & logo', icon: 'instagram', span: 'full', locked: true,
    defaults: { title: 'Monthly Instagram Performance Report' } },
  { type: 'metrics', name: 'Key Metrics', desc: 'Views, followers, reach, visits', icon: 'zap', span: 'full',
    defaults: { title: 'Performance at a Glance', metrics: [
      { icon: 'eye', label: 'Total Views', value: '24,807', sub: '16.7% from followers', trend: 'none' },
      { icon: 'users', label: 'Followers', value: '6,649', sub: '+64 (+1.0%)', trend: 'up' },
      { icon: 'pointer', label: 'Profile Visits', value: '203', sub: '', trend: 'none' },
      { icon: 'globe', label: 'Viewers', value: '5,626', sub: '', trend: 'none' },
      { icon: 'image', label: 'Content Shared', value: '31', sub: '', trend: 'none' },
    ] } },
  { type: 'highlights', name: 'Written Highlights', desc: 'Manager notes & takeaways', icon: 'message', span: 'full',
    defaults: { title: 'Report Highlights', body: 'Views climbed to 24,807 this month with a healthy +64 net follower gain (73 follows vs. 9 unfollows). Posts drove the bulk of reach at 18K views, with Reels adding another 6.3K. The audience skews 61% women, concentrated in the 35–54 age range and based primarily in the United States (73.5%). Recommend leaning further into Reels to convert strong non-follower reach into new follows.' } },
  { type: 'viewsByContent', name: 'Views by Content', desc: 'Posts / Stories / Reels split', icon: 'bar', span: 'half',
    defaults: { title: 'Views by Content Type' } },
  { type: 'interactionsByContent', name: 'Interactions by Content', desc: 'Engagement split by format', icon: 'heart', span: 'half',
    defaults: { title: 'Interactions by Content Type' } },
  { type: 'locations', name: 'Top Locations', desc: 'Cities your audience lives in', icon: 'pin', span: 'half',
    defaults: { title: 'Top Locations' } },
  { type: 'age', name: 'Age Distribution', desc: 'Audience age ranges', icon: 'users', span: 'half',
    defaults: { title: 'Age Distribution' } },
  { type: 'gender', name: 'Gender Split', desc: 'Men / women breakdown', icon: 'activity', span: 'half',
    defaults: { title: 'Audience Gender' } },
  { type: 'topContent', name: 'Top Content', desc: 'Best performing posts', icon: 'sparkles', span: 'half',
    defaults: { title: 'Top Performing Content' } },
  { type: 'growth', name: 'Follower Growth', desc: 'Net change, follows, unfollows', icon: 'trendUp', span: 'full',
    defaults: { title: 'Follower Growth' } },
  { type: 'activeTimes', name: 'Most Active Times', desc: 'When your audience is online', icon: 'clock', span: 'full',
    defaults: { title: 'Most Active Times' } },
  { type: 'screenshots', name: 'Screenshots Gallery', desc: 'Original Instagram insights', icon: 'image', span: 'full',
    defaults: { title: 'Original Screenshots' } },
];

// Theme presets — accent gradients for the report
export const THEME_PRESETS = [
  { key: 'instagram', name: 'Instagram', from: '#a435f0', via: '#e1306c', to: '#f77737', solid: '#e1306c' },
  { key: 'luxury',    name: 'Luxury Gold', from: '#b8862f', via: '#d4af37', to: '#8a6d1f', solid: '#b8862f' },
  { key: 'ocean',     name: 'Ocean',     from: '#0071e3', via: '#22a7f0', to: '#19c3c3', solid: '#0071e3' },
  { key: 'sapphire',  name: 'Sapphire',  from: '#1d4ed8', via: '#3b82f6', to: '#60a5fa', solid: '#2563eb' },
  { key: 'teal',      name: 'Teal',      from: '#0e9488', via: '#14b8a6', to: '#2dd4bf', solid: '#0e9488' },
  { key: 'forest',    name: 'Forest',    from: '#1f8a5b', via: '#34c759', to: '#0e7c66', solid: '#1f8a5b' },
  { key: 'sunset',    name: 'Sunset',    from: '#ff6a3d', via: '#f53b57', to: '#ff9f1c', solid: '#ff5a4d' },
  { key: 'coral',     name: 'Coral',     from: '#ff7a59', via: '#ff5a7a', to: '#ffa15c', solid: '#fb6f63' },
  { key: 'rose',      name: 'Rose',      from: '#be123c', via: '#f43f5e', to: '#fb7185', solid: '#f43f5e' },
  { key: 'berry',     name: 'Berry',     from: '#86198f', via: '#c026d3', to: '#db2777', solid: '#be185d' },
  { key: 'royal',     name: 'Royal',     from: '#5856d6', via: '#7b5bd6', to: '#9b4dca', solid: '#5856d6' },
  { key: 'amber',     name: 'Amber',     from: '#b45309', via: '#d97706', to: '#f59e0b', solid: '#d97706' },
  { key: 'slate',     name: 'Mono Slate',from: '#334155', via: '#475569', to: '#1e293b', solid: '#334155' },
];

export const FONT_PRESETS = [
  { key: 'system', name: 'System Sans', stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { key: 'grotesk', name: 'Space Grotesk', stack: '"Space Grotesk", "Segoe UI", sans-serif' },
  { key: 'dmsans', name: 'DM Sans', stack: '"DM Sans", "Segoe UI", sans-serif' },
  { key: 'manrope', name: 'Manrope', stack: '"Manrope", "Segoe UI", sans-serif' },
  { key: 'jakarta', name: 'Plus Jakarta Sans', stack: '"Plus Jakarta Sans", "Segoe UI", sans-serif' },
  { key: 'outfit', name: 'Outfit', stack: '"Outfit", "Segoe UI", sans-serif' },
  { key: 'rounded', name: 'Nunito (Rounded)', stack: '"Nunito", "Segoe UI", sans-serif' },
  { key: 'serif', name: 'Playfair (Serif)', stack: '"Playfair Display", Georgia, "Times New Roman", serif' },
  { key: 'cormorant', name: 'Cormorant (Serif)', stack: '"Cormorant Garamond", Georgia, serif' },
  { key: 'lora', name: 'Lora (Serif)', stack: '"Lora", Georgia, serif' },
];

export const RADIUS_PRESETS = [
  { key: 'sharp', name: 'Sharp', value: '4px' },
  { key: 'soft', name: 'Soft', value: '16px' },
  { key: 'pill', name: 'Round', value: '28px' },
];

export const SHADOW_PRESETS = [
  { key: 'none', name: 'Flat', card: '0 0 0 1px rgba(0,0,0,0.06)' },
  { key: 'soft', name: 'Soft', card: '0 10px 30px -12px rgba(0,0,0,0.18)' },
  { key: 'strong', name: 'Lifted', card: '0 24px 50px -16px rgba(0,0,0,0.30)' },
];

// Report surface (background + card + text) presets
export const SURFACE_PRESETS = [
  { key: 'light',    name: 'Cloud',    dark: false, bg: '#f5f6f8', card: '#ffffff', inset: '#f6f7f9', track: '#edeef1', text: '#18181b', muted: '#52525b', faint: '#a1a1aa' },
  { key: 'cream',    name: 'Cream',    dark: false, bg: '#f4ece0', card: '#fffdf8', inset: '#f3ebdd', track: '#e8ddca', text: '#2a2419', muted: '#6b6253', faint: '#a99e8b' },
  { key: 'sand',     name: 'Sand',     dark: false, bg: '#ece5d8', card: '#faf6ef', inset: '#efe8db', track: '#ddd3c2', text: '#2c2a22', muted: '#6a6456', faint: '#a8a18e' },
  { key: 'blush',    name: 'Blush',    dark: false, bg: '#f7edec', card: '#fffafa', inset: '#f6eceb', track: '#ecd9d8', text: '#2c2122', muted: '#6e5a5b', faint: '#b09a9b' },
  { key: 'sage',     name: 'Sage',     dark: false, bg: '#e9eee7', card: '#fbfdf9', inset: '#eaf0e8', track: '#d8e0d3', text: '#222a22', muted: '#566153', faint: '#9aa896' },
  { key: 'mist',     name: 'Mist',     dark: false, bg: '#eef1f4', card: '#ffffff', inset: '#eef1f5', track: '#e1e6ec', text: '#1c2024', muted: '#515a63', faint: '#9aa3ac' },
  { key: 'dark',     name: 'Charcoal', dark: true,  bg: '#161617', card: '#1f1f22', inset: '#27272b', track: '#2e2e33', text: '#f5f5f7', muted: '#a1a1a6', faint: '#76767c' },
  { key: 'midnight', name: 'Midnight', dark: true,  bg: '#0f1420', card: '#19202e', inset: '#1d2533', track: '#27303f', text: '#eef2f8', muted: '#9aa6b8', faint: '#697587' },
];

// Hero banner shapes — `cut` is the transparent region (normalized 0..100 box,
// bottom edge). Rendered as a single-layer mask so there is no seam.
export const HERO_SHAPES = [
  { key: 'swoop', name: 'Swoop', cut: 'M0 100 L4 97.5 C8 95 17 90 25 87.5 C33 85 42 85 50 86.3 C58 87.5 67 90 75 91.3 C83 92.5 92 92.5 96 92.5 L100 92.5 L100 100 Z' },
  { key: 'flat',  name: 'Flat',  cut: null },
  { key: 'arch',  name: 'Arch',  cut: 'M0 100 Q50 74 100 100 Z' },
  { key: 'round', name: 'Round', cut: 'M0 100 L0 84 Q50 103 100 84 L100 100 Z' },
  { key: 'slant', name: 'Slant', cut: 'M0 100 L100 80 L100 100 Z' },
  { key: 'peak',  name: 'Peak',  cut: 'M0 100 L50 78 L100 100 Z' },
];

// Card hover animation presets (CSS-driven via .hov-<key> on report root)
export const HOVER_PRESETS = [
  { key: 'none', name: 'None' },
  { key: 'lift', name: 'Lift' },
  { key: 'grow', name: 'Grow' },
  { key: 'glow', name: 'Glow' },
  { key: 'liftglow', name: 'Lift + Glow' },
];

// Google Fonts loaded by the builder for the non-system typeface presets.
export const GOOGLE_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&family=Lora:wght@400;500;600;700&display=swap';
