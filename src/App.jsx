import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
import WaitingForApproval from './pages/WaitingForApproval';
import ChatWidget from './components/ui/chat-widget';
import { BookOpen, Home, User, CheckSquare, Settings, FileText, LogOut, Calendar, Users, BarChart3, Target, TrendingUp } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import RoleSwitcher from './components/ui/role-switcher';
import { USER_ROLES } from './entities/UserRoles';

// Navigation Component with useLocation
function Navigation({ navigation }) {
  const location = useLocation();
  
  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center space-x-4 mx-8">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
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
          { id: 'user-management', name: 'User Management', icon: Users, path: '/user-management' },
          { id: 'tutorials', name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'programs', name: 'Programs', icon: Settings, path: '/programs' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'client-packages', name: 'Client Packages', icon: User, path: '/client-packages' },
          { id: 'hr-calendar', name: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
          { id: 'team', name: 'Team Management', icon: Users, path: '/team' },
          { id: 'hr-analytics', name: 'HR Analytics', icon: BarChart3, path: '/hr-analytics' },
          { id: 'crm', name: 'CRM', icon: User, path: '/crm' },
          { id: 'sales-pipeline', name: 'Sales Pipeline', icon: TrendingUp, path: '/sales-pipeline' },
          { id: 'leads', name: 'Lead Management', icon: Target, path: '/leads' },
        ];
      
      case USER_ROLES.CONTENT_DIRECTOR:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'tutorials', name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'programs', name: 'Programs', icon: Settings, path: '/programs' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
          { id: 'client-packages', name: 'Client Packages', icon: User, path: '/client-packages' },
        ];
      
      case USER_ROLES.SOCIAL_MEDIA_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'tutorials', name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
        ];
      
      case USER_ROLES.HR_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'hr-calendar', name: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'team', name: 'Team Management', icon: Users, path: '/team' },
          { id: 'analytics', name: 'HR Analytics', icon: BarChart3, path: '/hr-analytics' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
        ];
      
      case USER_ROLES.SALES_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'crm', name: 'CRM', icon: User, path: '/crm' },
          { id: 'sales-pipeline', name: 'Sales Pipeline', icon: TrendingUp, path: '/sales-pipeline' },
          { id: 'leads', name: 'Lead Management', icon: Target, path: '/leads' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
        ];
      
      default:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
          { id: 'tutorials', name: 'Tutorials', icon: BookOpen, path: '/tutorials' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
          { id: 'resources', name: 'Resources', icon: FileText, path: '/resources' },
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Title */}
            <div className="flex-shrink-0 flex items-center gap-3 min-w-0">
              <img 
                src="./Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings Logo" 
                className="h-8 w-8 object-contain flex-shrink-0"
              />
              <h1 className="text-xl font-bold text-gray-900 truncate">Luxury Listings Portal</h1>
            </div>
            
            {/* Center - Navigation Items */}
            <Navigation navigation={navigation} />
            
            {/* Right side - Profile and Logout */}
            <div className="flex items-center space-x-4 flex-shrink-0">
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
      <main>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute><AppSetupPage /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/client-packages" element={<ProtectedRoute><ClientPackages /></ProtectedRoute>} />
          <Route path="/hr-calendar" element={<ProtectedRoute><HRCalendar /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
          <Route path="/hr-analytics" element={<ProtectedRoute><HRAnalytics /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
          <Route path="/sales-pipeline" element={<ProtectedRoute><SalesPipelinePage /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><LeadManagementPage /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* AI Chat Widget - Available on all pages */}
      <ChatWidget />
    </div>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
          
          {/* Protected routes - redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
