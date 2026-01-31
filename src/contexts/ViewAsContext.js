import React, { createContext, useContext, useState } from 'react';

const ViewAsContext = createContext();

export function useViewAs() {
  return useContext(ViewAsContext);
}

/**
 * ViewAsProvider - Allows system admins to view the site as another user
 * 
 * When viewing as another user:
 * - Navigation is filtered based on their permissions
 * - A banner shows at the top indicating view mode
 * - Admin can exit at any time to return to their own view
 */
export function ViewAsProvider({ children }) {
  const [viewingAsUser, setViewingAsUser] = useState(null);

  // Start viewing as another user
  const startViewingAs = (user) => {
    setViewingAsUser(user);
    console.log('👁️ Now viewing as:', user.email);
  };

  // Stop viewing as another user
  const stopViewingAs = () => {
    setViewingAsUser(null);
    console.log('👁️ Exited view-as mode');
  };

  // Check if currently viewing as another user
  const isViewingAs = !!viewingAsUser;

  const value = {
    viewingAsUser,
    isViewingAs,
    startViewingAs,
    stopViewingAs
  };

  return (
    <ViewAsContext.Provider value={value}>
      {children}
    </ViewAsContext.Provider>
  );
}
