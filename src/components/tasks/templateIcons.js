import {
  UserPlus, BarChart3, PenLine, Smartphone, Home, Target,
  Briefcase, Palette, TrendingUp, PartyPopper, Zap, Rocket,
} from 'lucide-react';

/**
 * Task templates persist their icon as a short string key, so the database
 * column stays plain text. Legacy rows (and the built-in templates in
 * data/taskTemplates.js) stored an emoji instead; LEGACY_EMOJI_MAP keeps those
 * rendering as the right icon without a migration, and anything unrecognised
 * falls back to the default.
 */
export const TEMPLATE_ICONS = [
  { key: 'welcome', Icon: UserPlus },
  { key: 'chart', Icon: BarChart3 },
  { key: 'write', Icon: PenLine },
  { key: 'mobile', Icon: Smartphone },
  { key: 'home', Icon: Home },
  { key: 'target', Icon: Target },
  { key: 'briefcase', Icon: Briefcase },
  { key: 'palette', Icon: Palette },
  { key: 'trending', Icon: TrendingUp },
  { key: 'celebrate', Icon: PartyPopper },
  { key: 'zap', Icon: Zap },
  { key: 'rocket', Icon: Rocket },
];

export const DEFAULT_TEMPLATE_ICON = 'write';

const LEGACY_EMOJI_MAP = {
  '👋': 'welcome',
  '📊': 'chart',
  '✍️': 'write',
  '✍': 'write',
  '📱': 'mobile',
  '🏡': 'home',
  '🎯': 'target',
  '💼': 'briefcase',
  '🎨': 'palette',
  '📈': 'trending',
  '🎉': 'celebrate',
  '⚡': 'zap',
  '🚀': 'rocket',
};

export function getTemplateIcon(value) {
  const key = LEGACY_EMOJI_MAP[value] || value;
  const match = TEMPLATE_ICONS.find((i) => i.key === key);
  return (match || TEMPLATE_ICONS.find((i) => i.key === DEFAULT_TEMPLATE_ICON)).Icon;
}
