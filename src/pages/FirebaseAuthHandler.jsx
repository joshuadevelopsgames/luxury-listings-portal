import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ClientPasswordReset from './ClientPasswordReset';

// This component handles Firebase's default auth action URLs
// Firebase sends password reset links to /__/auth/action
// We redirect to our custom handler based on the mode
const FirebaseAuthHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (mode === 'resetPassword' && oobCode) {
      // Redirect to our custom password reset handler
      navigate(`/client-password-reset?mode=${mode}&oobCode=${oobCode}`, { replace: true });
    } else {
      // Unknown action mode, redirect to login
      navigate('/client-login', { replace: true });
    }
  }, [mode, oobCode, navigate]);

  // Show password reset page while redirecting
  if (mode === 'resetPassword' && oobCode) {
    return <ClientPasswordReset />;
  }

  return null;
};

export default FirebaseAuthHandler;

