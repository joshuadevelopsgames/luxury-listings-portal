import React from 'react';
import { Card } from '../ui/card';
import { BarChart3 } from 'lucide-react';

/**
 * Client analytics section - Google Analytics has been removed.
 * Placeholder for client-facing analytics in the portal.
 */
const ClientAnalytics = ({ clientId, clientEmail }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h2>
      <Card className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 mb-4">
          <BarChart3 className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-sm">
          Google Analytics has been removed from this site. Analytics data is no longer available here.
        </p>
      </Card>
    </div>
  );
};

export default ClientAnalytics;
