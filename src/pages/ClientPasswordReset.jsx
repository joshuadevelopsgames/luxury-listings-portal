import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, XCircle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ClientPasswordReset = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validCode, setValidCode] = useState(false);

  useEffect(() => {
    // Supabase sends a recovery link that sets the session automatically via
    // the URL hash fragment. onAuthStateChange fires PASSWORD_RECOVERY when
    // the user lands here from the reset email.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidCode(true);
        setValidating(false);
      }
    });

    // Also check if there's already a session (e.g. page was refreshed after
    // the recovery link was consumed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidCode(true);
      }
      setValidating(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/client-login', {
          state: { message: 'Password reset successful! Please sign in with your new password.' }
        });
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('weak') || msg.includes('at least')) {
        setError('Password is too weak. Please use a stronger password.');
      } else if (msg.includes('session') || msg.includes('expired') || msg.includes('invalid')) {
        setError('This reset link has expired. Please request a new password reset.');
      } else {
        setError('Failed to reset password: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface backdrop-blur-xl rounded-xl border border-hairline p-8 shadow-lg">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[15px] text-ink-muted">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface backdrop-blur-xl rounded-xl border border-hairline p-8 shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-positive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-positive" />
            </div>
            <h1 className="text-[22px] font-semibold text-ink mb-4">
              Password Reset Successful!
            </h1>
            <p className="text-[15px] text-ink-muted mb-6">
              Your password has been reset successfully. Redirecting you to sign in...
            </p>
            <button
              onClick={() => navigate('/client-login')}
              className="px-6 py-3 rounded-xl bg-brand text-white text-[15px] font-medium hover:bg-brand-hover transition-colors"
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
        <div className="max-w-md w-full bg-surface backdrop-blur-xl rounded-xl border border-hairline p-8 shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-danger" />
            </div>
            <h1 className="text-[22px] font-semibold text-ink mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-[15px] text-ink-muted mb-6">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <button
              onClick={() => navigate('/client-login')}
              className="px-6 py-3 rounded-xl bg-brand text-white text-[15px] font-medium hover:bg-brand-hover transition-colors"
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
      <div className="max-w-md w-full bg-surface backdrop-blur-xl rounded-xl border border-hairline p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-brand to-brand rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-ink mb-2">
            Reset Your Password
          </h1>
          <p className="text-[15px] text-ink-muted">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl">
            <p className="text-danger text-[13px]">{error}</p>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                required
                minLength={6}
                className="w-full h-12 pl-10 pr-4 text-[15px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                className="w-full h-12 pl-10 pr-4 text-[15px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-brand text-white text-[15px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/client-login')}
            className="text-[13px] text-brand hover:text-brand-hover font-medium"
          >
            Back to Sign In
          </button>
        </div>

        <div className="mt-8 p-4 bg-brand/5 rounded-xl border border-brand/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] text-brand font-medium">Security Note</p>
              <p className="text-[11px] text-brand/80 mt-1">
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
