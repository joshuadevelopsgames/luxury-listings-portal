// Google Analytics gtag Service
// This service handles basic Google Analytics tracking

class GtagService {
  constructor() {
    this.isInitialized = false;
    this.propertyId = 'G-K95YWQ2DZ6';
  }

  // Initialize the service
  initialize() {
    if (typeof window !== 'undefined' && window.gtag) {
      this.isInitialized = true;
      console.log('✅ Google Analytics gtag initialized');
    } else {
      console.warn('⚠️ Google Analytics gtag not available');
    }
  }

  // Track page views
  trackPageView(pageTitle, pagePath) {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (window.gtag) {
      window.gtag('config', this.propertyId, {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: pagePath
      });
      console.log('📊 Tracked page view:', pageTitle);
    }
  }

  // Track custom events
  trackEvent(eventName, parameters = {}) {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (window.gtag) {
      window.gtag('event', eventName, {
        ...parameters,
        custom_parameter: 'luxury_listings_portal'
      });
      console.log('📊 Tracked event:', eventName, parameters);
    }
  }

  // Track user login
  trackLogin(method = 'google') {
    this.trackEvent('login', {
      method: method,
      user_type: 'admin'
    });
  }

  // Track role switching
  trackRoleSwitch(fromRole, toRole) {
    this.trackEvent('role_switch', {
      from_role: fromRole,
      to_role: toRole
    });
  }

  // Track user management actions
  trackUserAction(action, details = {}) {
    this.trackEvent('user_management', {
      action: action,
      ...details
    });
  }

  // Track analytics dashboard usage
  trackAnalyticsUsage(action) {
    this.trackEvent('analytics_usage', {
      action: action,
      dashboard: 'admin_analytics'
    });
  }

  // Track errors
  trackError(errorType, errorMessage) {
    this.trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage
    });
  }

  // Get current property ID
  getPropertyId() {
    return this.propertyId;
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && typeof window !== 'undefined' && window.gtag;
  }
}

// Export singleton instance
export const gtagService = new GtagService();
export default gtagService;
