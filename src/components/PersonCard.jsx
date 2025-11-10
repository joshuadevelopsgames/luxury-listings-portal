import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { firestoreService } from '../services/firestoreService';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar,
  Edit,
  Save,
  X,
  Building,
  UserCheck,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * PersonCard - Reusable component for displaying employee information
 * 
 * @param {Object} person - Employee data object
 * @param {boolean} editable - Whether the card can be edited
 * @param {boolean} isHRView - Whether this is being viewed by HR (full edit permissions)
 * @param {function} onSave - Callback when save is clicked
 * @param {boolean} compact - Compact view for smaller displays
 * @param {boolean} showAvatar - Show avatar image
 */
const PersonCard = ({ 
  person, 
  editable = false, 
  isHRView = false, 
  onSave = null, 
  compact = false,
  showAvatar = true,
  className = '',
  employeeId = null
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    if (isHRView) {
      // HR can edit all fields
      setEditedData({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        address: person.address,
        department: person.department,
        position: person.position,
        manager: person.manager,
        startDate: person.startDate
      });
    } else {
      // Regular users can only edit phone and address
      setEditedData({
        phone: person.phone,
        address: person.address
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If employeeId is provided, save to Firestore
      if (employeeId) {
        await firestoreService.updateEmployee(employeeId, editedData);
        console.log('✅ Employee data saved to Firestore');
      }
      
      // Call custom onSave callback if provided
      if (onSave) {
        await onSave(editedData);
      }
      
      alert('Personal information updated successfully! ✅\n\nChanges have been saved to Firestore.');
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Error saving employee data:', error);
      alert(`Failed to save changes: ${error.message}\n\nPlease try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const canEditField = (field) => {
    if (!isEditing) return false;
    if (isHRView) return field !== 'employeeId'; // HR can edit all except ID
    return field === 'phone' || field === 'address'; // Regular users can only edit these
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Personal Information</span>
          </CardTitle>
          {editable && !isEditing && (
            <Button size="sm" variant="outline" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Avatar and Name Section */}
        {showAvatar && !compact && (
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {person.firstName?.[0]}{person.lastName?.[0]}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">
                {person.firstName} {person.lastName}
              </h3>
              <p className="text-gray-600">{person.position}</p>
              <Badge variant="secondary" className="mt-1">{person.department}</Badge>
            </div>
          </div>
        )}

        {/* Personal Information Grid */}
        <div className={`grid grid-cols-1 ${compact ? 'gap-4' : 'md:grid-cols-2 gap-6'}`}>
          {/* First Name */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>First Name</span>
            </label>
            {canEditField('firstName') ? (
              <input
                type="text"
                value={editedData.firstName || person.firstName}
                onChange={(e) => setEditedData({...editedData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <>
                <p className="text-gray-900 mt-1 font-medium">{person.firstName}</p>
                {!isHRView && isEditing && <p className="text-xs text-gray-500 mt-1">Contact HR to change</p>}
              </>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>Last Name</span>
            </label>
            {canEditField('lastName') ? (
              <input
                type="text"
                value={editedData.lastName || person.lastName}
                onChange={(e) => setEditedData({...editedData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <>
                <p className="text-gray-900 mt-1 font-medium">{person.lastName}</p>
                {!isHRView && isEditing && <p className="text-xs text-gray-500 mt-1">Contact HR to change</p>}
              </>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </label>
            {canEditField('email') ? (
              <input
                type="email"
                value={editedData.email || person.email}
                onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <>
                <p className="text-gray-900 mt-1">{person.email}</p>
                {!isHRView && isEditing && <p className="text-xs text-gray-500 mt-1">Contact HR to change</p>}
              </>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>Phone</span>
            </label>
            {canEditField('phone') ? (
              <input
                type="tel"
                value={editedData.phone || person.phone}
                onChange={(e) => setEditedData({...editedData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">{person.phone}</p>
            )}
          </div>

          {/* Address */}
          <div className={compact ? '' : 'md:col-span-2'}>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>Address</span>
            </label>
            {canEditField('address') ? (
              <input
                type="text"
                value={editedData.address || person.address}
                onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">{person.address}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Building className="w-3 h-3" />
              <span>Department</span>
            </label>
            {canEditField('department') ? (
              <input
                type="text"
                value={editedData.department || person.department}
                onChange={(e) => setEditedData({...editedData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">{person.department}</p>
            )}
          </div>

          {/* Position */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Briefcase className="w-3 h-3" />
              <span>Position</span>
            </label>
            {canEditField('position') ? (
              <input
                type="text"
                value={editedData.position || person.position}
                onChange={(e) => setEditedData({...editedData, position: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">{person.position}</p>
            )}
          </div>

          {/* Employee ID */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Employee ID</span>
            </label>
            <p className="text-gray-900 mt-1">{person.employeeId}</p>
            {isEditing && isHRView && <p className="text-xs text-gray-500 mt-1">System-generated, cannot be changed</p>}
          </div>

          {/* Start Date */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Start Date</span>
            </label>
            {canEditField('startDate') ? (
              <input
                type="date"
                value={editedData.startDate || person.startDate}
                onChange={(e) => setEditedData({...editedData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">
                {person.startDate ? format(new Date(person.startDate), 'MMMM dd, yyyy') : 'N/A'}
              </p>
            )}
          </div>

          {/* Manager */}
          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <UserCheck className="w-3 h-3" />
              <span>Manager</span>
            </label>
            {canEditField('manager') ? (
              <input
                type="text"
                value={editedData.manager || person.manager}
                onChange={(e) => setEditedData({...editedData, manager: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 mt-1">{person.manager}</p>
            )}
          </div>
        </div>

        {/* Edit Mode Info */}
        {isEditing && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              {isHRView ? (
                <><strong>HR Manager:</strong> You can update all employee information fields except Employee ID.</>
              ) : (
                <><strong>Note:</strong> You can update your phone and address. For changes to name, email, or employment details, please contact HR.</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonCard;

