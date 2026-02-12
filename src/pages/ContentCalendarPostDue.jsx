import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import PostPreviewCard from '../components/content/PostPreviewCard';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';

const OPEN_LINKS = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  tiktok: 'https://www.tiktok.com/',
  linkedin: 'https://www.linkedin.com/',
  twitter: 'https://twitter.com/',
  youtube: 'https://www.youtube.com/'
};

export default function ContentCalendarPostDue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !currentUser?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    firestoreService.getContentItem(id).then((data) => {
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

  const copyCaption = () => {
    if (!item?.description) return;
    navigator.clipboard.writeText(item.description).then(() => {
      toast.success('Caption copied to clipboard');
    }).catch(() => {
      toast.error('Could not copy');
    });
  };

  const openPlatform = () => {
    const platform = (item?.platform || 'instagram').toLowerCase();
    const url = OPEN_LINKS[platform] || OPEN_LINKS.instagram;
    window.open(url, '_blank');
  };

  const markPublished = async () => {
    if (!item?.id) return;
    await firestoreService.updateContentItem(item.id, { status: 'published' });
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

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/content-calendar')}
          className="flex items-center gap-2 text-[#0071e3] text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Content Calendar
        </button>

        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white mb-2">Post due today</h1>
        <p className="text-[#86868b] text-sm mb-6">Copy the caption and open the app to post.</p>

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
              onClick={openPlatform}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-sm font-medium hover:bg-black/15 dark:hover:bg-white/15"
            >
              <ExternalLink className="w-4 h-4" />
              Open in {item.platform === 'instagram' ? 'Instagram' : item.platform === 'facebook' ? 'Facebook' : item.platform === 'tiktok' ? 'TikTok' : item.platform}
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
