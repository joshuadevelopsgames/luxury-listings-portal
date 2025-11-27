import React from 'react';
import { Card } from '../components/ui/card';
import { Mail, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const ClientWaitingForApproval = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('clientAuth');
      navigate('/client-login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Awaiting Approval
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your account has been created successfully, but we need to verify your client profile with your media manager.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  What happens next?
                </p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Your media manager will be notified</li>
                  <li>• They'll add your email to the client system</li>
                  <li>• You'll receive access to your portal</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Need help?
                </p>
                <p className="text-xs text-gray-600">
                  Contact your media manager or{' '}
                  <a href="mailto:support@luxury-listings.com" className="text-blue-600 hover:text-blue-700">
                    support@luxury-listings.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign Out
          </button>
        </div>
      </Card>
    </div>
  );
};

export default ClientWaitingForApproval;

