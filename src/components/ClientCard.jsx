import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  User, 
  Mail, 
  Phone, 
  Package,
  Calendar,
  DollarSign,
  Edit,
  Save,
  X,
  Building,
  CheckCircle,
  Clock,
  FileText,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * ClientCard - Reusable component for displaying client information
 * 
 * @param {Object} client - Client data object
 * @param {boolean} editable - Whether the card can be edited
 * @param {function} onSave - Callback when save is clicked
 * @param {boolean} showPackageInfo - Show package details
 * @param {boolean} compact - Compact view for smaller displays
 * @param {string} className - Additional CSS classes
 */
const ClientCard = ({ 
  client, 
  editable = false, 
  onSave = null,
  showPackageInfo = true,
  compact = false,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData({
      clientName: client.clientName,
      clientEmail: client.clientEmail,
      phone: client.phone || '',
      address: client.address || '',
      packageType: client.packageType,
      packageSize: client.packageSize,
      postsUsed: client.postsUsed,
      postsRemaining: client.postsRemaining,
      postedOn: client.postedOn,
      paymentStatus: client.paymentStatus,
      notes: client.notes,
      customPrice: client.customPrice
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPackageTypeColor = (packageType) => {
    const colors = {
      'Standard': 'bg-blue-100 text-blue-800',
      'Silver': 'bg-gray-300 text-gray-800',
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Platinum': 'bg-purple-100 text-purple-800',
      'Seven': 'bg-indigo-100 text-indigo-800',
      'Custom': 'bg-pink-100 text-pink-800',
      'Monthly': 'bg-green-100 text-green-800'
    };
    return colors[packageType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {client.clientName?.[0] || 'C'}
            </div>
            <div>
              <CardTitle className="text-xl">{client.clientName}</CardTitle>
              {client.clientEmail && (
                <p className="text-sm text-gray-600">{client.clientEmail}</p>
              )}
            </div>
          </div>
          {editable && !isEditing && (
            <Button size="sm" variant="outline" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </label>
            {isEditing ? (
              <input
                type="email"
                value={editedData.clientEmail || client.clientEmail}
                onChange={(e) => setEditedData({...editedData, clientEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">{client.clientEmail || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>Phone</span>
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={editedData.phone || client.phone || ''}
                onChange={(e) => setEditedData({...editedData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            ) : (
              <p className="text-gray-900 mt-1">{client.phone || 'Not provided'}</p>
            )}
          </div>

          {(client.address || isEditing) && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>Address</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.address || client.address || ''}
                  onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Client address"
                />
              ) : (
                <p className="text-gray-900 mt-1">{client.address || 'Not provided'}</p>
              )}
            </div>
          )}
        </div>

        {/* Package Information */}
        {showPackageInfo && (
          <>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Package Details</span>
              </h4>
              <div className="flex items-center space-x-2 mb-3">
                <Badge className={getPackageTypeColor(client.packageType)}>
                  {client.packageType}
                </Badge>
                <Badge className={getStatusColor(client.status)}>
                  {client.status}
                </Badge>
                <Badge className={getPaymentStatusColor(client.paymentStatus)}>
                  {client.paymentStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Package Size</p>
                  <p className="text-lg font-semibold text-gray-900">{client.packageSize} posts</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Posts Used</p>
                  <p className="text-lg font-semibold text-blue-600">{client.postsUsed}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-lg font-semibold text-green-600">{client.postsRemaining}</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Progress</p>
                <Progress 
                  value={(client.postsUsed / client.packageSize) * 100} 
                  className="h-3"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {Math.round((client.postsUsed / client.packageSize) * 100)}% complete
                </p>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Posted On</p>
                <p className="text-sm font-medium text-gray-900">{client.postedOn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {client.startDate ? format(new Date(client.startDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Contact</p>
                <p className="text-sm font-medium text-gray-900">
                  {client.lastContact ? format(new Date(client.lastContact), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-gray-600 flex items-center space-x-1 mb-2">
                  <FileText className="w-3 h-3" />
                  <span>Notes</span>
                </label>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{client.notes}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientCard;

