/**
 * AdminChats - View and respond to user chats
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { 
  MessageSquare, 
  Send, 
  X, 
  Clock, 
  CheckCircle2,
  User,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminChats() {
  const { currentUser, isSystemAdmin } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    setLoading(true);
    try {
      const data = await firestoreService.getAllFeedbackChats();
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const loadChatDetail = async (chatId) => {
    try {
      const chat = await firestoreService.getFeedbackChatById(chatId);
      setSelectedChat(chat);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return;

    setSending(true);
    try {
      await firestoreService.addFeedbackChatMessage(selectedChat.id, {
        message: message.trim(),
        senderEmail: currentUser?.email || 'joshua@smmluxurylistings.com',
        senderName: 'Joshua'
      });

      setMessage('');
      await loadChatDetail(selectedChat.id);
      await loadChats();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseChat = async (chatId) => {
    try {
      await firestoreService.closeFeedbackChat(chatId);
      toast.success('Chat closed');
      if (selectedChat?.id === chatId) {
        await loadChatDetail(chatId);
      }
      await loadChats();
    } catch (error) {
      console.error('Error closing chat:', error);
      toast.error('Failed to close chat');
    }
  };

  const openChats = chats.filter(c => c.status === 'open');
  const closedChats = chats.filter(c => c.status === 'closed');

  if (!isSystemAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000] flex items-center justify-center">
        <p className="text-[#86868b]">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000] flex">
      {/* Sidebar - Chat List */}
      <div className="w-[320px] bg-white dark:bg-[#1c1c1e] border-r border-black/10 dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-black/5 dark:border-white/10">
          <h1 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Chats</h1>
          <p className="text-[13px] text-[#86868b]">{openChats.length} open, {closedChats.length} closed</p>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-[#86868b] mx-auto mb-2 opacity-50" />
              <p className="text-[13px] text-[#86868b]">No chats yet</p>
            </div>
          ) : (
            <>
              {/* Open Chats */}
              {openChats.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-medium text-[#86868b] uppercase tracking-wide bg-black/[0.02] dark:bg-white/[0.02]">
                    Open ({openChats.length})
                  </p>
                  {openChats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => loadChatDetail(chat.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-b border-black/5 dark:border-white/5 ${
                        selectedChat?.id === chat.id ? 'bg-[#0071e3]/5' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-semibold text-[14px] flex-shrink-0">
                        {chat.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">
                            {chat.userName || chat.userEmail}
                          </p>
                          <span className="w-2 h-2 rounded-full bg-[#34c759] flex-shrink-0" />
                        </div>
                        <p className="text-[12px] text-[#86868b] truncate">{chat.lastMessage}</p>
                        <p className="text-[11px] text-[#86868b] mt-1">
                          {chat.messageCount} messages
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Closed Chats */}
              {closedChats.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-medium text-[#86868b] uppercase tracking-wide bg-black/[0.02] dark:bg-white/[0.02]">
                    Closed ({closedChats.length})
                  </p>
                  {closedChats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => loadChatDetail(chat.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-b border-black/5 dark:border-white/5 opacity-60 ${
                        selectedChat?.id === chat.id ? 'bg-[#0071e3]/5 opacity-100' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#86868b]/20 flex items-center justify-center text-[#86868b] font-semibold text-[14px] flex-shrink-0">
                        {chat.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">
                            {chat.userName || chat.userEmail}
                          </p>
                          <CheckCircle2 className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                        </div>
                        <p className="text-[12px] text-[#86868b] truncate">{chat.lastMessage}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main - Chat Detail */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1c1c1e] border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-semibold text-[14px]">
                  {selectedChat.userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                    {selectedChat.userName || 'User'}
                  </p>
                  <p className="text-[12px] text-[#86868b]">{selectedChat.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedChat.status === 'open' && (
                  <button
                    onClick={() => handleCloseChat(selectedChat.id)}
                    className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#86868b]/10 text-[#86868b] text-[13px] font-medium hover:bg-[#86868b]/20 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Close Chat
                  </button>
                )}
                {selectedChat.status === 'closed' && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#34c759]/10 text-[#34c759] text-[12px] font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Closed
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedChat.messages?.map((msg, idx) => {
                const isMe = msg.senderEmail === currentUser?.email || msg.senderName === 'Joshua';
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[60%] ${isMe ? 'order-2' : 'order-1'}`}>
                      <div className={`px-4 py-3 rounded-2xl ${
                        isMe 
                          ? 'bg-[#0071e3] text-white rounded-br-md' 
                          : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white rounded-bl-md shadow-sm'
                      }`}>
                        <p className="text-[14px]">{msg.message}</p>
                      </div>
                      <p className={`text-[11px] text-[#86868b] mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {msg.senderName} • {msg.timestamp ? format(new Date(msg.timestamp), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedChat.status === 'open' ? (
              <div className="p-4 bg-white dark:bg-[#1c1c1e] border-t border-black/10 dark:border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type your reply..."
                    className="flex-1 h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#f5f5f7] dark:bg-[#2c2c2e] border-t border-black/10 dark:border-white/10 text-center">
                <p className="text-[13px] text-[#86868b]">This chat has been closed</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-[#86868b] mx-auto mb-4 opacity-30" />
              <p className="text-[17px] font-medium text-[#1d1d1f] dark:text-white mb-1">Select a chat</p>
              <p className="text-[14px] text-[#86868b]">Choose a conversation from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
