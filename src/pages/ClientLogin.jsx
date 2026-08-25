import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Shield, Calendar, MessageSquare, BarChart3, FileText } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { createTestClient } from '../utils/createTestClient';
import { getGmailComposeUrl } from '../utils/gmailCompose';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Create Supabase account first
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/client-portal` },
          });
          if (signUpError) throw signUpError;

          // After account creation, check if client exists
          const clients = await supabaseService.getClients();
          const client = clients.find(c =>
            c.clientEmail?.toLowerCase() === email.toLowerCase()
          );

          if (client) {
            // Client exists, store info and redirect
            localStorage.setItem('clientAuth', JSON.stringify({
              email: email,
              clientId: client.id,
              clientName: client.clientName,
              authenticated: true
            }));
            navigate('/client-portal');
          } else {
            // Account created but client doesn't exist yet
            // Add to pending clients for admin approval
            try {
              await supabaseService.addPendingClient({
                email: email,
                clientName: email.split('@')[0],
                status: 'pending'
              });
            } catch (error) {
              console.error('Error adding pending client:', error);
            }
            navigate('/client-waiting-for-approval');
          }
        } catch (error) {
          console.error('Sign-up error:', error);
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setError('An account already exists with this email. Please sign in instead. If you forgot your password, use "Forgot Password?" below.');
            setIsSignUp(false);
            setShowPasswordReset(true);
          } else if (msg.includes('weak') || msg.includes('at least')) {
            setError('Password is too weak. Please use at least 6 characters.');
          } else if (msg.includes('invalid') && msg.includes('email')) {
            setError('Invalid email address. Please check and try again.');
          } else {
            setError('Failed to create account. Error: ' + (error.message || 'Unknown error'));
          }
        }
      } else {
        // Sign in existing account via Supabase
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;

          // After sign in, check if client exists
          const clients = await supabaseService.getClients();
          const client = clients.find(c =>
            c.clientEmail?.toLowerCase() === email.toLowerCase()
          );

          if (client) {
            localStorage.setItem('clientAuth', JSON.stringify({
              email: email,
              clientId: client.id,
              clientName: client.clientName,
              authenticated: true
            }));
            navigate('/client-portal');
          } else {
            navigate('/client-waiting-for-approval');
          }
        } catch (error) {
          console.error('Sign-in error:', error);
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('invalid login') || msg.includes('invalid email or password')) {
            setError('Incorrect email or password. Click "Forgot Password?" to reset it.');
            setShowPasswordReset(true);
          } else if (msg.includes('email not confirmed')) {
            setError('Please confirm your email address before signing in.');
          } else if (msg.includes('too many requests')) {
            setError('Too many failed attempts. Please try again later or reset your password.');
            setShowPasswordReset(true);
          } else {
            setError('Failed to sign in. Error: ' + (error.message || 'Unknown error'));
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft via-white to-brand-soft flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Welcome Content */}
        <div className="text-center lg:text-left">
          <div className="mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Client
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand">
                {' '}Portal
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Access your content calendar, analytics, and communicate with your media manager.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-soft rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-brand" />
              </div>
              <span className="text-gray-700">Approve and review content calendars</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-soft rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-brand" />
              </div>
              <span className="text-gray-700">Message your media manager directly</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-positive-soft rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-positive" />
              </div>
              <span className="text-gray-700">View your analytics and performance reports</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-warning-soft rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-warning" />
              </div>
              <span className="text-gray-700">Download monthly analytics reports</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-surface backdrop-blur-xl rounded-xl border border-hairline p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-brand to-brand rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-[22px] font-semibold text-ink mb-2">
              {isSignUp ? 'Create Your Account' : 'Sign In to Portal'}
            </h2>
            <p className="text-[15px] text-ink-muted">
              {isSignUp 
                ? 'Set up your client portal access' 
                : 'Access your client dashboard'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl">
              <p className="text-danger text-[13px]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full h-12 pl-10 pr-4 text-[15px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create a password (min. 6 characters)' : 'Enter your password'}
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
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </button>
          </form>

          {/* Password Reset Section */}
          {showPasswordReset && !isSignUp && (
            <div className="mt-4 p-4 bg-brand/5 border border-brand/20 rounded-xl">
              {resetSent ? (
                <div className="text-center">
                  <p className="text-[13px] text-brand font-medium mb-2">✓ Password reset email sent!</p>
                  <p className="text-[12px] text-brand/80 mb-2">
                    Check your inbox at <strong>{resetEmail || email}</strong> and click the reset link.
                  </p>
                  <p className="text-[11px] text-warning bg-warning/10 border border-warning/20 rounded-lg px-2 py-1 mb-2">
                    ⚠️ Don't see it? Please check your <strong>spam/junk folder</strong> - it may have been filtered there.
                  </p>
                  <button
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                    className="text-[12px] text-brand hover:text-brand-hover font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[13px] font-medium text-brand mb-2">Forgot Password?</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={resetEmail || email}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const emailToReset = resetEmail || email;
                          if (!emailToReset) {
                            setError('Please enter your email address');
                            return;
                          }
                          console.log('Sending password reset email to:', emailToReset);
                          const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailToReset, {
                            redirectTo: window.location.origin + '/client-password-reset',
                          });
                          if (resetError) throw resetError;
                          console.log('Password reset email sent successfully');
                          setResetSent(true);
                          setError('');
                        } catch (error) {
                          console.error('Password reset error:', error);
                          const msg = (error.message || '').toLowerCase();
                          if (msg.includes('not found') || msg.includes('no user')) {
                            setError('No account found with this email address.');
                          } else if (msg.includes('invalid') && msg.includes('email')) {
                            setError('Invalid email address. Please check and try again.');
                          } else {
                            setError('Failed to send reset email: ' + (error.message || 'Unknown error'));
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-black/20 text-brand text-[13px] font-medium hover:bg-surface-3 transition-colors whitespace-nowrap"
                    >
                      Send Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSignUp && (
            <div className="mt-4 text-center">
              {!showPasswordReset ? (
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-brand hover:text-brand font-medium"
                >
                  Forgot Password?
                </button>
              ) : !resetSent && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetEmail('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setShowPasswordReset(false);
                setResetSent(false);
              }}
              className="text-sm text-brand hover:text-brand font-medium"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          <div className="mt-8 p-4 bg-brand/5 rounded-xl border border-brand/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] text-brand font-medium">Secure Access</p>
                <p className="text-[11px] text-brand/80 mt-1">
                  Your account is protected with secure authentication. Only clients with registered emails can access the portal.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-ink-muted">
              Need help?{' '}
              <a href={getGmailComposeUrl('support@luxury-listings.com')} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover font-medium">
                Contact Support
              </a>
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-[11px] text-warning font-medium mb-2">Development Mode</p>
                <p className="text-[11px] text-warning/80 mb-2">
                  Test account: <strong>joshua@luxury-listings.com</strong>
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError('');
                      const result = await createTestClient();
                      if (result) {
                        setError('');
                        toast.success('Test client created! You can now sign up with joshua@luxury-listings.com');
                      }
                    } catch (error) {
                      console.error('Error creating test client:', error);
                      setError('Failed to create test client: ' + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 text-warning text-[12px] font-medium hover:bg-warning/10 transition-colors"
                  disabled={loading}
                >
                  Create Test Client Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;

