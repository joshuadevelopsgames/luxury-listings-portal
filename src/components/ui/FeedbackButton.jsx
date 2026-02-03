/**
 * FeedbackButton - Floating feedback button with Bug Report, Feature Request, and Chat options
 * Based on LECRM's BugReportButton implementation
 * Includes console capture and element selection for bug reports
 */

import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  MousePointer2,
  Minus,
  Maximize2
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
  const [activeChat, setActiveChat] = useState(null); // Currently active chat for quick access
  const [isMinimized, setIsMinimized] = useState(() => {
    // Check if there was an active chat on page load
    return localStorage.getItem('feedbackActiveChatId') !== null;
  });
  const chatPollRef = useRef(null);
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
          element.style.outline = '2px solid #0071e3';
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
      setActiveChat(chat);
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
      const chats = await firestoreService.getFeedbackChats(currentUser.email);
      const openChat = chats?.find(c => c.status === 'open');
      
      if (openChat) {
        // Open existing chat
        const chat = await loadChatDetail(openChat.id);
        setView('chat-detail');
        startChatPolling(openChat.id);
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

  // Start polling for chat updates
  const startChatPolling = (chatId) => {
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    
    chatPollRef.current = setInterval(async () => {
      try {
        const chat = await firestoreService.getFeedbackChatById(chatId);
        if (chat) {
          setSelectedChat(chat);
          setActiveChat(chat);
          // Check if chat was closed by developer
          if (chat.status === 'closed' || chat.status === 'archived') {
            stopChatPolling();
            localStorage.removeItem('feedbackActiveChatId');
            setIsMinimized(false);
          }
        }
      } catch (error) {
        console.error('Error polling chat:', error);
      }
    }, 5000); // Poll every 5 seconds
  };

  // Stop polling
  const stopChatPolling = () => {
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopChatPolling();
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
          const chat = await firestoreService.getFeedbackChatById(savedChatId);
          if (chat && chat.status === 'open') {
            setActiveChat(chat);
            setSelectedChat(chat);
            // Start polling in background
            startChatPolling(savedChatId);
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

  // Handle opening the panel
  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    // If there's an active chat, restore it
    if (activeChat && activeChat.status === 'open') {
      setSelectedChat(activeChat);
      setView('chat-detail');
      startChatPolling(activeChat.id);
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
      // Keep polling in background
    } else {
      setIsOpen(false);
      setIsMinimized(false);
      setView('menu');
      setBugForm({ title: '', description: '', priority: 'medium' });
      setFeatureForm({ title: '', description: '' });
      setChatMessage('');
      setSelectedChat(null);
      setSelectedElement(null);
      stopChatPolling();
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
    stopChatPolling();
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

      await firestoreService.createFeedback({
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
      
      // Load the new chat and enter chatroom
      const chat = await loadChatDetail(chatId);
      if (chat) {
        setView('chat-detail');
        startChatPolling(chatId);
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
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-40 ${
          isMinimized && activeChat?.status === 'open'
            ? 'bg-[#34c759] shadow-[#34c759]/30 hover:shadow-[#34c759]/40 animate-pulse'
            : 'bg-gradient-to-br from-[#0071e3] to-[#5856d6] shadow-[#0071e3]/30 hover:shadow-[#0071e3]/40'
        }`}
        title={isMinimized ? 'Return to chat' : 'Feedback & Support'}
      >
        {isMinimized && activeChat?.status === 'open' ? (
          <MessageSquare className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        {isMinimized && activeChat?.status === 'open' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <span className="w-2 h-2 bg-[#34c759] rounded-full animate-ping" />
          </span>
        )}
      </button>

      {/* Inspection Mode Indicator */}
      {isInspecting && (
        <div className="inspection-indicator fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#0071e3] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4">
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
        <div className="feedback-panel fixed bottom-24 right-6 w-[360px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-50 overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 flex-shrink-0 ${
            view === 'chat-detail' && selectedChat?.status === 'open'
              ? 'bg-gradient-to-r from-[#34c759]/5 to-[#0071e3]/5'
              : 'bg-gradient-to-r from-[#0071e3]/5 to-[#5856d6]/5'
          }`}>
            <div className="flex items-center gap-3">
              {view !== 'menu' && view !== 'chat-list' && view !== 'chat-detail' && (
                <button
                  onClick={() => {
                    setView('menu');
                    setSelectedElement(null);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 text-[#86868b]" />
                </button>
              )}
              {(view === 'chat-list' || view === 'chat') && (
                <button
                  onClick={() => {
                    setView('menu');
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
                {view === 'chat-detail' && (
                  <div className="flex items-center gap-2">
                    <span>Chat with Joshua</span>
                    {selectedChat?.status === 'open' && (
                      <span className="w-2 h-2 bg-[#34c759] rounded-full" />
                    )}
                  </div>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {view === 'chat-detail' && selectedChat?.status === 'open' && (
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                  title="Minimize chat"
                >
                  <Minus className="w-5 h-5 text-[#86868b]" />
                </button>
              )}
              <button
                onClick={view === 'chat-detail' ? handleEndChat : handleClose}
                className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                title={view === 'chat-detail' ? 'End chat session' : 'Close'}
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
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
                          openChatDirect();
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
                {/* Element Selection */}
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Problem Area (Optional)</label>
                  {!selectedElement ? (
                    <button
                      onClick={handleStartInspection}
                      className="w-full h-10 px-3 rounded-lg bg-[#0071e3]/10 border border-[#0071e3]/20 text-[14px] text-[#0071e3] font-medium hover:bg-[#0071e3]/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <MousePointer2 className="w-4 h-4" />
                      Click to Select Element
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#34c759]/10 border border-[#34c759]/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-medium text-[#34c759]">Element Selected</span>
                        <button
                          onClick={() => setSelectedElement(null)}
                          className="text-[#86868b] hover:text-[#1d1d1f]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[12px] text-[#1d1d1f] dark:text-white">
                        &lt;{selectedElement.tagName.toLowerCase()}&gt;
                        {selectedElement.id && ` #${selectedElement.id}`}
                        {selectedElement.className && ` .${selectedElement.className.split(' ')[0]}`}
                      </p>
                      {selectedElement.textContent && (
                        <p className="text-[11px] text-[#86868b] mt-1 truncate">
                          "{selectedElement.textContent.substring(0, 50)}..."
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Title *</label>
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
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Description *</label>
                  <textarea
                    value={bugForm.description}
                    onChange={(e) => setBugForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What happened? What did you expect to happen?"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
                <p className="text-[11px] text-[#86868b]">
                  Console logs and browser info will be automatically included.
                </p>
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

            {/* Chat Detail View - Loading */}
            {view === 'chat-detail' && loadingChats && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0071e3] mb-3" />
                <p className="text-[13px] text-[#86868b]">Loading chat...</p>
              </div>
            )}

            {/* Chat Detail View */}
            {view === 'chat-detail' && selectedChat && !loadingChats && (
              <div className="flex flex-col h-full">
                {/* Messages */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] mb-4">
                  {selectedChat.messages?.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-[#86868b] mx-auto mb-2 opacity-50" />
                      <p className="text-[13px] text-[#86868b]">No messages yet</p>
                    </div>
                  ) : (
                    selectedChat.messages?.map((msg, idx) => {
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
                  <div className="text-center py-4 rounded-xl bg-[#86868b]/10">
                    <CheckCircle2 className="w-6 h-6 text-[#86868b] mx-auto mb-2" />
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Chat Ended</p>
                    <p className="text-[12px] text-[#86868b] mt-1">This conversation has been closed by the developer.</p>
                    <button
                      onClick={() => {
                        setActiveChat(null);
                        setSelectedChat(null);
                        setView('menu');
                        localStorage.removeItem('feedbackActiveChatId');
                      }}
                      className="mt-3 px-4 py-2 rounded-lg bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-colors"
                    >
                      Start New Chat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Footer for Submit Buttons */}
          {view === 'bug' && (
            <div className="flex-shrink-0 p-4 border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#1c1c1e]">
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

          {view === 'feature' && (
            <div className="flex-shrink-0 p-4 border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#1c1c1e]">
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
        </div>
      )}
    </>
  );
}
