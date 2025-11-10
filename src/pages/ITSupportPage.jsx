import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { firestoreService } from '../services/firestoreService';

const ITSupportPage = () => {
  const { currentUser, currentRole } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Google Apps Script URL for email notifications
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhj1hiWenHLHxd15RfYrbQbVQOLMERFGCUfemgnemzTXblG4XmlgMZ5wjgsEwyRooBLw/exec';

  // Support request form state
  const [supportForm, setSupportForm] = useState({
    title: '',
    category: 'technical',
    priority: 'medium',
    pageUrl: '',
    description: '',
    screenshotUrl: ''
  });

  const isITSupport = currentRole === 'admin'; // Or create specific IT role

  // Load support tickets from Firestore
  useEffect(() => {
    if (!currentUser?.email) return;

    setLoading(true);
    
    // Set up real-time listener
    const unsubscribe = firestoreService.onSupportTicketsChange((tickets) => {
      console.log('📡 Support tickets updated:', tickets.length);
      // If IT Support, show all tickets, else show only user's tickets
      const filteredTickets = isITSupport 
        ? tickets 
        : tickets.filter(t => t.requesterEmail === currentUser.email);
      setMyTickets(filteredTickets);
      setLoading(false);
    }, isITSupport ? null : currentUser.email);

    return () => unsubscribe();
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
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
          
          // Use image request to avoid CORS issues
          const img = new Image();
          img.src = `${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`;
          console.log('📧 Email notification triggered');
        } catch (emailError) {
          console.error('⚠️ Email notification failed (ticket still saved):', emailError);
          // Don't block user flow if email fails
        }
        
        alert('Support request submitted successfully! ✅\n\nYour ticket has been sent to IT Support. We\'ll get back to you soon.');
        setShowRequestModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('❌ Error submitting support ticket:', error);
      alert(`Failed to submit request: ${error.message}\n\nPlease try again.`);
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
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IT Support</h1>
          <p className="text-gray-600 mt-2">
            {isITSupport ? 'Manage support tickets and help team members' : 'Submit support requests and track your tickets'}
          </p>
        </div>
        <Button className="flex items-center space-x-2" onClick={() => setShowRequestModal(true)}>
          <Plus className="w-4 h-4" />
          <span>New Support Request</span>
        </Button>
      </div>

      {/* Support Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="px-6 py-8">
          <div className="flex items-center space-x-3">
            <Wrench className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">How to Get Help</h3>
              <p className="text-sm text-blue-700">
                Submit a detailed support request including the page URL and screenshots if possible. 
                Our IT team will respond within 24 hours for standard requests, and immediately for urgent issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{isITSupport ? 'All Support Tickets' : 'My Support Tickets'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tickets...</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No support tickets yet</p>
              <Button 
                variant="outline" 
                className="mt-3"
                onClick={() => setShowRequestModal(true)}
              >
                Submit Your First Request
              </Button>
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
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-3 rounded-lg bg-${category?.color}-100`}>
                        <CategoryIcon className={`w-5 h-5 text-${category?.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <p className="font-medium text-gray-900">{ticket.title}</p>
                          <Badge className={priority?.color}>
                            {priority?.label}
                          </Badge>
                          <Badge className={`${getStatusColor(ticket.status)} flex items-center space-x-1`}>
                            {getStatusIcon(ticket.status)}
                            <span className="capitalize">{ticket.status?.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        {isITSupport && (
                          <p className="text-sm text-gray-600">
                            Submitted by {ticket.requesterName}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 truncate">
                          {ticket.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 flex-shrink-0 ml-4">
                      <p>
                        {ticket.submittedDate?.toDate 
                          ? format(ticket.submittedDate.toDate(), 'MMM dd, yyyy')
                          : format(new Date(ticket.submittedDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Support Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Submit Support Request</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Issue Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Title *
                </label>
                <input
                  type="text"
                  value={supportForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleFormChange('category', cat.value)}
                        className={`p-4 border-2 rounded-lg text-left transition-all min-h-[80px] flex flex-col ${
                          supportForm.category === cat.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 text-${cat.color}-600 mb-2`} />
                        <p className="text-xs font-medium leading-tight">{cat.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleFormChange('priority', p.value)}
                      className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                        supportForm.priority === p.value 
                          ? 'border-blue-500 ' + p.color
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  Page URL (Where the issue is happening)
                </label>
                <input
                  type="url"
                  value={supportForm.pageUrl}
                  onChange={(e) => handleFormChange('pageUrl', e.target.value)}
                  placeholder="https://smmluxurylistings.info/dashboard"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Copy and paste the URL where you're experiencing the issue</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={supportForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={5}
                  placeholder="Please describe the issue in detail. What were you trying to do? What happened? What did you expect to happen?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Screenshot URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Screenshot URL (Optional)
                </label>
                <input
                  type="url"
                  value={supportForm.screenshotUrl}
                  onChange={(e) => handleFormChange('screenshotUrl', e.target.value)}
                  placeholder="https://example.com/screenshot.png or upload to imgur.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Take a screenshot and upload to <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">imgur.com</a>, then paste the link here
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Ticket Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Submitted by {selectedTicket.requesterName} on{' '}
                    {selectedTicket.submittedDate?.toDate 
                      ? format(selectedTicket.submittedDate.toDate(), 'MMMM dd, yyyy')
                      : format(new Date(selectedTicket.submittedDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {getStatusIcon(selectedTicket.status)}
                    <span className="ml-1 capitalize">{selectedTicket.status?.replace('_', ' ')}</span>
                  </Badge>
                  <Badge className={priorities.find(p => p.value === selectedTicket.priority)?.color}>
                    {priorities.find(p => p.value === selectedTicket.priority)?.label}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-gray-600">Category</label>
                <p className="text-gray-900 mt-1 capitalize">
                  {categories.find(c => c.value === selectedTicket.category)?.label}
                </p>
              </div>

              {selectedTicket.pageUrl && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600">Page URL</label>
                  <a 
                    href={selectedTicket.pageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-1 flex items-center space-x-1"
                  >
                    <span className="break-all">{selectedTicket.pageUrl}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              )}

              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.screenshotUrl && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Screenshot</label>
                  <a 
                    href={selectedTicket.screenshotUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>View Screenshot</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {selectedTicket.resolvedDate && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600">Resolved</label>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(selectedTicket.resolvedDate), 'MMMM dd, yyyy')}
                    {selectedTicket.resolvedBy && ` by ${selectedTicket.resolvedBy}`}
                  </p>
                </div>
              )}

              {selectedTicket.notes && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600">IT Support Notes</label>
                  <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded">{selectedTicket.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITSupportPage;

