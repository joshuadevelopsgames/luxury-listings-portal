import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import PostPreviewCard from '../components/content/PostPreviewCard';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Copy, ExternalLink, Share2, Instagram } from 'lucide-react';
import Breadcrumb from '../components/ui/Breadcrumb';

const OPEN_LINKS = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  tiktok: 'https://www.tiktok.com/',
  linkedin: 'https://www.linkedin.com/',
  twitter: 'https://twitter.com/',
  youtube: 'https://www.youtube.com/'
};

// True on phones/tablets where a native Instagram app and share sheet exist.
const IS_MOBILE = typeof navigator !== 'undefined' && /iphone|ipad|ipod|android/i.test(navigator.userAgent);

export default function ContentCalendarPostDue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  // Primary media pre-fetched as a File so navigator.share() fires instantly on tap
  // (fetching at click time can exceed the browser's user-activation window).
  const [shareFile, setShareFile] = useState(null);

  useEffect(() => {
    if (!id || !currentUser?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabaseService.getContentItem(id).then((data) => {
      if (cancelled) return;
      if (!data || data.userEmail !== currentUser.email) {
        setItem(null);
      } else {
        setItem(data);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, currentUser?.email]);

  // Pre-fetch the post's first photo/video into a File for the share sheet.
  useEffect(() => {
    setShareFile(null);
    if (!item || !IS_MOBILE) return;
    const primary = (Array.isArray(item.media) ? item.media : [])[0];
    if (!primary?.url) return;
    let cancelled = false;
    fetch(primary.url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('fetch failed'))))
      .then((blob) => {
        if (cancelled) return;
        const isVideo = primary.type === 'video';
        const ext = (blob.type.split('/')[1] || (isVideo ? 'mp4' : 'jpg')).split('+')[0];
        const file = new File([blob], `post.${ext}`, {
          type: blob.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        });
        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          setShareFile(file);
        }
      })
      .catch(() => { /* leave null → save-and-deep-link fallback */ });
    return () => { cancelled = true; };
  }, [item]);

  const platform = (item?.platform || 'instagram').toLowerCase();
  const isInstagram = platform === 'instagram';
  const primaryMedia = (Array.isArray(item?.media) ? item.media : [])[0];

  const copyCaption = () => {
    if (!item?.description) return;
    navigator.clipboard.writeText(item.description).then(() => {
      toast.success('Caption copied to clipboard');
    }).catch(() => {
      toast.error('Could not copy');
    });
  };

  const openPlatform = () => {
    const url = OPEN_LINKS[platform] || OPEN_LINKS.instagram;
    window.open(url, '_blank');
  };

  // Open the native Instagram app, falling back to the website if it isn't installed.
  const openInstagramApp = () => {
    const fallback = setTimeout(() => {
      window.location.href = OPEN_LINKS.instagram;
    }, 1500);
    const onHide = () => {
      if (document.hidden) {
        clearTimeout(fallback);
        document.removeEventListener('visibilitychange', onHide);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.location.href = 'instagram://app';
  };

  // Mobile flow: copy caption → push the photo through the share sheet (loads it into
  // Instagram). Instagram drops shared caption text on feed posts, so the clipboard copy
  // is the backstop the user pastes. Falls back to save-photo + deep-link.
  const postToInstagram = async () => {
    // Fire-and-forget so we don't burn the user-activation that navigator.share needs.
    if (item?.description) {
      try { navigator.clipboard?.writeText(item.description)?.catch(() => {}); } catch { /* non-fatal */ }
    }

    if (shareFile) {
      try {
        await navigator.share({ files: [shareFile], text: item?.description || undefined });
        toast.success('Caption copied — choose Instagram, then paste it on your post');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user backed out of the share sheet
        // any other error → fall through to the manual path
      }
    }

    // Fallback: save the photo to the device, then open the app to post manually.
    if (primaryMedia?.url) {
      const a = document.createElement('a');
      a.href = primaryMedia.url;
      a.download = `post.${primaryMedia.type === 'video' ? 'mp4' : 'jpg'}`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    openInstagramApp();
    toast.success(primaryMedia?.url
      ? 'Caption copied & photo saved — opening Instagram'
      : 'Caption copied — opening Instagram');
  };

  const markPublished = async () => {
    if (!item?.id) return;
    await supabaseService.updateContentItem(item.id, { status: 'published' });
    setItem(prev => prev ? { ...prev, status: 'published' } : null);
    toast.success('Marked as published');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#1d1d1f] dark:text-white font-medium">Post not found</p>
          <button
            onClick={() => navigate('/content-calendar')}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-sm font-medium"
          >
            Back to Content Calendar
          </button>
        </div>
      </div>
    );
  }

  // On a phone with Instagram selected, surface the one-tap "open & load photo" flow.
  const showInstagramQuickPost = IS_MOBILE && isInstagram;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <Breadcrumb items={[
          { label: 'Content Calendar', path: '/content-calendar' },
          { label: 'Post Due Today' }
        ]} />
        <button
          onClick={() => navigate('/content-calendar')}
          className="flex items-center gap-2 text-[#0071e3] text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Content Calendar
        </button>

        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white mb-2">Post due today</h1>
        <p className="text-[#86868b] text-sm mb-6">
          {showInstagramQuickPost
            ? 'Tap below to load the photo into Instagram, then paste the caption.'
            : 'Copy the caption and open the app to post.'}
        </p>

        <div className="mb-6 flex justify-center">
          <PostPreviewCard item={item} variant={item.platform} />
        </div>

        <div className="rounded-xl bg-white dark:bg-[#2d2d2d] border border-black/10 dark:border-white/10 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">Caption</label>
            <div className="p-3 rounded-lg bg-black/5 dark:bg-black/20 text-[#1d1d1f] dark:text-white text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
              {item.description || 'No caption'}
            </div>
          </div>

          {showInstagramQuickPost && (
            <button
              type="button"
              onClick={postToInstagram}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <Instagram className="w-5 h-5" />
              {shareFile ? 'Open Instagram & add photo' : 'Save photo & open Instagram'}
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCaption}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-sm font-medium hover:bg-[#0077ed]"
            >
              <Copy className="w-4 h-4" />
              Copy caption
            </button>
            <button
              type="button"
              onClick={showInstagramQuickPost ? openInstagramApp : openPlatform}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-sm font-medium hover:bg-black/15 dark:hover:bg-white/15"
            >
              {showInstagramQuickPost ? <Share2 className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
              Open in {platform === 'instagram' ? 'Instagram' : platform === 'facebook' ? 'Facebook' : platform === 'tiktok' ? 'TikTok' : item.platform}
            </button>
            {item.status !== 'published' && (
              <button
                type="button"
                onClick={markPublished}
                className="px-4 py-2.5 rounded-xl border border-[#34c759] text-[#34c759] text-sm font-medium hover:bg-[#34c759]/10"
              >
                Mark as published
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
