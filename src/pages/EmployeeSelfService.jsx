import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { format } from 'date-fns';

const EmployeeSelfService = () => {
  const { currentUser, currentRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [employeeFirestoreId, setEmployeeFirestoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isHRManager = currentRole === 'hr_manager';

  // Load employee Firestore ID on mount
  useEffect(() => {
    const loadEmployeeId = async () => {
      if (!currentUser?.email) return;
      
      try {
        const employee = await firestoreService.getEmployeeByEmail(currentUser.email);
        if (employee) {
          setEmployeeFirestoreId(employee.id);
          console.log('✅ Found employee in Firestore:', employee.id);
        } else {
          console.log('ℹ️ Employee not found in Firestore, will create on first save');
        }
      } catch (error) {
        console.error('❌ Error loading employee ID:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEmployeeId();
  }, [currentUser?.email]);

  // Mock data
  const employeeData = {
    personalInfo: {
      firstName: currentUser?.firstName || 'John',
      lastName: currentUser?.lastName || 'Doe',
      email: currentUser?.email || 'john.doe@luxuryrealestate.com',
      phone: '(555) 123-4567',
      address: '123 Main Street, Los Angeles, CA 90001',
      department: currentUser?.department || 'Marketing',
      position: 'Marketing Specialist',
      startDate: currentUser?.startDate || '2023-01-15',
      employeeId: 'EMP-12345',
      manager: 'Sarah Johnson'
    },
    timeOff: {
      vacation: { total: 20, used: 8, remaining: 12 },
      sick: { total: 10, used: 2, remaining: 8 },
      personal: { total: 5, used: 1, remaining: 4 }
    },
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employee Self-Service</h1>
        <p className="text-gray-600 mt-2">Manage your information, time off, and access important resources</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={action.action}
            >
              <CardContent className="p-6 pt-8">
                <div className={`p-3 rounded-lg bg-${action.color}-100 w-fit mb-3`}>
                  <Icon className={`w-6 h-6 text-${action.color}-600`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.label}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {employeeData.personalInfo.firstName[0]}{employeeData.personalInfo.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{employeeData.personalInfo.firstName} {employeeData.personalInfo.lastName}</p>
                    <p className="text-sm text-gray-600">{employeeData.personalInfo.position}</p>
                    <p className="text-sm text-gray-600">{employeeData.personalInfo.department}</p>
                  </div>
                </div>
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{employeeData.personalInfo.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Start Date: {format(new Date(employeeData.personalInfo.startDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Manager: {employeeData.personalInfo.manager}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Off Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Time Off Balance</span>
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => navigate('/my-time-off')}>
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Vacation</span>
                  </div>
                  <span className="text-xl font-bold text-blue-900">{employeeData.timeOff.vacation.remaining} days</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">Sick Leave</span>
                  </div>
                  <span className="text-xl font-bold text-red-900">{employeeData.timeOff.sick.remaining} days</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Home className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">Personal</span>
                  </div>
                  <span className="text-xl font-bold text-purple-900">{employeeData.timeOff.personal.remaining} days</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Recent Requests</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employeeData.recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{request.type}</p>
                      <p className="text-sm text-gray-600">{request.description}</p>
                    </div>
                    <Badge variant={request.status === 'Approved' ? 'secondary' : 'outline'}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Info Tab */}
        <TabsContent value="personal">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading employee data...</p>
              </CardContent>
            </Card>
          ) : (
            <PersonCard 
              person={employeeData.personalInfo}
              editable={true}
              isHRView={isHRManager}
              onSave={handleSavePersonal}
              showAvatar={false}
              employeeId={employeeFirestoreId}
            />
          )}
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Time Off Management</span>
                </CardTitle>
                <Button onClick={() => navigate('/my-time-off')}>
                  Go to My Time Off Page
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View detailed time-off information, submit requests, and track your leave balances on the dedicated Time Off page.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(employeeData.timeOff).map(([key, balance]) => (
                  <div key={key} className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 capitalize mb-2">{key}</p>
                    <p className="text-3xl font-bold text-gray-900">{balance.remaining}</p>
                    <p className="text-sm text-gray-600 mt-1">of {balance.total} days remaining</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Compensation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Annual Salary</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{employeeData.compensation.salary}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Pay Schedule</label>
                  <p className="text-gray-900 mt-1">{employeeData.compensation.paySchedule}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Next Pay Date</label>
                  <p className="text-gray-900 mt-1">{format(new Date(employeeData.compensation.nextPayDate), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">YTD Earnings</label>
                  <p className="text-gray-900 mt-1">{employeeData.compensation.ytdEarnings}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Benefits</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employeeData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{benefit.name}</p>
                        <p className="text-sm text-gray-600">
                          {benefit.provider || `Contribution: ${benefit.contribution}` || `Coverage: ${benefit.coverage}`}
                        </p>
                      </div>
                      <Badge variant="secondary">{benefit.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>My Documents</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employeeData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded">
                        <FileText className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-600">
                          {doc.category} • {format(new Date(doc.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeSelfService;

