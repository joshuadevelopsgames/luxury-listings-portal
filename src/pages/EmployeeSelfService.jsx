import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PersonCard from '../components/PersonCard';
import { firestoreService } from '../services/firestoreService';
import { 
  Calendar, 
  User, 
  FileText, 
  BookOpen, 
  Bell,
  Shield,
  Plane,
  Heart,
  Home,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Award,
  Download,
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';

const EmployeeSelfService = () => {
  const { currentUser, currentRole, isSystemAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [employeeFirestoreId, setEmployeeFirestoreId] = useState(null);
  const [employeeNumber, setEmployeeNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personalInfo, setPersonalInfo] = useState(null); // Real data from Firestore
  const [leaveBalances, setLeaveBalances] = useState(null); // From Firestore (same source as My Time Off)
  
  const isHRManager = currentRole === 'hr_manager';
  const canEditAllFields = isHRManager || isSystemAdmin;

  // Generate numerical employee ID (EMP-001, EMP-002, etc.)
  const generateEmployeeId = (index) => {
    const num = (index + 1).toString().padStart(3, '0');
    return `EMP-${num}`;
  };

  // Load employee Firestore ID and employee number when user changes
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!currentUser?.email) return;
      
      // Reset state when user changes
      setLoading(true);
      setEmployeeFirestoreId(null);
      setEmployeeNumber(null);
      setPersonalInfo(null);
      setLeaveBalances(null);
      setActiveTab('overview');
      
      try {
        // Get the employee from Firestore
        const employee = await firestoreService.getEmployeeByEmail(currentUser.email);
        if (employee) {
          setEmployeeFirestoreId(employee.id);
          // Store the actual employee data from Firestore
          setPersonalInfo({
            firstName: employee.firstName || currentUser?.firstName || '',
            lastName: employee.lastName || currentUser?.lastName || '',
            email: employee.email || currentUser?.email || '',
            phone: employee.phone || '',
            department: employee.department || currentUser?.department || '',
            position: employee.position || employee.role || '',
            startDate: employee.startDate || currentUser?.startDate || '',
            employeeId: employee.employeeId || null,
            manager: employee.manager || ''
          });
          // Use existing employeeId if available
          if (employee.employeeId) {
            setEmployeeNumber(employee.employeeId);
          }
        }
        
        // If no employeeId yet, calculate based on position in approved users list
        if (!employee?.employeeId) {
          const allUsers = await firestoreService.getApprovedUsers();
          // Sort by createdAt to ensure consistent ordering
          const sortedUsers = [...allUsers].sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateA - dateB;
          });
          const userIndex = sortedUsers.findIndex(u => u.email === currentUser.email);
          if (userIndex !== -1) {
            setEmployeeNumber(generateEmployeeId(userIndex));
          } else {
            setEmployeeNumber('EMP-001'); // Default fallback
          }
        }

        // Leave balances from Firestore (same source as My Time Off page)
        const balances = await firestoreService.getUserLeaveBalances(currentUser.email);
        if (!cancelled) setLeaveBalances(balances);
      } catch (error) {
        console.error('❌ Error loading employee data:', error);
        setEmployeeNumber('EMP-001'); // Fallback on error
      } finally {
        setLoading(false);
      }
    };

    let cancelled = false;
    loadEmployeeData();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  // Default personal info (used when Firestore data not loaded yet)
  const defaultPersonalInfo = {
    firstName: currentUser?.firstName || currentUser?.displayName?.split(' ')[0] || '',
    lastName: currentUser?.lastName || currentUser?.displayName?.split(' ').slice(1).join(' ') || '',
    email: currentUser?.email || '',
    phone: '',
    department: currentUser?.department || '',
    position: '',
    startDate: currentUser?.startDate || '',
    employeeId: employeeNumber || 'Loading...',
    manager: ''
  };
  
  // Use Firestore data if available, otherwise defaults
  const currentPersonalInfo = personalInfo || defaultPersonalInfo;
  // Make sure employeeId is always current
  currentPersonalInfo.employeeId = employeeNumber || currentPersonalInfo.employeeId || 'Loading...';
  
  // Employee data structure (personalInfo and timeOff from Firestore; My Time Off is source of truth)
  const defaultTimeOff = {
    vacation: { total: 15, used: 0, remaining: 15 },
    sick: { total: 3, used: 0, remaining: 3 }
  };
  const employeeData = {
    personalInfo: currentPersonalInfo,
    timeOff: leaveBalances || defaultTimeOff,
    compensation: {
      salary: '$72,000',
      paySchedule: 'Bi-weekly',
      nextPayDate: '2024-02-15',
      ytdEarnings: '$6,000'
    },
    benefits: [
      { name: 'Health Insurance', status: 'Active', provider: 'Blue Cross' },
      { name: 'Dental Insurance', status: 'Active', provider: 'Delta Dental' },
      { name: '401(k)', status: 'Active', contribution: '5%' },
      { name: 'Life Insurance', status: 'Active', coverage: '$100,000' }
    ],
    documents: [
      { name: 'Employee Handbook', type: 'PDF', date: '2024-01-01', category: 'Policy' },
      { name: 'W-2 Form 2023', type: 'PDF', date: '2024-01-15', category: 'Tax' },
      { name: 'Benefits Summary', type: 'PDF', date: '2024-01-01', category: 'Benefits' },
      { name: 'Performance Review Q4', type: 'PDF', date: '2023-12-20', category: 'Performance' }
    ],
    recentRequests: [
      { id: 1, type: 'Time Off', description: 'Vacation: Mar 10-12', status: 'Pending', date: '2024-01-25' },
      { id: 2, type: 'Time Off', description: 'Vacation: Feb 15-19', status: 'Approved', date: '2024-01-20' }
    ]
  };

  const handleSavePersonal = async (updatedData) => {
    try {
      // If employee doesn't exist in Firestore yet, create them
      if (!employeeFirestoreId) {
        const newEmployee = {
          ...employeeData.personalInfo,
          ...updatedData,
          email: currentUser.email
        };
        const result = await firestoreService.addEmployee(newEmployee);
        setEmployeeFirestoreId(result.id);
        console.log('✅ Employee created in Firestore:', result.id);
      } else {
        // Update existing employee
        await firestoreService.updateEmployee(employeeFirestoreId, updatedData);
        console.log('✅ Employee updated in Firestore');
      }
      
      // Update local state immediately so UI reflects changes
      setPersonalInfo(prev => ({
        ...(prev || defaultPersonalInfo),
        ...updatedData
      }));
      
      // Note: PersonCard already shows success message
    } catch (error) {
      console.error('❌ Error saving to Firestore:', error);
      throw error; // Re-throw so PersonCard can handle the error
    }
  };

  const quickActions = [
    { 
      icon: Calendar, 
      label: 'Request Time Off', 
      description: 'Submit vacation or sick leave',
      color: 'blue',
      action: () => navigate('/my-time-off')
    },
    { 
      icon: FileText, 
      label: 'View Documents', 
      description: 'Access pay stubs and forms',
      color: 'purple',
      action: () => setActiveTab('documents')
    },
    { 
      icon: User, 
      label: 'Update Profile', 
      description: 'Edit personal information',
      color: 'green',
      action: () => setActiveTab('personal')
    },
    { 
      icon: BookOpen, 
      label: 'Resources', 
      description: 'Company policies and guides',
      color: 'orange',
      action: () => navigate('/resources')
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">My Profile</h1>
        <p className="text-[15px] text-[#86868b] mt-1">Manage your information, time off, and access important resources</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const colorMap = {
            blue: { bg: 'bg-[#0071e3]/10', icon: 'text-[#0071e3]' },
            green: { bg: 'bg-[#34c759]/10', icon: 'text-[#34c759]' },
            purple: { bg: 'bg-[#af52de]/10', icon: 'text-[#af52de]' },
            orange: { bg: 'bg-[#ff9500]/10', icon: 'text-[#ff9500]' }
          };
          const colors = colorMap[action.color] || colorMap.blue;
          return (
            <div 
              key={index} 
              className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 cursor-pointer hover:shadow-lg transition-all"
              onClick={action.action}
            >
              <div className={`p-2.5 rounded-xl ${colors.bg} w-fit mb-3`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white mb-1">{action.label}</h3>
              <p className="text-[12px] text-[#86868b]">{action.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit">
        {[
          { value: 'overview', label: 'Overview' },
          { value: 'personal', label: 'Personal Info' },
          { value: 'timeoff', label: 'Time Off' },
          { value: 'compensation', label: 'Compensation' },
          { value: 'documents', label: 'Documents' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Personal Summary */}
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
                <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Personal Summary</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-[#0071e3] rounded-full flex items-center justify-center text-white text-[17px] font-semibold">
                    {(currentUser?.displayName || '').slice(0, 2).toUpperCase() || `${employeeData.personalInfo.firstName?.[0] || ''}${employeeData.personalInfo.lastName?.[0] || ''}`.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                      {currentUser?.displayName || `${(employeeData.personalInfo.firstName || '').trim()} ${(employeeData.personalInfo.lastName || '').trim()}`.trim() || 'Team Member'}
                    </p>
                    <p className="text-[12px] text-[#86868b]">{employeeData.personalInfo.position}</p>
                    <p className="text-[12px] text-[#86868b]">{employeeData.personalInfo.department}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Mail className="w-4 h-4 text-[#86868b]" />
                    <span className="text-[#86868b]">{employeeData.personalInfo.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <Briefcase className="w-4 h-4 text-[#86868b]" />
                    <span className="text-[#86868b]">Start Date: {employeeData.personalInfo.startDate && isValid(new Date(employeeData.personalInfo.startDate)) ? format(new Date(employeeData.personalInfo.startDate), 'MMM dd, yyyy') : (employeeData.personalInfo.startDate || '—')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <User className="w-4 h-4 text-[#86868b]" />
                    <span className="text-[#86868b]">Manager: {employeeData.personalInfo.manager}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Off Summary */}
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
                  <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Time Off Balance</span>
                </div>
                <button onClick={() => navigate('/my-time-off')} className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
                  View Details
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0071e3]/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-[#0071e3]" />
                    <span className="text-[13px] font-medium text-[#0071e3]">Vacation</span>
                  </div>
                  <span className="text-[17px] font-semibold text-[#0071e3]">{employeeData.timeOff.vacation.remaining} days</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#ff3b30]/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-[#ff3b30]" />
                    <span className="text-[13px] font-medium text-[#ff3b30]">Sick Leave</span>
                  </div>
                  <span className="text-[17px] font-semibold text-[#ff3b30]">{employeeData.timeOff.sick.remaining} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Requests */}
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Recent Requests</span>
            </div>
            <div className="space-y-3">
              {employeeData.recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                  <div>
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{request.type}</p>
                    <p className="text-[12px] text-[#86868b]">{request.description}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${
                    request.status === 'Approved' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-black/5 dark:bg-white/10 text-[#86868b]'
                  }`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Personal Info Tab */}
      {activeTab === 'personal' && (
        <div>
          {loading ? (
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-12 text-center">
              <div className="w-12 h-12 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[14px] text-[#86868b]">Loading employee data...</p>
            </div>
          ) : (
            <PersonCard 
              person={{
                ...employeeData.personalInfo,
                displayName: currentUser?.displayName || `${(employeeData.personalInfo.firstName || '').trim()} ${(employeeData.personalInfo.lastName || '').trim()}`.trim()
              }}
              editable={true}
              isHRView={canEditAllFields}
              onSave={handleSavePersonal}
              showAvatar={false}
              employeeId={employeeFirestoreId}
            />
          )}
        </div>
      )}

      {/* Time Off Tab */}
      {activeTab === 'timeoff' && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Time Off Management</span>
            </div>
            <button onClick={() => navigate('/my-time-off')} className="px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors">
              Go to My Time Off
            </button>
          </div>
          <p className="text-[13px] text-[#86868b] mb-4">
            View detailed time-off information, submit requests, and track your leave balances on the dedicated Time Off page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(employeeData.timeOff).map(([key, balance]) => (
              <div key={key} className="p-4 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                <p className="text-[12px] font-medium text-[#86868b] capitalize mb-2">{key}</p>
                <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{balance.remaining}</p>
                <p className="text-[12px] text-[#86868b] mt-1">of {balance.total} days remaining</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compensation Tab - Coming Soon */}
      {activeTab === 'compensation' && (
        <div className="relative min-h-[280px] rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 blur-sm select-none pointer-events-none">
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
                <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Compensation</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-medium text-[#86868b]">Annual Salary</label>
                  <p className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mt-1">{employeeData.compensation.salary}</p>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[#86868b]">Pay Schedule</label>
                  <p className="text-[14px] text-[#1d1d1f] dark:text-white mt-1">{employeeData.compensation.paySchedule}</p>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[#86868b]">Next Pay Date</label>
                  <p className="text-[14px] text-[#1d1d1f] dark:text-white mt-1">{employeeData.compensation.nextPayDate && isValid(new Date(employeeData.compensation.nextPayDate)) ? format(new Date(employeeData.compensation.nextPayDate), 'MMMM dd, yyyy') : (employeeData.compensation.nextPayDate || '—')}</p>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[#86868b]">YTD Earnings</label>
                  <p className="text-[14px] text-[#1d1d1f] dark:text-white mt-1">{employeeData.compensation.ytdEarnings}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
                <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Benefits</span>
              </div>
              <div className="space-y-3">
                {employeeData.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                    <div>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{benefit.name}</p>
                      <p className="text-[12px] text-[#86868b]">
                        {benefit.provider || `Contribution: ${benefit.contribution}` || `Coverage: ${benefit.coverage}`}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-md font-medium bg-[#34c759]/10 text-[#34c759]">{benefit.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-md">
            <p className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
              Coming Soon!
            </p>
          </div>
        </div>
      )}

      {/* Documents Tab - Coming Soon */}
      {activeTab === 'documents' && (
        <div className="relative min-h-[280px] rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 blur-sm select-none pointer-events-none">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">My Documents</span>
            </div>
            <div className="space-y-3">
              {employeeData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-black/[0.02] dark:bg-white/5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/5 dark:bg-white/10 rounded-lg">
                      <FileText className="w-5 h-5 text-[#86868b]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{doc.name}</p>
                      <p className="text-[12px] text-[#86868b]">
                        {doc.category} • {doc.date && isValid(new Date(doc.date)) ? format(new Date(doc.date), 'MMM dd, yyyy') : (doc.date || '—')}
                      </p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-md">
            <p className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
              Coming Soon!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSelfService;

