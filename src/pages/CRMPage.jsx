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
  AlertCircle
} from 'lucide-react';

const CRMPage = () => {
  const { currentUser, currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock CRM data
  const [clients, setClients] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      company: 'Luxury Estates Inc.',
      email: 'sarah.johnson@luxuryestates.com',
      phone: '+1 (555) 123-4567',
      status: 'active',
      value: '$2.5M',
      lastContact: '2025-08-10',
      deals: 3,
      priority: 'high',
      notes: 'Interested in luxury waterfront properties'
    },
    {
      id: 2,
      name: 'Michael Chen',
      company: 'Chen Properties',
      email: 'michael.chen@chenproperties.com',
      phone: '+1 (555) 234-5678',
      status: 'prospect',
      value: '$1.8M',
      lastContact: '2025-08-08',
      deals: 1,
      priority: 'medium',
      notes: 'Looking for investment opportunities'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      company: 'Rodriguez Real Estate',
      email: 'emily.rodriguez@rodriguezre.com',
      phone: '+1 (555) 345-6789',
      status: 'lead',
      value: '$3.2M',
      lastContact: '2025-08-05',
      deals: 0,
      priority: 'high',
      notes: 'High-net-worth individual seeking luxury homes'
    },
    {
      id: 4,
      name: 'David Thompson',
      company: 'Thompson Holdings',
      email: 'david.thompson@thompsonholdings.com',
      phone: '+1 (555) 456-7890',
      status: 'active',
      value: '$4.1M',
      lastContact: '2025-08-12',
      deals: 2,
      priority: 'medium',
      notes: 'Corporate client with multiple property needs'
    }
  ]);

  const [deals, setDeals] = useState([
    {
      id: 1,
      clientName: 'Sarah Johnson',
      property: 'Waterfront Villa - Malibu',
      value: '$2.5M',
      stage: 'negotiation',
      probability: 75,
      expectedClose: '2025-09-15',
      lastActivity: '2025-08-10'
    },
    {
      id: 2,
      clientName: 'Michael Chen',
      property: 'Downtown Penthouse',
      value: '$1.8M',
      stage: 'proposal',
      probability: 60,
      expectedClose: '2025-10-01',
      lastActivity: '2025-08-08'
    },
    {
      id: 3,
      clientName: 'Emily Rodriguez',
      property: 'Beverly Hills Mansion',
      value: '$3.2M',
      stage: 'qualification',
      probability: 40,
      expectedClose: '2025-11-15',
      lastActivity: '2025-08-05'
    }
  ]);

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      prospect: 'bg-blue-100 text-blue-800',
      lead: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.lead;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStageColor = (stage) => {
    const colors = {
      qualification: 'bg-gray-100 text-gray-800',
      proposal: 'bg-blue-100 text-blue-800',
      negotiation: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[stage] || colors.qualification;
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalValue = clients.reduce((sum, client) => {
    const value = parseFloat(client.value.replace('$', '').replace('M', '000000'));
    return sum + value;
  }, 0);

  const activeClients = clients.filter(client => client.status === 'active').length;
  const totalDeals = deals.length;
  const conversionRate = ((activeClients / clients.length) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your client relationships and sales pipeline</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Client
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Total Portfolio Value</p>
                <p className="text-3xl font-bold text-blue-900">${(totalValue / 1000000).toFixed(1)}M</p>
              </div>
              <div className="p-3 rounded-full bg-blue-200">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Active Clients</p>
                <p className="text-3xl font-bold text-green-900">{activeClients}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Active Deals</p>
                <p className="text-3xl font-bold text-purple-900">{totalDeals}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">Conversion Rate</p>
                <p className="text-3xl font-bold text-orange-900">{conversionRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-orange-200">
                <TrendingUp className="w-6 h-6 text-orange-600" />
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
            placeholder="Search clients by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="lead">Lead</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Client Database ({filteredClients.length} clients)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Portfolio Value</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Active Deals</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Last Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{client.company}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(client.status)}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{client.value}</td>
                    <td className="py-3 px-4 text-gray-700">{client.deals}</td>
                    <td className="py-3 px-4 text-gray-700">{client.lastContact}</td>
                    <td className="py-3 px-4">
                      <Badge className={getPriorityColor(client.priority)}>
                        {client.priority.charAt(0).toUpperCase() + client.priority.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClient(client)}
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

      {/* Active Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Active Deals ({deals.length} deals)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map((deal) => (
              <Card key={deal.id} className="border-l-4 border-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{deal.clientName}</h4>
                      <p className="text-sm text-gray-600">{deal.property}</p>
                    </div>
                    <Badge className={getStageColor(deal.stage)}>
                      {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Deal Value:</span>
                      <span className="font-medium text-gray-900">{deal.value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Probability:</span>
                      <span className="font-medium text-gray-900">{deal.probability}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Expected Close:</span>
                      <span className="font-medium text-gray-900">{deal.expectedClose}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Activity:</span>
                      <span className="font-medium text-gray-900">{deal.lastActivity}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Client Details</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{selectedClient.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <p className="text-gray-900">{selectedClient.company}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedClient.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{selectedClient.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Badge className={getStatusColor(selectedClient.status)}>
                    {selectedClient.status.charAt(0).toUpperCase() + selectedClient.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Value</label>
                  <p className="text-gray-900 font-medium">{selectedClient.value}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900">{selectedClient.notes}</p>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Client
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

export default CRMPage;
