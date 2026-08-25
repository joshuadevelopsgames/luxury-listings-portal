import React from 'react';
import { Mail, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getGmailComposeUrl } from '../utils/gmailCompose';

const ClientWaitingForApproval = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('clientAuth');
      navigate('/client-login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-white to-[#f5f5f7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface backdrop-blur-xl rounded-xl border border-hairline p-8 shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          
          <h1 className="text-[22px] font-semibold text-ink mb-4">
            Awaiting Approval
          </h1>
          
          <p className="text-[15px] text-ink-muted mb-6">
            Your account has been created successfully, but we need to verify your client profile with your media manager.
          </p>

          <div className="bg-brand/5 border border-brand/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[13px] font-medium text-brand mb-1">
                  What happens next?
                </p>
                <ul className="text-[11px] text-brand/80 space-y-1">
                  <li>• Your media manager will be notified</li>
                  <li>• They'll add your email to the client system</li>
                  <li>• You'll receive access to your portal</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-surface-2 border border-hairline rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-ink-muted mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[13px] font-medium text-ink mb-1">
                  Need help?
                </p>
                <p className="text-[11px] text-ink-muted">
                  Contact your media manager or{' '}
                  <a href={getGmailComposeUrl('support@luxury-listings.com')} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover">
                    support@luxury-listings.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-[13px] text-brand hover:text-brand-hover font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientWaitingForApproval;

