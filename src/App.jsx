import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PendingUsersProvider } from './contexts/PendingUsersContext';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import ProtectedRoute from './components/ProtectedRoute';

// V3 Layout and Components (Apple-styled) - Now the main design
import V3Layout from './v3-app/components/Layout';
import V3Login from './v3-app/components/Login';
import V3Dashboard from './v3-app/components/Dashboard';
import PermissionRoute from './v3-app/components/PermissionRoute';
import PermissionsManager from './v3-app/pages/PermissionsManager';

// Import V3 styles
import './v3-app/styles/globals.css';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TutorialsPage from './pages/TutorialsPage';
import TasksPage from './pages/TasksPage';
import AppSetupPage from './pages/AppSetupPage';
import ResourcesPage from './pages/ResourcesPage';
import ClientPackages from './pages/ClientPackages';
import ClientsPage from './pages/ClientsPage';
import HRCalendar from './pages/HRCalendar';
import TeamManagement from './pages/TeamManagement';
import HRAnalytics from './pages/HRAnalytics';
import CRMPage from './pages/CRMPage';
import ContentCalendar from './pages/ContentCalendar';
import InstagramReportsPage from './pages/InstagramReportsPage';
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
import ClientWaitingForApproval from './pages/ClientWaitingForApproval';
import ClientPasswordReset from './pages/ClientPasswordReset';
import FirebaseAuthHandler from './pages/FirebaseAuthHandler';
import PendingClients from './pages/PendingClients';
import DemoPage from './demo/DemoPage';
import PublicInstagramReportPage from './pages/PublicInstagramReportPage';
import DemoInstagramReportPage from './pages/DemoInstagramReportPage';

// Demo Apps
import DemoApp from './demo-app/App';

// UI Components
import ChatWidget from './components/ui/chat-widget';
import MigrationBanner from './components/MigrationBanner';
import NotificationsCenter from './components/NotificationsCenter';
import RoleSwitcher from './components/ui/role-switcher';

// Icons
import { BookOpen, Home, User, CheckSquare, Settings, FileText, LogOut, Calendar, Users, BarChart3, Target, TrendingUp, MessageSquare, UserCircle, Wrench, Clock, Shield } from 'lucide-react';

// Auth & Services
import { useAuth } from './contexts/AuthContext';
import { USER_ROLES } from './entities/UserRoles';
import { firestoreService } from './services/firestoreService';

// ============================================================================
// CLASSIC LAYOUT (Original v1 design - preserved at /classic/*)
// ============================================================================

function ClassicNavigation({ navigation }) {
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

function ClassicAppLayout() {
  const { currentUser, currentRole, logout } = useAuth();
  const [userPermissions, setUserPermissions] = React.useState([]);
  const [loadingPermissions, setLoadingPermissions] = React.useState(true);

  const isSystemAdmin = currentUser?.email === 'jrsschroeder@gmail.com';

  // Load permissions once (no real-time listener for performance)
  React.useEffect(() => {
    if (!currentUser?.email) return;

    const loadPermissions = async () => {
      try {
        setLoadingPermissions(true);
        const permissions = await firestoreService.getUserPagePermissions(currentUser.email);
        setUserPermissions(permissions || []);
      } catch (error) {
        console.error('Error loading permissions:', error);
        setUserPermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    };

    loadPermissions();
  }, [currentUser?.email]);

  const allPages = {
    'dashboard': { name: 'Dashboard', icon: Home, path: '/classic/dashboard', default: true },
    'tasks': { name: 'Tasks', icon: CheckSquare, path: '/classic/tasks', default: true },
    'clients': { name: 'Clients', icon: User, path: '/classic/clients' },
    'client-packages': { name: 'Client Packages', icon: User, path: '/classic/client-packages' },
    'content-calendar': { name: 'Calendars', icon: Calendar, path: '/classic/content-calendar' },
    'crm': { name: 'CRM', icon: User, path: '/classic/crm' },
    'hr-calendar': { name: 'HR Calendar', icon: Calendar, path: '/classic/hr-calendar' },
    'team': { name: 'Team Management', icon: Users, path: '/classic/team' },
    'it-support': { name: 'Support Tickets', icon: Wrench, path: '/classic/it-support' },
  };

  const getNavigationItems = () => {
    if (isSystemAdmin) {
      const adminPages = [
        allPages['dashboard'],
        allPages['it-support'],
      ];
      return adminPages.map(page => ({
        id: Object.keys(allPages).find(key => allPages[key] === page),
        ...page
      }));
    }

    if (!loadingPermissions && userPermissions.length > 0) {
      return userPermissions
        .filter(pageId => allPages[pageId])
        .map(pageId => ({
          id: pageId,
          ...allPages[pageId]
        }));
    }

    switch (currentRole) {
      case USER_ROLES.ADMIN:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/classic/dashboard' },
          { id: 'it-support', name: 'Support Tickets', icon: Wrench, path: '/classic/it-support' },
        ];
      case USER_ROLES.CONTENT_DIRECTOR:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/classic/dashboard' },
          { id: 'client-packages', name: 'Client Packages', icon: User, path: '/classic/client-packages' },
          { id: 'content-calendar', name: 'Calendars', icon: Calendar, path: '/classic/content-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/classic/tasks' },
        ];
      case USER_ROLES.SOCIAL_MEDIA_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/classic/dashboard' },
          { id: 'clients', name: 'Clients', icon: User, path: '/classic/clients' },
          { id: 'content-calendar', name: 'Calendars', icon: Calendar, path: '/classic/content-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/classic/tasks' },
        ];
      case USER_ROLES.HR_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/classic/dashboard' },
          { id: 'hr-calendar', name: 'HR Calendar', icon: Calendar, path: '/classic/hr-calendar' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/classic/tasks' },
          { id: 'team', name: 'Team Management', icon: Users, path: '/classic/team' },
        ];
      case USER_ROLES.SALES_MANAGER:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/classic/dashboard' },
          { id: 'crm', name: 'CRM', icon: User, path: '/classic/crm' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/classic/tasks' },
        ];
      default:
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/classic/dashboard' },
          { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/classic/tasks' },
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
            <div className="flex-shrink-0 flex items-center gap-2 min-w-0">
              <img 
                src="/Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings Logo" 
                className="h-7 w-7 object-contain flex-shrink-0"
              />
              <Link to="/classic/dashboard">
                <h1 className="text-lg font-bold text-gray-900 truncate hidden sm:block cursor-pointer">Luxury Listings Portal</h1>
              </Link>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Classic</span>
            </div>
            
            <ClassicNavigation navigation={navigation} />
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Link 
                to="/dashboard" 
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
              >
                New Design →
              </Link>
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
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />
          <Route path="content-manager-message" element={<ProtectedRoute><ContentManagerMessage /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="programs" element={<ProtectedRoute><AppSetupPage /></ProtectedRoute>} />
          <Route path="client-packages" element={<ProtectedRoute><ClientPackages /></ProtectedRoute>} />
          <Route path="pending-clients" element={<ProtectedRoute><PendingClients /></ProtectedRoute>} />
          <Route path="hr-calendar" element={<ProtectedRoute><HRCalendar /></ProtectedRoute>} />
          <Route path="team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
          <Route path="hr-analytics" element={<ProtectedRoute><HRAnalytics /></ProtectedRoute>} />
          <Route path="crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
          <Route path="content-calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
          <Route path="my-time-off" element={<ProtectedRoute><MyTimeOff /></ProtectedRoute>} />
          <Route path="self-service" element={<ProtectedRoute><EmployeeSelfService /></ProtectedRoute>} />
          <Route path="it-support" element={<ProtectedRoute><ITSupportPage /></ProtectedRoute>} />
          <Route path="onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="demo" element={<ProtectedRoute><DemoPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>

      <ChatWidget />
      <MigrationBanner />
    </div>
  );
}

// ============================================================================
// MAIN APP LAYOUT (V3 Apple Design - Now the primary experience)
// ============================================================================

function MainAppLayout() {
  const { currentUser } = useAuth();

  // Not authenticated - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated - show the app with V3 layout
  return (
    <PermissionsProvider>
      <ViewAsProvider>
        <V3Layout>
          <Routes>
            {/* Dashboard - always accessible */}
            <Route path="dashboard" element={<V3Dashboard />} />
            
            {/* Permission-protected pages */}
            <Route path="tasks" element={
              <PermissionRoute pageId="tasks" pageName="Tasks">
                <TasksPage />
              </PermissionRoute>
            } />
            <Route path="clients" element={
              <PermissionRoute pageId="clients" pageName="Clients">
                <ClientsPage />
              </PermissionRoute>
            } />
            <Route path="client-packages" element={
              <PermissionRoute pageId="client-packages" pageName="Client Packages">
                <ClientPackages />
              </PermissionRoute>
            } />
            <Route path="pending-clients" element={
              <PermissionRoute pageId="pending-clients" pageName="Pending Clients">
                <PendingClients />
              </PermissionRoute>
            } />
            <Route path="content-calendar" element={
              <PermissionRoute pageId="content-calendar" pageName="Content Calendar">
                <ContentCalendar />
              </PermissionRoute>
            } />
            <Route path="crm" element={
              <PermissionRoute pageId="crm" pageName="CRM">
                <CRMPage />
              </PermissionRoute>
            } />
            <Route path="team" element={
              <PermissionRoute pageId="team" pageName="Team Management">
                <TeamManagement />
              </PermissionRoute>
            } />
            <Route path="hr-calendar" element={
              <PermissionRoute pageId="hr-calendar" pageName="HR Calendar">
                <HRCalendar />
              </PermissionRoute>
            } />
            <Route path="hr-analytics" element={
              <PermissionRoute pageId="hr-analytics" pageName="HR Analytics">
                <HRAnalytics />
              </PermissionRoute>
            } />
            <Route path="it-support" element={
              <PermissionRoute pageId="it-support" pageName="IT Support">
                <ITSupportPage />
              </PermissionRoute>
            } />
            <Route path="tutorials" element={
              <PermissionRoute pageId="tutorials" pageName="Tutorials">
                <TutorialsPage />
              </PermissionRoute>
            } />
            <Route path="resources" element={
              <PermissionRoute pageId="resources" pageName="Resources">
                <ResourcesPage />
              </PermissionRoute>
            } />
            
            {/* Profile pages - always accessible */}
            <Route path="my-time-off" element={<MyTimeOff />} />
            <Route path="self-service" element={<EmployeeSelfService />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="content-manager-message" element={<ContentManagerMessage />} />
            
            {/* System admin only */}
            <Route path="permissions" element={<PermissionsManager />} />
            <Route path="instagram-reports" element={<InstagramReportsPage />} />
            
            {/* Meta callback */}
            <Route path="meta-callback" element={<MetaCallback />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </V3Layout>
      </ViewAsProvider>
    </PermissionsProvider>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function LoginWithDevRedirect() {
  const { currentUser, loading } = useAuth();
  
  // Show login immediately while auth is loading
  if (loading) {
    return <V3Login />;
  }
  
  // If user is already logged in, redirect to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <V3Login />;
}

function RootRedirect() {
  const { currentUser, loading } = useAuth();
  
  if (!loading && currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

// Redirect component for /v3/* backwards compatibility
function V3Redirect() {
  const location = useLocation();
  // Remove /v3 prefix and redirect to the same path at root
  const newPath = location.pathname.replace(/^\/v3/, '') || '/dashboard';
  return <Navigate to={newPath} replace />;
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  return (
    <PendingUsersProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginWithDevRedirect />} />
            <Route path="/client-login" element={<ClientLogin />} />
            <Route path="/client-password-reset" element={<ClientPasswordReset />} />
            <Route path="/client-waiting-for-approval" element={<ClientWaitingForApproval />} />
            <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
            <Route path="/__/auth/action" element={<FirebaseAuthHandler />} />
            
            {/* Public Instagram Report View */}
            <Route path="/report/:publicLinkId" element={<PublicInstagramReportPage />} />
            
            {/* Demo Instagram Report (for previewing the layout) */}
            <Route path="/report-demo" element={<DemoInstagramReportPage />} />
            
            {/* Classic Layout (Original v1 design - preserved at /classic/*) */}
            <Route path="/classic/*" element={<ClassicAppLayout />} />
            
            {/* Demo App (v2) */}
            <Route path="/v2/*" element={<DemoApp />} />
            
            {/* Backwards compatibility: redirect /v3/* to /* */}
            <Route path="/v3/*" element={<V3Redirect />} />
            
            {/* Main App root */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Main app routes (V3 design at root level) */}
            <Route path="/*" element={<MainAppLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </PendingUsersProvider>
  );
}

export default App;
