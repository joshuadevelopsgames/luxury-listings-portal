import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
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
