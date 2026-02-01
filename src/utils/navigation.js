/**
 * Navigation utility for client-side routing outside React component tree.
 * Used by AuthContext (which lives outside the router) to navigate
 * without window.location.href (which causes full page reloads).
 */

let _navigate = null;

export const setNavigate = (navigateFn) => {
  _navigate = navigateFn;
};

export const appNavigate = (path, options) => {
  if (_navigate) {
    _navigate(path, options);
  } else {
    // Fallback before router mounts (should rarely happen)
    window.location.href = path;
  }
};
