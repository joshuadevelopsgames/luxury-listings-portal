import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Shield, Calendar, MessageSquare, BarChart3, FileText } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { createTestClient } from '../utils/createTestClient';

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
        // Create Firebase account first
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          
          // After account creation, check if client exists
          const clients = await firestoreService.getClients();
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
              await firestoreService.addPendingClient({
                email: email,
                clientName: email.split('@')[0], // Use email prefix as default name
                status: 'pending'
              });
            } catch (error) {
              console.error('Error adding pending client:', error);
              // Continue even if this fails
            }
            navigate('/client-waiting-for-approval');
          }
        } catch (error) {
          console.error('Sign-up error:', error);
          if (error.code === 'auth/email-already-in-use') {
            setError('An account already exists with this email. Please sign in instead. If you forgot your password, use "Forgot Password?" below.');
            setIsSignUp(false);
            setShowPasswordReset(true);
          } else if (error.code === 'auth/weak-password') {
            setError('Password is too weak. Please use at least 6 characters.');
          } else if (error.code === 'auth/operation-not-allowed') {
            setError('Email/password authentication is not enabled. Please contact support or use Google sign-in.');
          } else if (error.code === 'auth/invalid-email') {
            setError('Invalid email address. Please check and try again.');
          } else {
            setError('Failed to create account. Error: ' + (error.message || error.code || 'Unknown error'));
          }
        }
      } else {
        // Sign in existing account
        try {
          await signInWithEmailAndPassword(auth, email, password);
          
          // After sign in, check if client exists
          const clients = await firestoreService.getClients();
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
            // Signed in but client doesn't exist - redirect to waiting page
            navigate('/client-waiting-for-approval');
          }
        } catch (error) {
          console.error('Sign-in error:', error);
          if (error.code === 'auth/user-not-found') {
            setError('No account found. Please sign up first.');
            setIsSignUp(true);
          } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            setError('Incorrect password. Click "Forgot Password?" to reset it.');
            setShowPasswordReset(true);
          } else if (error.code === 'auth/invalid-email') {
            setError('Invalid email address. Please check and try again.');
          } else if (error.code === 'auth/operation-not-allowed') {
            setError('Email/password authentication is not enabled. Please contact support.');
          } else if (error.code === 'auth/too-many-requests') {
            setError('Too many failed attempts. Please try again later or reset your password.');
            setShowPasswordReset(true);
          } else {
            setError('Failed to sign in. Error: ' + (error.message || error.code || 'Unknown error'));
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Welcome Content */}
        <div className="text-center lg:text-left">
          <div className="mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Client
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
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
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-700">Approve and review content calendars</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-gray-700">Message your media manager directly</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-gray-700">View your analytics and performance reports</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-gray-700">Download monthly analytics reports</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-[#0071e3] to-[#5856d6] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
              {isSignUp ? 'Create Your Account' : 'Sign In to Portal'}
            </h2>
            <p className="text-[15px] text-[#86868b]">
              {isSignUp 
                ? 'Set up your client portal access' 
                : 'Access your client dashboard'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl">
              <p className="text-[#ff3b30] text-[13px]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full h-12 pl-10 pr-4 text-[15px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create a password (min. 6 characters)' : 'Enter your password'}
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
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </button>
          </form>

          {/* Password Reset Section */}
          {showPasswordReset && !isSignUp && (
            <div className="mt-4 p-4 bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-xl">
              {resetSent ? (
                <div className="text-center">
                  <p className="text-[13px] text-[#0071e3] font-medium mb-2">✓ Password reset email sent!</p>
                  <p className="text-[12px] text-[#0071e3]/80 mb-2">
                    Check your inbox at <strong>{resetEmail || email}</strong> and click the reset link.
                  </p>
                  <p className="text-[11px] text-[#ff9500] bg-[#ff9500]/10 border border-[#ff9500]/20 rounded-lg px-2 py-1 mb-2">
                    ⚠️ Don't see it? Please check your <strong>spam/junk folder</strong> - it may have been filtered there.
                  </p>
                  <button
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                    className="text-[12px] text-[#0071e3] hover:text-[#0077ed] font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[13px] font-medium text-[#0071e3] mb-2">Forgot Password?</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={resetEmail || email}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
                          await sendPasswordResetEmail(auth, emailToReset, {
                            url: window.location.origin + '/client-password-reset',
                            handleCodeInApp: false
                          });
                          console.log('Password reset email sent successfully');
                          setResetSent(true);
                          setError('');
                        } catch (error) {
                          console.error('Password reset error:', error);
                          if (error.code === 'auth/user-not-found') {
                            setError('No account found with this email address.');
                          } else if (error.code === 'auth/invalid-email') {
                            setError('Invalid email address. Please check and try again.');
                          } else {
                            setError('Failed to send reset email: ' + (error.message || error.code || 'Unknown error'));
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-black/20 text-[#0071e3] text-[13px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
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
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          <div className="mt-8 p-4 bg-[#0071e3]/5 rounded-xl border border-[#0071e3]/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#0071e3] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] text-[#0071e3] font-medium">Secure Access</p>
                <p className="text-[11px] text-[#0071e3]/80 mt-1">
                  Your account is protected with secure authentication. Only clients with registered emails can access the portal.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#86868b]">
              Need help?{' '}
              <a href="mailto:support@luxury-listings.com" className="text-[#0071e3] hover:text-[#0077ed] font-medium">
                Contact Support
              </a>
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-[#ff9500]/10 border border-[#ff9500]/20 rounded-xl">
                <p className="text-[11px] text-[#ff9500] font-medium mb-2">Development Mode</p>
                <p className="text-[11px] text-[#ff9500]/80 mb-2">
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
                        alert('Test client created! You can now sign up with joshua@luxury-listings.com');
                      }
                    } catch (error) {
                      console.error('Error creating test client:', error);
                      setError('Failed to create test client: ' + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 text-[#ff9500] text-[12px] font-medium hover:bg-[#ff9500]/10 transition-colors"
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

