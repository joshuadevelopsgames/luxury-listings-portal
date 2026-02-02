import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { slackOAuthService } from '../../services/slackOAuthService';
import { Button } from './button';
import { 
  MessageSquare, 
  X, 
  Send, 
  Minimize2, 
  Hash,
  Loader2,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Users,
  LogOut,
  LogIn
} from 'lucide-react';

/**
 * Slack Chat Widget with Individual User Login
 * Each user authenticates with their own Slack account
 */
const SlackChatWidget = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showChannelList, setShowChannelList] = useState(false);
  const [userCache, setUserCache] = useState({});
  
  // OAuth state
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollInterval = useRef(null);

  // Check connection status on mount and when user changes
  useEffect(() => {
    if (currentUser?.email) {
      checkConnection();
    } else {
      setIsConnected(false);
      setIsCheckingConnection(false);
    }
  }, [currentUser?.email]);

  // Load channels when connected and widget opens
  useEffect(() => {
    if (isOpen && isConnected && channels.length === 0) {
      loadChannels();
    }
  }, [isOpen, isConnected]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when channel selected
  useEffect(() => {
    if (selectedChannel && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedChannel]);

  // Poll for new messages
  useEffect(() => {
    if (selectedChannel && isOpen && isConnected) {
      pollInterval.current = setInterval(() => {
        loadMessages(selectedChannel.id, true);
      }, 5000);
      
      return () => clearInterval(pollInterval.current);
    }
  }, [selectedChannel, isOpen, isConnected]);

  const checkConnection = async () => {
    if (!currentUser?.email) return;
    
    setIsCheckingConnection(true);
    try {
      const connected = await slackOAuthService.initializeForUser(currentUser.email);
      setIsConnected(connected);
      
      if (connected) {
        const info = await slackOAuthService.getConnectionInfo(currentUser.email);
        setConnectionInfo(info);
      }
    } catch (err) {
      console.error('Error checking Slack connection:', err);
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnect = () => {
    if (!currentUser?.email) {
      setError('Please log in first');
      return;
    }
    
    try {
      const authUrl = slackOAuthService.getAuthorizationUrl(currentUser.email);
      window.location.href = authUrl;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUser?.email) return;
    
    try {
      await slackOAuthService.disconnectUser(currentUser.email);
      setIsConnected(false);
      setConnectionInfo(null);
      setChannels([]);
      setSelectedChannel(null);
      setMessages([]);
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  const loadChannels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const channelList = await slackOAuthService.getChannels();
      setChannels(channelList);
      
      // Auto-select first channel
      if (channelList.length > 0 && !selectedChannel) {
        selectChannel(channelList[0]);
      }
    } catch (err) {
      if (err.message?.includes('expired') || err.message?.includes('reconnect')) {
        setIsConnected(false);
        setError('Session expired. Please reconnect.');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (channelId, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const msgs = await slackOAuthService.getMessages(channelId, 50);
      
      // Enrich messages with user info
      const enrichedMsgs = await enrichMessagesWithUsers(msgs);
      setMessages(enrichedMsgs);
      setError(null);
    } catch (err) {
      if (!silent) {
        if (err.message?.includes('expired') || err.message?.includes('reconnect')) {
          setIsConnected(false);
          setError('Session expired. Please reconnect.');
        } else {
          setError(err.message);
        }
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const enrichMessagesWithUsers = async (msgs) => {
    const newCache = { ...userCache };
    const userIds = [...new Set(msgs.map(m => m.user).filter(Boolean))];
    
    for (const userId of userIds) {
      if (!newCache[userId]) {
        const user = await slackOAuthService.getUserInfo(userId);
        if (user) {
          newCache[userId] = {
            name: user.real_name || user.name,
            avatar: user.profile?.image_48,
          };
        }
      }
    }
    
    setUserCache(newCache);
    
    return msgs.map(msg => ({
      ...msg,
      userName: newCache[msg.user]?.name || 'Unknown User',
      userAvatar: newCache[msg.user]?.avatar,
    }));
  };

  const selectChannel = async (channel) => {
    setSelectedChannel(channel);
    setShowChannelList(false);
    setMessages([]);
    await loadMessages(channel.id);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedChannel || isSending) return;

    const messageText = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic update
    const optimisticMsg = {
      ts: Date.now().toString(),
      text: messageText,
      user: 'me',
      userName: 'You',
      pending: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await slackOAuthService.sendMessage(selectedChannel.id, messageText);
      // Refresh messages to get the actual sent message
      await loadMessages(selectedChannel.id, true);
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.ts !== optimisticMsg.ts));
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const formatTimestamp = (ts) => {
    const date = new Date(parseFloat(ts) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChannelIcon = (channel) => {
    if (channel.is_im) return '💬';
    if (channel.is_mpim) return '👥';
    if (channel.is_private) return '🔒';
    return '#';
  };

  // Not connected UI
  const renderConnectPrompt = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
        <LogIn className="w-8 h-8 text-purple-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">Connect Your Slack</h3>
      <p className="text-sm text-gray-600 mb-4">
        Sign in with your Slack account to chat with your team.
      </p>
      <Button
        onClick={handleConnect}
        className="bg-[#4A154B] hover:bg-[#611f69] text-white"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
        </svg>
        Sign in with Slack
      </Button>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-20 z-50">
      {/* Floating Slack Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-[#4A154B] hover:bg-[#611f69] text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 relative"
          title="Open Slack Chat"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          {isConnected && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 h-[500px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#4A154B] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
              </svg>
              <div>
                <span className="font-semibold">Slack</span>
                {connectionInfo?.teamName && (
                  <div className="text-xs text-purple-200">
                    {connectionInfo.teamName}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="text-white hover:text-purple-200 p-1 rounded transition-colors"
                  title="Disconnect Slack"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => isConnected && selectedChannel && loadMessages(selectedChannel.id)}
                className="text-white hover:text-purple-200 p-1 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={toggleChat}
                className="text-white hover:text-purple-200 p-1 rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-purple-200 p-1 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection check loading */}
          {isCheckingConnection ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          ) : !isConnected ? (
            renderConnectPrompt()
          ) : (
            <>
              {/* Channel Selector */}
              {channels.length > 0 && (
                <div className="relative border-b border-gray-200">
                  <button
                    onClick={() => setShowChannelList(!showChannelList)}
                    className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center text-sm">
                      <span className="mr-2">{selectedChannel ? getChannelIcon(selectedChannel) : '#'}</span>
                      <span className="font-medium text-gray-700">
                        {selectedChannel?.name || 'Select Channel'}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showChannelList ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showChannelList && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {channels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => selectChannel(channel)}
                          className={`w-full px-4 py-2 text-left flex items-center text-sm hover:bg-purple-50 transition-colors ${
                            selectedChannel?.id === channel.id ? 'bg-purple-100 text-purple-700' : 'text-gray-700'
                          }`}
                        >
                          <span className="mr-2">{getChannelIcon(channel)}</span>
                          {channel.name || channel.user}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                {error ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <p className="text-sm text-red-600">{error}</p>
                    <Button
                      onClick={() => { setError(null); loadChannels(); }}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : isLoading && messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {messages.length === 0 && selectedChannel && (
                      <div className="text-center text-gray-500 text-sm py-8">
                        No messages yet in this channel
                      </div>
                    )}
                    {messages.map((message) => (
                      <div
                        key={message.ts}
                        className={`flex items-start space-x-3 ${message.pending ? 'opacity-50' : ''}`}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {message.userAvatar ? (
                            <img
                              src={message.userAvatar}
                              alt={message.userName}
                              className="w-8 h-8 rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center">
                              <span className="text-xs font-medium text-purple-700">
                                {message.userName?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline space-x-2">
                            <span className="font-semibold text-sm text-gray-900">
                              {message.userName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(message.ts)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                            {message.text}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              {selectedChannel && (
                <div className="border-t border-gray-200 p-3 bg-white">
                  <div className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${selectedChannel.is_im ? '' : '#'}${selectedChannel.name || ''}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      disabled={isSending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isSending}
                      className="bg-[#4A154B] hover:bg-[#611f69] text-white px-3 py-2"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SlackChatWidget;
