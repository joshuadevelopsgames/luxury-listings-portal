import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import ClientProfilesList from '../components/client/ClientProfilesList';
import PendingClients from './PendingClients';
import { Users, Clock } from 'lucide-react';

const ClientsPage = () => {
  const [activeTab, setActiveTab] = useState('profiles');

  // Listen for tab switch events
  useEffect(() => {
    const handleTabSwitch = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switchTab', handleTabSwitch);
    return () => window.removeEventListener('switchTab', handleTabSwitch);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Header Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage client profiles and pending approvals
              </p>
            </div>
            
            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="profiles" 
                  className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none"
                >
                  <Users className="w-4 h-4" />
                  Client Profiles
                </TabsTrigger>
                <TabsTrigger 
                  value="pending" 
                  className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none"
                >
                  <Clock className="w-4 h-4" />
                  Pending Approvals
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent value="profiles" className="mt-0">
            <ClientProfilesList />
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            <PendingClients />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientsPage;
