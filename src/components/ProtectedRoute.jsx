import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user is pending approval, redirect to waiting page
  if (currentUser.role === 'pending' || currentUser.role === 'pending_approval') {
    return <Navigate to="/waiting-for-approval" replace />;
  }

  return children;
};

export default ProtectedRoute;

