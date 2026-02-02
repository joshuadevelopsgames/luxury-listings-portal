import React, { useState } from 'react';
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
 * Apple-style design with glass morphism and smooth animations
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

  // Input field component for consistent styling
  const InputField = ({ label, icon: Icon, field, type = 'text', value, colSpan = false }) => (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>{label}</span>
      </label>
      {canEditField(field) ? (
        <input
          type={type}
          value={editedData[field] ?? value}
          onChange={(e) => setEditedData({...editedData, [field]: e.target.value})}
          className="w-full px-4 py-2.5 bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all"
        />
      ) : (
        <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl">
          <p className="text-[15px] text-[#1d1d1f] dark:text-white">{value || 'Not provided'}</p>
          {!isHRView && isEditing && field !== 'phone' && field !== 'address' && (
            <p className="text-[11px] text-[#86868b] mt-1">Contact HR to change</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
              <User className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-[17px] text-[#1d1d1f] dark:text-white">Personal Information</h3>
          </div>
          {editable && !isEditing && (
            <button 
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#0071e3] hover:bg-[#0071e3]/10 rounded-xl transition-colors"
            >
              <Edit className="w-4 h-4" strokeWidth={1.5} />
              Edit
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-xl transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" strokeWidth={1.5} />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={handleCancel} 
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Avatar and Name Section */}
        {showAvatar && !compact && (
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-black/5 dark:border-white/10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-2xl font-semibold shadow-lg shadow-[#0071e3]/30">
              {person.firstName?.[0]}{person.lastName?.[0]}
            </div>
            <div>
              <h3 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                {person.firstName} {person.lastName}
              </h3>
              <p className="text-[15px] text-[#86868b] mt-0.5">{person.position}</p>
              <span className="inline-flex items-center px-3 py-1 mt-2 text-[12px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-full">
                {person.department}
              </span>
            </div>
          </div>
        )}

        {/* Personal Information Grid */}
        <div className={`grid grid-cols-1 ${compact ? 'gap-4' : 'md:grid-cols-2 gap-5'}`}>
          <InputField label="First Name" icon={User} field="firstName" value={person.firstName} />
          <InputField label="Last Name" icon={User} field="lastName" value={person.lastName} />
          <InputField label="Email" icon={Mail} field="email" type="email" value={person.email} />
          <InputField label="Phone" icon={Phone} field="phone" type="tel" value={person.phone} />
          <InputField label="Address" icon={MapPin} field="address" value={person.address} colSpan={!compact} />
          <InputField label="Department" icon={Building} field="department" value={person.department} />
          <InputField label="Position" icon={Briefcase} field="position" value={person.position} />
          
          {/* Employee ID - Read only */}
          <div>
            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Employee ID</span>
            </label>
            <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl">
              <p className="text-[15px] text-[#1d1d1f] dark:text-white">{person.employeeId || 'Not assigned'}</p>
              {isEditing && isHRView && (
                <p className="text-[11px] text-[#86868b] mt-1">System-generated, cannot be changed</p>
              )}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Start Date</span>
            </label>
            {canEditField('startDate') ? (
              <input
                type="date"
                value={editedData.startDate ?? person.startDate}
                onChange={(e) => setEditedData({...editedData, startDate: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[15px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all"
              />
            ) : (
              <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl">
                <p className="text-[15px] text-[#1d1d1f] dark:text-white">
                  {person.startDate ? format(new Date(person.startDate), 'MMMM dd, yyyy') : 'Not provided'}
                </p>
              </div>
            )}
          </div>

          <InputField label="Manager" icon={UserCheck} field="manager" value={person.manager} />
        </div>

        {/* Edit Mode Info */}
        {isEditing && (
          <div className="mt-6 p-4 bg-[#0071e3]/5 dark:bg-[#0071e3]/10 border border-[#0071e3]/20 rounded-xl">
            <p className="text-[13px] text-[#0071e3] dark:text-[#5ac8fa]">
              {isHRView ? (
                <><span className="font-semibold">HR Manager:</span> You can update all employee information fields except Employee ID.</>
              ) : (
                <><span className="font-semibold">Note:</span> You can update your phone and address. For changes to name, email, or employment details, please contact HR.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonCard;

