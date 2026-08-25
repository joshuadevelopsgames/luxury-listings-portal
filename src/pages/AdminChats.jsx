/**
 * AdminChats - View and respond to user chats
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
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
  const { currentUser } = useAuth();
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
      const data = await supabaseService.getAllFeedbackChats();
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
      const chat = await supabaseService.getFeedbackChatById(chatId);
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
      await supabaseService.addFeedbackChatMessage(selectedChat.id, {
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
      await supabaseService.closeFeedbackChat(chatId);
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

  return (
    <div className="min-h-screen bg-surface-2 dark:bg-[#000] flex">
      {/* Sidebar - Chat List */}
      <div className="w-[320px] bg-surface border-r border-hairline-strong flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-hairline">
          <h1 className="text-[20px] font-semibold text-ink">Chats</h1>
          <p className="text-[13px] text-ink-muted">{openChats.length} open, {closedChats.length} closed</p>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-ink-muted mx-auto mb-2 opacity-50" />
              <p className="text-[13px] text-ink-muted">No chats yet</p>
            </div>
          ) : (
            <>
              {/* Open Chats */}
              {openChats.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-medium text-ink-muted uppercase tracking-wide bg-black/[0.02] dark:bg-white/[0.02]">
                    Open ({openChats.length})
                  </p>
                  {openChats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => loadChatDetail(chat.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-b border-black/5 dark:border-white/5 ${
                        selectedChat?.id === chat.id ? 'bg-brand/5' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand flex items-center justify-center text-white font-semibold text-[14px] flex-shrink-0">
                        {chat.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[14px] font-medium text-ink truncate">
                            {chat.userName || chat.userEmail}
                          </p>
                          <span className="w-2 h-2 rounded-full bg-positive flex-shrink-0" />
                        </div>
                        <p className="text-[12px] text-ink-muted truncate">{chat.lastMessage}</p>
                        <p className="text-[11px] text-ink-muted mt-1">
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
                  <p className="px-4 py-2 text-[11px] font-medium text-ink-muted uppercase tracking-wide bg-black/[0.02] dark:bg-white/[0.02]">
                    Closed ({closedChats.length})
                  </p>
                  {closedChats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => loadChatDetail(chat.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-b border-black/5 dark:border-white/5 opacity-60 ${
                        selectedChat?.id === chat.id ? 'bg-brand/5 opacity-100' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-ink-muted/20 flex items-center justify-center text-ink-muted font-semibold text-[14px] flex-shrink-0">
                        {chat.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[14px] font-medium text-ink truncate">
                            {chat.userName || chat.userEmail}
                          </p>
                          <CheckCircle2 className="w-4 h-4 text-ink-muted flex-shrink-0" />
                        </div>
                        <p className="text-[12px] text-ink-muted truncate">{chat.lastMessage}</p>
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
            <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-hairline-strong">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand flex items-center justify-center text-white font-semibold text-[14px]">
                  {selectedChat.userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-[15px] font-medium text-ink">
                    {selectedChat.userName || 'User'}
                  </p>
                  <p className="text-[12px] text-ink-muted">{selectedChat.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedChat.status === 'open' && (
                  <button
                    onClick={() => handleCloseChat(selectedChat.id)}
                    className="flex items-center gap-2 px-4 h-9 rounded-xl bg-ink-muted/10 text-ink-muted text-[13px] font-medium hover:bg-ink-muted/20 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Close Chat
                  </button>
                )}
                {selectedChat.status === 'closed' && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-positive/10 text-positive text-[12px] font-medium">
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
                      <div className={`px-4 py-3 rounded-xl ${
                        isMe 
                          ? 'bg-brand text-white rounded-br-md' 
                          : 'bg-surface text-ink rounded-bl-md shadow-sm'
                      }`}>
                        <p className="text-[14px]">{msg.message}</p>
                      </div>
                      <p className={`text-[11px] text-ink-muted mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
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
              <div className="p-4 bg-surface border-t border-hairline-strong">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type your reply..."
                    className="flex-1 h-11 px-4 rounded-xl bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-surface-2 border-t border-hairline-strong text-center">
                <p className="text-[13px] text-ink-muted">This chat has been closed</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-ink-muted mx-auto mb-4 opacity-30" />
              <p className="text-[17px] font-medium text-ink mb-1">Select a chat</p>
              <p className="text-[14px] text-ink-muted">Choose a conversation from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
