import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Mail, Shield, Users, CheckCircle, AlertCircle } from 'lucide-react';

const WaitingForApproval = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Waiting for Approval
          </h1>
          <p className="text-gray-600 text-lg">
            Your account is being reviewed by an administrator
          </p>
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Account Details</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{currentUser.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{currentUser.displayName || 'Name not provided'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">What Happens Next?</h3>
              <div className="space-y-3 text-blue-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>An administrator will review your account</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>You'll be assigned a specific role (Content Manager, HR Manager, etc.)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>You'll receive access to role-specific features</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>You can then log in and access your dashboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Timeline */}
        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Clock className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Estimated Timeline</h3>
              <p className="text-green-800">
                Most accounts are reviewed and approved within <strong>24-48 hours</strong> during business days.
                You'll be notified via email once your account is approved.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-purple-50 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Security & Privacy</h3>
              <p className="text-purple-800 text-sm">
                Your account information is secure and will only be used for role assignment and access control.
                We never share your personal information with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleLogout}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-6 py-3 font-medium transition-colors duration-200"
          >
            Sign Out
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 font-medium transition-colors duration-200"
          >
            Check Status
          </button>
        </div>

        {/* Contact Information */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            Need help? Contact your administrator or support team.
          </p>
          <p className="text-xs text-gray-400">
            This is a secure platform for Luxury Listings Portal team members only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaitingForApproval;
