import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MessageSquare, Send, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { firestoreService } from '../../services/firestoreService';

const ClientMessaging = ({ clientId, clientEmail }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    // Set up real-time listener for messages if method exists
    if (firestoreService.onMessagesChange) {
      const unsubscribe = firestoreService.onMessagesChange(clientId, (updatedMessages) => {
        setMessages(updatedMessages);
      });
      return () => unsubscribe();
    }
  }, [clientId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // Load messages for this client
      // TODO: Implement getMessagesByClientId in firestoreService
      const clientMessages = await firestoreService.getMessagesByClient(clientId);
      setMessages(clientMessages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      // Fallback to localStorage for now
      const stored = localStorage.getItem(`messages_${clientId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const message = {
        clientId,
        clientEmail,
        senderEmail: clientEmail,
        senderName: 'Client',
        senderType: 'client',
        message: newMessage.trim(),
        timestamp: new Date(),
        read: false
      };

      // Save message
      await firestoreService.createMessage(message);
      
      // Also save to localStorage as backup
      const stored = localStorage.getItem(`messages_${clientId}`);
      const existingMessages = stored ? JSON.parse(stored) : [];
      existingMessages.push(message);
      localStorage.setItem(`messages_${clientId}`, JSON.stringify(existingMessages));

      setNewMessage('');
      setMessages([...messages, message]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Messages with Media Manager</h2>
        </div>

        {/* Messages List */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No messages yet. Start a conversation with your media manager!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isClient = msg.senderType === 'client';
              return (
                <div
                  key={idx}
                  className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md rounded-lg p-4 ${
                      isClient
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {msg.senderName || (isClient ? 'You' : 'Media Manager')}
                      </span>
                      {!msg.read && !isClient && (
                        <Badge className="bg-yellow-500 text-white text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                      <Clock className="w-3 h-3" />
                      {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ClientMessaging;

