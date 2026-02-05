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

const DEPARTMENTS = ['Executive', 'Content Team', 'Design Team', 'Sales', 'Marketing', 'Operations', 'HR', 'IT', 'Finance', 'General'];

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
  // Local state for display after save
  const [localPerson, setLocalPerson] = useState(null);
  
  // Use localPerson if available (after save), otherwise use person prop
  const displayPerson = localPerson || person;

  const handleEdit = () => {
    setIsEditing(true);
    if (isHRView) {
      // HR can edit all fields
      setEditedData({
        firstName: displayPerson.firstName,
        lastName: displayPerson.lastName,
        email: displayPerson.email,
        phone: displayPerson.phone,
        address: displayPerson.address,
        department: displayPerson.department,
        position: displayPerson.position,
        manager: displayPerson.manager,
        startDate: displayPerson.startDate
      });
    } else {
      // Regular users can only edit phone and address
      setEditedData({
        phone: displayPerson.phone,
        address: displayPerson.address
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
      
      // Update local state to reflect changes immediately
      setLocalPerson({ ...displayPerson, ...editedData });
      
      alert('Personal information updated successfully! ✅\n\nChanges have been saved.');
      setIsEditing(false);
      setEditedData({});
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

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  // Render an input or display field
  const renderField = (label, Icon, field, type = 'text', value, colSpan = false) => (
    <div className={colSpan ? 'md:col-span-2' : ''} key={field}>
      <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>{label}</span>
      </label>
      {canEditField(field) ? (
        <input
          type={type}
          value={editedData[field] ?? value ?? ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
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
              {displayPerson.firstName?.[0]}{displayPerson.lastName?.[0]}
            </div>
            <div>
              <h3 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                {displayPerson.firstName} {displayPerson.lastName}
              </h3>
              <p className="text-[15px] text-[#86868b] mt-0.5">{displayPerson.position}</p>
              <span className="inline-flex items-center px-3 py-1 mt-2 text-[12px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-full">
                {displayPerson.department}
              </span>
            </div>
          </div>
        )}

        {/* Personal Information Grid */}
        <div className={`grid grid-cols-1 ${compact ? 'gap-4' : 'md:grid-cols-2 gap-5'}`}>
          {renderField("First Name", User, "firstName", "text", displayPerson.firstName)}
          {renderField("Last Name", User, "lastName", "text", displayPerson.lastName)}
          {renderField("Email", Mail, "email", "email", displayPerson.email)}
          {renderField("Phone", Phone, "phone", "tel", displayPerson.phone)}
          {renderField("Address", MapPin, "address", "text", displayPerson.address, !compact)}
          {/* Department as dropdown when editing */}
          <div key="department">
            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5 mb-2">
              <Building className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Department</span>
            </label>
            {canEditField('department') ? (
              <select
                value={editedData.department ?? displayPerson.department ?? ''}
                onChange={(e) => handleFieldChange('department', e.target.value)}
                className="w-full px-4 py-2.5 bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[15px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            ) : (
              <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl">
                <p className="text-[15px] text-[#1d1d1f] dark:text-white">{displayPerson.department || 'Not provided'}</p>
                {!isHRView && isEditing && (
                  <p className="text-[11px] text-[#86868b] mt-1">Contact HR to change</p>
                )}
              </div>
            )}
          </div>
          {renderField("Position", Briefcase, "position", "text", displayPerson.position)}
          
          {/* Employee ID - Read only */}
          <div>
            <label className="text-[13px] font-medium text-[#86868b] flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Employee ID</span>
            </label>
            <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl">
              <p className="text-[15px] text-[#1d1d1f] dark:text-white">{displayPerson.employeeId || 'Not assigned'}</p>
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
                value={editedData.startDate ?? displayPerson.startDate ?? ''}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[15px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all"
              />
            ) : (
              <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl">
                <p className="text-[15px] text-[#1d1d1f] dark:text-white">
                  {displayPerson.startDate ? format(new Date(displayPerson.startDate), 'MMMM dd, yyyy') : 'Not provided'}
                </p>
              </div>
            )}
          </div>

          {renderField("Manager", UserCheck, "manager", "text", displayPerson.manager)}
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
