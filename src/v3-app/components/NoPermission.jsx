import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home, Mail } from 'lucide-react';

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
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ff3b30]/10 to-[#ff9500]/10 dark:from-[#ff3b30]/20 dark:to-[#ff9500]/20 flex items-center justify-center">
            <ShieldX className="w-12 h-12 text-[#ff3b30]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-3">
          Access Restricted
        </h1>

        {/* Description */}
        <p className="text-[17px] text-[#86868b] leading-relaxed mb-8">
          You don't have permission to access {pageName}. 
          Contact your administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/v3/dashboard"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#0071e3] text-white text-[15px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[15px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-all w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Contact Admin */}
        <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/5">
          <p className="text-[13px] text-[#86868b] mb-3">
            Need access to this page?
          </p>
          <a
            href="mailto:admin@luxury-listings.com?subject=Page Access Request"
            className="inline-flex items-center gap-2 text-[#0071e3] text-[13px] font-medium hover:underline"
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
