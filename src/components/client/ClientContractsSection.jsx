import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Calendar,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import ContractUploadModal from './ContractUploadModal';
import { toast } from 'react-hot-toast';

const ClientContractsSection = ({ client }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  useEffect(() => {
    if (client?.id) {
      loadContracts();
    }
  }, [client?.id]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const clientContracts = await contractService.getClientContracts(client.id);
      setContracts(clientContracts);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const getContractStatus = (contract) => {
    if (!contract.endDate) return { label: 'Active', color: 'green' };
    
    const endDate = new Date(contract.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (isBefore(endDate, today)) {
      return { label: 'Expired', color: 'red' };
    } else if (daysUntilExpiry <= 30) {
      return { label: 'Expiring Soon', color: 'yellow' };
    } else {
      return { label: 'Active', color: 'green' };
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      await contractService.deleteContract(contractId);
      toast.success('Contract deleted');
      loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Failed to delete contract');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading contracts...</p>
      </div>
    );
  }

  const activeContract = contracts.find(c => c.status === 'active') || contracts[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Contracts</h3>
          <p className="text-sm text-gray-600">
            Manage contracts and agreements for {client?.clientName}
          </p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Contract
        </Button>
      </div>

      {/* Active Contract Highlight */}
      {activeContract && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">{activeContract.contractName}</h4>
                <Badge className={`bg-${getContractStatus(activeContract).color}-100 text-${getContractStatus(activeContract).color}-800`}>
                  {getContractStatus(activeContract).label}
                </Badge>
              </div>
              {activeContract.startDate && activeContract.endDate && (
                <p className="text-sm text-gray-600">
                  {format(new Date(activeContract.startDate), 'MMM d, yyyy')} - {format(new Date(activeContract.endDate), 'MMM d, yyyy')}
                </p>
              )}
              {activeContract.contractDetails && (
                <div className="mt-2 text-sm text-gray-700">
                  <p><strong>Package:</strong> {activeContract.contractDetails.packageType} • {activeContract.contractDetails.monthlyPosts} posts/month</p>
                  {activeContract.contractDetails.price > 0 && (
                    <p><strong>Price:</strong> ${activeContract.contractDetails.price.toLocaleString()} / {activeContract.contractDetails.paymentFrequency}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {activeContract.webViewLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(activeContract.webViewLink, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View
                </Button>
              )}
              {activeContract.driveFileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(activeContract.driveFileUrl, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* All Contracts List */}
      {contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No contracts uploaded</p>
          <p className="text-sm text-gray-500 mt-2">
            Upload a contract to get started
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => {
            const status = getContractStatus(contract);
            return (
              <Card key={contract.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{contract.contractName}</h4>
                        <Badge className={`bg-${status.color}-100 text-${status.color}-800 text-xs`}>
                          {status.label}
                        </Badge>
                        {contract.contractType && (
                          <Badge variant="outline" className="text-xs">
                            {contract.contractType.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {contract.startDate && contract.endDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(contract.startDate), 'MMM d, yyyy')} - {format(new Date(contract.endDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        {contract.fileName && (
                          <span>{contract.fileName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {contract.webViewLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(contract.webViewLink, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {contract.driveFileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(contract.driveFileUrl, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteContract(contract.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <ContractUploadModal
          client={client}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            loadContracts();
            setShowUploadModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ClientContractsSection;

