/**
 * Feedback and Technical Support page
 * Full-page version of the floating feedback button: bug report, feature request, chat with developer.
 * Only reachable from Resources (no nav entry).
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Bug,
  Lightbulb,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { toast } from 'react-hot-toast';

export default function FeedbackSupportPage() {
  const { currentUser } = useAuth();
  const [feedbackCard, setFeedbackCard] = useState(null);
  const [pageBugForm, setPageBugForm] = useState({ title: '', description: '', priority: 'medium' });
  const [pageFeatureForm, setPageFeatureForm] = useState({ title: '', description: '' });
  const [pageChatMessage, setPageChatMessage] = useState('');
  const [pageUserChats, setPageUserChats] = useState([]);
  const [pageSelectedChat, setPageSelectedChat] = useState(null);
  const [pageSubmitting, setPageSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.email || feedbackCard !== 'chat') return;
    let cancelled = false;
    firestoreService.getFeedbackChats(currentUser.email).then((chats) => {
      if (!cancelled) setPageUserChats(chats || []);
    });
    return () => { cancelled = true; };
  }, [currentUser?.email, feedbackCard]);

  const handlePageSubmitBug = async () => {
    if (!pageBugForm.title.trim() || !pageBugForm.description.trim()) {
      toast.error('Please fill in title and description');
      return;
    }
    setPageSubmitting(true);
    try {
      await firestoreService.createFeedback({
        type: 'bug',
        title: pageBugForm.title,
        description: pageBugForm.description,
        priority: pageBugForm.priority,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        status: 'open',
        url: window.location.href
      });
      toast.success('Bug report submitted! Thank you.');
      setPageBugForm({ title: '', description: '', priority: 'medium' });
      setFeedbackCard(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit bug report');
    } finally {
      setPageSubmitting(false);
    }
  };

  const handlePageSubmitFeature = async () => {
    if (!pageFeatureForm.title.trim() || !pageFeatureForm.description.trim()) {
      toast.error('Please fill in title and description');
      return;
    }
    setPageSubmitting(true);
    try {
      await firestoreService.createFeedback({
        type: 'feature',
        title: pageFeatureForm.title,
        description: pageFeatureForm.description,
        priority: 'medium',
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        status: 'open',
        url: window.location.href
      });
      toast.success('Feature request submitted! Thank you.');
      setPageFeatureForm({ title: '', description: '' });
      setFeedbackCard(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit feature request');
    } finally {
      setPageSubmitting(false);
    }
  };

  const handlePageStartChat = async () => {
    if (!pageChatMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setPageSubmitting(true);
    try {
      const chatId = await firestoreService.createFeedbackChat({
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        initialMessage: pageChatMessage
      });
      toast.success('Chat started! The developer will be notified.');
      setPageChatMessage('');
      const chat = await firestoreService.getFeedbackChatById(chatId);
      setPageSelectedChat(chat);
      setPageUserChats((prev) => [chat, ...prev]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to start chat');
    } finally {
      setPageSubmitting(false);
    }
  };

  const handlePageSendMessage = async () => {
    if (!pageChatMessage.trim() || !pageSelectedChat) return;
    setPageSubmitting(true);
    try {
      await firestoreService.addFeedbackChatMessage(pageSelectedChat.id, {
        message: pageChatMessage,
        senderEmail: currentUser?.email,
        senderName: currentUser?.displayName || currentUser?.firstName || 'User'
      });
      setPageChatMessage('');
      const updated = await firestoreService.getFeedbackChatById(pageSelectedChat.id);
      setPageSelectedChat(updated);
      setPageUserChats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message');
    } finally {
      setPageSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 text-[13px] text-[#0071e3] dark:text-[#0a84ff] font-medium mb-8 hover:underline"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Resources
        </Link>

        <header className="mb-10">
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
            Feedback and Technical Support
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Submit a bug report, feature request, or chat with the developer.
          </p>
        </header>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="p-5">
            <p className="text-[13px] text-[#86868b] mb-4">Choose how you’d like to reach out:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFeedbackCard(feedbackCard === 'bug' ? null : 'bug')}
                className={`flex flex-col items-start gap-2 p-5 rounded-xl text-left border-2 transition-all ${
                  feedbackCard === 'bug'
                    ? 'border-[#ff3b30] bg-[#ff3b30]/5'
                    : 'border-transparent bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/10'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#ff3b30]/10">
                  <Bug className="w-5 h-5 text-[#ff3b30]" />
                </div>
                <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Report a Bug</span>
                <span className="text-[12px] text-[#86868b]">Something broken? Send details and we’ll fix it.</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackCard(feedbackCard === 'feature' ? null : 'feature')}
                className={`flex flex-col items-start gap-2 p-5 rounded-xl text-left border-2 transition-all ${
                  feedbackCard === 'feature'
                    ? 'border-[#ff9500] bg-[#ff9500]/5'
                    : 'border-transparent bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/10'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#ff9500]/10">
                  <Lightbulb className="w-5 h-5 text-[#ff9500]" />
                </div>
                <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Feature Request</span>
                <span className="text-[12px] text-[#86868b]">Have an idea? We’d love to hear it.</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackCard(feedbackCard === 'chat' ? null : 'chat')}
                className={`flex flex-col items-start gap-2 p-5 rounded-xl text-left border-2 transition-all ${
                  feedbackCard === 'chat'
                    ? 'border-[#0071e3] bg-[#0071e3]/5'
                    : 'border-transparent bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/10'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#0071e3]/10">
                  <MessageSquare className="w-5 h-5 text-[#0071e3]" />
                </div>
                <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Chat with Developer</span>
                <span className="text-[12px] text-[#86868b]">Talk directly with the developer.</span>
              </button>
            </div>

            {feedbackCard === 'bug' && (
              <div className="mt-6 p-5 rounded-xl bg-[#ff3b30]/5 border border-[#ff3b30]/20 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Bug Report</h3>
                <input
                  type="text"
                  placeholder="Short title"
                  value={pageBugForm.title}
                  onChange={(e) => setPageBugForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff3b30]"
                />
                <textarea
                  placeholder="What happened? Steps to reproduce, page URL, etc."
                  value={pageBugForm.description}
                  onChange={(e) => setPageBugForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff3b30] resize-none"
                />
                <div className="flex gap-2">
                  <select
                    value={pageBugForm.priority}
                    onChange={(e) => setPageBugForm((p) => ({ ...p, priority: e.target.value }))}
                    className="h-11 px-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff3b30]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <button
                    type="button"
                    onClick={handlePageSubmitBug}
                    disabled={pageSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#e6352b] disabled:opacity-50"
                  >
                    {pageSubmitting ? 'Sending…' : 'Submit'}
                  </button>
                </div>
              </div>
            )}

            {feedbackCard === 'feature' && (
              <div className="mt-6 p-5 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/20 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Feature Request</h3>
                <input
                  type="text"
                  placeholder="Short title"
                  value={pageFeatureForm.title}
                  onChange={(e) => setPageFeatureForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                />
                <textarea
                  placeholder="Describe your idea and why it would help."
                  value={pageFeatureForm.description}
                  onChange={(e) => setPageFeatureForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff9500] resize-none"
                />
                <button
                  type="button"
                  onClick={handlePageSubmitFeature}
                  disabled={pageSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#ff9500] text-white text-[14px] font-medium hover:bg-[#e68600] disabled:opacity-50"
                >
                  {pageSubmitting ? 'Sending…' : 'Submit'}
                </button>
              </div>
            )}

            {feedbackCard === 'chat' && (
              <div className="mt-6 p-5 rounded-xl bg-[#0071e3]/5 border border-[#0071e3]/20 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Chat with Developer</h3>
                {!pageSelectedChat ? (
                  <>
                    <textarea
                      placeholder="Start the conversation — ask a question or describe what you need."
                      value={pageChatMessage}
                      onChange={(e) => setPageChatMessage(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    />
                    <button
                      type="button"
                      onClick={handlePageStartChat}
                      disabled={pageSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-50"
                    >
                      {pageSubmitting ? 'Starting…' : 'Start chat'}
                    </button>
                    {pageUserChats.length > 0 && (
                      <div className="pt-4 border-t border-black/5 dark:border-white/10">
                        <p className="text-[12px] font-medium text-[#86868b] mb-2">Or continue an existing chat:</p>
                        <div className="space-y-2">
                          {pageUserChats.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={async () => {
                                const chat = await firestoreService.getFeedbackChatById(c.id);
                                setPageSelectedChat(chat);
                                if (chat.status === 'open') {
                                  firestoreService.updateFeedbackChatUserLastRead(c.id).catch(() => {});
                                }
                              }}
                              className="w-full text-left px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15"
                            >
                              <span className={c.status === 'closed' ? 'text-[#86868b]' : ''}>{c.lastMessage?.substring(0, 60)}…</span>
                              {c.status === 'closed' && <span className="text-[11px] text-[#86868b] ml-1">(closed)</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPageSelectedChat(null)}
                      className="text-[12px] text-[#0071e3] hover:underline"
                    >
                      ← Back to chats
                    </button>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-3 rounded-lg bg-black/5 dark:bg-white/5">
                      {(pageSelectedChat.messages || []).map((m, i) => (
                        <div key={i} className="text-[13px]">
                          <span className="font-medium text-[#86868b]">{m.senderName || 'Developer'}:</span>{' '}
                          <span className="text-[#1d1d1f] dark:text-white">{m.message}</span>
                        </div>
                      ))}
                    </div>
                    {pageSelectedChat.status === 'open' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message…"
                          value={pageChatMessage}
                          onChange={(e) => setPageChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePageSendMessage()}
                          className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                        <button
                          type="button"
                          onClick={handlePageSendMessage}
                          disabled={pageSubmitting}
                          className="px-5 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-black/5 dark:border-white/10 text-center">
                        <p className="text-[13px] text-[#86868b]">This chat was closed. Start a new chat to message again.</p>
                        <button
                          type="button"
                          onClick={() => { setPageSelectedChat(null); setPageChatMessage(''); }}
                          className="mt-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed]"
                        >
                          Start new chat
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
