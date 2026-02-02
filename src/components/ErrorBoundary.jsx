import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, Bug, Send, CheckCircle, Mail } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { getCapturedLogs, getLogsAsString, getSystemInfo } from '../utils/consoleCapture';

// Developer email for reports
const DEVELOPER_EMAIL = 'jrsschroeder@gmail.com';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a friendly
 * error page that matches the site's Apple-style design.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      showDetails: false,
      sendingReport: false,
      reportSent: false,
      reportError: null
    };
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
    this.setState({ hasError: false, error: null, errorInfo: null, reportSent: false });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, reportSent: false });
    window.location.href = '/';
  };

  handleSendReport = async () => {
    const { error, errorInfo } = this.state;
    
    this.setState({ sendingReport: true, reportError: null });

    try {
      // Get current user info from localStorage if available
      let userEmail = 'unknown';
      let userName = 'Unknown User';
      try {
        const authData = localStorage.getItem('firebase:authUser:AIzaSyAqhyoHC88TN4lk2BmgpEEWvwfRdwqK1tQ:[DEFAULT]');
        if (authData) {
          const parsed = JSON.parse(authData);
          userEmail = parsed.email || 'unknown';
          userName = parsed.displayName || parsed.email || 'Unknown User';
        }
      } catch (e) {
        console.warn('Could not get user info:', e);
      }

      // Gather system info
      const systemInfo = getSystemInfo();
      
      // Get captured console logs
      const consoleLogs = getCapturedLogs();
      const logsString = getLogsAsString();

      // Build the report
      const report = {
        // Error details
        errorMessage: error?.message || 'Unknown error',
        errorStack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        
        // User info
        userEmail,
        userName,
        
        // System info
        url: systemInfo.url,
        userAgent: systemInfo.userAgent,
        platform: systemInfo.platform,
        screenSize: systemInfo.screenSize,
        viewportSize: systemInfo.viewportSize,
        timezone: systemInfo.timezone,
        
        // Console logs (last 50)
        consoleLogs: consoleLogs.slice(-50),
        consoleLogsText: logsString.slice(-10000), // Last 10KB
        
        // Timestamps
        errorTimestamp: systemInfo.timestamp
      };

      // Submit to Firestore
      const result = await firestoreService.submitErrorReport(report);
      
      if (result.success) {
        this.setState({ reportSent: true, sendingReport: false });
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Failed to send error report:', err);
      this.setState({ 
        sendingReport: false, 
        reportError: err.message 
      });
    }
  };

  handleEmailFallback = () => {
    const { error, errorInfo } = this.state;
    const systemInfo = getSystemInfo();
    
    const subject = encodeURIComponent(`Error Report: ${error?.message?.substring(0, 50) || 'Unknown error'}`);
    const body = encodeURIComponent(
      `Error Report\n` +
      `============\n\n` +
      `Error: ${error?.message || 'Unknown'}\n\n` +
      `URL: ${systemInfo.url}\n` +
      `Time: ${systemInfo.timestamp}\n` +
      `Browser: ${systemInfo.userAgent}\n\n` +
      `Stack Trace:\n${error?.stack || 'N/A'}\n\n` +
      `Please describe what you were doing when this error occurred:\n\n`
    );
    
    window.open(`mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, sendingReport, reportSent, reportError } = this.state;
      
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
                  Oops! Something went wrong
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
                
                {/* Send Report Section */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                  <p className="text-[13px] text-[#86868b] mb-3 text-center">
                    Help us fix this issue by sending an error report
                  </p>
                  
                  {reportSent ? (
                    <div className="bg-[#34c759]/10 rounded-xl p-4 flex items-center justify-center gap-2 text-[#34c759]">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Report sent! Thank you for helping us improve.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={this.handleSendReport}
                        disabled={sendingReport}
                        className="w-full h-12 bg-[#34c759] hover:bg-[#30d158] disabled:bg-[#86868b] text-white rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2"
                      >
                        {sendingReport ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Report to Developer
                          </>
                        )}
                      </button>
                      
                      {reportError && (
                        <div className="bg-[#ff3b30]/10 rounded-xl p-3 text-center">
                          <p className="text-[13px] text-[#ff3b30] mb-2">
                            Failed to send report: {reportError}
                          </p>
                          <button
                            onClick={this.handleEmailFallback}
                            className="text-[13px] text-[#0071e3] hover:underline flex items-center justify-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            Send via email instead
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
                      <div className="bg-[#1d1d1f] dark:bg-black rounded-xl p-4 overflow-x-auto max-h-48 overflow-y-auto">
                        <pre className="text-[11px] text-[#86868b] font-mono whitespace-pre-wrap break-words">
                          <span className="text-[#ff3b30]">Error:</span> {error?.message}
                          {'\n\n'}
                          <span className="text-[#ff9500]">Stack:</span>
                          {'\n'}{error?.stack}
                        </pre>
                      </div>
                      
                      {errorInfo?.componentStack && (
                        <div className="bg-[#1d1d1f] dark:bg-black rounded-xl p-4 overflow-x-auto max-h-48 overflow-y-auto">
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
  const [sendingReport, setSendingReport] = React.useState(false);
  const [reportSent, setReportSent] = React.useState(false);
  const [reportError, setReportError] = React.useState(null);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleSendReport = async () => {
    setSendingReport(true);
    setReportError(null);

    try {
      // Get current user info from localStorage if available
      let userEmail = 'unknown';
      let userName = 'Unknown User';
      try {
        const authData = localStorage.getItem('firebase:authUser:AIzaSyAqhyoHC88TN4lk2BmgpEEWvwfRdwqK1tQ:[DEFAULT]');
        if (authData) {
          const parsed = JSON.parse(authData);
          userEmail = parsed.email || 'unknown';
          userName = parsed.displayName || parsed.email || 'Unknown User';
        }
      } catch (e) {
        console.warn('Could not get user info:', e);
      }

      // Gather system info
      const systemInfo = getSystemInfo();
      
      // Get captured console logs
      const consoleLogs = getCapturedLogs();
      const logsString = getLogsAsString();

      // Build the report
      const report = {
        errorMessage: 'Route Error - Page failed to load',
        errorStack: 'React Router errorElement triggered',
        componentStack: '',
        userEmail,
        userName,
        url: systemInfo.url,
        userAgent: systemInfo.userAgent,
        platform: systemInfo.platform,
        screenSize: systemInfo.screenSize,
        viewportSize: systemInfo.viewportSize,
        timezone: systemInfo.timezone,
        consoleLogs: consoleLogs.slice(-50),
        consoleLogsText: logsString.slice(-10000),
        errorTimestamp: systemInfo.timestamp
      };

      const result = await firestoreService.submitErrorReport(report);
      
      if (result.success) {
        setReportSent(true);
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Failed to send error report:', err);
      setReportError(err.message);
    } finally {
      setSendingReport(false);
    }
  };

  const handleEmailFallback = () => {
    const systemInfo = getSystemInfo();
    
    const subject = encodeURIComponent(`Error Report: Page failed to load`);
    const body = encodeURIComponent(
      `Error Report\n` +
      `============\n\n` +
      `Error: Route/Page failed to load\n\n` +
      `URL: ${systemInfo.url}\n` +
      `Time: ${systemInfo.timestamp}\n` +
      `Browser: ${systemInfo.userAgent}\n\n` +
      `Please describe what you were doing when this error occurred:\n\n`
    );
    
    window.open(`mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`, '_blank');
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
            
            {/* Send Report Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-[13px] text-[#86868b] mb-3 text-center">
                Help us fix this issue by sending an error report
              </p>
              
              {reportSent ? (
                <div className="bg-[#34c759]/10 rounded-xl p-4 flex items-center justify-center gap-2 text-[#34c759]">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Report sent! Thank you for helping us improve.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleSendReport}
                    disabled={sendingReport}
                    className="w-full h-12 bg-[#34c759] hover:bg-[#30d158] disabled:bg-[#86868b] text-white rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2"
                  >
                    {sendingReport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Report to Developer
                      </>
                    )}
                  </button>
                  
                  {reportError && (
                    <div className="bg-[#ff3b30]/10 rounded-xl p-3 text-center">
                      <p className="text-[13px] text-[#ff3b30] mb-2">
                        Failed to send report: {reportError}
                      </p>
                      <button
                        onClick={handleEmailFallback}
                        className="text-[13px] text-[#0071e3] hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <Mail className="w-3 h-3" />
                        Send via email instead
                      </button>
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

export default ErrorBoundary;
