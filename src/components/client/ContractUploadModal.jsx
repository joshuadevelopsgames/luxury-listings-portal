import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Upload, 
  FileText, 
  X, 
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import { toast } from 'react-hot-toast';

const ContractUploadModal = ({ client, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    contractName: '',
    contractType: 'service_agreement',
    startDate: '',
    endDate: '',
    renewalDate: '',
    contractDetails: {
      packageType: client?.packageType || 'Standard',
      packageSize: client?.packageSize || 1,
      monthlyPosts: client?.packageSize || 1,
      price: 0,
      paymentFrequency: 'monthly',
      paymentTerms: 'Net 30',
      services: [],
      deliverables: [],
      specialTerms: '',
      cancellationPolicy: '',
      autoRenew: false
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Please upload a PDF, DOCX, or image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      // Auto-fill contract name from filename if empty
      if (!formData.contractName) {
        setFormData({
          ...formData,
          contractName: selectedFile.name.replace(/\.[^/.]+$/, '')
        });
      }
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a contract file');
      return;
    }

    if (!formData.contractName) {
      toast.error('Please enter a contract name');
      return;
    }

    try {
      setUploading(true);
      
      const contractData = {
        clientId: client.id,
        clientName: client.clientName,
        clientEmail: client.clientEmail,
        ...formData
      };

      const result = await contractService.createContract(file, contractData);
      
      toast.success('Contract uploaded successfully!');
      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error('Error uploading contract:', error);
      toast.error('Failed to upload contract: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Upload Contract for {client?.clientName}
            </h2>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract File *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="contract-file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <label
                  htmlFor="contract-file"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {file ? (
                    <>
                      <FileText className="w-12 h-12 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOCX, or images (max 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Basic Contract Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Name *
                </label>
                <Input
                  value={formData.contractName}
                  onChange={(e) => handleInputChange('contractName', e.target.value)}
                  placeholder="e.g., 2024 Service Agreement"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Type
                </label>
                <select
                  value={formData.contractType}
                  onChange={(e) => handleInputChange('contractType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="service_agreement">Service Agreement</option>
                  <option value="renewal">Renewal</option>
                  <option value="amendment">Amendment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renewal Date
                </label>
                <Input
                  type="date"
                  value={formData.renewalDate}
                  onChange={(e) => handleInputChange('renewalDate', e.target.value)}
                />
              </div>
            </div>

            {/* Contract Details */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Package Type
                  </label>
                  <Input
                    value={formData.contractDetails.packageType}
                    onChange={(e) => handleInputChange('contractDetails.packageType', e.target.value)}
                    placeholder="e.g., Gold, Standard"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Posts
                  </label>
                  <Input
                    type="number"
                    value={formData.contractDetails.monthlyPosts}
                    onChange={(e) => handleInputChange('contractDetails.monthlyPosts', parseInt(e.target.value))}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($)
                  </label>
                  <Input
                    type="number"
                    value={formData.contractDetails.price}
                    onChange={(e) => handleInputChange('contractDetails.price', parseFloat(e.target.value))}
                    placeholder="2000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Frequency
                  </label>
                  <select
                    value={formData.contractDetails.paymentFrequency}
                    onChange={(e) => handleInputChange('contractDetails.paymentFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <Input
                  value={formData.contractDetails.paymentTerms}
                  onChange={(e) => handleInputChange('contractDetails.paymentTerms', e.target.value)}
                  placeholder="e.g., Net 30, Due on receipt"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Terms & Conditions
                </label>
                <textarea
                  value={formData.contractDetails.specialTerms}
                  onChange={(e) => handleInputChange('contractDetails.specialTerms', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special terms or conditions..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRenew"
                  checked={formData.contractDetails.autoRenew}
                  onChange={(e) => handleInputChange('contractDetails.autoRenew', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoRenew" className="text-sm text-gray-700">
                  Auto-renewal enabled
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={uploading || !file}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Contract
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ContractUploadModal;

