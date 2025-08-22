import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Instagram,
  ExternalLink,
  Database,
  RefreshCw,
  Settings
} from 'lucide-react';
import CRMGoogleSheetsSetup from '../components/CRMGoogleSheetsSetup';
import { CRMGoogleSheetsService } from '../services/crmGoogleSheetsService';

const CRMPage = () => {
  const { currentUser, currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('warm-leads');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoogleSheetsSetup, setShowGoogleSheetsSetup] = useState(false);
  const [isConnectedToGoogleSheets, setIsConnectedToGoogleSheets] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // CRM data state
  const [warmLeads, setWarmLeads] = useState([]);
  const [contactedClients, setContactedClients] = useState([]);
  const [coldLeads, setColdLeads] = useState([]);

  // Mock CRM data as fallback
  const mockData = {
    warmLeads: [
      {
        id: 1,
        contactName: 'Eddie Escobido',
        phone: '(623) 225-8893',
        email: 'eddie.escobido@theagencyre.com',
        instagram: 'escobidoluxurygroup',
        status: 'warm',
        lastContact: '2025-08-15',
        notes: 'Interested in luxury listings, has high-end clientele'
      },
      {
        id: 2,
        contactName: 'Shawnalei Tamayose',
        phone: '(808) 339-0254',
        email: 'shawna@apt212.com',
        instagram: 'shawnalei808',
        status: 'warm',
        lastContact: '2025-08-12',
        notes: 'Looking for luxury properties in Hawaii market'
      },
      {
        id: 3,
        contactName: 'ATR Luxury Homes',
        phone: '(786) 723-6041',
        email: 'morella@atrluxuryhomes.com',
        instagram: 'atrluxuryhomes',
        status: 'warm',
        lastContact: '2025-08-10',
        notes: 'Corporate client, multiple property portfolio'
      },
      {
        id: 4,
        contactName: 'Devin Kay',
        phone: '(301) 602-1172',
        email: 'Devin.Kay@elliman.com',
        instagram: 'devin__kay',
        status: 'warm',
        lastContact: '2025-08-08',
        notes: 'Douglas Elliman agent, luxury market specialist'
      },
      {
        id: 5,
        contactName: 'Shawn Shirdel',
        phone: '(310) 770-2262',
        email: 'shawn@shawnshirdel.com',
        instagram: 'shawnshirdel',
        status: 'warm',
        lastContact: '2025-08-05',
        notes: 'Beverly Hills luxury real estate expert'
      },
      {
        id: 6,
        contactName: 'Ryan Kaplan',
        phone: '(631) 834-8523',
        email: 'ryan.kaplan@corcoran.com',
        instagram: 'ryan.kaplan',
        status: 'warm',
        lastContact: '2025-08-03',
        notes: 'Corcoran agent, East Coast luxury market'
      }
    ],
    contactedClients: [
      {
        id: 7,
        contactName: 'Jennifer Martinez',
        phone: '(212) 555-0123',
        email: 'jennifer@luxuryestatesny.com',
        instagram: 'jenluxury',
        status: 'contacted',
        lastContact: '2025-07-28',
        notes: 'Sent proposal for luxury penthouse, awaiting response',
        proposalSent: '2025-07-28',
        followUpDate: '2025-08-20'
      },
      {
        id: 8,
        contactName: 'Robert Chen',
        phone: '(415) 555-0456',
        email: 'robert@sanfranluxury.com',
        instagram: 'robchenluxury',
        status: 'contacted',
        lastContact: '2025-07-25',
        notes: 'Discussed portfolio management services',
        proposalSent: '2025-07-25',
        followUpDate: '2025-08-18'
      }
    ],
    coldLeads: [
      {
        id: 9,
        contactName: 'Amanda Rodriguez',
        phone: '(305) 555-0789',
        email: 'amanda@miamiluxury.com',
        instagram: 'amandamiami',
        status: 'cold',
        lastContact: '2025-06-15',
        notes: 'Initial outreach, no response yet',
        outreachDate: '2025-06-15',
        nextOutreach: '2025-08-25'
      },
      {
        id: 10,
        contactName: 'Michael Thompson',
        phone: '(312) 555-0321',
        email: 'michael@chicagoluxury.com',
        instagram: 'mthompsonchi',
        status: 'cold',
        lastContact: '2025-06-10',
        notes: 'Cold email sent, no engagement',
        outreachDate: '2025-06-10',
        nextOutreach: '2025-08-30'
      }
    ]
  };

  // Initialize with mock data
  useEffect(() => {
    setWarmLeads(mockData.warmLeads);
    setContactedClients(mockData.contactedClients);
    setColdLeads(mockData.coldLeads);
  }, []);

  // Handle Google Sheets data loading
  const handleGoogleSheetsDataLoaded = (data) => {
    if (data && typeof data === 'object') {
      // Update the leads state with the fetched data
      setWarmLeads(data.warmLeads || []);
      setContactedClients(data.contactedClients || []);
      setColdLeads(data.coldLeads || []);
      
      // Update connection status
      setIsConnectedToGoogleSheets(true);
      setLastSyncTime(new Date().toLocaleString());
      
      console.log('✅ CRM data loaded from Google Sheets:', {
        warmLeads: data.warmLeads?.length || 0,
        contactedClients: data.contactedClients?.length || 0,
        coldLeads: data.coldLeads?.length || 0
      });
    }
  };

  const handleConnectionStatusChange = (isConnected) => {
    setIsConnectedToGoogleSheets(isConnected);
    if (!isConnected) {
      setLastSyncTime(null);
    }
    console.log('🔄 CRM connection status changed:', isConnected);
  };

  // Manual sync with Google Sheets
  const handleManualSync = async () => {
    if (!isConnectedToGoogleSheets) {
      setShowGoogleSheetsSetup(true);
      return;
    }

    setIsLoading(true);
    try {
      const service = new CRMGoogleSheetsService();
      const data = await service.fetchCRMData();
      handleGoogleSheetsDataLoaded(data);
      setLastSyncTime(new Date().toLocaleString());
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      // Fall back to mock data on error
      setWarmLeads(mockData.warmLeads);
      setContactedClients(mockData.contactedClients);
      setColdLeads(mockData.coldLeads);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      warm: 'bg-green-100 text-green-800',
      contacted: 'bg-blue-100 text-blue-800',
      cold: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.cold;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'warm':
        return <Star className="w-4 h-4 text-green-600" />;
      case 'contacted':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'cold':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredWarmLeads = warmLeads.filter(client => 
    client.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.instagram && client.instagram.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredContactedClients = contactedClients.filter(client => 
    client.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.instagram && client.instagram.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredColdLeads = coldLeads.filter(client => 
    client.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.instagram && client.instagram.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalWarmLeads = warmLeads.length;
  const totalContacted = contactedClients.length;
  const totalColdLeads = coldLeads.length;
  const totalLeads = totalWarmLeads + totalContacted + totalColdLeads;

  const renderClientCard = (client) => (
    <Card key={client.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 pt-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{client.contactName}</h4>
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-3 h-3 text-gray-400" />
              <p className="text-sm text-gray-600">{client.email}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Phone className="w-3 h-3 text-gray-400" />
              <p className="text-sm text-gray-600">{client.phone}</p>
            </div>
            {client.instagram && (
              <div className="flex items-center gap-2 mt-2">
                <Instagram className="w-3 h-3 text-gray-400" />
                <p className="text-sm text-gray-600">@{client.instagram}</p>
              </div>
            )}
          </div>
          <Badge className={getStatusColor(client.status)}>
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </Badge>
        </div>
        
        <div className="space-y-3 mb-5">
          <p className="text-sm text-gray-700">{client.notes}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Last contact: {client.lastContact}</span>
          </div>
          {client.followUpDate && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Follow up: {client.followUpDate}</span>
            </div>
          )}
          {client.nextOutreach && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertCircle className="w-3 h-3" />
              <span>Next outreach: {client.nextOutreach}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClient(client)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your leads and client relationships</p>
          {isConnectedToGoogleSheets && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Connected to Google Sheets</span>
              {lastSyncTime && (
                <span className="text-xs text-gray-500">
                  • Last synced: {lastSyncTime}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowGoogleSheetsSetup(!showGoogleSheetsSetup)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {showGoogleSheetsSetup ? 'Hide Setup' : 'Google Sheets Setup'}
          </Button>
          <Button
            onClick={handleManualSync}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isLoading ? 'Syncing...' : 'Sync Data'}
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* Google Sheets Setup */}
      {showGoogleSheetsSetup && (
        <CRMGoogleSheetsSetup
          onDataLoaded={handleGoogleSheetsDataLoaded}
          onConnectionStatusChange={handleConnectionStatusChange}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Warm Leads</p>
                <p className="text-3xl font-bold text-green-900">{totalWarmLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <Star className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Contacted</p>
                <p className="text-3xl font-bold text-blue-900">{totalContacted}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-200">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Cold Leads</p>
                <p className="text-3xl font-bold text-gray-900">{totalColdLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-200">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Total Leads</p>
                <p className="text-3xl font-bold text-purple-900">{totalLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads by name, email, or Instagram..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('warm-leads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'warm-leads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Warm Leads ({totalWarmLeads})
          </button>
          <button
            onClick={() => setActiveTab('contacted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contacted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Contacted Before ({totalContacted})
          </button>
          <button
            onClick={() => setActiveTab('cold-leads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cold-leads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cold Leads ({totalColdLeads})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'warm-leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Warm Leads</h2>
            <p className="text-sm text-gray-600">Leads showing interest and engagement</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWarmLeads.map(renderClientCard)}
          </div>
        </div>
      )}

      {activeTab === 'contacted' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Clients We've Contacted Before</h2>
            <p className="text-sm text-gray-600">Leads with previous communication history</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContactedClients.map(renderClientCard)}
          </div>
        </div>
      )}

      {activeTab === 'cold-leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Cold Leads</h2>
            <p className="text-sm text-gray-600">Leads requiring initial outreach or re-engagement</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredColdLeads.map(renderClientCard)}
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Lead Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClient(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <p className="text-gray-900">{selectedClient.contactName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Badge className={getStatusColor(selectedClient.status)}>
                    {selectedClient.status.charAt(0).toUpperCase() + selectedClient.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedClient.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{selectedClient.phone}</p>
                </div>
                {selectedClient.instagram && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <p className="text-gray-900">@{selectedClient.instagram}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Contact</label>
                  <p className="text-gray-900">{selectedClient.lastContact}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900">{selectedClient.notes}</p>
              </div>

              {selectedClient.followUpDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <p className="text-gray-900">{selectedClient.followUpDate}</p>
                </div>
              )}

              {selectedClient.nextOutreach && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Outreach</label>
                  <p className="text-gray-900">{selectedClient.nextOutreach}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-4">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (selectedClient.phone) {
                      window.open(`tel:${selectedClient.phone.replace(/\D/g, '')}`, '_self');
                    } else {
                      alert('No phone number available for this lead');
                    }
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Lead
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (selectedClient.email) {
                      const subject = encodeURIComponent(`Follow up - ${selectedClient.contactName}`);
                      const body = encodeURIComponent(`Hi ${selectedClient.contactName},\n\nI hope this email finds you well. I wanted to follow up regarding our previous conversation.\n\nBest regards,\n[Your Name]`);
                      window.open(`mailto:${selectedClient.email}?subject=${subject}&body=${body}`, '_self');
                    } else {
                      alert('No email address available for this lead');
                    }
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Create Google Calendar event
                    const eventTitle = encodeURIComponent(`Meeting with ${selectedClient.contactName}`);
                    const eventDetails = encodeURIComponent(`Follow up meeting with ${selectedClient.contactName}\n\nNotes: ${selectedClient.notes || 'No additional notes'}`);
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() + 1); // Tomorrow
                    startDate.setHours(10, 0, 0, 0); // 10 AM
                    
                    const endDate = new Date(startDate);
                    endDate.setHours(11, 0, 0, 0); // 11 AM
                    
                    // Include lead's email as attendee if available
                    const attendees = selectedClient.email ? `&add=${encodeURIComponent(selectedClient.email)}` : '';
                    
                    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}${attendees}`;
                    
                    window.open(googleCalendarUrl, '_blank');
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
                {selectedClient.email && (
                  <div className="text-xs text-gray-500 mt-1">
                    📧 {selectedClient.contactName} will be automatically invited
                  </div>
                )}
                {selectedClient.instagram && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const instagramUrl = `https://www.instagram.com/${selectedClient.instagram.replace('@', '')}`;
                      window.open(instagramUrl, '_blank');
                    }}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    View Instagram
                  </Button>
                )}
              </div>

              {/* Quick Actions Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (selectedClient.website) {
                        window.open(selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`, '_blank');
                      } else {
                        alert('No website available for this lead');
                      }
                    }}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Visit Website
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const notes = `Follow up with ${selectedClient.contactName} - ${new Date().toLocaleDateString()}`;
                      navigator.clipboard.writeText(notes).then(() => {
                        alert('Notes copied to clipboard!');
                      });
                    }}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Copy Notes
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const contactInfo = `Name: ${selectedClient.contactName}\nEmail: ${selectedClient.email}\nPhone: ${selectedClient.phone}\nInstagram: ${selectedClient.instagram || 'N/A'}\nWebsite: ${selectedClient.website || 'N/A'}`;
                      navigator.clipboard.writeText(contactInfo).then(() => {
                        alert('Contact info copied to clipboard!');
                      });
                    }}
                    className="text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Copy Contact Info
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
