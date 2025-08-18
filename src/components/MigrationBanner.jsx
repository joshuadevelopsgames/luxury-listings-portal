import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, Database, ArrowRight, Bug } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';

const MigrationBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    // Migration is complete - hide banner by default
    // Only show if explicitly needed for debugging
    const hasMigrated = localStorage.getItem('firestore-migration-complete');
    if (!hasMigrated) {
      localStorage.setItem('firestore-migration-complete', 'true');
    }
    setShowBanner(false);
  }, []);

  const testFirestoreConnection = async () => {
    setDebugInfo('Testing Firestore connection...');
    try {
      // Use the new test connection method
      const result = await firestoreService.testConnection();
      if (result.success) {
        setDebugInfo(`✅ Firestore connection successful! Database: ${result.databaseName}, App: ${result.appName}`);
      } else {
        setDebugInfo(`❌ Firestore connection failed: ${result.error} (Code: ${result.code})`);
      }
    } catch (error) {
      setDebugInfo(`❌ Firestore connection failed: ${error.message}`);
      console.error('Firestore test error:', error);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    setMigrationError(null);
    
    try {
      await firestoreService.migrateFromLocalStorage();
      setMigrationComplete(true);
      localStorage.setItem('firestore-migration-complete', 'true');
      
      // Hide banner after 3 seconds
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationError(error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('firestore-migration-complete', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <Card className="p-6 border-2 border-blue-200 bg-blue-50">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {migrationComplete ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Database className="w-6 h-6 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {migrationComplete ? 'Migration Complete!' : 'Upgrade to Cloud Storage'}
            </h3>
            
            <p className="text-gray-700 mb-4">
              {migrationComplete 
                ? 'Your data has been successfully moved to secure cloud storage. Your app is now more reliable and accessible across devices!'
                : 'We\'re upgrading your app to use secure cloud storage instead of browser storage. This will make your data persistent and accessible across all devices.'
              }
            </p>

            {debugInfo && (
              <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bug className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700 text-sm font-mono">
                    {debugInfo}
                  </span>
                </div>
              </div>
            )}

            {migrationError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 text-sm">
                    Migration failed: {migrationError}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              {!migrationComplete && (
                <>
                  <Button
                    onClick={testFirestoreConnection}
                    variant="outline"
                    className="border-gray-300"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Test Connection
                  </Button>
                  
                  <Button
                    onClick={handleMigration}
                    disabled={isMigrating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isMigrating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Start Migration
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      localStorage.setItem('firestore-migration-complete', 'true');
                      setShowBanner(false);
                    }}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:text-orange-700"
                  >
                    Skip for Now
                  </Button>
                </>
              )}
              
              {migrationComplete && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Data migrated successfully!</span>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={dismissBanner}
                className="text-gray-600 hover:text-gray-800"
              >
                {migrationComplete ? 'Got it!' : 'Dismiss'}
              </Button>
            </div>

            {!migrationComplete && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What will be migrated:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Approved users and their roles</li>
                  <li>• Pending user approvals</li>
                  <li>• All tasks and assignments</li>
                  <li>• Google Analytics configuration</li>
                  <li>• System preferences</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MigrationBanner;
