import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PendingUsersProvider } from './contexts/PendingUsersContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TutorialsPage from './pages/TutorialsPage';
import TasksPage from './pages/TasksPage';
import AppSetupPage from './pages/AppSetupPage';
import ResourcesPage from './pages/ResourcesPage';
import ClientPackages from './pages/ClientPackages';
import HRCalendar from './pages/HRCalendar';
import TeamManagement from './pages/TeamManagement';
import HRAnalytics from './pages/HRAnalytics';
import CRMPage from './pages/CRMPage';
import SalesPipelinePage from './pages/SalesPipelinePage';
import LeadManagementPage from './pages/LeadManagementPage';
import UserManagement from './pages/UserManagement';
import Analytics from './pages/Analytics';
import GoogleAnalyticsSetup from './components/GoogleAnalyticsSetup';
import ContentCalendar from './pages/ContentCalendar';
import ContentManagerMessage from './pages/ContentManagerMessage';
import MetaCallback from './pages/MetaCallback';
import WaitingForApproval from './pages/WaitingForApproval';
import MyTimeOff from './pages/MyTimeOff';
import EmployeeSelfService from './pages/EmployeeSelfService';
import ITSupportPage from './pages/ITSupportPage';
import OnboardingPage from './pages/OnboardingPage';
import OnboardingTestPage from './pages/OnboardingTestPage';
import ClientPortal from './pages/ClientPortal';
import ClientLogin from './pages/ClientLogin';
import ChatWidget from './components/ui/chat-widget';
import MigrationBanner from './components/MigrationBanner';
import NotificationsCenter from './components/NotificationsCenter';
import { BookOpen, Home, User, CheckSquare, Settings, FileText, LogOut, Calendar, Users, BarChart3, Target, TrendingUp, MessageSquare, UserCircle, Wrench } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import RoleSwitcher from './components/ui/role-switcher';
import { USER_ROLES } from './entities/UserRoles';

// Navigation Component with useLocation
function Navigation({ navigation }) {
  const location = useLocation();
  
  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center space-x-2 mx-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`px-2 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 inline mr-1" />
              {item.name}
            </Link>
          );
        })}
      </div>
      
      {/* Mobile Navigation */}
      <div className="lg:hidden border-t border-gray-200 pt-2 pb-2">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Main App Layout Component
function AppLayout() {
  const { currentUser, currentRole, logout } = useAuth();

  // Role-based navigation
  const getNavigationItems = () => {
    switch (currentRole) {
      case USER_ROLES.ADMIN:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'it-support', name: 'Support Tickets', icon: Wrench, path: '/it-support' },
          { id: 'user-management', name: 'User Management', icon: Users, path: '/user-management' },
          { id: 'analytics', name: 'Analytics', icon: BarChart3, path: '/analytics' },
          { id: 'self-service', name: 'My Profile', icon: UserCircle, path: '/self-service' },
        ];
      
      case USER_ROLES.CONTENT_DIRECTOR:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'client-packages', name: 'Client Packages', icon: User, path: '/client-packages' },
          { id: 'content-calendar', name: 'Calendars', icon: Calendar, path: '/content-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'programs', name: 'Programs', icon: Settings, path: '/programs' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'self-service', name: 'My Profile', icon: UserCircle, path: '/self-service' },
        ];
      
      case USER_ROLES.SOCIAL_MEDIA_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'content-calendar', name: 'Calendars', icon: Calendar, path: '/content-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'self-service', name: 'My Profile', icon: UserCircle, path: '/self-service' },
        ];
      
      case USER_ROLES.HR_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'hr-calendar', name: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'team', name: 'Team Management', icon: Users, path: '/team' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'self-service', name: 'My Profile', icon: UserCircle, path: '/self-service' },
        ];
      
      case USER_ROLES.SALES_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'crm', name: 'CRM', icon: User, path: '/crm' },
          { id: 'sales-pipeline', name: 'Sales Pipeline', icon: TrendingUp, path: '/sales-pipeline' },
          { id: 'leads', name: 'Lead Management', icon: Target, path: '/leads' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'self-service', name: 'My Profile', icon: UserCircle, path: '/self-service' },
        ];
      
      default:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'self-service', name: 'My Profile', icon: UserCircle, path: '/self-service' },
        ];
    }
  };

  const navigation = getNavigationItems();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 max-w-7xl mx-auto gap-2">
            {/* Left side - Logo and Title */}
            <div className="flex-shrink-0 flex items-center gap-2 min-w-0">
              <img 
                src="./Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings Logo" 
                className="h-7 w-7 object-contain flex-shrink-0"
              />
              <Link to="/dashboard">
                <h1 className="text-lg font-bold text-gray-900 truncate hidden sm:block cursor-pointer">Luxury Listings Portal</h1>
              </Link>
            </div>
            
            {/* Center - Navigation Items */}
            <Navigation navigation={navigation} />
            
            {/* Right side - Notifications, Profile and Logout */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <NotificationsCenter />
              <RoleSwitcher />
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full overflow-x-hidden">
        <Routes>
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/test-onboarding" element={<ProtectedRoute><OnboardingTestPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />
          <Route path="/content-manager-message" element={<ProtectedRoute><ContentManagerMessage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute><AppSetupPage /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/client-packages" element={<ProtectedRoute><ClientPackages /></ProtectedRoute>} />
          <Route path="/hr-calendar" element={<ProtectedRoute><HRCalendar /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
          <Route path="/hr-analytics" element={<ProtectedRoute><HRAnalytics /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
          <Route path="/sales-pipeline" element={<ProtectedRoute><SalesPipelinePage /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><LeadManagementPage /></ProtectedRoute>} />
          <Route path="/content-calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
          <Route path="/my-time-off" element={<ProtectedRoute><MyTimeOff /></ProtectedRoute>} />
          <Route path="/self-service" element={<ProtectedRoute><EmployeeSelfService /></ProtectedRoute>} />
          <Route path="/it-support" element={<ProtectedRoute><ITSupportPage /></ProtectedRoute>} />
          <Route path="/client-portal" element={<ClientPortal />} />
          <Route path="/meta-callback" element={<MetaCallback />} />
          <Route path="/setup-ga" element={<ProtectedRoute><GoogleAnalyticsSetup /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* AI Chat Widget - Available on all pages */}
      <ChatWidget />
      
      {/* Migration Banner - Shows once to migrate localStorage to Firestore */}
      <MigrationBanner />
    </div>
  );
}

// Main App Component
function App() {
  return (
    <PendingUsersProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/client-login" element={<ClientLogin />} />
            <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
            
            {/* Protected routes - redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </PendingUsersProvider>
  );
}

export default App;
