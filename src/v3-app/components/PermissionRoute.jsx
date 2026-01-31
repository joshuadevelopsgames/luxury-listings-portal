import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import NoPermission from './NoPermission';

// System admins always have access
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com',
  'joshua@luxury-listings.com'
];

/**
 * PermissionRoute - Wrapper that checks if user has permission to access a page
 * 
 * @param {string} pageId - The page ID to check permission for (e.g., 'tasks', 'crm')
 * @param {string} pageName - Human-readable page name for the error message
 * @param {React.ReactNode} children - The page content to render if permitted
 */
const PermissionRoute = ({ pageId, pageName, children }) => {
  const { currentUser } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      // System admins always have access
      if (currentUser?.email && SYSTEM_ADMINS.includes(currentUser.email.toLowerCase())) {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Dashboard is always accessible
      if (pageId === 'dashboard') {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Check user's permissions
      try {
        const permissions = await firestoreService.getUserPagePermissions(currentUser?.email);
        setHasPermission(permissions?.includes(pageId) || false);
      } catch (error) {
        console.error('Error checking permissions:', error);
        // On error, default to no permission for safety
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.email) {
      checkPermission();
    } else {
      setLoading(false);
      setHasPermission(false);
    }
  }, [currentUser?.email, pageId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No permission
  if (!hasPermission) {
    return <NoPermission pageName={pageName} />;
  }

  // Has permission - render children
  return children;
};

export default PermissionRoute;
