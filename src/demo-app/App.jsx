import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/Loader';

// Demo App Pages (Apple-like redesign)
import DemoLogin from './pages/Login';
import DemoDashboard from './pages/Dashboard';
import DemoTasks from './pages/Tasks';
import DemoClients from './pages/Clients';
import DemoCalendar from './pages/Calendar';
import DemoAnalytics from './pages/Analytics';
import DemoSettings from './pages/Settings';

// Layout
import DemoLayout from './components/Layout';

// Styles
import './styles/globals.css';

/**
 * Demo App - Complete redesign of smmluxurylistings
 * Apple-like aesthetic inspired by 21st.dev
 */
const DemoApp = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <Loader isDark={true} />;
  }

  return (
    <Routes>
      {/* Public Route */}
      <Route path="login" element={<DemoLogin />} />
      
      {/* Protected Routes */}
      <Route path="/*" element={
        currentUser ? (
          <DemoLayout>
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DemoDashboard />} />
              <Route path="tasks" element={<DemoTasks />} />
              <Route path="clients" element={<DemoClients />} />
              <Route path="calendar" element={<DemoCalendar />} />
              <Route path="analytics" element={<DemoAnalytics />} />
              <Route path="settings" element={<DemoSettings />} />
            </Routes>
          </DemoLayout>
        ) : (
          <Navigate to="login" replace />
        )
      } />
    </Routes>
  );
};

export default DemoApp;
