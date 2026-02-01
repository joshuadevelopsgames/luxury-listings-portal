import React from 'react';
import { usePermissions } from '../../contexts/PermissionsContext';
import NoPermission from './NoPermission';

/**
 * PermissionRoute - Wrapper that checks if user has permission to access a page
 * Uses cached permissions from PermissionsContext for instant checks (no Firestore calls)
 * 
 * @param {string} pageId - The page ID to check permission for (e.g., 'tasks', 'crm')
 * @param {string} pageName - Human-readable page name for the error message
 * @param {React.ReactNode} children - The page content to render if permitted
 */
const PermissionRoute = ({ pageId, pageName, children }) => {
  const { hasPermission, loading } = usePermissions();
  const allowed = !loading && hasPermission(pageId);
  const branch = loading ? 'loading' : !hasPermission(pageId) ? 'noperm' : 'children';
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/5f481a4f-2c53-40ee-be98-e77cffd69946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PermissionRoute.jsx',message:'PermissionRoute render',data:{pageId,loading,allowed,branch},timestamp:Date.now(),sessionId:'debug-v2',hypothesisId:'H-PERM'})}).catch(()=>{});
  // #endregion

  // Loading state - show squares loader
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="relative w-12 h-12 rotate-45">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#0071e3] dark:bg-white animate-square"
              style={{ animationDelay: `${-1.4285714286 * i}s` }}
            />
          ))}
        </div>
        <style>{`
          @keyframes square-animation {
            0% { left: 0; top: 0; }
            10.5% { left: 0; top: 0; }
            12.5% { left: 16px; top: 0; }
            23% { left: 16px; top: 0; }
            25% { left: 32px; top: 0; }
            35.5% { left: 32px; top: 0; }
            37.5% { left: 32px; top: 16px; }
            48% { left: 32px; top: 16px; }
            50% { left: 16px; top: 16px; }
            60.5% { left: 16px; top: 16px; }
            62.5% { left: 16px; top: 32px; }
            73% { left: 16px; top: 32px; }
            75% { left: 0; top: 32px; }
            85.5% { left: 0; top: 32px; }
            87.5% { left: 0; top: 16px; }
            98% { left: 0; top: 16px; }
            100% { left: 0; top: 0; }
          }
          .animate-square {
            animation: square-animation 10s ease-in-out infinite both;
          }
        `}</style>
      </div>
    );
  }

  // No permission
  if (!hasPermission(pageId)) {
    return <NoPermission pageName={pageName} />;
  }

  // Has permission - render children
  return children;
};

export default PermissionRoute;
