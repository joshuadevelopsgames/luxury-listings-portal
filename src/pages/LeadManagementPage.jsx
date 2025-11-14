import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Search,
  Filter
} from 'lucide-react';

const LeadManagementPage = () => {
  const { currentUser, currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterScore, setFilterScore] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock lead data
  const [leads, setLeads] = useState([
    {
      id: 1,
      name: 'Jennifer Martinez',
      company: 'Martinez Investments',
      email: 'jennifer.martinez@martinezinvestments.com',
      phone: '+1 (555) 567-8901',
      source: 'website',
      score: 85,
      status: 'qualified',
      value: '$2.8M',
      lastActivity: '2025-08-10',
      nextFollowUp: '2025-08-15',
      notes: 'Interested in luxury condos for investment portfolio'
    },
    {
      id: 2,
      name: 'Robert Kim',
      company: 'Kim Real Estate Group',
      email: 'robert.kim@kimrealestate.com',
      phone: '+1 (555) 678-9012',
      source: 'referral',
      score: 92,
      status: 'hot',
      value: '$3.5M',
      lastActivity: '2025-08-12',
      nextFollowUp: '2025-08-14',
      notes: 'High-priority lead from existing client referral'
    },
    {
      id: 3,
      name: 'Lisa Anderson',
      company: 'Anderson Properties',
      email: 'lisa.anderson@andersonproperties.com',
      phone: '+1 (555) 789-0123',
      source: 'social_media',
      score: 68,
      status: 'warm',
      value: '$1.9M',
      lastActivity: '2025-08-08',
      nextFollowUp: '2025-08-18',
      notes: 'Found us through Instagram luxury real estate content'
    },
    {
      id: 4,
      name: 'Thomas Wilson',
      company: 'Wilson Holdings',
      email: 'thomas.wilson@wilsonholdings.com',
      phone: '+1 (555) 890-1234',
      source: 'cold_call',
      score: 45,
      status: 'cold',
      value: '$4.2M',
      lastActivity: '2025-08-05',
      nextFollowUp: '2025-08-20',
      notes: 'Corporate client, needs multiple luxury properties'
    },
    {
      id: 5,
      name: 'Amanda Foster',
      company: 'Foster Luxury Homes',
      email: 'amanda.foster@fosterluxury.com',
      phone: '+1 (555) 901-2345',
      source: 'website',
      score: 78,
      status: 'qualified',
      value: '$2.1M',
      lastActivity: '2025-08-11',
      nextFollowUp: '2025-08-16',
      notes: 'Looking for waterfront properties in exclusive areas'
    }
  ]);

  const getSourceColor = (source) => {
    const colors = {
      website: 'bg-blue-100 text-blue-800',
      referral: 'bg-green-100 text-green-800',
      social_media: 'bg-purple-100 text-purple-800',
      cold_call: 'bg-gray-100 text-gray-800',
      event: 'bg-orange-100 text-orange-800'
    };
    return colors[source] || colors.website;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      hot: 'bg-red-100 text-red-800',
      qualified: 'bg-green-100 text-green-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.cold;
  };

  const getSourceIcon = (source) => {
    const icons = {
      website: '🌐',
      referral: '👥',
      social_media: '📱',
      cold_call: '📞',
      event: '🎉'
    };
    return icons[source] || '🌐';
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || lead.source === filterSource;
    const matchesScore = filterScore === 'all' || 
                        (filterScore === 'high' && lead.score >= 80) ||
                        (filterScore === 'medium' && lead.score >= 60 && lead.score < 80) ||
                        (filterScore === 'low' && lead.score < 60);
    return matchesSearch && matchesSource && matchesScore;
  });

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'qualified' || lead.status === 'hot').length;
  const totalValue = leads.reduce((sum, lead) => {
    const value = parseFloat(lead.value.replace('$', '').replace('M', '000000'));
    return sum + value;
  }, 0);
  const avgScore = (leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length).toFixed(0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-2">Track and nurture your sales leads</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Total Leads</p>
                <p className="text-3xl font-bold text-blue-900">{totalLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-200">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Qualified Leads</p>
                <p className="text-3xl font-bold text-green-900">{qualifiedLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Total Value</p>
                <p className="text-3xl font-bold text-purple-900">${(totalValue / 1000000).toFixed(1)}M</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">Avg. Lead Score</p>
                <p className="text-3xl font-bold text-orange-900">{avgScore}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-200">
                <Star className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Sources</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="social_media">Social Media</option>
          <option value="cold_call">Cold Call</option>
          <option value="event">Event</option>
        </select>
        <select
          value={filterScore}
          onChange={(e) => setFilterScore(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Scores</option>
          <option value="high">High (80+)</option>
          <option value="medium">Medium (60-79)</option>
          <option value="low">Low (&lt;60)</option>
        </select>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Lead Database ({filteredLeads.length} leads)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Lead</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Value</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Next Follow-up</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <p className="text-sm text-gray-500">{lead.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{lead.company}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getSourceIcon(lead.source)}</span>
                        <Badge className={getSourceColor(lead.source)}>
                          {lead.source.replace('_', ' ').charAt(0).toUpperCase() + lead.source.replace('_', ' ').slice(1)}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getScoreColor(lead.score)}>
                        {lead.score}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{lead.value}</td>
                    <td className="py-3 px-4 text-gray-700">{lead.nextFollowUp}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      {selectedLead && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Lead Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLead(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <p className="text-gray-900">{selectedLead.company}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedLead.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{selectedLead.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSourceIcon(selectedLead.source)}</span>
                    <Badge className={getSourceColor(selectedLead.source)}>
                      {selectedLead.source.replace('_', ' ').charAt(0).toUpperCase() + selectedLead.source.replace('_', ' ').slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Score</label>
                  <Badge className={getScoreColor(selectedLead.score)}>
                    {selectedLead.score}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Badge className={getStatusColor(selectedLead.status)}>
                    {selectedLead.status.charAt(0).toUpperCase() + selectedLead.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Potential Value</label>
                  <p className="text-gray-900 font-medium">{selectedLead.value}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900">{selectedLead.notes}</p>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Lead
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagementPage;
