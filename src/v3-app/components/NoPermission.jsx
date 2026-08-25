import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Home, Mail } from 'lucide-react';
import { getGmailComposeUrl } from '../../utils/gmailCompose';

/**
 * NoPermission - Apple-styled access denied page
 * Shown when users try to access pages they don't have permission for
 */
const NoPermission = ({ pageName = 'this page' }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-danger/10 to-warning/10 dark:from-danger/20 dark:to-warning/20 flex items-center justify-center">
            <ShieldOff className="w-12 h-12 text-danger" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[28px] font-semibold text-ink tracking-[-0.02em] mb-3">
          Access Restricted
        </h1>

        {/* Description */}
        <p className="text-[17px] text-ink-muted leading-relaxed mb-8">
          You don't have permission to access {pageName}. 
          Contact your administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-brand text-white text-[15px] font-medium shadow-lg shadow-brand/25 hover:bg-brand-hover transition-all w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-3 text-ink text-[15px] font-medium hover:bg-hairline-strong transition-all w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Contact Admin */}
        <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/5">
          <p className="text-[13px] text-ink-muted mb-3">
            Need access to this page?
          </p>
          <a
            href={getGmailComposeUrl('admin@luxury-listings.com', { subject: 'Page Access Request' })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brand text-[13px] font-medium hover:underline"
          >
            <Mail className="w-4 h-4" />
            Contact Administrator
          </a>
        </div>
      </div>
    </div>
  );
};

export default NoPermission;
