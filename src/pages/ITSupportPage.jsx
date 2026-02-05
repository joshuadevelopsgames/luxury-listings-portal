import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Wrench,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Send,
  X,
  ExternalLink,
  Bug,
  Lightbulb,
  MessageSquare,
  ChevronRight,
  Trash2,
  Archive,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';

const ITSupportPage = () => {
  const { currentUser, currentRole } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [ticketComments, setTicketComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [ticketToClose, setTicketToClose] = useState(null);
  const [closingReason, setClosingReason] = useState('');
  
  // Admin tabs and feedback/chat state
  const [activeAdminTab, setActiveAdminTab] = useState('tickets');
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackChats, setFeedbackChats] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatReply, setChatReply] = useState('');
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);
  
  // Notification counts for new items
  const [prevFeedbackCount, setPrevFeedbackCount] = useState(0);
  const [prevChatCount, setPrevChatCount] = useState(0);
  const [newBugCount, setNewBugCount] = useState(0);
  const [newFeatureCount, setNewFeatureCount] = useState(0);
  const [newChatCount, setNewChatCount] = useState(0);

  // Google Apps Script URL for email notifications
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4ugw4vME8hCeaE3Bieu7gsrNJqbGHxkNwZR97vKi0wVbaQNMgGFnG3W-lKrkwXzFkdQ/exec';

  // Support request form state
  const [supportForm, setSupportForm] = useState({
    title: '',
    category: 'technical',
    priority: 'medium',
    pageUrl: '',
    description: '',
    screenshotUrl: ''
  });

  // Feedback and Technical Support page (for non-admin): bug / feature / chat
  const [feedbackCard, setFeedbackCard] = useState(null);
  const [pageBugForm, setPageBugForm] = useState({ title: '', description: '', priority: 'medium' });
  const [pageFeatureForm, setPageFeatureForm] = useState({ title: '', description: '' });
  const [pageChatMessage, setPageChatMessage] = useState('');
  const [pageUserChats, setPageUserChats] = useState([]);
  const [pageSelectedChat, setPageSelectedChat] = useState(null);
  const [pageSubmitting, setPageSubmitting] = useState(false);

  // IT Support can see all tickets - admin or if email is jrsschroeder@gmail.com
  const isITSupport = currentRole === 'admin' || currentUser?.email === 'jrsschroeder@gmail.com';

  // Non-admins: redirect to the dedicated feedback/support page (no nav entry)
  useEffect(() => {
    if (currentUser && !isITSupport) {
      navigate('/feedback-support', { replace: true });
    }
  }, [currentUser, isITSupport, navigate]);

  // Load user's chats when they open the Chat card (non-admin)
  useEffect(() => {
    if (!currentUser?.email || feedbackCard !== 'chat' || isITSupport) return;
    let cancelled = false;
    firestoreService.getFeedbackChats(currentUser.email).then((chats) => {
      if (!cancelled) setPageUserChats(chats || []);
    });
    return () => { cancelled = true; };
  }, [currentUser?.email, feedbackCard, isITSupport]);

  // Submit bug from page (non-admin)
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

  // Submit feature from page (non-admin)
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

  // Start new chat from page (non-admin)
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

  // Send message in existing chat from page (non-admin)
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

  // Load feedback and chats for IT Support with polling for new items
  useEffect(() => {
    if (!isITSupport) return;
    
    const loadFeedbackData = async (isPolling = false) => {
      if (!isPolling) setLoadingFeedback(true);
      try {
        const [feedback, chats] = await Promise.all([
          firestoreService.getAllFeedback(),
          firestoreService.getAllFeedbackChats()
        ]);
        
        // Check for new items (only after initial load)
        if (prevFeedbackCount > 0 || prevChatCount > 0) {
          const currentBugs = (feedback || []).filter(f => f.type === 'bug' && f.status === 'open').length;
          const currentFeatures = (feedback || []).filter(f => f.type === 'feature' && f.status === 'open').length;
          const currentChats = (chats || []).filter(c => c.status === 'open').length;
          
          const prevBugs = feedbackItems.filter(f => f.type === 'bug' && f.status === 'open').length;
          const prevFeatures = feedbackItems.filter(f => f.type === 'feature' && f.status === 'open').length;
          const prevChatsOpen = feedbackChats.filter(c => c.status === 'open').length;
          
          if (currentBugs > prevBugs) {
            setNewBugCount(prev => prev + (currentBugs - prevBugs));
          }
          if (currentFeatures > prevFeatures) {
            setNewFeatureCount(prev => prev + (currentFeatures - prevFeatures));
          }
          if (currentChats > prevChatsOpen) {
            setNewChatCount(prev => prev + (currentChats - prevChatsOpen));
          }
        }
        
        setPrevFeedbackCount((feedback || []).length);
        setPrevChatCount((chats || []).length);
        setFeedbackItems(feedback || []);
        setFeedbackChats(chats || []);
      } catch (error) {
        console.error('Error loading feedback data:', error);
      } finally {
        if (!isPolling) setLoadingFeedback(false);
      }
    };
    
    loadFeedbackData();
    
    // Poll every 30 seconds for new items
    const pollInterval = setInterval(() => loadFeedbackData(true), 30000);
    
    return () => clearInterval(pollInterval);
  }, [isITSupport]);

  // Load comments when a ticket is selected
  useEffect(() => {
    if (!selectedTicket?.id) {
      setTicketComments([]);
      return;
    }

    console.log('📡 Loading comments for ticket:', selectedTicket.id);
    
    // Timeout fallback for comments
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Comments loading timeout');
      // Don't clear comments, just log
    }, 5000);

    try {
      const unsubscribe = firestoreService.onTicketCommentsChange(selectedTicket.id, (comments) => {
        clearTimeout(timeoutId);
        console.log('💬 Comments loaded:', comments.length, comments);
        setTicketComments(comments);
      });

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error loading comments:', error);
      clearTimeout(timeoutId);
    }
  }, [selectedTicket?.id]);

  // Load support tickets from Firestore
  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Set up real-time listener with timeout fallback
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Loading timeout - assuming no tickets');
      setLoading(false);
    }, 5000);

    try {
      const unsubscribe = firestoreService.onSupportTicketsChange((tickets) => {
        clearTimeout(timeoutId);
        console.log('📡 Support tickets updated:', tickets.length);
        // If IT Support, show all tickets, else show only user's tickets
        const filteredTickets = isITSupport 
          ? tickets 
          : tickets.filter(t => t.requesterEmail === currentUser.email);
        
        // Sort by submittedDate descending (newest first)
        const sortedTickets = [...filteredTickets].sort((a, b) => {
          const dateA = a.submittedDate?.toDate ? a.submittedDate.toDate() : new Date(a.submittedDate);
          const dateB = b.submittedDate?.toDate ? b.submittedDate.toDate() : new Date(b.submittedDate);
          return dateB - dateA;
        });
        
        setMyTickets(sortedTickets);
        setLoading(false);
      }, isITSupport ? null : currentUser.email);

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error loading support tickets:', error);
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [currentUser?.email, isITSupport]);

  const categories = [
    { value: 'technical', label: 'Technical Issue', icon: Wrench, color: 'blue' },
    { value: 'access', label: 'Access/Permissions', icon: AlertCircle, color: 'orange' },
    { value: 'account', label: 'Account Issue', icon: FileText, color: 'purple' },
    { value: 'other', label: 'Other', icon: FileText, color: 'gray' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-[#34c759]/10 text-[#34c759]';
      case 'in_progress': return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'pending': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'closed': return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
      default: return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Wrench className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleFormChange = (field, value) => {
    setSupportForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitting(true);
    
    try {
      const newTicket = {
        requesterEmail: currentUser.email,
        requesterName: `${currentUser.firstName} ${currentUser.lastName}`,
        title: supportForm.title,
        category: supportForm.category,
        priority: supportForm.priority,
        pageUrl: supportForm.pageUrl,
        description: supportForm.description,
        screenshotUrl: supportForm.screenshotUrl,
        status: 'pending'
      };

      const result = await firestoreService.submitSupportTicket(newTicket);
      
      if (result.success) {
        console.log('✅ Support ticket submitted:', result.id);
        
        // Send email notification to IT support
        try {
          const params = new URLSearchParams({
            action: 'sendSupportEmail',
            ticketData: JSON.stringify(newTicket)
          });
          
          const emailUrl = `${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`;
          console.log('📧 Sending email via:', emailUrl);
          console.log('📧 Ticket data:', newTicket);
          
          // Use image request to avoid CORS issues
          const img = new Image();
          img.onerror = () => console.log('✅ Email request completed (errors are normal for image requests)');
          img.onload = () => console.log('✅ Email request completed successfully');
          img.src = emailUrl;
          
          console.log('📧 Email notification request sent');
        } catch (emailError) {
          console.error('⚠️ Email notification failed (ticket still saved):', emailError);
          // Don't block user flow if email fails
        }
        
        toast.success('Support request submitted! We\'ll get back to you soon.');
        setShowRequestModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('❌ Error submitting support ticket:', error);
      toast.error(`Failed to submit request: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSupportForm({
      title: '',
      category: 'technical',
      priority: 'medium',
      pageUrl: '',
      description: '',
      screenshotUrl: ''
    });
    setPreviewImage(null);
    setPreviewFile(null);
    setUploadError(null);
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilePreview(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFilePreview(e.target.files[0]);
    }
  };

  // Create preview and auto-upload to Imgur
  const handleFilePreview = async (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, GIF, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
      setPreviewFile(file);
    };
    reader.readAsDataURL(file);

    // Try to auto-upload to imgbb (more reliable than Imgur)
    setUploading(true);
    setUploadError(null);

    try {
      // Convert file to base64 for imgbb
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get base64 without data:image prefix
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      console.log('📤 Uploading to imgbb...');
      console.log('📦 File details:', { name: file.name, size: file.size, type: file.type });

      // imgbb API key from api.imgbb.com
      const IMGBB_API_KEY = '1e52042b16f9d095084295e32d073030';
      
      const formData = new FormData();
      formData.append('image', base64Image);
      formData.append('name', file.name);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      console.log('📡 imgbb response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ imgbb API error response:', errorText);
        throw new Error(`imgbb API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 imgbb response data:', data);

      if (data.success && data.data && data.data.url) {
        handleFormChange('screenshotUrl', data.data.url);
        console.log('✅ Image uploaded to imgbb:', data.data.url);
      } else {
        console.error('❌ Unexpected imgbb response:', data);
        throw new Error('Upload failed: No image link returned');
      }
    } catch (error) {
      console.error('❌ imgbb upload failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setUploadError(error.message);
      // Don't alert - just show fallback UI
    } finally {
      setUploading(false);
    }
  };

  // Remove preview
  const handleRemovePreview = () => {
    setPreviewImage(null);
    setPreviewFile(null);
  };

  // Open imgbb upload in new tab
  const handleOpenImgbb = () => {
    window.open('https://imgbb.com', '_blank');
  };

  // Handle status update (IT Support only)
  const handleStatusUpdate = async (ticketId, newStatus, closingNotes = '') => {
    console.log('🔄 Updating ticket status:', ticketId, 'to', newStatus);
    
    try {
      const resolvedBy = isITSupport ? `${currentUser.firstName} ${currentUser.lastName}` : null;
      
      console.log('📤 Calling updateSupportTicketStatus with:', {
        ticketId,
        newStatus,
        resolvedBy,
        notes: closingNotes
      });
      
      await firestoreService.updateSupportTicketStatus(ticketId, newStatus, resolvedBy, closingNotes);
      console.log('✅ Ticket status updated successfully');
      
      // Close the modal after status update
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (error) {
      console.error('❌ Error updating ticket status:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      toast.error(`Failed to update ticket status: ${error.message}`);
    }
  };

  // Show close dialog
  const handleCloseTicketClick = (ticket, e) => {
    e.stopPropagation();
    setTicketToClose(ticket);
    setClosingReason('');
    setShowCloseDialog(true);
  };

  // Confirm close with reason
  const handleConfirmClose = async () => {
    if (ticketToClose) {
      await handleStatusUpdate(ticketToClose.id, 'closed', closingReason);
      setShowCloseDialog(false);
      setTicketToClose(null);
      setClosingReason('');
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;

    console.log('💬 Submitting comment to ticket:', selectedTicket.id);

    try {
      const commentData = {
        authorEmail: currentUser.email,
        authorName: `${currentUser.firstName} ${currentUser.lastName}`,
        comment: newComment.trim(),
        isITSupport: isITSupport,
        notifyUserEmail: isITSupport ? selectedTicket.requesterEmail : null
      };
      
      console.log('💬 Comment data:', commentData);
      
      const result = await firestoreService.addTicketComment(selectedTicket.id, commentData);
      
      console.log('✅ Comment added successfully:', result);
      setNewComment('');
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      console.error('❌ Error details:', error.message, error.code);
      toast.error(`Failed to add comment: ${error.message}`);
    }
  };

  // Get stats for IT admin dashboard
  const ticketStats = {
    total: myTickets.length,
    pending: myTickets.filter(t => t.status === 'pending').length,
    inProgress: myTickets.filter(t => t.status === 'in_progress').length,
    resolved: myTickets.filter(t => t.status === 'resolved').length,
    urgent: myTickets.filter(t => t.priority === 'urgent').length,
  };

  // Feedback stats
  const feedbackStats = {
    bugs: feedbackItems.filter(f => f.type === 'bug').length,
    features: feedbackItems.filter(f => f.type === 'feature').length,
    openBugs: feedbackItems.filter(f => f.type === 'bug' && f.status === 'open').length,
    openChats: feedbackChats.filter(c => c.status === 'open').length,
  };

  // Update feedback status
  const handleFeedbackStatusUpdate = async (feedbackId, newStatus) => {
    try {
      await firestoreService.updateFeedbackStatus(feedbackId, newStatus);
      setFeedbackItems(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, status: newStatus } : f
      ));
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast.error('Failed to update status');
    }
  };

  // Send chat reply
  const handleChatReply = async () => {
    if (!chatReply.trim() || !selectedChat) return;
    
    try {
      await firestoreService.addFeedbackChatMessage(selectedChat.id, {
        message: chatReply.trim(),
        senderEmail: currentUser?.email,
        senderName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'IT Support'
      });
      
      // Reload chat
      const updatedChat = await firestoreService.getFeedbackChatById(selectedChat.id);
      setSelectedChat(updatedChat);
      setFeedbackChats(prev => prev.map(c => 
        c.id === selectedChat.id ? updatedChat : c
      ));
      setChatReply('');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    }
  };

  // Close chat
  const handleCloseChat = async (chatId) => {
    try {
      await firestoreService.closeFeedbackChat(chatId);
      setFeedbackChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, status: 'closed' } : c
      ));
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => ({ ...prev, status: 'closed' }));
      }
    } catch (error) {
      console.error('Error closing chat:', error);
      toast.error('Failed to close chat');
    }
  };

  // Delete feedback (bug report or feature request)
  const handleDeleteFeedback = async (feedbackId) => {
    const confirmed = await confirm({
      title: 'Delete Feedback',
      message: 'Are you sure you want to delete this? This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    setDeletingFeedbackId(feedbackId);
    try {
      await firestoreService.deleteFeedback(feedbackId);
      setFeedbackItems(prev => prev.filter(f => f.id !== feedbackId));
      setSelectedFeedback(null);
      toast.success('Feedback deleted');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete');
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  // Archive chat
  const handleArchiveChat = async (chatId) => {
    try {
      await firestoreService.archiveFeedbackChat(chatId);
      setFeedbackChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, status: 'archived' } : c
      ));
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => ({ ...prev, status: 'archived' }));
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
      toast.error('Failed to archive chat');
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatId) => {
    const confirmed = await confirm({
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat? This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    setDeletingChatId(chatId);
    try {
      await firestoreService.deleteFeedbackChat(chatId);
      setFeedbackChats(prev => prev.filter(c => c.id !== chatId));
      setSelectedChat(null);
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    } finally {
      setDeletingChatId(null);
    }
  };

  // Non-admins are redirected to /feedback-support; avoid flashing this page
  if (currentUser && !isITSupport) {
    return null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
            IT Support Dashboard
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Manage support tickets and help team members
          </p>
        </div>
        <button 
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Support Ticket</span>
        </button>
      </div>

      {/* Removed: Feedback & Support (bug/feature/chat) for non-admin — now on /feedback-support */}

      {false && (
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

            {/* Bug form */}
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

            {/* Feature form */}
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

            {/* Chat */}
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
                              onClick={() => setPageSelectedChat(c)}
                              className="w-full text-left px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10 text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15"
                            >
                              {c.lastMessage?.substring(0, 60)}…
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* IT Admin Stats Dashboard */}
      {isITSupport && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 text-center">
            <p className="text-[12px] text-[#86868b]">Total Tickets</p>
            <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white mt-1">{ticketStats.total}</p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 text-center">
            <p className="text-[12px] text-[#86868b]">Pending</p>
            <p className="text-[28px] font-semibold text-[#ff9500] mt-1">{ticketStats.pending}</p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 text-center">
            <p className="text-[12px] text-[#86868b]">In Progress</p>
            <p className="text-[28px] font-semibold text-[#0071e3] mt-1">{ticketStats.inProgress}</p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 text-center">
            <p className="text-[12px] text-[#86868b]">Resolved</p>
            <p className="text-[28px] font-semibold text-[#34c759] mt-1">{ticketStats.resolved}</p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 text-center">
            <p className="text-[12px] text-[#86868b]">🚨 Urgent</p>
            <p className="text-[28px] font-semibold text-[#ff3b30] mt-1">{ticketStats.urgent}</p>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      {isITSupport && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveAdminTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeAdminTab === 'tickets'
                ? 'bg-[#0071e3] text-white'
                : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Support Tickets
            {ticketStats.pending > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[11px]">{ticketStats.pending}</span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveAdminTab('bugs');
              setNewBugCount(0);
            }}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeAdminTab === 'bugs'
                ? 'bg-[#ff3b30] text-white'
                : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            {newBugCount > 0 && activeAdminTab !== 'bugs' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff3b30] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {newBugCount}
              </span>
            )}
            <Bug className="w-4 h-4" />
            Bug Reports
            {feedbackStats.openBugs > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[11px]">{feedbackStats.openBugs}</span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveAdminTab('features');
              setNewFeatureCount(0);
            }}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeAdminTab === 'features'
                ? 'bg-[#ff9500] text-white'
                : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            {newFeatureCount > 0 && activeAdminTab !== 'features' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff9500] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {newFeatureCount}
              </span>
            )}
            <Lightbulb className="w-4 h-4" />
            Feature Requests
            <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[11px]">{feedbackStats.features}</span>
          </button>
          <button
            onClick={() => {
              setActiveAdminTab('chats');
              setNewChatCount(0);
            }}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeAdminTab === 'chats'
                ? 'bg-[#5856d6] text-white'
                : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            {newChatCount > 0 && activeAdminTab !== 'chats' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#5856d6] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {newChatCount}
              </span>
            )}
            <MessageSquare className="w-4 h-4" />
            User Chats
            {feedbackStats.openChats > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[11px]">{feedbackStats.openChats}</span>
            )}
          </button>
        </div>
      )}

      {/* Support Info Banner (for regular users only) */}
      {!isITSupport && (
        <div className="rounded-2xl bg-[#0071e3]/5 border border-[#0071e3]/20 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#0071e3]/10 rounded-lg">
              <Wrench className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-[#0071e3] mb-1">How to Get Help</h3>
              <p className="text-[12px] text-[#0071e3]/80">
                Submit a detailed support request including the page URL and screenshots if possible. 
                Our IT team will respond within 24 hours for standard requests, and immediately for urgent issues.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Tickets - Show for non-admins or when tickets tab is active */}
      {(!isITSupport || activeAdminTab === 'tickets') && (
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">{isITSupport ? 'All Support Tickets' : 'My Support Tickets'}</span>
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[14px] text-[#86868b]">Loading tickets...</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 text-[#86868b] mx-auto mb-3 opacity-50" />
              <p className="text-[14px] text-[#86868b]">
                {isITSupport ? 'No support tickets from team members yet' : 'No support tickets yet'}
              </p>
              {!isITSupport && (
                <button 
                  onClick={() => setShowRequestModal(true)}
                  className="mt-3 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Submit Your First Request
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {myTickets.map((ticket) => {
                const category = categories.find(c => c.value === ticket.category);
                const CategoryIcon = category?.icon || Wrench;
                const priority = priorities.find(p => p.value === ticket.priority);
                
                return (
                  <div 
                    key={ticket.id} 
                    className={`p-4 rounded-xl transition-all ${
                      ticket.status === 'pending' ? 'bg-[#ff9500]/5 border border-[#ff9500]/20' :
                      ticket.status === 'in_progress' ? 'bg-[#0071e3]/5 border border-[#0071e3]/20' :
                      ticket.status === 'resolved' ? 'bg-[#34c759]/5 border border-[#34c759]/20' :
                      'bg-black/[0.02] dark:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Ticket Info */}
                      <div 
                        className="flex items-start gap-4 flex-1 cursor-pointer" 
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className={`p-2.5 rounded-xl bg-black/5 dark:bg-white/10`}>
                          <CategoryIcon className={`w-5 h-5 text-[#1d1d1f] dark:text-white`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{ticket.title}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              priority?.value === 'urgent' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                              priority?.value === 'high' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                              priority?.value === 'medium' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                              'bg-black/5 dark:bg-white/10 text-[#86868b]'
                            }`}>
                              {priority?.label}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                              {getStatusIcon(ticket.status)}
                              <span className="capitalize">{ticket.status?.replace('_', ' ')}</span>
                            </span>
                          </div>
                          {isITSupport && (
                            <p className="text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                              👤 {ticket.requesterName} ({ticket.requesterEmail})
                            </p>
                          )}
                          <p className="text-[12px] text-[#86868b] mb-2">
                            {ticket.description}
                          </p>
                          <p className="text-[11px] text-[#86868b]">
                            Submitted {ticket.submittedDate?.toDate 
                              ? format(ticket.submittedDate.toDate(), 'MMM dd, yyyy h:mm a')
                              : format(new Date(ticket.submittedDate), 'MMM dd, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>

                      {/* Right side - Admin Actions */}
                      {isITSupport && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {ticket.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket.id, 'in_progress');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-colors whitespace-nowrap"
                            >
                              Start Work
                            </button>
                          )}
                          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket.id, 'resolved');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#2db14e] transition-colors whitespace-nowrap"
                            >
                              Mark Resolved
                            </button>
                          )}
                          {ticket.status !== 'closed' && (
                            <button
                              onClick={(e) => handleCloseTicketClick(ticket, e)}
                              className="px-3 py-1.5 rounded-lg bg-[#86868b] text-white text-[12px] font-medium hover:bg-[#6e6e73] transition-colors whitespace-nowrap"
                            >
                              Close Ticket
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Bug Reports Section */}
      {isITSupport && activeAdminTab === 'bugs' && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-[#ff3b30]" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Bug Reports</span>
            </div>
          </div>
          <div className="p-5">
            {loadingFeedback ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-2 border-[#ff3b30] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[14px] text-[#86868b]">Loading bug reports...</p>
              </div>
            ) : feedbackItems.filter(f => f.type === 'bug').length === 0 ? (
              <div className="text-center py-8">
                <Bug className="w-12 h-12 text-[#86868b] mx-auto mb-3 opacity-50" />
                <p className="text-[14px] text-[#86868b]">No bug reports yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackItems.filter(f => f.type === 'bug').map((bug) => (
                  <div 
                    key={bug.id}
                    onClick={() => setSelectedFeedback(bug)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      bug.status === 'open' ? 'bg-[#ff3b30]/5 border border-[#ff3b30]/20' :
                      bug.status === 'in_progress' ? 'bg-[#0071e3]/5 border border-[#0071e3]/20' :
                      'bg-black/[0.02] dark:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{bug.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            bug.priority === 'critical' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                            bug.priority === 'high' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                            'bg-black/5 dark:bg-white/10 text-[#86868b]'
                          }`}>
                            {bug.priority}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            bug.status === 'open' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                            bug.status === 'in_progress' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                            'bg-[#34c759]/10 text-[#34c759]'
                          }`}>
                            {bug.status}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                          👤 {bug.userName} ({bug.userEmail})
                        </p>
                        <p className="text-[12px] text-[#86868b] line-clamp-2">{bug.description}</p>
                        <p className="text-[11px] text-[#86868b] mt-2">
                          {bug.createdAt?.toDate ? format(bug.createdAt.toDate(), 'MMM dd, yyyy h:mm a') : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#86868b] flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Requests Section */}
      {isITSupport && activeAdminTab === 'features' && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#ff9500]" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Feature Requests</span>
            </div>
          </div>
          <div className="p-5">
            {loadingFeedback ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-2 border-[#ff9500] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[14px] text-[#86868b]">Loading feature requests...</p>
              </div>
            ) : feedbackItems.filter(f => f.type === 'feature').length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-[#86868b] mx-auto mb-3 opacity-50" />
                <p className="text-[14px] text-[#86868b]">No feature requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackItems.filter(f => f.type === 'feature').map((feature) => (
                  <div 
                    key={feature.id}
                    onClick={() => setSelectedFeedback(feature)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      feature.status === 'open' ? 'bg-[#ff9500]/5 border border-[#ff9500]/20' :
                      'bg-black/[0.02] dark:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{feature.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            feature.status === 'open' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                            feature.status === 'planned' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                            'bg-[#34c759]/10 text-[#34c759]'
                          }`}>
                            {feature.status}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                          👤 {feature.userName} ({feature.userEmail})
                        </p>
                        <p className="text-[12px] text-[#86868b] line-clamp-2">{feature.description}</p>
                        <p className="text-[11px] text-[#86868b] mt-2">
                          {feature.createdAt?.toDate ? format(feature.createdAt.toDate(), 'MMM dd, yyyy h:mm a') : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#86868b] flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Chats Section */}
      {isITSupport && activeAdminTab === 'chats' && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#5856d6]" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">User Chats</span>
            </div>
          </div>
          <div className="p-5">
            {loadingFeedback ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-2 border-[#5856d6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[14px] text-[#86868b]">Loading chats...</p>
              </div>
            ) : feedbackChats.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-[#86868b] mx-auto mb-3 opacity-50" />
                <p className="text-[14px] text-[#86868b]">No user chats yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackChats.map((chat) => (
                  <div 
                    key={chat.id}
                    onClick={async () => {
                      const fullChat = await firestoreService.getFeedbackChatById(chat.id);
                      setSelectedChat(fullChat);
                    }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      chat.status === 'open' ? 'bg-[#5856d6]/5 border border-[#5856d6]/20' :
                      'bg-black/[0.02] dark:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">
                            {chat.userName || chat.userEmail}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            chat.status === 'open' ? 'bg-[#5856d6]/10 text-[#5856d6]' :
                            'bg-[#86868b]/10 text-[#86868b]'
                          }`}>
                            {chat.status}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b]">
                            {chat.messageCount || 0} messages
                          </span>
                        </div>
                        <p className="text-[12px] text-[#86868b] line-clamp-2">{chat.lastMessage}</p>
                        <p className="text-[11px] text-[#86868b] mt-2">
                          {chat.createdAt?.toDate ? format(chat.createdAt.toDate(), 'MMM dd, yyyy h:mm a') : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#86868b] flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Support Request Modal */}
      {showRequestModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Submit Support Request</h2>
                <button onClick={() => setShowRequestModal(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Issue Title */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Issue Title *
                </label>
                <input
                  type="text"
                  value={supportForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  required
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">
                  Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleFormChange('category', cat.value)}
                        className={`p-3 rounded-xl text-left transition-all min-h-[70px] flex flex-col ${
                          supportForm.category === cat.value 
                            ? 'bg-[#0071e3]/10 ring-2 ring-[#0071e3]' 
                            : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${supportForm.category === cat.value ? 'text-[#0071e3]' : 'text-[#86868b]'}`} />
                        <p className={`text-[11px] font-medium leading-tight ${supportForm.category === cat.value ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'}`}>{cat.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Priority *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleFormChange('priority', p.value)}
                      className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                        supportForm.priority === p.value 
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page URL */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  Page URL (Where the issue is happening)
                </label>
                <input
                  type="url"
                  value={supportForm.pageUrl}
                  onChange={(e) => handleFormChange('pageUrl', e.target.value)}
                  placeholder="https://smmluxurylistings.info/dashboard"
                  className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                <p className="text-[11px] text-[#86868b] mt-1">Copy and paste the URL where you're experiencing the issue</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Description *
                </label>
                <textarea
                  value={supportForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={5}
                  placeholder="Please describe the issue in detail. What were you trying to do? What happened? What did you expect to happen?"
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  required
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Screenshot (Optional)
                </label>

                {/* Show preview if image is selected */}
                {previewImage ? (
                  <div className="space-y-3">
                    {/* Preview */}
                    <div className="relative">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-h-48 rounded-xl border border-black/10 dark:border-white/10"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePreview}
                        className="absolute top-2 right-2 bg-[#ff3b30] text-white rounded-full p-1 hover:bg-[#e5342b]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Uploading state */}
                    {uploading && (
                      <div className="p-4 bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[13px] text-[#0071e3]">Uploading to imgbb automatically...</p>
                        </div>
                      </div>
                    )}

                    {/* Success state */}
                    {!uploading && supportForm.screenshotUrl && !uploadError && (
                      <div className="p-4 bg-[#34c759]/5 border border-[#34c759]/20 rounded-xl">
                        <p className="text-[13px] font-medium text-[#34c759] mb-1">
                          ✅ Uploaded successfully!
                        </p>
                        <p className="text-[11px] text-[#34c759]/80 break-all">
                          {supportForm.screenshotUrl}
                        </p>
                      </div>
                    )}

                    {/* Error state - show manual upload option */}
                    {!uploading && uploadError && !supportForm.screenshotUrl && (
                      <div className="space-y-3">
                        <div className="p-4 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-xl">
                          <p className="text-[13px] font-medium text-[#ff9500] mb-2">
                            ⚠️ Automatic upload failed - Please upload manually:
                          </p>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={handleOpenImgbb}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#2db14e] transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open imgbb Upload
                            </button>
                          </div>
                          <p className="text-[11px] text-[#ff9500]/80">
                            Upload your screenshot on imgbb.com, then paste the URL below ⬇️
                          </p>
                        </div>

                        <input
                          type="url"
                          value={supportForm.screenshotUrl}
                          onChange={(e) => handleFormChange('screenshotUrl', e.target.value)}
                          placeholder="Paste the image URL here"
                          className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Drag & Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                        dragActive 
                          ? 'border-[#0071e3] bg-[#0071e3]/5' 
                          : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <ImageIcon className="w-12 h-12 text-[#86868b] mx-auto mb-3 opacity-50" />
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                        Drag & drop your screenshot here
                      </p>
                      <p className="text-[11px] text-[#86868b] mb-3">or</p>
                      <label className="inline-block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <span className="px-4 py-2 bg-[#0071e3] text-white text-[13px] font-medium rounded-xl hover:bg-[#0077ed] cursor-pointer inline-block">
                          Browse Files
                        </span>
                      </label>
                      <p className="text-[11px] text-[#86868b] mt-3">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>

                    {/* Alternative: paste URL directly */}
                    <div className="mt-3">
                      <p className="text-[11px] text-[#86868b] mb-2">Or paste an image URL directly:</p>
                      <input
                        type="url"
                        value={supportForm.screenshotUrl}
                        onChange={(e) => handleFormChange('screenshotUrl', e.target.value)}
                        placeholder="https://i.ibb.co/example.png"
                        className="w-full h-11 px-4 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Ticket Details</h2>
                <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{selectedTicket.title}</h3>
                  <p className="text-[12px] text-[#86868b] mt-1">
                    Submitted by {selectedTicket.requesterName} on{' '}
                    {selectedTicket.submittedDate?.toDate 
                      ? format(selectedTicket.submittedDate.toDate(), 'MMMM dd, yyyy')
                      : format(new Date(selectedTicket.submittedDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`text-[11px] px-2 py-1 rounded-lg font-medium flex items-center ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusIcon(selectedTicket.status)}
                    <span className="ml-1 capitalize">{selectedTicket.status?.replace('_', ' ')}</span>
                  </span>
                  <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${
                    selectedTicket.priority === 'urgent' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                    selectedTicket.priority === 'high' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                    selectedTicket.priority === 'medium' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                    'bg-black/5 dark:bg-white/10 text-[#86868b]'
                  }`}>
                    {priorities.find(p => p.value === selectedTicket.priority)?.label}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <label className="text-[12px] font-medium text-[#86868b]">Category</label>
                <p className="text-[14px] text-[#1d1d1f] dark:text-white mt-1 capitalize">
                  {categories.find(c => c.value === selectedTicket.category)?.label}
                </p>
              </div>

              {selectedTicket.pageUrl && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">Page URL</label>
                  <a 
                    href={selectedTicket.pageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[13px] text-[#0071e3] hover:underline mt-1 flex items-center gap-1"
                  >
                    <span className="break-all">{selectedTicket.pageUrl}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <label className="text-[12px] font-medium text-[#86868b]">Description</label>
                <p className="text-[13px] text-[#1d1d1f] dark:text-white mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.screenshotUrl && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b] mb-2 block">Screenshot</label>
                  <a 
                    href={selectedTicket.screenshotUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[13px] text-[#0071e3] hover:underline flex items-center gap-1"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>View Screenshot</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {selectedTicket.resolvedDate && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">
                    {selectedTicket.status === 'closed' ? 'Closed' : 'Resolved'}
                  </label>
                  <p className="text-[13px] text-[#1d1d1f] dark:text-white mt-1">
                    {selectedTicket.resolvedDate?.toDate 
                      ? format(selectedTicket.resolvedDate.toDate(), 'MMMM dd, yyyy')
                      : format(new Date(selectedTicket.resolvedDate), 'MMMM dd, yyyy')}
                    {selectedTicket.resolvedBy && ` by ${selectedTicket.resolvedBy}`}
                  </p>
                </div>
              )}

              {selectedTicket.notes && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">
                    {selectedTicket.status === 'closed' ? 'Closing Reason' : 'IT Support Notes'}
                  </label>
                  <p className="text-[13px] text-[#1d1d1f] dark:text-white mt-1 bg-[#0071e3]/5 border border-[#0071e3]/20 p-3 rounded-xl">
                    {selectedTicket.notes}
                  </p>
                </div>
              )}

              {/* Comments Section */}
              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <label className="text-[12px] font-medium text-[#86868b] mb-3 block">
                  💬 Comments ({ticketComments.length})
                </label>
                
                {/* Comments List */}
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {ticketComments.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-4">No comments yet</p>
                  ) : (
                    ticketComments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`p-3 rounded-lg ${
                          comment.isITSupport 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.isITSupport && '🔧 '}
                            {comment.authorName}
                            {comment.isITSupport && ' (IT Support)'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {comment.createdAt?.toDate 
                              ? format(comment.createdAt.toDate(), 'MMM dd, h:mm a')
                              : format(new Date(comment.createdAt), 'MMM dd, h:mm a')}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isITSupport ? "Reply to user..." : "Add a comment..."}
                    className="flex-1 h-10 px-4 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  <button 
                    type="submit" 
                    disabled={!newComment.trim()}
                    className="px-3 py-2 rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Close Ticket Dialog */}
      {showCloseDialog && ticketToClose && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Close Ticket</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[13px] text-[#86868b] mb-4">
                  Are you sure you want to close this ticket?
                </p>
                <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  {ticketToClose.title}
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Closing Reason (Optional)
                </label>
                <textarea
                  value={closingReason}
                  onChange={(e) => setClosingReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this ticket is being closed (the user will see this)"
                  className="w-full px-4 py-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
                <p className="text-[11px] text-[#86868b] mt-1">
                  Examples: "Issue resolved via email", "Duplicate ticket", "User cancelled request"
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={() => {
                    setShowCloseDialog(false);
                    setTicketToClose(null);
                    setClosingReason('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmClose}
                  className="px-4 py-2.5 rounded-xl bg-[#86868b] text-white text-[14px] font-medium hover:bg-[#6e6e73] transition-colors"
                >
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedFeedback.type === 'bug' ? (
                    <Bug className="w-5 h-5 text-[#ff3b30]" />
                  ) : (
                    <Lightbulb className="w-5 h-5 text-[#ff9500]" />
                  )}
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                    {selectedFeedback.type === 'bug' ? 'Bug Report' : 'Feature Request'}
                  </h2>
                </div>
                <button onClick={() => setSelectedFeedback(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{selectedFeedback.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${
                    selectedFeedback.status === 'open' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                    selectedFeedback.status === 'in_progress' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                    'bg-[#34c759]/10 text-[#34c759]'
                  }`}>
                    {selectedFeedback.status}
                  </span>
                  {selectedFeedback.priority && (
                    <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${
                      selectedFeedback.priority === 'critical' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                      selectedFeedback.priority === 'high' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                      'bg-black/5 dark:bg-white/10 text-[#86868b]'
                    }`}>
                      {selectedFeedback.priority}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <label className="text-[12px] font-medium text-[#86868b]">Submitted By</label>
                <p className="text-[13px] text-[#1d1d1f] dark:text-white mt-1">
                  {selectedFeedback.userName} ({selectedFeedback.userEmail})
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <label className="text-[12px] font-medium text-[#86868b]">Description</label>
                <p className="text-[13px] text-[#1d1d1f] dark:text-white mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>

              {selectedFeedback.url && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">Page URL</label>
                  <a 
                    href={selectedFeedback.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[13px] text-[#0071e3] hover:underline mt-1 flex items-center gap-1"
                  >
                    <span className="break-all">{selectedFeedback.url}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              )}

              {selectedFeedback.selectedElement && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">Selected Element</label>
                  <div className="mt-1 p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                    <p className="text-[12px] font-mono text-[#1d1d1f] dark:text-white">
                      &lt;{selectedFeedback.selectedElement.tagName?.toLowerCase()}&gt;
                      {selectedFeedback.selectedElement.id && ` #${selectedFeedback.selectedElement.id}`}
                      {selectedFeedback.selectedElement.className && ` .${selectedFeedback.selectedElement.className.split(' ')[0]}`}
                    </p>
                  </div>
                </div>
              )}

              {selectedFeedback.consoleLogs && selectedFeedback.consoleLogs.length > 0 && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">Console Logs ({selectedFeedback.consoleLogs.length})</label>
                  <div className="mt-2 p-3 bg-[#1d1d1f] rounded-xl max-h-48 overflow-y-auto">
                    {selectedFeedback.consoleLogs.slice(-50).map((log, idx) => (
                      <p key={idx} className={`text-[10px] font-mono ${
                        log.type === 'error' ? 'text-[#ff3b30]' :
                        log.type === 'warn' ? 'text-[#ff9500]' :
                        'text-[#86868b]'
                      }`}>
                        [{log.type}] {log.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {selectedFeedback.userInfo && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <label className="text-[12px] font-medium text-[#86868b]">Browser Info</label>
                  <div className="mt-1 text-[12px] text-[#86868b]">
                    <p>Viewport: {selectedFeedback.userInfo.viewport?.width}x{selectedFeedback.userInfo.viewport?.height}</p>
                    <p className="truncate">User Agent: {selectedFeedback.userInfo.userAgent}</p>
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex flex-wrap gap-2">
                {selectedFeedback.status === 'open' && (
                  <button
                    onClick={() => handleFeedbackStatusUpdate(selectedFeedback.id, 'in_progress')}
                    className="px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
                  >
                    Mark In Progress
                  </button>
                )}
                {selectedFeedback.status !== 'resolved' && (
                  <button
                    onClick={() => handleFeedbackStatusUpdate(selectedFeedback.id, 'resolved')}
                    className="px-4 py-2 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#2db14e] transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                  disabled={deletingFeedbackId === selectedFeedback.id}
                  className="px-4 py-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] font-medium hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50 flex items-center gap-2 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingFeedbackId === selectedFeedback.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Chat Detail Modal */}
      {selectedChat && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl flex flex-col">
            <div className="flex-shrink-0 border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5856d6] to-[#0071e3] flex items-center justify-center text-white font-semibold">
                    {(selectedChat.userName || selectedChat.userEmail || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                      {selectedChat.userName || selectedChat.userEmail}
                    </h2>
                    <p className="text-[12px] text-[#86868b]">{selectedChat.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChat.status === 'open' && (
                    <button
                      onClick={() => handleCloseChat(selectedChat.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#86868b] text-white text-[12px] font-medium hover:bg-[#6e6e73] transition-colors"
                    >
                      Close Chat
                    </button>
                  )}
                  {selectedChat.status === 'closed' && (
                    <button
                      onClick={() => handleArchiveChat(selectedChat.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#ff9500]/10 text-[#ff9500] text-[12px] font-medium hover:bg-[#ff9500]/20 transition-colors flex items-center gap-1"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteChat(selectedChat.id)}
                    disabled={deletingChatId === selectedChat.id}
                    className="px-3 py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingChatId === selectedChat.id ? '...' : 'Delete'}
                  </button>
                  <button onClick={() => setSelectedChat(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5 text-[#86868b]" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selectedChat.messages?.map((msg, idx) => {
                const isAdmin = msg.senderEmail === currentUser?.email || msg.senderEmail === 'jrsschroeder@gmail.com';
                return (
                  <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      isAdmin 
                        ? 'bg-[#0071e3] text-white' 
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white'
                    }`}>
                      <p className="text-[13px]">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-[#86868b]'}`}>
                        {msg.senderName} • {msg.timestamp ? format(new Date(msg.timestamp), 'MMM dd, h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            {selectedChat.status === 'open' && (
              <div className="flex-shrink-0 border-t border-black/5 dark:border-white/10 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatReply}
                    onChange={(e) => setChatReply(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatReply()}
                    placeholder="Type your reply..."
                    className="flex-1 h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  <button
                    onClick={handleChatReply}
                    disabled={!chatReply.trim()}
                    className="px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {selectedChat.status === 'closed' && (
              <div className="flex-shrink-0 border-t border-black/5 dark:border-white/10 p-4 text-center">
                <p className="text-[13px] text-[#86868b]">This chat has been closed</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ITSupportPage;

