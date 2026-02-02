import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, XCircle, Shield } from 'lucide-react';
import { auth } from '../firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

const ClientPasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validCode, setValidCode] = useState(false);

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    // Verify the reset code is valid
    const verifyCode = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        setError('Invalid or missing reset link. Please request a new password reset.');
        setValidating(false);
        return;
      }

      try {
        await verifyPasswordResetCode(auth, oobCode);
        setValidCode(true);
      } catch (error) {
        console.error('Reset code verification error:', error);
        if (error.code === 'auth/expired-action-code') {
          setError('This password reset link has expired. Please request a new one.');
        } else if (error.code === 'auth/invalid-action-code') {
          setError('Invalid reset link. Please request a new password reset.');
        } else {
          setError('Error verifying reset link: ' + (error.message || 'Unknown error'));
        }
      } finally {
        setValidating(false);
      }
    };

    verifyCode();
  }, [oobCode, mode]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!oobCode) {
      setError('Invalid reset code. Please request a new password reset.');
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/client-login', { 
          state: { message: 'Password reset successful! Please sign in with your new password.' }
        });
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new password reset.');
      } else if (error.code === 'auth/invalid-action-code') {
        setError('Invalid reset code. Please request a new password reset.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to reset password: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[15px] text-[#86868b]">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#34c759]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#34c759]" />
            </div>
            <h1 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-4">
              Password Reset Successful!
            </h1>
            <p className="text-[15px] text-[#86868b] mb-6">
              Your password has been reset successfully. Redirecting you to sign in...
            </p>
            <button
              onClick={() => navigate('/client-login')}
              className="px-6 py-3 rounded-xl bg-[#0071e3] text-white text-[15px] font-medium hover:bg-[#0077ed] transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!validCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#ff3b30]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-[#ff3b30]" />
            </div>
            <h1 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-[15px] text-[#86868b] mb-6">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <button
              onClick={() => navigate('/client-login')}
              className="px-6 py-3 rounded-xl bg-[#0071e3] text-white text-[15px] font-medium hover:bg-[#0077ed] transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-[#0071e3] to-[#5856d6] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
            Reset Your Password
          </h1>
          <p className="text-[15px] text-[#86868b]">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl">
            <p className="text-[#ff3b30] text-[13px]">{error}</p>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#86868b]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                required
                minLength={6}
                className="w-full h-12 pl-10 pr-4 text-[15px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#86868b]" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                className="w-full h-12 pl-10 pr-4 text-[15px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#0071e3] text-white text-[15px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/client-login')}
            className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium"
          >
            Back to Sign In
          </button>
        </div>

        <div className="mt-8 p-4 bg-[#0071e3]/5 rounded-xl border border-[#0071e3]/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#0071e3] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] text-[#0071e3] font-medium">Security Note</p>
              <p className="text-[11px] text-[#0071e3]/80 mt-1">
                Password reset links expire after 1 hour. Make sure to use a strong password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPasswordReset;

