/**
 * FeedbackButton - Floating feedback button with Bug Report, Feature Request, and Chat options
 * Based on LECRM's BugReportButton implementation
 * Includes console capture and element selection for bug reports
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseService } from '../../services/supabaseService';
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
  MessageSquare,
  MousePointer2,
  Minus,
  Maximize2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Developer emails (last message from any of these = "developer replied" for unread badge)
const DEVELOPER_EMAILS = ['joshua@smmluxurylistings.com', 'jrsschroeder@gmail.com'].map(e => e.toLowerCase());

function hasUnread(chat, currentUserEmail) {
  if (!chat?.messages?.length || !currentUserEmail) return false;
  const last = chat.messages[chat.messages.length - 1];
  const fromDeveloper = last.senderEmail && DEVELOPER_EMAILS.includes(String(last.senderEmail).toLowerCase());
  if (!fromDeveloper) return false;
  const lastRead = chat.userLastReadAt?.toDate?.() ?? (chat.userLastReadAt ? new Date(chat.userLastReadAt) : null);
  if (!lastRead) return true;
  return new Date(last.timestamp) > lastRead;
}

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
  const [activeChat, setActiveChat] = useState(null); // Currently active chat for quick access
  const [isMinimized, setIsMinimized] = useState(() => {
    // Check if there was an active chat on page load
    return localStorage.getItem('feedbackActiveChatId') !== null;
  });
  const chatUnsubscribeRef = useRef(null);
  const hasRestoredChat = useRef(false);

  // Element inspection states
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  // Console capture
  const consoleLogRef = useRef([]);
  const originalConsoleRef = useRef(null);
  const consoleCaptureStartedRef = useRef(false);

  // Capture console logs on mount
  useEffect(() => {
    if (consoleCaptureStartedRef.current) return;
    consoleCaptureStartedRef.current = true;

    originalConsoleRef.current = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    const formatArgs = (args) => {
      try {
        return args.map(arg => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (arg && typeof arg === 'object' && (arg.nodeType !== undefined || arg instanceof Element)) {
            return `[${arg.tagName || arg.nodeName || 'DOMNode'}]`;
          }
          if (typeof arg === 'object') {
            try {
              const seen = new WeakSet();
              return JSON.stringify(arg, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                  if (seen.has(value)) return '[Circular]';
                  if (value.nodeType !== undefined) return `[${value.tagName || 'DOMNode'}]`;
                  seen.add(value);
                }
                return value;
              }, 2);
            } catch {
              return '[Object]';
            }
          }
          return String(arg);
        }).join(' ');
      } catch {
        return '[Error formatting]';
      }
    };

    const safeCaptureLog = (type, args) => {
      setTimeout(() => {
        try {
          const message = formatArgs(args);
          const MAX_LOGS = 500;
          if (consoleLogRef.current.length >= MAX_LOGS) {
            consoleLogRef.current.shift();
          }
          consoleLogRef.current.push({
            type,
            message,
            timestamp: new Date().toISOString()
          });
        } catch {}
      }, 0);
    };

    console.log = (...args) => {
      originalConsoleRef.current.log(...args);
      safeCaptureLog('log', args);
    };
    console.error = (...args) => {
      originalConsoleRef.current.error(...args);
      safeCaptureLog('error', args);
    };
    console.warn = (...args) => {
      originalConsoleRef.current.warn(...args);
      safeCaptureLog('warn', args);
    };
    console.info = (...args) => {
      originalConsoleRef.current.info(...args);
      safeCaptureLog('info', args);
    };
  }, []);

  // Element inspection mode
  useEffect(() => {
    if (!isInspecting) return;

    const removeAllOutlines = () => {
      requestAnimationFrame(() => {
        document.querySelectorAll('*').forEach(el => {
          try {
            if (el.isConnected && el.style.outline) {
              el.style.outline = '';
              el.style.outlineOffset = '';
            }
          } catch {}
        });
      });
    };

    const handleMouseOver = (e) => {
      e.stopPropagation();
      const element = e.target;
      if (element && element !== document.body && !element.closest('.feedback-panel')) {
        if (document.body.contains(element)) {
          element.style.outline = '2px solid var(--ds-accent)';
          element.style.outlineOffset = '2px';
        }
      }
    };

    const handleMouseOut = (e) => {
      const element = e.target;
      if (element && document.body.contains(element)) {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }
    };

    const getXPath = (element) => {
      if (element.id) return `//*[@id="${element.id}"]`;
      if (element === document.body) return '/html/body';
      let ix = 0;
      const siblings = element.parentNode?.childNodes || [];
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          return `${getXPath(element.parentNode)}/${element.tagName.toLowerCase()}[${ix + 1}]`;
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
          ix++;
        }
      }
      return '';
    };

    const handleClick = (e) => {
      if (e.target.closest('.feedback-panel') || e.target.closest('.inspection-indicator')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const element = e.target;
      if (element && element !== document.body) {
        const classNameValue = element.className;
        const classNameString = typeof classNameValue === 'string' 
          ? classNameValue 
          : (classNameValue?.baseVal || '');
        
        const elementInfo = {
          tagName: element.tagName,
          id: element.id || '',
          className: classNameString,
          textContent: element.textContent?.substring(0, 200) || '',
          attributes: Array.from(element.attributes || []).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          boundingRect: (() => {
            const rect = element.getBoundingClientRect();
            return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right };
          })(),
          xpath: getXPath(element),
        };

        setSelectedElement(elementInfo);
        setIsInspecting(false);
        setIsOpen(true);
        removeAllOutlines();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsInspecting(false);
        setIsOpen(true);
        removeAllOutlines();
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleEscape);
      removeAllOutlines();
    };
  }, [isInspecting]);

  // Load user's chats
  const loadMyChats = async () => {
    if (!currentUser?.email) return;
    setLoadingChats(true);
    try {
      const chats = await supabaseService.getFeedbackChats(currentUser.email);
      setMyChats(chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  // Load chat detail with messages
  const loadChatDetail = async (chatId, markRead = false) => {
    try {
      const chat = await supabaseService.getFeedbackChatById(chatId);
      setSelectedChat(chat);
      setActiveChat(chat);
      if (markRead) {
        try {
          await supabaseService.updateFeedbackChatUserLastRead(chatId);
          const updated = await supabaseService.getFeedbackChatById(chatId);
          setSelectedChat(updated);
          setActiveChat(updated);
          setMyChats(prev => prev.map(c => c.id === chatId ? updated : c));
        } catch {}
      }
      return chat;
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat');
      return null;
    }
  };

  // Open chat directly - find existing open chat or create new one
  const openChatDirect = async () => {
    setLoadingChats(true);
    try {
      // Check for existing open chat
      const chats = await supabaseService.getFeedbackChats(currentUser.email);
      const openChat = chats?.find(c => c.status === 'open');
      
      if (openChat) {
        // Open existing chat and mark as read
        await loadChatDetail(openChat.id, true);
        setView('chat-detail');
        startChatSubscription(openChat.id);
      } else {
        // Go to new chat form
        setView('chat');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      setView('chat');
    } finally {
      setLoadingChats(false);
    }
  };

  // Real-time subscription to chat updates
  const startChatSubscription = (chatId) => {
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
      chatUnsubscribeRef.current = null;
    }
    chatUnsubscribeRef.current = supabaseService.subscribeToFeedbackChat(chatId, (chat) => {
      if (!chat) return;
      setSelectedChat(chat);
      setActiveChat(chat);
      if (chat.status === 'closed' || chat.status === 'archived') {
        stopChatSubscription();
        localStorage.removeItem('feedbackActiveChatId');
        setIsMinimized(false);
      }
    });
  };

  const stopChatSubscription = () => {
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
      chatUnsubscribeRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopChatSubscription();
  }, []);

  // Persist active chat ID to localStorage
  useEffect(() => {
    if (activeChat?.id && activeChat.status === 'open') {
      localStorage.setItem('feedbackActiveChatId', activeChat.id);
    }
  }, [activeChat]);

  // Restore active chat from localStorage on mount
  useEffect(() => {
    if (hasRestoredChat.current || !currentUser?.email) return;
    
    const savedChatId = localStorage.getItem('feedbackActiveChatId');
    if (savedChatId) {
      hasRestoredChat.current = true;
      // Load the saved chat in background
      (async () => {
        try {
          const chat = await supabaseService.getFeedbackChatById(savedChatId);
          if (chat && chat.status === 'open') {
            setActiveChat(chat);
            setSelectedChat(chat);
            // Start real-time subscription
            startChatSubscription(savedChatId);
          } else {
            // Chat was closed, clear localStorage
            localStorage.removeItem('feedbackActiveChatId');
            setIsMinimized(false);
          }
        } catch (error) {
          console.error('Error restoring chat:', error);
          localStorage.removeItem('feedbackActiveChatId');
          setIsMinimized(false);
        }
      })();
    }
  }, [currentUser?.email]);

  // Load myChats in background so unread badge can show (e.g. when minimized)
  useEffect(() => {
    if (!currentUser?.email) return;
    supabaseService.getFeedbackChats(currentUser.email).then(setMyChats).catch(() => {});
  }, [currentUser?.email]);

  // Handle opening the panel
  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    // If there's an active chat, restore it and mark as read
    if (activeChat && activeChat.status === 'open') {
      setSelectedChat(activeChat);
      setView('chat-detail');
      startChatSubscription(activeChat.id);
      supabaseService.updateFeedbackChatUserLastRead(activeChat.id).then(() => {
        supabaseService.getFeedbackChatById(activeChat.id).then((updated) => {
          setSelectedChat(updated);
          setActiveChat(updated);
          setMyChats(prev => prev.map(c => c.id === activeChat.id ? updated : c));
        });
      }).catch(() => {});
    } else {
      setView('menu');
    }
  };

  // Handle closing/minimizing
  const handleClose = () => {
    // If in chat view with active chat, minimize instead of fully closing
    if (view === 'chat-detail' && selectedChat && selectedChat.status === 'open') {
      setIsOpen(false);
      setIsMinimized(true);
      // Keep real-time subscription active
    } else {
      setIsOpen(false);
      setIsMinimized(false);
      setView('menu');
      setBugForm({ title: '', description: '', priority: 'medium' });
      setFeatureForm({ title: '', description: '' });
      setChatMessage('');
      setSelectedChat(null);
      setSelectedElement(null);
      stopChatSubscription();
      setActiveChat(null);
    }
  };

  // Fully close chat (end session)
  const handleEndChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setView('menu');
    setChatMessage('');
    setSelectedChat(null);
    setActiveChat(null);
    stopChatSubscription();
    localStorage.removeItem('feedbackActiveChatId');
  };

  // Start element inspection
  const handleStartInspection = () => {
    setIsInspecting(true);
    setSelectedElement(null);
    setIsOpen(false);
  };

  // Cancel inspection
  const handleCancelInspection = () => {
    setIsInspecting(false);
    setIsOpen(true);
  };

  // Submit bug report
  const handleSubmitBug = async () => {
    if (!bugForm.title.trim() || !bugForm.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get console logs (limit to recent 300)
      const consoleLogs = consoleLogRef.current.slice(-300);

      await supabaseService.createFeedback({
        type: 'bug',
        title: bugForm.title,
        description: bugForm.description,
        priority: bugForm.priority,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        status: 'open',
        url: window.location.href,
        selectedElement: selectedElement,
        consoleLogs: consoleLogs,
        userInfo: {
          userAgent: navigator.userAgent,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          timestamp: new Date().toISOString()
        }
      });

      toast.success('Bug report submitted! Thank you for your feedback.');
      setBugForm({ title: '', description: '', priority: 'medium' });
      setSelectedElement(null);
      // Return to active chat if exists, otherwise close
      if (activeChat && activeChat.status === 'open') {
        setSelectedChat(activeChat);
        setView('chat-detail');
      } else {
        handleClose();
      }
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
      await supabaseService.createFeedback({
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
      setFeatureForm({ title: '', description: '' });
      // Return to active chat if exists, otherwise close
      if (activeChat && activeChat.status === 'open') {
        setSelectedChat(activeChat);
        setView('chat-detail');
      } else {
        handleClose();
      }
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
      const chatId = await supabaseService.createFeedbackChat({
        userEmail: currentUser?.email,
        userName: currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim(),
        initialMessage: chatMessage
      });

      toast.success('Chat started! Joshua will be notified.');
      setChatMessage('');
      
      // Load the new chat and enter chatroom
      const chat = await loadChatDetail(chatId);
      if (chat) {
        setView('chat-detail');
        startChatSubscription(chatId);
      }
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
      await supabaseService.addFeedbackChatMessage(selectedChat.id, {
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
      color: 'var(--ds-danger)',
      bgColor: 'bg-danger/10'
    },
    {
      id: 'feature',
      icon: Lightbulb,
      label: 'Feature Request',
      description: 'Have an idea for improvement?',
      color: 'var(--ds-warning)',
      bgColor: 'bg-warning/10'
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat with Developer',
      description: 'Talk directly with Joshua',
      color: 'var(--ds-info)',
      bgColor: 'bg-brand/10'
    }
  ];

  const showUnreadBadge = (activeChat && hasUnread(activeChat, currentUser?.email)) || (myChats.length > 0 && myChats.some(c => hasUnread(c, currentUser?.email)));

  return (
    <>
      {/* Floating support button. Kept in the bottom-right corner, but styled as
          a solid neutral control: no gradient, gloss layer, coloured glow or
          hover scale — those are what made it read as a marketing widget. */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 w-12 h-10 rounded-full flex items-center justify-center z-40 transition-colors shadow-md ${
          isMinimized && activeChat?.status === 'open'
            ? 'bg-positive hover:opacity-90'
            : 'bg-ink hover:bg-ink-muted'
        }`}
        title={isMinimized ? 'Return to chat' : 'Feedback & Support'}
      >
        {/* ink/canvas invert together, so the glyph stays legible in both
            themes without a `dark:` variant. */}
        <span
          className={
            isMinimized && activeChat?.status === 'open'
              ? 'text-white'
              : 'text-canvas'
          }
        >
          {isMinimized && activeChat?.status === 'open' ? (
            <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
          ) : (
            <MessageCircle className="w-5 h-5" strokeWidth={1.75} />
          )}
        </span>
        {showUnreadBadge && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-danger rounded-full ring-2 ring-canvas"
            aria-label="New message"
          />
        )}
      </button>

      {/* Inspection Mode Indicator */}
      {isInspecting && (
        <div className="inspection-indicator fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-brand text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MousePointer2 className="w-5 h-5" />
            <div>
              <p className="text-[14px] font-medium">Inspection Mode</p>
              <p className="text-[12px] opacity-80">Click on the problematic element, or press ESC to cancel</p>
            </div>
          </div>
          <button
            onClick={handleCancelInspection}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="feedback-panel fixed bottom-24 right-6 w-[360px] bg-surface rounded-xl shadow-lg border border-hairline-strong z-50 overflow-hidden flex flex-col max-h-[min(600px,calc(100vh-8rem))]">
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0 ${
            view === 'chat-detail' && selectedChat?.status === 'open'
              ? 'bg-black/[0.02] dark:bg-white/[0.03]'
              : 'bg-black/[0.02] dark:bg-white/[0.03]'
          }`}>
            <div className="flex items-center gap-3">
              {view !== 'menu' && view !== 'chat-list' && view !== 'chat' && view !== 'chat-detail' && (
                <button
                  onClick={() => {
                    // Return to active chat if exists, otherwise menu (bug/feature only)
                    if (activeChat && activeChat.status === 'open') {
                      setSelectedChat(activeChat);
                      setView('chat-detail');
                    } else {
                      setView('menu');
                    }
                    setSelectedElement(null);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 text-ink-muted" />
                </button>
              )}
              {(view === 'chat-list' || view === 'chat') && (
                <button
                  onClick={() => {
                    setView('menu');
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 text-ink-muted" />
                </button>
              )}
              <h3 className="text-[15px] font-semibold text-ink">
                {view === 'menu' && 'Feedback & Support'}
                {view === 'bug' && 'Report a Bug'}
                {view === 'feature' && 'Feature Request'}
                {view === 'chat' && 'New Chat'}
                {view === 'chat-list' && 'My Chats'}
                {view === 'chat-detail' && (
                  <div className="flex items-center gap-2">
                    <span>Chat with Joshua</span>
                    {selectedChat?.status === 'open' && (
                      <span className="w-2 h-2 bg-positive rounded-full" />
                    )}
                  </div>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {/* Quick actions while in chat */}
              {view === 'chat-detail' && selectedChat?.status === 'open' && (
                <>
                  <button
                    onClick={() => setView('bug')}
                    className="w-8 h-8 rounded-lg hover:bg-danger/10 flex items-center justify-center transition-colors"
                    title="Report a bug"
                  >
                    <Bug className="w-4 h-4 text-danger" />
                  </button>
                  <button
                    onClick={() => setView('feature')}
                    className="w-8 h-8 rounded-lg hover:bg-warning/10 flex items-center justify-center transition-colors"
                    title="Request a feature"
                  >
                    <Lightbulb className="w-4 h-4 text-warning" />
                  </button>
                  <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1" />
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center"
                    title="Minimize chat"
                  >
                    <Minus className="w-5 h-5 text-ink-muted" />
                  </button>
                </>
              )}
              <button
                onClick={view === 'chat-detail' ? handleEndChat : handleClose}
                className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center"
                title={view === 'chat-detail' ? 'End chat session' : 'Close'}
              >
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            {/* Menu View */}
            {view === 'menu' && (
              <div className="space-y-2">
                <a
                  href="/feedback-support"
                  className="block mt-1 mb-3 text-center text-[12px] text-brand hover:underline"
                >
                  Open full Feedback & Support page →
                </a>
                {menuOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (option.id === 'chat') {
                          openChatDirect();
                        } else {
                          setView(option.id);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-surface-3 transition-colors text-left group"
                    >
                      <div className={`w-10 h-10 rounded-xl ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" style={{ color: option.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-ink">
                          {option.label}
                        </p>
                        <p className="text-[12px] text-ink-muted">
                          {option.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink dark:group-hover:text-white transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bug Report Form */}
            {view === 'bug' && (
              <div className="space-y-4">
                {/* Element Selection */}
                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Problem Area (Optional)</label>
                  {!selectedElement ? (
                    <button
                      onClick={handleStartInspection}
                      className="w-full h-10 px-3 rounded-lg bg-brand/10 border border-brand/20 text-[14px] text-brand font-medium hover:bg-brand/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <MousePointer2 className="w-4 h-4" />
                      Click to Select Element
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-positive/10 border border-positive/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-medium text-positive">Element Selected</span>
                        <button
                          onClick={() => setSelectedElement(null)}
                          className="text-ink-muted hover:text-ink"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[12px] text-ink">
                        &lt;{selectedElement.tagName.toLowerCase()}&gt;
                        {selectedElement.id && ` #${selectedElement.id}`}
                        {selectedElement.className && ` .${selectedElement.className.split(' ')[0]}`}
                      </p>
                      {selectedElement.textContent && (
                        <p className="text-[11px] text-ink-muted mt-1 truncate">
                          "{selectedElement.textContent.substring(0, 50)}..."
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={bugForm.title}
                    onChange={(e) => setBugForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of the bug"
                    className="w-full h-10 px-3 rounded-lg bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Priority</label>
                  <select
                    value={bugForm.priority}
                    onChange={(e) => setBugForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-surface border border-hairline-strong text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Description *</label>
                  <textarea
                    value={bugForm.description}
                    onChange={(e) => setBugForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What happened? What did you expect to happen?"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>
                <p className="text-[11px] text-ink-muted">
                  Console logs and browser info will be automatically included.
                </p>
              </div>
            )}

            {/* Feature Request Form */}
            {view === 'feature' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Feature Title</label>
                  <input
                    type="text"
                    value={featureForm.title}
                    onChange={(e) => setFeatureForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What feature would you like?"
                    className="w-full h-10 px-3 rounded-lg bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Description</label>
                  <textarea
                    value={featureForm.description}
                    onChange={(e) => setFeatureForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the feature and how it would help you..."
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>
              </div>
            )}

            {/* Chat List View */}
            {view === 'chat-list' && (
              <div className="space-y-3">
                {/* New Chat Button */}
                <button
                  onClick={() => setView('chat')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-brand/10 hover:bg-brand/20 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-brand">Start New Chat</p>
                    <p className="text-[12px] text-ink-muted">Message Joshua directly</p>
                  </div>
                </button>

                {/* Existing Chats */}
                {loadingChats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
                  </div>
                ) : myChats.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-ink-muted mx-auto mb-2 opacity-50" />
                    <p className="text-[13px] text-ink-muted">No chats yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide px-1">Recent Chats</p>
                    {myChats.map(chat => (
                      <button
                        key={chat.id}
                        onClick={async () => {
                          await loadChatDetail(chat.id, true);
                          setView('chat-detail');
                          if (chat.status === 'open') startChatSubscription(chat.id);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-3 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          chat.status === 'closed' ? 'bg-ink-muted/10' : 'bg-positive/10'
                        }`}>
                          {chat.status === 'closed' ? (
                            <CheckCircle2 className="w-5 h-5 text-ink-muted" />
                          ) : (
                            <Clock className="w-5 h-5 text-positive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 relative">
                          <p className="text-[13px] font-medium text-ink truncate">
                            {chat.lastMessage || 'Chat'}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {chat.status === 'closed' ? 'Closed' : 'Open'} • {chat.messageCount || 0} messages
                          </p>
                          {chat.status === 'open' && hasUnread(chat, currentUser?.email) && (
                            <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full" />
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Chat View */}
            {view === 'chat' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-brand/5">
                  <div className="w-10 h-10 rounded-full bg-ink dark:bg-white/20 flex items-center justify-center text-white font-semibold text-[14px]">
                    J
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-ink">Joshua</p>
                    <p className="text-[12px] text-ink-muted">Developer • Usually responds within a day</p>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Your Message</label>
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="What would you like to discuss?"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>
                <button
                  onClick={handleStartChat}
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSubmitting ? 'Starting...' : 'Start Chat'}
                </button>
              </div>
            )}

            {/* Chat Detail View - Loading */}
            {view === 'chat-detail' && loadingChats && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand mb-3" />
                <p className="text-[13px] text-ink-muted">Loading chat...</p>
              </div>
            )}

            {/* Chat Detail View */}
            {view === 'chat-detail' && selectedChat && !loadingChats && (
              <div className="flex flex-col h-full">
                {/* Messages */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] mb-4">
                  {selectedChat.messages?.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-ink-muted mx-auto mb-2 opacity-50" />
                      <p className="text-[13px] text-ink-muted">No messages yet</p>
                    </div>
                  ) : (
                    selectedChat.messages?.map((msg, idx) => {
                      const isMe = msg.senderEmail === currentUser?.email;
                      return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                            isMe 
                              ? 'bg-brand text-white' 
                              : 'bg-surface-3 text-ink'
                          }`}>
                            <p className="text-[13px]">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-ink-muted'}`}>
                              {msg.senderName}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Input */}
                {selectedChat.status === 'open' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 h-10 px-3 rounded-xl bg-surface border border-hairline-strong text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSubmitting || !chatMessage.trim()}
                      className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 rounded-xl bg-ink-muted/10">
                    <CheckCircle2 className="w-6 h-6 text-ink-muted mx-auto mb-2" />
                    <p className="text-[13px] font-medium text-ink">Chat ended</p>
                    <p className="text-[12px] text-ink-muted mt-1">This conversation was closed. Start a new chat to message again (you’ll be notified).</p>
                    <button
                      onClick={() => {
                        setActiveChat(null);
                        setSelectedChat(null);
                        setView('chat');
                        setChatMessage('');
                        localStorage.removeItem('feedbackActiveChatId');
                        stopChatSubscription();
                      }}
                      className="mt-3 px-4 py-2 rounded-lg bg-brand text-white text-[12px] font-medium hover:bg-brand-hover transition-colors"
                    >
                      Start new chat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Footer for Submit Buttons */}
          {view === 'bug' && (
            <div className="flex-shrink-0 p-4 border-t border-hairline bg-surface">
              <button
                onClick={handleSubmitBug}
                disabled={isSubmitting}
                className="w-full h-10 rounded-xl bg-danger text-white text-[14px] font-medium hover:bg-danger/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
                {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
              </button>
            </div>
          )}

          {view === 'feature' && (
            <div className="flex-shrink-0 p-4 border-t border-hairline bg-surface">
              <button
                onClick={handleSubmitFeature}
                disabled={isSubmitting}
                className="w-full h-10 rounded-xl bg-warning text-white text-[14px] font-medium hover:bg-warning/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
