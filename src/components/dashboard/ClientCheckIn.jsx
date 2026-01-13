import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Tag,
  Link as LinkIcon,
  MoreHorizontal,
  MessageSquare,
  CheckCircle,
  XCircle,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Archive
} from 'lucide-react';
import { GOOGLE_SHEETS_CONFIG, GOOGLE_SHEETS_API } from '../../config/googleSheets';

const ClientCheckIn = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState({});
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Google Sheets API configuration
  const { SPREADSHEET_ID, SHEET_NAME, API_KEY } = GOOGLE_SHEETS_CONFIG;

  useEffect(() => {
    // Load initial data from Firestore or Google Sheets
    // Start with empty array - data will be loaded from real source
    setClients([]);
    setLastSync(new Date());
  }, []);

  const syncWithGoogleSheets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Now using real Google Sheets API key

      // Real Google Sheets API call
      const response = await fetch(
        GOOGLE_SHEETS_API.VALUES_ENDPOINT(SPREADSHEET_ID, SHEET_NAME, API_KEY)
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data from Google Sheets');
      }
      
      const data = await response.json();
      const processedData = processGoogleSheetsData(data.values);
      setClients(processedData);
      setLastSync(new Date());
      
    } catch (err) {
      console.error('Error syncing with Google Sheets:', err);
      setError('Failed to sync with Google Sheets. Using cached data.');
      // Fall back to mock data on error
      setClients(mockClientData);
    } finally {
      setLoading(false);
    }
  };

  const processGoogleSheetsData = (values) => {
    if (!values || values.length < 2) return [];
    
    const headers = values[0];
    const dataRows = values.slice(1);
    
    return dataRows
      .filter(row => row.length > 0 && row[0]) // Filter out empty rows
      .map((row, index) => {
        const client = {
          id: index + 1,
          clientName: row[0] || '',
          packageType: row[1] || '',
          email: row[2] || '',
          dateAdded: row[3] || '',
          postedOn: row[4] || '',
          paymentStatus: row[5] || '',
          salesStage: row[6] || '',
          approvalStatus: row[7] || '',
          notes: row[8] || '',
          packageSize: row[9] || '',
          postsUsed: row[10] || '',
          postsRemaining: row[11] || '',
          lastPostDate: row[12] || '',
          pricePaid: row[13] || ''
        };
        
        // Determine status based on approval, payment, and posts remaining
        client.status = determineStatus(client.approvalStatus, client.paymentStatus, client.postsRemaining);
        
        return client;
      });
  };

  const determineStatus = (approvalStatus, paymentStatus, postsRemaining) => {
    if (approvalStatus === 'Approved' && paymentStatus === 'Paid') {
      if (postsRemaining > 0) return 'active';
      return 'completed';
    }
    if (approvalStatus === 'Approved' && paymentStatus !== 'Paid') return 'pending_payment';
    if (approvalStatus === 'Pending') return 'pending_approval';
    if (approvalStatus === 'Rejected') return 'rejected';
    return 'unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_payment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unknown':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'pending_payment':
        return <DollarSign className="w-4 h-4 text-orange-500" />;
      case 'pending_approval':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'unknown':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDaysUntilPosting = (dateString) => {
    if (!dateString) return { text: 'No date set', color: 'text-gray-600' };
    
    const postingDate = new Date(dateString);
    const today = new Date();
    const diffTime = postingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-purple-600' };
    if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-indigo-600' };
    return { text: `${diffDays} days`, color: 'text-gray-600' };
  };

  const openGoogleSheets = () => {
    window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`, '_blank');
  };

  const openMediaFolder = (mediaLink) => {
    if (mediaLink && mediaLink !== '.') {
      window.open(mediaLink, '_blank');
    }
  };

  const openListing = (listingLink) => {
    if (listingLink && listingLink !== '.') {
      window.open(listingLink, '_blank');
    }
  };

  const openFollowUpEmail = (client) => {
    // Create a professional follow-up email template
    const subject = encodeURIComponent(`Follow-up: ${client.packageType} Package - ${client.clientName}`);
    
    const body = encodeURIComponent(`Hi ${client.clientName.split(' ')[0]},

Thank you for choosing our ${client.packageType} package for your luxury real estate content needs.

I wanted to follow up on your package status and see if you have any questions about:
• Package progress and remaining posts
• Content performance and insights
• Additional services or upgrades
• Renewal opportunities

Your package details:
• Package Type: ${client.packageType}
• Package Size: ${client.packageSize} posts
• Posts Used: ${client.postsUsed} posts
• Posts Remaining: ${client.postsRemaining} posts
• Payment Status: ${client.paymentStatus}
• Approval Status: ${client.approvalStatus}

${client.notes ? `Additional Notes: ${client.notes}` : ''}

Please let me know if you'd like to schedule a call to discuss your content strategy or if you need any clarification.

Best regards,
Sarah Mitchell
Head of Content - Luxury Listings
Joshua@luxury-listings.com`);

    // Use Gmail's compose endpoint with proper encoding for reliable pre-filling
    const gmailComposeUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&to=${encodeURIComponent(client.email)}&su=${subject}&body=${body}`;
    window.open(gmailComposeUrl, '_blank');
  };

  const openApprovalModal = (client, action) => {
    setSelectedClient(client);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const handleApproval = async (approved) => {
    if (!selectedClient) return;
    
    setApprovalLoading({ ...approvalLoading, [selectedClient.id]: true });
    
    try {
      // In a real implementation, this would call your Google Apps Script web app
      // For now, we'll simulate the approval process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update local state to reflect the approval
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === selectedClient.id 
            ? { 
                ...client, 
                approvalStatus: approved ? 'Approved' : 'Rejected',
                status: approved ? 'active' : 'rejected'
              }
            : client
        )
      );
      
      // Close modal and reset state
      setShowApprovalModal(false);
      setSelectedClient(null);
      setApprovalNotes('');
      
      // Show success message
      alert(`Client ${selectedClient.clientName} has been ${approved ? 'approved' : 'rejected'}!`);
      
    } catch (error) {
      console.error('Error updating approval status:', error);
      alert('Error updating approval status. Please try again.');
    } finally {
      setApprovalLoading({ ...approvalLoading, [selectedClient.id]: false });
    }
  };

  const archiveCompletedPackage = async (client) => {
    if (!client) return;
    
    setApprovalLoading({ ...approvalLoading, [client.id]: true });
    
    try {
      // Simulate archiving process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Remove from active clients (in real app, this would move to Archived Clients sheet)
      setClients(prevClients => prevClients.filter(c => c.id !== client.id));
      
      alert(`Package for ${client.clientName} has been archived!`);
      
    } catch (error) {
      console.error('Error archiving package:', error);
      alert('Error archiving package. Please try again.');
    } finally {
      setApprovalLoading({ ...approvalLoading, [client.id]: false });
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setEditForm({
      packageType: client.packageType,
      packageSize: client.packageSize,
      postsUsed: client.postsUsed,
      postsRemaining: client.postsRemaining,
      notes: client.notes || '',
      postedOn: client.postedOn,
      paymentStatus: client.paymentStatus
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingClient) return;
    
    setApprovalLoading({ ...approvalLoading, [editingClient.id]: true });
    
    try {
      // Validate form data
      if (editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize) {
        alert('Posts Used + Posts Remaining must equal Package Size');
        return;
      }
      
      // Simulate API call to update Google Sheets
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === editingClient.id 
            ? { 
                ...client, 
                packageType: editForm.packageType,
                packageSize: editForm.packageSize,
                postsUsed: editForm.postsUsed,
                postsRemaining: editForm.postsRemaining,
                notes: editForm.notes,
                postedOn: editForm.postedOn,
                paymentStatus: editForm.paymentStatus,
                // Update status based on new data
                status: determineStatus(client.approvalStatus, editForm.paymentStatus, editForm.postsRemaining)
              }
            : client
        )
      );
      
      // Close modal and reset state
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({});
      
      // Show success message
      alert(`Package for ${editingClient.clientName} has been updated successfully!`);
      
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Error updating package. Please try again.');
    } finally {
      setApprovalLoading({ ...approvalLoading, [editingClient.id]: false });
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingClient(null);
    setEditForm({});
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Social Media Packages Dashboard
          </CardTitle>
          <Button 
            onClick={syncWithGoogleSheets} 
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync Sheets'}
          </Button>
        </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Last synced: {lastSync ? lastSync.toLocaleTimeString() : 'Never'}</span>
                      <span>• {clients.length} clients loaded</span>
                      <span>• {clients.filter(c => c.status === 'active').length} active packages</span>
                      {error && <span className="text-red-600">• {error}</span>}
                    </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium">No submissions loaded</p>
            <p className="text-sm">Sync with Google Sheets to load package submissions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              const postingStatus = getDaysUntilPosting(client.postingDate);
              
              return (
                <div 
                  key={client.id} 
                  className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{client.clientName}</h4>
                      <p className="text-sm text-gray-600 mb-2">{client.email}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {client.packageType} Package
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {client.postedOn}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {client.paymentStatus}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${getStatusColor(client.status)}`}>
                        {client.status.replace('_', ' ')}
                      </Badge>
                      {client.pricePaid && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                          {client.pricePaid}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Added: {client.dateAdded}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      {getStatusIcon(client.status)}
                      <span className="text-gray-600">
                        {client.approvalStatus}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Package Size:</span>
                      <span className="ml-2 text-gray-600">{client.packageSize} posts</span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">Used:</span>
                        <span className="ml-2 text-gray-600">{client.postsUsed} posts</span>
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Remaining:</span>
                      <span className="ml-2 text-gray-600">{client.postsRemaining} posts</span>
                    </div>
                  </div>
                  
                  {client.notes && (
                    <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Notes:</span> {client.notes}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {/* Approval Actions */}
                    {client.approvalStatus === 'Pending' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          onClick={() => openApprovalModal(client, 'approve')}
                          disabled={approvalLoading[client.id]}
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          {approvalLoading[client.id] ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          onClick={() => openApprovalModal(client, 'reject')}
                          disabled={approvalLoading[client.id]}
                        >
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          {approvalLoading[client.id] ? 'Rejecting...' : 'Reject'}
                        </Button>
                      </>
                    )}
                    
                    {/* Package Management Actions */}
                    {client.approvalStatus === 'Approved' && client.postsRemaining > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        onClick={() => openEditModal(client)}
                        disabled={approvalLoading[client.id]}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit Package
                      </Button>
                    )}
                    
                    {/* Archive Action */}
                    {client.approvalStatus === 'Approved' && client.postsRemaining === 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        onClick={() => archiveCompletedPackage(client)}
                        disabled={approvalLoading[client.id]}
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        {approvalLoading[client.id] ? 'Archiving...' : 'Archive'}
                      </Button>
                    )}
                    
                    {/* Standard Actions */}
                    {client.mediaLink && client.mediaLink !== '.' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => openMediaFolder(client.mediaLink)}>
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Media Folder
                      </Button>
                    )}
                    {client.listingLink && client.listingLink !== '.' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => openListing(client.listingLink)}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Listing
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => openFollowUpEmail(client)}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Follow Up
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Google Sheets Integration</span>
              <p className="text-xs mt-1">Data syncs from your Social Media Packages tab</p>
            </div>
            <Button variant="outline" size="sm" onClick={openGoogleSheets}>
              Open Google Sheets
            </Button>
          </div>
        </div>
      </CardContent>
      
      {/* Approval Modal */}
      {showApprovalModal && selectedClient && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedClient.approvalStatus === 'Pending' ? 'Client Approval' : 'Edit Package'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApprovalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Client:</strong> {selectedClient.clientName}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Package:</strong> {selectedClient.packageType} ({selectedClient.packageSize} posts)
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Email:</strong> {selectedClient.email}
              </p>
            </div>
            
            {selectedClient.approvalStatus === 'Pending' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes about this approval..."
                />
              </div>
            )}
            
            <div className="flex items-center gap-3">
              {selectedClient.approvalStatus === 'Pending' ? (
                <>
                  <Button
                    onClick={() => handleApproval(true)}
                    disabled={approvalLoading[selectedClient.id]}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    {approvalLoading[selectedClient.id] ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => handleApproval(false)}
                    disabled={approvalLoading[selectedClient.id]}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    {approvalLoading[selectedClient.id] ? 'Rejecting...' : 'Reject'}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Package Modal */}
      {showEditModal && editingClient && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Package - {editingClient.clientName}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Package Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Type *
                </label>
                <select
                  value={editForm.packageType}
                  onChange={(e) => setEditForm({...editForm, packageType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Standard">Standard</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Seven">Seven</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Package Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Size (Posts) *
                </label>
                <select
                  value={editForm.packageSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    const newRemaining = newSize - editForm.postsUsed;
                    setEditForm({
                      ...editForm, 
                      packageSize: newSize,
                      postsRemaining: Math.max(0, newRemaining)
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(15)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} post{i + 1 !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Posts Used */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Used *
                </label>
                <select
                  value={editForm.postsUsed}
                  onChange={(e) => {
                    const newUsed = parseInt(e.target.value);
                    const newRemaining = editForm.packageSize - newUsed;
                    setEditForm({
                      ...editForm, 
                      postsUsed: newUsed,
                      postsRemaining: Math.max(0, newRemaining)
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(editForm.packageSize + 1)].map((_, i) => (
                    <option key={i} value={i}>{i} post{i !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Posts Remaining */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Remaining *
                </label>
                <input
                  type="number"
                  value={editForm.postsRemaining}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>

              {/* Posted On */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posted On (Page)
                </label>
                <select
                  value={editForm.postedOn}
                  onChange={(e) => setEditForm({...editForm, postedOn: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Luxury Listings">Luxury Listings</option>
                  <option value="Mansions">Mansions</option>
                  <option value="Homes">Homes</option>
                  <option value="All Pages">All Pages</option>
                  <option value="4 Luxury Listings + 3 on Mansions">4 Luxury Listings + 3 on Mansions</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={editForm.paymentStatus}
                  onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Add or update notes about this client package..."
              />
            </div>

            {/* Validation Message */}
            {editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ Posts Used ({editForm.postsUsed}) + Posts Remaining ({editForm.postsRemaining}) must equal Package Size ({editForm.packageSize})
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={handleEditSubmit}
                disabled={approvalLoading[editingClient.id] || editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {approvalLoading[editingClient.id] ? 'Updating...' : 'Update Package'}
              </Button>
              <Button
                onClick={handleEditCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ClientCheckIn;
