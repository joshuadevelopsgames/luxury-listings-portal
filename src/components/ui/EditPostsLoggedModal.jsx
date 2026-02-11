/**
 * EditPostsLoggedModal - Edit how many posts have been logged for a client this month.
 * Ensures postsUsed + postsRemaining = packageSize.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';

export default function EditPostsLoggedModal({ client, onClose, onSaved }) {
  const packageSize = Math.max(0, Number(client?.packageSize) ?? 0);
  const [postsUsed, setPostsUsed] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const used = Math.max(0, Math.min(packageSize, Number(client?.postsUsed) ?? 0));
    setPostsUsed(used);
  }, [client?.id, client?.postsUsed, packageSize]);

  const postsRemaining = Math.max(0, packageSize - postsUsed);
  const valid = packageSize > 0 && postsUsed >= 0 && postsUsed <= packageSize;

  const handleSave = async () => {
    if (!client?.id || !valid) return;
    setSaving(true);
    try {
      await firestoreService.updateClient(client.id, {
        postsUsed: postsUsed,
        postsRemaining: postsRemaining
      });
      toast.success(`Updated posts logged for ${client.clientName || 'client'}`);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (!client) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-sm shadow-2xl border border-black/10 dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Edit posts logged</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[13px] text-[#86868b]">
            {client.clientName || 'Client'} · Package: {packageSize} posts
          </p>
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Posts used this month</label>
            <input
              type="number"
              min={0}
              max={packageSize}
              value={postsUsed}
              onChange={e => setPostsUsed(Math.max(0, Math.min(packageSize, parseInt(e.target.value, 10) || 0)))}
              className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <p className="text-[12px] text-[#86868b]">
            Posts remaining: <span className="font-medium text-[#1d1d1f] dark:text-white">{postsRemaining}</span>
          </p>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-black/5 dark:border-white/10">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !valid} className="flex-1 h-11 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#30d158] disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
