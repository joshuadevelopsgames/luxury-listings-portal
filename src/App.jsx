import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PendingUsersProvider } from './contexts/PendingUsersContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AppleLayout from './components/AppleLayout';

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
import ClientWaitingForApproval from './pages/ClientWaitingForApproval';
import ClientPasswordReset from './pages/ClientPasswordReset';
import FirebaseAuthHandler from './pages/FirebaseAuthHandler';
import PendingClients from './pages/PendingClients';
import DemoPage from './demo/DemoPage';
import PublicInstagramReportPage from './pages/PublicInstagramReportPage';
import DemoInstagramReportPage from './pages/DemoInstagramReportPage';

// Demo Apps
import DemoApp from './demo-app/App';
import V3App from './v3-app/App';

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
    'analytics': { name: 'Analytics', icon: BarChart3, path: '/classic/analytics' },
    'it-support': { name: 'Support Tickets', icon: Wrench, path: '/classic/it-support' },
  };

  const getNavigationItems = () => {
    if (isSystemAdmin) {
      const adminPages = [
        allPages['dashboard'],
        allPages['it-support'],
        allPages['analytics'],
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
          { id: 'analytics', name: 'Analytics', icon: BarChart3, path: '/classic/analytics' },
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
          <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
          <Route path="content-calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
          <Route path="my-time-off" element={<ProtectedRoute><MyTimeOff /></ProtectedRoute>} />
          <Route path="self-service" element={<ProtectedRoute><EmployeeSelfService /></ProtectedRoute>} />
          <Route path="it-support" element={<ProtectedRoute><ITSupportPage /></ProtectedRoute>} />
          <Route path="onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="setup-ga" element={<ProtectedRoute><GoogleAnalyticsSetup /></ProtectedRoute>} />
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
// NEW APPLE LAYOUT (Main site with Apple design)
// ============================================================================

function MainAppLayout() {
  return (
    <AppleLayout>
      <Routes>
        <Route path="onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="test-onboarding" element={<ProtectedRoute><OnboardingTestPage /></ProtectedRoute>} />
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
        <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
        <Route path="content-calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
        <Route path="my-time-off" element={<ProtectedRoute><MyTimeOff /></ProtectedRoute>} />
        <Route path="self-service" element={<ProtectedRoute><EmployeeSelfService /></ProtectedRoute>} />
        <Route path="it-support" element={<ProtectedRoute><ITSupportPage /></ProtectedRoute>} />
        <Route path="client-portal" element={<ClientPortal />} />
        <Route path="meta-callback" element={<MetaCallback />} />
        <Route path="setup-ga" element={<ProtectedRoute><GoogleAnalyticsSetup /></ProtectedRoute>} />
        <Route path="demo" element={<ProtectedRoute><DemoPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AppleLayout>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function isDevMode() {
  const isVercelPreview = 
    process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL === '1' ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));
  
  return (
    process.env.NODE_ENV === 'development' || 
    isVercelPreview ||
    process.env.REACT_APP_DEV_AUTO_LOGIN === 'true'
  );
}

function LoginWithDevRedirect() {
  const { currentUser, loading } = useAuth();
  
  // Show login immediately while auth is loading
  if (loading) {
    return <Login />;
  }
  
  if (isDevMode() && currentUser) {
    console.log('🔧 DEV MODE: User logged in, redirecting to V3 dashboard');
    return <Navigate to="/v3/dashboard" replace />;
  }
  
  // If user is already logged in (non-dev), redirect to V3 dashboard
  if (currentUser) {
    return <Navigate to="/v3/dashboard" replace />;
  }
  
  return <Login />;
}

function RootRedirect() {
  const { currentUser, loading } = useAuth();
  
  if (!loading && currentUser) {
    console.log('🔄 Root redirect - user logged in, going to V3 dashboard');
    return <Navigate to="/v3/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
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
            
            {/* Classic Layout (Original v1 design - fully preserved) */}
            <Route path="/classic/*" element={<ClassicAppLayout />} />
            
            {/* Demo Apps */}
            <Route path="/v2/*" element={<DemoApp />} />
            <Route path="/v3/*" element={<V3App />} />
            
            {/* Redirect old routes to V3 */}
            <Route path="/dashboard" element={<Navigate to="/v3/dashboard" replace />} />
            <Route path="/onboarding" element={<Navigate to="/v3/onboarding" replace />} />
            
            {/* Main App root */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Fallback to V3 for any other routes */}
            <Route path="/*" element={<Navigate to="/v3/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </PendingUsersProvider>
  );
}

export default App;
