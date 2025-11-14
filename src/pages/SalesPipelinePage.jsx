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
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

const SalesPipelinePage = () => {
  const { currentUser, currentRole } = useAuth();
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock pipeline data
  const pipelineStages = [
    {
      id: 'qualification',
      name: 'Qualification',
      deals: [
        {
          id: 1,
          clientName: 'Emily Rodriguez',
          property: 'Beverly Hills Mansion',
          value: '$3.2M',
          probability: 40,
          expectedClose: '2025-11-15',
          lastActivity: '2025-08-05',
          notes: 'High-net-worth individual seeking luxury homes'
        }
      ],
      color: 'bg-gray-100',
      textColor: 'text-gray-800'
    },
    {
      id: 'proposal',
      name: 'Proposal',
      deals: [
        {
          id: 2,
          clientName: 'Michael Chen',
          property: 'Downtown Penthouse',
          value: '$1.8M',
          probability: 60,
          expectedClose: '2025-10-01',
          lastActivity: '2025-08-08',
          notes: 'Looking for investment opportunities'
        }
      ],
      color: 'bg-blue-100',
      textColor: 'text-blue-800'
    },
    {
      id: 'negotiation',
      name: 'Negotiation',
      deals: [
        {
          id: 3,
          clientName: 'Sarah Johnson',
          property: 'Waterfront Villa - Malibu',
          value: '$2.5M',
          probability: 75,
          expectedClose: '2025-09-15',
          lastActivity: '2025-08-10',
          notes: 'Interested in luxury waterfront properties'
        }
      ],
      color: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    },
    {
      id: 'closing',
      name: 'Closing',
      deals: [
        {
          id: 4,
          clientName: 'David Thompson',
          property: 'Corporate Portfolio',
          value: '$4.1M',
          probability: 90,
          expectedClose: '2025-08-25',
          lastActivity: '2025-08-12',
          notes: 'Corporate client with multiple property needs'
        }
      ],
      color: 'bg-green-100',
      textColor: 'text-green-800'
    }
  ];

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'bg-green-100 text-green-800';
    if (probability >= 60) return 'bg-yellow-100 text-yellow-800';
    if (probability >= 40) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalPipelineValue = pipelineStages.reduce((sum, stage) => {
    return sum + stage.deals.reduce((stageSum, deal) => {
      const value = parseFloat(deal.value.replace('$', '').replace('M', '000000'));
      return stageSum + value;
    }, 0);
  }, 0);

  const totalDeals = pipelineStages.reduce((sum, stage) => sum + stage.deals.length, 0);
  const weightedValue = pipelineStages.reduce((sum, stage) => {
    return sum + stage.deals.reduce((stageSum, deal) => {
      const value = parseFloat(deal.value.replace('$', '').replace('M', '000000'));
      return stageSum + (value * (deal.probability / 100));
    }, 0);
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-600 mt-2">Track your deals through the sales process</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Deal
        </Button>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Total Pipeline Value</p>
                <p className="text-3xl font-bold text-blue-900">${(totalPipelineValue / 1000000).toFixed(1)}M</p>
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
                <p className="text-sm font-medium text-green-600 mb-2">Active Deals</p>
                <p className="text-3xl font-bold text-green-900">{totalDeals}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Weighted Value</p>
                <p className="text-3xl font-bold text-purple-900">${(weightedValue / 1000000).toFixed(1)}M</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">Avg. Deal Size</p>
                <p className="text-3xl font-bold text-orange-900">${(totalPipelineValue / totalDeals / 1000000).toFixed(1)}M</p>
              </div>
              <div className="p-3 rounded-full bg-orange-200">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {pipelineStages.map((stage, index) => (
          <div key={stage.id} className="space-y-4">
            {/* Stage Header */}
            <div className={`${stage.color} ${stage.textColor} rounded-lg p-4 text-center`}>
              <h3 className="font-semibold text-lg">{stage.name}</h3>
              <p className="text-sm opacity-75">{stage.deals.length} deals</p>
              <div className="mt-2">
                <p className="text-xs opacity-75">Total Value</p>
                <p className="font-bold">
                  ${(stage.deals.reduce((sum, deal) => {
                    const value = parseFloat(deal.value.replace('$', '').replace('M', '000000'));
                    return sum + value;
                  }, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>

            {/* Stage Deals */}
            <div className="space-y-3">
              {stage.deals.map((deal) => (
                <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{deal.clientName}</h4>
                        <p className="text-xs text-gray-600">{deal.property}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">{deal.value}</span>
                        <Badge className={getProbabilityColor(deal.probability)}>
                          {deal.probability}%
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Close: {deal.expectedClose}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {deal.lastActivity}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Arrow to next stage */}
            {index < pipelineStages.length - 1 && (
              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Deal Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDeal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <p className="text-gray-900">{selectedDeal.clientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                  <p className="text-gray-900">{selectedDeal.property}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value</label>
                  <p className="text-gray-900 font-medium">{selectedDeal.value}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Probability</label>
                  <Badge className={getProbabilityColor(selectedDeal.probability)}>
                    {selectedDeal.probability}%
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close</label>
                  <p className="text-gray-900">{selectedDeal.expectedClose}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Activity</label>
                  <p className="text-gray-900">{selectedDeal.lastActivity}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900">{selectedDeal.notes}</p>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Update Deal
                </Button>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Follow-up
                </Button>
                <Button variant="outline">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Won
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPipelinePage;
