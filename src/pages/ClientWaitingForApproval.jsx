import React from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#ff9500]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-[#ff9500]" />
          </div>
          
          <h1 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-4">
            Awaiting Approval
          </h1>
          
          <p className="text-[15px] text-[#86868b] mb-6">
            Your account has been created successfully, but we need to verify your client profile with your media manager.
          </p>

          <div className="bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#0071e3] mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[13px] font-medium text-[#0071e3] mb-1">
                  What happens next?
                </p>
                <ul className="text-[11px] text-[#0071e3]/80 space-y-1">
                  <li>• Your media manager will be notified</li>
                  <li>• They'll add your email to the client system</li>
                  <li>• You'll receive access to your portal</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#86868b] mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                  Need help?
                </p>
                <p className="text-[11px] text-[#86868b]">
                  Contact your media manager or{' '}
                  <a href="mailto:support@luxury-listings.com" className="text-[#0071e3] hover:text-[#0077ed]">
                    support@luxury-listings.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientWaitingForApproval;

