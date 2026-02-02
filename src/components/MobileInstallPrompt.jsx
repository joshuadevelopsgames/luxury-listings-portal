import React, { useState, useEffect } from 'react';

/**
 * Mobile Install Prompt Component
 * Shows a prompt to mobile users encouraging them to add the app to their home screen.
 * Works with both iOS (manual instructions) and Android (native install prompt).
 */
export default function MobileInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Already installed, don't show prompt

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) return; // Desktop, don't show prompt

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    
    // Show again after 7 days
    if (dismissedTime && daysSinceDismissed < 7) return;

    // For Android/Chrome - listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS - show manual instructions after a short delay
    if (iOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't render if already installed or shouldn't show
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-lg mx-auto">
        {/* Header */}
        <div className="p-4 pb-2 flex items-start gap-3">
          <img 
            src="/Luxury-listings-logo-CLR.png" 
            alt="Luxury Listings" 
            className="w-12 h-12 rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Install Luxury Listings
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add to your home screen for quick access
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          {isIOS ? (
            // iOS Instructions
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                To install this app on your iPhone:
              </p>
              <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-[#0071e3] text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  <span>Tap the <strong>Share</strong> button <ShareIcon /></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-[#0071e3] text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-[#0071e3] text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  <span>Tap <strong>"Add"</strong> in the top right</span>
                </li>
              </ol>
            </div>
          ) : (
            // Android/Chrome native install
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Get instant access without visiting the browser. Works offline too!
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Not Now
            </button>
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#0071e3] rounded-xl hover:bg-[#0077ed] transition-colors"
              >
                Install App
              </button>
            )}
            {isIOS && (
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#0071e3] rounded-xl hover:bg-[#0077ed] transition-colors"
              >
                Got It
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// iOS Share icon component
function ShareIcon() {
  return (
    <svg 
      className="inline-block w-4 h-4 ml-1 text-[#0071e3]" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
      />
    </svg>
  );
}
