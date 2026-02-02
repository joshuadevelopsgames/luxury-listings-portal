import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, Bug } from 'lucide-react';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a friendly
 * error page that matches the site's Apple-style design.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    // Ignore Firestore internal SDK errors - they don't affect the app
    if (error?.message?.includes('FIRESTORE') && error?.message?.includes('INTERNAL ASSERTION')) {
      console.warn('⚠️ Firestore SDK error ignored by ErrorBoundary');
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Ignore Firestore internal SDK errors
    if (error?.message?.includes('FIRESTORE') && error?.message?.includes('INTERNAL ASSERTION')) {
      console.warn('⚠️ Firestore SDK internal error (suppressed):', error.message);
      return;
    }
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      
      return (
        <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            {/* Main Card */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-[#ff3b30] to-[#ff9500] p-8 text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2">
                  Something went wrong
                </h1>
                <p className="text-white/80 text-sm">
                  We encountered an unexpected error
                </p>
              </div>
              
              {/* Content */}
              <div className="p-8">
                {/* Error Message */}
                <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Bug className="w-5 h-5 text-[#ff3b30] shrink-0 mt-0.5" />
                    <p className="text-[15px] text-[#1d1d1f] dark:text-white break-words">
                      {error?.message || 'An unexpected error occurred'}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={this.handleReload}
                    className="w-full h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0071e3]/25"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="w-full h-12 bg-[#f5f5f7] dark:bg-[#3a3a3c] hover:bg-[#e8e8ed] dark:hover:bg-[#48484a] text-[#1d1d1f] dark:text-white rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go to Dashboard
                  </button>
                </div>
                
                {/* Technical Details Toggle */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="w-full flex items-center justify-between text-[13px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
                  >
                    <span>Technical Details</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showDetails && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-[#1d1d1f] dark:bg-black rounded-xl p-4 overflow-x-auto">
                        <pre className="text-[11px] text-[#86868b] font-mono whitespace-pre-wrap break-words">
                          <span className="text-[#ff3b30]">Error:</span> {error?.message}
                          {'\n\n'}
                          <span className="text-[#ff9500]">Stack:</span>
                          {'\n'}{error?.stack}
                        </pre>
                      </div>
                      
                      {errorInfo?.componentStack && (
                        <div className="bg-[#1d1d1f] dark:bg-black rounded-xl p-4 overflow-x-auto">
                          <pre className="text-[11px] text-[#86868b] font-mono whitespace-pre-wrap break-words">
                            <span className="text-[#5856d6]">Component Stack:</span>
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <p className="text-center text-[13px] text-[#86868b] mt-6">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route Error Page Component
 * 
 * Used as the errorElement for React Router routes.
 * Provides a consistent error experience for route-level errors.
 */
export function RouteErrorPage() {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#ff3b30] to-[#ff9500] p-8 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-white/80 text-sm">
              We couldn't load this page
            </p>
          </div>
          
          {/* Content */}
          <div className="p-8">
            <p className="text-[15px] text-[#86868b] text-center mb-6">
              Don't worry, this happens sometimes. Try reloading the page or going back to the dashboard.
            </p>
            
            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleReload}
                className="w-full h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0071e3]/25"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={handleGoHome}
                className="w-full h-12 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-[13px] text-[#86868b] mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
