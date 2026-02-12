import React, { useState } from 'react';

const handlePlaceholder = 'preview_handle';
const MAX_CAPTION_PREVIEW = 120;

export default function PostPreviewCard({ item, variant = 'instagram' }) {
  const media = item?.media || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const caption = item?.description || '';
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const platform = (item?.platform || 'instagram').toLowerCase();
  const effectiveVariant = variant || (platform === 'tiktok' ? 'tiktok' : platform === 'facebook' ? 'facebook' : 'instagram');

  const primaryUrl = media[activeIndex]?.url || media[0]?.url;
  const primaryType = media[activeIndex]?.type || media[0]?.type || 'image';
  const hasMultiple = media.length > 1;

  if (effectiveVariant === 'tiktok') {
    return (
      <div className="rounded-xl overflow-hidden bg-black text-white" style={{ width: 280, aspectRatio: '9/16' }}>
        <div className="relative w-full h-full flex flex-col">
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {primaryUrl ? (
              primaryType === 'video' ? (
                <video src={primaryUrl} className="w-full h-full object-cover" muted playsInline loop />
              ) : (
                <img src={primaryUrl} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-sm">No media</div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-sm line-clamp-2">{caption || 'Caption...'}</p>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white/20" />
              <span className="text-xs mt-1">@{handlePlaceholder}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveVariant === 'facebook') {
    return (
      <div className="rounded-xl overflow-hidden bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 shadow-lg" style={{ maxWidth: 500 }}>
        <div className="p-3 flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white truncate">Page name</p>
            <p className="text-xs text-[#86868b]">Sponsored · Now</p>
          </div>
          <span className="text-[#86868b] text-xl">⋯</span>
        </div>
        <p className="px-3 pb-2 text-sm text-[#1d1d1f] dark:text-white line-clamp-2">{caption || 'What\'s on your mind?'}</p>
        <div className="relative aspect-[1.91/1] bg-black/5 dark:bg-black/20">
          {primaryUrl ? (
            primaryType === 'video' ? (
              <video src={primaryUrl} className="w-full h-full object-contain" muted playsInline />
            ) : (
              <img src={primaryUrl} alt="" className="w-full h-full object-contain" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#86868b] text-sm">No media</div>
          )}
          {hasMultiple && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`w-2 h-2 rounded-full ${i === activeIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex border-t border-black/10 dark:border-white/10">
          <span className="flex-1 py-2 text-center text-sm text-[#86868b]">Like</span>
          <span className="flex-1 py-2 text-center text-sm text-[#86868b]">Comment</span>
          <span className="flex-1 py-2 text-center text-sm text-[#86868b]">Share</span>
        </div>
      </div>
    );
  }

  // Instagram
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 shadow-lg" style={{ maxWidth: 400 }}>
      <div className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
        <span className="flex-1 text-sm font-semibold text-[#1d1d1f] dark:text-white">{handlePlaceholder}</span>
        <span className="text-[#1d1d1f] dark:text-white text-xl">⋯</span>
      </div>
      <div className="relative aspect-square bg-black">
        {primaryUrl ? (
          primaryType === 'video' ? (
            <video src={primaryUrl} className="w-full h-full object-cover" muted playsInline loop />
          ) : (
            <img src={primaryUrl} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#86868b] text-sm">No media</div>
        )}
        {hasMultiple && (
          <>
            <div className="absolute top-2 left-0 right-0 flex justify-center gap-1">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full ${i === activeIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
            <div className="absolute top-2 right-2 text-white/80 text-xs">{activeIndex + 1}/{media.length}</div>
          </>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="flex gap-2">
          <span className="text-lg">♡</span>
          <span className="text-lg">💬</span>
          <span className="text-lg">↗</span>
        </div>
        <p className="text-sm text-[#1d1d1f] dark:text-white">
          <span className="font-semibold mr-1">{handlePlaceholder}</span>
          {caption ? (caption.length > MAX_CAPTION_PREVIEW ? caption.slice(0, MAX_CAPTION_PREVIEW) + '...' : caption) : 'Caption'}
        </p>
        {tags.length > 0 && (
          <p className="text-sm text-[#00376b] dark:text-blue-300">
            {tags.slice(0, 5).map(t => `#${t.replace(/^#/, '')}`).join(' ')}
          </p>
        )}
      </div>
    </div>
  );
}
