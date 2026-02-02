import React from 'react';
import { Globe } from 'lucide-react';

// Brand SVG icons with official colors
const InstagramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#F77737" />
        <stop offset="50%" stopColor="#E1306C" />
        <stop offset="75%" stopColor="#C13584" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-gradient)" strokeWidth="2" />
    <circle cx="12" cy="12" r="4.5" stroke="url(#ig-gradient)" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-gradient)" />
  </svg>
);

const YouTubeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" fill="#FF0000"/>
    <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="white"/>
  </svg>
);

const TikTokIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" fill="#1d1d1f"/>
  </svg>
);

const FacebookIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
  </svg>
);

const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#1d1d1f"/>
  </svg>
);

const OtherIcon = ({ size = 18 }) => (
  <Globe className="text-[#86868b]" style={{ width: size, height: size }} strokeWidth={1.5} />
);

// Platform definitions
const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'youtube', label: 'YouTube', Icon: YouTubeIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'x', label: 'X', Icon: XIcon },
  { key: 'other', label: 'Other', Icon: OtherIcon },
];

export { PLATFORMS };

/**
 * PlatformIcons — displays social media platform icons
 *
 * @param {Object} platforms - { instagram: bool, youtube: bool, tiktok: bool, facebook: bool, x: bool, other: bool }
 * @param {boolean} editable - show checkboxes for editing
 * @param {function} onChange - callback({ ...platforms, [key]: bool })
 * @param {number} size - icon size in px (default 18)
 * @param {boolean} compact - show icons only, no labels (default false)
 */
export default function PlatformIcons({ platforms = {}, editable = false, onChange, size = 18, compact = false }) {
  if (editable) {
    return (
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map(({ key, label, Icon }) => (
          <label
            key={key}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
              platforms[key]
                ? 'border-[#0071e3] bg-[#0071e3]/5 dark:bg-[#0071e3]/10'
                : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
            }`}
          >
            <input
              type="checkbox"
              checked={!!platforms[key]}
              onChange={(e) => onChange?.({ ...platforms, [key]: e.target.checked })}
              className="sr-only"
            />
            <Icon size={size} />
            <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{label}</span>
            {platforms[key] && (
              <svg className="w-3.5 h-3.5 text-[#0071e3]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </label>
        ))}
      </div>
    );
  }

  // Display mode — only show enabled platforms
  const enabled = PLATFORMS.filter(({ key }) => platforms[key]);

  if (enabled.length === 0) return null;

  return (
    <div className={`flex ${compact ? 'gap-1.5' : 'gap-2'} items-center flex-wrap`}>
      {enabled.map(({ key, label, Icon }) => (
        compact ? (
          <span key={key} title={label}>
            <Icon size={size} />
          </span>
        ) : (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.06] text-[11px] font-medium text-[#1d1d1f] dark:text-white/80"
          >
            <Icon size={14} />
            {label}
          </span>
        )
      ))}
    </div>
  );
}
