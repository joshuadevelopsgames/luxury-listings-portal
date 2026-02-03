/**
 * FeedbackButton - Floating feedback button with Bug Report, Feature Request, and Chat options
 * Based on LECRM's BugReportButton implementation
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { 
  MessageCircle, 
  Bug, 
  Lightbulb, 
  X, 
  Send,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Developer email for notifications
const DEVELOPER_EMAIL = 'joshua@smmluxurylistings.com';

export default function FeedbackButton() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('menu'); // 'menu', 'bug', 'feature', 'chat', 'chat-list', 'chat-detail'
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [bugForm, setBugForm] = useState({ title: '', description: '', priority: 'medium' });
  const [featureForm, setFeatureForm] = useState({ title: '', description: '' });
  const [chatMessage, setChatMessage] = useState('');
  
  // Chat states
  const [myChats, setMyChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);

  // Load user's chats
  const loadMyChats = async () => {
    if (!currentUser?.email) return;
    setLoadingChats(true);
    try {
      const chats = await firestoreService.getFeedbackChats(currentUser.email);
      setMyChats(chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  // Load chat detail with messages
  const loadChatDetail = async (chatId) => {
    try {
      const chat = await firestoreService.getFeedbackChatById(chatId);
      setSelectedChat(chat);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat');
    }
  };

  // Handle opening the panel
  const handleOpen = () => {
    setIsOpen(true);
    setView('menu');
  };

  // Handle closing
  const handleClose = () => {
    setIsOpen(false);
    setView('menu');
    setBugForm({ title: '', description: '', priority: 'medium' });
    setFeatureForm({ title: '', description: '' });
    setChatMessage('');
    setSelectedChat(null);
  };

  // Submit bug report
  const handleSubmitBug = async () => {
    if (!bugForm.title.trim() || !bugForm.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await firestoreService.createFeedback({
        type: 'bug',
        title: bugForm.title,
        description: bugForm.description,
        priority: bugForm.priority,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        status: 'open',
        url: window.location.href
      });

      toast.success('Bug report submitted! Thank you for your feedback.');
      handleClose();
    } catch (error) {
      console.error('Error submitting bug:', error);
      toast.error('Failed to submit bug report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit feature request
  const handleSubmitFeature = async () => {
    if (!featureForm.title.trim() || !featureForm.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await firestoreService.createFeedback({
        type: 'feature',
        title: featureForm.title,
        description: featureForm.description,
        priority: 'medium',
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        status: 'open',
        url: window.location.href
      });

      toast.success('Feature request submitted! Thank you for your suggestion.');
      handleClose();
    } catch (error) {
      console.error('Error submitting feature:', error);
      toast.error('Failed to submit feature request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start new chat
  const handleStartChat = async () => {
    if (!chatMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      const chatId = await firestoreService.createFeedbackChat({
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        initialMessage: chatMessage
      });

      toast.success('Chat started! Joshua will be notified.');
      setChatMessage('');
      await loadMyChats();
      setView('chat-list');
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send message in existing chat
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedChat) return;

    setIsSubmitting(true);
    try {
      await firestoreService.addFeedbackChatMessage(selectedChat.id, {
        message: chatMessage,
        senderEmail: currentUser?.email,
        senderName: currentUser?.displayName || currentUser?.firstName || 'User'
      });

      setChatMessage('');
      await loadChatDetail(selectedChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Menu options
  const menuOptions = [
    {
      id: 'bug',
      icon: Bug,
      label: 'Report a Bug',
      description: 'Found something broken?',
      color: '#ff3b30',
      bgColor: 'bg-[#ff3b30]/10'
    },
    {
      id: 'feature',
      icon: Lightbulb,
      label: 'Feature Request',
      description: 'Have an idea for improvement?',
      color: '#ff9500',
      bgColor: 'bg-[#ff9500]/10'
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat with Developer',
      description: 'Talk directly with Joshua',
      color: '#0071e3',
      bgColor: 'bg-[#0071e3]/10'
    }
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] text-white shadow-lg shadow-[#0071e3]/30 hover:shadow-xl hover:shadow-[#0071e3]/40 transition-all hover:scale-105 flex items-center justify-center z-40"
        title="Feedback & Support"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 bg-gradient-to-r from-[#0071e3]/5 to-[#5856d6]/5">
            <div className="flex items-center gap-3">
              {view !== 'menu' && view !== 'chat-list' && (
                <button
                  onClick={() => {
                    if (view === 'chat-detail') {
                      setView('chat-list');
                      setSelectedChat(null);
                    } else {
                      setView('menu');
                    }
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 text-[#86868b]" />
                </button>
              )}
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                {view === 'menu' && 'Feedback & Support'}
                {view === 'bug' && 'Report a Bug'}
                {view === 'feature' && 'Feature Request'}
                {view === 'chat' && 'New Chat'}
                {view === 'chat-list' && 'My Chats'}
                {view === 'chat-detail' && 'Chat'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#86868b]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {/* Menu View */}
            {view === 'menu' && (
              <div className="space-y-2">
                {menuOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (option.id === 'chat') {
                          loadMyChats();
                          setView('chat-list');
                        } else {
                          setView(option.id);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left group"
                    >
                      <div className={`w-10 h-10 rounded-xl ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" style={{ color: option.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">
                          {option.label}
                        </p>
                        <p className="text-[12px] text-[#86868b]">
                          {option.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868b] group-hover:text-[#1d1d1f] dark:group-hover:text-white transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bug Report Form */}
            {view === 'bug' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Title</label>
                  <input
                    type="text"
                    value={bugForm.title}
                    onChange={(e) => setBugForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of the bug"
                    className="w-full h-10 px-3 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Priority</label>
                  <select
                    value={bugForm.priority}
                    onChange={(e) => setBugForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Description</label>
                  <textarea
                    value={bugForm.description}
                    onChange={(e) => setBugForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What happened? What did you expect to happen?"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmitBug}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#ff3b30]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                </button>
              </div>
            )}

            {/* Feature Request Form */}
            {view === 'feature' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Feature Title</label>
                  <input
                    type="text"
                    value={featureForm.title}
                    onChange={(e) => setFeatureForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What feature would you like?"
                    className="w-full h-10 px-3 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Description</label>
                  <textarea
                    value={featureForm.description}
                    onChange={(e) => setFeatureForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the feature and how it would help you..."
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmitFeature}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-[#ff9500] text-white text-[14px] font-medium hover:bg-[#ff9500]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
                </button>
              </div>
            )}

            {/* Chat List View */}
            {view === 'chat-list' && (
              <div className="space-y-3">
                {/* New Chat Button */}
                <button
                  onClick={() => setView('chat')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0071e3]/10 hover:bg-[#0071e3]/20 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0071e3] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-[#0071e3]">Start New Chat</p>
                    <p className="text-[12px] text-[#86868b]">Message Joshua directly</p>
                  </div>
                </button>

                {/* Existing Chats */}
                {loadingChats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
                  </div>
                ) : myChats.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-[#86868b] mx-auto mb-2 opacity-50" />
                    <p className="text-[13px] text-[#86868b]">No chats yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wide px-1">Recent Chats</p>
                    {myChats.map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => {
                          loadChatDetail(chat.id);
                          setView('chat-detail');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          chat.status === 'closed' ? 'bg-[#86868b]/10' : 'bg-[#34c759]/10'
                        }`}>
                          {chat.status === 'closed' ? (
                            <CheckCircle2 className="w-5 h-5 text-[#86868b]" />
                          ) : (
                            <Clock className="w-5 h-5 text-[#34c759]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">
                            {chat.lastMessage || 'Chat'}
                          </p>
                          <p className="text-[11px] text-[#86868b]">
                            {chat.status === 'closed' ? 'Closed' : 'Open'} • {chat.messageCount || 0} messages
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#86868b]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Chat View */}
            {view === 'chat' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0071e3]/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-semibold text-[14px]">
                    J
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Joshua</p>
                    <p className="text-[12px] text-[#86868b]">Developer • Usually responds within a day</p>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Your Message</label>
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="What would you like to discuss?"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
                <button
                  onClick={handleStartChat}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSubmitting ? 'Starting...' : 'Start Chat'}
                </button>
              </div>
            )}

            {/* Chat Detail View */}
            {view === 'chat-detail' && selectedChat && (
              <div className="space-y-4">
                {/* Messages */}
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {selectedChat.messages?.map((msg, idx) => {
                    const isMe = msg.senderEmail === currentUser?.email;
                    return (
                      <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                          isMe 
                            ? 'bg-[#0071e3] text-white' 
                            : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white'
                        }`}>
                          <p className="text-[13px]">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-[#86868b]'}`}>
                            {msg.senderName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input */}
                {selectedChat.status !== 'closed' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 h-10 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSubmitting || !chatMessage.trim()}
                      className="w-10 h-10 rounded-xl bg-[#0071e3] text-white flex items-center justify-center hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-3 rounded-xl bg-[#86868b]/10">
                    <CheckCircle2 className="w-5 h-5 text-[#86868b] mx-auto mb-1" />
                    <p className="text-[12px] text-[#86868b]">This chat has been closed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
