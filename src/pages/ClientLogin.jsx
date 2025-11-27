import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
            // Account created but client doesn't exist yet - redirect to waiting page
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
        <Card className="p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Create Your Account' : 'Sign In to Portal'}
            </h2>
            <p className="text-gray-600">
              {isSignUp 
                ? 'Set up your client portal access' 
                : 'Access your client dashboard'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </Button>
          </form>

          {/* Password Reset Section */}
          {showPasswordReset && !isSignUp && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              {resetSent ? (
                <div className="text-center">
                  <p className="text-sm text-blue-800 font-medium mb-2">✓ Password reset email sent!</p>
                  <p className="text-xs text-blue-700 mb-2">
                    Check your inbox at <strong>{resetEmail || email}</strong> and click the reset link.
                  </p>
                  <button
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-2">Forgot Password?</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={resetEmail || email}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
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
                            url: window.location.origin + '/client-login',
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
                      variant="outline"
                      size="sm"
                      className="bg-white whitespace-nowrap"
                    >
                      Send Reset
                    </Button>
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

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Secure Access</p>
                <p className="text-xs text-blue-700 mt-1">
                  Your account is protected with secure authentication. Only clients with registered emails can access the portal.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a href="mailto:support@luxury-listings.com" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact Support
              </a>
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 font-medium mb-2">Development Mode</p>
                <p className="text-xs text-yellow-700 mb-2">
                  Test account: <strong>joshua@luxury-listings.com</strong>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                  className="w-full text-xs"
                  disabled={loading}
                >
                  Create Test Client Account
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClientLogin;

